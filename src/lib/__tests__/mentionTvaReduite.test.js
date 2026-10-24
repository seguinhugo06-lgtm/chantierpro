import { describe, it, expect } from 'vitest';
import { tauxReduitsPresents, textesCertification, mentionTvaReduiteHtml } from '../mentionTvaReduite';

// Textes officiels, BOFiP BOI-LETTRE-000280 du 09/09/2026, relevés au texte le 24 oct. 2026.
// Facture, § 30 (10 %) et § 40 (5,5 %) : le règlement vaut certification, sans signature.
const FACTURE_30 = 'Par le règlement de la présente facture, le client certifie, en qualité de preneur de la prestation, '
  + 'que les travaux réalisés concernent des locaux à usage d’habitation achevés depuis plus de deux ans, qu’ils n’ont pas '
  + 'eu pour effet, sur une période de deux ans au plus, de concourir à la production d’un immeuble neuf au sens du 2° du 2 '
  + 'du I de l’article 257 du CGI, ni d’entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10 %.';
const FACTURE_40 = 'Par le règlement de la présente facture, le client certifie, en qualité de preneur de la prestation, '
  + 'que les travaux réalisés concernent des locaux à usage d’habitation achevés depuis plus de deux ans, qu’ils n’ont pas '
  + 'eu pour effet, sur une période de deux ans au plus, de concourir à la production d’un immeuble neuf au sens du 2° du 2 '
  + 'du I de l’article 257 du CGI, ni d’entraîner une augmentation de la surface de plancher des locaux existants supérieure '
  + 'à 10 % et qu’ils ont la nature de travaux de rénovation énergétique.';
// Devis, § 20 (5,5 %) : les travaux sont à venir, d'où le futur « n'auront pas pour effet ».
const DEVIS_20_SUITE = 'certifie, en qualité de preneur de la prestation, que les travaux réalisés concernent des locaux à usage '
  + 'd’habitation achevés depuis plus de deux ans, qu’ils n’auront pas pour effet, sur une période de deux ans au plus, de '
  + 'concourir à la production d’un immeuble neuf au sens du 2° du 2 du I de l’article 257 du CGI, ni d’entraîner une '
  + 'augmentation de la surface de plancher des locaux existants supérieure à 10 % et qu’ils ont la nature de travaux de '
  + 'rénovation énergétique.';

describe('tauxReduitsPresents', () => {
  it('repère 10 % et 5,5 % quelle que soit l’écriture de la clé', () => {
    expect(tauxReduitsPresents({ 10: { base: 100 }, '5.5': { base: 50 } })).toEqual({ dix: true, cinqCinq: true });
    expect(tauxReduitsPresents({ '5,5': { base: 50 } })).toEqual({ dix: false, cinqCinq: true });
  });

  it('ignore un taux sans base et le taux normal', () => {
    expect(tauxReduitsPresents({ 20: { base: 100 }, 10: { base: 0 } })).toEqual({ dix: false, cinqCinq: false });
    expect(tauxReduitsPresents(undefined)).toEqual({ dix: false, cinqCinq: false });
  });
});

describe('textesCertification — devis (signé par le client)', () => {
  it('modèle du § 10 au futur, nom du client prérempli', () => {
    const [texte] = textesCertification({ dix: true, cinqCinq: false }, 'Claire Rousseau');
    expect(texte).toBe('Je soussigné(e) Claire Rousseau certifie, en qualité de preneur de la prestation, que les travaux '
      + 'réalisés concernent des locaux à usage d’habitation achevés depuis plus de deux ans et qu’ils n’auront pas pour effet, '
      + 'sur une période de deux ans au plus, de concourir à la production d’un immeuble neuf au sens du 2° du 2 du I de '
      + 'l’article 257 du CGI, ni d’entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10 %.');
  });

  it('modèle du § 20 mot pour mot, pointillés quand le nom est inconnu', () => {
    const [texte] = textesCertification({ dix: false, cinqCinq: true });
    expect(texte).toBe(`Je soussigné(e) ............................ (Nom, prénoms) ${DEVIS_20_SUITE}`);
  });

  it('un document mixte reçoit les deux modèles', () => {
    expect(textesCertification({ dix: true, cinqCinq: true })).toHaveLength(2);
  });

  it('un « $ » dans le nom est recopié tel quel', () => {
    const [texte] = textesCertification({ dix: true, cinqCinq: false }, 'Dupont $& Fils');
    expect(texte.startsWith('Je soussigné(e) Dupont $& Fils certifie')).toBe(true);
  });
});

