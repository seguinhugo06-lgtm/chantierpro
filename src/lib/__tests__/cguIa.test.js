import { describe, it, expect } from 'vitest';
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
