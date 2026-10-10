import { describe, it, expect } from 'vitest';
import { profilDepuisSirene } from '../sirene';

// Forme réelle de la réponse de recherche-entreprises.api.gouv.fr (relevée le 10 oct. 2026), réduite aux champs lus.
const societe = {
  results: [{
    siren: '384560942', nom_complet: 'LEROY MERLIN FRANCE', nom_raison_sociale: 'LEROY MERLIN FRANCE', nature_juridique: '5599',
    activite_principale: '47.52B', complements: { est_entrepreneur_individuel: false },
    siege: { siret: '38456094200045', adresse: 'RUE CHANZY 59260 LEZENNES', activite_principale: '47.52B' },
    matching_etablissements: [{ siret: '38456094200045', adresse: 'RUE CHANZY 59260 LEZENNES', activite_principale: '47.52B' }],
    dirigeants: [{ nom: 'X', prenoms: 'Y', type_dirigeant: 'personne physique', qualite: 'Administrateur' }],
  }],
};

// Entrepreneur individuel fictif, même forme : nom_raison_sociale vide, la personne dans « dirigeants »
const individuel = {
  results: [{
    siren: '912345678', nom_complet: 'JEAN-PIERRE MARTIN', nom_raison_sociale: null, nature_juridique: '1000',
    activite_principale: '43.21A', complements: { est_entrepreneur_individuel: true },
    siege: { siret: '91234567800011', adresse: '3 RUE DES LILAS 33000 BORDEAUX', activite_principale: '43.21A' },
    matching_etablissements: [],
    dirigeants: [{ nom: 'MARTIN', prenoms: 'JEAN-PIERRE PAUL', type_dirigeant: 'personne physique' }],
  }],
};

describe('auto-remplissage SIRENE (API publique, sans clé)', () => {
  it('société : raison sociale, adresse de l\'établissement, code APE sans point ; forme non devinée hors de la liste', () => {
    expect(profilDepuisSirene(societe, '38456094200045')).toEqual({
      nom: 'LEROY MERLIN FRANCE', adresse: 'RUE CHANZY 59260 LEZENNES', codeApe: '4752B', formeJuridique: '', nomEntrepreneur: '',
    });
  });

  it('entrepreneur individuel : son prénom et son nom (pour « EI »), sans choisir entre EI et micro-entreprise', () => {
    const p = profilDepuisSirene(individuel, '91234567800011');
    expect(p.nomEntrepreneur).toBe('Jean-Pierre Martin');
    expect(p.nom).toBe('Jean-Pierre Martin');
    expect(p.formeJuridique).toBe('');
    expect(p.adresse).toBe('3 RUE DES LILAS 33000 BORDEAUX');
    expect(p.codeApe).toBe('4321A');
  });

  it('un autre SIREN ou aucun résultat : rien', () => {
    expect(profilDepuisSirene(societe, '12345678900012')).toBeNull();
    expect(profilDepuisSirene({ results: [] }, '38456094200045')).toBeNull();
  });
});
