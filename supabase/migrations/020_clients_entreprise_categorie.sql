-- Migration: Add entreprise and categorie columns to clients table
-- These fields are used in the frontend but were missing from the schema

ALTER TABLE clients ADD COLUMN IF NOT EXISTS entreprise TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS categorie TEXT DEFAULT '';
