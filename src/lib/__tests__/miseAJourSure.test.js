import { describe, it, expect, vi } from 'vitest';
import { programmerMiseAJour, saisieEnCours } from '../miseAJourSure';

// Faux document : visibilité, élément actif et fenêtres ouvertes réglables.
function fauxDocument({ cache = false, actif = null, fenetre = false } = {}) {
  const ecouteurs = new Set();
  return {
    visibilityState: cache ? 'hidden' : 'visible',
    activeElement: actif,
    querySelector: () => (fenetre ? {} : null),
    addEventListener: (_t, f) => ecouteurs.add(f),
    removeEventListener: (_t, f) => ecouteurs.delete(f),
    passerEnArrierePlan() { this.visibilityState = 'hidden'; [...ecouteurs].forEach((f) => f()); },
    ecouteurs,
  };
}
const champ = { tagName: 'INPUT' };

describe('saisie en cours', () => {
  it('un champ actif ou une fenêtre ouverte comptent comme une saisie', () => {
    expect(saisieEnCours(fauxDocument({ actif: champ }))).toBe(true);
    expect(saisieEnCours(fauxDocument({ fenetre: true }))).toBe(true);
    expect(saisieEnCours(fauxDocument({ actif: { tagName: 'BUTTON' } }))).toBe(false);
  });
});

describe('application de la nouvelle version', () => {
  it('à l’ouverture, rien touché : tout de suite', () => {
    const appliquer = vi.fn();
    programmerMiseAJour({ appliquer, doc: fauxDocument(), ouvertureRecente: () => true, interagi: () => false });
    expect(appliquer).toHaveBeenCalledTimes(1);
  });

  it('en pleine utilisation : jamais sous les doigts, mais dès le passage en arrière-plan', () => {
    const appliquer = vi.fn();
    const doc = fauxDocument();
    programmerMiseAJour({ appliquer, doc, ouvertureRecente: () => false, interagi: () => true });
    expect(appliquer).not.toHaveBeenCalled();
    doc.passerEnArrierePlan();
    expect(appliquer).toHaveBeenCalledTimes(1);
    expect(doc.ecouteurs.size).toBe(0);
  });

  it('en arrière-plan avec une saisie en cours : on attend un retour sans saisie', () => {
    const appliquer = vi.fn();
    const doc = fauxDocument({ actif: champ });
    programmerMiseAJour({ appliquer, doc, ouvertureRecente: () => false, interagi: () => true });
    doc.passerEnArrierePlan();
    expect(appliquer).not.toHaveBeenCalled();
    doc.activeElement = null;
    doc.visibilityState = 'visible';
    doc.passerEnArrierePlan();
    expect(appliquer).toHaveBeenCalledTimes(1);
  });

  it('déjà en arrière-plan sans saisie : tout de suite', () => {
    const appliquer = vi.fn();
    programmerMiseAJour({ appliquer, doc: fauxDocument({ cache: true }), ouvertureRecente: () => false, interagi: () => true });
    expect(appliquer).toHaveBeenCalledTimes(1);
  });

  it('ouverture récente mais une fenêtre est déjà ouverte : on attend', () => {
    const appliquer = vi.fn();
    programmerMiseAJour({ appliquer, doc: fauxDocument({ fenetre: true }), ouvertureRecente: () => true, interagi: () => false });
    expect(appliquer).not.toHaveBeenCalled();
  });
});
