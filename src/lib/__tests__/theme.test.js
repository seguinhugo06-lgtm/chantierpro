import { describe, it, expect } from 'vitest';
import { variablesAccent, contraste, appliquerTheme } from '../theme';

const rgb = (triplet) => triplet.split(' ').map(Number);
const BLANC = [255, 255, 255];
const SLATE_800 = [30, 41, 59];

describe('variablesAccent', () => {
  const couleurs = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#0f172a', '#ef4444', '#ffffff', '#fde047'];

  it.each(couleurs)('%s : le texte posé sur l\'accent est lisible (≥ 4,5:1)', (c) => {
    const v = variablesAccent(c, false);
    expect(contraste(rgb(v['--sur-accent']), rgb(v['--accent']))).toBeGreaterThanOrEqual(4.5);
  });

  it('écrit en noir sur l\'orange et en blanc sur un bleu foncé', () => {
    expect(variablesAccent('#f97316')['--sur-accent']).toBe('2 6 23');
    expect(variablesAccent('#1e3a8a')['--sur-accent']).toBe('255 255 255');
  });

  it.each(couleurs)('%s : texte d\'accent lisible sur la surface claire et sombre', (c) => {
    expect(contraste(rgb(variablesAccent(c, false)['--accent-texte']), BLANC)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(rgb(variablesAccent(c, true)['--accent-texte']), SLATE_800)).toBeGreaterThanOrEqual(4.5);
  });

  it('garde la couleur choisie telle quelle pour --accent', () => {
    expect(variablesAccent('#f97316')['--accent']).toBe('249 115 22');
    expect(variablesAccent('#abc')['--accent']).toBe('170 187 204');
  });

  it('retombe sur l\'orange quand la couleur est absente ou illisible', () => {
    expect(variablesAccent(undefined)['--accent']).toBe('249 115 22');
    expect(variablesAccent('rouge')['--accent']).toBe('249 115 22');
  });

  it('ne touche pas une couleur déjà assez foncée pour du texte', () => {
    expect(variablesAccent('#0f172a')['--accent-texte']).toBe('15 23 42');
  });
});

describe('appliquerTheme', () => {
  it('pose data-theme et les variables sur la racine', () => {
    const proprietes = {};
    const racine = { dataset: {}, style: { setProperty: (nom, valeur) => { proprietes[nom] = valeur; } } };
    appliquerTheme(racine, { sombre: true, couleur: '#3b82f6' });
    expect(racine.dataset.theme).toBe('sombre');
    expect(racine.style.colorScheme).toBe('dark');
    expect(proprietes['--accent']).toBe('59 130 246');
    appliquerTheme(racine, { sombre: false, couleur: '#3b82f6' });
    expect(racine.dataset.theme).toBe('clair');
  });
});
