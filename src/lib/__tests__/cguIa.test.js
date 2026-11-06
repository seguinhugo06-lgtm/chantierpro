import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TexteCgu from '../../components/legal/TexteCgu';
import { FONCTIONS } from '../fonctions';
import { CGU_VERSION, CGU_VERSION_DATE } from '../cgu';

// Les CGU et la politique de confidentialité changent avec la dictée (sous-traitant Anthropic). La version suit
// l'interrupteur ; le jour de l'allumage, sa date doit être relevée au jour réel (avis juriste-btp du 3 nov. 2026).
describe('version des CGU et dictée (IA)', () => {
  it('IA éteinte : la version acceptée aujourd’hui ne change pas', () => {
    if (FONCTIONS.ia) return;
    expect([CGU_VERSION, CGU_VERSION_DATE]).toEqual(['2026-10-28', '28 octobre 2026']);
  });

  it('IA allumée : la date du projet (3 nov. 2026) a été remplacée par celle de l’allumage', () => {
    if (!FONCTIONS.ia) return;
    expect(CGU_VERSION, 'Relevez CGU_VERSION et CGU_VERSION_DATE (src/lib/cgu.js) au jour de l’allumage').not.toBe('2026-11-03');
    expect(CGU_VERSION).not.toBe('2026-10-28');
  });
});

// Relecture au texte officiel du 5 nov. 2026 (avis du lot 4) : l'article 11 corrigé est sous l'interrupteur, rien ne change
// à l'écran tant que l'IA est éteinte (le texte avec IA est comparé mot pour mot dans cguArticle11.test.jsx).
describe('CGU article 11 : rien ne change tant que l\'IA est éteinte', () => {
  it('IA éteinte : ni les deux paragraphes de sous-traitance, ni « règlement (UE) 2016/679 »', () => {
    if (FONCTIONS.ia) return;
    const texte = renderToStaticMarkup(createElement(TexteCgu)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    expect(texte).not.toMatch(/autorisation écrite générale|sous-traitants ultérieurs|dans les meilleurs délais après en avoir pris connaissance/);
    expect(texte).toContain('(Règlement UE 2016/679)');
    expect(texte).not.toContain('règlement (UE) 2016/679');
  });
});
