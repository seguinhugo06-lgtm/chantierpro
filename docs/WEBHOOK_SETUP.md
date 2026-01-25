# Configuration des Webhooks et Edge Functions

Ce guide explique comment configurer les webhooks de base de donnees et les Edge Functions pour les notifications automatiques.

## Architecture

```
[Database Change] --> [Database Webhook] --> [Edge Function] --> [SMS/Email]
                                                              --> [Events Log]
                                                              --> [AI Suggestions]
```

## 1. Deployer la Edge Function

```bash
# Depuis la racine du projet
cd supabase/functions

# Deployer la fonction
supabase functions deploy handle-db-events
```

## 2. Configurer les Variables d'Environnement

Dans le dashboard Supabase > Project Settings > Edge Functions > Secrets:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx

SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@chantierpro.fr
SENDGRID_FROM_NAME=ChantierPro

APP_URL=https://app.chantierpro.fr
```

## 3. Creer les Database Webhooks

Dans le dashboard Supabase > Database > Webhooks:

### Webhook 1: Devis Events

- **Name:** `devis-events`
- **Table:** `devis`
- **Events:** `INSERT`, `UPDATE`
- **Type:** `Supabase Edge Functions`
- **Function:** `handle-db-events`
- **HTTP Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

### Webhook 2: Chantiers Events

- **Name:** `chantiers-events`
- **Table:** `chantiers`
- **Events:** `UPDATE`
- **Type:** `Supabase Edge Functions`
- **Function:** `handle-db-events`

### Webhook 3: Photos Events

- **Name:** `photos-events`
- **Table:** `chantier_photos`
- **Events:** `INSERT`
- **Type:** `Supabase Edge Functions`
- **Function:** `handle-db-events`

## 4. Appliquer la Migration

Copier le contenu de `supabase/migrations/006_events_log.sql` dans le SQL Editor et executer.

Cela cree:
- Table `events_log` pour le suivi des evenements
- Table `ai_suggestions` pour les suggestions automatiques
- Colonne `last_photo_at` sur `chantiers`
- Colonnes `notification_sent` et `notification_sent_at` sur `devis`

## Events Geres

| Table | Event | Action |
|-------|-------|--------|
| devis | INSERT (statut='envoye') | SMS + Email au client |
| devis | UPDATE -> 'envoye' | SMS + Email au client |
| devis | UPDATE -> 'accepte' | SMS + Email + Suggestion conversion facture |
| devis | UPDATE -> 'payee' (facture) | SMS + Email confirmation paiement |
| chantiers | UPDATE -> 'en_cours' | SMS + Email demarrage |
| chantiers | UPDATE -> 'termine' | SMS + Email + Suggestion facture finale |
| chantier_photos | INSERT | Update last_photo_at, recap email si multiple de 5 |

## Tester les Webhooks

### Via curl

```bash
# Tester l'Edge Function directement
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/handle-db-events' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "UPDATE",
    "table": "devis",
    "schema": "public",
    "record": {
      "id": "test-uuid",
      "statut": "envoye",
      "type": "devis"
    },
    "old_record": {
      "id": "test-uuid",
      "statut": "brouillon",
      "type": "devis"
    }
  }'
```

### Via le Dashboard

1. Aller dans Database > Webhooks
2. Cliquer sur le webhook
3. Utiliser "Test webhook" avec un payload d'exemple

## Logs et Debug

### Voir les logs de la Edge Function

```bash
supabase functions logs handle-db-events
```

### Voir les events logs dans la base

```sql
SELECT * FROM events_log ORDER BY triggered_at DESC LIMIT 20;
```

### Voir les suggestions generees

```sql
SELECT * FROM ai_suggestions WHERE NOT is_dismissed ORDER BY created_at DESC;
```

## Fallback: Real-time Subscriptions

Si les webhooks ne sont pas disponibles, utiliser les subscriptions real-time dans le client:

```javascript
import { setupRealtimeSubscriptions } from '@/lib/eventTriggers';

// Dans App.jsx ou un contexte d'authentification
useEffect(() => {
  const unsubscribe = setupRealtimeSubscriptions();
  return () => unsubscribe();
}, []);
```

## Fallback: Polling

Si le real-time n'est pas disponible:

```javascript
import { startPolling } from '@/lib/eventTriggers';

// Demarrer le polling (verif toutes les 30s)
const stopPolling = startPolling();

// Arreter quand necessaire
stopPolling();
```

## Troubleshooting

### Les notifications ne partent pas

1. Verifier les variables d'environnement (TWILIO_*, SENDGRID_*)
2. Verifier les logs: `supabase functions logs handle-db-events`
3. Verifier que le client a un email/telephone valide

### Les webhooks ne se declenchent pas

1. Verifier que le webhook est actif dans le dashboard
2. Verifier que la table et les events sont corrects
3. Tester manuellement avec curl

### Erreur CORS

Les headers CORS sont configures dans `_shared/cors.ts`. Si probleme, verifier que le domaine est autorise.

## Structure des Fichiers

```
supabase/
  functions/
    _shared/
      cors.ts              # Headers CORS
      communications.ts    # SMS/Email utilities
    handle-db-events/
      index.ts             # Main webhook handler
  migrations/
    006_events_log.sql     # Events log table

src/
  lib/
    eventTriggers.js       # Client-side event handling
  services/
    CommunicationsService.js  # Client-side fallback
```
