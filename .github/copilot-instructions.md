## Purpose
Give concise, repository-specific guidance to AI coding agents working on ChantierPro (Vite + React SPA).

## Big picture
- Single-page React app bootstrapped with Vite: entry [src/main.jsx](src/main.jsx#L1).
- `src/App.jsx` is the central orchestrator: it manages auth, loads `clients` and `devis`, and routes UI between pages (dashboard, calendar, clients, devis, settings).
- Data persistence is via `src/supabaseClient.js` which wraps Supabase and provides localStorage "mock" fallbacks. The app toggles mock vs real based on `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Key files to read first
- `src/App.jsx` — single large file with core state, handlers and page composition.
- `src/supabaseClient.js` — wrappers: `auth`, `clientsDB`, `devisDB` (methods: `getAll`, `create`, `update`, `delete`). Look here for mock/localStorage keys and error handling.
- `src/DevisForm.jsx`, `src/ClientForm.jsx` — canonical form patterns and prop expectations.
- `src/components/*` — UI pages (DashboardPage, ClientsPage, DevisPage) showing expected shapes for `clients` and `devis` objects.
- `src/components/DevisPDF.jsx` and `src/DevisPDF.jsx` — dynamic import for PDF generation (note duplicate-sounding paths; prefer the component used by `App.jsx`).

## Data shapes & conventions (observed)
- Client objects: expect at least `{ id, nom, prenom, entreprise, email, telephone, adresse }`.
- Devis objects: fields appear in both snake_case and camelCase across code (e.g. `client_id` vs `clientId`, `total_ht` vs `totalHT`/`totalTTC`). When modifying persistence or UI code, normalize carefully or keep conversion layers.
- LocalStorage mock keys: `cp_clients`, `cp_devis`, `cp_mock_user`, `cp_events` — tests and local runs use these.

## Runtime & developer workflows
- Install deps and run dev server:

  npm install
  npm run dev

- Build / preview: `npm run build` and `npm run preview` (Vite standard).
- To force mock/local mode, unset `VITE_SUPABASE_URL` or leave it undefined in your environment; `supabaseClient.js` logs mode at startup.

## Common patterns & gotchas for agents
- App-wide state is centralized in `src/App.jsx`. Prefer incremental, minimal changes there — it's sensitive and large.
- Use the `clientsDB` / `devisDB` helpers rather than direct Supabase calls to keep mock behavior consistent.
- Watch for inconsistent field naming between DB layer and UI. Example: the UI may read `d.clientId` while DB writes `client_id`. Add small adapter helpers when necessary.
- PDF export is dynamically imported in `App.jsx` via `import('./components/DevisPDF')`; ensure exports match (`downloadDevisPDF`).
- Styling is mixed (inline style objects in `App.jsx` and Tailwind classes in `components/*`). Avoid large-scale style refactors without validating both approaches.

## Example snippets (how to interact with wrappers)
- Read all clients: `const { data, error } = await clientsDB.getAll()` (returns mock/local or Supabase result).
- Create a devis (use the existing pattern in `App.jsx` to keep numbering logic consistent).

## When writing code changes
- Keep changes minimal and localized; `App.jsx` centralizes many behaviors — split logic into new small modules if adding features.
- Add tests or a manual checklist when touching persistence: verify both mock (localStorage) and real Supabase paths.
- Preserve existing user metadata usage: `user.user_metadata.entreprise` is used for branding in the UI.

## Where to look for more context
- Project manifest: [package.json](package.json#L1) (scripts and deps).
- Entry/boot: [src/main.jsx](src/main.jsx#L1) and [src/App.jsx](src/App.jsx#L1).
- DB wrapper & mock logic: [src/supabaseClient.js](src/supabaseClient.js#L1).

If anything in this summary is unclear or you'd like extra examples (adapters for snake_case↔camelCase, or a small refactor to split `App.jsx`), tell me which area to expand.
