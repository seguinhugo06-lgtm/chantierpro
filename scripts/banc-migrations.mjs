/**
 * Banc d'essai des migrations sur un vrai PostgreSQL (PGlite, compilé en WebAssembly) — sans
 * Docker, sans toucher à la production.
 *
 * Pourquoi : les migrations s'appliquent à la main dans l'éditeur SQL Supabase. Une erreur de
 * syntaxe, ou une policy qui n'a pas l'effet voulu, ne se voyait qu'en production.
 *
 * Déroulé :
 *   1. socle Supabase simulé (scripts/banc/socle.mjs) = production supposée avant 071 ;
 *   2. toutes les migrations à partir de PREMIERE, dans l'ordre, puis REJOUÉES (idempotence) ;
 *   3. données de base, puis les vérifications de chaque migration (scripts/banc/NNN.mjs),
 *      exécutées en se faisant passer pour des utilisateurs (jeton JWT simulé, rôles réels).
 *
 * Une migration sans fichier de vérifications fait échouer le banc : écrire scripts/banc/NNN.mjs
 * (`npm run migration:nouvelle -- "description"` crée les deux fichiers).
 *
 * Usage : npm run banc:migrations      (code de sortie ≠ 0 au moindre échec)
 */
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SCHEMA, donneesDeBase, outils } from './banc/socle.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DEPOT = path.resolve(ICI, '../supabase/migrations');
const PREMIERE = 71; // la production est supposée à jour jusqu'à 070 inclus (voir docs/etat-production.md)

const db = new PGlite();
const t = outils(db);
await db.exec(SCHEMA);
console.log('Socle Supabase simulé prêt (production avant 071).');

const migrations = fs.readdirSync(DEPOT)
  .filter((f) => /^\d{3}_.+\.sql$/.test(f) && Number(f.slice(0, 3)) >= PREMIERE)
  .sort();

for (const passage of ['appliquée', 'rejouée sans erreur']) {
  for (const f of migrations) {
    try { await db.exec(fs.readFileSync(path.join(DEPOT, f), 'utf8')); t.ok(`migration ${f} ${passage}`); }
    catch (e) { t.ko(`migration ${f} (${passage === 'appliquée' ? 'application' : 'rejeu'})`, e); }
  }
}
await db.exec('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;');
await donneesDeBase(t);

const modules = [];
for (const f of migrations) {
  const numero = f.slice(0, 3);
  const fichier = path.join(ICI, 'banc', `${numero}.mjs`);
  if (!fs.existsSync(fichier)) { t.ko(`migration ${f} : aucune vérification (scripts/banc/${numero}.mjs)`); continue; }
  const m = await import(pathToFileURL(fichier).href);
  modules.push({ numero, ordre: m.ordre ?? Number(numero), verifier: m.verifier });
}
for (const m of modules.sort((a, b) => a.ordre - b.ordre)) {
  try { await m.verifier(t); }
  catch (e) { t.ko(`vérifications de ${m.numero} interrompues`, e); }
}

console.log(t.etat.echecs ? `\n${t.etat.echecs} ÉCHEC(S) sur ${t.etat.verifications} vérifications` : `\nTout est vert (${t.etat.verifications} vérifications).`);
process.exit(t.etat.echecs ? 1 : 0);
