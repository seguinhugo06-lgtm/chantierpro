import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { estFranchiseTva, franchiseAppliquee } from '../../lib/franchiseTva';
import { buildMiseEnDemeureHtml } from '../../lib/miseEnDemeureBuilder';
import { tableauExportDocuments, tableauExportCatalogue } from '../../lib/exportsCsv';
import { libelleTotalImprime, lignesTotauxHtml } from '../../lib/totauxDocument';

/**
 * Tâche 28 `franchise-restes` (4 nov. 2026) : les derniers « HT » et « TTC » en franchise en base de TVA (art. 293 B du
 * CGI, D-31). Chaque écran ou fichier est rendu pour une micro-entreprise (ni « HT » ni « TTC ») et pour une SARL
 * (contre-essai : « HT » / « TTC » restent). Le drapeau vient de la règle unique `estFranchiseTva`.
 * Sans navigateur de test, l'état de départ est imposé : `etatsInitiaux` remplace la valeur initiale des premiers useState.
 */
// Sans DOM : ce que les portails (document.body) et la page de paiement (window.location) lisent
vi.stubGlobal('document', { body: {} });
vi.stubGlobal('window', { location: { search: '' } });

let etatsInitiaux = [];
vi.mock('react', async (original) => {
  const React = await original();
  const useState = (init) => React.useState(etatsInitiaux.length ? etatsInitiaux.shift() : init);
  return { ...React, default: { ...React, useState }, useState };
});
// Le portail ne se rend pas côté serveur : rendu sur place
vi.mock('react-dom', async (original) => ({ ...(await original()), createPortal: (el) => el }));
vi.mock('react-signature-canvas', () => ({ default: () => null }));
vi.mock('../../context/AppContext', () => ({
  useToast: () => ({ showToast: () => {} }),
  useConfirm: () => ({ confirm: async () => true }),
}));
const RAMONAGE = {
  id: 'r1', client_id: 'cl1', appareil_ref: 'a1', appareil_type: 'chaudiere_bois', methode: 'herisson',
  realise_le: '2026-10-01T09:00:00Z', prochain_avant: '2027-10-01', prix_ht: 85, numero: 'RAM-2026-001',
};
vi.mock('../../context/DataContext', () => ({ useData: () => ({ ramonages: [RAMONAGE], clients: [], devis: [] }) }));
vi.mock('../../hooks/usePermissions', () => ({ usePermissions: () => ({ canViewPrices: true, canPerform: () => true }) }));
vi.mock('../../supabaseClient', () => ({ supabase: { rpc: async () => ({}) }, isDemo: false }));

const { default: OuvragesList } = await import('../bibliotheque/OuvragesList');
const { default: RamonageTab } = await import('../settings/RamonageTab');
const { default: SaisieRamonage } = await import('../ramonage/SaisieRamonage');
const { default: OngletRamonage } = await import('../ramonage/OngletRamonage');
const { default: DiffViewer } = await import('../audit/DiffViewer');
const { default: SnapshotViewer } = await import('../audit/SnapshotViewer');
const { variablesDisponibles } = await import('../settings/RelanceConfigTab');
const { champsImport } = await import('../catalogue/FenetresCatalogue');
const { default: PublicPaymentPage } = await import('../payment/PublicPaymentPage');

afterEach(() => { etatsInitiaux = []; });

const texte = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/[\s  ]+/g, ' ').trim();
const HT_OU_TTC = /(?<![A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ])/;

const MICRO = { nom: 'Élec Seguin', formeJuridique: 'Micro-entreprise', siret: '12345678900011', ramonageActif: true };
const SARL = { ...MICRO, formeJuridique: 'SARL' };
const client = { id: 'cl1', nom: 'Rousseau', prenom: 'Claire' };
const rendre = (element, etats = []) => { etatsInitiaux = [...etats]; return texte(renderToStaticMarkup(element)); };
const deuxCas = (rendu, attenduSarl = HT_OU_TTC) => {
  const micro = rendu(MICRO);
  const sarl = rendu(SARL);
  expect(micro).not.toMatch(HT_OU_TTC);
  expect(sarl).toMatch(attenduSarl);
  return { micro, sarl };
};

