/**
 * Les quatre chemins qui portent l'argent.
 *
 * Ce fichier ne cherche pas la couverture. Il couvre les quatre trajets par
 * lesquels un euro entre chez l'artisan — chiffrer, facturer, encaisser,
 * relancer — parce que c'est là qu'une régression coûte de l'argent réel et
 * pas seulement un écran cassé.
 *
 * Les montants sont écrits en dur, calculés à la main, jamais recalculés avec
 * la formule testée : un test qui réutilise le code testé ne prouve rien.
 */

import { describe, it, expect } from 'vitest';
import { calculateDevisTotals, roundEuro, generateNumero, normalizeNumero } from '../devis-utils';
import {
  buildEcheancierEtapes,
  computeEtapeMontants,
  computeSoldeMontants,
  buildFactureLignesForEtape,
  getNextEtapeAFacturer,
  getEcheancierProgress,
  validateEcheancier,
  updateEtape,
  ETAPE_STATUT,
} from '../acompteUtils';
import {
  calculateStripeFees,
  calculatePaymentAmounts,
  eurosToCentimes,
  centimesToEuros,
  buildPaymentStats,
  isPaymentLinkExpired,
} from '../paymentUtils';
import {
  isDocumentEligible,
  getNextStep,
  getBaseDate,
  calculatePenalties,
} from '../relanceUtils';

// ═══════════════════════════════════════════════════════════════════
// CHEMIN 1 — Chiffrer : un devis produit les bons totaux
// ═══════════════════════════════════════════════════════════════════

describe('Chemin 1 — chiffrer un devis', () => {
  it('calcule HT, TVA et TTC sur une ligne simple', () => {
    // 3 × 150 € à 20 % → 450 HT, 90 TVA, 540 TTC
    const t = calculateDevisTotals({
      lignes: [{ quantite: 3, prixUnitaire: 150, tva: 20 }],
    });
    expect(t.totalHT).toBe(450);
    expect(t.totalTVA).toBe(90);
    expect(t.ttc).toBe(540);
  });

  it('additionne plusieurs taux de TVA séparément', () => {
    // Rénovation : 1000 € à 10 % (travaux) + 500 € à 20 % (fourniture)
    // → 1500 HT, 100 + 100 = 200 de TVA, 1700 TTC
    const t = calculateDevisTotals({
      lignes: [
        { quantite: 1, prixUnitaire: 1000, tva: 10 },
        { quantite: 1, prixUnitaire: 500, tva: 20 },
      ],
    });
    expect(t.totalHT).toBe(1500);
    expect(t.tvaParTaux[10].montant).toBe(100);
    expect(t.tvaParTaux[20].montant).toBe(100);
    expect(t.totalTVA).toBe(200);
    expect(t.ttc).toBe(1700);
  });

  it('applique la remise sur le HT et recalcule la TVA dessus', () => {
    // 1000 HT, remise 10 % → 900 HT. TVA 20 % sur 900 = 180. TTC 1080.
    // Le piège : appliquer la remise après la TVA donnerait 1080 aussi,
    // mais une TVA de 200 — donc une déclaration fausse.
    const t = calculateDevisTotals({
      lignes: [{ quantite: 1, prixUnitaire: 1000, tva: 20 }],
      remise: 10,
    });
    expect(t.remiseAmount).toBe(100);
    expect(t.htApresRemise).toBe(900);
    expect(t.totalTVA).toBe(180);
    expect(t.ttc).toBe(1080);
  });

  it('met la TVA à zéro en micro-entreprise', () => {
    // Art. 293 B du CGI : franchise en base. Le TTC doit égaler le HT.
    const t = calculateDevisTotals(
      { lignes: [{ quantite: 1, prixUnitaire: 1000, tva: 20 }] },
      true,
    );
    expect(t.totalTVA).toBe(0);
    expect(t.ttc).toBe(1000);
  });

  it('calcule la retenue de garantie sur le HT, pas sur le TTC', () => {
    // Retenue légale BTP = 5 % du HT. Sur 1000 HT / 1200 TTC :
    // 50 € (et non 60 €). Se tromper de base coûte 10 € par chantier.
    const t = calculateDevisTotals({
      lignes: [{ quantite: 1, prixUnitaire: 1000, tva: 20 }],
      retenueGarantie: true,
    });
    expect(t.retenueGarantie).toBe(50);
    expect(t.ttcNet).toBe(1150);
  });

  it('calcule la marge à partir du prix d\'achat', () => {
    // Vente 1000, achat 3 × 200 = 600 → marge 400, soit 40 %
    const t = calculateDevisTotals({
      lignes: [{ quantite: 3, prixUnitaire: 333.34, prixAchat: 200, tva: 20 }],
    });
    expect(t.totalCoutAchat).toBe(600);
    expect(t.marge).toBe(roundEuro(t.htApresRemise - 600));
    expect(t.tauxMarge).toBeGreaterThan(39);
    expect(t.tauxMarge).toBeLessThan(41);
  });

  it('somme les lignes de tous les lots', () => {
    // Un devis en lots doit totaliser comme un devis à plat.
    const t = calculateDevisTotals({
      sections: [
        { titre: 'Démolition', lignes: [{ quantite: 1, prixUnitaire: 800, tva: 10 }] },
        { titre: 'Plomberie', lignes: [{ quantite: 1, prixUnitaire: 1200, tva: 10 }] },
      ],
    });
    expect(t.totalHT).toBe(2000);
    expect(t.totalTVA).toBe(200);
  });

  it('ne dérive pas sur des centimes répétés', () => {
    // 0,07 € × 3 = 0,21 € — en flottant naïf : 0,21000000000000002
    const t = calculateDevisTotals({
      lignes: Array.from({ length: 3 }, () => ({ quantite: 1, prixUnitaire: 0.07, tva: 20 })),
    });
    expect(t.totalHT).toBe(0.21);
  });

  it('traite un devis vide sans exploser', () => {
    const t = calculateDevisTotals({ lignes: [] });
    expect(t.totalHT).toBe(0);
    expect(t.ttc).toBe(0);
    expect(t.tauxMarge).toBe(0);
  });

  it('numérote sans jamais réutiliser un numéro', () => {
    // Deux devis créés coup sur coup ne doivent pas porter le même numéro :
    // un numéro en double rend la comptabilité irrecevable.
    const existants = [{ type: 'devis', numero: `DEV-${new Date().getFullYear()}-00007` }];
    const a = generateNumero('devis', existants);
    const b = generateNumero('devis', existants);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^DEV-\d{4}-\d{5}$/);
  });

  it('normalise les numéros mal formés sans toucher aux bons', () => {
    expect(normalizeNumero('DEV-2026-001')).toBe('DEV-2026-00001');
    expect(normalizeNumero('DEV-2026-00042')).toBe('DEV-2026-00042');
  });
});

