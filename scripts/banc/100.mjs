// Vérifications de la migration 100 : ni avoir ni encaissement sur un brouillon de facture. Le socle porte la RLS de
// production de `devis` et `paiements`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/100_ni_avoir_ni_encaissement_sur_un_brouillon.sql');

export async function verifier({ db, q, en, verifier }) {
  // Refus : le message ; réussite : false
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const doc = async (o) => (await q(
    `INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, avoir_source_id)
     VALUES ($1, $2, $3, 'facture', $4, $5, $6, $7) RETURNING id`,
    [SOLO, ORG_SOLO, o.numero, o.nature || 'totale', o.statut || 'envoye', o.total, o.avoirDe || null])).rows[0].id;
  const commeSolo = (sql, p) => en(SOLO, () => q(sql, p));
  const avoirSur = (source, numero) => refus(() => commeSolo(
    `INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc, avoir_source_id)
     VALUES ($1, $2, 'facture', 'avoir', 'brouillon', -100, $3)`, [SOLO, numero, source]));
  const payer = (facture, id = null) => refus(() => commeSolo(
    `INSERT INTO paiements (id, user_id, devis_id, montant) VALUES (COALESCE($3, gen_random_uuid()), $1, $2, 100)`, [SOLO, facture, id]));

  // 1. Un avoir rectifie une facture émise
  const B = await doc({ numero: null, statut: 'brouillon', total: 500 });
  const E = await doc({ numero: 'FAC-100-1', total: 500 });
  const surBrouillon = await avoirSur(B, 'AV-100-1');
  const surEmise = await avoirSur(E, 'AV-100-2');
  verifier(/rectifie une facture émise : ce brouillon se corrige directement/.test(surBrouillon || '') && surEmise === false,
    `100 : un avoir se crée sur une facture émise, pas sur un brouillon (${surBrouillon} / ${surEmise})`);
  // Rattacher après coup un avoir à un brouillon : refusé aussi
  const A = (await q(`SELECT id FROM devis WHERE numero = 'AV-100-2'`)).rows[0].id;
  const rattache = await refus(() => commeSolo('UPDATE devis SET avoir_source_id = $2 WHERE id = $1', [A, B]));
  const emis = await refus(() => commeSolo(`UPDATE devis SET statut = 'envoye' WHERE id = $1`, [A]));
  verifier(/rectifie une facture émise/.test(rattache || '') && emis === false,
    `100 : un avoir ne se rattache pas à un brouillon après coup ; rattaché à une facture émise, il s'émet (${rattache} / ${emis})`);

  // 2. Un encaissement se rattache à une facture émise
  const surBrouillonPaye = await payer(B);
  const surEmisePaye = await payer(E, '0aaaaaaa-0100-4000-8000-000000000001');
  verifier(/se rattache à une facture émise : envoyez d'abord la facture/.test(surBrouillonPaye || '') && surEmisePaye === false,
    `100 : un encaissement s'enregistre sur une facture émise, pas sur un brouillon (${surBrouillonPaye} / ${surEmisePaye})`);
  // Rejeu à l'identique (upsert de la file hors ligne) d'un paiement déjà enregistré : passe
  const rejeu = await refus(() => commeSolo(
    `INSERT INTO paiements (id, user_id, devis_id, montant) VALUES ('0aaaaaaa-0100-4000-8000-000000000001', $1, $2, 100)
     ON CONFLICT (id) DO UPDATE SET montant = EXCLUDED.montant`, [SOLO, E]));
  verifier(rejeu === false, `100 : le rejeu à l'identique d'un paiement passe (${rejeu})`);

  // 3. Le serveur n'est pas concerné
  await q('INSERT INTO paiements (user_id, organization_id, devis_id, montant) VALUES ($1, $2, $3, 10)', [SOLO, ORG_SOLO, B]);
  const parServeur = Number((await q('SELECT count(*) AS n FROM paiements WHERE devis_id = $1', [B])).rows[0].n);
  verifier(parServeur === 1, `100 : le serveur n'est pas concerné (${parServeur})`);

  const tg = Object.fromEntries((await q(`SELECT tgname, tgtype FROM pg_trigger
    WHERE tgname IN ('trg_verifier_avoir_source', 'trg_paiement_sur_facture_emise')`)).rows.map((r) => [r.tgname, Number(r.tgtype)]));
  verifier(tg.trg_verifier_avoir_source === 23 && tg.trg_paiement_sur_facture_emise === 7, `100 : contrôles de l'en-tête (${JSON.stringify(tg)})`);

  const rejouee = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejouee === false, `100 : la migration se rejoue sans erreur (${rejouee})`);

  // Ménage (en propriétaire) : les vérifications de 072 comptent les devis du compte
  await q('DELETE FROM paiements WHERE devis_id = ANY($1)', [[B, E]]);
  await q(`DELETE FROM devis WHERE numero LIKE 'AV-100-%'`);
  await q('DELETE FROM devis WHERE id = ANY($1)', [[B, E]]);
}
