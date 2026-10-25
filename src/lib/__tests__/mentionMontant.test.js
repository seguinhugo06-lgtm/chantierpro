import { describe, it, expect } from 'vitest';
import { suffixeTtc, avecMentionTtc, sansMentionTtc } from '../mentionMontant';

// Relecture juriste-btp du 24 oct. 2026 (Task 4) : « TTC » seulement hors franchise de TVA ; en franchise, le montant seul.
const MICRO = { formeJuridique: 'Micro-entreprise' };
const SARL = { formeJuridique: 'SARL' };

describe('mention « TTC » d’un montant de document', () => {
  it('hors franchise : « TTC » après le montant', () => {
    expect(avecMentionTtc('1 250,00 €', false)).toBe('1 250,00 € TTC');
    expect(suffixeTtc(false)).toBe(' TTC');
  });

  it('en franchise : le montant seul, ni « TTC » ni « HT »', () => {
    expect(avecMentionTtc('1 250,00 €', true)).toBe('1 250,00 €');
    expect(avecMentionTtc('1 250,00 €', true)).not.toMatch(/TTC|HT/);
  });

  it('facture à créer : le régime de l’entreprise décide', () => {
    expect(sansMentionTtc(MICRO)).toBe(true);
    expect(sansMentionTtc(SARL)).toBe(false);
  });

  it('document existant : émis avec TVA, il garde « TTC » même en franchise', () => {
    const emisAvecTva = { type: 'facture', statut: 'envoye', tva: 100, total_ht: 1000, total_ttc: 1100 };
    const emisSansTva = { type: 'facture', statut: 'envoye', tva: 0, total_ht: 1000, total_ttc: 1000 };
    expect(sansMentionTtc(MICRO, emisAvecTva)).toBe(false);
    expect(sansMentionTtc(MICRO, emisSansTva)).toBe(true);
    expect(sansMentionTtc(SARL, emisSansTva)).toBe(false);
  });
});
