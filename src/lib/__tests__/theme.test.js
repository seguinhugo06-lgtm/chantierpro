import { describe, it, expect } from 'vitest';
import { variablesAccent, contraste, appliquerTheme, couleurPleine } from '../theme';

const rgb = (triplet) => triplet.split(' ').map(Number);
const BLANC = [255, 255, 255];
const SLATE_800 = [30, 41, 59];

describe('variablesAccent', () => {
  const couleurs = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#0f172a', '#ef4444', '#ffffff', '#fde047'];

  it.each(couleurs)('%s : le texte posé sur l\'accent est lisible (≥ 4,5:1)', (c) => {
    const v = variablesAccent(c, false);
    expect(contraste(rgb(v['--sur-accent']), rgb(v['--accent']))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(couleurs)('%s : le texte sur l\'accent est blanc, avec de la marge (≥ 5:1), en clair comme en sombre', (c) => {
    for (const sombre of [false, true]) {
      const v = variablesAccent(c, sombre);
      expect(v['--sur-accent']).toBe('255 255 255');
      expect(contraste(BLANC, rgb(v['--accent']))).toBeGreaterThanOrEqual(5);
    }
  });

  it('plus de noir sur orange : l\'orange par défaut est assombri, en gardant sa teinte', () => {
    const [r, g, b] = rgb(variablesAccent('#f97316')['--accent']);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(r).toBeLessThan(249);
  });

  it.each(couleurs)('%s : texte d\'accent lisible sur la surface claire et sombre', (c) => {
    expect(contraste(rgb(variablesAccent(c, false)['--accent-texte']), BLANC)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(rgb(variablesAccent(c, true)['--accent-texte']), SLATE_800)).toBeGreaterThanOrEqual(4.5);
  });

  it('garde telle quelle une couleur déjà assez foncée pour porter du blanc', () => {
    expect(variablesAccent('#0f172a')['--accent']).toBe('15 23 42');
    expect(variablesAccent('#1e3a8a')['--accent']).toBe('30 58 138');
  });

  it('retombe sur l\'orange quand la couleur est absente ou illisible', () => {
    const orange = variablesAccent('#f97316')['--accent'];
    expect(variablesAccent(undefined)['--accent']).toBe(orange);
    expect(variablesAccent('rouge')['--accent']).toBe(orange);
  });

  it('ne touche pas une couleur déjà assez foncée pour du texte', () => {
    expect(variablesAccent('#0f172a')['--accent-texte']).toBe('15 23 42');
  });
});

describe('couleurPleine', () => {
  it('rend en hexadécimal la même couleur que --accent', () => {
    expect(couleurPleine('#f97316')).toBe(`#${rgb(variablesAccent('#f97316')['--accent']).map((c) => c.toString(16).padStart(2, '0')).join('')}`);
    expect(couleurPleine('#0f172a')).toBe('#0f172a');
    expect(couleurPleine('rouge')).toBe(couleurPleine('#f97316'));
  });
});

describe('appliquerTheme', () => {
  it('pose data-theme et les variables sur la racine', () => {
    const proprietes = {};
    const racine = { dataset: {}, style: { setProperty: (nom, valeur) => { proprietes[nom] = valeur; } } };
    appliquerTheme(racine, { sombre: true, couleur: '#3b82f6' });
    expect(racine.dataset.theme).toBe('sombre');
    expect(racine.style.colorScheme).toBe('dark');
    expect(proprietes['--accent']).toBe(variablesAccent('#3b82f6', true)['--accent']);
    expect(proprietes['--sur-accent']).toBe('255 255 255');
    appliquerTheme(racine, { sombre: false, couleur: '#3b82f6' });
    expect(racine.dataset.theme).toBe('clair');
  });
});
