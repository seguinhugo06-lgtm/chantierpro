-- ============================================================
-- Migration 062: colonnes de contact client nullables
-- ============================================================
-- BUG PROD (testeurs) : un client créé sans email OU sans téléphone
-- OU sans adresse disparaissait au rechargement. Cause : la table
-- `clients` avait email / telephone / adresse en NOT NULL, alors que
-- l'app autorise (à juste titre) de créer un client avec juste un nom.
-- L'INSERT était rejeté (23502) → perte silencieuse.
--
-- Un client n'a besoin que d'un nom. On rend le reste nullable.
-- (nom reste NOT NULL.)

ALTER TABLE clients ALTER COLUMN email     DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN telephone DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN adresse   DROP NOT NULL;

-- Idem : un article de catalogue peut être « sur devis » (prix ajouté
-- plus tard) → prix par défaut 0 et nullable pour éviter le même rejet.
ALTER TABLE catalogue ALTER COLUMN prix_unitaire_ht SET DEFAULT 0;
ALTER TABLE catalogue ALTER COLUMN prix_unitaire_ht DROP NOT NULL;

-- ============================================================
-- 2e cause du bug « client disparaît » : la table clients n'avait PAS de
-- colonne updated_at, alors que l'app l'inclut TOUJOURS dans le payload
-- (pour le trigger update_updated_at). Résultat : PGRST204 « column
-- updated_at not found » → 100% des INSERT clients rejetés → tout client
-- créé disparaissait au reload. On ajoute la colonne + le trigger standard.
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
