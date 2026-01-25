-- ============================================================================
-- OPTIMAL INDEXES FOR CHANTIERPRO
-- Generated based on query analysis of the codebase
-- ============================================================================

-- ============================================================================
-- DEVIS (Quotes/Invoices) TABLE INDEXES
-- ============================================================================

-- Index for filtering by statut (used in DevisWidget with IN clause)
-- Query: .in('statut', ['envoye', 'brouillon', ...])
CREATE INDEX IF NOT EXISTS idx_devis_statut
ON devis(statut);

-- Index for filtering by type (facture vs devis)
-- Query: .eq('type', 'facture')
CREATE INDEX IF NOT EXISTS idx_devis_type
ON devis(type);

-- Composite index for unpaid invoices (TresorerieWidget)
-- Query: .eq('type', 'facture').neq('statut', 'payee')
CREATE INDEX IF NOT EXISTS idx_devis_type_statut
ON devis(type, statut);

-- Index for sorting by created_at (most common ordering)
-- Query: .order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_devis_created_at_desc
ON devis(created_at DESC);

-- Index for client lookup with foreign key
-- Query: .select('*, client:clients(*)')
CREATE INDEX IF NOT EXISTS idx_devis_client_id
ON devis(client_id);

-- Composite index for common dashboard query pattern
-- Query: type + statut + created_at ordering
CREATE INDEX IF NOT EXISTS idx_devis_dashboard_query
ON devis(type, statut, created_at DESC);

-- Index for user isolation (RLS will filter by user_id)
CREATE INDEX IF NOT EXISTS idx_devis_user_id
ON devis(user_id);

-- ============================================================================
-- CHANTIERS (Job Sites) TABLE INDEXES
-- ============================================================================

-- Index for date range queries (ChantiersWidget)
-- Query: .or(`date_debut.gte...,and(date_debut.lte...,date_fin.gte...)`)
CREATE INDEX IF NOT EXISTS idx_chantiers_date_debut
ON chantiers(date_debut);

CREATE INDEX IF NOT EXISTS idx_chantiers_date_fin
ON chantiers(date_fin);

-- Composite index for date range overlap queries
CREATE INDEX IF NOT EXISTS idx_chantiers_date_range
ON chantiers(date_debut, date_fin);

-- Index for sorting by date_debut
-- Query: .order('date_debut', { ascending: true })
CREATE INDEX IF NOT EXISTS idx_chantiers_date_debut_asc
ON chantiers(date_debut ASC);

-- Index for client lookup
CREATE INDEX IF NOT EXISTS idx_chantiers_client_id
ON chantiers(client_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_chantiers_statut
ON chantiers(statut);

-- Index for user isolation (RLS)
CREATE INDEX IF NOT EXISTS idx_chantiers_user_id
ON chantiers(user_id);

-- ============================================================================
-- CLIENTS TABLE INDEXES
-- ============================================================================

-- Primary lookup index (usually covered by PK, but adding for completeness)
-- Query: .eq('id', clientId).single()
-- Note: id is typically the primary key, no additional index needed

-- Index for user isolation (RLS)
CREATE INDEX IF NOT EXISTS idx_clients_user_id
ON clients(user_id);

-- Index for sorting by created_at
CREATE INDEX IF NOT EXISTS idx_clients_created_at_desc
ON clients(created_at DESC);

-- Index for name search (if implementing search)
CREATE INDEX IF NOT EXISTS idx_clients_nom_trgm
ON clients USING gin(nom gin_trgm_ops);

-- ============================================================================
-- CHANTIER_PHOTOS TABLE INDEXES
-- ============================================================================

-- Index for fetching photos by chantier
-- Query: .eq('chantier_id', chantierId).order('timestamp', { ascending: true })
CREATE INDEX IF NOT EXISTS idx_chantier_photos_chantier_id
ON chantier_photos(chantier_id);

-- Composite index for chantier + timestamp ordering
CREATE INDEX IF NOT EXISTS idx_chantier_photos_chantier_timestamp
ON chantier_photos(chantier_id, timestamp ASC);

-- Index for user isolation (RLS)
CREATE INDEX IF NOT EXISTS idx_chantier_photos_user_id
ON chantier_photos(user_id);

-- Index for phase filtering (if filtering by phase)
CREATE INDEX IF NOT EXISTS idx_chantier_photos_phase
ON chantier_photos(phase);

-- ============================================================================
-- AI_SUGGESTIONS TABLE INDEXES
-- ============================================================================

-- Index for user lookup
-- Query: .eq('user_id', userId)
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id
ON ai_suggestions(user_id);

-- Index for dismissed status
-- Query: .eq('dismissed', false)
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_dismissed
ON ai_suggestions(dismissed);

-- Composite index for common query pattern
-- Query: .eq('user_id', userId).eq('dismissed', false).order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_active
ON ai_suggestions(user_id, dismissed, created_at DESC)
WHERE dismissed = false;

-- Index for cleanup query
-- Query: .eq('dismissed', true).lt('dismissed_at', sevenDaysAgo)
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_cleanup
ON ai_suggestions(dismissed, dismissed_at)
WHERE dismissed = true;

-- ============================================================================
-- ENABLE TRIGRAM EXTENSION (for text search if needed)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- ANALYZE TABLES (update statistics for query planner)
-- ============================================================================
ANALYZE devis;
ANALYZE chantiers;
ANALYZE clients;
ANALYZE chantier_photos;
ANALYZE ai_suggestions;

-- ============================================================================
-- NOTES FOR PERFORMANCE MONITORING
-- ============================================================================
--
-- To identify slow queries in Supabase:
-- 1. Enable pg_stat_statements extension in Supabase dashboard
-- 2. Run this query to find slow queries:
--
--    SELECT
--      query,
--      calls,
--      total_time / calls as avg_time_ms,
--      rows / calls as avg_rows
--    FROM pg_stat_statements
--    ORDER BY total_time DESC
--    LIMIT 20;
--
-- 3. Use EXPLAIN ANALYZE to verify index usage:
--    EXPLAIN ANALYZE SELECT * FROM devis WHERE statut = 'envoye';
--
-- ============================================================================
