-- ============================================================
-- Migration 102: une série de numéros par contribuable (SIREN) ; l'entreprise d'une pièce émise figée (tâche
-- serie-siren, 18 oct. 2026)
-- ============================================================
-- Pourquoi : contre-relectures juriste-btp (M1) et gardien-securite du 18 oct. 2026 (lot 101). 101 prend comme série
-- l'organisation tant qu'elle n'a qu'une fiche entreprise active, la fiche sinon :
--   - deux fiches d'un même SIREN (un électricien qui ajoute une fiche « plomberie » sous la même EI) : la seconde
--     repartait à 00001 — deux factures d'une même année au même numéro pour un même contribuable
--     (BOI-TVA-DECLA-30-20-20-10 § 90 ; l'index de 098 inclut l'entreprise) ;
--   - archiver une fiche faisait basculer la règle et sauter des numéros dans la série de l'autre (rupture de
--     continuité, CGI ann. II art. 242 nonies A, I, 7°) ;
--   - par l'API, une facture émise pouvait changer d'entreprise émettrice (mention obligatoire ; ni 093 ni 099 ne la
--     figeaient), et sortir de sa série : son numéro redevenait libre ;
--   - dans une organisation à plusieurs entreprises, rien ne vérifiait qu'un avoir est émis par l'entreprise de sa
--     facture.
-- Relevé du 18 oct. 2026 : une fiche entreprise par organisation ; celles qui ont des factures ont un SIRET complet ;
-- aucune facture sans entreprise. Les numéros attribués restent les mêmes. Rien à reprendre.
--
-- Effet, pour un compte connecté (le serveur et les fonctions SECURITY DEFINER ne sont pas concernés) :
--   1. la série d'une facture est celle du contribuable qui l'émet : toutes les factures de l'organisation dont la
--      fiche a le même SIREN (9 premiers chiffres du SIRET), fiches archivées comprises ; les fiches sans SIREN
--      forment ensemble une série ; les factures sans entreprise (anciennes) comptent dans chaque série, par prudence.
--      Archiver ou ajouter une fiche ne change plus la série des autres ;
--   2. l'entreprise d'une facture ou d'un avoir émis ne change plus (la valeur envoyée est ignorée, comme user_id en
--      099) ;
--   3. un avoir est émis par l'entreprise de la facture qu'il rectifie : sans entreprise, il prend la sienne ; une
--      autre est refusée.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select position('siren' in pg_get_functiondef('public.dernier_numero_facture(uuid, uuid, text, integer)'::regprocedure)) > 0;
--     attendu : true
--   select position('NEW.entreprise_id := OLD.entreprise_id' in pg_get_functiondef('public.garder_organisation_piece_emise()'::regprocedure)) > 0;
--     attendu : true
--   select count(*) from devis a join devis f on f.id = a.avoir_source_id
--    where a.facture_type = 'avoir' and a.entreprise_id is distinct from f.entreprise_id;           -- attendu : 0
--   Ne jamais rejouer 101 après 102 (elle remettrait la série par fiche), ni 099 après 102 (l'entreprise ne serait plus figée).
-- ============================================================

-- SIREN d'une fiche entreprise : les 9 premiers chiffres de son SIRET (NULL s'il en manque)
CREATE OR REPLACE FUNCTION public.siren_entreprise(p_entreprise UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN length(c) >= 9 THEN left(c, 9) END
    FROM (SELECT regexp_replace(COALESCE(siret, ''), '\D', '', 'g') AS c FROM public.entreprise WHERE id = p_entreprise) s;
$$;
REVOKE ALL ON FUNCTION public.siren_entreprise(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siren_entreprise(UUID) TO service_role;

-- 1. Plus grand numéro de la série du contribuable (même SIREN, fiches archivées comprises ; sans SIREN : ensemble ;
--    factures sans entreprise dans chaque série), pour un membre de l'organisation seulement
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
                AND public.siren_entreprise(d.entreprise_id) IS NOT DISTINCT FROM v_siren))
       AND d.numero ~ v_motif), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.dernier_numero_facture(UUID, UUID, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dernier_numero_facture(UUID, UUID, TEXT, INTEGER) TO authenticated, service_role;

-- 3 (numérotation). Un avoir sans entreprise prend celle de la facture qu'il rectifie (définition de 101, sinon inchangée)
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
  -- Déjà numérotée : le numéro ne change plus (093 refuse de le modifier)
  IF TG_OP = 'UPDATE' AND OLD.type = 'facture' AND NULLIF(btrim(OLD.numero), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- Un avoir sans entreprise est émis par celle de sa facture (contrôlée ensuite par verifier_avoir_source, 100)
  IF NEW.facture_type = 'avoir' AND NEW.entreprise_id IS NULL AND NEW.avoir_source_id IS NOT NULL THEN
    NEW.entreprise_id := (SELECT entreprise_id FROM public.devis WHERE id = NEW.avoir_source_id);
  END IF;
  -- Brouillon sans numéro : rien à attribuer (l'app numérote à la création ; Q-numero-a-l-envoi)
  IF NULLIF(btrim(NEW.numero), '') IS NULL AND COALESCE(NEW.statut, '') = 'brouillon' THEN
    RETURN NEW;
  END IF;

  -- Entreprise qui émet (contrôlée, ou l'unique de l'organisation), préfixe selon la nature, année de Paris
  NEW.entreprise_id := public.entreprise_emettrice(NEW.organization_id, NEW.entreprise_id);
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

-- 2. Une pièce émise reste dans son organisation et garde son auteur et son entreprise (définition de 099 complétée)
CREATE OR REPLACE FUNCTION public.garder_organisation_piece_emise()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF OLD.type IS DISTINCT FROM 'facture' OR OLD.statut = 'brouillon' THEN
    RETURN NEW;
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Une pièce émise (facture ou avoir) reste dans son entreprise.'
      USING ERRCODE = '42501';
  END IF;
  -- L'app écrit le compte qui enregistre (src/lib/queryHelper.js withOrgScope) : un salarié qui encaisse la facture du
  -- patron ne la fait pas sienne
  NEW.user_id := OLD.user_id;
  -- L'entreprise qui a émis la pièce est une mention de la facture, et sa série : elle ne change plus (102)
  NEW.entreprise_id := OLD.entreprise_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_organisation_piece_emise() FROM PUBLIC, anon, authenticated;

-- 3. Un avoir rectifie une facture émise de la même organisation et de la même entreprise (définition de 100 complétée)
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
  -- même entreprise (trg_suivre_numerotation, 101-102, a déjà posé celle de l'avoir s'il n'en avait pas)
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
