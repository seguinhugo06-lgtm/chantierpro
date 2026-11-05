import { describe, it, expect } from 'vitest';
import { getModele } from '../data/modeles';
import { ALL_ARTICLES_BTP } from '../data';

/**
 * Entretien d'une pompe à chaleur : « au moins tous les deux ans » (C. env. R. 224-44-3), jamais « annuel », qui laisserait
 * croire à une obligation annuelle (avis juriste-btp du 4 nov. 2026, écart 5 ; relecture du 4 nov., point 10). La v3 a
 * corrigé le modèle de devis ; le libellé du catalogue de référence, resté « Entretien annuel PAC », est aligné ici.
 */
const articles = () => Object.values(ALL_ARTICLES_BTP).flatMap((c) => Object.values(c.sousCategories || {}).flatMap((s) => s.articles || []));

describe('entretien d’une pompe à chaleur : « au moins tous les deux ans », jamais « annuel »', () => {
  it('le modèle de devis et l’article du catalogue de référence portent le même libellé', () => {
    expect(getModele('chauffage', 'entretien-pac').nom).toBe('Entretien PAC (au moins tous les deux ans)');
    const article = articles().find((a) => a.id === 'entretien-pac');
    expect(article.nom).toBe('Entretien PAC (au moins tous les deux ans)');
  });
  it('contre-essai : aucun article ni modèle ne dit « annuel » d’une PAC ; « Entretien annuel chaudière gaz » reste juste (le code dit « entretien annuel »)', () => {
    expect(articles().filter((a) => /annuel/i.test(a.nom) && /PAC|pompe à chaleur/i.test(a.nom))).toEqual([]);
    expect(getModele('chauffage', 'entretien-chaudiere').nom).toBe('Entretien annuel chaudière gaz');
    expect(articles().find((a) => a.id === 'entretien-chaud').nom).toBe('Entretien annuel chaudière gaz');
  });
  it('l’attestation d’entretien est due à chaque entretien : jamais une option facultative dans les modèles', () => {
    for (const id of ['entretien-chaudiere', 'entretien-pac']) {
      const lignes = getModele('chauffage', id).lignes;
      const attestation = lignes.filter((l) => /attestation/i.test(l.description));
      expect(attestation).toHaveLength(1);
      expect(attestation[0].description).toBe('Établissement et remise de l’attestation d’entretien (due à chaque entretien)');
      expect(attestation[0].description).not.toMatch(/option/i);
    }
  });
});
