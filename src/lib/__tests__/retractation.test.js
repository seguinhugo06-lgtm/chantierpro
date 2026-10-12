import { describe, it, expect } from 'vitest';
import {
  blocRetractationHtml, dateHeureParis, estClientParticulier, estConcerneParRetractation, finDelaiRetractation,
  jourParis, mentionsSignatureClientHtml, paques, DEMANDE_EXPRESSE,
} from '../retractation';

// Mêmes cas que le banc de la migration 086 (fin_delai_retractation, côté base).
describe('fin du délai de rétractation (L221-18, L221-19, L221-20)', () => {
  it.each([
    ['2026-10-02', '2026-10-16', 'vendredi ordinaire'],
    ['2026-12-11', '2026-12-28', 'Noël un vendredi, puis le week-end'],
    ['2027-03-15', '2027-03-30', 'lundi de Pâques 2027'],
    ['2027-04-22', '2027-05-07', 'Ascension 2027'],
    ['2027-04-17', '2027-05-03', '1er mai un samedi'],
    ['2026-07-31', '2026-08-14', 'veille du 15 août'],
    ['2027-03-12', '2027-03-30', 'Vendredi saint (Alsace-Moselle), Pâques, lundi de Pâques'],
    ['2026-10-12', '2026-10-26', 'aujourd’hui (lundi)'],
  ])('contrat du %s → %s (%s)', (conclusion, attendu) => {
    expect(finDelaiRetractation(conclusion)).toBe(attendu);
  });

  it('sans l’avis complet : douze mois de plus, reportés au jour ouvrable (comme la base)', () => {
    expect(finDelaiRetractation('2026-10-02', false)).toBe('2027-10-18');
  });

  it('Pâques connues', () => {
    expect(paques(2026).toISOString().slice(0, 10)).toBe('2026-04-05');
    expect(paques(2027).toISOString().slice(0, 10)).toBe('2027-03-28');
    expect(paques(2028).toISOString().slice(0, 10)).toBe('2028-04-16');
  });

  it('date illisible → vide', () => {
    expect(finDelaiRetractation('')).toBe('');
    expect(finDelaiRetractation(null)).toBe('');
  });

  it('le jour de la signature se lit à Paris (22 h 30 UTC en octobre = le lendemain à Paris)', () => {
    expect(jourParis('2026-10-12T22:30:00Z')).toBe('2026-10-13');
    expect(jourParis('2026-10-12T21:30:00Z')).toBe('2026-10-12');
    expect(dateHeureParis('2026-10-12T12:32:00Z')).toBe('12/10/2026 à 14 h 32');
  });
});

describe('qui est concerné', () => {
  const devis = { type: 'devis' };
  it('particulier : catégorie « Particulier » (toute casse), ou ni catégorie ni entreprise', () => {
    expect(estClientParticulier({ categorie: 'Particulier' })).toBe(true);
    expect(estClientParticulier({ categorie: 'particulier', entreprise: '' })).toBe(true);
    expect(estClientParticulier({ nom: 'Martin' })).toBe(true);
  });
  it('copropriété (Syndic), professionnel, architecte, entreprise sans catégorie : non', () => {
    expect(estClientParticulier({ categorie: 'Syndic' })).toBe(false);
    expect(estClientParticulier({ categorie: 'Professionnel' })).toBe(false);
    expect(estClientParticulier({ categorie: 'Architecte' })).toBe(false);
    expect(estClientParticulier({ entreprise: 'SARL X' })).toBe(false);
    expect(estClientParticulier(null)).toBe(false);
  });
  it('facture et avoir : jamais', () => {
    expect(estConcerneParRetractation({ doc: devis, client: { categorie: 'Particulier' } })).toBe(true);
    expect(estConcerneParRetractation({ doc: { type: 'facture' }, client: { categorie: 'Particulier' } })).toBe(false);
    expect(estConcerneParRetractation({ doc: { type: 'devis', facture_type: 'avoir' }, client: {} })).toBe(false);
  });
});

