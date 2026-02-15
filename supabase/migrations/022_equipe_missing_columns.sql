-- Migration: Add missing columns to equipe table
-- These fields are used in the frontend but were missing from the schema

ALTER TABLE equipe ADD COLUMN IF NOT EXISTS contrat TEXT DEFAULT '';
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS date_embauche DATE DEFAULT NULL;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS competences TEXT DEFAULT '';
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS certifications TEXT DEFAULT '';
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
