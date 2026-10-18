-- ============================================================
-- Migration 102: une série de numéros par contribuable (SIREN) ; l'entreprise et le SIREN d'une pièce numérotée figés
-- (tâche serie-siren, 18 oct. 2026)
-- ============================================================
-- Pourquoi : contre-relectures juriste-btp (M1) et gardien-securite du 18 oct. 2026 (lot 101). 101 prend comme série
-- l'organisation tant qu'elle n'a qu'une fiche entreprise active, la fiche sinon :
--   - deux fiches d'un même SIREN (un électricien qui ajoute une fiche « plomberie » sous la même EI) : la seconde
--     repartait à 00001 — deux factures d'une même année au même numéro pour un même contribuable
--     (BOI-TVA-DECLA-30-20-20-10 § 90 ; l'index de 098 inclut l'entreprise) ;
--   - archiver une fiche faisait basculer la règle et sauter des numéros dans la série de l'autre (rupture de
--     continuité, CGI ann. II art. 242 nonies A, I, 7°) ;
--   - par l'API, une facture émise (ou un brouillon numéroté) pouvait changer d'entreprise émettrice (mention
--     obligatoire ; ni 093 ni 099 ne la figeaient) et sortir de sa série : son numéro redevenait libre ;
--   - dans une organisation à plusieurs entreprises, rien ne vérifiait qu'un avoir est émis par l'entreprise de sa
--     facture.
-- Relectures de 102 (même jour) : la série doit se lire sur le SIREN de l'émetteur au moment de la numérotation, pas
-- sur le SIRET actuel de la fiche (une correction de SIRET déplaçait les factures d'une série à l'autre : doublon
-- possible) ; un avoir prend l'entreprise de sa facture plutôt qu'être refusé.
-- Relevé du 18 oct. 2026 : une fiche entreprise par organisation ; celles qui ont des factures ont un SIRET complet ;
-- aucune facture sans entreprise. Les numéros attribués restent les mêmes. Reprise : le SIREN de l'émetteur est inscrit
-- sur les 16 factures déjà numérotées (celui de leur fiche).
-- Relecture gardien-securite de 102 : applicable ; un brouillon sans numéro ne garde pas de SIREN envoyé.
--
-- Effet, pour un compte connecté (le serveur et les fonctions SECURITY DEFINER ne sont pas concernés) :
--   1. quand une facture ou un avoir reçoit son numéro, la base y inscrit le SIREN de l'émetteur (siren_emetteur :
--      9 premiers chiffres du SIRET de la fiche), figé ensuite ;
--   2. la série d'une facture est celle de ce SIREN : toutes les factures de l'organisation au même SIREN d'émetteur
--      (pour les factures d'avant 102, le SIREN actuel de leur fiche), plus celles de la fiche elle-même ; les fiches
--      sans SIREN forment ensemble une série ; les factures sans entreprise (anciennes) comptent dans chaque série, par
--      prudence. Archiver, ajouter une fiche ou corriger un SIRET ne change plus la série des factures déjà numérotées ;
--   3. l'entreprise et le SIREN d'une pièce numérotée (émise ou brouillon) ne changent plus (valeurs envoyées
--      ignorées, comme user_id en 099) ;
--   4. un avoir est émis par l'entreprise de la facture qu'il rectifie : il la prend à sa numérotation.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select count(*) from information_schema.columns where table_name = 'devis' and column_name = 'siren_emetteur';  -- 1
--   select position('siren_emetteur' in pg_get_functiondef('public.dernier_numero_facture(uuid, uuid, text, integer)'::regprocedure)) > 0;
--     attendu : true
--   select position('NEW.entreprise_id := OLD.entreprise_id' in pg_get_functiondef('public.garder_organisation_piece_emise()'::regprocedure)) > 0;
--     attendu : true
--   select count(*) from devis where type = 'facture' and nullif(numero, '') is not null and entreprise_id is not null
--     and siren_emetteur is null;                                      -- attendu : 0 (sauf fiche sans SIRET)
--   select count(*) from devis a join devis f on f.id = a.avoir_source_id
--    where a.facture_type = 'avoir' and a.entreprise_id is distinct from f.entreprise_id;           -- attendu : 0
--   Ne jamais rejouer 099, 100 ou 101 après 102 : elles remettraient une définition antérieure (entreprise non figée,
--   avoir sans contrôle d'entreprise, série par fiche).
-- ============================================================

ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS siren_emetteur TEXT;
COMMENT ON COLUMN public.devis.siren_emetteur IS
  'SIREN de l''entreprise qui a émis la facture ou l''avoir, inscrit par la base à la numérotation et figé ensuite (102) : '
  'définit la série de numérotation.';

-- SIREN d'une fiche entreprise : les 9 premiers chiffres de son SIRET (NULL s'il en manque) ; pour un compte connecté,
-- seulement une fiche de son organisation (ou la sienne, sans organisation)
CREATE OR REPLACE FUNCTION public.siren_entreprise(p_entreprise UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN length(c) >= 9 THEN left(c, 9) END
    FROM (SELECT regexp_replace(COALESCE(e.siret, ''), '\D', '', 'g') AS c
            FROM public.entreprise e
           WHERE e.id = p_entreprise
             AND (auth.uid() IS NULL
                  OR e.organization_id = ANY (COALESCE(public.user_org_ids(auth.uid()), ARRAY[]::UUID[]))
                  OR (e.organization_id IS NULL AND e.user_id = auth.uid()))) s;
$$;
REVOKE ALL ON FUNCTION public.siren_entreprise(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.siren_entreprise(UUID) TO authenticated, service_role;

-- Factures déjà numérotées : le SIREN de leur fiche au moment de 102 (sinon elles suivraient le SIRET actuel de la fiche :
-- contre-relecture juriste-btp, R1-a). Sans toucher à leur date de mise à jour ni à leur lien de paiement : les deux
-- déclencheurs de production qui les écrivent sont coupés le temps de cette seule écriture (même transaction).
DO $reprise$
DECLARE
  v_maj BOOLEAN := EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass
                            AND tgname = 'update_devis_updated_at' AND tgenabled <> 'D');
  v_jeton BOOLEAN := EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass
                              AND tgname = 'trg_devis_payment_token' AND tgenabled <> 'D');
BEGIN
  IF v_maj THEN
    ALTER TABLE public.devis DISABLE TRIGGER update_devis_updated_at;
  END IF;
  IF v_jeton THEN
    ALTER TABLE public.devis DISABLE TRIGGER trg_devis_payment_token;
  END IF;
  UPDATE public.devis d SET siren_emetteur = public.siren_entreprise(d.entreprise_id)
   WHERE d.type = 'facture' AND NULLIF(btrim(d.numero), '') IS NOT NULL
     AND d.siren_emetteur IS NULL AND d.entreprise_id IS NOT NULL;
  IF v_maj THEN
    ALTER TABLE public.devis ENABLE TRIGGER update_devis_updated_at;
  END IF;
  IF v_jeton THEN
    ALTER TABLE public.devis ENABLE TRIGGER trg_devis_payment_token;
  END IF;
END
$reprise$;

-- 2. Plus grand numéro de la série du SIREN, pour un membre de l'organisation seulement
CREATE OR REPLACE FUNCTION public.dernier_numero_facture(p_org UUID, p_entreprise UUID, p_prefixe TEXT, p_annee INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_motif TEXT;
  v_siren TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND p_org IS NOT NULL
     AND NOT (p_org = ANY (COALESCE(public.user_org_ids(auth.uid()), ARRAY[]::UUID[]))) THEN
    RAISE EXCEPTION 'Organisation interdite' USING ERRCODE = '42501';
  END IF;
  IF p_prefixe !~ '^[A-Z]{1,10}$' THEN
    RAISE EXCEPTION 'Préfixe de numérotation invalide' USING ERRCODE = '22023';
  END IF;
  v_siren := public.siren_entreprise(p_entreprise);
  v_motif := '^' || p_prefixe || '-' || p_annee || '-(\d{1,9})$';
  RETURN COALESCE((
    SELECT MAX(substring(d.numero FROM v_motif)::INTEGER)
      FROM public.devis d
     WHERE d.type = 'facture'
       AND d.organization_id IS NOT DISTINCT FROM p_org
       AND (p_org IS NOT NULL OR d.user_id = auth.uid())
       AND (d.entreprise_id IS NULL
            OR d.entreprise_id = p_entreprise
            OR (p_entreprise IS NOT NULL
                AND COALESCE(d.siren_emetteur, public.siren_entreprise(d.entreprise_id)) IS NOT DISTINCT FROM v_siren))
       AND d.numero ~ v_motif), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.dernier_numero_facture(UUID, UUID, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dernier_numero_facture(UUID, UUID, TEXT, INTEGER) TO authenticated, service_role;

-- 1 et 4. Numérotation (définition de 101) : un avoir prend l'entreprise de sa facture ; le SIREN de l'émetteur est inscrit
CREATE OR REPLACE FUNCTION public.suivre_numerotation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefixe TEXT;
  v_annee INTEGER;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF NEW.type IS DISTINCT FROM 'facture' THEN
    RETURN NEW;
  END IF;
  -- Phase INSERT d'un upsert sur une ligne existante : la phase UPDATE décidera avec la ligne enregistrée
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.devis WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  -- Déjà numérotée : le numéro ne change plus (093), ni l'entreprise ni le SIREN de l'émetteur (garder_organisation_piece_emise)
  IF TG_OP = 'UPDATE' AND OLD.type = 'facture' AND NULLIF(btrim(OLD.numero), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- Un avoir est émis par l'entreprise de sa facture (lue sous les droits de l'appelant ; invisible : contrôlée ensuite
  -- par entreprise_emettrice et verifier_avoir_source)
  IF NEW.facture_type = 'avoir' AND NEW.avoir_source_id IS NOT NULL THEN
    NEW.entreprise_id := COALESCE((SELECT entreprise_id FROM public.devis WHERE id = NEW.avoir_source_id), NEW.entreprise_id);
  END IF;
  -- Brouillon sans numéro : rien à attribuer (l'app numérote à la création ; Q-numero-a-l-envoi) ; pas de SIREN
  -- d'émetteur avant la numérotation (une valeur envoyée ne resterait pas pour une écriture serveur)
  IF NULLIF(btrim(NEW.numero), '') IS NULL AND COALESCE(NEW.statut, '') = 'brouillon' THEN
    NEW.siren_emetteur := NULL;
    RETURN NEW;
  END IF;

  -- Entreprise qui émet (contrôlée, ou l'unique de l'organisation) et son SIREN, préfixe selon la nature, année de Paris
  NEW.entreprise_id := public.entreprise_emettrice(NEW.organization_id, NEW.entreprise_id);
  NEW.siren_emetteur := public.siren_entreprise(NEW.entreprise_id);
  v_prefixe := CASE WHEN NEW.facture_type = 'avoir' THEN 'AV' ELSE 'FAC' END;
  v_annee := extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::INTEGER;
  -- Une attribution à la fois par organisation, préfixe et année ; la suivante attend la fin de la transaction, puis
  -- voit le numéro pris (en READ COMMITTED, l'instruction qui suit le verrou relit la base)
  PERFORM pg_advisory_xact_lock(hashtextextended('numerotation:' || COALESCE(NEW.organization_id::text, NEW.user_id::text, '')
    || ':' || v_prefixe || ':' || v_annee, 0));
  NEW.numero := v_prefixe || '-' || v_annee || '-'
    || lpad((public.dernier_numero_facture(NEW.organization_id, NEW.entreprise_id, v_prefixe, v_annee) + 1)::text, 5, '0');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.suivre_numerotation() FROM PUBLIC, anon, authenticated;

-- 3. Une pièce numérotée garde son entreprise et le SIREN de son émetteur ; émise, elle reste dans son organisation et
--    garde son auteur (définition de 099 complétée)
CREATE OR REPLACE FUNCTION public.garder_organisation_piece_emise()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF OLD.type IS DISTINCT FROM 'facture' THEN
    RETURN NEW;
  END IF;
  -- Numérotée (émise, ou brouillon numéroté) : l'entreprise qui émet est une mention de la facture, et sa série (102)
  IF OLD.statut IS DISTINCT FROM 'brouillon' OR NULLIF(btrim(OLD.numero), '') IS NOT NULL THEN
    NEW.entreprise_id := OLD.entreprise_id;
    NEW.siren_emetteur := OLD.siren_emetteur;
  END IF;
  IF OLD.statut = 'brouillon' THEN
    RETURN NEW;
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Une pièce émise (facture ou avoir) reste dans son entreprise.'
      USING ERRCODE = '42501';
  END IF;
  -- L'app écrit le compte qui enregistre (src/lib/queryHelper.js withOrgScope) : un salarié qui encaisse la facture du
  -- patron ne la fait pas sienne
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_organisation_piece_emise() FROM PUBLIC, anon, authenticated;

-- 4. Un avoir rectifie une facture émise de la même organisation et de la même entreprise (définition de 100 complétée)
CREATE OR REPLACE FUNCTION public.verifier_avoir_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_src RECORD;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF NEW.facture_type IS DISTINCT FROM 'avoir' THEN
    RETURN NEW;
  END IF;
  -- Phase INSERT d'un upsert sur une ligne existante : la phase UPDATE contrôlera avec la ligne enregistrée
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.devis WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  -- Un avoir déjà rattaché, dans la même organisation et la même entreprise, garde son rattachement
  IF TG_OP = 'UPDATE' AND OLD.facture_type = 'avoir' AND NEW.avoir_source_id IS NOT DISTINCT FROM OLD.avoir_source_id
     AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
     AND NEW.entreprise_id IS NOT DISTINCT FROM OLD.entreprise_id THEN
    RETURN NEW;
  END IF;
  -- La facture d'origine : existante et visible, une facture (ni devis ni avoir), émise, de la même organisation et de la
  -- même entreprise (trg_suivre_numerotation, 101-102, a déjà donné à l'avoir l'entreprise de sa facture)
  SELECT type, facture_type, statut, organization_id, entreprise_id INTO v_src FROM public.devis WHERE id = NEW.avoir_source_id;
  IF NOT FOUND OR v_src.type IS DISTINCT FROM 'facture' OR v_src.facture_type = 'avoir'
     OR v_src.statut = 'brouillon' OR v_src.organization_id IS DISTINCT FROM NEW.organization_id
     OR (NEW.entreprise_id IS NOT NULL AND v_src.entreprise_id IS NOT NULL AND NEW.entreprise_id <> v_src.entreprise_id) THEN
    RAISE EXCEPTION 'Un avoir rectifie une facture émise de votre entreprise : choisissez la facture qu''il corrige (un brouillon se corrige directement).'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.verifier_avoir_source() FROM PUBLIC, anon, authenticated;
