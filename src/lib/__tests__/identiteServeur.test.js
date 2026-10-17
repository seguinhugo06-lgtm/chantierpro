import { describe, it, expect } from 'vitest';
import { nomImprime } from '../identiteEntreprise';
import { nomImprime as nomImprimeServeur } from '../../../supabase/functions/_shared/identite.ts';

// La copie serveur (fonctions Edge) imprime exactement le même nom que l'app (C. com. R526-27).
const cas = [
  { nom: 'Hugo Séguin — Électricien', forme_juridique: 'Micro-entreprise', nomEntrepreneur: 'Hugo Séguin' },
  { nom: 'Électricité du Sud', forme_juridique: 'EI', nomEntrepreneur: 'Hugo Séguin' },
  { nom: 'Élec Exemple', forme_juridique: 'Micro-entreprise' },
  { nom: 'Élec Exemple EI', forme_juridique: 'Micro-entreprise' },
  { nom: 'Bati Sud', forme_juridique: 'EIRL', nomEntrepreneur: 'Jean Durand' },
  { nom: 'Élec du Sud', forme_juridique: 'SARL' },
  { nom: '', forme_juridique: 'Auto-entrepreneur', nomEntrepreneur: 'Léa Martin' },
  { nom: 'Léa Martin', formeJuridique: 'entreprise individuelle', nomEntrepreneur: 'lea martin' },
];

describe('nom imprimé : même règle dans l’app et dans les fonctions Edge', () => {
  it.each(cas)('%o', (e) => {
    expect(nomImprimeServeur(e)).toBe(nomImprime(e));
  });
  it('exemples', () => {
    expect(nomImprimeServeur(cas[0])).toBe('Hugo Séguin EI — Électricien');
    expect(nomImprimeServeur(cas[1])).toBe('Électricité du Sud — Hugo Séguin EI');
    expect(nomImprimeServeur(cas[5])).toBe('Élec du Sud');
  });
});