describe('textesCertification — facture (le règlement vaut certification)', () => {
  it('modèles des § 30 et 40 mot pour mot, sans nom ni « soussigné »', () => {
    expect(textesCertification({ dix: true, cinqCinq: false }, 'Claire Rousseau', { isFacture: true })).toEqual([FACTURE_30]);
    expect(textesCertification({ dix: false, cinqCinq: true }, undefined, { isFacture: true })).toEqual([FACTURE_40]);
    expect(textesCertification({ dix: true, cinqCinq: true }, 'X', { isFacture: true })).toEqual([FACTURE_30, FACTURE_40]);
  });

  it('facture d’acompte : travaux à venir, donc au futur', () => {
    const [dix, cinqCinq] = textesCertification({ dix: true, cinqCinq: true }, 'X', { isFacture: true, isAcompte: true });
    expect(dix).toBe(FACTURE_30.replace('qu’ils n’ont pas eu pour effet', 'qu’ils n’auront pas pour effet'));
    expect(cinqCinq).toBe(FACTURE_40.replace('qu’ils n’ont pas eu pour effet', 'qu’ils n’auront pas pour effet'));
  });
});

describe('mentionTvaReduiteHtml', () => {
  it('rien pour un document à 20 %, en franchise de TVA, ou pour un avoir', () => {
    expect(mentionTvaReduiteHtml({ tvaDetails: { 20: { base: 500 } } })).toBe('');
    expect(mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 500 } }, isMicro: true })).toBe('');
    expect(mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 500 } }, isFacture: true, isAvoir: true })).toBe('');
  });

  it('échappe le nom du client', () => {
    const html = mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 500 } }, nomClient: '<b>X</b>' });
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(html).not.toContain('<b>X</b>');
  });

  // Conservation : « suivant la réalisation de ces travaux » (CGI 279-0 bis, 3) ou « qui suit l'émission des factures »
  // (CGI 278-0 bis A, IV) : la plus tardive des deux échéances.
  const CONSERVATION = 'Document à conserver jusqu’au 31 décembre de la cinquième année suivant la réalisation des travaux et leur facturation.';

  it('devis : la signature du devis vaut certification', () => {
    const html = mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 1 } }, nomClient: 'Claire Rousseau' });
    expect(html).toContain('Je soussigné(e) Claire Rousseau certifie');
    expect(html).toContain(`La signature du présent devis vaut certification. À défaut, le taux normal de 20 % s’applique. ${CONSERVATION}`);
  });

  it('facture : modèle « par le règlement », sans ligne de signature', () => {
    const html = mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 1 }, '5.5': { base: 1 } }, nomClient: 'Claire Rousseau', isFacture: true });
    expect(html).toContain('Par le règlement de la présente facture, le client certifie');
    expect(html).toContain('rénovation énergétique');
    expect(html).not.toContain('soussigné');
    expect(html).not.toContain('Claire Rousseau');
    expect(html).not.toMatch(/signature/i);
    // « À défaut de certification, 20 % » se lirait « à défaut de paiement » : retiré (juriste-btp, 24 oct. 2026)
    expect(html).not.toContain('À défaut');
    expect(html).toContain(CONSERVATION);
  });

  it('facture d’acompte : certification au futur', () => {
    const html = mentionTvaReduiteHtml({ tvaDetails: { 10: { base: 1 } }, isFacture: true, isAcompte: true });
    expect(html).toContain('Par le règlement de la présente facture, le client certifie');
    expect(html).toContain('qu’ils n’auront pas pour effet');
  });
});
