#!/usr/bin/env node
/**
 * Hook PostToolUse (Write|Edit) : lint immédiat du fichier JS/JSX que Claude vient de modifier.
 * Les ERREURS ESLint (pas les avertissements) sont renvoyées à Claude (code 2) pour qu'il corrige
 * tout de suite, au lieu de les découvrir au moment de livrer.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let entree = '';
for await (const morceau of process.stdin) entree += morceau;
let fichier;
try { fichier = JSON.parse(entree)?.tool_input?.file_path; } catch { process.exit(0); }
const RACINE = process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (!fichier || !/\.(js|jsx)$/.test(fichier)) process.exit(0);
const relatif = path.relative(RACINE, fichier);
if (relatif.startsWith('..') || !relatif.startsWith('src' + path.sep) || !fs.existsSync(fichier)) process.exit(0);

const eslint = path.join(RACINE, 'node_modules/.bin/eslint');
if (!fs.existsSync(eslint)) process.exit(0);
const r = spawnSync(eslint, ['--format', 'json', fichier], { cwd: RACINE, encoding: 'utf8', timeout: 25000 });
let resultats;
try { resultats = JSON.parse(r.stdout); } catch { process.exit(0); }
const erreurs = (resultats[0]?.messages || []).filter((m) => m.severity === 2);
if (!erreurs.length) process.exit(0);
process.stderr.write(`ESLint : ${erreurs.length} erreur(s) dans ${relatif} — à corriger maintenant :\n`
  + erreurs.slice(0, 10).map((m) => `  ligne ${m.line}:${m.column}  ${m.message}  (${m.ruleId || 'syntaxe'})`).join('\n') + '\n');
process.exit(2);
