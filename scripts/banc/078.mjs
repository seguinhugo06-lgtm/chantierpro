// Vérifications de la migration 078 : fermer l'entrée libre dans une organisation.
// Données propres (les vérifications de 072 suppriment des comptes du socle) : une entreprise
// avec patron, adjoint (admin) et ouvrier ; un intrus qui a sa propre organisation ; un invité.
// Chaque parcours de l'app est rejoué tel que l'app l'appelle (TeamManagement.jsx,
// AcceptInvitation.jsx, OrgContext.jsx, send-lifecycle-email).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/078_fermer_l_entree_libre_dans_une_organisation.sql');

const CHEF = '78000000-0000-4000-8000-000000000001';
const ADJOINT = '78000000-0000-4000-8000-000000000002';
const OUVRIER = '78000000-0000-4000-8000-000000000003';
const INTRUS = '78000000-0000-4000-8000-000000000004';
const INVITE = '78000000-0000-4000-8000-000000000005';
const INVITE2 = '78000000-0000-4000-8000-000000000006';
const NOUVEAU = '78000000-0000-4000-8000-000000000007';
const ORG = '78aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_INTRUS = '78bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ db, q, en, commeAnonyme, compte, verifier }) {
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const role = async (uid, org = ORG) => (await q('SELECT role FROM organization_members WHERE user_id = $1 AND organization_id = $2', [uid, org])).rows[0]?.role ?? null;
  const statut = async (id) => (await q('SELECT status FROM invitations WHERE id = $1', [id])).rows[0].status;
  const inviter = async (par, roleInvite = 'ouvrier', extra = {}) => {
    const r = await q(`INSERT INTO invitations (organization_id, email, role, invited_by, status, expires_at)
      VALUES ($1, $2, $3, $4, coalesce($5, 'pending')::invitation_status, coalesce($6, now() + interval '7 days')) RETURNING id, token`,
    [extra.org ?? ORG, `invite-${Math.random().toString(36).slice(2, 8)}@x.fr`, roleInvite, par, extra.status ?? null, extra.expires ?? null]);
    return r.rows[0];
  };
  const accepter = (uid, token, pourQui) => en(uid, () => q('SELECT accept_invitation($1' + (pourQui !== undefined ? ', $2' : '') + ') AS r',
    pourQui !== undefined ? [token, pourQui] : [token])).then((x) => x.rows[0].r);

  await db.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${CHEF}','chef@078.fr'),('${ADJOINT}','adjoint@078.fr'),('${OUVRIER}','ouvrier@078.fr'),
      ('${INTRUS}','intrus@078.fr'),('${INVITE}','invite@078.fr'),('${INVITE2}','invite2@078.fr'),('${NOUVEAU}','nouveau@078.fr');
    INSERT INTO organizations (id, name, slug, owner_id) VALUES ('${ORG}','Élec Durand','elec-durand-078','${CHEF}'),('${ORG_INTRUS}','Intrus','intrus-078','${INTRUS}');
    INSERT INTO organization_members (organization_id, user_id, role) VALUES ('${ORG}','${CHEF}','owner'),('${ORG}','${ADJOINT}','admin'),
      ('${ORG}','${OUVRIER}','ouvrier'),('${ORG_INTRUS}','${INTRUS}','owner');
    -- Une table de l'organisation protégée comme les clients et devis en production (policies de 038).
    CREATE TABLE banc078_clients (id SERIAL PRIMARY KEY, organization_id UUID, nom TEXT);
    ALTER TABLE banc078_clients ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Org members can view banc078_clients" ON banc078_clients FOR SELECT TO authenticated USING (organization_id = ANY (user_org_ids(auth.uid())));
    GRANT SELECT ON banc078_clients TO anon, authenticated;
    INSERT INTO banc078_clients (organization_id, nom) VALUES ('${ORG}', 'Client de l''entreprise Durand');
  `);
  const invitation = await inviter(CHEF, 'chef_chantier');
  const clientsVus = async (uid) => (await en(uid, () => q('SELECT nom FROM banc078_clients'))).rows.length;

  // ── Visiteur (clé publique) ──
  const lues = await commeAnonyme(() => q('SELECT token FROM invitations'));
  verifier(lues.rows.length === 0, '078 : un visiteur ne lit plus aucune invitation (ni leur jeton)');
  verifier(await refuse(() => commeAnonyme(() => q('SELECT accept_invitation($1, $2)', [invitation.token, INTRUS])))
    && await refuse(() => commeAnonyme(() => q('SELECT revoke_invitation($1)', [invitation.id])))
    && await refuse(() => commeAnonyme(() => q('SELECT mon_role_organisation($1)', [ORG]))),
  '078 : un visiteur ne peut appeler ni accept_invitation, ni revoke_invitation, ni mon_role_organisation');
  verifier(await statut(invitation.id) === 'pending', '078 : l\'invitation n\'a pas été annulée par le visiteur');
  const page = (await commeAnonyme(() => q('SELECT get_invitation_by_token($1) AS r', [invitation.token]))).rows[0].r;
  verifier(page.organization_name === 'Élec Durand' && page.role === 'chef_chantier' && page.invited_by_email === 'chef@078.fr' && page.expires_at
    && Object.keys(page).sort().join() === 'expires_at,invited_by_email,organization_name,role',
  `078 : la page /invitation/<jeton> s'affiche sans compte, avec ce qu'elle montre et rien d'autre (${Object.keys(page).join(', ')})`);
  const inconnu = (await commeAnonyme(() => q('SELECT get_invitation_by_token(gen_random_uuid()) AS r'))).rows[0].r;
  verifier(inconnu.error && !inconnu.organization_name, '078 : un jeton inconnu ne révèle rien');

  // ── Intrus : connecté, membre d'une autre organisation ──
  verifier(await refuse(() => en(INTRUS, () => q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [ORG, INTRUS])))
    && await refuse(() => en(INTRUS, () => q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'readonly')`, [ORG, INTRUS]))),
  '078 : un utilisateur ne peut pas s\'ajouter lui-même à une autre organisation (ni propriétaire, ni lecture seule)');
  verifier(await clientsVus(INTRUS) === 0, '078 : … et ne lit donc pas les clients de cette entreprise');
  verifier((await en(INTRUS, () => q('SELECT * FROM invitations WHERE organization_id = $1', [ORG]))).rows.length === 0
    && await refuse(() => en(INTRUS, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by) VALUES ($1, 'moi@x.fr', 'admin', $2)`, [ORG, INTRUS]))),
  '078 : un non-membre ne voit ni ne crée d\'invitation dans une autre organisation');
  const revInt = (await en(INTRUS, () => q('SELECT revoke_invitation($1) AS r', [invitation.id]))).rows[0].r;
  verifier(revInt.error && await statut(invitation.id) === 'pending', '078 : un non-membre ne peut pas annuler l\'invitation d\'un autre');
  const pourAutre = await accepter(INTRUS, invitation.token, INVITE);
  verifier(pourAutre.error && await role(INVITE) === null && await statut(invitation.id) === 'pending',
    '078 : accept_invitation refuse d\'inscrire un autre compte que le compte connecté (p_user_id)');
  const majInt = await en(INTRUS, () => q(`UPDATE organization_members SET role = 'readonly' WHERE organization_id = $1`, [ORG]));
  const supInt = await en(INTRUS, () => q('DELETE FROM organization_members WHERE organization_id = $1', [ORG]));
  verifier(majInt.affectedRows === 0 && supInt.affectedRows === 0 && await compte('SELECT count(*) n FROM organization_members WHERE organization_id = $1', [ORG]) === 3,
    '078 : un non-membre ne modifie ni ne retire aucun membre');

  // ── Ouvrier : membre sans droit de gestion ──
  const promo = await en(OUVRIER, () => q(`UPDATE organization_members SET role = 'admin' WHERE user_id = $1 AND organization_id = $2`, [OUVRIER, ORG]));
  verifier(promo.affectedRows === 0 && await role(OUVRIER) === 'ouvrier'
    && await refuse(() => en(OUVRIER, () => q(`UPDATE organization_members SET role = 'owner' WHERE user_id = $1 AND organization_id = $2`, [OUVRIER, ORG]))
      .then((r) => { if (!r.affectedRows) throw new Error('0 ligne'); })),
  '078 : un ouvrier ne peut pas se promouvoir (administrateur ou propriétaire)');
  const virer = await en(OUVRIER, () => q('DELETE FROM organization_members WHERE user_id = $1', [CHEF]));
  verifier(virer.affectedRows === 0 && await role(CHEF) === 'owner', '078 : un ouvrier ne peut pas retirer le propriétaire');
  verifier((await en(OUVRIER, () => q('SELECT token FROM invitations'))).rows.length === 0
    && await refuse(() => en(OUVRIER, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by) VALUES ($1, 'second-compte@x.fr', 'owner', $2)`, [ORG, OUVRIER])))
    && await refuse(() => en(OUVRIER, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by) VALUES ($1, 'second-compte@x.fr', 'admin', $2)`, [ORG, OUVRIER]))),
  '078 : un ouvrier ne voit pas les jetons d\'invitation et ne peut pas inviter (ni propriétaire, ni administrateur)');
  const equipeOuvrier = await en(OUVRIER, () => q('SELECT user_id FROM organization_members WHERE organization_id = $1', [ORG]));
  verifier(equipeOuvrier.rows.length === 3 && await clientsVus(OUVRIER) === 1, '078 : un membre voit toujours son équipe et les données de l\'entreprise');

  // ── Adjoint (administrateur) : les gestes de l'écran Équipe ──
  verifier((await en(ADJOINT, () => q('SELECT token FROM invitations WHERE organization_id = $1', [ORG]))).rows.length === 1,
    '078 : un administrateur voit les invitations de son organisation (liste Équipe)');
  const creee = await en(ADJOINT, () => q(`INSERT INTO invitations (organization_id, email, phone, role, invited_by) VALUES ($1, 'nouvel@x.fr', NULL, 'ouvrier', $2) RETURNING id, token, status, expires_at`, [ORG, ADJOINT]));
  verifier(creee.rows.length === 1 && creee.rows[0].token && creee.rows[0].status === 'pending',
    '078 : un administrateur invite comme l\'app (insert … select : jeton et échéance renvoyés)');
  const luParAuteur = await en(ADJOINT, () => q('SELECT email, token, role, status, expires_at, organization_id, invited_by FROM invitations WHERE id = $1', [creee.rows[0].id]));
  verifier(luParAuteur.rows[0]?.invited_by === ADJOINT, '078 : l\'auteur relit son invitation avec son jeton (send-lifecycle-email)');
  verifier(await refuse(() => en(ADJOINT, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by) VALUES ($1, 'a@x.fr', 'owner', $2)`, [ORG, ADJOINT])))
    && await refuse(() => en(ADJOINT, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by) VALUES ($1, 'a@x.fr', 'ouvrier', $2)`, [ORG, CHEF])))
    && await refuse(() => en(ADJOINT, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by, status) VALUES ($1, 'a@x.fr', 'ouvrier', $2, 'accepted')`, [ORG, ADJOINT])))
    && await refuse(() => en(ADJOINT, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by, expires_at) VALUES ($1, 'a@x.fr', 'ouvrier', $2, now() + interval '1 year')`, [ORG, ADJOINT])))
    && await refuse(() => en(ADJOINT, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by) VALUES ($1, 'a@x.fr', 'ouvrier', $2)`, [ORG_INTRUS, ADJOINT]))),
  '078 : invitation refusée si rôle propriétaire, auteur usurpé, statut forcé, échéance > 30 jours ou autre organisation');
  const idOuvrier = (await q('SELECT id FROM organization_members WHERE user_id = $1 AND organization_id = $2', [OUVRIER, ORG])).rows[0].id;
  const chgt = await en(ADJOINT, () => q(`UPDATE organization_members SET role = 'chef_chantier' WHERE id = $1 RETURNING id`, [idOuvrier]));
  verifier(chgt.rows.length === 1 && await role(OUVRIER) === 'chef_chantier', '078 : un administrateur change le rôle d\'un membre comme l\'écran Équipe (update … select)');
  verifier(await refuse(() => en(ADJOINT, () => q(`UPDATE organization_members SET role = 'owner' WHERE user_id = $1 AND organization_id = $2`, [OUVRIER, ORG])))
    && await refuse(() => en(ADJOINT, () => q(`UPDATE organization_members SET role = 'owner' WHERE user_id = $1 AND organization_id = $2`, [ADJOINT, ORG]))),
  '078 : personne ne nomme un propriétaire, pas même un administrateur pour lui-même');
  const toucheChef = await en(ADJOINT, () => q(`UPDATE organization_members SET role = 'readonly' WHERE user_id = $1`, [CHEF]));
  const retireChef = await en(ADJOINT, () => q('DELETE FROM organization_members WHERE user_id = $1', [CHEF]));
  verifier(toucheChef.affectedRows === 0 && retireChef.affectedRows === 0 && await role(CHEF) === 'owner',
    '078 : un administrateur ne rétrograde ni ne retire le propriétaire');
  verifier(await refuse(() => en(ADJOINT, () => q('UPDATE organization_members SET user_id = $1 WHERE user_id = $2 AND organization_id = $3', [INTRUS, OUVRIER, ORG])))
    && await refuse(() => en(ADJOINT, () => q('UPDATE organization_members SET organization_id = $1 WHERE user_id = $2 AND organization_id = $3', [ORG_INTRUS, OUVRIER, ORG]))),
  '078 : une ligne de membre ne change ni de compte ni d\'organisation (on ne substitue personne)');
  const rev = (await en(ADJOINT, () => q('SELECT revoke_invitation($1) AS r', [creee.rows[0].id]))).rows[0].r;
  verifier(rev.success === true && await statut(creee.rows[0].id) === 'revoked', '078 : un administrateur annule une invitation (revoke_invitation)');

  // ── Invité : accepter par le jeton, connecté ──
  verifier((await accepter(INVITE, invitation.token, undefined)).success === true && await role(INVITE) === 'chef_chantier' && await statut(invitation.id) === 'accepted',
    '078 : l\'invité connecté accepte par son jeton (nouvelle app, sans p_user_id) avec le rôle prévu');
  verifier(await clientsVus(INVITE) === 1, '078 : … et voit alors les données de l\'entreprise');
  verifier(await compte(`SELECT count(*) n FROM activity_log WHERE user_id = $1 AND action = 'member_joined'`, [INVITE]) === 1, '078 : l\'arrivée est inscrite au journal d\'activité');
  verifier((await accepter(INTRUS, invitation.token, undefined)).error && await role(INTRUS) === null, '078 : un jeton déjà utilisé ne sert plus');
  const ancienneApp = await inviter(CHEF);
  verifier((await accepter(INVITE2, ancienneApp.token, INVITE2)).success === true && await role(INVITE2) === 'ouvrier',
    '078 : l\'app encore en cache (p_user_id = compte connecté) accepte toujours');
  const dejaMembre = await inviter(CHEF);
  verifier((await accepter(INVITE2, dejaMembre.token)).already_member === true, '078 : un membre qui rouvre un lien est reconnu comme déjà membre');
  verifier((await commeAnonyme(() => q('SELECT get_invitation_by_token($1) AS r', [ancienneApp.token]))).rows[0].r.error,
    '078 : la page n\'affiche plus une invitation acceptée');

  // ── Invitations inutilisables ──
  const expiree = await inviter(CHEF, 'ouvrier', { expires: new Date(Date.now() - 3600e3).toISOString() });
  const annulee = await inviter(CHEF, 'ouvrier', { status: 'revoked' });
  verifier((await accepter(INTRUS, expiree.token)).error && (await accepter(INTRUS, annulee.token)).error && await role(INTRUS) === null,
    '078 : une invitation expirée ou annulée ne fait entrer personne');
  const parOuvrier = await inviter(OUVRIER, 'admin');      // créée par la faille d'avant 078
  const proprio = await inviter(CHEF, 'owner');             // idem
  verifier((await commeAnonyme(() => q('SELECT get_invitation_by_token($1) AS r', [parOuvrier.token]))).rows[0].r.error
    && (await accepter(INTRUS, parOuvrier.token)).error && (await accepter(INTRUS, proprio.token)).error
    && await role(INTRUS) === null && await statut(parOuvrier.id) === 'revoked' && await statut(proprio.id) === 'revoked',
  '078 : les invitations d\'un non-gérant ou « propriétaire » (faille) ne s\'affichent ni ne s\'acceptent, et sont annulées à l\'essai');
  const parAdjoint = await inviter(ADJOINT);
  await q(`UPDATE organization_members SET role = 'ouvrier' WHERE user_id = $1 AND organization_id = $2`, [ADJOINT, ORG]);
  verifier((await accepter(INTRUS, parAdjoint.token)).error && await role(INTRUS) === null,
    '078 : l\'invitation d\'un administrateur rétrogradé depuis ne vaut plus');
  await q(`UPDATE organization_members SET role = 'admin' WHERE user_id = $1 AND organization_id = $2`, [ADJOINT, ORG]);

  // ── Propriétaire : retirer un membre ; créer son organisation ; démarrage de l'app ──
  const idInvite2 = (await q('SELECT id FROM organization_members WHERE user_id = $1 AND organization_id = $2', [INVITE2, ORG])).rows[0].id;
  const retrait = await en(CHEF, () => q('DELETE FROM organization_members WHERE id = $1 RETURNING id', [idInvite2]));
  verifier(retrait.rows.length === 1 && await role(INVITE2) === null, '078 : le propriétaire retire un membre comme l\'écran Équipe (delete … select)');
  const nouvelleOrg = '78cccccc-cccc-4ccc-8ccc-cccccccccccc';
  await en(CHEF, () => q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Seconde', 'seconde-078', $2)`, [nouvelleOrg, CHEF]));
  verifier((await en(CHEF, () => q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [nouvelleOrg, CHEF]))).affectedRows === 1
    && await refuse(() => en(INTRUS, () => q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [nouvelleOrg, INTRUS]))),
  '078 : on s\'inscrit propriétaire de SA nouvelle organisation, pas de celle d\'un autre');
  const demarrage = await en(NOUVEAU, async () => {
    const cree = (await q('SELECT create_default_org($1) AS r', [NOUVEAU])).rows[0].r;
    const id = (await q('SELECT get_user_org_id($1) AS id', [NOUVEAU])).rows[0].id;
    const nom = (await q('SELECT name FROM organizations WHERE id = $1', [id])).rows[0]?.name;
    const membre = (await q('SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2', [id, NOUVEAU])).rows[0]?.role;
    return { cree, id, nom, membre };
  });
  verifier(demarrage.cree.org_id === demarrage.id && demarrage.nom && demarrage.membre === 'owner',
    '078 : au premier démarrage (OrgContext), l\'organisation par défaut se crée et se relit comme avant');

  // ── Rejeu de la migration sur des données réelles : jetons renouvelés, invitations de la faille annulées ──
  const valable = await inviter(CHEF);
  const fautive = await inviter(OUVRIER);
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
  const apres = (await q('SELECT token, status FROM invitations WHERE id = $1', [valable.id])).rows[0];
  verifier(apres.status === 'pending' && apres.token !== valable.token && await statut(fautive.id) === 'revoked',
    '078 : à l\'application, les invitations en attente reçoivent un nouveau jeton et celles d\'un non-gérant sont annulées');
  verifier((await commeAnonyme(() => q('SELECT get_invitation_by_token($1) AS r', [valable.token]))).rows[0].r.error
    && (await commeAnonyme(() => q('SELECT get_invitation_by_token($1) AS r', [apres.token]))).rows[0].r.organization_name === 'Élec Durand',
  '078 : l\'ancien lien ne marche plus, le nouveau (recopié depuis Équipe) oui');

  // ── Requêtes de contrôle de l'en-tête ──
  const policies = (await q(`SELECT tablename || ' | ' || policyname || ' | ' || cmd || ' | ' || roles::text AS l FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('organization_members', 'invitations') ORDER BY tablename, policyname`)).rows.map((r) => r.l);
  const attendues = [
    'invitations | Gérants : inviter | INSERT | {authenticated}',
    'invitations | Gérants : supprimer une invitation | DELETE | {authenticated}',
    'invitations | Gérants : voir les invitations | SELECT | {authenticated}',
    'organization_members | Gérants : changer un rôle | UPDATE | {authenticated}',
    'organization_members | Gérants : retirer un membre | DELETE | {authenticated}',
    'organization_members | Membres : voir l\'équipe | SELECT | {authenticated}',
    'organization_members | Propriétaire : s\'inscrire dans son organisation | INSERT | {authenticated}',
  ];
  verifier(JSON.stringify(policies) === JSON.stringify(attendues), `078 : contrôle 1 → exactement les 7 policies attendues (${policies.length})`);
  const fonctions = Object.fromEntries((await q(`SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS v, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS c,
      array_to_string(p.proconfig, ',') AS reglages, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
      AND p.proname IN ('accept_invitation', 'get_invitation_by_token', 'revoke_invitation', 'mon_role_organisation', 'invitation_utilisable')`)).rows
    .map((r) => [r.proname, r]));
  const droits = (n) => `${fonctions[n]?.v}/${fonctions[n]?.c}`;
  verifier(droits('accept_invitation') === 'false/true' && droits('revoke_invitation') === 'false/true' && droits('mon_role_organisation') === 'false/true'
    && droits('get_invitation_by_token') === 'true/true' && droits('invitation_utilisable') === 'false/false'
    && fonctions.accept_invitation.args === 'p_token uuid, p_user_id uuid'
    && Object.values(fonctions).every((f) => (f.reglages || '').includes('search_path')),
  `078 : contrôle 2 → droits visiteur/connecté attendus, search_path fixé (${Object.keys(fonctions).map((n) => `${n} ${droits(n)}`).join(', ')})`);

  // Nettoyage : les vérifications de 072 (jouées en dernier) comptent toutes les invitations.
  await db.exec(`
    DROP TABLE banc078_clients;
    DELETE FROM organizations WHERE owner_id IN ('${CHEF}','${INTRUS}','${NOUVEAU}');
    DELETE FROM auth.users WHERE id IN ('${CHEF}','${ADJOINT}','${OUVRIER}','${INTRUS}','${INVITE}','${INVITE2}','${NOUVEAU}');
  `);
}
