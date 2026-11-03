import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { buildDevisHtml, buildSituationFactureHtml } from '../../lib/devisHtmlBuilder';
import { lignesTotauxHtml, libellesColonnesPrix, totalLigne } from '../../lib/totauxDocument';
import { situationDeFacture } from '../../lib/situationUtils';

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
const { default: ChoixTva } = await import('../settings/ChoixTva');

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
    // Arrêté n° 83-50/A du 3 oct. 1983, art. 3 ; arrêté du 24 janv. 2017, art. 4, I (décision d'Hugo du 3 nov. 2026)
    expect(texte(lignesTotauxHtml(doc, { isMicro: true }))).toBe('Net à payer (hors taxes et toutes taxes comprises) 1 200,00 €');
    expect(texte(lignesTotauxHtml({ ...doc, type: 'devis' }, { isMicro: true }))).toBe('Total (hors taxes et toutes taxes comprises) 1 200,00 €');
    expect(texte(lignesTotauxHtml({ ...doc, facture_type: 'avoir', total_ht: -100, total_ttc: -100, lignes: [{ ...doc.lignes[0], prixUnitaire: -100 }] }, { isMicro: true }))).not.toMatch(/hors taxes/);
    expect(texte(lignesTotauxHtml({ ...doc, remise: 10 }, { isMicro: true }))).not.toMatch(HT_OU_TTC);
    expect(texte(lignesTotauxHtml({ ...doc, remise: 10 }, { isMicro: true }))).toContain('Total avant remise');
    expect(texte(lignesTotauxHtml(doc, { isMicro: false }))).toContain('Total HT');
  });

  it('facture (devisHtmlBuilder) : ni HT ni TTC, la mention 293 B reste', () => {
    const micro = texte(buildDevisHtml({ doc, client, entreprise: MICRO, couleur: '#12336F' }));
    expect(micro).not.toMatch(HT_OU_TTC);
    // CGI art. 293 E, II : la mention mot pour mot, la même en en-tête et sous les totaux (juriste-btp, 3 nov. 2026)
    expect(micro.match(/TVA non applicable, article 293 B du CGI/g)).toHaveLength(2);
    // Colonne « TVA » retirée en franchise (décision d'Hugo du 3 nov. 2026) ; la mention vaut pour toutes les lignes
    const brut = buildDevisHtml({ doc, client, entreprise: MICRO, couleur: '#12336F' });
    expect(brut).not.toMatch(/<th[^>]*>TVA<\/th>/);
    expect(micro).toContain('Prix unitaire Total Remplacement tableau électrique 1 u 1 200,00 € 1 200,00 €');
    expect(micro).not.toMatch(/Code Général des Impôts|art\. 293 B/);
    const sarl = texte(buildDevisHtml({ doc: { ...doc, lignes: [{ ...doc.lignes[0], tva: 20 }], tva: 240, total_ttc: 1440 }, client, entreprise: SARL, couleur: '#12336F' }));
    expect(sarl).toContain('PU HT');
    expect(buildDevisHtml({ doc: { ...doc, lignes: [{ ...doc.lignes[0], tva: 20 }], tva: 240, total_ttc: 1440 }, client, entreprise: SARL, couleur: '#12336F' })).toMatch(/<th[^>]*>TVA<\/th>/);
    expect(sarl).toContain('Total TTC');
  });

  it('facture de situation : ni HT, ni TTC, ni TVA facturée en franchise ; mention 293 B', () => {
    const situation = { numero: 1, statut: 'brouillon', retenueGarantiePct: 0,
      lignes: [{ description: 'Tableau', quantite: 1, unite: 'u', prixUnitaire: 1000, tva: 10, cumulActuel: 50, cumulPrecedent: 0 }] };
    const micro = texte(buildSituationFactureHtml({ situation, parentDevis: devisSource, client, chantier, entreprise: MICRO }));
    expect(micro).not.toMatch(HT_OU_TTC);
    expect(micro).not.toMatch(/TVA 10/);
    expect(micro).toContain('NET À PAYER (hors taxes et toutes taxes comprises) 500,00 €');
    expect(micro).toContain('TVA non applicable, article 293 B du CGI');
    const sarl = texte(buildSituationFactureHtml({ situation, parentDevis: devisSource, client, chantier, entreprise: SARL }));
    expect(sarl).toContain('Montant situation TTC');
    expect(sarl).toContain('NET À PAYER 550,00 €');
  });

  it('facture de situation validée mais pas facturée : sans TVA ; facturée avec TVA : telle quelle (décision du 3 nov. 2026)', () => {
    const lignes = [{ description: 'Tableau', quantite: 1, unite: 'u', prixUnitaire: 1000, tva: 10, cumulActuel: 50, cumulPrecedent: 0 }];
    const imprime = (statut) => texte(buildSituationFactureHtml({ situation: { numero: 1, statut, retenueGarantiePct: 0, lignes }, parentDevis: devisSource, client, chantier, entreprise: MICRO }));
    expect(imprime('validee')).toContain('TVA non applicable, article 293 B du CGI');
    expect(imprime('validee')).not.toMatch(/TVA 10/);
    expect(imprime('facturee')).toMatch(/TVA 10/);
    expect(imprime('payee')).toMatch(/TVA 10/);
  });

  it('facture de situation émise avec TVA, situation introuvable : réimprimée avec sa TVA (contrôle du 3 nov. 2026)', () => {
    // « PDF » d'une facture de situation (DevisPage) : la situation est relue dans le chantier, sinon refaite depuis la
    // facture (situationDeFacture). Sans statut, elle passait pour un brouillon : une facture déjà émise avec TVA par une
    // micro-entreprise se réimprimait sans TVA, alors qu'une facture émise se réimprime telle quelle (CGI art. 289, V).
    const facture = { id: 'f7', type: 'facture', facture_type: 'situation', situation_numero: 2, numero: 'FAC-2026-00007',
      statut: 'envoye', date: '2026-10-20', client_id: 'cl1',
      lignes: [{ description: 'Situation n° 2', quantite: 1, unite: 'ens', prixUnitaire: 500, montant: 500, tva: 10 }],
      total_ht: 500, tva: 50, total_ttc: 550 };
    const imprime = (doc, chantierDoc) => texte(buildSituationFactureHtml({
      situation: situationDeFacture(doc, chantierDoc, { montantLigne: totalLigne, tauxDefaut: 0 }),
      parentDevis: {}, client, chantier: chantierDoc || {}, entreprise: MICRO,
    }));
    // Chantier supprimé, puis chantier sans situations : le statut de la facture fait foi
    for (const chantierDoc of [undefined, { id: 'ch2', nom: 'Rénovation', situations_data: { situations: [] } }]) {
      const emise = imprime(facture, chantierDoc);
      expect(emise).toContain('TVA 10 % 50,00 €');
      expect(emise).toContain('Montant situation TTC 550,00 €');
      expect(emise).not.toContain('TVA non applicable');
      // Une facture encore en brouillon : sans TVA, avec la mention (décision d'Hugo du 3 nov. 2026, D-31, 2)
      const brouillon = imprime({ ...facture, statut: 'brouillon' }, chantierDoc);
      expect(brouillon).not.toMatch(/TVA 10/);
      expect(brouillon).toContain('TVA non applicable, article 293 B du CGI');
    }
    // Situation retrouvée dans le chantier : son statut à elle
    const situationsData = { retenue_garantie_pct: 0, situations: [{ id: 's2', numero: 2, statut: 'facturee',
      lignes: [{ description: 'Tableau', quantite: 1, unite: 'u', prixUnitaire: 1000, tva: 10, cumulActuel: 50, cumulPrecedent: 0 }] }] };
    expect(imprime(facture, { id: 'ch3', nom: 'Rénovation', situations_data: situationsData })).toContain('TVA 10 % 50,00 €');
  });

  it('le HTML remis au client ne contient aucun commentaire interne (contrôle du 3 nov. 2026)', () => {
    // « décision d'Hugo du 3 nov. 2026 » partait dans l'en-tête du tableau, « recette du 9 oct. 2026 » au-dessus des notes :
    // invisibles, mais lisibles dans la source de la page de signature. Le générateur de DevisPage : parcours « aperçu imprimé ».
    const notesInternes = (html) => (html.match(/<!--[\s\S]*?-->/g) || []).filter((c) => /Hugo|décision|recette|relecture|src\//i.test(c));
    for (const entreprise of [MICRO, SARL]) {
      for (const type of ['facture', 'devis']) {
        const html = buildDevisHtml({ doc: { ...doc, type, notes: 'Accès par le garage' }, client, entreprise, couleur: '#12336F' });
        expect(texte(html)).toContain('Accès par le garage');
        expect(notesInternes(html)).toEqual([]);
      }
    }
  });

  it('facture de situation : retenue de garantie selon la loi n° 71-584 (art. 1er et 2)', () => {
    const situation = { numero: 1, statut: 'brouillon', retenueGarantiePct: 5,
      lignes: [{ description: 'Tableau', quantite: 1, unite: 'u', prixUnitaire: 1000, tva: 10, cumulActuel: 50, cumulPrecedent: 0 }] };
    const imprime = texte(buildSituationFactureHtml({ situation, parentDevis: devisSource, client, chantier, entreprise: SARL }));
    expect(imprime).toContain("(loi n° 71-584 du 16 juillet 1971 : 5 % au plus). Libérée un an après la réception des travaux, avec ou sans réserves, sauf opposition motivée du maître de l'ouvrage notifiée par lettre recommandée.");
    expect(imprime).not.toMatch(/conformément|sauf réserves/);
  });
});

