import { describe, it, expect } from 'vitest';
import { champsAdresse, adresseComposee, adresseComplete, majAdresse } from '../adresseEntreprise';

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

  it('modifier un champ réécrit l\'adresse complète et les deux colonnes', () => {
    const e = { adresse: '127 cours du Médoc33300Bordeaux' };
    expect(majAdresse(e, 'ville', 'Bordeaux Lac')).toEqual({ adresse: '127 cours du Médoc\n33300 Bordeaux Lac', codePostal: '33300', ville: 'Bordeaux Lac' });
    const apres = { adresse: '127 cours du Médoc\n33300 Bordeaux', codePostal: '33300', ville: 'Bordeaux' };
    expect(majAdresse(apres, 'codePostal', '33000')).toEqual({ adresse: '127 cours du Médoc\n33000 Bordeaux', codePostal: '33000', ville: 'Bordeaux' });
    expect(majAdresse(apres, 'rue', '12 rue Neuve')).toEqual({ adresse: '12 rue Neuve\n33300 Bordeaux', codePostal: '33300', ville: 'Bordeaux' });
    // Ville seule, puis code postal seul : rien ne se perd au tour suivant
    const villeSeule = majAdresse({}, 'ville', 'Sarlat');
    expect(villeSeule).toEqual({ adresse: 'Sarlat', codePostal: '', ville: 'Sarlat' });
    expect(majAdresse(villeSeule, 'rue', '1 rue Basse')).toEqual({ adresse: '1 rue Basse\nSarlat', codePostal: '', ville: 'Sarlat' });
  });
});
