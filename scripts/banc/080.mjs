// Vérifications de la migration 080 : champs perdus à l'enregistrement.
// Chaque colonne ajoutée garde ce que l'app y écrit (relu après écriture, par l'artisan lui-même) ;
// un avoir survit à la disparition de sa facture d'origine ; rien ne change pour les lignes existantes ;
// la migration se rejoue sans erreur.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/080_champs_perdus_a_l_enregistrement.sql');

export async function verifier({ db, q, en, verifier }) {
  // ── Pointages : une ligne d'avant 080 n'est ni validée ni verrouillée ; validation et verrou se gardent ──
  const avant = (await q(`SELECT approuve, verrouille, manuel FROM pointages LIMIT 1`)).rows[0];
  verifier(avant === undefined || (avant.approuve === false && avant.verrouille === false),
    '080 : un pointage existant n\'est ni validé ni verrouillé par la migration');
  const pointage = (await en(SOLO, () => q(
    `INSERT INTO pointages (user_id, date, heures, manuel) VALUES ($1, '2026-10-06', 7.5, true) RETURNING id, approuve, verrouille`, [SOLO]))).rows[0];
  verifier(pointage.approuve === false && pointage.verrouille === false,
    '080 : un pointage neuf n\'est ni validé ni verrouillé par défaut');
  await en(SOLO, () => q(`UPDATE pointages SET approuve = true, verrouille = true, signe_le = now() WHERE id = $1`, [pointage.id]));
  const relu = (await q(`SELECT approuve, verrouille, manuel, signe_le, heures FROM pointages WHERE id = $1`, [pointage.id])).rows[0];
  verifier(relu.approuve === true && relu.verrouille === true && relu.manuel === true && relu.signe_le !== null && Number(relu.heures) === 7.5,
    '080 : validation, verrouillage, saisie manuelle et signature d\'un pointage sont conservés');

  // ── Équipe : l'assureur de la décennale d'un sous-traitant ──
  const st = (await en(SOLO, () => q(
    `INSERT INTO equipe (user_id, nom, type, decennale_assureur) VALUES ($1, 'Plâtrerie Dupuy', 'sous_traitant', 'SMABTP') RETURNING id`, [SOLO]))).rows[0].id;
  verifier((await q(`SELECT decennale_assureur FROM equipe WHERE id = $1`, [st])).rows[0].decennale_assureur === 'SMABTP',
    '080 : l\'assureur de la décennale d\'un sous-traitant est conservé');

  // ── Devis : date d'envoi, avoir relié à sa facture d'origine ──
  const facture = (await en(SOLO, () => q(`INSERT INTO devis (user_id, numero, date_envoi) VALUES ($1, 'FAC-2026-00080', '2026-10-09T08:30:00Z') RETURNING id`, [SOLO]))).rows[0].id;
  const avoir = (await en(SOLO, () => q(
    `INSERT INTO devis (user_id, numero, avoir_source_id, avoir_type, avoir_motif, avoir_motif_detail)
     VALUES ($1, 'AV-2026-00080', $2, 'total', 'erreur_facturation', 'Mauvais taux de TVA') RETURNING id`, [SOLO, facture]))).rows[0].id;
  const lu = (await q(`SELECT avoir_source_id, avoir_type, avoir_motif, avoir_motif_detail FROM devis WHERE id = $1`, [avoir])).rows[0];
  verifier(lu.avoir_source_id === facture && lu.avoir_type === 'total' && lu.avoir_motif === 'erreur_facturation' && lu.avoir_motif_detail === 'Mauvais taux de TVA',
    '080 : un avoir garde sa facture d\'origine, son type et son motif');
  verifier((await q(`SELECT date_envoi FROM devis WHERE id = $1`, [facture])).rows[0].date_envoi !== null,
    '080 : la date d\'envoi d\'un devis est conservée');
  await q(`DELETE FROM devis WHERE id = $1`, [facture]);
  const orphelin = (await q(`SELECT id, avoir_source_id FROM devis WHERE id = $1`, [avoir])).rows[0];
  verifier(orphelin && orphelin.avoir_source_id === null,
    '080 : supprimer la facture d\'origine ne supprime pas l\'avoir (le lien est seulement coupé)');

  // Ménage : les vérifications suivantes (072) comptent les devis du solo
  await q(`DELETE FROM devis WHERE id = $1`, [avoir]);
  await q(`DELETE FROM pointages WHERE id = $1`, [pointage.id]);
  await q(`DELETE FROM equipe WHERE id = $1`, [st]);

  // ── Rejouable ──
  let rejouee = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejouee = false; }
  verifier(rejouee, '080 : la migration se rejoue sans erreur');
}
