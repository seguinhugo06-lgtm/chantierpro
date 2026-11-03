// Version des conditions d'utilisation, lue dans src/lib/cgu.js (la source de l'app) : les parcours suivent sa hausse
// sans être réécrits (avant le 25 oct. 2026, « 2025-02 » était écrit en dur dans quatre parcours).
// Depuis le 3 nov. 2026, la version suit l'interrupteur de l'IA (`FONCTIONS.ia ? 'avec IA' : 'sans IA'`) : on rend
// la valeur du build livré (IA éteinte), et la valeur « avec IA » sous le suffixe _IA (build de test de la dictée).
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'lib', 'cgu.js'), 'utf8');
const lire = (nom) => {
  const simple = source.match(new RegExp(`export const ${nom} = '([^']+)'`));
  if (simple) return { sansIa: simple[1], avecIa: simple[1] };
  const selonIa = source.match(new RegExp(`export const ${nom} = FONCTIONS\\.ia \\? '([^']+)' : '([^']+)'`));
  if (selonIa) return { sansIa: selonIa[2], avecIa: selonIa[1] };
  throw new Error(`${nom} introuvable dans src/lib/cgu.js`);
};
const version = lire('CGU_VERSION');
const date = lire('CGU_VERSION_DATE');

module.exports = {
  CGU_VERSION: version.sansIa, CGU_VERSION_DATE: date.sansIa,
  CGU_VERSION_IA: version.avecIa, CGU_VERSION_DATE_IA: date.avecIa,
};
