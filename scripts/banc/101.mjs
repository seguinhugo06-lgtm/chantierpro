// Vérifications de la migration 101 : le numéro d'une facture ou d'un avoir est attribué par la base, à la suite de sa
// série, sans trou ; l'entreprise qui émet est contrôlée. La simultanéité (deux connexions) ne se joue pas au banc (une
// seule connexion PGlite) : le verrou consultatif et la relecture par instruction en READ COMMITTED en répondent ; ici,
// les attributions successives.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO, PATRON, ORG_PATRON } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/101_numero_de_facture_attribue_par_la_base.sql');

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const an = Number((await q(`SELECT extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::int AS a`)).rows[0].a);
  const commeSolo = (sql, p) => en(SOLO, () => q(sql, p));
  const ids = [];
  const creer = async (o) => {
    const r = (await en(o.par || SOLO, () => q(
      `INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, facture_type, statut, total_ttc, avoir_source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 100, $8) RETURNING id, numero, entreprise_id`,
      [o.par || SOLO, o.org || ORG_SOLO, o.ent ?? null, o.numero ?? null, o.type || 'facture', o.nature || 'totale',
        o.statut || 'envoye', o.avoirDe || null]))).rows[0];
    ids.push(r.id);
    return r;
  };
  const fac = (n) => `FAC-${an}-${String(n).padStart(5, '0')}`;

  // État maîtrisé : une seule fiche entreprise active pour l'organisation du compte (les autres, mises de côté, reviennent)
  const actives = (await q('SELECT id FROM entreprise WHERE organization_id = $1 AND archived_at IS NULL', [ORG_SOLO])).rows.map((r) => r.id);
  await q('UPDATE entreprise SET archived_at = now() WHERE id = ANY($1)', [actives]);
  // SIRET distincts : depuis 102, la série est celle du SIREN (des fiches sans SIRET la partagent)
  const E1 = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, siret) VALUES ($1, $2, 'Élec Solo 101', '10110110100011') RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;

  // 1. La base fixe le numéro qui suit, quelle que soit la proposition de l'app (périmée, trop haute, autre année, format libre)
  const a = await creer({ ent: E1, numero: `FAC-${an}-00042` });
  const b = await creer({ ent: E1, numero: `FAC-${an}-00042` });
  const c = await creer({ ent: E1, numero: 'IMPORT-2019-A12' });
  verifier(a.numero === fac(1) && b.numero === fac(2) && c.numero === fac(3),
    `101 : la base attribue les numéros à la suite, sans trou, quelle que soit la proposition (${a.numero}, ${b.numero}, ${c.numero})`);

  // 2. Bloquant du juriste : sans entreprise, la facture reçoit l'unique entreprise de l'organisation et continue la série
  const sansEnt = await creer({ numero: fac(1) });
  verifier(sansEnt.numero === fac(4) && sansEnt.entreprise_id === E1,
    `101 : une facture sans entreprise prend celle de l'organisation et continue la série (${sansEnt.numero}, ${sansEnt.entreprise_id === E1})`);
  // Une facture d'avant, sans entreprise (écrite par le serveur), compte dans la série
  const ancienne = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc)
    VALUES ($1, $2, $3, 'facture', 'totale', 'envoye', 100) RETURNING id`, [SOLO, ORG_SOLO, fac(10)])).rows[0].id;
  ids.push(ancienne);
  const apres = await creer({ ent: E1 });
  verifier(apres.numero === fac(11), `101 : les factures sans entreprise comptent dans la série d'une organisation à une entreprise (${apres.numero})`);
  // Depuis 102, une facture sans entreprise compte dans chaque série : retirée ici pour la suite (série propre à E2)
  await q('DELETE FROM devis WHERE id = $1', [ancienne]);

  // 3. Préfixe selon la nature ; série d'avoirs à part
  const av = await creer({ ent: E1, numero: `FAC-${an}-00099`, nature: 'avoir', avoirDe: a.id, statut: 'brouillon' });
  const zz = await creer({ ent: E1, numero: `ZZ-${an}-00001` });
  const deguise = await creer({ ent: E1, numero: `AV-${an}-00001` });
  verifier(av.numero === `AV-${an}-00001` && zz.numero === fac(12) && deguise.numero === fac(13),
    `101 : préfixe imposé par la nature, avoirs à part (${av.numero}, ${zz.numero}, ${deguise.numero})`);

  // 4. Entreprise inventée ou d'une autre organisation : refus
  const inventee = await refus(() => creer({ ent: '0eeeeeee-0101-4000-8000-000000000009' }));
  const fichePatron = (await q(`INSERT INTO entreprise (user_id, organization_id, nom) VALUES ($1, $2, 'Patron 101') RETURNING id`, [PATRON, ORG_PATRON])).rows[0].id;
  const etrangere = await refus(() => creer({ ent: fichePatron }));
  verifier(/Entreprise inconnue dans votre organisation/.test(inventee || '') && /Entreprise inconnue dans votre organisation/.test(etrangere || ''),
    `101 : une entreprise inventée ou d'une autre organisation est refusée (${inventee} / ${etrangere})`);

  // 5. Deux entreprises : sans entreprise, refus ; une série par entreprise, sans doublon
  const E2 = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, siret) VALUES ($1, $2, 'Second établissement 101', '20220220200022') RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;
  const choisir = await refus(() => creer({}));
  const e2 = await creer({ ent: E2 });
  const e1 = await creer({ ent: E1 });
  verifier(/Choisissez l'entreprise qui émet cette facture/.test(choisir || '') && e2.numero === fac(1) && e1.numero === fac(14),
    `101 : avec deux entreprises, une série chacune ; sans entreprise, refus (${choisir} / ${e2.numero} / ${e1.numero})`);
  await q('DELETE FROM devis WHERE id = $1', [e2.id]);
  await q('DELETE FROM entreprise WHERE id = $1', [E2]);

  // 6. Autre organisation : sa propre série
  const p = await creer({ par: PATRON, org: ORG_PATRON, ent: fichePatron, numero: fac(99) });
  verifier(p.numero === fac(1), `101 : une autre organisation a sa propre série (${p.numero})`);

  // 7. Brouillon sans numéro : rien ; il reçoit le suivant quand il est émis
  const br = await creer({ ent: E1, statut: 'brouillon' });
  verifier(br.numero === null, `101 : un brouillon sans numéro reste sans numéro (${br.numero})`);
  await commeSolo(`UPDATE devis SET statut = 'envoye' WHERE id = $1`, [br.id]);
  const brEmis = (await q('SELECT numero FROM devis WHERE id = $1', [br.id])).rows[0].numero;
  verifier(brEmis === fac(15), `101 : émis sans numéro, il reçoit le suivant (${brEmis})`);

  // 8. Un numéro attribué ne change plus ; un upsert de l'app le garde
  const change = await refus(() => commeSolo(`UPDATE devis SET numero = $2 WHERE id = $1`, [a.id, fac(50)]));
  await commeSolo(`INSERT INTO devis (id, user_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, $2, $3, 'facture', 'totale', 'envoye', 100)
    ON CONFLICT (id) DO UPDATE SET objet = 'Upsert 101'`, [b.id, SOLO, fac(77)]);
  const bApres = (await q('SELECT numero, objet FROM devis WHERE id = $1', [b.id])).rows[0];
  verifier(!!change && bApres.numero === fac(2) && bApres.objet === 'Upsert 101',
    `101 : un numéro attribué ne change plus, un upsert le garde (${change} / ${bApres.numero})`);

  // 9. Devis et serveur non concernés
  const devis = await creer({ ent: E1, type: 'devis', nature: null, numero: `DEV-${an}-00031`, statut: 'brouillon' });
  const serveur = (await q(`INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, facture_type, statut, total_ttc)
    VALUES ($1, $2, $3, $4, 'facture', 'totale', 'envoye', 100) RETURNING id, numero`, [SOLO, ORG_SOLO, E1, fac(500)])).rows[0];
  ids.push(serveur.id);
  verifier(devis.numero === `DEV-${an}-00031` && serveur.numero === fac(500),
    `101 : devis et serveur non concernés (${devis.numero}, ${serveur.numero})`);

  // 10. Les fonctions de série : fermées aux visiteurs, refusées pour une autre organisation
  const visiteur = await refus(() => commeAnonyme(() => q(`SELECT dernier_numero_facture($1, $2, 'FAC', $3)`, [ORG_SOLO, E1, an])));
  const visiteurEnt = await refus(() => commeAnonyme(() => q(`SELECT entreprise_emettrice($1, NULL)`, [ORG_SOLO])));
  const autre = await refus(() => commeSolo(`SELECT dernier_numero_facture($1, NULL, 'FAC', $2)`, [ORG_PATRON, an]));
  const sienne = Number((await commeSolo(`SELECT dernier_numero_facture($1, $2, 'FAC', $3) AS n`, [ORG_SOLO, E1, an])).rows[0].n);
  verifier(!!visiteur && !!visiteurEnt && /Organisation interdite/.test(autre || '') && sienne === 500,
    `101 : la série se lit pour son organisation seulement, pas par un visiteur (${visiteur} / ${autre} / ${sienne})`);

  const tgtype = (await q(`SELECT tgtype FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_suivre_numerotation'`)).rows[0]?.tgtype;
  verifier(Number(tgtype) === 23, `101 : contrôle de l'en-tête (tgtype ${tgtype})`);
  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `101 : la migration se rejoue sans erreur (${rejeu})`);

  // Ménage (en propriétaire) : les vérifications de 072 comptent les devis du compte
  await q('DELETE FROM devis WHERE id = ANY($1) AND facture_type = $2', [ids, 'avoir']);
  await q('DELETE FROM devis WHERE id = ANY($1)', [ids]);
  await q('DELETE FROM entreprise WHERE id = ANY($1)', [[E1, fichePatron]]);
  await q('UPDATE entreprise SET archived_at = NULL WHERE id = ANY($1)', [actives]);
}
