// Vérifications de la migration 079 : chaque ligne garde son organisation.
// Une ligne enregistrée sans organisation (l'app gardait un orgId périmé) reçoit celle de son
// auteur, jamais celle d'un tiers ni pour un visiteur ; les lignes déjà orphelines sont
// rattrapées ; une seule organisation par défaut, créée par le compte lui-même.
// Les policies INSERT/SELECT de production (relevées le 8 oct. 2026) sont reproduites sur
// clients, catalogue et echanges : la RLS s'applique après le déclencheur, comme en production.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE, SOLO, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/079_chaque_ligne_garde_son_organisation.sql');
const NOUVEAU = '79aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AUTRE = '79bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SERVEUR_SEUL = '79cccccc-cccc-4ccc-8ccc-cccccccccccc';

const POLICIES_PRODUCTION = ['clients', 'catalogue'].map((t) => `
  ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can create own ${t}" ON ${t} FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  CREATE POLICY "Org members can insert ${t}" ON ${t} FOR INSERT TO authenticated WITH CHECK (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Users can view own ${t}" ON ${t} FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "Org members can view ${t}" ON ${t} FOR SELECT TO authenticated USING (organization_id = ANY (user_org_ids(auth.uid())));
`).join('') + `
  ALTER TABLE echanges ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own echanges" ON echanges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Org members can insert echanges" ON echanges FOR INSERT TO authenticated WITH CHECK (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Org members can view echanges" ON echanges FOR SELECT TO authenticated USING (organization_id = ANY (user_org_ids(auth.uid())));
`;

