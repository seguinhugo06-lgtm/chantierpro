-- ============================================================
-- Migration 064: colonnes devis manquantes en prod (échéancier / situations)
-- Découvert lors du test compte réel (14 juil. 2026) : le mapping
-- toSupabase envoie ces colonnes mais la table prod ne les avait pas
-- → INSERT rejeté (PGRST204). Déjà appliqué directement en prod via
-- l'API management ; ce fichier trace le changement (idempotent).
-- ============================================================

ALTER TABLE devis ADD COLUMN IF NOT EXISTS echeancier_id UUID;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS mode_facturation TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS facture_solde_id UUID;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS montant_facture NUMERIC;

NOTIFY pgrst, 'reload schema';
