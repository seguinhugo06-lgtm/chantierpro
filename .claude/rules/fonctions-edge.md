---
paths:
  - "supabase/functions/**"
---

# Fonctions Edge (Deno)

- Imports Deno/esm.sh uniquement ; `corsHeaders` (`../_shared/cors.ts`) dans CHAQUE réponse, y compris les erreurs ; `Content-Type: application/json` ; préfixe de log `[NOM]`.
- **La clé anon est publique** : vérifier l'appelant (jeton utilisateur → `auth.getUser()`, ou secret partagé, ou possession d'un jeton opaque à durée limitée). Une fonction qui envoie des e-mails ou écrit en base sans vérification est un relais ouvert (cas vécu : `send-email`).
- Clé de service seulement côté serveur, jamais renvoyée. Secrets : `Deno.env.get()`.
- Webhooks Stripe : vérifier la signature ; répondre **500** si l'écriture en base échoue (Stripe rejoue), 200 seulement quand c'est enregistré ou sans objet. Idempotence (upsert, `events_log`).
- `UPDATE` sans ligne touchée ne lève pas : demander `.select()` et contrôler le nombre de lignes.
- Le déploiement est fait par Hugo (`npx supabase functions deploy <nom> --project-ref kofsbgxkrmryfetevetn`, `--no-verify-jwt` pour les webhooks) : après modification, noter la fonction « à redéployer » dans `docs/etat-production.md`.
- Toute fonction appelée par le front doit exister dans ce dossier (le smoke le vérifie).
