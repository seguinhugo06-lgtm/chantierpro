import { describe, it, expect } from 'vitest';
import { TRADE_LIBRARY } from '../../../lib/templates/trade-library.js';
import {
  totalTTC,
  etapesDuDevis,
  lotDemonstration,
  etatDuDevis,
  dureeEtape,
  libelleTotal,
  NOM_LOT_DEMONSTRATION,
  NB_LIGNES_DEMONSTRATION,
  NUMERO_DEVIS,
  NUMERO_FACTURE,
} from '../devisVivantEtapes.js';

/** Un lot de 7 lignes à TVA mêlées, comme ceux de la bibliothèque. */
const LOT_7 = {
  id: 'essai',
  nom: 'Lot d’essai',
  lignes: [
    { designation: 'A', unite: 'u', quantite: 1, prixUnitaire: 220, tva: 10 },
    { designation: 'B', unite: 'u', quantite: 2, prixUnitaire: 35.5, tva: 20 },
    { designation: 'C', unite: 'm²', quantite: 12.5, prixUnitaire: 18, tva: 5.5 },
    { designation: 'D', unite: 'ml', quantite: 40, prixUnitaire: 4.2, tva: 10 },
    { designation: 'E', unite: 'forfait', quantite: 1, prixUnitaire: 150, tva: 20 },
    { designation: 'F', unite: 'h', quantite: 6, prixUnitaire: 48, tva: 10 },
    { designation: 'G', unite: 'u', quantite: 3, prixUnitaire: 9.99, tva: 20 },
  ],
};

describe('totalTTC', () => {
  it('additionne quantité × prix × (1 + TVA) de chaque ligne, TVA propre à chaque ligne', () => {
    const lignes = [
      { quantite: 2, prixUnitaire: 100, tva: 10 }, // 220
      { quantite: 1, prixUnitaire: 50.5, tva: 20 }, // 60,60
    ];
    expect(totalTTC(lignes)).toBe(280.6);
  });

  it('arrondit au centime, y compris un demi-centime que le binaire place juste en dessous', () => {
    expect(totalTTC([{ quantite: 3, prixUnitaire: 0.1, tva: 5.5 }])).toBe(0.32); // 0,3165
    expect(totalTTC([{ quantite: 1, prixUnitaire: 10.005, tva: 0 }])).toBe(10.01);
  });

  it('vaut 0 pour une liste vide', () => {
    expect(totalTTC([])).toBe(0);
  });
});

describe('etapesDuDevis', () => {
  const etapes = etapesDuDevis(LOT_7);

  it('une étape par ligne, dans l’ordre du lot, avec le total TTC cumulé', () => {
    const lignes = etapes.filter((e) => e.type === 'ligne');
    expect(lignes).toHaveLength(7);
    lignes.forEach((e, i) => {
      expect(e.ligne).toBe(LOT_7.lignes[i]);
      expect(e.totalTTC).toBe(totalTTC(LOT_7.lignes.slice(0, i + 1)));
    });
    expect(lignes[6].totalTTC).toBe(totalTTC(LOT_7.lignes));
  });

  it('puis signé, facturé, payé à 40 % puis en entier, dans cet ordre', () => {
    expect(etapes.slice(0, 7).every((e) => e.type === 'ligne')).toBe(true);
    expect(etapes.slice(7)).toEqual([
      { type: 'signe' },
      { type: 'facture', numero: 'FAC-2026-00042' },
      { type: 'encaisse', part: 0.4 },
      { type: 'encaisse', part: 1 },
    ]);
  });
});

