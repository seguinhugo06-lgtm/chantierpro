#!/usr/bin/env node
/**
 * Assemble la page du Pilote depuis ses sources versionnées (scripts/pilote/page/) :
 *   squelette.html + styles.css + logo.svg + contenu.js (jalons, étapes, fiches, repères) + app.js
 *
 *   npm run pilote:page              → audit-ui/pilote/pilote.html (à publier : Artifact, url du Pilote)
 *   npm run pilote:page -- --banc    → aussi audit-ui/pilote-banc/index.html : la page + une fausse base
 *                                      en mémoire (banc/faux-claude.js), pour l'essayer dans le navigateur
 *                                      (serveur : node scripts/pilote/banc/serveur.cjs, port 4777)
 *
 * Contrôles avant d'écrire : syntaxe du script assemblé, ids d'étapes uniques, dépendances et jalons
 * existants, taille. Une page qui ne passe pas n'est pas écrite.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (...x) => path.join(RACINE, 'scripts/pilote', ...x);
const lire = (f) => fs.readFileSync(f, 'utf8');

const contenu = lire(P('page/contenu.js'));
const app = lire(P('page/app.js'));
const page = lire(P('page/squelette.html'))
  .replace('/*@@STYLES@@*/', () => lire(P('page/styles.css')))
  .replace('<!--@@LOGO@@-->', () => lire(P('page/logo.svg')).trim())
  .replace('/*@@CONTENU@@*/', () => contenu)
  .replace('/*@@APP@@*/', () => app);
if (/@@[A-Z]+@@/.test(page)) throw new Error('Un emplacement du squelette n’a pas été rempli.');

// Contrôles : le script assemblé se charge, et le contenu est cohérent.
const tmp = path.join(RACINE, 'audit-ui/pilote/.verif-page.cjs');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
const script = page.slice(page.indexOf('<script>') + 8, page.lastIndexOf('</script>'));
fs.writeFileSync(tmp, script);
execFileSync('node', ['--check', tmp], { stdio: 'inherit' });
const donnees = new Function(`${contenu}\nreturn { JALONS, ETAPES, PLUS_TARD, FICHES, vueReperes };`)();
const erreurs = [];
const ids = new Set();
for (const e of donnees.ETAPES) {
  if (ids.has(e.id)) erreurs.push(`id en double : ${e.id}`);
  ids.add(e.id);
  if (!donnees.JALONS.some((j) => j.id === e.jalon)) erreurs.push(`${e.id} : jalon inconnu ${e.jalon}`);
  for (const d of e.deps || []) if (!donnees.ETAPES.some((x) => x.id === d)) erreurs.push(`${e.id} : dépendance inconnue ${d}`);
  for (const champ of ['titre', 'action', 'pourquoi', 'fait']) if (!e[champ]) erreurs.push(`${e.id} : champ « ${champ} » vide`);
}
for (const j of donnees.JALONS) if (!j.sortie) erreurs.push(`jalon ${j.id} sans condition de sortie`);
if (typeof donnees.vueReperes !== 'function') erreurs.push('vueReperes absente de contenu.js');
fs.rmSync(tmp, { force: true });
if (erreurs.length) { console.error('✗ Contenu incohérent :\n  ' + erreurs.join('\n  ')); process.exit(1); }

const sortie = path.join(RACINE, 'audit-ui/pilote/pilote.html');
fs.writeFileSync(sortie, page);
console.log(`✓ ${path.relative(RACINE, sortie)} — ${(page.length / 1024).toFixed(0)} Ko, ${donnees.JALONS.length} jalons, ${donnees.ETAPES.length} étapes, ${donnees.PLUS_TARD.length} « plus tard », ${donnees.FICHES.length} fiches`);

if (process.argv.includes('--banc')) {
  const banc = path.join(RACINE, 'audit-ui/pilote-banc/index.html');
  fs.mkdirSync(path.dirname(banc), { recursive: true });
  fs.writeFileSync(banc, '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + `<script>${lire(P('banc/faux-claude.js'))}</script></head><body>${page}</body></html>`);
  console.log(`✓ ${path.relative(RACINE, banc)} (fausse base en mémoire : window.__semer(chemin, données), window.__fauxDocs)`);
}
