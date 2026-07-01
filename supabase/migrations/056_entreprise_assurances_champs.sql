-- ============================================================
-- Migration 056: Champs d'assurance complets sur la table entreprise
-- ============================================================
-- Le formulaire Paramètres > Assurances écrit rcProAssureur / decennaleAssureur…
-- mais entrepriseService mappait vers des colonnes assurance_* inexistantes,
-- donc les données d'assurance n'étaient jamais persistées (perdues au reload).
-- Le mapping est corrigé côté service ; on garantit ici l'existence de TOUTES
-- les colonnes utilisées (les 6 obligatoires légales + 3 informatives).

-- 1. Colonnes obligatoires (RC Pro + Décennale) — déjà présentes en prod,
--    IF NOT EXISTS pour idempotence / cohérence des environnements.
ALTER TABLE entreprise
  ADD COLUMN IF NOT EXISTS rc_pro_assureur TEXT,
  ADD COLUMN IF NOT EXISTS rc_pro_numero TEXT,
  ADD COLUMN IF NOT EXISTS rc_pro_validite DATE,
  ADD COLUMN IF NOT EXISTS decennale_assureur TEXT,
  ADD COLUMN IF NOT EXISTS decennale_numero TEXT,
  ADD COLUMN IF NOT EXISTS decennale_validite DATE;

-- 2. Colonnes informatives (affichées sur les mentions d'assurance des devis)
ALTER TABLE entreprise
  ADD COLUMN IF NOT EXISTS rc_pro_montant_garantie NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS rc_pro_zone TEXT,
  ADD COLUMN IF NOT EXISTS decennale_activites TEXT;
