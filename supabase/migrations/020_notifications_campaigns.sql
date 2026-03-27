-- ============================================================
-- Migration 020: Notifications client + Campagnes marketing
-- ============================================================

-- 1. Notifications client (SMS/Email terrain + rappels RDV)
CREATE TABLE IF NOT EXISTS notifications_client (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID,
  client_id UUID,
  chantier_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  type TEXT NOT NULL CHECK (type IN ('en_route', 'arrive', 'termine', 'rappel_j1', 'rappel_h2', 'remerciement', 'satisfaction', 'relance_avis')),
  canal TEXT NOT NULL DEFAULT 'sms' CHECK (canal IN ('sms', 'email', 'both')),
  message TEXT,
  sent_at TIMESTAMPTZ,
  statut TEXT DEFAULT 'pending' CHECK (statut IN ('pending', 'sent', 'delivered', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications_client ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_client_policy" ON notifications_client FOR ALL USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_notifications_client_user ON notifications_client(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_client_client ON notifications_client(client_id);

-- 2. Campagnes email marketing
CREATE TABLE IF NOT EXISTS campagnes_email (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  nom TEXT NOT NULL,
  sujet TEXT,
  contenu_html TEXT,
  contenu_text TEXT,
  segment JSONB DEFAULT '{}',
  statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'programmee', 'envoyee', 'annulee')),
  programmed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "errors": 0, "revenue": 0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE campagnes_email ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campagnes_email_policy" ON campagnes_email FOR ALL USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_campagnes_email_user ON campagnes_email(user_id);

-- 3. Destinataires campagne
CREATE TABLE IF NOT EXISTS campagne_destinataires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campagne_id UUID REFERENCES campagnes_email(id) ON DELETE CASCADE,
  client_id UUID,
  email TEXT,
  statut TEXT DEFAULT 'pending' CHECK (statut IN ('pending', 'sent', 'opened', 'clicked', 'error', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error TEXT
);
ALTER TABLE campagne_destinataires ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_campagne_dest_campagne ON campagne_destinataires(campagne_id);

-- 4. Parrainages
CREATE TABLE IF NOT EXISTS parrainages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  parrain_client_id UUID,
  filleul_email TEXT,
  filleul_nom TEXT,
  code TEXT UNIQUE,
  statut TEXT DEFAULT 'invite' CHECK (statut IN ('invite', 'inscrit', 'converti', 'recompense')),
  recompense_type TEXT,
  recompense_valeur NUMERIC,
  converted_devis_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parrainages_policy" ON parrainages FOR ALL USING (user_id = auth.uid());

-- 5. Config avis Google (pour la sync API)
CREATE TABLE IF NOT EXISTS avis_google_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  google_place_id TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  auto_respond BOOLEAN DEFAULT false,
  tone TEXT DEFAULT 'professionnel' CHECK (tone IN ('professionnel', 'amical', 'formel')),
  sync_interval_hours INTEGER DEFAULT 4,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE avis_google_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avis_google_config_policy" ON avis_google_config FOR ALL USING (user_id = auth.uid());

-- 6. Enrichir la table avis_google existante (ajout colonnes sync)
ALTER TABLE avis_google ADD COLUMN IF NOT EXISTS google_review_id TEXT;
ALTER TABLE avis_google ADD COLUMN IF NOT EXISTS google_author TEXT;
ALTER TABLE avis_google ADD COLUMN IF NOT EXISTS google_sync_at TIMESTAMPTZ;
ALTER TABLE avis_google ADD COLUMN IF NOT EXISTS ai_suggested_response TEXT;
ALTER TABLE avis_google ADD COLUMN IF NOT EXISTS ai_response_status TEXT DEFAULT 'pending';
ALTER TABLE avis_google ADD COLUMN IF NOT EXISTS published_response TEXT;
ALTER TABLE avis_google ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE avis_google ADD COLUMN IF NOT EXISTS sentiment TEXT;

-- 7. Contrats de maintenance
CREATE TABLE IF NOT EXISTS contrats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID,
  client_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  numero TEXT,
  objet TEXT NOT NULL,
  montant_ht NUMERIC DEFAULT 0,
  tva NUMERIC DEFAULT 20,
  montant_ttc NUMERIC DEFAULT 0,
  recurrence TEXT DEFAULT 'annuel' CHECK (recurrence IN ('mensuel', 'trimestriel', 'semestriel', 'annuel')),
  debut DATE,
  fin DATE,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'a_renouveler', 'expire', 'annule')),
  conditions TEXT,
  auto_renouvellement BOOLEAN DEFAULT true,
  chantier_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contrats_policy" ON contrats FOR ALL USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_contrats_user ON contrats(user_id);
CREATE INDEX IF NOT EXISTS idx_contrats_client ON contrats(client_id);

-- 8. Échéances contrats
CREATE TABLE IF NOT EXISTS contrat_echeances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrat_id UUID REFERENCES contrats(id) ON DELETE CASCADE,
  date_echeance DATE NOT NULL,
  montant NUMERIC DEFAULT 0,
  facture_id UUID,
  statut TEXT DEFAULT 'a_generer' CHECK (statut IN ('a_generer', 'generee', 'payee')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE contrat_echeances ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contrat_echeances_contrat ON contrat_echeances(contrat_id);

-- 9. Formulaires terrain
CREATE TABLE IF NOT EXISTS form_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  nom TEXT NOT NULL,
  description TEXT,
  champs JSONB DEFAULT '[]',
  categorie TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_templates_policy" ON form_templates FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL,
  chantier_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID,
  data JSONB DEFAULT '{}',
  signatures JSONB DEFAULT '{}',
  photos TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT now(),
  pdf_url TEXT
);
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_submissions_policy" ON form_submissions FOR ALL USING (user_id = auth.uid());

-- 10. Client portal tokens
CREATE TABLE IF NOT EXISTS client_portal_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  entreprise_id UUID,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Add portal_enabled to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS siret TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS type_logement TEXT;
