import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { descriptionModele, getModelesByMetier, MODELES_DEVIS } from '../../lib/data/modeles-devis';

/**
 * Suite de libellesFranchiseEcrans.test.jsx : les écrans qu'on n'atteint qu'après un clic (liste des modèles d'un
 * métier, étape 2 du devis express, étape 2 d'un avoir, « Ajouter au devis » de la bibliothèque d'ouvrages, choix du
 * devis de référence des situations). Sans navigateur de test, l'état de départ est imposé :
 * `etatsInitiaux` remplace la valeur initiale des premiers useState du rendu suivant, dans l'ordre.
 * Relecture du 3 nov. 2026 : en franchise (art. 293 B du CGI), les 308 descriptions de modèles gardaient « € HT ».
 * Contrôle du 3 nov. 2026 : l'alerte de retenue au-dessus de 5 % et le « Sous-total » de la bibliothèque n'avaient pas de test.
 */
let etatsInitiaux = [];
vi.mock('react', async (original) => {
  const React = await original();
  const useState = (init) => React.useState(etatsInitiaux.length ? etatsInitiaux.shift() : init);
  return { ...React, default: { ...React, useState }, useState };
});
vi.mock('../ui/Modal', () => {
  const Passe = ({ children }) => <div>{children}</div>;
  return {
    default: ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null),
    ModalHeader: Passe, ModalTitle: Passe, ModalDescription: Passe, ModalBody: Passe, ModalFooter: Passe,
  };
});
vi.mock('../DevisPage', () => ({ AVOIR_MOTIFS: [{ id: 'erreur', label: 'Erreur de facturation' }] }));
vi.mock('../../context/AppContext', () => ({
  useToast: () => ({ showToast: () => {} }),
  useConfirm: () => ({ confirm: async () => true }),
}));
// Bibliothèque d'ouvrages : son crochet de données (qui a ses propres useState) et ses volets sont remplacés, pour que les
// premiers useState du rendu soient ceux de Bibliotheque.jsx
vi.mock('../../hooks/useBibliotheque', () => ({
  default: () => ({
    selectedNodeId: null, setSelectedNodeId: () => {}, expandedNodes: new Set(), toggleNode: () => {}, breadcrumb: [],
    ouvrages: [], totalOuvrages: 0, searchQuery: '', setSearchQuery: () => {}, isSearching: false,
    currentPage: 1, setCurrentPage: () => {}, totalPages: 1, selectedDept: null, setSelectedDept: () => {},
    coefficientGeo: 1, resetCoefficient: () => {}, viewMode: 'grid', setViewMode: () => {},
    sortBy: 'nom', setSortBy: () => {}, sortDir: 'asc', setSortDir: () => {},
    filters: { priceRange: [null, null], difficulty: null, unite: null }, setFilters: () => {}, resetFilters: () => {}, stats: null,
  }),
}));
vi.mock('../bibliotheque/ArbreNomenclature', () => ({ default: () => null }));
vi.mock('../bibliotheque/OuvragesList', () => ({ default: () => null }));
vi.mock('../bibliotheque/OuvrageDetail', () => ({ default: () => null }));
vi.mock('../bibliotheque/SearchBar', () => ({ default: () => null }));
vi.mock('../bibliotheque/FiltresPanel', () => ({ default: () => null }));

const { default: TemplateSelector } = await import('../TemplateSelector');
const { default: DevisExpressModal } = await import('../DevisExpressModal');
const { default: AvoirCreationModal } = await import('../modals/AvoirCreationModal');
const { default: SituationsTravaux } = await import('../chantiers/SituationsTravaux');
const { default: Bibliotheque } = await import('../bibliotheque/Bibliotheque');

afterEach(() => { etatsInitiaux = []; });

const texte = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/[\s  ]+/g, ' ').trim();
const HT_OU_TTC = /(?<![A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ])/;

const MICRO = { nom: 'Élec Seguin', formeJuridique: 'Micro-entreprise', siret: '12345678900011' };
const SARL = { ...MICRO, formeJuridique: 'SARL' };

const rendre = (etats, element) => { etatsInitiaux = [...etats]; return texte(renderToStaticMarkup(element)); };

// TemplateSelector : 1er useState = métier choisi
const listeMetier = (entreprise) => rendre(['electricite'],
  <TemplateSelector isOpen onClose={() => {}} onSelectTemplate={() => {}} franchise={estFranchiseTva(entreprise)} />);
// DevisExpressModal : 1er useState = étape, 2e = métier choisi ({ id, nom })
const expressEtape2 = (entreprise) => rendre([2, { id: 'electricite', nom: 'Électricité' }],
  <DevisExpressModal isOpen onClose={() => {}} onCreateDevis={() => {}} franchise={estFranchiseTva(entreprise)} />);

const premier = getModelesByMetier('electricite')[0];

