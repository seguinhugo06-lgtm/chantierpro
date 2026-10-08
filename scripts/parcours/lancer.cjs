#!/usr/bin/env node
/**
 * Parcours — scénarios navigateur qui rejouent les chemins critiques de l'app, comme un artisan.
 *
 *   npm run build && npm run parcours            # tous les parcours
 *   npm run parcours -- connexion                 # ceux dont le nom contient « connexion »
 *
 * Chaque fichier de ce dossier (hors lancer.cjs) exporte une liste de parcours :
 *   module.exports = [{ nom, reel?, async executer({ ouvrir, cliquer, saisir, attendre, verifier }) }]
 * `reel: true` = build « réel simulé » (fausse URL Supabase, réponses contrôlées par le parcours).
 * Un parcours échoue s'il lève une erreur ou si `verifier(condition, message)` est faux.
 *
 * Pourquoi : un test unitaire vert ne dit pas qu'un artisan voit la mention TVA sur son devis,
 * ni qu'une modale couvre l'écran. Ces parcours le vérifient pour de vrai, à chaque livraison.
 */
const fs = require('fs');
const path = require('path');
const outils = require('../lib/navigateur.cjs');

const filtre = process.argv[2] || '';
const fichiers = fs.readdirSync(__dirname).filter((f) => f.endsWith('.cjs') && f !== 'lancer.cjs').sort();
const parcours = fichiers.flatMap((f) => require(path.join(__dirname, f)).map((p) => ({ ...p, fichier: f })))
  .filter((p) => !filtre || p.nom.includes(filtre) || p.fichier.includes(filtre));

(async () => {
  let distReel = null;
  if (parcours.some((p) => p.reel)) {
    process.stdout.write('  … build « réel simulé » (fausse URL Supabase)');
    distReel = outils.construireDistReel();
    process.stdout.write('\r  ✓ build « réel simulé » prêt                     \n');
  }
  let echecs = 0;
  for (const p of parcours) {
    const debut = Date.now();
    const navigateurs = [];
    const verifs = [];
    const ctx = {
      ...outils,
      ouvrir: async (o = {}) => {
        const n = await outils.ouvrir({ ...o, distReel: o.reel ? distReel : undefined });
        navigateurs.push(n);
        return n;
      },
      verifier: (condition, message) => {
        verifs.push(message);
        if (!condition) throw new Error(`Vérification échouée : ${message}`);
      },
    };
    try {
      await p.executer(ctx);
      const erreursJs = navigateurs.flatMap((n) => n.erreurs);
      if (erreursJs.length) throw new Error(`Erreur JavaScript dans la page : ${erreursJs[0]}`);
      console.log(`  ✓ ${p.nom} (${((Date.now() - debut) / 1000).toFixed(1)} s, ${verifs.length} vérifications)`);
    } catch (e) {
      echecs++;
      console.log(`  ✗ ${p.nom} — ${e.message}`);
      const n = navigateurs[navigateurs.length - 1];
      if (n) {
        const capture = path.join(outils.RACINE, 'audit-ui', `parcours-echec-${p.nom.replace(/\W+/g, '-')}.png`);
        fs.mkdirSync(path.dirname(capture), { recursive: true });
        await n.page.screenshot({ path: capture }).catch(() => {});
        console.log(`      capture : ${path.relative(outils.RACINE, capture)}`);
      }
    } finally {
      for (const n of navigateurs) await n.browser.close().catch(() => {});
    }
  }
  console.log(`\n${echecs ? `✗ ${echecs} parcours en échec` : `✓ ${parcours.length} parcours réussis`}`);
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