describe('ramonage', () => {
  it('réglages : « Prix proposé » et « (€) » sans « HT » ni « hors taxes » en franchise', () => {
    const { micro } = deuxCas((e) => rendre(<RamonageTab entreprise={e} setEntreprise={() => {}} />), /\(€ HT\)/);
    expect(micro).toMatch(/Prix proposé pour un nouvel appareil/);
    expect(micro).not.toMatch(/hors taxes/);
    expect(rendre(<RamonageTab entreprise={SARL} setEntreprise={() => {}} />)).toMatch(/Prix hors taxes proposé/);
  });

  it('saisie : « Prix (€) » en franchise, « Prix (€ HT) » sinon', () => {
    const { micro } = deuxCas((e) => rendre(<SaisieRamonage client={client} entreprise={e} onEnregistrer={() => {}} onFermer={() => {}} />), /Prix \(€ HT\)/);
    expect(micro).toMatch(/Prix \(€\)/);
  });

  it('onglet du client : le prix du passage sans « HT » en franchise', () => {
    const { micro } = deuxCas((e) => rendre(<OngletRamonage client={client} entreprise={e} showToast={() => {}} />), /85 € HT/);
    expect(micro).toMatch(/85 € RAM-2026-001/);
  });
});

describe('bibliothèque d’ouvrages (vue en liste)', () => {
  it('colonne « Prix » en franchise, « Prix HT » sinon', () => {
    const ouvrages = [{ id: 'o1', code: 'EL-01', nom: 'Prise', unite: 'u', prixUnitaireHT: 42 }];
    const { micro } = deuxCas((e) => rendre(<OuvragesList ouvrages={ouvrages} viewMode="list" franchiseTva={estFranchiseTva(e)} />), /Prix HT/);
    expect(micro).toMatch(/Prix/);
  });
});

describe('historique des versions', () => {
  const v1 = { version: 1, created_at: '2026-10-01T10:00:00Z', data: { objet: 'A', lignes: [{ description: 'Prise', quantite: 2, prixUnitaire: 50 }] } };
  const v2 = { version: 2, created_at: '2026-10-02T10:00:00Z', data: { objet: 'B', lignes: [{ description: 'Prise', quantite: 3, prixUnitaire: 50 }] } };
  const devisMicro = { type: 'devis', statut: 'brouillon', tva: 0 };

  it('comparaison : totaux sans « HT » en franchise', () => {
    deuxCas((e) => rendre(<DiffViewer snapshotA={v1} snapshotB={v2} franchise={franchiseAppliquee(devisMicro, e)} onClose={() => {}} />));
  });

  it('version : « Total » en franchise, « Total HT » sinon', () => {
    const { micro } = deuxCas((e) => rendre(<SnapshotViewer snapshot={v1} franchise={franchiseAppliquee(devisMicro, e)} onClose={() => {}} />), /Total HT/);
    expect(micro).toMatch(/Total 100 €/);
  });

  it('un devis signé avec TVA par une micro-entreprise garde « HT » (il se relit tel qu’émis)', () => {
    const signeAvecTva = { type: 'devis', statut: 'signe', tva: 20 };
    expect(rendre(<SnapshotViewer snapshot={v1} franchise={franchiseAppliquee(signeAvecTva, MICRO)} onClose={() => {}} />)).toMatch(/Total HT/);
  });
});

describe('variables des relances', () => {
  const descriptions = (e) => variablesDisponibles(estFranchiseTva(e)).map((v) => v.description).join(' | ');
  it('descriptions sans « TTC » en franchise, inchangées sinon', () => {
    const { micro } = deuxCas(descriptions, /Total TTC de la facture/);
    expect(micro).toMatch(/Total de la facture/);
    expect(variablesDisponibles(true).map((v) => v.key)).toEqual(variablesDisponibles(false).map((v) => v.key));
  });
});

describe('exports CSV', () => {
  const docs = [{ numero: 'FAC-1', type: 'facture', client_nom: 'Rousseau', total_ht: 100, tva: 0, total_ttc: 100, statut: 'envoye' }];
  it('devis et factures : une colonne « Montant » en franchise', () => {
    const [enTeteMicro, ligneMicro] = tableauExportDocuments(docs, { franchise: estFranchiseTva(MICRO) });
    const [enTeteSarl, ligneSarl] = tableauExportDocuments(docs, { franchise: estFranchiseTva(SARL) });
    expect(enTeteMicro.join(';')).not.toMatch(HT_OU_TTC);
    expect(enTeteMicro).toContain('Montant');
    expect(enTeteMicro).not.toContain('TVA');
    expect(enTeteMicro).toHaveLength(ligneMicro.length);
    expect(ligneMicro[enTeteMicro.indexOf('Montant')]).toBe('100.00');
    expect(enTeteSarl).toEqual(expect.arrayContaining(['Montant HT', 'TVA', 'Montant TTC']));
    expect(enTeteSarl).toHaveLength(ligneSarl.length);
  });

  it('catalogue : « Prix unitaire » et « Prix d’achat », sans colonne de TVA, en franchise', () => {
    const cat = [{ reference: 'R1', nom: 'Prise', categorie: 'Élec', unite: 'u', prix: 30, prixAchat: 10, tva_rate: 20 }];
    const [enTeteMicro, ligneMicro] = tableauExportCatalogue(cat, { franchise: estFranchiseTva(MICRO) });
    const [enTeteSarl] = tableauExportCatalogue(cat, { franchise: estFranchiseTva(SARL) });
    expect(enTeteMicro.join(';')).not.toMatch(HT_OU_TTC);
    expect(enTeteMicro).not.toContain('TVA %');
    expect(ligneMicro[enTeteMicro.indexOf('Prix unitaire')]).toBe(30);
    expect(enTeteMicro).toHaveLength(ligneMicro.length);
    expect(enTeteSarl).toEqual(expect.arrayContaining(['TVA %', 'Prix vente HT', 'Prix achat HT']));
  });

  it('import : prix sans « HT » et pas de taux de TVA à associer en franchise', () => {
    const micro = champsImport(estFranchiseTva(MICRO));
    const sarl = champsImport(estFranchiseTva(SARL));
    expect(micro.map((c) => c.label).join(' ')).not.toMatch(HT_OU_TTC);
    expect(micro.some((c) => c.key === 'tva_rate')).toBe(false);
    expect(sarl.map((c) => c.label)).toEqual(expect.arrayContaining(['Prix vente HT', 'Prix achat HT', 'Taux TVA']));
  });
});

