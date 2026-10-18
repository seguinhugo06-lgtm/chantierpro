// Vérifications de la migration 103 : le contenu imprimé d'une facture émise est figé (valeur envoyée ignorée, comme le
// montant encaissé en 098) ; l'enregistrement du reste passe ; un brouillon reste modifiable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/103_contenu_d_une_facture_emise_fige.sql');

export async function verifier({ db, q, en, verifier }) {
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const commeSolo = (sql, p) => en(SOLO, () => q(sql, p));
  const lignes = JSON.stringify([{ designation: 'Tableau électrique', quantite: 1, prixUnitaire: 800 }]);
  const doc = async (statut) => (await q(
    `INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, lignes, objet, conditions, notes,
       date_echeance, remise_globale, tva_rate, client_nom)
     VALUES ($1, $2, $3, 'facture', 'totale', $4, 960, $5::jsonb, 'Rénovation', '30 jours', 'Garantie 1 an', '2026-11-30', 0, 20, 'M. Martin')
     RETURNING id`, [SOLO, ORG_SOLO, `FAC-103-${statut}`, statut, lignes])).rows[0].id;
  const contenu = async (id) => (await q(`SELECT lignes, objet, conditions, notes, date_echeance::text AS echeance, remise_globale,
    tva_rate, client_nom, payment_status FROM devis WHERE id = $1`, [id])).rows[0];

  // 1. Facture émise : la réécriture du contenu par l'API est ignorée, sans bloquer le reste de l'enregistrement
  const E = await doc('envoye');
  const reecrit = await refus(() => commeSolo(
    `UPDATE devis SET lignes = '[{"designation":"Autre chose","quantite":9,"prixUnitaire":1}]'::jsonb, objet = 'Autre', conditions = 'Comptant',
       notes = 'Sans garantie', date_echeance = '2027-06-30', remise_globale = 50, tva_rate = 5.5, client_nom = 'Quelqu''un d''autre',
       payment_status = 'note-103' WHERE id = $1`, [E]));
  const e = await contenu(E);
  verifier(reecrit === false && e.lignes[0].designation === 'Tableau électrique' && e.objet === 'Rénovation' && e.conditions === '30 jours'
    && e.notes === 'Garantie 1 an' && e.echeance === '2026-11-30' && Number(e.remise_globale) === 0 && Number(e.tva_rate) === 20
    && e.client_nom === 'M. Martin' && e.payment_status === 'note-103',
    `103 : le contenu d'une facture émise ne change plus ; le reste s'enregistre (${reecrit} / ${e.lignes[0].designation}, ${e.objet}, ${e.payment_status})`);

  // 2. Un brouillon reste modifiable
  const B = await doc('brouillon');
  await commeSolo(`UPDATE devis SET objet = 'Rénovation cuisine', lignes = '[{"designation":"Prises","quantite":4,"prixUnitaire":40}]'::jsonb WHERE id = $1`, [B]);
  const b = await contenu(B);
  verifier(b.objet === 'Rénovation cuisine' && b.lignes[0].designation === 'Prises', `103 : un brouillon reste modifiable (${b.objet})`);

  // 3. Le serveur n'est pas concerné
  await q(`UPDATE devis SET objet = 'Corrigé par le serveur' WHERE id = $1`, [E]);
  verifier((await contenu(E)).objet === 'Corrigé par le serveur', '103 : le serveur n\'est pas concerné');

  const tgtype = (await q(`SELECT tgtype FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_figer_contenu_facture'`)).rows[0]?.tgtype;
  verifier(Number(tgtype) === 19, `103 : contrôle de l'en-tête (tgtype ${tgtype})`);
  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `103 : la migration se rejoue sans erreur (${rejeu})`);

  // Ménage (en propriétaire)
  await q('DELETE FROM devis WHERE id = ANY($1)', [[E, B]]);
}
