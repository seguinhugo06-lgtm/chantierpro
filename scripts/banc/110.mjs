// Vérifications de la migration 110 : la colonne entreprise.metiers (liste fermée, reprise des choix d'avant, droits
// de la table), et la liste « qualifications » sur la page de signature, réduite à ses champs imprimables.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, PATRON } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/110_metiers_et_qualifications.sql');

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  // Une fiche écrite AVANT la colonne, avec un choix dans le repli de l'app (une valeur inconnue, un doublon)
  await q(`ALTER TABLE entreprise DROP CONSTRAINT IF EXISTS entreprise_metiers_connus`);
  await q(`ALTER TABLE entreprise DROP COLUMN IF EXISTS metiers`);
  const avantCol = (await q(`INSERT INTO entreprise (user_id, nom, settings_json) VALUES ($1, 'Repli 110',
    '{"reglages": {"metiers": ["plombier", "inconnu", "electricien", "plombier"]}}') RETURNING id`, [SOLO])).rows[0].id;

  let rejeu = true;
  try {
    await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
    await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
  } catch (e) { rejeu = false; console.error(e.message); }
  verifier(rejeu, '110 : migration appliquée et rejouée sans erreur (idempotente)');

  const repris = (await q(`SELECT metiers FROM entreprise WHERE id = $1`, [avantCol])).rows[0].metiers;
  verifier(JSON.stringify(repris) === JSON.stringify(['electricien', 'plombier']),
    `110 : le choix fait avant la colonne est repris, sans valeur inconnue ni doublon (${JSON.stringify(repris)})`);
  const vide = (await q(`INSERT INTO entreprise (user_id, nom) VALUES ($1, 'Sans choix 110') RETURNING metiers`, [SOLO])).rows[0].metiers;
  verifier(Array.isArray(vide) && vide.length === 0, '110 : une fiche sans choix a une liste vide (app inchangée)');

  // Liste fermée
  let refuse = false;
  try { await q(`UPDATE entreprise SET metiers = ARRAY['plombier', 'astronaute'] WHERE id = $1`, [avantCol]); } catch { refuse = true; }
  verifier(refuse, '110 : un métier inconnu est refusé par la base');
  let nul = false;
  try { await q(`UPDATE entreprise SET metiers = NULL WHERE id = $1`, [avantCol]); } catch { nul = true; }
  verifier(nul, '110 : la liste ne peut pas être NULL');

  // Droits : l'auteur écrit son choix ; un autre compte ne lit ni n'écrit la fiche (policies existantes)
  const ecrit = await en(SOLO, async () => (await q(`UPDATE entreprise SET metiers = ARRAY['ramoneur'] WHERE id = $1 RETURNING id`, [avantCol])).rows.length);
  verifier(ecrit === 1, `110 : l'auteur de la fiche enregistre son métier (${ecrit} ligne)`);
  const autre = await en(PATRON, async () => (await q(`UPDATE entreprise SET metiers = ARRAY['macon'] WHERE id = $1 RETURNING id`, [avantCol])).rows.length);
  const relu = (await q(`SELECT metiers FROM entreprise WHERE id = $1`, [avantCol])).rows[0].metiers;
  verifier(autre === 0 && JSON.stringify(relu) === '["ramoneur"]', `110 : un autre compte ne modifie pas le métier d'une fiche qui n'est pas la sienne (${autre} ligne, ${JSON.stringify(relu)})`);
  const anonyme = await commeAnonyme(async () => {
    try { return (await q(`SELECT metiers FROM entreprise WHERE id = $1`, [avantCol])).rows.length; } catch { return 0; }
  });
  verifier(anonyme === 0, '110 : un visiteur ne lit pas la fiche');

  // Page de signature : la liste, réduite aux champs imprimables
  const avant = (await q(`SELECT id FROM entreprise WHERE user_id = $1 AND COALESCE(is_default, false)`, [SOLO])).rows.map((r) => r.id);
  await q(`UPDATE entreprise SET is_default = false WHERE user_id = $1`, [SOLO]);
  const quals = [
    { type: 'rge', intitule: 'QualiPAC', organisme: 'Qualit\'EnR', numero: 'QPAC-1', fin: '2099-12-31', imprimer: true, secret: 'ne sort pas' },
    { type: 'irve', intitule: 'IRVE P1', organisme: 'Qualifelec', numero: 'IRVE-2', fin: '2099-06-30', motsCles: 'borne' },
    'pas un objet',
    { type: 'pg_gaz', intitule: 'PG', organisme: 'Qualigaz', numero: 'CACHE-1', fin: '2099-01-01', imprimer: false },
    { type: 'sap', numero: 'CACHE-2', fin: '2019-01-01', ou: 'non' },
    { type: 'autre', intitule: 'X', organisme: 'Y', numero: 'SI-3', fin: '2099-01-01', ou: 'si', motsCles: '' },
  ];
  const fiche = (await q(`INSERT INTO entreprise (user_id, nom, is_default, settings_json) VALUES ($1, 'Qualifs 110', true, $2) RETURNING id`,
    [SOLO, JSON.stringify({ reglages: { qualifications: quals, banque: 'secret' } })])).rows[0].id;
  const jeton = (await q(
    `INSERT INTO devis (user_id, entreprise_id, numero, type, statut, date, validite_jours, signature_token, signature_expires_at, lignes, sections)
     VALUES ($1, $2, 'DEV-110', 'devis', 'envoye', now()::date, 30, gen_random_uuid(), now() + interval '10 days', $3::jsonb, to_jsonb($4::text)) RETURNING signature_token`,
    [SOLO, fiche,
      // Lignes en tableau ; sections en texte JSON (les deux formes écrites par l'app), prix d'achat à tous les niveaux
      JSON.stringify([{ description: 'Borne', quantite: 2, prixUnitaire: 1200, prixAchat: 700, marge: 41 }, 'pas un objet']),
      JSON.stringify([{ titre: 'Lot A', prix_achat: 5, lignes: [{ description: 'Câble', quantite: 10, prixUnitaire: 3, prixAchat: 1.2 }] }])])).rows[0].signature_token;
  try {
    const j = await commeAnonyme(async () => (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j || {});
    const ent = j.entreprise || {};
    const liste = ent.qualifications || [];
    verifier(ent.nom === 'Qualifs 110', `110 : la fiche du devis est lue (${ent.nom})`);
    verifier(liste.length === 3 && liste[0].numero === 'QPAC-1' && liste[1].type === 'irve' && liste[1].motsCles === 'borne' && liste[0].imprimer === true,
      `110 : un visiteur reçoit les qualifications, dans l'ordre (${JSON.stringify(liste)})`);
    verifier(liste.every((x) => !('secret' in x)) && ent.banque === undefined && ent.settings_json === undefined,
      '110 : rien d\'autre ne sort, ni des réglages ni des qualifications (champs fermés)');
    verifier(!JSON.stringify(liste).includes('CACHE-1') && !JSON.stringify(liste).includes('CACHE-2'),
      '110 : une qualification « ne pas imprimer » ne sort pas (imprimer: false ou ou: non)');
    verifier(liste.some((x) => x.numero === 'SI-3' && x.ou === 'si'), '110 : le choix « seulement si » sort avec la qualification (ou = si)');

    // Prix d'achat : jamais vers le client (relecture gardien-securite du 4 nov.)
    const texteJ = JSON.stringify(j);
    verifier(!/prixAchat|prix_achat|"marge"/.test(texteJ), `110 : ni prix d'achat ni marge dans la réponse de la page de signature (${texteJ.match(/prixAchat|prix_achat|"marge"/)?.[0] || 'aucun'})`);
    const l0 = (j.devis?.lignes || [])[0] || {};
    const s0 = ((j.devis?.sections || [])[0] || {});
    const sl0 = (s0.lignes || [])[0] || {};
    verifier(l0.quantite === 2 && l0.prixUnitaire === 1200 && l0.description === 'Borne' && (j.devis.lignes || [])[1] === 'pas un objet',
      `110 : les lignes gardent quantités et prix de vente (${JSON.stringify(j.devis?.lignes)})`);
    verifier(s0.titre === 'Lot A' && sl0.quantite === 10 && sl0.prixUnitaire === 3 && sl0.description === 'Câble',
      `110 : les sections (enregistrées en texte) gardent titres, quantités et prix de vente (${JSON.stringify(j.devis?.sections)})`);
    const interne = (await q(`SELECT has_function_privilege('anon', 'public.lignes_pour_le_client(jsonb)', 'execute') AS ok`)).rows[0].ok;
    verifier(interne === false, '110 : la fonction interne lignes_pour_le_client n\'est pas exécutable par un visiteur');
    const casse = (await q(`SELECT public.lignes_pour_le_client(to_jsonb('pas du json'::text)) AS v`)).rows[0].v;
    verifier(JSON.stringify(casse) === '[]', `110 : un texte illisible donne une liste vide (${JSON.stringify(casse)})`);
    const objet = (await q(`SELECT public.lignes_pour_le_client('{"prixAchat": 9}'::jsonb) AS v`)).rows[0].v;
    verifier(JSON.stringify(objet) === '[]', `110 : un objet au lieu d'une liste ne sort pas (${JSON.stringify(objet)})`);

    await q(`UPDATE entreprise SET settings_json = '{"reglages": {"qualifications": "texte"}}' WHERE id = $1`, [fiche]);
    const mal = await commeAnonyme(async () => (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j || {});
    verifier(!('qualifications' in (mal.entreprise || {})), '110 : une liste mal formée ne sort pas (et ne casse pas la page)');

    const ouvert = (await q(`SELECT has_function_privilege('anon', 'public.get_devis_for_signature(uuid)', 'execute') AS ok`)).rows[0].ok;
    verifier(ouvert === true, '110 : la page de signature reste ouverte aux visiteurs');
  } finally {
    await q(`DELETE FROM devis WHERE numero = 'DEV-110'`);
    await q(`DELETE FROM entreprise WHERE id = ANY($1::uuid[])`, [[fiche, avantCol]]);
    await q(`DELETE FROM entreprise WHERE nom = 'Sans choix 110'`);
    if (avant.length) await q(`UPDATE entreprise SET is_default = true WHERE id = ANY($1::uuid[])`, [avant]);
  }
}
