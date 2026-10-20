import { describe, it, expect } from 'vitest';
import { PLANS } from '../subscriptionStore';

// D-29 : la grille tarifaire annonce ce que l'application fait réellement.
// Les libellés ci-dessous sont ceux que lisent le site public, « Mon plan »,
// la fenêtre d'abonnement et la page des tarifs.
const noms = (id) => PLANS[id].featureLabels.map((f) => f.name);

describe('plans : l\'offre réelle (D-29)', () => {
  it('Gratuit annonce ses vraies limites et ce qui n\'est pas bridé', () => {
    expect(noms('gratuit')).toEqual([
      '5 devis par mois',
      'Factures sans limite',
      '10 clients',
      '2 chantiers',
      '50 photos de chantier',
      'Vous + 1 collaborateur',
      'Signature en ligne des devis',
      'Relances automatiques',
      'Catalogue complet et bibliothèque : plus de 1 000 prestations chiffrées',
    ]);
  });

  it('Artisan annonce l\'illimité pour un seul utilisateur', () => {
    expect(noms('artisan')).toEqual([
      'Tout le plan Gratuit, sans limite',
      'Devis, clients, chantiers et photos illimités',
      'Vous + 1 collaborateur',
    ]);
  });

  it('Équipe annonce ce qui s\'ajoute pour plusieurs utilisateurs, sans réserver à Équipe ce qu\'aucun plan ne verrouille', () => {
    expect(noms('equipe')).toEqual([
      'Tout le plan Artisan',
      'Vous + 10 collaborateurs, chacun avec son rôle',
    ]);
    // Les rôles et le pointage ne sont verrouillés par aucun plan : ils ne figurent pas comme fonctions d'Équipe
    for (const nom of noms('equipe')) expect(nom).not.toMatch(/pointage|accès/i);
  });

  it('aucune ligne « non incluse » : tout ce qui est listé est inclus', () => {
    for (const id of ['gratuit', 'artisan', 'equipe']) {
      expect(PLANS[id].featureLabels.length).toBeGreaterThan(0);
      for (const f of PLANS[id].featureLabels) {
        expect(f.included).toBe(true);
      }
    }
  });

  it('les limites du plan Gratuit sont celles que l\'application applique', () => {
    expect(PLANS.gratuit.limits).toMatchObject({
      devis: 5,
      clients: 10,
      chantiers: 2,
      photos: 50,
      equipe: 1,
      catalogue: -1,
      signatures: -1,
    });
    expect(PLANS.equipe.limits.equipe).toBe(10);
  });

  it('« illimités » est tenu par les limites : Artisan et Équipe ne plafonnent ni devis, ni clients, ni chantiers, ni photos', () => {
    for (const id of ['artisan', 'equipe']) {
      for (const ressource of ['devis', 'clients', 'chantiers', 'photos']) {
        expect(PLANS[id].limits[ressource], `${id}.${ressource}`).toBe(-1);
      }
    }
  });

  it('la limite d\'équipe ne compte pas le propriétaire (TeamManagement) : libellés « Vous + N collaborateur(s) »', () => {
    expect(noms('artisan')).toContain(`Vous + ${PLANS.artisan.limits.equipe} collaborateur`);
    expect(noms('equipe').some((nom) => nom.startsWith(`Vous + ${PLANS.equipe.limits.equipe} collaborateurs`))).toBe(true);
  });

  it('chaque limite chiffrée du plan Gratuit apparaît dans le libellé de sa ressource', () => {
    const motDeLaRessource = { devis: 'devis', clients: 'clients', chantiers: 'chantiers', photos: 'photos', equipe: 'collaborateur' };
    for (const [ressource, mot] of Object.entries(motDeLaRessource)) {
      const limite = PLANS.gratuit.limits[ressource];
      const trouve = noms('gratuit').some((nom) => new RegExp(`^(Vous \\+ )?${limite} ${mot}`).test(nom));
      expect(trouve, `${ressource} = ${limite} doit figurer dans un libellé « ${limite} ${mot}… »`).toBe(true);
    }
  });
});