export async function verifier({ db, q, en, commeAnonyme, compte, verifier }) {
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const orga = async (table, id) => (await q(`SELECT organization_id FROM ${table} WHERE id = $1`, [id])).rows[0]?.organization_id ?? null;
  await db.exec(POLICIES_PRODUCTION);
  await q(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'nouveau@x.fr', '{"nom":"Test Mallettico"}'), ($2, 'autre@x.fr', '{}'), ($3, 'serveur@x.fr', '{}')`, [NOUVEAU, AUTRE, SERVEUR_SEUL]);

  // ── Une ligne enregistrée sans organisation reçoit celle de son auteur (RLS active) ──
  const client = (await en(SOLO, () => q(`INSERT INTO clients (user_id, nom) VALUES ($1, 'Client 079') RETURNING id`, [SOLO]))).rows[0].id;
  verifier(await orga('clients', client) === ORG_SOLO,
    '079 : un client créé sans organisation (orgId périmé côté app) reçoit l\'organisation de son artisan');
  const article = (await en(SOLO, () => q(`INSERT INTO catalogue (user_id, nom) VALUES ($1, 'Prise 16 A') RETURNING id`, [SOLO]))).rows[0].id;
  const echange = (await en(SALARIE, () => q(`INSERT INTO echanges (user_id, objet) VALUES ($1, 'Relance') RETURNING id`, [SALARIE]))).rows[0].id;
  verifier(await orga('catalogue', article) === ORG_SOLO && await orga('echanges', echange) === ORG_PATRON,
    '079 : idem pour le catalogue et les échanges ; un salarié reçoit l\'organisation de son patron');
  const profil = (await en(SOLO, () => q(`INSERT INTO entreprise (user_id, nom) VALUES ($1, 'Élec Solo 079') RETURNING id`, [SOLO]))).rows[0].id;
  verifier(await orga('entreprise', profil) === ORG_SOLO, '079 : le profil d\'entreprise reçoit aussi son organisation (lu par organisation)');
  const serveur = (await q(`INSERT INTO devis (user_id, numero) VALUES ($1, 'DEV-079') RETURNING id`, [PATRON])).rows[0].id;
  verifier(await orga('devis', serveur) === ORG_PATRON, '079 : une ligne écrite par le serveur (relances, webhooks) est aussi rattachée');

  // ── Jamais l'organisation d'un tiers, jamais pour un visiteur, jamais d'écrasement ──
  verifier(await refuse(() => en(PATRON, () => q(`INSERT INTO clients (user_id, nom) VALUES ($1, 'Au nom de SOLO') RETURNING id`, [SOLO]))),
    '079 : RLS active, une insertion au nom d\'un autre compte reste refusée');
  const pourAutrui = (await en(PATRON, () => q(`INSERT INTO chantiers (user_id, nom) VALUES ($1, 'Au nom de SOLO') RETURNING id`, [SOLO]))).rows[0].id;
  verifier(await orga('chantiers', pourAutrui) === null,
    '079 : sur une table sans RLS, une ligne au nom d\'un autre compte ne reçoit PAS l\'organisation de ce compte');
  const parVisiteur = await commeAnonyme(async () => {
    const id = (await q(`INSERT INTO chantiers (user_id, nom) VALUES ($1, 'Visiteur') RETURNING id`, [SOLO])).rows[0].id;
    return (await q('SELECT organization_id FROM chantiers WHERE id = $1', [id])).rows[0].organization_id;
  });
  verifier(parVisiteur === null, '079 : un visiteur anonyme n\'est pas traité comme le serveur (aucune organisation remplie)');
  const explicite = (await en(PATRON, () => q(`INSERT INTO chantiers (user_id, organization_id, nom) VALUES ($1, $2, 'Explicite') RETURNING id`, [PATRON, ORG_PATRON]))).rows[0].id;
  verifier(await orga('chantiers', explicite) === ORG_PATRON, '079 : une organisation fournie par l\'app est conservée');
  const sansOrga = (await en(NOUVEAU, () => q(`INSERT INTO clients (user_id, nom) VALUES ($1, 'Avant organisation') RETURNING id`, [NOUVEAU]))).rows[0].id;
  verifier(await orga('clients', sansOrga) === null && await compte('SELECT count(*) AS n FROM clients WHERE id = $1', [sansOrga]) === 1,
    '079 : un compte encore sans organisation enregistre quand même (ligne gardée, organisation vide)');

  // ── Rattrapage : les lignes déjà orphelines reçoivent l'organisation de leur auteur ──
  const tables = ['clients', 'catalogue', 'entreprise'];
  await db.exec(tables.map((t) => `ALTER TABLE ${t} DISABLE TRIGGER trg_renseigner_organisation;`).join(''));
  const orphelin = (await q(`INSERT INTO clients (user_id, nom) VALUES ($1, 'Orphelin') RETURNING id`, [SOLO])).rows[0].id;
  const articleOrphelin = (await q(`INSERT INTO catalogue (user_id, nom) VALUES ($1, 'Orphelin') RETURNING id`, [PATRON])).rows[0].id;
  const profilOrphelin = (await q(`INSERT INTO entreprise (user_id, nom) VALUES ($1, 'Orphelin') RETURNING id`, [PATRON])).rows[0].id;
  const sansAuteur = (await q(`INSERT INTO clients (nom) VALUES ('Sans auteur') RETURNING id`)).rows[0].id;
  await db.exec(tables.map((t) => `ALTER TABLE ${t} ENABLE TRIGGER trg_renseigner_organisation;`).join(''));
  verifier(await orga('clients', orphelin) === null, '079 : (préparation) des lignes orphelines comme en production');
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
  verifier(await orga('clients', orphelin) === ORG_SOLO && await orga('catalogue', articleOrphelin) === ORG_PATRON && await orga('entreprise', profilOrphelin) === ORG_PATRON,
    '079 : à l\'application, les lignes orphelines retrouvent l\'organisation de leur auteur (elles réapparaissent dans l\'app)');
  verifier(await orga('clients', sansAuteur) === null && await compte('SELECT count(*) AS n FROM clients WHERE id = $1', [sansAuteur]) === 1,
    '079 : une ligne sans auteur reste telle quelle ; rien n\'est effacé');

  // ── create_default_org : une seule organisation, pour soi-même ──
  const premier = await en(NOUVEAU, async () => (await q('SELECT create_default_org($1) AS r', [NOUVEAU])).rows[0].r);
  const second = await en(NOUVEAU, async () => (await q('SELECT create_default_org($1) AS r', [NOUVEAU])).rows[0].r);
  verifier(premier.org_id && second.org_id === premier.org_id && second.already_exists === true
    && await compte('SELECT count(*) AS n FROM organizations WHERE owner_id = $1', [NOUVEAU]) === 1,
  '079 : appelée plusieurs fois au démarrage, create_default_org rend toujours la même organisation');
  const slug = (await q('SELECT slug FROM organizations WHERE id = $1', [premier.org_id])).rows[0].slug;
  verifier(/^test-mallettico-[0-9a-f]{8}$/.test(slug), `079 : le slug garde les lettres en minuscules (« ${slug} »)`);
  verifier(await refuse(() => en(AUTRE, () => q('SELECT create_default_org($1)', [SERVEUR_SEUL]))),
    '079 : un compte ne peut pas créer l\'organisation d\'un autre');
  verifier(await refuse(() => commeAnonyme(() => q('SELECT create_default_org($1)', [AUTRE]))),
    '079 : un visiteur (clé publique) ne peut plus appeler create_default_org');
  const parServeur = (await q('SELECT create_default_org($1) AS r', [SERVEUR_SEUL])).rows[0].r;
  verifier(parServeur.org_id && parServeur.already_exists === false, '079 : le serveur peut créer l\'organisation d\'un compte');
  const def = (await q(`SELECT prosrc FROM pg_proc WHERE proname = 'create_default_org'`)).rows[0].prosrc;
  verifier(def.includes('pg_advisory_xact_lock'),
    '079 : les appels simultanés du même compte passent l\'un après l\'autre (verrou ; la concurrence réelle ne se rejoue pas au banc)');

  // ── Droits sur la fonction du déclencheur ──
  const droits = (await q(`SELECT has_function_privilege('authenticated', 'renseigner_organisation()', 'execute') AS connecte,
    has_function_privilege('anon', 'renseigner_organisation()', 'execute') AS visiteur`)).rows[0];
  verifier(!droits.connecte && !droits.visiteur, '079 : la fonction du déclencheur n\'est exécutable ni par un compte ni par un visiteur');
}
