// Vérifications de la migration 087 : plafond de membres selon l'abonnement du propriétaire.
// Chaque geste est rejoué comme l'app le fait (TeamManagement.jsx : insert … select ; AcceptInvitation.jsx :
// rpc accept_invitation avec le seul jeton), et comme un tricheur le ferait avec la clé publique (inserts répétés).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/087_plafond_de_membres_selon_l_abonnement.sql');

const id = (n) => `87000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const GRATUIT = id(1);
const ARTISAN = id(2);
const EQUIPE = id(3);
const INTRUS = id(4);
const INVITES = Array.from({ length: 14 }, (_, i) => id(100 + i));
const ORG_G = '87aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_A = '87bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ORG_E = '87cccccc-cccc-4ccc-8ccc-cccccccccccc';

export async function verifier({ db, q, en, commeAnonyme, compte, verifier }) {
  // Les vérifications de 078 rejouent 078 (fonction et policy d'avant) : remettre 087 en place.
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));

  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  let n = 0;
  // Comme l'écran Équipe : insert … select (jeton et échéance relus)
  const inviter = (par, org) => en(par, () => q(`INSERT INTO invitations (organization_id, email, phone, role, invited_by)
    VALUES ($1, $2, NULL, 'ouvrier', $3) RETURNING id, token`, [org, `invite-087-${++n}@x.fr`, par])).then((r) => r.rows[0]);
  // Comme une invitation créée avant 087 (ou par le serveur) : sans passer par la policy
  const inviterHorsApi = (par, org) => q(`INSERT INTO invitations (organization_id, email, role, invited_by)
    VALUES ($1, $2, 'ouvrier', $3) RETURNING id, token`, [org, `ancienne-087-${++n}@x.fr`, par]).then((r) => r.rows[0]);
  const accepter = (uid, token) => en(uid, () => q('SELECT accept_invitation($1) AS r', [token])).then((x) => x.rows[0].r);
  const membres = (org) => compte(`SELECT count(*) n FROM organization_members WHERE organization_id = $1 AND role <> 'owner'`, [org]);
  const statut = async (invId) => (await q('SELECT status FROM invitations WHERE id = $1', [invId])).rows[0].status;
  const estMembre = async (uid, org) => (await compte('SELECT count(*) n FROM organization_members WHERE user_id = $1 AND organization_id = $2', [uid, org])) === 1;

  const comptes = [GRATUIT, ARTISAN, EQUIPE, INTRUS, ...INVITES].map((u, i) => `('${u}', 'compte${i}@087.fr')`).join(',');
  await db.exec(`
    INSERT INTO auth.users (id, email) VALUES ${comptes};
    INSERT INTO organizations (id, name, slug, owner_id) VALUES
      ('${ORG_G}', 'Gratuit 087', 'gratuit-087', '${GRATUIT}'),
      ('${ORG_A}', 'Artisan 087', 'artisan-087', '${ARTISAN}'),
      ('${ORG_E}', 'Équipe 087', 'equipe-087', '${EQUIPE}');
    INSERT INTO organization_members (organization_id, user_id, role) VALUES
      ('${ORG_G}', '${GRATUIT}', 'owner'), ('${ORG_A}', '${ARTISAN}', 'owner'), ('${ORG_E}', '${EQUIPE}', 'owner');
    INSERT INTO subscriptions (user_id, plan, status) VALUES ('${ARTISAN}', 'artisan', 'active'), ('${EQUIPE}', 'equipe', 'active');
  `);

  // ── Compte gratuit : une place, comme l'écran Équipe ──
  const premiere = await inviter(GRATUIT, ORG_G);
  verifier(premiere?.token, '087 : un compte gratuit invite une personne (insert … select de l\'écran Équipe)');
  verifier(await refuse(() => inviter(GRATUIT, ORG_G)), '087 : … pas une deuxième : l\'invitation en attente occupe la place');
  let essais = 0;
  for (let i = 0; i < 5; i++) if (!(await refuse(() => inviter(GRATUIT, ORG_G)))) essais++;
  verifier(essais === 0 && await compte('SELECT count(*) n FROM invitations WHERE organization_id = $1', [ORG_G]) === 1,
    '087 : inviter en boucle par l\'API (clé publique) ne crée aucune invitation de plus');
  const annul = (await en(GRATUIT, () => q('SELECT revoke_invitation($1) AS r', [premiere.id]))).rows[0].r;
  const remplacante = annul.success ? await inviter(GRATUIT, ORG_G) : null;
  verifier(remplacante?.token, '087 : annuler l\'invitation en attente libère la place');
  const expiree = await q(`UPDATE invitations SET expires_at = now() - interval '1 hour' WHERE id = $1 RETURNING id`, [remplacante.id]);
  const apresExpiration = expiree.rows.length ? await inviter(GRATUIT, ORG_G) : null;
  verifier(apresExpiration?.token, '087 : une invitation expirée n\'occupe plus de place');
  const entree = await accepter(INVITES[0], apresExpiration.token);
  verifier(entree.success === true && await estMembre(INVITES[0], ORG_G), '087 : l\'invité accepte et entre dans l\'équipe (1 place sur 1)');
  verifier(await refuse(() => inviter(GRATUIT, ORG_G)), '087 : équipe gratuite complète : plus d\'invitation possible');

  // ── Invitations créées avant 087 (ou par la faille d'avant) : l'acceptation est plafonnée aussi ──
  const anciennes = [await inviterHorsApi(GRATUIT, ORG_G), await inviterHorsApi(GRATUIT, ORG_G)];
  const refusee = await accepter(INVITES[1], anciennes[0].token);
  verifier(refusee.error && /complète/.test(refusee.error) && !(await estMembre(INVITES[1], ORG_G)) && await statut(anciennes[0].id) === 'pending',
    `087 : au-delà de la limite, l'invité n'entre pas et lit pourquoi (« ${refusee.error} »)`);
  verifier(await membres(ORG_G) === 1, '087 : … l\'équipe gratuite reste à 1 membre');
  const dejaMembre = await inviterHorsApi(GRATUIT, ORG_G);
  verifier((await accepter(INVITES[0], dejaMembre.token)).already_member === true, '087 : un membre qui rouvre un lien reste reconnu, même équipe complète');

  // ── C'est l'abonnement du PROPRIÉTAIRE qui compte ──
  await q(`UPDATE organization_members SET role = 'admin' WHERE organization_id = $1 AND user_id = $2`, [ORG_G, INVITES[0]]);
  await q(`INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, 'equipe', 'active')`, [INVITES[0]]);
  verifier(await refuse(() => inviter(INVITES[0], ORG_G)), '087 : un administrateur abonné Équipe n\'agrandit pas l\'équipe d\'un propriétaire gratuit');

  // ── Artisan : une place aussi ──
  verifier((await inviter(ARTISAN, ORG_A))?.token && await refuse(() => inviter(ARTISAN, ORG_A)), '087 : abonnement Artisan : une invitation, pas deux');

  // Un tableau de lignes envoyé à PostgREST (un seul INSERT de plusieurs lignes) : la policy compte aussi les
  // lignes de la même requête (fonction VOLATILE) ; 11 lignes dans une équipe vide de 10 places → refus en bloc
  verifier(await refuse(() => en(EQUIPE, () => q(`INSERT INTO invitations (organization_id, email, role, invited_by)
    SELECT $1, 'lot-' || g || '@x.fr', 'ouvrier', $2 FROM generate_series(1, 11) g`, [ORG_E, EQUIPE])))
    && await compte('SELECT count(*) n FROM invitations WHERE organization_id = $1', [ORG_E]) === 0,
  '087 : onze invitations en une seule requête (tableau PostgREST) dans une équipe de dix places : refusées en bloc');

  // ── Équipe : dix places ──
  for (let i = 2; i < 11; i++) {
    await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'ouvrier')`, [ORG_E, INVITES[i]]);
  }
  // Paiement en échec (past_due) : l'abonnement compte encore, comme dans l'app (STATUTS_ACTIFS)
  await q(`UPDATE subscriptions SET status = 'past_due' WHERE user_id = $1`, [EQUIPE]);
  verifier((await en(EQUIPE, () => q('SELECT equipe_peut_inviter($1) AS r', [ORG_E]))).rows[0].r === true,
    '087 : abonnement Équipe en échec de paiement (9 membres) : les places restent celles de l\'offre Équipe');
  await q(`UPDATE subscriptions SET status = 'active' WHERE user_id = $1`, [EQUIPE]);
  const dixieme = await inviter(EQUIPE, ORG_E);
  verifier(dixieme?.token && await refuse(() => inviter(EQUIPE, ORG_E)), '087 : abonnement Équipe : 9 membres + 1 invitation = 10, la onzième est refusée');
  const pourPlusTard = await inviterHorsApi(EQUIPE, ORG_E);
  verifier((await accepter(INVITES[11], dixieme.token)).success === true && await membres(ORG_E) === 10, '087 : … le dixième membre entre');
  verifier((await accepter(INVITES[12], pourPlusTard.token)).error && await membres(ORG_E) === 10, '087 : … le onzième non');

  // ── Abonnement résilié : les membres restent, plus personne n'entre ──
  await q(`UPDATE subscriptions SET status = 'canceled' WHERE user_id = $1`, [EQUIPE]);
  verifier(await membres(ORG_E) === 10 && await refuse(() => inviter(EQUIPE, ORG_E))
    && (await accepter(INVITES[13], pourPlusTard.token)).error && !(await estMembre(INVITES[13], ORG_E)),
  '087 : abonnement Équipe résilié : les 10 membres restent, aucune invitation ni entrée de plus');
  await q(`UPDATE subscriptions SET status = 'active' WHERE user_id = $1`, [EQUIPE]);

  // ── Ce que voient un non-gérant et un visiteur ──
  verifier((await en(INTRUS, () => q('SELECT equipe_peut_inviter($1) AS r', [ORG_E]))).rows[0].r === false
    && (await en(INVITES[2], () => q('SELECT equipe_peut_inviter($1) AS r', [ORG_E]))).rows[0].r === false,
  '087 : equipe_peut_inviter ne répond « oui » qu\'à un gérant de l\'organisation');
  verifier(await refuse(() => en(INTRUS, () => q('SELECT equipe_complete($1, true)', [ORG_E])))
    && await refuse(() => commeAnonyme(() => q('SELECT equipe_complete($1, true)', [ORG_E])))
    && await refuse(() => commeAnonyme(() => q('SELECT equipe_peut_inviter($1)', [ORG_E]))),
  '087 : equipe_complete est interne (ni connecté ni visiteur) ; equipe_peut_inviter refusée au visiteur');

  // ── Requêtes de contrôle de l'en-tête ──
  const droits = (await q(`SELECT p.proname || ' ' || has_function_privilege('anon', p.oid, 'EXECUTE') || ' ' || has_function_privilege('authenticated', p.oid, 'EXECUTE') AS l
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public' AND p.proname IN ('equipe_complete', 'equipe_peut_inviter', 'accept_invitation') ORDER BY 1`)).rows.map((r) => r.l);
  verifier(droits.join(' ; ') === 'accept_invitation false true ; equipe_complete false false ; equipe_peut_inviter false true',
    `087 : contrôle 1 de l'en-tête (${droits.join(' ; ')})`);
  const plafonnee = (await q(`SELECT pg_get_expr(polwithcheck, polrelid) LIKE '%equipe_peut_inviter%' AS r FROM pg_policy WHERE polname = 'Gérants : inviter'`)).rows;
  verifier(plafonnee.length === 1 && plafonnee[0].r === true, '087 : contrôle 2 de l\'en-tête (la policy « Gérants : inviter » compte les places)');

  // Nettoyage : les vérifications de 072 (jouées en dernier) comptent toutes les invitations.
  const tous = [GRATUIT, ARTISAN, EQUIPE, INTRUS, ...INVITES].map((u) => `'${u}'`).join(',');
  await db.exec(`
    DELETE FROM organizations WHERE id IN ('${ORG_G}', '${ORG_A}', '${ORG_E}');
    DELETE FROM subscriptions WHERE user_id IN (${tous});
    DELETE FROM auth.users WHERE id IN (${tous});
  `);
}