describe('lotDemonstration', () => {
  it('renvoie le lot « tableau » de la bibliothèque Électricité', () => {
    const lot = lotDemonstration(TRADE_LIBRARY);
    expect(TRADE_LIBRARY.electricite.lots).toContain(lot);
    expect(lot.nom.toLowerCase()).toContain('tableau');
  });

  it('lève une erreur explicite si le lot a disparu de la bibliothèque', () => {
    expect(() => lotDemonstration({ electricite: { lots: [] } })).toThrow(/tableau.*Électricité/);
    expect(() => lotDemonstration({})).toThrow(/tableau/);
    // Le message désigne le fichier à modifier, sous son nom actuel
    expect(() => lotDemonstration({})).toThrow(/src\/components\/landing\/devisVivantEtapes\.js/);
  });

  // Le titre s'affiche avant le chargement de la bibliothèque, la légende et le texte hors écran
  // (« un devis de 7 lignes », « TVA 10 % ») sont écrits en dur : ils doivent dire vrai.
  it('les textes écrits en dur décrivent bien ce lot (nom, 7 lignes, TVA 10 %)', () => {
    const lot = lotDemonstration(TRADE_LIBRARY);
    expect(lot.nom).toBe(NOM_LOT_DEMONSTRATION);
    expect(lot.lignes).toHaveLength(7);
    expect(NB_LIGNES_DEMONSTRATION).toBe(7);
    expect(libelleTotal(lot.lignes)).toBe('Total TTC (TVA 10 %)');
  });
});

describe('etatDuDevis', () => {
  const etapes = etapesDuDevis(LOT_7);

  it('avant la première étape : brouillon vide', () => {
    expect(etatDuDevis(etapes, -1)).toEqual({
      lignesVues: 0, totalTTC: 0, statut: 'brouillon', numero: NUMERO_DEVIS, tampon: false, encaisse: null,
    });
  });

  it('les lignes s’ajoutent une à une avec leur total', () => {
    const e = etatDuDevis(etapes, 2);
    expect(e.lignesVues).toBe(3);
    expect(e.totalTTC).toBe(totalTTC(LOT_7.lignes.slice(0, 3)));
    expect(e.statut).toBe('brouillon');
  });

  it('signé : tampon, toujours le numéro du devis', () => {
    const e = etatDuDevis(etapes, 7);
    expect(e).toMatchObject({ lignesVues: 7, statut: 'signe', numero: NUMERO_DEVIS, tampon: true, encaisse: null });
  });

  it('facturé puis payé en partie : numéro de facture, encaissement à 0 puis 40 %', () => {
    expect(etatDuDevis(etapes, 8)).toMatchObject({ statut: 'facture', numero: NUMERO_FACTURE, tampon: false, encaisse: 0 });
    expect(etatDuDevis(etapes, 9)).toMatchObject({ statut: 'partiel', numero: NUMERO_FACTURE, encaisse: 0.4 });
  });

  it('dernière étape (état du mouvement réduit) : complet et payé', () => {
    expect(etatDuDevis(etapes, etapes.length - 1)).toEqual({
      lignesVues: 7, totalTTC: totalTTC(LOT_7.lignes), statut: 'payee', numero: NUMERO_FACTURE, tampon: false, encaisse: 1,
    });
  });

  it('sans données (bibliothèque pas encore chargée) : brouillon vide', () => {
    expect(etatDuDevis([], -1)).toMatchObject({ lignesVues: 0, totalTTC: 0, statut: 'brouillon' });
  });
});

describe('dureeEtape (rythme de la boucle)', () => {
  const etapes = etapesDuDevis(LOT_7);

  it('chaque étape dure un temps positif', () => {
    for (let i = -1; i < etapes.length; i++) expect(dureeEtape(etapes, i)).toBeGreaterThan(0);
  });

  it('une pause avant la signature, et l’état « payé » reste le plus longtemps à l’écran', () => {
    expect(dureeEtape(etapes, 6)).toBeGreaterThan(dureeEtape(etapes, 5));
    const payee = dureeEtape(etapes, etapes.length - 1);
    for (let i = -1; i < etapes.length - 1; i++) expect(payee).toBeGreaterThan(dureeEtape(etapes, i));
  });
});

describe('libelleTotal', () => {
  it('nomme la TVA quand elle est la même sur toutes les lignes, au format français', () => {
    expect(libelleTotal([{ tva: 5.5 }, { tva: 5.5 }])).toBe('Total TTC (TVA 5,5 %)');
  });

  it('reste « Total TTC » quand les taux diffèrent ou sans ligne', () => {
    expect(libelleTotal(LOT_7.lignes)).toBe('Total TTC');
    expect(libelleTotal([])).toBe('Total TTC');
  });
});
