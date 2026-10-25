// Version des conditions d'utilisation, lue dans src/lib/cgu.js (la source de l'app) : les parcours suivent sa hausse
// sans être réécrits (avant le 25 oct. 2026, « 2025-02 » était écrit en dur dans quatre parcours).
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'lib', 'cgu.js'), 'utf8');
const lire = (nom) => {
  const valeur = (source.match(new RegExp(`export const ${nom} = '([^']+)'`)) || [])[1];
  if (!valeur) throw new Error(`${nom} introuvable dans src/lib/cgu.js`);
  return valeur;
};

module.exports = { CGU_VERSION: lire('CGU_VERSION'), CGU_VERSION_DATE: lire('CGU_VERSION_DATE') };
