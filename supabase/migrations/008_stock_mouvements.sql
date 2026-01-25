-- Migration: Stock Mouvements (History)
-- Tracks all stock entries/exits for complete traceability

-- Create stock_mouvements table
CREATE TABLE IF NOT EXISTS stock_mouvements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produit_id UUID NOT NULL REFERENCES catalogue(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement', 'inventaire')),
    quantite DECIMAL(10, 2) NOT NULL,
    quantite_avant DECIMAL(10, 2),
    quantite_apres DECIMAL(10, 2),
    motif TEXT,
    reference VARCHAR(100),
    devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
    chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL,
    fournisseur_id UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
    prix_unitaire DECIMAL(10, 2),
    cout_total DECIMAL(10, 2),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_produit ON stock_mouvements(produit_id);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_user ON stock_mouvements(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_type ON stock_mouvements(type);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_created_at ON stock_mouvements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_devis ON stock_mouvements(devis_id) WHERE devis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_chantier ON stock_mouvements(chantier_id) WHERE chantier_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_user_date ON stock_mouvements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_produit_date ON stock_mouvements(produit_id, created_at DESC);

-- Enable RLS
ALTER TABLE stock_mouvements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own stock movements"
ON stock_mouvements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock movements"
ON stock_mouvements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock movements"
ON stock_mouvements FOR UPDATE
USING (auth.uid() = user_id);

-- Function to automatically record stock movements
CREATE OR REPLACE FUNCTION record_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    movement_type VARCHAR(20);
    quantity_diff DECIMAL(10, 2);
BEGIN
    -- Calculate difference
    quantity_diff := COALESCE(NEW.quantite, 0) - COALESCE(OLD.quantite, 0);

    -- Skip if no change
    IF quantity_diff = 0 THEN
        RETURN NEW;
    END IF;

    -- Determine movement type
    IF quantity_diff > 0 THEN
        movement_type := 'entree';
    ELSE
        movement_type := 'sortie';
        quantity_diff := ABS(quantity_diff);
    END IF;

    -- Record the movement
    INSERT INTO stock_mouvements (
        produit_id,
        type,
        quantite,
        quantite_avant,
        quantite_apres,
        motif,
        user_id,
        created_by
    ) VALUES (
        NEW.id,
        movement_type,
        quantity_diff,
        OLD.quantite,
        NEW.quantite,
        'Modification directe du stock',
        NEW.user_id,
        auth.uid()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic tracking (optional - can be disabled if using manual tracking)
-- DROP TRIGGER IF EXISTS trigger_record_stock_movement ON catalogue;
-- CREATE TRIGGER trigger_record_stock_movement
-- AFTER UPDATE OF quantite ON catalogue
-- FOR EACH ROW
-- EXECUTE FUNCTION record_stock_movement();

-- Function to get stock movement summary for a product
CREATE OR REPLACE FUNCTION get_product_movement_summary(
    p_product_id UUID,
    p_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_entrees', COALESCE(SUM(CASE WHEN type = 'entree' THEN quantite ELSE 0 END), 0),
        'total_sorties', COALESCE(SUM(CASE WHEN type = 'sortie' THEN quantite ELSE 0 END), 0),
        'total_ajustements', COALESCE(SUM(CASE WHEN type = 'ajustement' THEN quantite ELSE 0 END), 0),
        'cout_total_entrees', COALESCE(SUM(CASE WHEN type = 'entree' THEN cout_total ELSE 0 END), 0),
        'nombre_mouvements', COUNT(*),
        'dernier_mouvement', MAX(created_at)
    ) INTO result
    FROM stock_mouvements
    WHERE produit_id = p_product_id
      AND user_id = p_user_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get movement history with pagination
CREATE OR REPLACE FUNCTION get_stock_movements_paginated(
    p_user_id UUID,
    p_page INTEGER DEFAULT 1,
    p_per_page INTEGER DEFAULT 50,
    p_product_id UUID DEFAULT NULL,
    p_type VARCHAR DEFAULT NULL,
    p_chantier_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_count INTEGER;
    offset_val INTEGER;
BEGIN
    offset_val := (p_page - 1) * p_per_page;

    -- Get total count
    SELECT COUNT(*) INTO total_count
    FROM stock_mouvements sm
    WHERE sm.user_id = p_user_id
      AND (p_product_id IS NULL OR sm.produit_id = p_product_id)
      AND (p_type IS NULL OR sm.type = p_type)
      AND (p_chantier_id IS NULL OR sm.chantier_id = p_chantier_id)
      AND (p_start_date IS NULL OR sm.created_at >= p_start_date)
      AND (p_end_date IS NULL OR sm.created_at <= p_end_date);

    -- Get paginated results with product info
    SELECT json_build_object(
        'data', COALESCE(json_agg(row_to_json(t)), '[]'::json),
        'pagination', json_build_object(
            'page', p_page,
            'per_page', p_per_page,
            'total', total_count,
            'total_pages', CEIL(total_count::DECIMAL / p_per_page)
        )
    ) INTO result
    FROM (
        SELECT
            sm.*,
            c.nom AS produit_nom,
            c.unite AS produit_unite,
            c.categorie AS produit_categorie,
            ch.nom AS chantier_nom,
            d.numero AS devis_numero
        FROM stock_mouvements sm
        LEFT JOIN catalogue c ON c.id = sm.produit_id
        LEFT JOIN chantiers ch ON ch.id = sm.chantier_id
        LEFT JOIN devis d ON d.id = sm.devis_id
        WHERE sm.user_id = p_user_id
          AND (p_product_id IS NULL OR sm.produit_id = p_product_id)
          AND (p_type IS NULL OR sm.type = p_type)
          AND (p_chantier_id IS NULL OR sm.chantier_id = p_chantier_id)
          AND (p_start_date IS NULL OR sm.created_at >= p_start_date)
          AND (p_end_date IS NULL OR sm.created_at <= p_end_date)
        ORDER BY sm.created_at DESC
        LIMIT p_per_page
        OFFSET offset_val
    ) t;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE stock_mouvements IS 'Historique complet des mouvements de stock pour tracabilite';
