import { describe, it, expect } from 'vitest';
import { brouillonDictee } from '../brouillonDictee';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { tauxTvaParDefaut } from '../franchiseTva';

// Contrôle local du 4 nov. 2026 (écart « Juriste 9 ») : en franchise en base (art. 293 B du CGI), une ligne de la dictée
// reprise du catalogue gardait son taux (20 %) ; le brouillon portait de la TVA, réimprimée une fois la pièce émise.
const micro = { nom: 'Élec Exemple', formeJuridique: 'Micro-entreprise', siret: '12345678900011', adresse: '1 rue A, 33000 Bordeaux' };
const sarl = { ...micro, formeJuridique: 'SARL', tvaDefaut: 10 };
const client = { nom: 'Durand', prenom: 'Claire' };
// Une ligne libre (dictée) et une ligne d'un article du catalogue à 20 % (enrichirLignes recopie son taux).
const LIGNES = [
  { description: 'Pose de prises', quantite: 4, unite: 'u', prixUnitaire: 45 },
  { description: 'Tableau électrique (catalogue)', quantite: 1, unite: 'u', prixUnitaire: 800, tva: 20, _source: 'Tableau 13 modules' },
];

describe('brouillon d’une dictée : TVA', () => {
  it('micro-entreprise : chaque ligne à 0 %, TVA 0, total = HT (même la ligne du catalogue à 20 %)', () => {
    const b = brouillonDictee(LIGNES, { tvaDoc: tauxTvaParDefaut(micro), franchise: true });
    expect(b.lignes.map((l) => l.tva)).toEqual([0, 0]);
    expect([b.tvaRate, b.tva, b.total_ht, b.total_ttc]).toEqual([0, 0, 980, 980]);
  });

  it('entreprise à la TVA : la ligne du catalogue garde 20 %, la ligne libre prend le taux du document', () => {
    const b = brouillonDictee(LIGNES, { tvaDoc: tauxTvaParDefaut(sarl), franchise: false });
    expect(b.lignes.map((l) => l.tva)).toEqual([10, 20]);
    expect([b.tvaRate, b.total_ht, b.tva, b.total_ttc]).toEqual([10, 980, 178, 1158]);
  });

  it('les deux PDF du générateur commun : la mention 293 B, ni « HT » ni « TTC », même une fois le devis signé', () => {
    const b = brouillonDictee(LIGNES, { tvaDoc: 0, franchise: true });
    for (const statut of ['brouillon', 'accepte']) {
      const doc = { type: 'devis', numero: 'DEV-2026-00042', date: '2026-11-04', statut, ...b };
      const html = buildDevisHtml({ doc, client, entreprise: micro, couleur: '#12336F' });
      expect(html, statut).toContain('TVA non applicable, article 293 B du CGI');
      expect(html, statut).not.toMatch(/\bTTC\b/);
      expect(html, statut).not.toMatch(/\bHT\b/);
    }
  });

  it('contre-essai : un brouillon porté à 20 % (l’ancien calcul), une fois signé, se réimprime avec la TVA', () => {
    const ancien = brouillonDictee(LIGNES, { tvaDoc: 0, franchise: false });
    expect(ancien.tva).toBeGreaterThan(0);
    const html = buildDevisHtml({ doc: { type: 'devis', numero: 'DEV-2026-00043', date: '2026-11-04', statut: 'accepte', ...ancien }, client, entreprise: micro, couleur: '#12336F' });
    expect(html).not.toContain('TVA non applicable, article 293 B du CGI');
  });
});
