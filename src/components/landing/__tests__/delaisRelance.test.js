import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS, bornes, delais } from '../site/delaisRelance';
import { FEATURES_CONTENT, CAPTURES } from '../featuresContent';
import { questionsFaq } from '../faq';

/**
 * Les délais de relance dits par le site viennent des scénarios de l'application (`src/lib/scenariosRelance.js`) :
 * aucun « J+… » n'est recopié dans la FAQ ni dans les pages de fonctionnalités.
 */
describe('délais des relances, lus dans les scénarios de l\'application', () => {
  it('se disent en texte', () => {
    expect(delais([{ delay: 7 }, { delay: 15 }, { delay: 30 }])).toBe('J+7, J+15 et J+30');
    expect(delais([{ delay: 2 }, { delay: 9 }])).toBe('J+2 et J+9');
    expect(delais([{ delay: 5 }])).toBe('J+5');
    expect(bornes([{ delay: 3 }, { delay: 15 }, { delay: 45 }])).toBe('de J+3 à J+45');
    expect(bornes([])).toBe('');
  });

  it('les pages de relances et la FAQ disent les délais des scénarios', () => {
    const page = JSON.stringify(FEATURES_CONTENT.relances);
    expect(page).toContain(delais(DEFAULT_DEVIS_STEPS));
    expect(page).toContain(delais(DEFAULT_FACTURE_STEPS));
    expect(page).toContain(bornes(DEFAULT_FACTURE_STEPS));
    expect(CAPTURES.relances.alt).toContain(delais(DEFAULT_DEVIS_STEPS));
    const faq = questionsFaq().find((q) => q.q.startsWith('Comment fonctionnent les relances')).a;
    expect(faq).toContain(delais(DEFAULT_DEVIS_STEPS));
    expect(faq).toContain(delais(DEFAULT_FACTURE_STEPS));
  });

  it('aucun délai « J+… » écrit en dur dans faq.js ni featuresContent.js', () => {
    for (const fichier of ['../faq.js', '../featuresContent.js']) {
      const source = fs.readFileSync(fileURLToPath(new URL(fichier, import.meta.url)), 'utf8');
      expect(source, fichier).not.toMatch(/J\+\d/);
    }
  });
});
