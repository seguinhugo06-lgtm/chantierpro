import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Cliquet du design (refonte du 9 oct. 2026) : ces motifs ne doivent plus jamais augmenter.
 * Quand une livraison en retire, abaisser le plafond ici pour verrouiller le gain (le dernier test
 * échoue tant qu'un plafond dépasse la mesure de plus de 20 : il rappelle de le faire).
 *   micro-texte : texte sous 12 px (règle « interface » : 12 px au moins)
 *   gris        : palette `gray` (une seule palette neutre : slate et les jetons du thème)
 *   dark:       : classes Tailwind `dark:` (le thème passe par isDark ou data-theme)
 */
const PLAFONDS = {
  'micro-texte': 221,
  gris: 1113,
  'dark:': 0,
};
const MOTIFS = {
  'micro-texte': /text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/g,
  gris: /\b(?:bg|text|border|ring|divide|from|to|via|placeholder|outline|fill|stroke)-gray-\d{2,3}\b/g,
  'dark:': /(?<![\w-])dark:[a-z]/g,
};

function fichiers(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : fichiers(p);
    return /\.(jsx?|tsx?)$/.test(e.name) ? [p] : [];
  });
}

describe('plafonds du design', () => {
  const source = fichiers(fileURLToPath(new URL('../../components', import.meta.url))).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const mesure = (cle) => (source.match(MOTIFS[cle]) || []).length;

  it.each(Object.keys(PLAFONDS))('%s ne dépasse pas son plafond', (cle) => {
    const n = mesure(cle);
    expect(n, `${cle} : ${n} occurrences pour un plafond de ${PLAFONDS[cle]}`).toBeLessThanOrEqual(PLAFONDS[cle]);
  });

  it.each(Object.keys(PLAFONDS))('le plafond de %s suit les progrès (marge de 20 au plus)', (cle) => {
    const n = mesure(cle);
    expect(PLAFONDS[cle] - n, `${cle} est descendu à ${n} : abaisser son plafond (${PLAFONDS[cle]})`).toBeLessThanOrEqual(20);
  });
});
