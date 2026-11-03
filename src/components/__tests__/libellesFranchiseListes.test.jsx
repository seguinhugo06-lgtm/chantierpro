import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { descriptionModele, getModelesByMetier, MODELES_DEVIS } from '../../lib/data/modeles-devis';

/**
 * Suite de libellesFranchiseEcrans.test.jsx : les écrans qu'on n'atteint qu'après un clic (liste des modèles d'un
 * métier, étape 2 du devis express, étape 2 d'un avoir). Sans navigateur de test, l'état de départ est imposé :
 * `etatsInitiaux` remplace la valeur initiale des premiers useState du rendu suivant, dans l'ordre.
 * Relecture du 3 nov. 2026 : en franchise (art. 293 B du CGI), les 308 descriptions de modèles gardaient « € HT ».
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

const { default: TemplateSelector } = await import('../TemplateSelector');
const { default: DevisExpressModal } = await import('../DevisExpressModal');
const { default: AvoirCreationModal } = await import('../modals/AvoirCreationModal');

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
});
