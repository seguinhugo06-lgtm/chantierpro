import { describe, it, expect } from 'vitest';
import { champsAdresse, adresseComposee, adresseComplete, LONGUEUR_ADRESSE_MAX } from '../adresseEntreprise';

describe('adresse de l\'entreprise en trois champs', () => {
  it('relit une adresse sur plusieurs lignes (Paramètres d\'avant le 26 oct. 2026)', () => {
    expect(champsAdresse({ adresse: '127 cours du Médoc\n33300 Bordeaux' }))
      .toEqual({ rue: '127 cours du Médoc', codePostal: '33300', ville: 'Bordeaux', suite: '' });
  });

  it('garde à leur place les lignes qui suivent la ville (« FRANCE ») et une rue sur deux lignes', () => {
    const a = champsAdresse({ adresse: 'Bâtiment B\n12 rue des Artisans\n75001 Paris\nFRANCE' });
    expect(a).toEqual({ rue: 'Bâtiment B\n12 rue des Artisans', codePostal: '75001', ville: 'Paris', suite: 'FRANCE' });
    expect(adresseComposee(a)).toBe('Bâtiment B\n12 rue des Artisans\n75001 Paris\nFRANCE');
  });

  it('coupe au code postal une adresse d\'une ligne : collée par l\'ancien assistant, ou celle du répertoire SIRENE', () => {
    expect(champsAdresse({ adresse: '127 cours du Médoc33300Bordeaux' }))
      .toEqual({ rue: '127 cours du Médoc', codePostal: '33300', ville: 'Bordeaux', suite: '' });
    expect(champsAdresse({ adresse: '3 RUE DES LILAS 33000 BORDEAUX' }))
      .toEqual({ rue: '3 RUE DES LILAS', codePostal: '33000', ville: 'BORDEAUX', suite: '' });
    expect(champsAdresse({ adresse: '12 rue des Artisans, 75011 Paris' }))
      .toEqual({ rue: '12 rue des Artisans', codePostal: '75011', ville: 'Paris', suite: '' });
  });

  it('sans code postal reconnaissable, tout reste dans la rue', () => {
    expect(champsAdresse({ adresse: 'Lieu-dit Les Granges' })).toEqual({ rue: 'Lieu-dit Les Granges', codePostal: '', ville: '', suite: '' });
    expect(champsAdresse({})).toEqual({ rue: '', codePostal: '', ville: '', suite: '' });
  });

  it('colonnes renseignées : la ligne de la ville n\'est ni répétée ni prise pour la rue', () => {
    const composee = { adresse: '127 cours du Médoc\n33300 Bordeaux', codePostal: '33300', ville: 'Bordeaux' };
    expect(champsAdresse(composee).rue).toBe('127 cours du Médoc');
    expect(adresseComplete(composee)).toBe('127 cours du Médoc\n33300 Bordeaux');
    // Fiche d'une autre entreprise (formulaire multi-entreprise) : la rue seule dans `adresse`
    expect(adresseComplete({ adresse: '5 place du Marché', code_postal: '24200', ville: 'Sarlat' })).toBe('5 place du Marché\n24200 Sarlat');
  });

  // LIGNE_CP (comme COLLE) coûte un temps quadratique sur une très longue ligne : 100 000 caractères, 10 s. La copie
  // serveur tronquait l'adresse à 500 caractères ; la copie de l'app, pas (relecture ciblée de la Task 8, 27 oct. 2026).
  it('une adresse de 100 000 caractères est tronquée à 500 avant toute lecture, sans attendre', () => {
    const pernicieuse = `12345${' '.repeat(50000)}${'x'.repeat(50000)}\u2028y`;
    const debutMesure = performance.now();
    const a = champsAdresse({ adresse: pernicieuse });
    expect(performance.now() - debutMesure).toBeLessThan(300);
    expect(a.rue.length + a.ville.length).toBeLessThanOrEqual(LONGUEUR_ADRESSE_MAX);
    expect(adresseComplete({ adresse: 'a'.repeat(100000) }).length).toBeLessThanOrEqual(LONGUEUR_ADRESSE_MAX);
  });
});
