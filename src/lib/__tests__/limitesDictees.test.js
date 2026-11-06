import { describe, it, expect } from 'vitest';
import { valeurDeLimite, ditUneLimite, lignesDeComparaison } from '../../components/landing/comparaisonPlans';
import { DICTEES_SANS_LIMITE, DICTEES_PARTAGE_GRATUIT, DICTEES_PARTAGE_PAYANT } from '../limitesDictees';
import { PLANS, PLAN_ORDER, LIBELLES_COMPLETS } from '../../stores/subscriptionStore';
import { FONCTIONS } from '../fonctions';

// Tableau des tarifs, IA allumée (décision d'Hugo du 4 nov. 2026) : les dictées sont une limite appliquée par le serveur.
// « Sans limite » ne s'écrit jamais sans le plafond du jour (C. conso. L121-2, juriste-btp du 4 nov. 2026).
// Décision du 5 nov. 2026 (D-37) : le quota se dit « partagé » (avis de juriste-btp, C.2) et le plafond du jour compte des « analyses ».
// Valeurs courtes de la cellule : texte du juriste après relecture au texte officiel (5 nov. 2026, avis du lot 4, point 3).
describe('tarifs : la ligne des dictées', () => {
  it('5 par mois, par entreprise ; 100 par mois, par abonnement ; puis « sans limite mensuelle » avec son plafond (jamais « Illimité »)', () => {
    expect(['gratuit', 'artisan', 'equipe'].map((id) => valeurDeLimite('dictees', PLANS[id].limits.dictees, id))).toEqual([
      '5 par mois, par entreprise',
      '100 par mois, par abonnement',
      DICTEES_SANS_LIMITE,
    ]);
    expect(DICTEES_SANS_LIMITE).toBe('Sans limite mensuelle (100 analyses par jour et par personne au plus)');
    expect(DICTEES_PARTAGE_GRATUIT).toBe(', par entreprise');
    expect(DICTEES_PARTAGE_PAYANT).toBe(', par abonnement');
  });

  it('sans le plan, la ligne ne dit rien du partage (rien d’inventé) ; une autre limite n’est pas touchée', () => {
    expect([5, 100].map((v) => valeurDeLimite('dictees', v))).toEqual(['5 par mois', '100 par mois']);
    expect(valeurDeLimite('devis', 5, 'gratuit')).toBe('5 par mois');
    expect(valeurDeLimite('clients', 10, 'gratuit')).toBe('10');
  });

  it('IA allumée : les libellés des offres sur la dictée sont lus comme des limites, pas comme des fonctions', () => {
    const noms = [
      '5 dictées par mois, partagées entre les utilisateurs de l’entreprise',
      '100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises',
      'Dictées sans limite mensuelle (100 analyses par jour et par personne au plus)',
    ];
    for (const nom of noms) expect(ditUneLimite(nom), nom).toBe(FONCTIONS.ia);
  });

  // Les cellules sont courtes : le détail est dans les libellés des offres. Le nombre et le plafond du jour doivent pourtant être
  // les mêmes dans la cellule et dans le libellé du plan.
  it('le nombre et le plafond de chaque cellule sont ceux du libellé d’offre du plan', () => {
    for (const id of PLAN_ORDER) {
      const libelle = LIBELLES_COMPLETS[id].find((f) => /dict[ée]e/i.test(f.name))?.name;
      expect(libelle, `${id} : un libellé de dictée`).toBeTruthy();
      const cellule = valeurDeLimite('dictees', PLANS[id].limits.dictees, id);
      if (PLANS[id].limits.dictees < 0) expect(libelle.toLowerCase()).toContain(cellule.toLowerCase());
      else expect(libelle.startsWith(`${PLANS[id].limits.dictees} dictées par mois`)).toBe(true);
    }
  });

  it('IA allumée, le tableau porte la ligne « Dictées » avec ces valeurs ; éteinte, il n’en parle pas', () => {
    const { limites } = lignesDeComparaison(PLANS, PLAN_ORDER);
    const ligne = limites.find((l) => l.cle === 'dictees');
    if (!FONCTIONS.ia) { expect(ligne).toBeUndefined(); return; }
    expect(ligne.valeurs).toEqual(['5 par mois, par entreprise', '100 par mois, par abonnement', DICTEES_SANS_LIMITE]);
  });
});
