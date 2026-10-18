// Vérifications de la migration 099 : une facture ne passe « payée » que si ses paiements la soldent ; elle ne revient
// pas à « envoyée » tant qu'ils la soldent (seule la base la rouvre, 098) ; une pièce émise reste dans son organisation et
// garde son auteur ; une facture encaissée ne se supprime pas. Le socle porte la RLS de production de `devis` et
// `paiements` (dont « Org members can update », qui ne contrôle pas user_id).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO, PATRON, SALARIE, ORG_PATRON } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/099_payee_seulement_si_les_paiements_soldent.sql');

export async function verifier({ db, q, en, verifier }) {
  // Refus : le message ; réussite : false
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const doc = async (o) => (await q(
    `INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, avoir_source_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [o.user || SOLO, o.org || ORG_SOLO, o.numero, o.type || 'facture', o.nature || 'totale', o.statut || 'envoye', o.total,
      o.avoirDe || null])).rows[0].id;
  const commeSolo = (sql, p) => en(SOLO, () => q(sql, p));
  // payment_status : une colonne qui reste modifiable sur une facture émise (le contenu imprimé est figé depuis 103)
  const lire = async (id) => (await q('SELECT statut, montant_paye, objet, payment_status, user_id, organization_id FROM devis WHERE id = $1', [id])).rows[0];
  const payer = async (facture, montant, o = {}) => (await en(o.par || SOLO, () => q(
    'INSERT INTO paiements (user_id, devis_id, montant, notes, reference) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [o.par || SOLO, facture, montant, o.notes || null, o.reference || null]))).rows[0].id;
  const marquerPayee = (id) => refus(() => commeSolo(`UPDATE devis SET statut = 'payee' WHERE id = $1`, [id]));
  // Les vérifications de 098 rejouent sa définition de recalculer_encaisse : remettre celle de 099
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));

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
  const perime = await refus(() => commeSolo(`UPDATE devis SET statut = 'envoye', payment_status = 'note-099' WHERE id = $1`, [F]));
  const vue = await refus(() => commeSolo(`UPDATE devis SET statut = 'vu' WHERE id = $1`, [F]));
  const apres = await lire(F);
  verifier(perime === false && vue === false && apres.statut === 'payee' && apres.payment_status === 'note-099',
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
  // Annulée par un avoir total, rien encaissé : aucun règlement à constater (relecture juriste-btp du 18 oct. 2026)
  const K = await doc({ numero: 'FAC-099-5', total: 500 });
  const AK = await doc({ numero: 'AV-099-2', nature: 'avoir', total: -500, avoirDe: K });
  const annulee = await marquerPayee(K);
  verifier(/annulée par un avoir : aucun encaissement/.test(annulee || '') && (await lire(K)).statut === 'envoye',
    `099 : une facture annulée par avoir ne passe pas « payée » sans paiement (${annulee})`);
  // Rien à payer, rien reçu : pas « payée » non plus (relecture gardien-securite du 18 oct. 2026)
  const Z = await doc({ numero: 'FAC-099-6', total: 0 });
  const aZero = await marquerPayee(Z);
  verifier(/aucun encaissement/.test(aZero || ''), `099 : une facture à 0 € sans encaissement ne passe pas « payée » (${aZero})`);

  // 5. Créée « payée » sans paiement, ou brouillon passé « payée » : refusé
  const creee = await refus(() => commeSolo(
    `INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, 'FAC-099-3', 'facture', 'totale', 'payee', 500)`, [SOLO]));
  const B = await doc({ numero: null, statut: 'brouillon', total: 200 });
  const brouillon = await marquerPayee(B);
  verifier(/n'est pas soldée/.test(creee || '') && /n'est pas soldée/.test(brouillon || ''),
    `099 : ni une facture créée « payée », ni un brouillon ne passent « payés » sans paiement (${creee} / ${brouillon})`);

  // 6. Upsert de l'app (file différée) sans organisation, sur une facture payée et soldée : pas de faux refus
  const upsert = await refus(() => commeSolo(
    `INSERT INTO devis (id, user_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, $2, 'FAC-099-2', 'facture', 'totale', 'payee', 1000)
     ON CONFLICT (id) DO UPDATE SET statut = EXCLUDED.statut, payment_status = 'upsert-099'`, [G, SOLO]));
  const upsertSansPaiement = await refus(() => commeSolo(
    `INSERT INTO devis (id, user_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, $2, 'FAC-099-5', 'facture', 'totale', 'payee', 500)
     ON CONFLICT (id) DO UPDATE SET statut = EXCLUDED.statut`, [K, SOLO]));
  verifier(upsert === false && (await lire(G)).payment_status === 'upsert-099' && /annulée par un avoir/.test(upsertSansPaiement || ''),
    `099 : un upsert sans organisation d'une facture soldée passe, d'une facture non soldée non (${upsert} / ${upsertSansPaiement})`);

  // 7. Une pièce émise reste dans son organisation et garde son auteur (salarié de l'organisation du patron)
  const FP = await doc({ user: PATRON, org: ORG_PATRON, numero: 'FAC-099-P', total: 1000 });
  const AP = await doc({ user: PATRON, org: ORG_PATRON, numero: 'AV-099-P', nature: 'avoir', total: -999, avoirDe: FP });
  const commeSalarie = (sql, p) => en(SALARIE, () => q(sql, p));
  const avoirDetache = await refus(() => commeSalarie(`UPDATE devis SET organization_id = NULL, user_id = $2 WHERE id = $1`, [AP, SALARIE]));
  const factureDetachee = await refus(() => commeSalarie(`UPDATE devis SET organization_id = NULL, user_id = $2 WHERE id = $1`, [FP, SALARIE]));
  verifier(/reste dans son entreprise/.test(avoirDetache || '') && /reste dans son entreprise/.test(factureDetachee || ''),
    `099 : une facture ou un avoir émis ne quitte pas son organisation (${avoirDetache} / ${factureDetachee})`);
  const encaisseeParSalarie = await refus(() => commeSalarie(`UPDATE devis SET payment_status = 'vue-salarie', user_id = $2 WHERE id = $1`, [FP, SALARIE]));
  const fp = await lire(FP);
  verifier(encaisseeParSalarie === false && fp.user_id === PATRON && fp.payment_status === 'vue-salarie',
    `099 : un salarié qui enregistre la facture du patron ne la fait pas sienne (${encaisseeParSalarie} / ${fp.user_id})`);

  // 8. Une facture encaissée ne se supprime pas, même en brouillon (ses paiements resteraient sans pièce)
  const BR = await doc({ numero: null, statut: 'brouillon', total: 300 });
  // Encaissement d'avant 100 (depuis, un brouillon ne s'encaisse plus) : écrit en propriétaire
  await q('INSERT INTO paiements (user_id, organization_id, devis_id, montant) VALUES ($1, $2, $3, 50)', [SOLO, ORG_SOLO, BR]);
  const supprimee = await refus(() => commeSolo('DELETE FROM devis WHERE id = $1', [BR]));
  const sansEncaissement = await doc({ numero: null, statut: 'brouillon', total: 10 });
  const supprimeeVide = await refus(() => commeSolo('DELETE FROM devis WHERE id = $1', [sansEncaissement]));
  verifier(/encaissements enregistrés : elle se conserve avec eux et ne se supprime pas/.test(supprimee || '') && supprimeeVide === false,
    `099 : un brouillon encaissé ne se supprime pas, un brouillon sans encaissement si (${supprimee} / ${supprimeeVide})`);

  // 9. Un devis et le serveur ne sont pas concernés
  const D = await doc({ numero: 'DEV-099-1', type: 'devis', nature: null, statut: 'accepte', total: 100 });
  const devisPaye = await marquerPayee(D);
  const H = await doc({ numero: 'FAC-099-4', total: 80 });
  await q(`UPDATE devis SET statut = 'payee' WHERE id = $1`, [H]);
  verifier(devisPaye === false && (await lire(H)).statut === 'payee', `099 : un devis et le serveur ne sont pas concernés (${devisPaye})`);

  const tg = Object.fromEntries((await q(`SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass
    AND tgname IN ('trg_verifier_statut_payee', 'trg_garder_organisation_piece', 'trg_garder_facture_encaissee')`)).rows.map((r) => [r.tgname, Number(r.tgtype)]));
  const verrou = (await q(`SELECT position('FOR NO KEY UPDATE' in pg_get_functiondef('public.recalculer_encaisse(uuid, boolean)'::regprocedure)) > 0 AS v`)).rows[0].v;
  verifier(tg.trg_verifier_statut_payee === 23 && tg.trg_garder_organisation_piece === 19 && tg.trg_garder_facture_encaissee === 11 && verrou === true,
    `099 : contrôles de l'en-tête (${JSON.stringify(tg)}, verrou du recalcul ${verrou})`);

  // Rejouable
  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `099 : la migration se rejoue sans erreur (${rejeu})`);

  // Ménage (en propriétaire) : les vérifications de 072 comptent les devis du compte
  await q('DELETE FROM paiements WHERE devis_id = ANY($1)', [[F, G, BR]]);
  await q('DELETE FROM devis WHERE id = ANY($1)', [[A, AK, AP, F, G, K, Z, B, BR, sansEncaissement, D, H, FP]]);
}
