import { describe, it, expect } from 'vitest';
import { estDonneesFictives, marquerDocumentFictif, LIBELLE_DONNEES_FICTIVES } from '../donneesFictives';
import { buildDevisHtml, buildSituationFactureHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';
import { buildMiseEnDemeureHtml } from '../miseEnDemeureBuilder';
import { fromSupabase, toSupabase } from '../../services/entrepriseService';

// Compte de démonstration (D-26, Q-identite-demo du 11 oct. 2026) : bandeau à l'écran, filigrane « EXEMPLE »
// sur chaque document. Une fiche ordinaire n'en a jamais.

const ordinaire = { nom: 'Élec Seguin', formeJuridique: 'Micro-entreprise', siret: '12345678900011', adresse: '1 rue A, 33000 Bordeaux' };
const demo = { ...ordinaire, nom: 'Élec Exemple', donneesFictives: true };
const client = { nom: 'Rousseau', prenom: 'Claire' };
const doc = {
  type: 'devis', numero: 'DEV-2026-00001', date: '2026-10-07', statut: 'brouillon',
  lignes: [{ description: 'Remplacement tableau électrique', quantite: 1, unite: 'u', prixUnitaire: 1200, tva: 0 }],
  total_ht: 1200, tva: 0, total_ttc: 1200,
};
const facture = { ...doc, type: 'facture', numero: 'FAC-2026-00001', date_echeance: '2026-10-30' };

describe('données fictives : le marqueur', () => {
  it('vrai seulement si la fiche le porte (réglage de l’app ou réponse d’une page publique)', () => {
    expect(estDonneesFictives(demo)).toBe(true);
    expect(estDonneesFictives({ donneesFictives: 'true' })).toBe(true);
    expect(estDonneesFictives({ donnees_fictives: true })).toBe(true);
    expect(estDonneesFictives(ordinaire)).toBe(false);
    expect(estDonneesFictives({ donnees_fictives: false })).toBe(false);
    expect(estDonneesFictives(null)).toBe(false);
  });

  it('lu et réécrit avec les réglages de la fiche (settings_json.reglages) : un enregistrement des Paramètres le garde', () => {
    const fiche = fromSupabase({ id: 'e1', nom: 'Élec Exemple', settings_json: { reglages: { donneesFictives: true, nomEntrepreneur: 'Julien Exemple' } } });
    expect(fiche.donneesFictives).toBe(true);
    expect(toSupabase(fiche).__reglages.donneesFictives).toBe(true);
    expect(fromSupabase({ id: 'e2', nom: 'X', settings_json: {} }).donneesFictives).toBe(false);
  });
});

describe('données fictives : le filigrane sur chaque document', () => {
  const marque = (html) => html.includes('class="filigrane-demo"') && html.includes('EXEMPLE') && html.includes(LIBELLE_DONNEES_FICTIVES);

  it('devis et facture (générateur de la page de signature et de l’envoi)', () => {
    expect(marque(buildDevisHtml({ doc, client, entreprise: demo, couleur: '#f97316' }))).toBe(true);
    expect(marque(buildDevisHtml({ doc: facture, client, entreprise: demo, couleur: '#f97316' }))).toBe(true);
    expect(marque(buildDevisHtml({ doc, client, entreprise: ordinaire, couleur: '#f97316' }))).toBe(false);
  });

  it('page de signature : le marqueur arrive de la base sous la forme de la page publique', () => {
    expect(marque(buildDevisHtml({ doc, client, entreprise: { nom: 'Élec Exemple', donneesFictives: true }, couleur: '#f97316' }))).toBe(true);
  });

  it('situation de travaux, document des actions rapides et mise en demeure', () => {
    const situation = { numero: 1, date: '2026-10-07', avancement: 50, montant_ht: 600, montant_ttc: 600, lignes: [] };
    expect(marque(buildSituationFactureHtml({ situation, parentDevis: doc, client, entreprise: demo, couleur: '#f97316' }))).toBe(true);
    expect(marque(buildDocumentHTML(facture, client, null, demo))).toBe(true);
    expect(marque(buildMiseEnDemeureHtml({ doc: facture, client, entreprise: demo }))).toBe(true);
    expect(marque(buildMiseEnDemeureHtml({ doc: facture, client, entreprise: ordinaire }))).toBe(false);
  });

  it('un « EXEMPLE » par hauteur de page A4, en fond répété (n’allonge pas le document), au-dessus du contenu, sans gêner les clics', () => {
    const html = marquerDocumentFictif(demo, '<!DOCTYPE html><html><head><style></style></head><body><p>Devis</p></body></html>');
    expect(html).toMatch(/\.filigrane-demo \{[^}]*pointer-events: none/);
    expect(html).toMatch(/\.filigrane-demo \{[^}]*background-repeat: repeat-y[^}]*background-size: 100% 1123px[^}]*print-color-adjust: exact/);
    expect(decodeURIComponent(html.match(/data:image\/svg\+xml,([^"]+)"/)[1])).toContain('>EXEMPLE</text>');
    expect(html.indexOf('filigrane-demo"')).toBeLessThan(html.indexOf('<p>Devis</p>'));
    expect(marquerDocumentFictif(ordinaire, '<html><body>x</body></html>')).toBe('<html><body>x</body></html>');
  });
});
