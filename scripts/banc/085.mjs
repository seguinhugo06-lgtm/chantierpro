// Vérifications de la migration 085 : le marqueur « données fictives » (compte de démonstration, D-26) atteint
// les pages publiques de signature et de paiement, et rien d'autre ne change. Constaté comme le client : un
// visiteur avec le lien.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/085_marqueur_donnees_fictives_pour_les_pages_publiques.sql');

const ORGA_PATRON = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export async function verifier({ db, q, commeAnonyme, verifier }) {
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
    await q(`INSERT INTO devis (user_id, client_id, entreprise_id, numero, type, facture_type, statut, total_ttc, payment_token) VALUES ($1, $2, $3, 'FAC-085', 'facture', 'totale', 'envoye', 500, $4)`, [uid, client, entreprise, jeton]);
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

  // ── Idempotente : rejouée, elle n'ajoute rien ─────────────────────────────
  const avant = (await q(`SELECT pg_get_functiondef('public.get_devis_for_signature(uuid)'::regprocedure) AS a, pg_get_functiondef('public.get_facture_for_payment(text)'::regprocedure) AS b`)).rows[0];
  const fois = (texte, mot) => texte.split(mot).length - 1;
  verifier(fois(avant.a, 'donneesFictives') === 2 && fois(avant.b, 'donnees_fictives') === 1, '085 : une seule clé ajoutée par fonction');

  // Ménage (d'autres vérifications comptent les lignes des comptes)
  await q(`DELETE FROM devis WHERE numero IN ('DEV-085', 'FAC-085')`);
  await q(`DELETE FROM clients WHERE nom = 'Client085'`);
  await q(`DELETE FROM entreprise WHERE id IN ($1, $2)`, [fiche, fichePatron]);
}
