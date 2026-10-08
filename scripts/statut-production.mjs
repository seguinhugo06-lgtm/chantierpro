#!/usr/bin/env node
/**
 * statut-production — un commit est-il VRAIMENT en production ?
 *
 *   npm run statut                 # HEAD
 *   npm run statut -- 63d79d1      # un commit précis
 *
 * Attend (15 min au plus) que les deux déploiements Vercel ET la CI GitHub « Vérifications »
 * aient un verdict, puis l'affiche. Code de sortie 0 seulement si tout est vert.
 * Ne JAMAIS vérifier un déploiement en rechargeant le site : le service worker sert l'ancienne version.
 */
import { execFileSync } from 'node:child_process';

const DEPOT = 'seguinhugo06-lgtm/chantierpro';
// SHA complet : `gh run list --commit` ne reconnaît pas les SHA abrégés.
const sha = execFileSync('git', ['rev-parse', process.argv[2] || 'HEAD'], { encoding: 'utf8' }).trim();
const gh = (...a) => JSON.parse(execFileSync('gh', a, { encoding: 'utf8' }));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

let vercel = null;
let ci = null;
for (let i = 0; i < 90; i++) {
  const statut = gh('api', `repos/${DEPOT}/commits/${sha}/status`);
  if (statut.statuses.length >= 2 && statut.state !== 'pending') vercel = statut;
  const runs = gh('run', 'list', '--repo', DEPOT, '--commit', sha, '--workflow', 'verifications.yml', '--json', 'status,conclusion,url,databaseId');
  if (runs.length && runs[0].status === 'completed') ci = runs[0];
  if (vercel && (ci || i > 60)) break;
  if (i === 0) process.stdout.write(`Attente des verdicts pour ${sha.slice(0, 7)}`);
  process.stdout.write('.');
  await pause(10000);
}
console.log('');
const lignes = [];
let vert = true;
if (!vercel) { vert = false; lignes.push('✗ Vercel : pas de verdict après 15 min'); }
else {
  for (const s of vercel.statuses) {
    if (s.state !== 'success') vert = false;
    lignes.push(`${s.state === 'success' ? '✓' : '✗'} ${s.context} : ${s.state} — ${s.description}`);
  }
}
if (!ci) { vert = false; lignes.push('✗ CI « Vérifications » : pas de verdict (workflow absent ou trop long)'); }
else {
  if (ci.conclusion !== 'success') vert = false;
  lignes.push(`${ci.conclusion === 'success' ? '✓' : '✗'} CI « Vérifications » : ${ci.conclusion} — ${ci.url}`);
}
console.log(lignes.join('\n'));
console.log(vert ? `\n✓ ${sha.slice(0, 7)} est en production, CI verte.` : `\n✗ ${sha.slice(0, 7)} : à examiner avant de dire « livré ».`);
process.exit(vert ? 0 : 1);
