-- 046_acompte_echeancier.sql
-- Système d'échéancier d'acomptes multi-étapes
-- Permet de définir un calendrier de facturation par étapes pour un devis

-- ─── Table: acompte_echeanciers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acompte_echeanciers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  devis_id UUID REFERENCES devis(id) ON DELETE CASCADE NOT NULL,
  etapes JSONB NOT NULL DEFAULT '[]',
  -- etapes format:
  -- [
  --   {
  --     "numero": 1,
  --     "label": "Acompte à la commande",
  --     "pourcentage": 30,
  --     "montant_ht": 4500.00,
  --     "montant_ttc": 5400.00,
  --     "tvaParTaux": { "20": { "base": 4500, "montant": 900 } },
  --     "facture_id": null,
  --     "statut": "a_facturer",
  --     "date_prevue": null,
  --     "date_facture": null
  --   }
  -- ]
  -- statut par étape: "a_facturer" | "facture" | "paye"
  template_key TEXT,  -- '30-70', '30-30-40', '50-50', '30-40-30', 'custom'
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'termine', 'annule')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_acompte_echeanciers_devis ON acompte_echeanciers(devis_id);
CREATE INDEX IF NOT EXISTS idx_acompte_echeanciers_user ON acompte_echeanciers(user_id);
CREATE INDEX IF NOT EXISTS idx_acompte_echeanciers_org ON acompte_echeanciers(organization_id) WHERE organization_id IS NOT NULL;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE acompte_echeanciers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own echeanciers"
  ON acompte_echeanciers FOR ALL
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT user_org_ids())
  );

-- ─── Add echeancier_id to devis ─────────────────────────────────────────────
ALTER TABLE devis ADD COLUMN IF NOT EXISTS echeancier_id UUID REFERENCES acompte_echeanciers(id) ON DELETE SET NULL;

-- ─── Additional columns on devis for acompte tracking ──────────────────────
-- mode_facturation: how this devis is being invoiced
ALTER TABLE devis ADD COLUMN IF NOT EXISTS mode_facturation TEXT CHECK (
  mode_facturation IS NULL OR mode_facturation IN ('direct', 'acompte', 'echeancier', 'situation')
);
-- acomptes_ids: ordered list of acompte facture UUIDs linked to this devis
ALTER TABLE devis ADD COLUMN IF NOT EXISTS acomptes_ids UUID[] DEFAULT '{}';
-- facture_solde_id: the final solde facture for this devis
ALTER TABLE devis ADD COLUMN IF NOT EXISTS facture_solde_id UUID REFERENCES devis(id) ON DELETE SET NULL;
-- montant_facture: total amount already invoiced on this devis (cached for performance)
ALTER TABLE devis ADD COLUMN IF NOT EXISTS montant_facture NUMERIC DEFAULT 0;

-- ─── Additional columns on paiements for acompte context ───────────────────
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS acompte_etape_numero INTEGER;
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS echeancier_id UUID REFERENCES acompte_echeanciers(id) ON DELETE SET NULL;

-- ─── Updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER set_acompte_echeanciers_updated_at
  BEFORE UPDATE ON acompte_echeanciers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
