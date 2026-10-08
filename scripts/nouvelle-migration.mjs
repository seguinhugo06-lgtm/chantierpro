#!/usr/bin/env node
/**
 * Crée la migration suivante et son fichier de vérifications au banc.
 *
 *   npm run migration:nouvelle -- "ajout table photos chantier"
 *   → supabase/migrations/076_ajout_table_photos_chantier.sql   (gabarit idempotent, RLS, contrôles)
 *   → scripts/banc/076.mjs                                      (vérifications à écrire)
 *
 * Puis : écrire le SQL, écrire les vérifications, `npm run banc:migrations`, et noter la migration
 * « à appliquer » dans docs/etat-production.md. Ne JAMAIS l'appliquer en production soi-même.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const description = process.argv.slice(2).join(' ').trim();
if (!description) { console.error('Usage : npm run migration:nouvelle -- "description courte"'); process.exit(1); }

const dossier = path.join(RACINE, 'supabase/migrations');
const dernier = Math.max(...fs.readdirSync(dossier).filter((f) => /^\d{3}_/.test(f)).map((f) => Number(f.slice(0, 3))));
const numero = String(dernier + 1).padStart(3, '0');
const slug = description.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);
const sql = path.join(dossier, `${numero}_${slug}.sql`);
const banc = path.join(RACINE, 'scripts/banc', `${numero}.mjs`);

fs.writeFileSync(sql, `-- ============================================================
-- Migration ${numero}: ${description}
-- ============================================================
-- Pourquoi : <le problème constaté, avec sa preuve (requête, capture, retour utilisateur)>
-- Effet : <ce qui change pour l'utilisateur>
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   <requête de contrôle + résultat attendu>
-- ============================================================

-- Idempotente : IF NOT EXISTS / DROP ... IF EXISTS / CREATE OR REPLACE ; rejouable sans danger.
-- Toute nouvelle table : user_id + organization_id, RLS activé, policies, index.

-- CREATE TABLE IF NOT EXISTS public.ma_table (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
--   organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
--   created_at TIMESTAMPTZ DEFAULT now(),
--   updated_at TIMESTAMPTZ DEFAULT now()
-- );
-- ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users manage own rows" ON public.ma_table;
-- CREATE POLICY "Users manage own rows" ON public.ma_table FOR ALL TO authenticated
--   USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- CREATE INDEX IF NOT EXISTS idx_ma_table_user_id ON public.ma_table(user_id);
`);

fs.writeFileSync(banc, `// Vérifications de la migration ${numero} : ${description}
// Se faire passer pour un utilisateur : en(uid, () => q(...)) ; pour un visiteur : commeAnonyme(() => q(...)).
// Vérifier l'EFFET (ce qu'un utilisateur peut ou ne peut pas faire), pas seulement l'existence des objets.
import { PATRON, SALARIE, SOLO } from './socle.mjs';

export async function verifier({ q, en, commeAnonyme, compte, verifier, ko }) {
  ko('${numero} : vérifications à écrire');
}
`);

console.log(`Créés :\n  ${path.relative(RACINE, sql)}\n  ${path.relative(RACINE, banc)}\n
Ensuite : écrire le SQL et les vérifications → npm run banc:migrations → noter « ${numero} à appliquer » dans docs/etat-production.md.`);
