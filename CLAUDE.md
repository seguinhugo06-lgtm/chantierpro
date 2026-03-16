# BatiGesti — SaaS gestion de chantiers BTP

## Commandes

```bash
npm run dev          # Dev server (port 5173)
npm run build        # Build production (DOIT passer sans erreurs)
npm run lint         # ESLint sur src/
npm run check        # Lint + build (vérification complète)
npm run smoke        # Smoke tests (imports, tables, orphelins, sécurité)
npm run setup-hooks  # Installe le pre-push hook
```

> **Pre-push hook** : vérifie automatiquement les imports critiques, noms de tables, secrets et build avant chaque `git push`. S'installe auto via `npm install` ou manuellement via `npm run setup-hooks`.

## Stack

React 18 + Vite 5 + Tailwind 3.4 | Supabase (auth, DB, Edge Functions, Storage) | Zustand | Vercel

## Architecture

- **SPA mono-page** : navigation via `setPage('nom')` dans App.jsx (pas de React Router)
- **Multi-tenant** : `organization_id` + RLS sur toutes les tables
- **Demo mode** : `isDemo` → localStorage au lieu de Supabase
- **3 plans** : `gratuit` / `artisan` / `equipe` (IDs identiques DB ↔ frontend)

## Structure

```
src/
├── components/     # Pages et UI (isDark, couleur props)
├── stores/         # Zustand stores (*Store.js)
├── hooks/          # Custom hooks (use*.js)
├── services/       # API services (*Service.js, *Api.js)
├── lib/            # Utilitaires (validation.js, sentry.js, queryHelper.js)
supabase/
├── functions/      # Edge Functions (Deno, action-dispatch pattern)
├── migrations/     # SQL migrations (numérotées 001-054)
```

## Points d'attention

- Dark mode : prop `isDark` + variables thème (`cardBg`, `inputBg`), **jamais** `dark:` Tailwind
- Couleur accent : prop `couleur` (hex) via `style` inline
- Icônes : `lucide-react` uniquement
- DB mapping : `fromSupabase()` / `toSupabase()` dans `useSupabaseSync.js`
- Erreurs : `captureException()` depuis `src/lib/sentry.js` (prod only)
- Edge Functions : toujours `corsHeaders` dans chaque réponse

## Règles détaillées

Voir `.claude/rules/` pour les conventions par domaine :
- @.claude/rules/code-style.md — Formatting, naming, validation
- @.claude/rules/supabase.md — Edge Functions, migrations, RLS, demo mode
- @.claude/rules/components.md — Props, dark mode, responsive, navigation
- @.claude/rules/subscriptions.md — Plans, gating, Stripe
- @.claude/rules/testing.md — Build, qualité, Sentry
- @.claude/rules/migrations.md — Migrations SQL (path: supabase/migrations/)
- @.claude/rules/edge-functions.md — Edge Functions Deno (path: supabase/functions/)

## Agents spécialisés

- @.claude/agents/code-reviewer.md — Revue de code (sécurité, patterns, qualité)
- @.claude/agents/debugger.md — Debugging (build, runtime, Supabase)
- @.claude/agents/feature-planner.md — Planification de features

## Skills (commandes)

- `/nouveau-composant NomPage` — Génère un composant avec tous les patterns
- `/migration description` — Crée une migration SQL complète
- `/audit-qualite` — Audit complet du code

## MCP Servers

- **GitHub** : issues, PRs, code review (auth via `/mcp`)
- **Sentry** : erreurs production, exceptions (auth via `/mcp`)
