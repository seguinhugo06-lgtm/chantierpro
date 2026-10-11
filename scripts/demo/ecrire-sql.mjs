/**
 * Écrit le SQL du compte démo (voir generer-sql.mjs) :
 *   npx vite-node scripts/demo/ecrire-sql.mjs [--sortie audit-ui/demo/compte-demo.sql]
 * Le fichier est ensuite appliqué en production (connecteur Supabase), puis l'effet constaté.
 */
import fs from 'node:fs';
import path from 'node:path';
import { genererSql } from './generer-sql.mjs';

const i = process.argv.indexOf('--sortie');
const sortie = i > 0 ? process.argv[i + 1] : 'audit-ui/demo/compte-demo.sql';
fs.mkdirSync(path.dirname(sortie), { recursive: true });
const sql = genererSql();
fs.writeFileSync(sortie, `${sql}\n`);
console.log(`${sortie} : ${sql.split('\n').filter((l) => l.trim().startsWith('INSERT')).length} insertions, ${(sql.length / 1024).toFixed(0)} Ko`);
