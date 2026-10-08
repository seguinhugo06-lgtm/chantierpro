import { describe, it, expect, vi } from 'vitest';
import { sectionDemandee, allerALaSection } from '../sectionsAccueil';

describe('section de l’accueil visée par l’adresse', () => {
  it('/tarifs et /faq mènent à leur section, avec ou sans barre finale', () => {
    expect(sectionDemandee('/tarifs', '')).toBe('#pricing');
    expect(sectionDemandee('/tarifs/', '')).toBe('#pricing');
    expect(sectionDemandee('/faq', '')).toBe('#faq');
  });
  it('une ancre d’accueil est reprise telle quelle ; rien sinon', () => {
    expect(sectionDemandee('/', '#early-adopters')).toBe('#early-adopters');
    expect(sectionDemandee('/', '')).toBeNull();
    expect(sectionDemandee('/', '#')).toBeNull();
    expect(sectionDemandee('/', '#<img onerror=x>')).toBeNull();
  });
});

describe('aller à une section', () => {
  it('défile quand la section est sur la page', () => {
    const scrollIntoView = vi.fn();
    const naviguer = vi.fn();
    allerALaSection('#pricing', { doc: { querySelector: () => ({ scrollIntoView }) }, naviguer });
    expect(scrollIntoView).toHaveBeenCalled();
    expect(naviguer).not.toHaveBeenCalled();
  });
  it('depuis une sous-page, « Tarifs » ouvre /tarifs et une autre ancre ouvre l’accueil à cet endroit', () => {
    const naviguer = vi.fn();
    const doc = { querySelector: () => null };
    allerALaSection('#pricing', { doc, naviguer });
    allerALaSection('#early-adopters', { doc, naviguer });
    expect(naviguer.mock.calls).toEqual([['/tarifs'], ['/#early-adopters']]);
  });
  it('un lien désactivé (« # ») ne fait rien', () => {
    const naviguer = vi.fn();
    allerALaSection('#', { doc: { querySelector: () => null }, naviguer });
    expect(naviguer).not.toHaveBeenCalled();
  });
});
