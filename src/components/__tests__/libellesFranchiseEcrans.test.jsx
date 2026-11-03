import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { buildDevisHtml, buildSituationFactureHtml } from '../../lib/devisHtmlBuilder';
import { lignesTotauxHtml, libellesColonnesPrix } from '../../lib/totauxDocument';

/**
 * « Franchise partout » (décision du 24 oct. 2026, docs/avis-juriste-2026-10-24-devis.md Q1) : pour une entreprise en
 * franchise en base de TVA (art. 293 B du CGI), aucun écran ni document n'écrit « HT » ou « TTC » à côté d'un montant ;
 * la mention « TVA non applicable, art. 293 B du CGI » reste. Hors franchise, rien ne change.
 * Le drapeau vient de la règle unique `estFranchiseTva` (src/lib/franchiseTva.js) : chaque cas part de l'entreprise.
 */

// Le portail de ui/Modal ne se rend pas côté serveur : la fenêtre est rendue sur place.
vi.mock('../ui/Modal', () => {
  const Passe = ({ children }) => <div>{children}</div>;
  return {
    default: ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null),
    ModalHeader: Passe, ModalTitle: Passe, ModalDescription: Passe, ModalBody: Passe, ModalFooter: Passe,
  };
});
vi.mock('../../context/AppContext', () => ({
  useToast: () => ({ showToast: () => {} }),
  useConfirm: () => ({ confirm: async () => true }),
}));
vi.mock('../../context/DataContext', () => ({
  useData: () => ({
    customTemplates: [{ id: 't1', nom: 'Tableau électrique', categorie: 'Électricité', lignes: [{ description: 'Tableau', quantite: 1, unite: 'u', prixUnitaire: 900 }] }],
    addTemplate: () => {}, updateTemplate: () => {}, deleteTemplate: () => {}, toggleTemplateFavori: () => {},
  }),
}));

const { default: TemplateSelector } = await import('../TemplateSelector');
const { default: TemplateManager } = await import('../settings/TemplateManager');
const { default: QuickChantierModal } = await import('../QuickChantierModal');
const { default: SignaturePad } = await import('../SignaturePad');
const { default: SituationsTravaux } = await import('../chantiers/SituationsTravaux');

const texte = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/[\s  ]+/g, ' ').trim();
const HT_OU_TTC = /(?<![A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ])/;

const MICRO = { nom: 'Élec Seguin', formeJuridique: 'Micro-entreprise', siret: '12345678900011', adresse: '1 rue A, 33000 Bordeaux' };
const SARL = { ...MICRO, formeJuridique: 'SARL' };
const client = { id: 'cl1', nom: 'Rousseau', prenom: 'Claire' };

const modeles = (entreprise) => texte(renderToStaticMarkup(
  <TemplateSelector isOpen onClose={() => {}} onSelectTemplate={() => {}} franchise={estFranchiseTva(entreprise)}
    customTemplates={[{ id: 't1', nom: 'Tableau électrique', categorie: 'Électricité', lignes: [{ quantite: 2, prixUnitaire: 450 }] }]} />,
));
const reglagesModeles = (entreprise) => texte(renderToStaticMarkup(<TemplateManager franchiseTva={estFranchiseTva(entreprise)} />));
const nouveauChantier = (entreprise) => texte(renderToStaticMarkup(
  <QuickChantierModal isOpen onClose={() => {}} onSubmit={() => {}} clients={[client]} voitPrix franchiseTva={estFranchiseTva(entreprise)} />,
));
const devisSigne = { id: 'd1', type: 'devis', numero: 'DEV-2026-00001', statut: 'envoye', client_id: 'cl1', total_ht: 1200, tva: 0, total_ttc: 1200, lignes: [] };
const signature = (entreprise) => texte(renderToStaticMarkup(
  <SignaturePad isOpen onClose={() => {}} onSave={() => {}} document={devisSigne} client={client} entreprise={entreprise} />,
));
const chantier = {
  id: 'ch1', nom: 'Rénovation',
  situations_data: {
    mode: 'situation', devis_source_id: 'd1', retenue_garantie_pct: 0,
    situations: [{ id: 's1', numero: 1, statut: 'brouillon', date: '2026-10-20', lignes: [], totaux: { montantSituationHT: 600, totalTVA: 0, netAPayer: 600 } }],
  },
};
const devisSource = { id: 'd1', type: 'devis', numero: 'DEV-2026-00001', statut: 'accepte', client_id: 'cl1', tvaRate: 0,
  lignes: [{ id: 'l1', description: 'Tableau', quantite: 1, unite: 'u', prixUnitaire: 1200, tva: 0 }], total_ht: 1200, tva: 0, total_ttc: 1200 };
const situations = (entreprise) => texte(renderToStaticMarkup(
  <SituationsTravaux chantier={chantier} devis={[devisSource]} clients={[client]} entreprise={entreprise} updateChantier={() => {}} addDevis={() => {}} generateNextNumero={() => 'FAC'} />,
));

