// Vérifications de la migration 102 : une série de numéros par contribuable (SIREN) ; l'entreprise d'une pièce émise
// figée ; un avoir émis par l'entreprise de sa facture.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/102_serie_de_numeros_par_siren.sql');

export async function verifier({ db, q, en, verifier }) {
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const an = Number((await q(`SELECT extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::int AS a`)).rows[0].a);
  const fac = (n) => `FAC-${an}-${String(n).padStart(5, '0')}`;
  const commeSolo = (sql, p) => en(SOLO, () => q(sql, p));
  const ids = [];
  const creer = async (o) => {
    const r = (await commeSolo(
      `INSERT INTO devis (user_id, organization_id, entreprise_id, type, facture_type, statut, total_ttc, avoir_source_id, numero)
       VALUES ($1, $2, $3, 'facture', $4, $6, 100, $5, 'X') RETURNING id, numero, entreprise_id, siren_emetteur`,
      [SOLO, ORG_SOLO, o.ent ?? null, o.nature || 'totale', o.avoirDe || null, o.statut || 'envoye'])).rows[0];
    ids.push(r.id);
    return r;
  };
  const fiche = async (nom, siret) => (await q(`INSERT INTO entreprise (user_id, organization_id, nom, siret) VALUES ($1, $2, $3, $4) RETURNING id`,
    [SOLO, ORG_SOLO, nom, siret])).rows[0].id;

  // Les vérifications de 101 rejouent ses définitions (dernier_numero_facture, suivre_numerotation) : remettre celles de 102
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));

  // État maîtrisé : les fiches actives de l'organisation mises de côté (elles reviennent à la fin)
  const actives = (await q('SELECT id FROM entreprise WHERE organization_id = $1 AND archived_at IS NULL', [ORG_SOLO])).rows.map((r) => r.id);
  await q('UPDATE entreprise SET archived_at = now() WHERE id = ANY($1)', [actives]);
  const A1 = await fiche('Électricité 102', '11111111100011');
  const A2 = await fiche('Plomberie 102 (même EI)', '111 111 111 00029');
  const B = await fiche('Société 102', '22222222200011');

  // 1. Deux fiches d'un même SIREN partagent la série ; un autre SIREN a la sienne
  const a1 = await creer({ ent: A1 });
  const a2 = await creer({ ent: A2 });
  const a3 = await creer({ ent: A1 });
  const b1 = await creer({ ent: B });
  const b2 = await creer({ ent: B });
  const b3 = await creer({ ent: B });
  const b4 = await creer({ ent: B });
  verifier(a1.numero === fac(1) && a2.numero === fac(2) && a3.numero === fac(3) && b1.numero === fac(1) && b4.numero === fac(4)
    && a1.siren_emetteur === '111111111' && a2.siren_emetteur === '111111111',
    `102 : une série par SIREN, inscrit sur la facture (même EI : ${a1.numero}, ${a2.numero}, ${a3.numero} ; autre SIREN : ${b1.numero} … ${b4.numero} ; ${a1.siren_emetteur})`);

  // 2. Archiver une fiche ne fait plus sauter de numéros dans la série d'une autre (critère du juriste : B à 4, A continue à 4)
  await q('UPDATE entreprise SET archived_at = now() WHERE id = $1', [B]);
  const a4 = await creer({ ent: A1 });
  verifier(a4.numero === fac(4) && b2.numero === fac(2) && b3.numero === fac(3),
    `102 : archiver une fiche d'un autre SIREN ne change pas la série (${a4.numero})`);
  await q('UPDATE entreprise SET archived_at = NULL WHERE id = $1', [B]);

  // 3. L'entreprise d'une facture émise ne change plus
  await commeSolo('UPDATE devis SET entreprise_id = $2, objet = $3 WHERE id = $1', [a1.id, B, 'Note 102']);
  const apres = (await q('SELECT entreprise_id, objet FROM devis WHERE id = $1', [a1.id])).rows[0];
  verifier(apres.entreprise_id === A1 && apres.objet === 'Note 102',
    `102 : l'entreprise d'une facture émise ne change pas, sans bloquer l'enregistrement (${apres.entreprise_id === A1})`);

  // 4. Un avoir est émis par l'entreprise de sa facture, même si l'app en envoie une autre (l'entreprise ouverte à l'écran)
  const av = await creer({ nature: 'avoir', avoirDe: a3.id });
  const av2 = await creer({ nature: 'avoir', avoirDe: a3.id, ent: B });
  verifier(av.entreprise_id === A1 && av.numero === `AV-${an}-00001` && av2.entreprise_id === A1 && av2.numero === `AV-${an}-00002`,
    `102 : un avoir prend l'entreprise de sa facture (${av.entreprise_id === A1}, ${av.numero} ; envoyé avec une autre : ${av2.entreprise_id === A1}, ${av2.numero})`);

  // R1 (juriste) : corriger le SIRET d'une fiche ne déplace pas ses factures numérotées ; pas de doublon dans la série S1
  await q(`UPDATE entreprise SET siret = '33333333300011' WHERE id = $1`, [A1]);
  const a2bis = await creer({ ent: A2 });
  verifier(a2bis.numero === fac(5), `102 : après correction du SIRET d'une fiche, la série de son ancien SIREN continue sans doublon (${a2bis.numero})`);

  // R2 : un brouillon numéroté garde son entreprise et son SIREN
  const brouillon = await creer({ ent: A2, statut: 'brouillon' });
  await commeSolo('UPDATE devis SET entreprise_id = $2, siren_emetteur = $3 WHERE id = $1', [brouillon.id, B, '999999999']);
  const brApres = (await q('SELECT entreprise_id, siren_emetteur FROM devis WHERE id = $1', [brouillon.id])).rows[0];
  verifier(brouillon.numero === fac(6) && brApres.entreprise_id === A2 && brApres.siren_emetteur === '111111111',
    `102 : un brouillon numéroté garde son entreprise et son SIREN (${brouillon.numero}, ${brApres.entreprise_id === A2}, ${brApres.siren_emetteur})`);

  // 5. Les fiches sans SIREN forment ensemble une série ; une facture sans entreprise compte dans chaque série
  const C1 = await fiche('Sans SIRET 102 a', null);
  const C2 = await fiche('Sans SIRET 102 b', '');
  const c1 = await creer({ ent: C1 });
  const c2 = await creer({ ent: C2 });
  const ancienne = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc)
    VALUES ($1, $2, $3, 'facture', 'totale', 'envoye', 100) RETURNING id`, [SOLO, ORG_SOLO, fac(30)])).rows[0].id;
  ids.push(ancienne);
  const a5 = await creer({ ent: A1 });
  verifier(c1.numero === fac(1) && c2.numero === fac(2) && a5.numero === fac(31) && c1.siren_emetteur === null,
    `102 : fiches sans SIREN ensemble (${c1.numero}, ${c2.numero}) ; une facture sans entreprise compte dans chaque série (${a5.numero})`);

  const fonction = (await q(`SELECT position('siren_emetteur' in pg_get_functiondef('public.dernier_numero_facture(uuid, uuid, text, integer)'::regprocedure)) > 0 AS s,
    position('NEW.entreprise_id := OLD.entreprise_id' in pg_get_functiondef('public.garder_organisation_piece_emise()'::regprocedure)) > 0 AS e`)).rows[0];
  verifier(fonction.s && fonction.e, `102 : contrôles de l'en-tête (${JSON.stringify(fonction)})`);
  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `102 : la migration se rejoue sans erreur (${rejeu})`);

  // Ménage (en propriétaire)
  await q('DELETE FROM devis WHERE id = ANY($1) AND facture_type = $2', [ids, 'avoir']);
  await q('DELETE FROM devis WHERE id = ANY($1)', [ids]);
  await q('DELETE FROM entreprise WHERE id = ANY($1)', [[A1, A2, B, C1, C2]]);
  await q('UPDATE entreprise SET archived_at = NULL WHERE id = ANY($1)', [actives]);
}
