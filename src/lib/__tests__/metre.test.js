import { describe, it, expect } from 'vitest';
import { calculerMetre } from '../metre';

/**
 * Le calcul de la fenêtre « Métré » de l'éditeur de devis, extrait dans src/lib/metre.js pour être partagé avec le
 * site public (refonte d'octobre 2026, « Les fonctionnalités en action »). Il ne doit pas changer.
 *
 * Référence : le code de `MetreModal` (src/components/DevisComposer.jsx) AVANT l'extraction, recopié tel quel.
 * La fenêtre lui passe les valeurs de ses champs numériques (`type="number"`) : des chaînes (« 4 », « 0.5 », « »).
 */
function formuleAvantExtraction(L, larg, haut, nb, chutes) {
  const nL = parseFloat(L) || 0, nl = parseFloat(larg) || 0, nh = parseFloat(haut) || 0, nN = parseFloat(nb) || 1, nC = parseFloat(chutes) || 0;
  const has3d = nh > 0;
  const qty = Math.round(nL * nl * (has3d ? nh : 1) * nN * (1 + nC / 100) * 100) / 100;
  const unite = has3d ? 'm³' : 'm²';
  return { quantite: qty, unite };
}

describe('calculerMetre — les règles de la fenêtre « Métré » de l’éditeur', () => {
  it('surface avec chutes : 4 × 3 m et 10 % de chutes font 13,2 m²', () => {
    expect(calculerMetre({ longueur: '4', largeur: '3', hauteur: '', nombre: '1', chutes: '10' })).toEqual({ quantite: 13.2, unite: 'm²' });
  });

  it('volume avec hauteur : 5 × 4 m sur 0,12 m font 2,4 m³ (et les chutes s’appliquent au volume)', () => {
    expect(calculerMetre({ longueur: '5', largeur: '4', hauteur: '0.12', nombre: '1', chutes: '' })).toEqual({ quantite: 2.4, unite: 'm³' });
    expect(calculerMetre({ longueur: '4', largeur: '3', hauteur: '0.5', nombre: '1', chutes: '10' })).toEqual({ quantite: 6.6, unite: 'm³' });
  });

  it('nombre supérieur à 1 : 2,5 × 1,2 m, trois fois, 5 % de chutes font 9,45 m²', () => {
    expect(calculerMetre({ longueur: '2.5', largeur: '1.2', nombre: '3', chutes: '5' })).toEqual({ quantite: 9.45, unite: 'm²' });
    expect(calculerMetre({ longueur: '4', largeur: '3', nombre: '2', chutes: '10' })).toEqual({ quantite: 26.4, unite: 'm²' });
  });

  it('arrondi au centième, comme la fenêtre (Math.round, sans autre correction)', () => {
    expect(calculerMetre({ longueur: '1.333', largeur: '1' })).toEqual({ quantite: 1.33, unite: 'm²' });
    expect(calculerMetre({ longueur: '1.005', largeur: '1' })).toEqual(formuleAvantExtraction('1.005', '1', '', '1', ''));
  });

  it('champs vides ou nuls : quantité 0 ; un nombre vide ou nul compte pour 1 ; une hauteur nulle reste une surface', () => {
    expect(calculerMetre({ longueur: '', largeur: '' })).toEqual({ quantite: 0, unite: 'm²' });
    expect(calculerMetre({ longueur: '4', largeur: '3', nombre: '' })).toEqual({ quantite: 12, unite: 'm²' });
    expect(calculerMetre({ longueur: '4', largeur: '3', nombre: '0' })).toEqual({ quantite: 12, unite: 'm²' });
    expect(calculerMetre({ longueur: '4', largeur: '3', hauteur: '0' })).toEqual({ quantite: 12, unite: 'm²' });
    expect(calculerMetre()).toEqual({ quantite: 0, unite: 'm²' });
  });

  it('valeurs par défaut de la signature : nombre 1, chutes 0', () => {
    expect(calculerMetre({ longueur: 4, largeur: 3 })).toEqual({ quantite: 12, unite: 'm²' });
  });

  it('accepte la virgule décimale du site (« 5,2 ») ; la fenêtre, en champs numériques, n’en reçoit jamais', () => {
    expect(calculerMetre({ longueur: '5,2', largeur: '3,8', chutes: '10' })).toEqual({ quantite: 21.74, unite: 'm²' });
  });

  it('ne donne jamais « ml » : la fenêtre ne connaît que m² et m³', () => {
    expect(calculerMetre({ longueur: '12', largeur: '' }).unite).toBe('m²');
  });

  it('identique à l’ancienne formule de la fenêtre sur toutes les combinaisons de saisies', () => {
    const valeurs = ['', '0', '1', '2.5', '3', '0.12', '1.005', '7.333', '12', '-2'];
    const nombres = ['', '0', '1', '3'];
    const chutes = ['', '0', '5', '10', '12.5'];
    let comparees = 0;
    for (const L of valeurs) for (const l of valeurs) for (const h of ['', '0', '0.12', '2.5']) for (const n of nombres) for (const c of chutes) {
      expect(calculerMetre({ longueur: L, largeur: l, hauteur: h, nombre: n, chutes: c }), `${L} × ${l} × ${h}, ${n}, ${c} %`)
        .toEqual(formuleAvantExtraction(L, l, h, n, c));
      comparees++;
    }
    expect(comparees).toBe(8000);
  });
});
