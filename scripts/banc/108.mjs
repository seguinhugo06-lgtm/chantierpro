// Vérifications de la migration 108 : la page de signature reçoit le RGE (rge, rgeOrganisme, rgeValidite, rgeDomaine),
// et rien d'autre de nouveau ne sort des réglages ; la fonction reste ouverte aux visiteurs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/108_rge_sur_la_page_de_signature.sql');

export async function verifier({ db, q, commeAnonyme, verifier }) {
  let rejeu = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejeu = false; }
  verifier(rejeu, '108 : migration rejouée sans erreur (idempotente)');

  // Une fiche propre à ce test, la seule du compte à être « par défaut » le temps du test
  const avant = (await q(`SELECT id FROM entreprise WHERE user_id = $1 AND COALESCE(is_default, false)`, [SOLO])).rows.map((r) => r.id);
  await q(`UPDATE entreprise SET is_default = false WHERE user_id = $1`, [SOLO]);
  const fiche = (await q(`INSERT INTO entreprise (user_id, nom, is_default, settings_json) VALUES ($1, 'Chauffage 108', true,
    '{"reglages": {"rge": "E-108", "rgeOrganisme": "Qualibat", "rgeValidite": "2099-12-31", "rgeDomaine": "QualiPAC chauffage et eau chaude sanitaire", "banque": "secret"}, "autre": "ne sort pas"}')
    RETURNING id`, [SOLO])).rows[0].id;
  const jeton = (await q(
    `INSERT INTO devis (user_id, entreprise_id, numero, type, statut, date, validite_jours, signature_token, signature_expires_at)
     VALUES ($1, $2, 'DEV-108', 'devis', 'envoye', now()::date, 30, gen_random_uuid(), now() + interval '10 days') RETURNING signature_token`,
    [SOLO, fiche])).rows[0].signature_token;

  try {
    const j = await commeAnonyme(async () => (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j || {});
    const ent = j.entreprise || {};
    verifier(ent.nom === 'Chauffage 108', `108 : la fiche du devis est lue (${ent.nom})`);
    verifier(ent.rge === 'E-108' && ent.rgeOrganisme === 'Qualibat' && ent.rgeValidite === '2099-12-31'
      && ent.rgeDomaine === 'QualiPAC chauffage et eau chaude sanitaire',
      `108 : un visiteur reçoit le numéro, l'organisme, la date de fin et l'intitulé RGE (${ent.rge} / ${ent.rgeOrganisme} / ${ent.rgeValidite} / ${ent.rgeDomaine})`);
    verifier(ent.banque === undefined && ent.autre === undefined && ent.settings_json === undefined,
      '108 : rien d\'autre des réglages ne sort (liste toujours fermée)');

    // Sans RGE saisi, aucune clé vide n'est envoyée (jsonb_strip_nulls)
    await q(`UPDATE entreprise SET settings_json = '{"reglages": {}}' WHERE id = $1`, [fiche]);
    const sans = await commeAnonyme(async () => (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j || {});
    verifier(!('rge' in (sans.entreprise || {})) && !('rgeDomaine' in (sans.entreprise || {})), '108 : sans RGE saisi, aucune clé RGE');
  } finally {
    await q(`DELETE FROM devis WHERE numero = 'DEV-108'`);
    await q(`DELETE FROM entreprise WHERE id = $1`, [fiche]);
    if (avant.length) await q(`UPDATE entreprise SET is_default = true WHERE id = ANY($1::uuid[])`, [avant]);
  }
}
