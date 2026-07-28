-- ============================================================
-- Migration 069: numéro de TVA intracommunautaire du client
-- ============================================================
-- La facturation électronique impose d'identifier précisément le client
-- professionnel. `clients.siret` existe depuis la migration 020, mais le
-- numéro de TVA intracommunautaire n'avait jamais de colonne : il était
-- listé dans CLIENT_TRACKED_FIELDS et attendu par le générateur Factur-X,
-- sans jamais pouvoir être enregistré.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS tva_intra TEXT;

-- Recherche par identifiant fiscal — utile au rapprochement et aux contrôles.
CREATE INDEX IF NOT EXISTS idx_clients_siret ON clients(siret) WHERE siret IS NOT NULL;
