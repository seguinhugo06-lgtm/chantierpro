-- Migration 028: Bank transactions for CSV import & reconciliation
-- Phase 1 of banking integration

-- Transactions bancaires importées (CSV, future: Bridge/Powens)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  libelle TEXT NOT NULL,
  montant DECIMAL(10,2) NOT NULL,          -- négatif = débit, positif = crédit
  solde DECIMAL(10,2),
  categorie TEXT,                           -- auto-détectée ou manuelle
  facture_id UUID REFERENCES devis(id) ON DELETE SET NULL,  -- rapprochement (devis table stores factures too)
  devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  statut TEXT DEFAULT 'non_rapproche' CHECK (statut IN ('non_rapproche','rapproche','suggere','ignore')),
  source TEXT DEFAULT 'csv' CHECK (source IN ('csv','bridge','powens','stripe','manuel')),
  hash TEXT UNIQUE,                         -- SHA-256(date+libelle+montant) pour dédoublonnage
  banque_detectee TEXT,                     -- ex: 'Société Générale', 'BNP Paribas'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de rapprochement automatique
CREATE TABLE IF NOT EXISTS bank_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES bank_transactions(id) ON DELETE CASCADE,
  facture_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                     -- 'auto_match', 'manual_match', 'suggest', 'unmatch', 'ignore'
  details JSONB,                            -- { score, reason, candidates[] }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users own bank_transactions" ON bank_transactions;
  DROP POLICY IF EXISTS "Users own bank_reconciliation_log" ON bank_reconciliation_log;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users own bank_transactions" ON bank_transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own bank_reconciliation_log" ON bank_reconciliation_log
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user ON bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_statut ON bank_transactions(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_hash ON bank_transactions(hash);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_log_tx ON bank_reconciliation_log(transaction_id);