// ═══════════════════════════════════════════════════════════════════
// CHEMIN 2 — Facturer : acomptes et solde
// ═══════════════════════════════════════════════════════════════════

describe('Chemin 2 — transformer un devis en factures', () => {
  const devis = {
    numero: 'DEV-2026-00001',
    total_ht: 10000,
    tva: 2000,
    total_ttc: 12000,
    tvaRate: 20,
    tvaParTaux: { 20: { base: 10000, montant: 2000 } },
    lignes: [{ id: 'l1', description: 'Travaux', quantite: 1, prixUnitaire: 10000, montant: 10000, tva: 20 }],
  };

  it('découpe un échéancier 30/70 aux bons montants', () => {
    const etapes = buildEcheancierEtapes(devis, '30-70');
    expect(etapes).toHaveLength(2);
    expect(etapes[0].montant_ht).toBe(3000);
    expect(etapes[0].montant_ttc).toBe(3600);
    expect(etapes[1].montant_ht).toBe(7000);
    expect(etapes[1].montant_ttc).toBe(8400);
  });

  it('ne facture jamais plus que le devis, quel que soit le découpage', () => {
    // La règle qui compte : la somme des étapes = le devis. Sinon on
    // facture au client plus ou moins que ce qu'il a signé.
    for (const modele of ['30-70', '50-50', '30-30-40', '30-40-30']) {
      const etapes = buildEcheancierEtapes(devis, modele);
      const sommeHT = etapes.reduce((s, e) => s + e.montant_ht, 0);
      const sommeTTC = etapes.reduce((s, e) => s + e.montant_ttc, 0);
      expect(sommeHT, `modèle ${modele}`).toBe(10000);
      expect(sommeTTC, `modèle ${modele}`).toBe(12000);
    }
  });

  it('déduit les acomptes déjà facturés du solde', () => {
    let etapes = buildEcheancierEtapes(devis, '30-70');
    etapes = updateEtape(etapes, 1, { statut: ETAPE_STATUT.FACTURE });

    const solde = computeSoldeMontants(devis, etapes.filter(e => e.numero === 1));
    expect(solde.montant_ht).toBe(7000);
    expect(solde.tva).toBe(1400);
    expect(solde.montant_ttc).toBe(8400);
  });

  it('fait apparaître l\'acompte en ligne négative sur la facture de solde', () => {
    // Le client doit lire sur sa facture finale ce qu'il a déjà réglé.
    let etapes = buildEcheancierEtapes(devis, '30-70');
    etapes = updateEtape(etapes, 1, { statut: ETAPE_STATUT.PAYE });

    const lignes = buildFactureLignesForEtape(devis, etapes[1], etapes);
    const negatives = lignes.filter(l => l.montant < 0);
    expect(negatives).toHaveLength(1);
    expect(negatives[0].montant).toBe(-3000);

    // Total de la facture de solde = 10 000 − 3 000 = 7 000
    const totalHT = lignes.reduce((s, l) => s + l.montant, 0);
    expect(totalHT).toBe(7000);
  });

  it('libelle l\'acompte avec son pourcentage et le numéro du devis', () => {
    const etapes = buildEcheancierEtapes(devis, '30-70');
    const lignes = buildFactureLignesForEtape(devis, etapes[0], etapes);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].description).toContain('30%');
    expect(lignes[0].description).toContain('DEV-2026-00001');
    expect(lignes[0].montant).toBe(3000);
  });

  it('désigne la prochaine étape à facturer dans l\'ordre', () => {
    let etapes = buildEcheancierEtapes(devis, '30-40-30');
    expect(getNextEtapeAFacturer(etapes).numero).toBe(1);

    etapes = updateEtape(etapes, 1, { statut: ETAPE_STATUT.FACTURE });
    expect(getNextEtapeAFacturer(etapes).numero).toBe(2);

    etapes = updateEtape(etapes, 2, { statut: ETAPE_STATUT.PAYE });
    etapes = updateEtape(etapes, 3, { statut: ETAPE_STATUT.FACTURE });
    expect(getNextEtapeAFacturer(etapes)).toBeNull();
  });

  it('suit l\'avancement facturé et payé séparément', () => {
    let etapes = buildEcheancierEtapes(devis, '30-70');
    etapes = updateEtape(etapes, 1, { statut: ETAPE_STATUT.PAYE });
    etapes = updateEtape(etapes, 2, { statut: ETAPE_STATUT.FACTURE });

    const p = getEcheancierProgress(etapes);
    expect(p.montantFacture).toBe(12000);  // les deux sont facturées
    expect(p.montantPaye).toBe(3600);      // une seule est encaissée
    expect(p.resteAFacturer).toBe(0);
  });

  it('refuse un échéancier dont les pourcentages ne font pas 100', () => {
    const bancal = [
      { numero: 1, pourcentage: 30 },
      { numero: 2, pourcentage: 50 },
    ];
    expect(validateEcheancier(bancal).valid).toBe(false);
  });

  it('répartit proportionnellement chaque taux de TVA', () => {
    // Devis à deux taux : l'acompte doit porter les deux, au prorata,
    // sinon la TVA déclarée sur l'acompte est fausse.
    const mixte = {
      total_ht: 2000,
      tvaParTaux: { 10: { base: 1000, montant: 100 }, 20: { base: 1000, montant: 200 } },
    };
    const m = computeEtapeMontants(mixte, 50);
    expect(m.tvaParTaux[10]).toEqual({ base: 500, montant: 50 });
    expect(m.tvaParTaux[20]).toEqual({ base: 500, montant: 100 });
    expect(m.tva).toBe(150);
  });
});

