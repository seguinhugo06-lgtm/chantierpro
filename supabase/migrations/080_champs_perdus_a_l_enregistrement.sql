-- ============================================================
-- Migration 080: champs perdus a l'enregistrement
-- ============================================================
-- Pourquoi : recette du 9 oct. 2026 (audit-ui/recette/*/RAPPORT.md). L'app envoie ces champs,
--   la base n'a pas les colonnes : l'écriture réussit après les avoir retirées, et la donnée
--   disparaît au rechargement.
--   - pointages : validation, verrouillage et saisie manuelle → l'export paie se vidait, une
--     semaine « verrouillée » redevenait modifiable ;
--   - equipe : l'assureur de la décennale d'un sous-traitant ;
--   - devis : la facture d'origine et le motif d'un avoir (le document imprimait « relatif à la
--     facture n° N/A du N/A »), et la date d'envoi d'un devis (relances et « X jours en attente »
--     comptaient depuis la création).
-- Effet : ces informations sont conservées.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND (
--      (table_name = 'pointages' AND column_name IN ('approuve','verrouille','manuel','signe_le')) OR
--      (table_name = 'equipe' AND column_name = 'decennale_assureur') OR
--      (table_name = 'devis' AND column_name IN ('avoir_source_id','avoir_type','avoir_motif','avoir_motif_detail','date_envoi')))
--    ORDER BY 1, 2;
--   → 10 lignes.
-- ============================================================

-- Idempotente : IF NOT EXISTS ; rejouable sans danger. Aucune donnée existante n'est modifiée.

ALTER TABLE public.pointages ADD COLUMN IF NOT EXISTS approuve BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.pointages ADD COLUMN IF NOT EXISTS verrouille BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.pointages ADD COLUMN IF NOT EXISTS manuel BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.pointages ADD COLUMN IF NOT EXISTS signe_le TIMESTAMPTZ;

ALTER TABLE public.equipe ADD COLUMN IF NOT EXISTS decennale_assureur TEXT;

-- Un avoir garde sa facture d'origine : supprimer celle-ci (ce que l'app refuse) ne doit pas
-- emporter l'avoir, seulement couper le lien.
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS avoir_source_id UUID REFERENCES public.devis(id) ON DELETE SET NULL;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS avoir_type TEXT;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS avoir_motif TEXT;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS avoir_motif_detail TEXT;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS date_envoi TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_devis_avoir_source_id ON public.devis(avoir_source_id) WHERE avoir_source_id IS NOT NULL;

-- Que PostgREST voie les nouvelles colonnes sans attendre
NOTIFY pgrst, 'reload schema';
