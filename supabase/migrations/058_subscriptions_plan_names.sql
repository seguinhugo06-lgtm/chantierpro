-- ============================================================
-- Migration 058: Aligner la contrainte plan de subscriptions
-- ============================================================
-- La contrainte valid_plan n'autorisait que 'free'/'solo'/'pro', mais l'app
-- utilise désormais 'gratuit'/'artisan'/'equipe' (migration 054 côté données).
-- Toute écriture d'un abonnement artisan/equipe échouait donc la contrainte CHECK.
-- On autorise les nouveaux IDs + on garde les legacy pour compat des lignes existantes.

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS valid_plan;

ALTER TABLE subscriptions
  ADD CONSTRAINT valid_plan CHECK (
    plan IN (
      'gratuit', 'artisan', 'equipe',           -- IDs actuels
      'free', 'solo', 'pro', 'decouverte', 'entreprise'  -- legacy (compat)
    )
  );

-- Nouveau défaut cohérent avec le plan par défaut de l'app
ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'gratuit';
