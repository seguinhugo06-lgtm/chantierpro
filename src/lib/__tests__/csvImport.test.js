import { describe, it, expect } from 'vitest';
import { lireCsv, nombreFr, associerColonnes } from '../csvImport';

describe('import CSV : lecture fidèle (recette du 9 oct. 2026)', () => {
  it('guillemets : un « ; » ou une « , » dans un nom ne décale plus les colonnes', () => {
    const { entetes, lignes } = lireCsv('﻿Nom;Prix vente;Unité\r\n"Disjoncteur ""C"" 20A; 1P+N";1 250,00;u\r\n"Tube cuivre 16, écroui";11,2;ml\n');
    expect(entetes).toEqual(['Nom', 'Prix vente', 'Unité']);
    expect(lignes[0]).toEqual({ Nom: 'Disjoncteur "C" 20A; 1P+N', 'Prix vente': '1 250,00', 'Unité': 'u' });
    expect(lignes[1]['Unité']).toBe('ml');
  });

  it('nombres à la française : milliers, virgule, symbole', () => {
    expect(nombreFr('1 250,00')).toBe(1250);
    expect(nombreFr('1 250,00 €')).toBe(1250);
    expect(nombreFr('1.250,50')).toBe(1250.5);
    expect(nombreFr('5,5')).toBe(5.5);
    expect(nombreFr('0')).toBe(0);
    expect(Number.isNaN(nombreFr('abc'))).toBe(true);
    expect(Number.isNaN(nombreFr(''))).toBe(true);
  });

  it('colonnes : « u » ne reconnaît plus « Seuil alerte » ; l\'export réimporté garde ses unités', () => {
    const m = associerColonnes(['Référence', 'Nom', 'Catégorie', 'Prix vente HT', 'Prix achat HT', 'Unité', 'TVA', 'Stock', 'Seuil alerte']);
    expect(m.unite).toBe('Unité');
    expect(m.prix).toBe('Prix vente HT');
    expect(m.prixAchat).toBe('Prix achat HT');
    expect(m.tva_rate).toBe('TVA');
    expect(m.designation).toBe('Nom');
    expect(m.reference).toBe('Référence');
  });
});
