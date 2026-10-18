// Vérifications de la migration 098 : pas de double facture, encaissements tenus par la base.
// Le socle porte la RLS et les policies de production de `devis` et `paiements` (dont « Org members can insert »,
// qui ne contrôlent pas user_id) : les contournements se testent comme en production.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, PATRON, SALARIE, ORG_SOLO, ORG_PATRON } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/098_pas_de_double_facture_encaissements_en_base.sql');

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  // Refus : le message ; réussite : false
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const doc = async (o) => (await q(
    `INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, devis_source_id, avoir_source_id, entreprise_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [o.user || SOLO, o.org || ORG_SOLO, o.numero, o.type || 'facture', o.nature || null, o.statut || 'envoye', o.total,
      o.source || null, o.avoirDe || null, o.entreprise || null])).rows[0].id;
  const comme = (uid) => (sql, p) => en(uid, () => q(sql, p));
  const commeSolo = comme(SOLO);
  const lire = async (id) => (await q('SELECT statut, montant_paye FROM devis WHERE id = $1', [id])).rows[0];
  // Les vérifications de 081 rejouent l'ancienne définition de la page de paiement : remettre celle de 098
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));

  // 1. Pas plus de factures que le devis
  const D = await doc({ numero: 'DEV-098-1', type: 'devis', statut: 'accepte', total: 1200 });
  const facturer = async (numero, nature, total) => (await commeSolo(
    `INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc, devis_source_id)
     VALUES ($1, $2, 'facture', $3, 'envoye', $4, $5) RETURNING id`, [SOLO, numero, nature, total, D])).rows[0].id;
  // Depuis 101, la base attribue le numéro d'une facture créée par un compte connecté : on garde l'identifiant
  const F1 = await facturer('FAC-098-1', 'acompte', 360);
  const S = await facturer('FAC-098-2', 'solde', 840);
  const second = await refus(() => facturer('FAC-098-3', 'solde', 840));
  verifier(/déjà facturé.*1 200,00 €/.test(second || ''), `098 : un second solde du même devis est refusé (${second})`);
  await doc({ numero: 'AV-098-1', nature: 'avoir', total: -840, avoirDe: S });
  const apresAvoir = await refus(() => facturer('FAC-098-4', 'solde', 840));
  verifier(apresAvoir === false, `098 : après un avoir total du solde, un nouveau solde passe (${apresAvoir})`);
  // Le devis d'un autre ne se facture pas, même au nom de son auteur (policy « Org members can insert »)
  const DP = await doc({ user: PATRON, org: ORG_PATRON, numero: 'DEV-098-P', type: 'devis', statut: 'accepte', total: 500 });
  const autre = await refus(() => commeSolo(
    `INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc, devis_source_id)
     VALUES ($1, 'FAC-098-X', 'facture', 'totale', 'envoye', 100, $2)`, [SOLO, DP]));
  const usurpe = await refus(() => commeSolo(
    `INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, devis_source_id)
     VALUES ($1, $2, 'FAC-098-Y', 'facture', 'totale', 'envoye', 500, $3)`, [PATRON, ORG_SOLO, DP]));
  verifier(/introuvable/.test(autre || '') && /introuvable/.test(usurpe || ''),
    `098 : on ne facture pas le devis d'une autre organisation, même au nom de son auteur (${autre} / ${usurpe})`);
  // Un avoir plus gros que sa facture ne libère pas de place
  const D2 = await doc({ numero: 'DEV-098-2', type: 'devis', statut: 'accepte', total: 1000 });
  const F2 = await doc({ numero: 'FAC-098-20', nature: 'totale', total: 1000, source: D2 });
  await doc({ numero: 'AV-098-2', nature: 'avoir', total: -3000, avoirDe: F2 });
  await doc({ numero: 'FAC-098-21', nature: 'totale', total: 1000, source: D2 });
  const tropAvoir = await refus(() => doc({ numero: 'FAC-098-22', nature: 'totale', total: 1000, source: D2 }));
  verifier(/déjà facturé/.test(tropAvoir || ''), `098 : un avoir plus gros que sa facture ne libère pas de place (${tropAvoir})`);

  // 2. Numéro de facture unique dans son entreprise
  const f1 = (await q('SELECT numero, entreprise_id FROM devis WHERE id = $1', [F1])).rows[0];
  const doublon = await refus(() => doc({ numero: f1.numero, nature: 'totale', total: 10, entreprise: f1.entreprise_id }));
  verifier(/unique|duplicate/i.test(doublon || ''), `098 : un numéro de facture en double est refusé (${doublon})`);
  const ailleurs = await refus(() => doc({ user: PATRON, org: ORG_PATRON, numero: f1.numero, nature: 'totale', total: 10 }));
  const autreEntreprise = await refus(() => doc({ numero: f1.numero, nature: 'totale', total: 10, entreprise: '0ddddddd-0000-4000-8000-000000000001' }));
  verifier(ailleurs === false && autreEntreprise === false,
    `098 : le même numéro dans une autre organisation ou une autre entreprise passe (${ailleurs} / ${autreEntreprise})`);

  // 3 et 4. Encaissements
  const F = await doc({ numero: 'FAC-098-10', nature: 'totale', total: 1000 });
  const payer = async (montant, o = {}) => (await comme(o.par || SOLO)(
    'INSERT INTO paiements (user_id, devis_id, montant, notes, reference, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at',
    [o.user || o.par || SOLO, o.facture || F, montant, o.notes || null, o.reference || null, o.le || null])).rows[0];
  const p1 = await payer(600, { le: '2020-01-01T00:00:00Z' });
  verifier(Number((await lire(F)).montant_paye) === 600, '098 : un paiement met à jour le montant encaissé (600)');
  verifier(new Date(p1.created_at).getFullYear() >= 2026, `098 : la base horodate l'encaissement, pas l'app (${p1.created_at})`);
  const modifie = await refus(() => commeSolo('UPDATE paiements SET montant = 1 WHERE id = $1', [p1.id]));
  const efface = await refus(() => commeSolo('DELETE FROM paiements WHERE id = $1', [p1.id]));
  verifier(/ne se modifie ni ne s'efface/.test(modifie || '') && /ne se modifie ni ne s'efface/.test(efface || ''),
    '098 : un paiement enregistré ne se modifie ni ne s\'efface');
  const rejeu = await refus(() => commeSolo(
    `INSERT INTO paiements (id, user_id, devis_id, montant) VALUES ($1, $2, $3, 600)
     ON CONFLICT (id) DO UPDATE SET montant = EXCLUDED.montant, devis_id = EXCLUDED.devis_id`, [p1.id, SOLO, F]));
  verifier(rejeu === false && Number((await lire(F)).montant_paye) === 600,
    `098 : le rejeu à l'identique d'un paiement (file hors ligne) passe sans rien changer (${rejeu})`);
  const auNomDAutrui = await refus(() => payer(50, { user: PATRON }));
  verifier(/à votre nom/.test(auNomDAutrui || ''), `098 : un encaissement s'enregistre au nom de son auteur (${auNomDAutrui})`);

  const sansMotif = await refus(() => payer(-100, { reference: p1.id }));
  const sansReference = await refus(() => payer(-100, { notes: 'Virement saisi en double' }));
  const tropGrande = await refus(() => payer(-700, { notes: 'Chèque compté deux fois', reference: p1.id }));
  verifier(/motif/.test(sansMotif || '') && /cite l'encaissement/.test(sansReference || '') && /dépasse/.test(tropGrande || ''),
    `098 : une correction a un motif, cite l'encaissement corrigé et n'en retire pas plus (${sansMotif} / ${sansReference} / ${tropGrande})`);
  await payer(-100, { notes: 'Virement saisi en double', reference: p1.id });
  verifier(Number((await lire(F)).montant_paye) === 500, '098 : une correction motivée réduit le montant encaissé (500)');
  const surCorrection = await refus(() => payer(-550, { notes: 'Encore une correction', reference: p1.id }));
  verifier(/dépasse l'encaissement qu'elle corrige/.test(surCorrection || ''), `098 : les corrections d'un encaissement ne dépassent pas son montant (${surCorrection})`);

  // Rejeu par upsert d'une correction déjà enregistrée (file hors ligne) : passe, sans rien changer
  const c1 = (await q(`SELECT id FROM paiements WHERE devis_id = $1 AND montant < 0`, [F])).rows[0].id;
  const rejeuCorrection = await refus(() => commeSolo(
    `INSERT INTO paiements (id, user_id, devis_id, montant, notes, reference) VALUES ($1, $2, $3, -100, 'Virement saisi en double', $4)
     ON CONFLICT (id) DO UPDATE SET montant = EXCLUDED.montant, notes = EXCLUDED.notes, reference = EXCLUDED.reference`, [c1, SOLO, F, p1.id]));
  verifier(rejeuCorrection === false && Number((await lire(F)).montant_paye) === 500,
    `098 : le rejeu à l'identique d'une correction passe sans rien changer (${rejeuCorrection})`);
  const changeId = await refus(() => commeSolo(`UPDATE paiements SET id = gen_random_uuid() WHERE id = $1`, [p1.id]));
  const changeNumero = await refus(() => commeSolo(`UPDATE paiements SET document_numero = 'FAC-AUTRE' WHERE id = $1`, [p1.id]));
  verifier(/ne se modifie/.test(changeId || '') && /ne se modifie/.test(changeNumero || ''),
    '098 : ni l\'identifiant ni le numéro de document d\'un paiement ne changent');
  const sessionPrise = await refus(() => payer(10, { reference: 'cs_test_pris' }));
  verifier(/réservée aux paiements en ligne/.test(sessionPrise || ''), `098 : une référence de session Stripe est réservée au serveur (${sessionPrise})`);

  const p2 = await payer(500);
  await commeSolo(`UPDATE devis SET statut = 'payee' WHERE id = $1`, [F]);
  await payer(-200, { notes: 'Chèque revenu impayé', reference: p2.id });
  const rouverte = await lire(F);
  verifier(rouverte.statut === 'envoye' && Number(rouverte.montant_paye) === 800,
    `098 : une correction qui rouvre une facture payée la repasse envoyée (${rouverte.statut}, ${rouverte.montant_paye})`);

  const perime = await refus(() => commeSolo(`UPDATE devis SET montant_paye = 0, objet = 'Note' WHERE id = $1`, [F]));
  verifier(perime === false && Number((await lire(F)).montant_paye) === 800,
    `098 : un onglet périmé n'écrase pas le montant encaissé, sans bloquer l'enregistrement (${perime})`);

  const G = (await commeSolo(
    `INSERT INTO devis (user_id, numero, type, facture_type, statut, total_ttc, montant_paye)
     VALUES ($1, 'FAC-098-11', 'facture', 'totale', 'envoye', 300, 5000) RETURNING id`, [SOLO])).rows[0].id;
  verifier(Number((await lire(G)).montant_paye) === 0, '098 : une facture créée par l\'app part sans montant encaissé inventé');
  const H = (await commeSolo(
    `INSERT INTO devis (user_id, numero, type, statut, total_ttc, montant_paye) VALUES ($1, 'DEV-098-H', 'devis', 'accepte', 300, 5000) RETURNING id`,
    [SOLO])).rows[0].id;
  await commeSolo(`UPDATE devis SET type = 'facture', facture_type = 'totale', numero = 'FAC-098-H', statut = 'envoye' WHERE id = $1`, [H]);
  verifier(Number((await lire(H)).montant_paye) === 0, '098 : un devis devenu facture ne garde pas un montant encaissé envoyé par l\'app');

  const FP = await doc({ user: PATRON, org: ORG_PATRON, numero: 'FAC-098-P', nature: 'totale', total: 100 });
  const surAutre = await refus(() => payer(50, { facture: FP }));
  const surDevis = await refus(() => payer(50, { facture: D }));
  verifier(!!surAutre && /votre entreprise/.test(surDevis || '') && !Number((await lire(FP)).montant_paye),
    `098 : un paiement se rattache à une facture de son entreprise (pas à celle d'un autre, ni à un devis) (${surAutre})`);
  // Un salarié n'écrit pas une correction au nom du patron (policy « Org members can insert » sans contrôle de user_id)
  const FS = await doc({ user: PATRON, org: ORG_PATRON, numero: 'FAC-098-S', nature: 'totale', total: 600 });
  const pS = await payer(600, { par: SALARIE, facture: FS });
  const salarieAuNomDuPatron = await refus(() => payer(-100, { par: SALARIE, user: PATRON, facture: FS, notes: 'Erreur de saisie', reference: pS.id }));
  verifier(/à votre nom/.test(salarieAuNomDuPatron || ''), `098 : une correction est au nom de qui la fait (${salarieAuNomDuPatron})`);

  // Serveur (paiement en ligne) : une ligne par session Stripe, le montant encaissé suit
  const enLigne = () => q(`INSERT INTO paiements (user_id, organization_id, devis_id, montant, mode, reference)
           VALUES ($1, $2, $3, 150, 'cb', 'cs_banc_098')`, [SOLO, ORG_SOLO, G]);
  await enLigne();
  const deuxFois = await refus(enLigne);
  verifier(Number((await lire(G)).montant_paye) === 150 && /unique|duplicate/i.test(deuxFois || ''),
    `098 : un paiement en ligne (serveur) est compté une seule fois par session (${deuxFois})`);

  // Page de paiement : le reçu est le montant encaissé tenu par la base
  await q(`UPDATE devis SET payment_token = 'jeton-098' WHERE id = $1`, [G]);
  await q(`INSERT INTO paiements (user_id, organization_id, devis_id, montant, notes)
           VALUES ($1, $2, $3, -50, 'Correction du banc')`, [SOLO, ORG_SOLO, G]);
  const page = await commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', ['jeton-098'])).rows[0].r);
  verifier(Number(page.facture.recu) === 100 && Number(page.facture.reste_du) === 200,
    `098 : la page de paiement compte la correction (reçu ${page.facture.recu}, reste ${page.facture.reste_du})`);

  const rejouee = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejouee === false, `098 : la migration se rejoue sans erreur (${rejouee})`);

  // Ménage (en propriétaire)
  await q('DELETE FROM paiements WHERE devis_id = ANY($1)', [[F, G, FP, FS]]);
  await q(`DELETE FROM devis WHERE numero LIKE 'AV-098%'`);
  await q(`DELETE FROM devis WHERE numero LIKE 'FAC-098%' OR numero LIKE 'DEV-098%'`);
  // Factures créées par un compte connecté (numérotées par la base depuis 101) : par leur devis d'origine ou leur identifiant
  await q('DELETE FROM devis WHERE devis_source_id = ANY($1) AND facture_type = $2', [[D, D2], 'avoir']);
  await q('DELETE FROM devis WHERE devis_source_id = ANY($1) OR id = ANY($2)', [[D, D2], [G, H, F1, D, D2]]);
  // Copies de son numéro écrites en propriétaire (unicité : même entreprise, autre organisation, autre entreprise)
  await q('DELETE FROM devis WHERE numero = $1', [f1.numero]);
}