// ═══════════════════════════════════════════════════════════════════
// CHEMIN 3 — Encaisser
// ═══════════════════════════════════════════════════════════════════

describe('Chemin 3 — encaisser', () => {
  it('convertit euros et centimes sans perte', () => {
    // 19,99 € × 100 en flottant naïf = 1998.9999999999998 → 1998 centimes.
    expect(eurosToCentimes(19.99)).toBe(1999);
    expect(centimesToEuros(1999)).toBe(19.99);
    expect(eurosToCentimes(0.1 + 0.2)).toBe(30);
  });

  it('calcule les frais Stripe : 1,5 % + 25 centimes', () => {
    // 100 € → 150 + 25 = 175 centimes
    expect(calculateStripeFees(10000)).toBe(175);
  });

  it('déduit les frais du net quand l\'artisan les absorbe', () => {
    const r = calculatePaymentAmounts(10000, 'stripe', true);
    expect(r.clientPays).toBe(10000);
    expect(r.fees).toBe(175);
    expect(r.net).toBe(9825);
  });

  it('ajoute les frais au montant client quand ils sont répercutés', () => {
    const r = calculatePaymentAmounts(10000, 'stripe', false);
    expect(r.clientPays).toBe(10175);
    expect(r.net).toBe(10000);
  });

  it('ne prend aucun frais sur un paiement hors ligne', () => {
    // Chèque, virement, espèces : l'artisan touche tout.
    const r = calculatePaymentAmounts(10000, 'offline', true);
    expect(r.fees).toBe(0);
    expect(r.net).toBe(10000);
  });

  it('ne compte que les paiements réussis dans le total encaissé', () => {
    // `totalEncaisse` porte sur le mois en cours : les transactions sont
    // datées d'aujourd'hui pour rester dans la fenêtre.
    const auj = new Date().toISOString();
    const stats = buildPaymentStats(
      [
        { statut: 'succeeded', montant_centimes: 10000, frais_centimes: 175, created_at: auj },
        { statut: 'succeeded', montant_centimes: 5000, frais_centimes: 100, created_at: auj },
        { statut: 'failed', montant_centimes: 90000, frais_centimes: 0, created_at: auj },
        { statut: 'pending', montant_centimes: 70000, frais_centimes: 0, created_at: auj },
      ],
      [],
    );
    // 150 € encaissés — surtout pas 310 €.
    expect(stats.totalEncaisse).toBe(15000);
    expect(stats.totalFrais).toBe(275);
    expect(stats.countThisMonth).toBe(2);
  });

  it('exclut du mois en cours une transaction du mois dernier', () => {
    const vieux = new Date(Date.now() - 45 * 86400000).toISOString();
    const stats = buildPaymentStats(
      [{ statut: 'succeeded', montant_centimes: 50000, frais_centimes: 0, created_at: vieux }],
      [],
    );
    expect(stats.totalEncaisse).toBe(0);
  });

  it('considère un lien de paiement expiré après sa date', () => {
    const hier = new Date(Date.now() - 86400000).toISOString();
    const demain = new Date(Date.now() + 86400000).toISOString();
    expect(isPaymentLinkExpired({ expires_at: hier })).toBe(true);
    expect(isPaymentLinkExpired({ expires_at: demain })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// CHEMIN 4 — Relancer
// ═══════════════════════════════════════════════════════════════════

describe('Chemin 4 — relancer', () => {
  const config = {
    enabled: true,
    devisSteps: [{ id: 's1', delay: 7, enabled: true }, { id: 's2', delay: 15, enabled: true }],
    factureSteps: [{ id: 'f1', delay: 3, enabled: true }],
  };
  const ilYA = (jours) => new Date(Date.now() - jours * 86400000).toISOString();

  it('ne relance rien tant que le système est éteint', () => {
    // Le garde-fou principal : c'est l'artisan qui allume, pas nous.
    const doc = { id: 'd1', client_id: 'c1', statut: 'envoye', type: 'devis' };
    expect(isDocumentEligible(doc, [], { ...config, enabled: false })).toBe(false);
    expect(isDocumentEligible(doc, [], config)).toBe(true);
  });

  it('ne relance jamais un document payé, refusé ou en brouillon', () => {
    // Relancer un client qui a déjà payé est la pire faute possible.
    for (const statut of ['paye', 'payee', 'refuse', 'brouillon', 'annule', 'signe']) {
      const doc = { id: 'd1', client_id: 'c1', statut, type: 'devis' };
      expect(isDocumentEligible(doc, [], config), `statut ${statut}`).toBe(false);
    }
    for (const statut of ['envoye', 'en_attente', 'vu']) {
      const doc = { id: 'd1', client_id: 'c1', statut, type: 'devis' };
      expect(isDocumentEligible(doc, [], config), `statut ${statut}`).toBe(true);
    }
  });

  it('respecte une exclusion posée sur le document', () => {
    const doc = { id: 'd1', client_id: 'c1', statut: 'envoye', type: 'devis' };
    const excl = [{ scope: 'document', document_id: 'd1', excluded_until: null }];
    expect(isDocumentEligible(doc, excl, config)).toBe(false);
  });

  it('respecte une exclusion posée sur le client, et la laisse expirer', () => {
    const doc = { id: 'd1', client_id: 'c1', statut: 'envoye', type: 'devis' };
    const active = [{ scope: 'client', client_id: 'c1', excluded_until: new Date(Date.now() + 86400000).toISOString() }];
    const expiree = [{ scope: 'client', client_id: 'c1', excluded_until: ilYA(1) }];
    expect(isDocumentEligible(doc, active, config)).toBe(false);
    expect(isDocumentEligible(doc, expiree, config)).toBe(true);
  });

  it('ne relance pas un document sans client', () => {
    const doc = { id: 'd1', client_id: null, statut: 'envoye', type: 'devis' };
    expect(isDocumentEligible(doc, [], config)).toBe(false);
  });

  it('déclenche la première étape passé le délai, pas avant', () => {
    const recent = { id: 'd1', type: 'devis', date: ilYA(2) };
    const vieux = { id: 'd2', type: 'devis', date: ilYA(10) };

    expect(getNextStep(recent, [], config.devisSteps).isDue).toBe(false);
    const du = getNextStep(vieux, [], config.devisSteps);
    expect(du.isDue).toBe(true);
    expect(du.step.id).toBe('s1');
  });

  it('passe à l\'étape suivante une fois la première envoyée', () => {
    const doc = { id: 'd1', type: 'devis', date: ilYA(20) };
    const suite = getNextStep(doc, [{ step_id: 's1', status: 'sent' }], config.devisSteps);
    expect(suite.step.id).toBe('s2');
  });

  it('rejoue une étape dont l\'envoi a échoué', () => {
    // Un échec ne doit pas consommer l'étape, sinon la relance est perdue.
    const doc = { id: 'd1', type: 'devis', date: ilYA(20) };
    const apresEchec = getNextStep(doc, [{ step_id: 's1', status: 'failed' }], config.devisSteps);
    expect(apresEchec.step.id).toBe('s1');
  });

  it('s\'arrête quand toutes les étapes sont passées', () => {
    const doc = { id: 'd1', type: 'devis', date: ilYA(60) };
    const executions = [{ step_id: 's1', status: 'sent' }, { step_id: 's2', status: 'sent' }];
    expect(getNextStep(doc, executions, config.devisSteps)).toBeNull();
  });

  it('compte les délais de facture depuis l\'échéance, pas depuis l\'émission', () => {
    const facture = { id: 'f1', type: 'facture', date: ilYA(60), date_echeance: ilYA(5) };
    expect(getBaseDate(facture).toISOString().slice(0, 10)).toBe(ilYA(5).slice(0, 10));
  });

  it('donne 30 jours de délai à une facture sans échéance', () => {
    // Délai légal supplétif : une facture émise il y a 10 jours n'est pas
    // encore en retard, elle a jusqu'à J+30.
    const facture = { id: 'f1', type: 'facture', date: ilYA(10) };
    expect(getBaseDate(facture).getTime()).toBeGreaterThan(Date.now());
    expect(getNextStep(facture, [], config.factureSteps).isDue).toBe(false);
  });

  it('calcule les pénalités de retard au taux légal', () => {
    // 1 200 € TTC, 30 jours de retard, taux 11,62 % :
    // 1200 × 0,1162 × 30/365 = 11,46 € + 40 € d'indemnité forfaitaire.
    const p = calculatePenalties(1200, 30);
    expect(p.penalites).toBe(11.46);
    expect(p.indemnite).toBe(40);
    expect(p.totalDu).toBe(1251.46);
  });

  it('n\'applique aucune indemnité sans retard', () => {
    const p = calculatePenalties(1200, 0);
    expect(p.penalites).toBe(0);
    expect(p.indemnite).toBe(0);
    expect(p.totalDu).toBe(1200);
  });
});