describe('lettre de mise en demeure', () => {
  const doc = { numero: 'FAC-2026-00042', type: 'facture', statut: 'envoye', total_ttc: 1000, tva: 0, date: '2026-08-01', date_echeance: '2026-08-31' };
  const lettre = (e, d = doc) => texte(buildMiseEnDemeureHtml({ doc: d, client: { nom: 'Dupont' }, entreprise: e }));
  it('montants sans « TTC » en franchise, avec « TTC » sinon', () => {
    const { micro } = deuxCas((e) => lettre(e), /Montant : 1\s000,00 € TTC/);
    expect(micro).toMatch(/Montant initial de la facture 1\s000,00 €/);
    expect(micro).toMatch(/d'un montant de 1\s000,00 €\s?, émise/);
  });
  it('une facture émise avec TVA par une micro-entreprise garde « TTC » (elle se réclame telle qu’émise)', () => {
    expect(lettre(MICRO, { ...doc, total_ttc: 1200, tva: 200 })).toMatch(/1\s200,00 € TTC/);
  });
});

describe('page de paiement en ligne', () => {
  const data = (formeJuridique, facture = {}) => ({
    facture: { numero: 'FAC-1', total_ht: 300, total_tva: 0, total_ttc: 300, reste_du: 300, recu: 0, statut: 'envoye', payable: true, ...facture },
    entreprise: { nom: 'Élec Seguin', forme_juridique: formeJuridique },
    stripe_enabled: false,
  });
  // 1er useState = chargement, 2e = erreur, 3e = données
  const page = (d) => rendre(<PublicPaymentPage payToken="jeton-test" />, [false, null, d]);
  const payee = (d) => page({ ...d, facture: { ...d.facture, statut: 'payee' } });
  it('« Total » et « Montant » en franchise, « Total TTC » et « Montant TTC » sinon', () => {
    const micro = page(data('Micro-entreprise'));
    expect(micro).toMatch(/Total 300,00 €/);
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(page(data('SARL'))).toMatch(/Total TTC/);
    expect(payee(data('Micro-entreprise'))).not.toMatch(HT_OU_TTC);
    expect(payee(data('SARL'))).toMatch(/Montant TTC/);
  });
  it('une facture émise avec TVA par une micro-entreprise garde « TTC » ; sans forme juridique (avant 107), « TTC »', () => {
    expect(page(data('Micro-entreprise', { total_tva: 50, total_ttc: 350, reste_du: 350 }))).toMatch(/Total TTC/);
    expect(page(data(undefined))).toMatch(/Total TTC/);
  });
});

describe('document imprimé du portail client', () => {
  it('reprend le libellé des générateurs (D-31) : « (hors taxes et toutes taxes comprises) » en franchise', () => {
    const facture = { type: 'facture', statut: 'envoye', tva: 0 };
    expect(libelleTotalImprime(facture, franchiseAppliquee(facture, MICRO))).toBe('Net à payer (hors taxes et toutes taxes comprises)');
    expect(libelleTotalImprime({ type: 'devis' }, true)).toBe('Total (hors taxes et toutes taxes comprises)');
    expect(libelleTotalImprime({ type: 'facture', facture_type: 'avoir' }, true)).toBe('Total de l’avoir');
    expect(libelleTotalImprime(facture, franchiseAppliquee(facture, SARL))).toBe('Total TTC');
    // Même libellé que le bloc des totaux des générateurs
    expect(lignesTotauxHtml({ ...facture, lignes: [{ quantite: 1, prixUnitaire: 100 }] }, { isMicro: true })).toContain('Net à payer (hors taxes et toutes taxes comprises)');
  });
});
