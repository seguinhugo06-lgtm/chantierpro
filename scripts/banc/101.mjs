// Vérifications de la migration 101 : le numéro d'une facture ou d'un avoir est attribué par la base, à la suite de sa
// série (organisation, entreprise, préfixe, année), sans trou. Une entreprise dédiée isole la série des autres essais.
// La simultanéité (deux connexions) ne se joue pas au banc (une seule connexion PGlite) : le verrou consultatif et la
// relecture par instruction en READ COMMITTED en répondent ; ici, les attributions successives.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO, PATRON, ORG_PATRON } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/101_numero_de_facture_attribue_par_la_base.sql');
const ENT = '0eeeeeee-0101-4000-8000-000000000001';
const ENT2 = '0eeeeeee-0101-4000-8000-000000000002';

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const an = Number((await q(`SELECT extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::int AS a`)).rows[0].a);
  const commeSolo = (sql, p) => en(SOLO, () => q(sql, p));
  const creer = async (o) => (await en(o.par || SOLO, () => q(
    `INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, facture_type, statut, total_ttc, avoir_source_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 100, $8) RETURNING id, numero`,
    [o.par || SOLO, o.org || ORG_SOLO, o.ent === undefined ? ENT : o.ent, o.numero ?? null, o.type || 'facture', o.nature || 'totale',
      o.statut || 'envoye', o.avoirDe || null]))).rows[0];
  const ids = [];
  const garder = (r) => { ids.push(r.id); return r; };

  // 1. La base fixe le numéro qui suit : la proposition de l'app (périmée, trop haute, autre année) ne compte pas
  const a = garder(await creer({ numero: `FAC-${an}-00042` }));
  const b = garder(await creer({ numero: `FAC-${an}-00042` }));
  const c = garder(await creer({ numero: `FAC-${an - 1}-00007` }));
  verifier(a.numero === `FAC-${an}-00001` && b.numero === `FAC-${an}-00002` && c.numero === `FAC-${an}-00003`,
    `101 : la base attribue les numéros à la suite, sans trou, quelle que soit la proposition de l'app (${a.numero}, ${b.numero}, ${c.numero})`);

  // 2. Séries distinctes : avoir, autre entreprise, autre organisation
  const av = garder(await creer({ numero: `AV-${an}-00009`, nature: 'avoir', avoirDe: a.id, statut: 'brouillon' }));
  const e2 = garder(await creer({ numero: `FAC-${an}-00005`, ent: ENT2 }));
  const p = garder(await creer({ par: PATRON, org: ORG_PATRON, numero: `FAC-${an}-00099` }));
  verifier(av.numero === `AV-${an}-00001` && e2.numero === `FAC-${an}-00001` && p.numero.endsWith('-00001'),
    `101 : une série par préfixe, entreprise et organisation (${av.numero}, ${e2.numero}, ${p.numero})`);

  // 3. Brouillon sans numéro : rien ; il reçoit le suivant quand il est numéroté ou émis
  const br = garder(await creer({ numero: null, statut: 'brouillon' }));
  verifier(br.numero === null, `101 : un brouillon sans numéro reste sans numéro (${br.numero})`);
  await commeSolo(`UPDATE devis SET statut = 'envoye' WHERE id = $1`, [br.id]);
  const brEmis = (await q('SELECT numero FROM devis WHERE id = $1', [br.id])).rows[0].numero;
  verifier(brEmis === `FAC-${an}-00004`, `101 : émis sans numéro, il reçoit le suivant (${brEmis})`);

  // 4. Un numéro attribué ne change plus ; un upsert de l'app sur la ligne le garde
  const change = await refus(() => commeSolo(`UPDATE devis SET numero = $2 WHERE id = $1`, [a.id, `FAC-${an}-00050`]));
  await commeSolo(`INSERT INTO devis (id, user_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, $2, $3, 'facture', 'totale', 'envoye', 100)
    ON CONFLICT (id) DO UPDATE SET objet = 'Upsert 101'`, [b.id, SOLO, `FAC-${an}-00077`]);
  const bApres = (await q('SELECT numero, objet FROM devis WHERE id = $1', [b.id])).rows[0];
  verifier(!!change && bApres.numero === `FAC-${an}-00002` && bApres.objet === 'Upsert 101',
    `101 : un numéro attribué ne change plus, un upsert le garde (${change} / ${bApres.numero})`);

  // 5. Préfixe d'un devis sur une facture : FAC ; numéro hors format gardé ; devis et serveur non concernés
  const dv = garder(await creer({ numero: `DEV-${an}-00003` }));
  const libre = garder(await creer({ numero: 'IMPORT-2019-A12' }));
  const devis = garder(await creer({ type: 'devis', nature: null, numero: `DEV-${an}-00031`, statut: 'brouillon' }));
  const serveur = (await q(`INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, facture_type, statut, total_ttc)
    VALUES ($1, $2, $3, $4, 'facture', 'totale', 'envoye', 100) RETURNING id, numero`, [SOLO, ORG_SOLO, ENT, `FAC-${an}-00500`])).rows[0];
  ids.push(serveur.id);
  verifier(dv.numero === `FAC-${an}-00005` && libre.numero === 'IMPORT-2019-A12' && devis.numero === `DEV-${an}-00031` && serveur.numero === `FAC-${an}-00500`,
    `101 : préfixe de devis remplacé, numéro hors format gardé, devis et serveur non concernés (${dv.numero}, ${libre.numero}, ${devis.numero}, ${serveur.numero})`);

  // 6. La fonction de série : fermée aux visiteurs, refusée pour une autre organisation
  const visiteur = await refus(() => commeAnonyme(() => q(`SELECT dernier_numero_facture($1, $2, 'FAC', $3)`, [ORG_SOLO, ENT, an])));
  const autre = await refus(() => commeSolo(`SELECT dernier_numero_facture($1, NULL, 'FAC', $2)`, [ORG_PATRON, an]));
  const sienne = Number((await commeSolo(`SELECT dernier_numero_facture($1, $2, 'FAC', $3) AS n`, [ORG_SOLO, ENT, an])).rows[0].n);
  verifier(!!visiteur && /Organisation interdite/.test(autre || '') && sienne === 500,
    `101 : la série se lit pour son organisation seulement, pas par un visiteur (${visiteur} / ${autre} / ${sienne})`);

  const tgtype = (await q(`SELECT tgtype FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_suivre_numerotation'`)).rows[0]?.tgtype;
  verifier(Number(tgtype) === 23, `101 : contrôle de l'en-tête (tgtype ${tgtype})`);
  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `101 : la migration se rejoue sans erreur (${rejeu})`);

  // Ménage (en propriétaire) : les vérifications de 072 comptent les devis du compte
  await q('DELETE FROM devis WHERE id = ANY($1) AND facture_type = $2', [ids, 'avoir']);
  await q('DELETE FROM devis WHERE id = ANY($1)', [ids]);
}
