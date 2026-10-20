/**
 * `PLANS`, `PLAN_ORDER` et l'outil de prix des abonnements, lus dans le code de l'application pour les parcours :
 * jamais recopiés dans un parcours.
 *
 * `src/stores/subscriptionStore.js` importe `zustand` et `../lib/fonctions` sans extension : Node ne lirait pas ce
 * module tel quel. esbuild (déjà là pour Vite) le regroupe, on l'évalue.
 */
const path = require('path');

/** Regroupe un module de `src/` et rend ses exports. */
function charger(RACINE, ...chemin) {
  const esbuild = require(require.resolve('esbuild', { paths: [RACINE] }));
  const sortie = esbuild.buildSync({
    entryPoints: [path.join(RACINE, ...chemin)],
    bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', sortie.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
}

/** `PLANS`, `PLAN_ORDER`, `MENTION_TVA_ABONNEMENT` et `prixAbonnement` de l'application. */
function plansDuSite(RACINE) {
  const { PLANS, PLAN_ORDER } = charger(RACINE, 'src', 'stores', 'subscriptionStore.js');
  const { MENTION_TVA_ABONNEMENT, prixAbonnement } = charger(RACINE, 'src', 'stores', 'prixAbonnement.js');
  return { PLANS, PLAN_ORDER, MENTION_TVA_ABONNEMENT, prixAbonnement };
}

module.exports = { plansDuSite };
