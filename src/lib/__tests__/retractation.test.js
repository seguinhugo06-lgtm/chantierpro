import { describe, it, expect } from 'vitest';
import {
  blocRetractationHtml, dateHeureParis, delaiRetractationDevis, estClientParticulier, estConcerneParRetractation,
  finDelaiRetractation, jourParis, lienRetractationEnLigne, mentionsSignatureClientHtml, paques, DEMANDE_EXPRESSE,
  paiementPossibleLe, raisonSeptJours, delaiSeptJours, echeanceApresSeptJours,
} from '../retractation';
import { blocConditionsPaiement } from '../formatDocument';

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

  it('la perte du droit (L221-5, 10°) est imprimée hors du cadre du modèle officiel', () => {
    const avis = html.slice(html.indexOf('INFORMATIONS CONCERNANT'), html.indexOf('MODÈLE DE FORMULAIRE'));
    const cadre = avis.slice(0, avis.indexOf('</div>'));
    expect(cadre).not.toContain('L221-28, 1°');
    expect(avis).toContain('L221-28, 1°');
  });

  it('pas de rétractation en ligne annoncée pour un devis signé sur place (la fonctionnalité n’y existe pas)', () => {
    expect(lienRetractationEnLigne({ signature_token: 'abc' })).toMatch(/\/devis\/signer\/abc$/);
    expect(lienRetractationEnLigne({ signature_token: 'abc', signature: 'data:image/png;base64,x' })).toBe('');
    expect(lienRetractationEnLigne({ signature_token: 'abc', signature_data: 'data:image/png;base64,x' })).toMatch(/abc$/);
    expect(lienRetractationEnLigne({ signature_token: 'abc', signature_data: 'x', retractation_en_ligne: true })).toMatch(/abc$/);
    expect(lienRetractationEnLigne({ signature_token: 'abc', signature_data: 'x', retractation_en_ligne: false })).toBe('');
    expect(lienRetractationEnLigne({}, 'jeton')).toMatch(/\/devis\/signer\/jeton$/);
    expect(lienRetractationEnLigne({})).toBe('');
  });

  it('délai vu par l’artisan : prolongé sans l’avis complet (en ligne : selon la base ; sur place : avant la mise en production)', () => {
    expect(delaiRetractationDevis({ signature_data: 'x', avis_retractation: true }, '2026-10-12T09:00:00Z')).toEqual({ fin: '2026-10-26', prolonge: false });
    expect(delaiRetractationDevis({ signature_data: 'x', avis_retractation: false }, '2026-10-12T09:00:00Z')).toEqual({ fin: '2027-10-26', prolonge: true });
    expect(delaiRetractationDevis({ signature: 'x' }, '2026-10-12T09:00:00Z').prolonge).toBe(true);
    expect(delaiRetractationDevis({ signature: 'x' }, '2026-10-13T09:00:00Z').prolonge).toBe(false);
    expect(delaiRetractationDevis({ signature: 'x' }, '2026-10-01T09:00:00Z')).toEqual({ fin: '2027-10-15', prolonge: true });
    expect(delaiRetractationDevis({ signature: 'x' }, null)).toBeNull();
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

  it('sous la signature sur place : l’accord du client pour recevoir son exemplaire par e-mail (L221-9)', () => {
    const m = mentionsSignatureClientHtml({ signature: 'x', exemplaire_email_accepte_le: '2026-10-17T08:15:00Z' });
    expect(m).toContain('Le client a accepté de recevoir son exemplaire par e-mail (art. L221-9 du Code de la consommation) — le 17/10/2026 à 10 h 15');
  });
});

