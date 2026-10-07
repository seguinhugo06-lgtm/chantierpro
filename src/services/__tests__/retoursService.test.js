import { describe, it, expect } from 'vitest';
import { envoyerRetour, TYPES_RETOUR, STATUTS_RETOUR } from '../retoursService';

describe('envoyerRetour', () => {
  it('refuse un type inconnu ou un message vide', async () => {
    expect((await envoyerRetour({ type: 'spam', message: 'bonjour' })).error).toMatch(/type/);
    expect((await envoyerRetour({ type: 'bug', message: '  ' })).error).toMatch(/quelques mots/);
    expect((await envoyerRetour({ type: 'idee', message: 'x'.repeat(5001) })).error).toMatch(/trop long/);
  });

  it('en démo, renvoie le retour enregistré avec le statut « nouveau »', async () => {
    const { data, error } = await envoyerRetour({ type: 'idee', message: 'Un modèle de devis dépannage', page: 'devis' });
    expect(error).toBeNull();
    expect(data).toMatchObject({ type: 'idee', statut: 'nouveau', page: 'devis', reponse: null });
  });

  it('chaque statut et chaque type a un libellé', () => {
    expect(Object.keys(TYPES_RETOUR)).toEqual(['bug', 'idee', 'autre']);
    expect(Object.keys(STATUTS_RETOUR)).toEqual(['nouveau', 'lu', 'en_cours', 'fait', 'refuse']);
  });
});
