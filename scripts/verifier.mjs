#!/usr/bin/env node
/**
 * verifier — la chaîne de vérification unique de Mallettico.
 *
 *   npm run verifier                 # standard : tests, lint, smoke, build
 *   npm run verifier -- --rapide     # tests, lint, smoke (pendant le travail)
 *   npm run verifier -- --complet    # standard + banc de migrations + parcours + audit d'interface
 *
 * Pourquoi un seul outil : le projet a souffert de « pannes vertes » (un 200 OK, un build vert,
 * un « 0 résultat » qui mentaient). Chaque niveau dit exactement ce qui a été vérifié, et le
 * résultat est écrit dans audit-ui/derniere-verification.json : le garde-fou de livraison
 * (scripts/claude/garde.mjs) refuse un `git push` vers main si HEAD n'a pas été vérifié.
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = path.join(RACINE, 'audit-ui');
const niveau = process.argv.includes('--complet') ? 'complet' : process.argv.includes('--rapide') ? 'rapide' : 'standard';

const ETAPES = [
  { nom: 'Tests', cmd: 'npm', args: ['test'], niveaux: ['rapide', 'standard', 'complet'] },
  { nom: 'Lint (0 erreur)', cmd: 'npm', args: ['run', 'lint'], niveaux: ['rapide', 'standard', 'complet'] },
  { nom: 'Smoke', cmd: 'npm', args: ['run', 'smoke'], niveaux: ['rapide', 'standard', 'complet'] },
  { nom: 'Build', cmd: 'npm', args: ['run', 'build'], niveaux: ['standard', 'complet'] },
  { nom: 'Banc de migrations', cmd: 'npm', args: ['run', 'banc:migrations'], niveaux: ['complet'] },
  { nom: 'Parcours (navigateur)', cmd: 'npm', args: ['run', 'parcours'], niveaux: ['complet'] },
  { nom: 'Audit d’interface', cmd: 'node', args: ['scripts/audit-ui.cjs'], niveaux: ['complet'], defauts: true },
];

const git = (...a) => { try { return execFileSync('git', a, { cwd: RACINE, encoding: 'utf8' }).trim(); } catch { return ''; } };

function lancer({ cmd, args }) {
  return new Promise((resolve) => {
    const debut = Date.now();
    let sortie = '';
    const p = spawn(cmd, args, { cwd: RACINE, env: { ...process.env, FORCE_COLOR: '0' } });
    p.stdout.on('data', (d) => { sortie += d; });
    p.stderr.on('data', (d) => { sortie += d; });
    p.on('close', (code) => resolve({ code, sortie, duree: ((Date.now() - debut) / 1000).toFixed(1) }));
  });
}

const etapes = ETAPES.filter((e) => e.niveaux.includes(niveau));
const head = git('rev-parse', 'HEAD');
const propre = git('status', '--porcelain') === '';
const retard = git('rev-list', '--count', 'HEAD..origin/main');
console.log(`\nVérification « ${niveau} » de ${head.slice(0, 7)}${propre ? '' : ' (+ modifications non commitées)'}\n`);
if (retard && retard !== '0') console.log(`⚠  La branche a ${retard} commit(s) de retard sur origin/main : mettez-la à jour avant de livrer.\n`);

const resultats = [];
for (const e of etapes) {
  process.stdout.write(`  … ${e.nom}`);
  const r = await lancer(e);
  let ok = r.code === 0;
  let detail = '';
  if (e.defauts) {
    const m = r.sortie.match(/Total : (\d+) défaut/);
    if (m && Number(m[1]) > 0) { ok = false; detail = `${m[1]} défaut(s) — voir audit-ui/rapport.md`; }
  }
  if (e.nom.startsWith('Tests')) detail = (r.sortie.match(/Tests\s+(\d+ passed[^\n]*)/) || [])[1] || detail;
  if (e.nom.startsWith('Lint')) detail = (r.sortie.match(/✖ (\d+ problems \(\d+ errors?, \d+ warnings?\))/) || [])[1] || detail;
  process.stdout.write(`\r  ${ok ? '✓' : '✗'} ${e.nom} (${r.duree} s)${detail ? ` — ${detail}` : ''}\n`);
  resultats.push({ etape: e.nom, ok, duree: Number(r.duree), detail });
  if (!ok) {
    console.log('\n' + r.sortie.split('\n').filter(Boolean).slice(-25).map((l) => `      ${l}`).join('\n') + '\n');
  }
}

const reussi = resultats.every((r) => r.ok);
fs.mkdirSync(SORTIE, { recursive: true });
fs.writeFileSync(path.join(SORTIE, 'derniere-verification.json'), JSON.stringify({
  niveau, reussi, head, propre, date: new Date().toISOString(), resultats,
}, null, 1));
console.log(`\n${reussi ? '✓ Tout est vert' : '✗ Échec'} — niveau « ${niveau} »${propre ? '' : ' (arbre de travail modifié : commitez puis revérifiez avant de livrer)'}.`);
process.exit(reussi ? 0 : 1);
