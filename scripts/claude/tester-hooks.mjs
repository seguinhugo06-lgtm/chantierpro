#!/usr/bin/env node
/**
 * Teste les hooks Claude du projet avec des entrées simulées (comme Claude Code les envoie).
 *   npm run hooks:tester
 * À relancer après toute modification de scripts/claude/ ou de .claude/settings.json.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = { ...process.env, CLAUDE_PROJECT_DIR: RACINE };
let echecs = 0;
const lancer = (script, entree) => spawnSync('node', [path.join(RACINE, 'scripts/claude', script)], { input: JSON.stringify(entree), env, encoding: 'utf8', cwd: RACINE });
const decision = (r) => { try { return JSON.parse(r.stdout).hookSpecificOutput.permissionDecision; } catch { return 'allow'; } };
const cas = (nom, ok) => { if (!ok) echecs++; console.log(`  ${ok ? '✓' : '✗'} ${nom}`); };

// garde.mjs
const garde = (commande) => decision(lancer('garde.mjs', { tool_input: { command: commande } }));
cas('db push interdit', garde('npx supabase db push') === 'deny');
cas('db reset interdit', garde('supabase db reset --linked') === 'deny');
cas('push forcé interdit', garde('git push -f origin HEAD:main') === 'deny');
cas('push --force-with-lease interdit', garde('git push --force-with-lease origin HEAD:main') === 'deny');
cas('reset --hard soumis à confirmation', garde('git reset --hard HEAD~1') === 'ask');
cas('commande ordinaire autorisée', garde('npm test') === 'allow');
cas('push d’une autre branche non concerné', garde('git push origin HEAD:refs/heads/essai') === 'allow');

// Livraison : dépend de audit-ui/derniere-verification.json — on simule les cas, puis on restaure.
const fichierVerif = path.join(RACINE, 'audit-ui/derniere-verification.json');
const sauvegarde = fs.existsSync(fichierVerif) ? fs.readFileSync(fichierVerif, 'utf8') : null;
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: RACINE, encoding: 'utf8' }).stdout.trim();
const propre = spawnSync('git', ['status', '--porcelain'], { cwd: RACINE, encoding: 'utf8' }).stdout.trim() === '';
fs.mkdirSync(path.dirname(fichierVerif), { recursive: true });
try {
  fs.writeFileSync(fichierVerif, JSON.stringify({ niveau: 'standard', reussi: false, head, propre: true }));
  cas('livraison refusée si vérification rouge', garde('git push origin HEAD:main') === 'deny');
  fs.writeFileSync(fichierVerif, JSON.stringify({ niveau: 'rapide', reussi: true, head, propre: true }));
  cas('livraison refusée si vérification seulement rapide', garde('git push origin HEAD:main') === 'deny');
  fs.writeFileSync(fichierVerif, JSON.stringify({ niveau: 'standard', reussi: true, head: '0'.repeat(40), propre: true }));
  cas('livraison refusée si la vérification porte sur un autre commit', garde('git push origin HEAD:main') === 'deny');
  fs.writeFileSync(fichierVerif, JSON.stringify({ niveau: 'standard', reussi: true, head, propre: true }));
  const attendu = propre ? 'allow' : 'deny';
  cas(`livraison ${propre ? 'autorisée après vérification verte du commit' : 'refusée tant que l’arbre est modifié'}`, garde('git push origin HEAD:main') === attendu);
} finally {
  if (sauvegarde === null) fs.rmSync(fichierVerif, { force: true }); else fs.writeFileSync(fichierVerif, sauvegarde);
}

// lint-fichier.mjs
const temporaire = path.join(RACINE, 'src', '__hook_lint_test__.js');
try {
  fs.writeFileSync(temporaire, 'export const a = () => { try { return 1; } catch (e) {} };\n');
  const r = lancer('lint-fichier.mjs', { tool_name: 'Write', tool_input: { file_path: temporaire } });
  cas('lint : erreur renvoyée à Claude (code 2)', r.status === 2 && /no-empty/.test(r.stderr));
  fs.writeFileSync(temporaire, 'export const a = () => 1;\n');
  cas('lint : fichier propre silencieux', lancer('lint-fichier.mjs', { tool_input: { file_path: temporaire } }).status === 0);
  cas('lint : fichier hors src ignoré', lancer('lint-fichier.mjs', { tool_input: { file_path: path.join(RACINE, 'CLAUDE.md') } }).status === 0);
} finally {
  fs.rmSync(temporaire, { force: true });
}

// debut-session.mjs
const debut = spawnSync('node', [path.join(RACINE, 'scripts/claude/debut-session.mjs')], { env, encoding: 'utf8', cwd: RACINE, timeout: 15000 });
cas('début de session : contexte produit', debut.status === 0 && debut.stdout.includes('Mallettico — état au démarrage'));

// statusline.sh
const ligne = spawnSync('sh', [path.join(RACINE, 'scripts/claude/statusline.sh')], { env, encoding: 'utf8', cwd: RACINE, input: '{}' });
cas(`ligne d’état : « ${ligne.stdout.trim()} »`, ligne.status === 0 && ligne.stdout.startsWith('Mallettico'));

console.log(echecs ? `\n✗ ${echecs} cas en échec` : '\n✓ Hooks conformes');
process.exit(echecs ? 1 : 0);
