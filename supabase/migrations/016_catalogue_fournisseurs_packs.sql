-- Migration 016: Catalogue Fournisseurs, Packs & Coefficients
-- Creates tables for supplier management, pack/kit assembly, and coefficient persistence
-- All tables have RLS enabled with user_id isolation

-- ============================================================================
-- 1. FOURNISSEURS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS fournisseurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    telephone TEXT,
    email TEXT,
    adresse TEXT,
    delai_livraison_jours INTEGER DEFAULT 3,
    conditions_paiement TEXT,
    notes TEXT,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fournisseurs_user ON fournisseurs(user_id);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_nom ON fournisseurs(user_id, nom);

ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fournisseurs"
ON fournisseurs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own fournisseurs"
ON fournisseurs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fournisseurs"
ON fournisseurs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fournisseurs"
ON fournisseurs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_fournisseurs_updated_at
    BEFORE UPDATE ON fournisseurs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. FOURNISSEUR_ARTICLES (junction: supplier pricing per article)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fournisseur_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fournisseur_id UUID NOT NULL REFERENCES fournisseurs(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES catalogue(id) ON DELETE CASCADE,
    prix_fournisseur NUMERIC(12,2),
    reference_fournisseur TEXT,
    delai_specifique INTEGER,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fournisseur_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_fournisseur_articles_user ON fournisseur_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_fournisseur_articles_article ON fournisseur_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_fournisseur_articles_fournisseur ON fournisseur_articles(fournisseur_id);

ALTER TABLE fournisseur_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fournisseur_articles"
ON fournisseur_articles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own fournisseur_articles"
ON fournisseur_articles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fournisseur_articles"
ON fournisseur_articles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fournisseur_articles"
ON fournisseur_articles FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_fournisseur_articles_updated_at
    BEFORE UPDATE ON fournisseur_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 3. PACKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    description TEXT,
    prix_vente_override NUMERIC(12,2),
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packs_user ON packs(user_id);

ALTER TABLE packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packs"
ON packs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own packs"
ON packs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packs"
ON packs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own packs"
ON packs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_packs_updated_at
    BEFORE UPDATE ON packs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 4. PACK_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pack_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES catalogue(id) ON DELETE CASCADE,
    quantite NUMERIC(10,2) NOT NULL DEFAULT 1,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pack_items_pack ON pack_items(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_items_article ON pack_items(article_id);
CREATE INDEX IF NOT EXISTS idx_pack_items_user ON pack_items(user_id);

ALTER TABLE pack_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pack_items"
ON pack_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pack_items"
ON pack_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pack_items"
ON pack_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pack_items"
ON pack_items FOR DELETE USING (auth.uid() = user_id);


-- ============================================================================
-- 5. CATALOGUE_COEFFICIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalogue_coefficients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    categorie TEXT NOT NULL,
    coefficient NUMERIC(5,2) NOT NULL DEFAULT 1.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, categorie)
);

CREATE INDEX IF NOT EXISTS idx_catalogue_coefficients_user ON catalogue_coefficients(user_id);

ALTER TABLE catalogue_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coefficients"
ON catalogue_coefficients FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own coefficients"
ON catalogue_coefficients FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coefficients"
ON catalogue_coefficients FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own coefficients"
ON catalogue_coefficients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_catalogue_coefficients_updated_at
    BEFORE UPDATE ON catalogue_coefficients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 6. ADD MISSING COLUMNS TO CATALOGUE TABLE
-- ============================================================================

-- Add stock columns if they don't exist (stock is currently client-side only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalogue' AND column_name = 'stock_actuel') THEN
        ALTER TABLE catalogue ADD COLUMN stock_actuel NUMERIC(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalogue' AND column_name = 'stock_minimum') THEN
        ALTER TABLE catalogue ADD COLUMN stock_minimum NUMERIC(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalogue' AND column_name = 'image_url') THEN
        ALTER TABLE catalogue ADD COLUMN image_url TEXT;
    END IF;
END $$;


-- ============================================================================
-- 7. HELPER VIEWS
-- ============================================================================

-- View: Articles with low stock alert
CREATE OR REPLACE VIEW v_stock_alerts AS
SELECT
    c.id,
    c.user_id,
    c.designation,
    c.reference,
    c.categorie,
    c.stock_actuel,
    c.stock_minimum,
    c.prix_unitaire_ht,
    c.prix_achat,
    CASE
        WHEN c.stock_actuel IS NULL OR c.stock_minimum IS NULL THEN 'no_tracking'
        WHEN c.stock_actuel <= 0 THEN 'out_of_stock'
        WHEN c.stock_actuel < c.stock_minimum THEN 'low_stock'
        ELSE 'ok'
    END as stock_status
FROM catalogue c
WHERE c.actif = true
AND c.stock_actuel IS NOT NULL
AND c.stock_minimum IS NOT NULL
AND c.stock_actuel < c.stock_minimum;
