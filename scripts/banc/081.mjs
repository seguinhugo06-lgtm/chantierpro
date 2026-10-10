// Vérifications de la migration 081 : la page de paiement (visiteur, jeton opaque) connaît les avoirs et le
// reste dû. Une facture annulée par avoir, un brouillon, un avoir ne sont pas payables ; un avoir partiel et
// un paiement enregistré réduisent le reste dû ; un avoir d'un autre compte ne compte pas ; jeton inconnu refusé.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, PATRON } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/081_page_de_paiement_avoirs_et_reste_du.sql');

export async function verifier({ db, q, commeAnonyme, verifier }) {
  const facture = async (jeton, o = {}) => (await q(
    `INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc, montant_paye, payment_token)
     VALUES ($1, $2, 'facture', $3, $4, $5, $6, $7) RETURNING id`,
    [o.user || SOLO, o.numero || `FAC-081-${jeton}`, o.type || 'totale', o.statut || 'envoye', o.total ?? 1000, o.paye ?? 0, jeton])).rows[0].id;
  const avoir = (source, montant, statut = 'envoye', user = SOLO) => q(
    `INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc, avoir_source_id) VALUES ($1, 'AV-081', 'facture', 'avoir', $2, $3, $4)`,
    [user, statut, -montant, source]);
  const lire = (jeton) => commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', [jeton])).rows[0].r);

  // Facture ordinaire : payable, reste dû = total
  await facture('jeton-ok');
  let r = await lire('jeton-ok');
  verifier(r.facture.payable === true && Number(r.facture.reste_du) === 1000, `081 : une facture due est payable pour son total (${JSON.stringify({ p: r.facture.payable, r: r.facture.reste_du })})`);

  // Avoir total émis : annulée, plus payable
  const f2 = await facture('jeton-avoir-total');
  await avoir(f2, 1000);
  r = await lire('jeton-avoir-total');
  verifier(r.facture.payable === false && Number(r.facture.reste_du) === 0 && Number(r.facture.montant_credite) === 1000,
    '081 : une facture annulée par un avoir total n\'est plus payable (reste dû 0)');

  // Avoir partiel + paiement enregistré : reste dû réduit d'autant
  const f3 = await facture('jeton-partiel');
  await avoir(f3, 300);
  await q(`INSERT INTO paiements (user_id, devis_id, montant) VALUES ($1, $2, 400)`, [SOLO, f3]);
  r = await lire('jeton-partiel');
  verifier(r.facture.payable === true && Number(r.facture.reste_du) === 300 && Number(r.facture.recu) === 400,
    `081 : avoir partiel (300) et paiement enregistré (400) déduits : reste 300 (${r.facture.reste_du})`);

  // Un avoir brouillon ou annulé ne crédite rien ; un avoir d'un AUTRE compte non plus
  const f4 = await facture('jeton-brouillon-avoir');
  await avoir(f4, 1000, 'brouillon');
  await avoir(f4, 1000, 'annule');
  await avoir(f4, 1000, 'envoye', PATRON);
  r = await lire('jeton-brouillon-avoir');
  verifier(r.facture.payable === true && Number(r.facture.reste_du) === 1000,
    '081 : avoir brouillon, annulé ou d\'un autre compte : aucun crédit');

  // Brouillon, avoir, payée : pas payables
  await facture('jeton-brouillon', { statut: 'brouillon' });
  await facture('jeton-est-avoir', { type: 'avoir', total: -200 });
  await facture('jeton-payee', { statut: 'payee', paye: 1000 });
  const nonPayables = await Promise.all(['jeton-brouillon', 'jeton-est-avoir', 'jeton-payee'].map(lire));
  verifier(nonPayables.every((x) => x.facture.payable === false), '081 : brouillon, avoir et facture payée ne sont pas payables');

  // Moins de 0,50 € restant : pas payable (minimum Stripe)
  await facture('jeton-centimes', { paye: 999.7 });
  verifier((await lire('jeton-centimes')).facture.payable === false, '081 : 0,30 € restant : pas payable');

  // Jeton inconnu : refus, rien d'autre
  r = await lire('jeton-inconnu');
  verifier(r.error === 'Token invalide ou expire' && !r.facture, '081 : jeton inconnu refusé');

  // Rejouable
  let rejouee = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejouee = false; }
  verifier(rejouee, '081 : la migration se rejoue sans erreur');

  // Ménage (les vérifications suivantes comptent les devis du solo)
  await q(`DELETE FROM paiements WHERE devis_id = $1`, [f3]);
  await q(`DELETE FROM devis WHERE numero LIKE 'AV-081%' OR numero LIKE 'FAC-081-%'`);
}
