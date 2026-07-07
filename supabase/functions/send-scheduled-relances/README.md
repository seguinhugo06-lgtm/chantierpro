# send-scheduled-relances

Relances **100 % automatiques** des factures/devis impayés (envoi programmé).

Parcourt chaque `entreprise` dont `relance_config.enabled = true`, détecte les
documents dont une relance est **due** aujourd'hui (portage fidèle de
`src/lib/relanceUtils.js`), et — si l'auto-envoi est activé — envoie l'email via
la fonction `send-email` (Resend) puis journalise dans `relance_executions`.

## Garde-fous (par ordre de sécurité)

1. **`dryRun` par défaut** — sans `dryRun:false` explicite, la fonction n'énumère
   que ce qui *serait* envoyé. Aucun email.
2. **`relance_config.autoSend === true` requis par entreprise** (OFF par défaut) —
   même en mode live, une entreprise qui n'a pas activé l'auto-envoi n'est jamais
   relancée automatiquement (elle garde l'envoi manuel en un clic).
3. **`cronSecret` requis** (secret partagé `CRON_SECRET`, déjà configuré dans les
   secrets Supabase) — protège les données clients contre tout appel externe.

## Tester en dry-run (aucun email)

```bash
curl -s -X POST "https://<PROJECT>.supabase.co/functions/v1/send-scheduled-relances" \
  -H "Content-Type: application/json" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -d '{"dryRun":true,"cronSecret":"<CRON_SECRET>"}'
```

La réponse contient un `diagnostics[]` (entonnoir par entreprise : docs impayés →
éligibles → dus) et, en live, `details[]` (envoyé/échoué/ignoré).

## Passer en production (étape d'activation, à faire APRÈS validation)

1. **Activer l'auto-envoi** pour une entreprise (ajouter `autoSend:true` dans son
   `relance_config`). Prévoir un interrupteur « Relances automatiques » dans
   Réglages → Relances (front) qui écrit ce flag.
2. **Programmer le cron quotidien** (pg_cron + pg_net) :

```sql
-- Extensions (une fois)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Tâche quotidienne à 08:00 (heure serveur)
select cron.schedule(
  'send-scheduled-relances-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT>.supabase.co/functions/v1/send-scheduled-relances',
    headers := jsonb_build_object('Content-Type','application/json'),
    body    := jsonb_build_object('dryRun', false, 'cronSecret', '<CRON_SECRET>')
  );
  $$
);
```

Pour arrêter : `select cron.unschedule('send-scheduled-relances-daily');`

> Le `CRON_SECRET` peut être stocké dans Supabase Vault plutôt qu'en clair dans la
> définition du cron ; le récupérer via `vault.decrypted_secrets` dans le `body`.