describe('écrans : ni « HT » ni « TTC » en franchise, inchangés hors franchise', () => {
  it('choix d’un modèle (devis express)', () => {
    expect(modeles(MICRO)).toContain('~900 €');
    expect(modeles(MICRO)).not.toMatch(HT_OU_TTC);
    expect(modeles(SARL)).toContain('~900 € HT');
  });

  it('réglages › modèles de devis', () => {
    expect(reglagesModeles(MICRO)).toContain('1 ligne 900 €');
    expect(reglagesModeles(MICRO)).not.toMatch(HT_OU_TTC);
    expect(reglagesModeles(SARL)).toContain('900 € HT');
  });

  it('nouveau chantier : budget', () => {
    expect(nouveauChantier(MICRO)).toContain('Budget du chantier (€)');
    expect(nouveauChantier(MICRO)).not.toMatch(HT_OU_TTC);
    expect(nouveauChantier(SARL)).toContain('Budget du chantier (€ HT)');
  });

  it('signature sur place : « Montant », pas « Montant TTC »', () => {
    expect(signature(MICRO)).toContain('Montant');
    expect(signature(MICRO)).not.toMatch(HT_OU_TTC);
    expect(signature(SARL)).toContain('Montant TTC');
  });

  it('situations de travaux : marché et situations', () => {
    const franchise = situations(MICRO);
    expect(franchise).toContain('Marché 1 200 €');
    expect(franchise).toContain('20/10/2026 600 € Modifier');
    expect(franchise).not.toMatch(HT_OU_TTC);
    const assujetti = situations(SARL);
    expect(assujetti).toContain('Marché HT');
    expect(assujetti).toContain('600 € HT');
  });
});

// Les deux générateurs (devisHtmlBuilder et DevisPage) partagent ces blocs ; le parcours « documents » couvre l'aperçu réel.
const doc = { type: 'facture', facture_type: 'totale', numero: 'FAC-2026-00001', date: '2026-10-07', statut: 'brouillon',
  lignes: [{ description: 'Remplacement tableau électrique', quantite: 1, unite: 'u', prixUnitaire: 1200, tva: 0 }],
  total_ht: 1200, tva: 0, total_ttc: 1200 };

describe('documents imprimés en franchise', () => {
  it('blocs communs : colonnes « Prix unitaire / Total », totaux sans « Total HT »', () => {
    expect(libellesColonnesPrix(true)).toEqual({ pu: 'Prix unitaire', total: 'Total' });
    expect(libellesColonnesPrix(false)).toEqual({ pu: 'PU HT', total: 'Total HT' });
    expect(texte(lignesTotauxHtml(doc, { isMicro: true }))).toBe('Net à payer 1 200,00 €');
    expect(texte(lignesTotauxHtml({ ...doc, remise: 10 }, { isMicro: true }))).not.toMatch(HT_OU_TTC);
    expect(texte(lignesTotauxHtml({ ...doc, remise: 10 }, { isMicro: true }))).toContain('Total avant remise');
    expect(texte(lignesTotauxHtml(doc, { isMicro: false }))).toContain('Total HT');
  });

  it('facture (devisHtmlBuilder) : ni HT ni TTC, la mention 293 B reste', () => {
    const micro = texte(buildDevisHtml({ doc, client, entreprise: MICRO, couleur: '#12336F' }));
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(micro).toContain('TVA non applicable, article 293 B du Code Général des Impôts');
    const sarl = texte(buildDevisHtml({ doc: { ...doc, lignes: [{ ...doc.lignes[0], tva: 20 }], tva: 240, total_ttc: 1440 }, client, entreprise: SARL, couleur: '#12336F' }));
    expect(sarl).toContain('PU HT');
    expect(sarl).toContain('Total TTC');
  });

  it('facture de situation : ni HT, ni TTC, ni TVA facturée en franchise ; mention 293 B', () => {
    const situation = { numero: 1, statut: 'brouillon', retenueGarantiePct: 0,
      lignes: [{ description: 'Tableau', quantite: 1, unite: 'u', prixUnitaire: 1000, tva: 10, cumulActuel: 50, cumulPrecedent: 0 }] };
    const micro = texte(buildSituationFactureHtml({ situation, parentDevis: devisSource, client, chantier, entreprise: MICRO }));
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(micro).not.toMatch(/TVA 10/);
    expect(micro).toContain('NET À PAYER 500,00 €');
    expect(micro).toContain('TVA non applicable, article 293 B du Code Général des Impôts');
    const sarl = texte(buildSituationFactureHtml({ situation, parentDevis: devisSource, client, chantier, entreprise: SARL }));
    expect(sarl).toContain('Montant situation TTC');
    expect(sarl).toContain('NET À PAYER 550,00 €');
  });
});

describe('éditeur : message d’une ligne sans désignation', () => {
  it('sans « HT » en franchise, avec « HT » sinon (relecture juriste-btp du 3 nov. 2026)', async () => {
    const { messageLigneSansDesignation } = await import('../../lib/totauxDocument');
    const lignes = [{ description: '', quantite: 1, prixUnitaire: 80 }];
    expect(messageLigneSansDesignation(lignes, { franchise: estFranchiseTva(MICRO) })).not.toMatch(HT_OU_TTC);
    expect(messageLigneSansDesignation(lignes, { franchise: estFranchiseTva(SARL) })).toMatch(/80,00\s€ HT n'a pas/);
  });
});