describe('textes imprimés (annexes R221-3 et R221-1, mot pour mot)', () => {
  const entreprise = { nom: 'Élec du Sud', formeJuridique: 'SARL', adresse: '3 rue des Lilas\n33000 Bordeaux', telephone: '06 00 00 00 00', email: 'contact@elec.fr' };
  const html = blocRetractationHtml({ entreprise, doc: { type: 'devis' } });

  it('l’avis type complété pour une prestation de services', () => {
    expect(html).toContain('INFORMATIONS CONCERNANT L\'EXERCICE DU DROIT DE RÉTRACTATION');
    expect(html).toContain('Vous avez le droit de vous rétracter du présent contrat sans donner de motif dans un délai de quatorze jours.');
    expect(html).toContain('Le délai de rétractation expire quatorze jours après le jour de la conclusion du contrat.');
    expect(html).toContain('vous devez nous notifier (Élec du Sud, 3 rue des Lilas, 33000 Bordeaux, 06 00 00 00 00, contact@elec.fr) votre décision de rétractation du présent contrat au moyen d\'une déclaration dénuée d\'ambiguïté');
    expect(html).toContain('Vous pouvez utiliser le modèle de formulaire de rétractation mais ce n\'est pas obligatoire.');
    expect(html).toContain('y compris les frais de livraison (à l\'exception des frais supplémentaires');
    expect(html).toContain('Si vous avez demandé de commencer la prestation de services pendant le délai de rétractation, vous devrez nous payer un montant proportionnel');
    expect(html).toContain('article L221-28, 1°');
    expect(html).not.toMatch(/recommandée|\(1\)|\(2\)|\(3\)|\(6\)|fourniture d'eau/);
  });

  it('le formulaire type, adressé à l’entreprise', () => {
    expect(html).toContain('MODÈLE DE FORMULAIRE DE RÉTRACTATION');
    expect(html).toContain('(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)');
    expect(html).toContain('A l\'attention de Élec du Sud, 3 rue des Lilas, 33000 Bordeaux, contact@elec.fr :');
    expect(html).toContain('Je/nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la vente du bien (*)/pour la prestation de services (*) ci-dessous :');
    expect(html).toContain('Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :');
    expect(html).toContain('(*) Rayez la mention inutile.');
  });

  it('la rétractation en ligne seulement quand le devis a un lien de signature', () => {
    expect(html).not.toContain('en ligne sur');
    const avecLien = blocRetractationHtml({ entreprise, doc: {}, lienEnLigne: 'https://mallettico.fr/devis/signer/abc' });
    expect(avecLien).toContain('Vous pouvez également exercer votre droit de rétractation en ligne sur https://mallettico.fr/devis/signer/abc. Si vous utilisez cette fonctionnalité en ligne, nous vous enverrons, dans les meilleurs délais, un accusé de réception');
  });

  it('dépannage urgent : la mention L221-28, 8° en tête, et l’avis reste', () => {
    const urgent = blocRetractationHtml({ entreprise, doc: { travaux_urgents: true } });
    expect(urgent).toContain('Dépannage urgent');
    expect(urgent).toContain('article L221-28, 8°');
    expect(urgent).toContain('MODÈLE DE FORMULAIRE DE RÉTRACTATION');
  });

  it('les valeurs saisies sont échappées', () => {
    const piege = blocRetractationHtml({ entreprise: { nom: '<img src=x onerror=alert(1)>', email: 'a@b.fr' } });
    expect(piege).not.toContain('<img');
  });

  it('sous la signature : la demande expresse avec sa date, la phrase du dépannage urgent', () => {
    expect(mentionsSignatureClientHtml({})).toBe('');
    const m = mentionsSignatureClientHtml({ execution_anticipee_le: '2026-10-12T12:32:00Z', signature_data: 'x', travaux_urgents: true });
    expect(m).toContain(DEMANDE_EXPRESSE.replace(/'/g, '&#39;'));
    expect(m).toContain('recueillie le 12/10/2026 à 14 h 32 (heure de Paris) lors de la signature en ligne');
    expect(m).toContain('ces travaux de dépannage sont réalisés en urgence à mon domicile');
  });
});
