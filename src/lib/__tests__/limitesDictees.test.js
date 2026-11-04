import { describe, it, expect } from 'vitest';
import { valeurDeLimite, ditUneLimite } from '../../components/landing/comparaisonPlans';
import { DICTEES_SANS_LIMITE } from '../limitesDictees';
import { FONCTIONS } from '../fonctions';

// Tableau des tarifs, IA allumée (décision d'Hugo du 4 nov. 2026) : les dictées sont une limite appliquée par le serveur.
// « Sans limite » ne s'écrit jamais sans le plafond du jour (C. conso. L121-2, juriste-btp du 4 nov. 2026).
describe('tarifs : la ligne des dictées', () => {
  it('5 par mois, 100 par mois, puis « sans limite mensuelle » avec son plafond (jamais « Illimité »)', () => {
    expect([5, 100, -1].map((v) => valeurDeLimite('dictees', v))).toEqual(['5 par mois', '100 par mois', DICTEES_SANS_LIMITE]);
    expect(DICTEES_SANS_LIMITE).toBe('Sans limite mensuelle (100 par jour et par personne au plus)');
  });
  it('IA allumée : les libellés des offres sur la dictée sont lus comme des limites, pas comme des fonctions', () => {
    for (const nom of ['5 dictées par mois', '100 dictées par mois', 'Dictées sans limite mensuelle (100 par jour et par personne au plus)']) {
      expect(ditUneLimite(nom), nom).toBe(FONCTIONS.ia);
    }
  });
});
