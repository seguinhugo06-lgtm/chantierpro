import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { genererJetons, serialiser, FICHIER_CSS, DOSSIER } from '../../../scripts/jetons.mjs';

// Les jetons exportés pour Figma (design/tokens/) doivent refléter le vrai thème : sinon `npm run jetons`.
describe('jetons exportés (DTCG)', () => {
  const fichiers = genererJetons(fs.readFileSync(FICHIER_CSS, 'utf8'));

  it.each(Object.keys(fichiers))('%s est à jour', (nom) => {
    const surDisque = fs.readFileSync(path.join(DOSSIER, nom), 'utf8');
    expect(surDisque).toBe(serialiser(fichiers[nom]));
  });

  it('chaque couleur est un hex valide, en clair comme en sombre', () => {
    for (const nom of ['mallettico.clair.tokens.json', 'mallettico.sombre.tokens.json']) {
      const valeurs = JSON.stringify(fichiers[nom]).match(/"\$value":"[^"]*"/g) || [];
      expect(valeurs.length).toBeGreaterThan(20);
      for (const v of valeurs) expect(v).toMatch(/"#[0-9a-f]{6}([0-9a-f]{2})?"/);
    }
  });
});
