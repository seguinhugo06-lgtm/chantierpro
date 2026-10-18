// Vérifications de la migration 085 : le marqueur « données fictives » (compte de démonstration, D-26) atteint
// les pages publiques de signature et de paiement, et rien d'autre ne change. Constaté comme le client : un
// visiteur avec le lien.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE, SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/085_marqueur_donnees_fictives_pour_les_pages_publiques.sql');

const ORGA_PATRON = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export async function verifier({ db, q, commeAnonyme, verifier }) {
  const essayer = async (fn) => { try { return { ok: true, r: await fn() }; } catch (e) { return { ok: false, e: e.message }; } };
  // Les vérifications de 081 rejouent 081, qui remet l'ancienne page de paiement : on rejoue 085 (elle doit
  // s'appliquer sur l'état d'origine comme sur un état déjà modifié)
  let rejouee = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejouee = false; }
  verifier(rejouee, '085 : la migration se rejoue sans erreur');

  // Un compte de démonstration (fiche marquée) et un compte ordinaire (le patron)
  const fiche = (await q(`INSERT INTO entreprise (user_id, nom, forme_juridique, siret, settings_json)
     VALUES ($1, 'Élec Exemple', 'Micro-entreprise', '00000000000000',
             '{"reglages": {"nomEntrepreneur": "Julien Exemple", "donneesFictives": true}}') RETURNING id`, [SALARIE])).rows[0].id;
  const fichePatron = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, settings_json) VALUES ($1, $2, 'Patron SARL', '{"reglages": {"nomEntrepreneur": "Paul Patron"}}') RETURNING id`, [PATRON, ORGA_PATRON])).rows[0].id;

  // ── Page de signature ─────────────────────────────────────────────────────
  const lien = async (uid, entreprise) => (await q(
    `INSERT INTO devis (user_id, entreprise_id, numero, type, statut, date, validite_jours, signature_token, signature_expires_at)
     VALUES ($1, $2, 'DEV-085', 'devis', 'envoye', now()::date, 30, gen_random_uuid(), now() + interval '10 days') RETURNING signature_token`,
    [uid, entreprise])).rows[0].signature_token;
  const signature = async (jeton) => commeAnonyme(async () => (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j || {});
  const demo = await signature(await lien(SALARIE, fiche));
  verifier(demo.entreprise?.donneesFictives === true && demo.entreprise?.nomEntrepreneur === 'Julien Exemple',
    `085 : la page de signature du compte démo reçoit le marqueur (${JSON.stringify(demo.entreprise?.donneesFictives)})`);
  const ordinaire = await signature(await lien(PATRON, null));
  verifier(ordinaire.entreprise && !('donneesFictives' in ordinaire.entreprise),
    '085 : une fiche ordinaire n’a pas de marqueur (rien n’apparaît chez ses clients)');
  verifier(!('settings_json' in (demo.entreprise || {})) && !('banque' in (demo.entreprise || {})),
    '085 : la liste reste fermée (ni settings_json ni autre réglage)');

  // ── Page de paiement ──────────────────────────────────────────────────────
  // La facture désigne sa fiche (le patron en a plusieurs) : c'est celle-là que la page doit montrer
  const facture = async (uid, entreprise = null) => {
    const jeton = `pay-085-${uid.slice(0, 8)}`;
    const client = (await q(`INSERT INTO clients (user_id, nom, prenom) VALUES ($1, 'Client085', 'Léa') RETURNING id`, [uid])).rows[0].id;
    await q(`INSERT INTO devis (user_id, client_id, entreprise_id, numero, type, facture_type, statut, total_ttc, payment_token) VALUES ($1, $2, $3, $5, 'facture', 'totale', 'envoye', 500, $4)`, [uid, client, entreprise, jeton, `FAC-085-${uid.slice(0, 8)}`]);
    return commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', [jeton])).rows[0].r || {});
  };
  const payeDemo = await facture(SALARIE);
  verifier(payeDemo.entreprise?.donnees_fictives === true, `085 : la page de paiement du compte démo reçoit le marqueur (${JSON.stringify(payeDemo.entreprise?.donnees_fictives)})`);
  const payeOrdinaire = await facture(PATRON, fichePatron);
  verifier(payeOrdinaire.entreprise?.donnees_fictives === false, '085 : une fiche ordinaire reçoit « faux »');
  verifier(payeDemo.facture?.reste_du != null && payeDemo.stripe_enabled === false, '085 : le reste de la réponse de paiement est inchangé');
  verifier(payeDemo.entreprise?.nom === 'Élec Exemple' && payeDemo.entreprise?.siret === '00000000000000',
    `085 : la page de paiement reçoit la fiche entreprise (avant : vide) (${payeDemo.entreprise?.nom})`);
  verifier(payeDemo.client?.nom === 'Client085' && payeDemo.client?.prenom === 'Léa', `085 : le client est transmis aussi (avant : vide) (${payeDemo.client?.nom})`);
  verifier(payeOrdinaire.entreprise?.nom === 'Patron SARL', `085 : la fiche désignée par la facture, parmi plusieurs (${payeOrdinaire.entreprise?.nom})`);

  // Client d'un autre compte : jamais livré par la facture de quelqu'un d'autre (relecture gardien-securite)
  const clientPatron = (await q(`INSERT INTO clients (user_id, organization_id, nom, prenom, email) VALUES ($1, $2, 'Secret', 'Client', 'secret@exemple.fr') RETURNING id`, [PATRON, ORGA_PATRON])).rows[0].id;
  // (le solo n'est pas membre de l'organisation du patron ; l'employé, lui, l'est)
  await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, facture_type, statut, total_ttc, payment_token) VALUES ($1, $2, $3, 'FAC-085-b', 'facture', 'totale', 'envoye', 300, 'pay-085-vol')`, [SOLO, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', clientPatron]);
  const vol = await commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', ['pay-085-vol'])).rows[0].r || {});
  verifier(vol.client && !vol.client.nom && !vol.client.email, `085 : le client d'un autre compte n'est pas livré (${JSON.stringify(vol.client)})`);
  // Facture au nom de l'organisation du patron par quelqu'un qui n'en est pas (ou plus) membre : rien
  await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, facture_type, statut, total_ttc, payment_token) VALUES ($1, $2, $3, 'FAC-085-c', 'facture', 'totale', 'envoye', 300, 'pay-085-ancien')`, [SOLO, ORGA_PATRON, clientPatron]);
  const ancien = await commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', ['pay-085-ancien'])).rows[0].r || {});
  verifier(ancien.client && !ancien.client.nom && !ancien.client.email, `085 : un non-membre ne lit pas un client de l'équipe en se réclamant d'elle (${JSON.stringify(ancien.client)})`);
  // La même facture par un membre de l'équipe : le client de l'équipe est bien transmis
  await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, facture_type, statut, total_ttc, payment_token) VALUES ($1, $2, $3, 'FAC-085-d', 'facture', 'totale', 'envoye', 300, 'pay-085-equipe')`, [SALARIE, ORGA_PATRON, clientPatron]);
  const equipe = await commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', ['pay-085-equipe'])).rows[0].r || {});
  verifier(equipe.client?.nom === 'Secret', `085 : un membre de l'équipe facture un client de l'équipe : client transmis (${equipe.client?.nom})`);
  // Facture sans client, auteur sans fiche : la page répond quand même (champs vides, pas d'erreur)
  const sansRien = await essayer(async () => {
    await q(`INSERT INTO auth.users (id, email) VALUES ('99999999-9999-4999-8999-999999999999', 'sans-fiche@exemple.fr') ON CONFLICT DO NOTHING`);
    await q(`INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc, payment_token) VALUES ($1, 'FAC-085-e', 'facture', 'totale', 'envoye', 200, 'pay-085-nu')`, ['99999999-9999-4999-8999-999999999999']);
    return commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', ['pay-085-nu'])).rows[0].r || {});
  });
  verifier(sansRien.ok && sansRien.r.facture?.numero === 'FAC-085-e' && JSON.stringify(sansRien.r.client) === '{}' && JSON.stringify(sansRien.r.entreprise) === '{}',
    `085 : facture sans client et auteur sans fiche : réponse sans erreur (${sansRien.e || JSON.stringify({ client: sansRien.r?.client, entreprise: sansRien.r?.entreprise })})`);

  // ── Idempotente : rejouée, elle n'ajoute rien ─────────────────────────────
  // (086 réécrit ensuite get_devis_for_signature : on constate que rejouer 085 ne la change plus)
  const defs = async () => (await q(`SELECT pg_get_functiondef('public.get_devis_for_signature(uuid)'::regprocedure) AS a, pg_get_functiondef('public.get_facture_for_payment(text)'::regprocedure) AS b`)).rows[0];
  const avant = await defs();
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
  const apres = await defs();
  const fois = (texte, mot) => texte.split(mot).length - 1;
  verifier(apres.a === avant.a && apres.b === avant.b && fois(avant.b, 'donnees_fictives') === 1 && avant.a.includes("'donneesFictives', CASE WHEN"),
    '085 : rejouée, elle ne change plus rien ; une seule clé ajoutée à la page de paiement');

  // ── Droits et search_path inchangés (CREATE OR REPLACE garde les droits ; pg_get_functiondef réécrit le reste)
  const droits = (await q(`SELECT p.proname, p.prosecdef, p.proconfig::text AS config, p.proacl::text AS acl,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth
    FROM pg_proc p WHERE p.oid IN ('public.get_devis_for_signature(uuid)'::regprocedure, 'public.get_facture_for_payment(text)'::regprocedure)`)).rows;
  verifier(droits.length === 2 && droits.every((d) => d.prosecdef && /search_path=public, pg_temp/.test(d.config || '') && d.anon && d.auth && !/(^|[{,])=X/.test(d.acl || '')),
    `085 : SECURITY DEFINER, search_path fixé, exécutable par un visiteur, pas par PUBLIC (${droits.map((d) => `${d.proname} ${d.config} ${d.acl}`).join(' ; ')})`);

  // Ménage (d'autres vérifications comptent les lignes des comptes)
  await q(`DELETE FROM devis WHERE numero = 'DEV-085' OR numero LIKE 'FAC-085%'`);
  await q(`DELETE FROM auth.users WHERE id = '99999999-9999-4999-8999-999999999999'`);
  await q(`DELETE FROM clients WHERE nom = 'Client085' OR id = $1`, [clientPatron]);
  await q(`DELETE FROM entreprise WHERE id IN ($1, $2)`, [fiche, fichePatron]);
}
