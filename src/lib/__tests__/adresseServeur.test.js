import { describe, it, expect } from 'vitest';
import { adresseComplete } from '../adresseEntreprise';
import { adresseComplete as adresseCompleteServeur } from '../../../supabase/functions/_shared/adresseEntreprise.ts';

// La copie des fonctions Edge (rappels de ramonage) suit la règle de l'app : mêmes résultats sur les formes connues.
const FICHES = [
  { adresse: '127 cours du Médoc\n33300 Bordeaux', code_postal: '33300', ville: 'Bordeaux' },
  { adresse: '127 cours du Médoc\n33300 Bordeaux', codePostal: '33300', ville: 'Bordeaux' },
  { adresse: '127 cours du Médoc', code_postal: '33300', ville: 'Bordeaux' },
  { adresse: '127 cours du Médoc\n33300 Bordeaux' },
  { adresse: '127 cours du Médoc33300Bordeaux' },
  { adresse: '3 RUE DES LILAS 33000 BORDEAUX' },
  { adresse: 'Bât. B\n12 rue Neuve\n33000 Bordeaux\nFRANCE', code_postal: '33000', ville: 'Bordeaux' },
  { adresse: '', code_postal: '33000', ville: '' },
  {},
];

describe('adresse de l\'entreprise : la copie serveur suit la règle de l\'app', () => {
  it.each(FICHES.map((f) => [JSON.stringify(f), f]))('%s', (_, fiche) => {
    expect(adresseCompleteServeur(fiche)).toBe(adresseComplete(fiche));
  });

  it('ne répète jamais « 33300 Bordeaux » quand l\'adresse le contient déjà', () => {
    const texte = adresseCompleteServeur(FICHES[0]);
    expect(texte.match(/33300 Bordeaux/g)).toHaveLength(1);
    expect(texte.split('\n').join(', ')).toBe('127 cours du Médoc, 33300 Bordeaux');
  });

  it('une fiche plus ancienne (rue seule, colonnes) est lue comme avant', () => {
    expect(adresseCompleteServeur(FICHES[2]).split('\n').join(', ')).toBe('127 cours du Médoc, 33300 Bordeaux');
  });
});
