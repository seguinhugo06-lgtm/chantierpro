-- ============================================================
-- Migration 071 : colonnes de facturation lues par le front
-- ============================================================
--
-- Contexte — l'écran « Mon plan » lit trois champs :
--   • cancel_at_period_end  → affiche « résilié, actif jusqu'au … » + « Réactiver »
--   • current_period_end    → affiche la date de prochain prélèvement
--   • billing_interval      → affiche « Mensuel » / « Annuel »
--
-- billing_interval n'a jamais existé (absente même de la migration 004), et
-- rien dans stripe-webhook n'a jamais écrit les deux autres. Résultat : un
-- abonné qui résilie ne voit jamais sa résiliation confirmée dans l'app.
--
-- Cette migration est idempotente : si une colonne est déjà là, rien ne bouge.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name IN ('cancel_at_period_end','current_period_end','current_period_start','billing_interval');  -- 4 lignes
--   SELECT conname FROM pg_constraint WHERE conname = 'subscriptions_billing_interval_valide';  -- 1 ligne

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_period_end   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_interval     TEXT DEFAULT 'monthly';

-- Seules deux valeurs ont un sens côté Stripe (`month` / `year`), stockées
-- ici sous la forme attendue par le front.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_billing_interval_valide'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_billing_interval_valide
      CHECK (billing_interval IN ('monthly', 'yearly'));
  END IF;
END $$;

COMMENT ON COLUMN subscriptions.cancel_at_period_end IS
  'Résiliation programmée : l''accès reste ouvert jusqu''à current_period_end. Rempli par stripe-webhook.';
COMMENT ON COLUMN subscriptions.current_period_end IS
  'Fin de la période payée en cours. Rempli par stripe-webhook.';
COMMENT ON COLUMN subscriptions.current_period_start IS
  'Début de la période payée en cours. Rempli par stripe-webhook.';
COMMENT ON COLUMN subscriptions.billing_interval IS
  'monthly | yearly — déduit de items.data[0].price.recurring.interval. Rempli par stripe-webhook.';
