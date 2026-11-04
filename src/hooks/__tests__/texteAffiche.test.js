import { describe, it, expect } from 'vitest';
import { texteAffiche } from '../useDictation';

// Contrôle local du 4 nov. 2026 (3e condition de D-07) : taper au clavier dans la fenêtre de dictée collait les mots, car
// le texte tapé repassait par recoller(), qui retire l'espace de fin à chaque frappe.
describe('dictée : le texte tapé au clavier est rendu tel quel', () => {
  it('« devis pour » suivi d’une espace garde son espace', () => {
    expect(texteAffiche('devis pour ', '')).toBe('devis pour ');
  });

  it('frappe lettre par lettre : « Madame Durand, 15 m² de carrelage » arrive intact', () => {
    const cible = 'Madame Durand, 15 m² de carrelage';
    let champ = '';
    for (const lettre of cible) champ = texteAffiche(champ + lettre, '');
    expect(champ).toBe(cible);
  });

  it('pendant l’écoute, le résultat en cours est recollé au texte figé (une espace, pas de doublon)', () => {
    expect(texteAffiche('Madame Dupont', 'douze rue des Lilas')).toBe('Madame Dupont douze rue des Lilas');
    expect(texteAffiche('carrelage ', ' , 45 euros')).toBe('carrelage, 45 euros');
  });

  it('rien : chaîne vide', () => {
    expect(texteAffiche('', '')).toBe('');
    expect(texteAffiche(undefined, '')).toBe('');
  });
});