// Tâche sept-jours : aucun paiement dans les 7 jours d'une signature sur place chez un particulier (L221-10).
describe('paiement possible à partir du 8e jour (L221-10)', () => {
  const particulier = { categorie: 'Particulier' };
  const surPlace = { type: 'devis', signature: 'data:image/png;base64,AA==', signatureDate: '2026-10-16T14:30:00Z' };
  const a = (jour) => new Date(`${jour}T10:00:00Z`);

  it('signé sur place le 16 : rien avant le 24, plus d\'interdiction le 24', () => {
    expect(paiementPossibleLe({ devis: surPlace, client: particulier, maintenant: a('2026-10-16') })).toBe('2026-10-24');
    expect(paiementPossibleLe({ devis: surPlace, client: particulier, maintenant: a('2026-10-23') })).toBe('2026-10-24');
    expect(paiementPossibleLe({ devis: surPlace, client: particulier, maintenant: a('2026-10-24') })).toBeNull();
  });
  it('signature tard le soir : le jour de Paris compte (23 h 30 à Paris le 16 = 21 h 30 UTC)', () => {
    const tard = { ...surPlace, signatureDate: '2026-10-16T21:30:00Z' };
    expect(paiementPossibleLe({ devis: tard, client: particulier, maintenant: a('2026-10-17') })).toBe('2026-10-24');
  });
  it('ne concerne ni un professionnel, ni une signature par le lien, ni un dépannage urgent, ni un devis non signé', () => {
    const maintenant = a('2026-10-17');
    expect(paiementPossibleLe({ devis: surPlace, client: { categorie: 'Professionnel' }, maintenant })).toBeNull();
    expect(paiementPossibleLe({ devis: { type: 'devis', signature_data: 'x', signature_date: '2026-10-16T14:30:00Z' }, client: particulier, maintenant })).toBeNull();
    expect(paiementPossibleLe({ devis: { ...surPlace, travaux_urgents: true }, client: particulier, maintenant })).toBeNull();
    expect(paiementPossibleLe({ devis: { type: 'devis' }, client: particulier, maintenant })).toBeNull();
  });
  it('la demande expresse de commencer ne lève pas l\'interdiction', () => {
    expect(paiementPossibleLe({ devis: { ...surPlace, execution_anticipee_le: '2026-10-16T14:30:00Z' }, client: particulier, maintenant: a('2026-10-17') })).toBe('2026-10-24');
  });
  it('explique la date à l\'artisan, et le report quand il a lieu', () => {
    expect(raisonSeptJours('2026-10-24')).toMatch(/n'acceptez aucun paiement avant le 24\/10\/2026, ni acompte, ni chèque .*L221-10/);
    expect(raisonSeptJours('2026-10-24')).not.toMatch(/reporté/);
    expect(raisonSeptJours({ possibleLe: '2026-10-27', reporte: true })).toMatch(/délai reporté au premier jour ouvrable/);
    expect(raisonSeptJours(null)).toBe('');
  });
  // Relecture juriste-btp du 17 oct. 2026 : 7e jour un samedi, un dimanche ou un jour férié → premier jour ouvrable
  // (C. proc. civ. art. 642), paiement possible le lendemain
  it.each([
    ['2026-10-17T10:00:00Z', '2026-10-25', '2026-10-27', true, '7e jour samedi 24/10 → lundi 26'],
    ['2026-10-24T10:00:00Z', '2026-11-01', '2026-11-03', true, '7e jour samedi 31/10, puis 1er novembre férié → lundi 2'],
    ['2026-11-04T10:00:00Z', '2026-11-12', '2026-11-13', true, '7e jour 11 novembre férié → jeudi 12'],
    ['2026-10-16T10:00:00Z', '2026-10-23', '2026-10-24', false, '7e jour vendredi 23/10 : pas de report'],
  ])('signé le %s, vu le %s : paiement possible le %s (%s)', (signe, vu, possible, reporte) => {
    const d = delaiSeptJours({ devis: { ...surPlace, signatureDate: signe }, client: particulier, maintenant: a(vu) });
    expect(d).toEqual({ possibleLe: possible, reporte });
    expect(paiementPossibleLe({ devis: { ...surPlace, signatureDate: signe }, client: particulier, maintenant: a(possible) })).toBeNull();
  });
});

// Tâche sept-jours-factures : une facture émise pendant le délai ne réclame aucun paiement avant sa fin (L242-7).
describe('échéance d’une facture émise pendant les sept jours', () => {
  const delai = { possibleLe: '2026-10-24', reporte: false };
  it('« à réception » (échéance le jour même) : échéance au jour possible, phrase à la place des conditions', () => {
    expect(echeanceApresSeptJours(delai, '2026-10-17')).toEqual({
      date_echeance: '2026-10-24',
      conditions: 'Paiement au plus tôt le 24/10/2026 (article L221-10 du Code de la consommation)',
      conditionsPaiement: null,
    });
  });
  it('échéance déjà après la fin du délai (30 jours), ou pas de délai en cours : rien ne change', () => {
    expect(echeanceApresSeptJours(delai, '2026-11-16')).toBeNull();
    expect(echeanceApresSeptJours(delai, '2026-10-24')).toBeNull();
    expect(echeanceApresSeptJours(null, '2026-10-17')).toBeNull();
  });
  it('imprimé par le bloc commun des générateurs : la phrase remplace « À réception de facture », avec la date', () => {
    const facture = { type: 'facture', conditionsPaiement: 'reception', date_echeance: '2026-10-17' };
    Object.assign(facture, echeanceApresSeptJours(delai, facture.date_echeance));
    const bloc = blocConditionsPaiement({ doc: facture, entreprise: {}, isFacture: true, dateEcheance: facture.date_echeance });
    expect(bloc).toContain('Paiement au plus tôt le 24/10/2026 (article L221-10 du Code de la consommation).');
    expect(bloc).toContain('Date d\'échéance : 24/10/2026');
    expect(bloc).not.toContain('À réception de facture');
  });
  it('conditions en texte libre illisibles (« Paiement comptant ») : la phrase les remplace, l’échéance reste', () => {
    expect(echeanceApresSeptJours(delai, '2026-11-16', 'Paiement comptant')).toEqual({
      conditions: 'Paiement au plus tôt le 24/10/2026 (article L221-10 du Code de la consommation)',
      conditionsPaiement: null,
    });
    expect(echeanceApresSeptJours(delai, '2026-11-16', '30_jours')).toBeNull();
    expect(echeanceApresSeptJours(delai, '2026-11-16', 'Paiement à 30 jours')).toBeNull();
    expect(echeanceApresSeptJours(delai, '2026-10-17', 'Paiement comptant').date_echeance).toBe('2026-10-24');
  });
});