describe('descriptionModele', () => {
  it('retire « HT » en franchise, garde la description sinon', () => {
    expect(premier.description).toMatch(/€ HT \|/);
    expect(descriptionModele(premier, true)).toBe(premier.description.replace(' € HT |', ' € |'));
    expect(descriptionModele(premier, false)).toBe(premier.description);
  });

  it('les 308 modèles : plus aucun « HT » en franchise ; « €/m² » garde son unité', () => {
    const tous = Object.values(MODELES_DEVIS).flatMap((m) => m.modeles);
    expect(tous.length).toBeGreaterThanOrEqual(300);
    for (const m of tous) expect(descriptionModele(m, true)).not.toMatch(HT_OU_TTC);
    const auM2 = tous.filter((m) => m.description.includes('€/m² HT'));
    expect(auM2.length).toBeGreaterThan(0);
    for (const m of auM2) expect(descriptionModele(m, true)).toContain('€/m² |');
  });
});

describe('écrans atteints après un clic', () => {
  it('choix d’un modèle : liste d’un métier', () => {
    const micro = listeMetier(MICRO);
    expect(micro).toContain(premier.nom);
    expect(micro).toContain(descriptionModele(premier, true));
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(listeMetier(SARL)).toContain(premier.description);
  });

  it('devis express, étape « Sélectionnez un modèle de devis »', () => {
    const micro = expressEtape2(MICRO);
    expect(micro).toContain(premier.nom);
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(expressEtape2(SARL)).toContain(premier.description);
  });

  it('avoir total d’une facture : « Total de l’avoir », ni HT ni TTC en franchise', () => {
    const facture = { id: 'f1', type: 'facture', numero: 'FAC-2026-00001', statut: 'envoye', client_id: 'cl1',
      lignes: [{ description: 'Tableau', quantite: 1, unite: 'u', prixUnitaire: 1200, tva: 0 }],
      total_ht: 1200, tva: 0, total_ttc: 1200 };
    // AvoirCreationModal : 1er useState = étape, 2e = type d'avoir, 3e = motif
    const avoir = (franchise) => rendre([2, 'total', 'erreur'],
      <AvoirCreationModal isOpen onClose={() => {}} facture={facture} onCreateAvoir={() => {}} franchise={franchise} />);
    const micro = avoir(true);
    expect(micro).toContain('Total de l’avoir');
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(avoir(false)).toContain('Total TTC');
  });

  it('bibliothèque d’ouvrages, « Ajouter au devis » : « Sous-total » sans « HT » en franchise (relecture du 3 nov. 2026)', () => {
    // Le drapeau suit Catalogue → Bibliotheque → FenetreAjoutDevis ; sans lui, la fenêtre écrivait « Sous-total HT »
    const ouvrage = { id: 'o1', code: 'ELE-001', nom: 'Pose d’un interrupteur', unite: 'u', prixUnitaireHT: 45 };
    const brouillon = { id: 'd1', type: 'devis', numero: 'DEV-2026-00001', statut: 'brouillon', client_id: 'cl1', lignes: [] };
    // Bibliotheque : 4e useState = ouvrage à ajouter au devis, 5e = quantité, 6e = devis choisi
    const fenetre = (entreprise) => {
      etatsInitiaux = [false, false, null, ouvrage, 2, 'd1'];
      const html = renderToStaticMarkup(<Bibliotheque devis={[brouillon]} updateDevis={() => {}} clients={[{ id: 'cl1', nom: 'Rousseau' }]}
        franchiseTva={estFranchiseTva(entreprise)} />);
      return texte(html.slice(html.indexOf('<div role="dialog">')));
    };
    const micro = fenetre(MICRO);
    expect(micro).toContain('Ajouter au devis');
    expect(micro).toContain('Sous-total 90,00 €');
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(fenetre(SARL)).toContain('Sous-total HT 90,00 €');
  });

  it('situations, choix du devis de référence : une retenue au-dessus de 5 % est signalée (loi n° 71-584, art. 1er)', () => {
    const ALERTE = 'La retenue de garantie est de 5 % au plus (loi n° 71-584 du 16 juillet 1971).';
    // SituationsTravaux : 5e useState = choix du devis de référence ouvert, 6e = retenue saisie (%)
    const choix = (retenue) => {
      etatsInitiaux = [null, false, null, false, true, retenue];
      return renderToStaticMarkup(<SituationsTravaux chantier={{ id: 'ch1', nom: 'Rénovation' }} devis={[]} clients={[]}
        entreprise={SARL} updateChantier={() => {}} />);
    };
    expect(texte(choix(6))).toContain('Sélectionner le devis de référence');
    expect(texte(choix(6))).toContain(ALERTE);
    expect(choix(6)).toMatch(/<p role="alert"[^>]*>La retenue de garantie est de 5 % au plus/);
    expect(texte(choix(5.5))).toContain(ALERTE);
    // 5 % : le maximum de la loi, rien à signaler
    expect(texte(choix(5))).toContain('Sélectionner le devis de référence');
    expect(texte(choix(5))).not.toContain('La retenue de garantie est de 5 % au plus');
    expect(choix(5)).not.toContain('role="alert"');
  });
});
