-- ============================================================================
-- Migration: 030_add_vu_status.sql
-- Description: Add 'vu' status to devis constraint
-- The app uses 'vu' (viewed by client) but the DB constraint only had 'en_attente'.
-- This migration adds 'vu' to fix constraint violations.
-- ============================================================================

ALTER TABLE devis DROP CONSTRAINT IF EXISTS valid_devis_statut;
ALTER TABLE devis ADD CONSTRAINT valid_devis_statut
  CHECK (statut IN (
    'brouillon', 'envoye', 'vu', 'accepte', 'refuse', 'annule',
    'acompte_facture', 'facture', 'payee', 'en_attente', 'signe'
  ));
