# CLAUDE.md — Règles projet ChantierPro (BatiGesti)

## Déploiement

- **Hébergement : Vercel** — PAS Netlify. Ne jamais utiliser `netlify-cli`. Ignorer `netlify.toml` (legacy).
- Le déploiement est automatique au push sur `main`.
- Vérifier le statut avec `npx vercel ls` (pas netlify).
- Domaine de production : `batigesti.fr`

## Stack technique

- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : Supabase (auth, DB, storage, Edge Functions)
- **Paiement** : Stripe (mode démo actuellement)
- **State** : Zustand (subscriptionStore, toastStore)
- **Icônes** : lucide-react
- **PWA** : vite-plugin-pwa + workbox
- **PDF** : 3 systèmes — `DevisPDF.jsx` (React PDF Renderer), `DevisPage.jsx` (HTML inline), `devisHtmlBuilder.js` (HTML builder réutilisable)

## Architecture

- SPA mono-page, navigation via `setPage('nom-page')` dans App.jsx
- Lazy loading avec `lazyWithRetry()` pour tous les composants de page
- Feature gating via `FeatureGuard` + `subscriptionStore.FEATURE_MIN_PLAN`
- 3 plans : Gratuit (0€), Artisan (14.90€/mois), Équipe (29.90€/mois)
- Mode démo avec `isDemo` flag (localStorage)

## Conventions

- Langue de l'UI : **français**
- Commits en anglais, messages de commit conventionnels (`feat:`, `fix:`, `refactor:`)
- Dark mode supporté partout via prop `isDark`
- Couleur accent configurable via prop `couleur` (défaut : `#f97316`)
- Composants dans `/src/components/{domaine}/`
- Stores dans `/src/stores/`
- Services/API dans `/src/services/`
- Utilitaires dans `/src/lib/`

## Build

- `npm run build` pour builder (Vite)
- `npm run dev` pour le dev server local
- Vérifier 0 erreurs avant push

## Points d'attention

- Ne jamais hardcoder "Pro" pour les plans — utiliser `PLANS[planId].name` ou `getMinPlanNameForFeature()`
- Les labels/certifications (RGE, Qualibat, etc.) sont dans `entreprise.labels[]`, pas dans des champs individuels
- `aiPrefill` est encore utilisé par le ChatInterface du Dashboard, ne pas le supprimer
- Le flux IA devis utilise un stepper 5 étapes inline (pas de modal, pas de changement de page)