// La mention que porte la facture, citée à l'écran : mot pour mot comme sur les PDF (CGI art. 293 E, II ; relecture du
// 3 nov. 2026). Les libellés d'écran (« TVA non applicable, art. 293 B du CGI » sous un total) ne sont pas des citations.
const MENTION_IMPRIMEE = 'TVA non applicable, article 293 B du CGI';
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sources = (dossier) => fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
  const chemin = path.join(dossier, e.name);
  if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(chemin);
  return /\.jsx?$/.test(e.name) ? [chemin] : [];
});

describe('écrans qui citent la mention de la facture', () => {
  it('choix de la TVA (assistant et Paramètres), en franchise : la mention imprimée, mot pour mot', () => {
    const micro = texte(renderToStaticMarkup(<ChoixTva entreprise={MICRO} updateEntreprise={() => {}} />));
    expect(micro).toContain(`portent la mention « ${MENTION_IMPRIMEE} »`);
    expect(texte(buildDevisHtml({ doc, client, entreprise: MICRO, couleur: '#12336F' }))).toContain(MENTION_IMPRIMEE);
  });

  it('trésorerie, Paramètres, choix de la TVA : chaque phrase qui cite la mention la reprend telle qu’elle est imprimée', () => {
    const citations = sources(path.join(RACINE, 'src/components')).flatMap((f) =>
      [...fs.readFileSync(f, 'utf8').matchAll(/[Mm]ention[^«\n]{0,60}«\s*(TVA non applicable[^»]*?)\s*»/g)]
        .map((m) => ({ fichier: path.relative(RACINE, f), mention: m[1].replace(/\s+/g, ' ') })));
    expect(citations.map((c) => c.fichier)).toEqual(expect.arrayContaining([
      'src/components/tresorerie/TresorerieModule.jsx', 'src/components/Settings.jsx', 'src/components/settings/ChoixTva.jsx',
    ]));
    for (const c of citations) expect(c.mention, c.fichier).toBe(MENTION_IMPRIMEE);
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
