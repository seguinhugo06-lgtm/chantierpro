# BatiGesti — Règles projet

## Commandes essentielles

```bash
npm run dev          # Dev server (Vite, port 5173)
npm run build        # Build prod — vérifier 0 erreurs avant push
```

## Stack

- **Frontend**: React 18 + Vite 5 + Tailwind CSS
- **Backend**: Supabase (auth, PostgreSQL, storage, Edge Functions en Deno/TypeScript)
- **State**: Zustand (`subscriptionStore`, `toastStore`) + React Context (`DataContext`, `AppContext`)
- **Paiement**: Stripe (checkout + webhooks)
- **PDF**: `devisHtmlBuilder.js` (principal) + `DevisPDF.jsx` (React PDF Renderer) + Factur-X (`facturx-pdf.js`)
- **PWA**: vite-plugin-pwa + workbox (offline-first)
- **Icônes**: lucide-react uniquement
- **Monitoring**: Sentry (prod, `VITE_SENTRY_DSN`) + Plausible Analytics

## Architecture

- SPA mono-page — navigation via `setPage('nom-page')` dans `App.jsx`
- Lazy loading avec `lazyWithRetry()` pour tous les composants de page
- Feature gating : `<FeatureGuard feature="tresorerie">` + `subscriptionStore`
- 3 plans : **Gratuit** (0€) / **Artisan** (14,90€/mois) / **Équipe** (29,90€/mois)
- Mode démo : `isDemo` flag → localStorage au lieu de Supabase
- Multi-tenant via `organization_id` + RLS policies sur toutes les tables
- Edge Functions : pattern action-dispatch (`{ action: 'sync' | 'validate' | ... }`)

## Conventions critiques

- Langue UI : **français** — commits en **anglais** (`feat:`, `fix:`, `refactor:`)
- Dark mode : prop `isDark` sur tous les composants
- Couleur accent : prop `couleur` (défaut `#f97316`)
- DB mapping : `fromSupabase()`/`toSupabase()` pour snake_case ↔ camelCase
- Plans : ne jamais hardcoder les noms — utiliser `PLANS[planId].name`
- Validation : utiliser `src/lib/validation.js` (`useFormValidation` hook)

## Structure fichiers

```
src/
├── components/{domaine}/   # UI (Chantiers/, DevisPage.jsx, etc.)
├── stores/                 # Zustand (subscriptionStore.js)
├── services/               # API clients (syncService.js, webhookService.js)
├── lib/                    # Utilitaires (validation.js, facturx.js, analytics.js)
├── context/                # React Context (DataContext, AppContext, OrgContext)
├── hooks/                  # Custom hooks (usePermissions, useFormValidation)
supabase/
├── migrations/             # SQL migrations (054 max)
├── functions/              # Edge Functions (Deno TypeScript)
```

## Points d'attention

- `aiPrefill` est utilisé par ChatInterface du Dashboard — ne pas supprimer
- Labels/certifications → `entreprise.labels[]` (pas de champs individuels)
- Flux IA devis = stepper 5 étapes inline (pas de modal)
- Déploiement = **Vercel** (PAS Netlify) — auto-deploy au push sur `main`
- Domaine prod : `batigesti.fr`

## Règles détaillées

Voir `.claude/rules/` pour les conventions par domaine :
- @.claude/rules/code-style.md — conventions de code
- @.claude/rules/supabase.md — patterns Supabase & Edge Functions
- @.claude/rules/components.md — patterns composants React
- @.claude/rules/subscriptions.md — système d'abonnements
- @.claude/rules/testing.md — tests et qualité
