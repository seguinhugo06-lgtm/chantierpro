-- ============================================================
-- Migration 060: Ajouter subscriptions.updated_at (débloque TOUT update)
-- ============================================================
-- Le trigger update_subscription_timestamp() fait NEW.updated_at = NOW(), mais
-- la table subscriptions n'avait pas de colonne updated_at → toute écriture
-- (UPDATE/UPSERT) échouait : « record "new" has no field "updated_at" ».
-- Impact : le webhook Stripe ne pouvait PAS activer un abonnement après paiement.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
