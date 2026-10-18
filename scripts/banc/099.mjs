// Vérifications de la migration 099 : une facture ne passe « payée » que si ses paiements la soldent ; elle ne revient
// pas à « envoyée » tant qu'ils la soldent (seule la base la rouvre, 098). Le socle porte la RLS de production de
// `devis` et `paiements`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/099_payee_seulement_si_les_paiements_soldent.sql');

export async function verifier({ db, q, en, verifier }) {
  // Refus : le message ; réussite : false
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const doc = async (o) => (await q(
    `INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, avoir_source_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [SOLO, ORG_SOLO, o.numero, o.type || 'facture', o.nature || 'totale', o.statut || 'envoye', o.total, o.avoirDe || null])).rows[0].id;
  const commeSolo = (sql, p) => en(SOLO, () => q(sql, p));
  const lire = async (id) => (await q('SELECT statut, montant_paye, objet FROM devis WHERE id = $1', [id])).rows[0];
  const payer = async (facture, montant, o = {}) => (await commeSolo(
    'INSERT INTO paiements (user_id, devis_id, montant, notes, reference) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [SOLO, facture, montant, o.notes || null, o.reference || null])).rows[0].id;
  const marquerPayee = (id) => refus(() => commeSolo(`UPDATE devis SET statut = 'payee' WHERE id = $1`, [id]));

  // 1. « Payée » sans paiement, ou pas soldée : refusé, avec ce qui reste à encaisser
  const F = await doc({ numero: 'FAC-099-1', total: 1000 });
  const sansPaiement = await marquerPayee(F);
  verifier(/n'est pas soldée : il reste 1 000,00 € à encaisser/.test(sansPaiement || '') && (await lire(F)).statut === 'envoye',
    `099 : une facture sans paiement ne passe pas « payée » (${sansPaiement})`);
  const p1 = await payer(F, 600);
  const partielle = await marquerPayee(F);
  verifier(/il reste 400,00 €/.test(partielle || ''), `099 : une facture payée en partie ne passe pas « payée » (${partielle})`);
  await payer(F, 400);
  const soldee = await marquerPayee(F);
  verifier(soldee === false && (await lire(F)).statut === 'payee', `099 : une facture soldée par ses paiements passe « payée » (${soldee})`);

  // 2. Un onglet périmé (l'app réécrit toute la ligne) ne la repasse pas « envoyée » ni « vue », sans bloquer
  const perime = await refus(() => commeSolo(`UPDATE devis SET statut = 'envoye', objet = 'Note 099' WHERE id = $1`, [F]));
  const vue = await refus(() => commeSolo(`UPDATE devis SET statut = 'vu' WHERE id = $1`, [F]));
  const apres = await lire(F);
  verifier(perime === false && vue === false && apres.statut === 'payee' && apres.objet === 'Note 099',
    `099 : une facture soldée reste « payée » malgré la valeur périmée d'un onglet, et l'enregistrement passe (${perime} / ${vue} / ${apres.statut})`);

  // 3. Une correction qui rouvre la facture (098) : « envoyée » ; la remettre « payée » est refusé
  await payer(F, -150, { notes: 'Chèque revenu impayé', reference: p1 });
  const rouverte = await lire(F);
  const repayee = await marquerPayee(F);
  verifier(rouverte.statut === 'envoye' && /il reste 150,00 €/.test(repayee || ''),
    `099 : rouverte par une correction, elle ne repasse pas « payée » à la main (${rouverte.statut} / ${repayee})`);
  const retour = await refus(() => commeSolo(`UPDATE devis SET statut = 'envoye' WHERE id = $1`, [F]));
  verifier(retour === false && (await lire(F)).statut === 'envoye', `099 : une facture non soldée reste « envoyée » (${retour})`);

  // 4. Les avoirs émis réduisent le dû ; un avoir n'est pas concerné
  const G = await doc({ numero: 'FAC-099-2', total: 1000 });
  const A = await doc({ numero: 'AV-099-1', nature: 'avoir', total: -300, avoirDe: G });
  await payer(G, 700);
  const avecAvoir = await marquerPayee(G);
  verifier(avecAvoir === false && (await lire(G)).statut === 'payee', `099 : 700 € reçus et 300 € d'avoir soldent une facture de 1 000 € (${avecAvoir})`);
  const avoirApplique = await marquerPayee(A);
  verifier(avoirApplique === false, `099 : un avoir s'applique (« payée ») sans paiement (${avoirApplique})`);

  // 5. Créée « payée » sans paiement, ou brouillon passé « payée » : refusé
  const creee = await refus(() => commeSolo(
    `INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, 'FAC-099-3', 'facture', 'totale', 'payee', 500)`, [SOLO]));
  const B = await doc({ numero: null, statut: 'brouillon', total: 200 });
  const brouillon = await marquerPayee(B);
  verifier(/n'est pas soldée/.test(creee || '') && /n'est pas soldée/.test(brouillon || ''),
    `099 : ni une facture créée « payée », ni un brouillon ne passent « payés » sans paiement (${creee} / ${brouillon})`);

  // 6. Un devis et le serveur ne sont pas concernés
  const D = await doc({ numero: 'DEV-099-1', type: 'devis', nature: null, statut: 'accepte', total: 100 });
  const devisPaye = await marquerPayee(D);
  const H = await doc({ numero: 'FAC-099-4', total: 80 });
  await q(`UPDATE devis SET statut = 'payee' WHERE id = $1`, [H]);
  verifier(devisPaye === false && (await lire(H)).statut === 'payee', `099 : un devis et le serveur ne sont pas concernés (${devisPaye})`);

  const tgtype = (await q(`SELECT tgtype FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_verifier_statut_payee'`)).rows[0]?.tgtype;
  verifier(Number(tgtype) === 23, `099 : contrôle de l'en-tête (tgtype ${tgtype})`);

  // Rejouable
  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `099 : la migration se rejoue sans erreur (${rejeu})`);

  // Ménage (en propriétaire) : les vérifications de 072 comptent les devis du compte
  await q('DELETE FROM paiements WHERE devis_id = ANY($1)', [[F, G]]);
  await q('DELETE FROM devis WHERE id = ANY($1)', [[A, F, G, B, D, H]]);
}
