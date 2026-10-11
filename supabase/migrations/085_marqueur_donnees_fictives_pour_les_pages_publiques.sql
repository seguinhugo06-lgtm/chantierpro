-- ============================================================
-- Migration 085: marqueur « données fictives » pour les pages publiques
-- ============================================================
-- Pourquoi : le compte de démonstration (D-26, contact@mallettico.fr) porte un réglage `donneesFictives`
--   (settings_json.reglages) : l'app affiche un bandeau « Données fictives — démonstration » et un filigrane
--   « EXEMPLE » sur les documents (relecture juridique du 11 oct. 2026 : rien de ce qui est filmé ne doit passer
--   pour une vraie entreprise, C. conso. L121-2). Les pages publiques de signature (/devis/signer) et de
--   paiement (/pay) ne reçoivent de la fiche qu'une liste fermée de champs : sans ce marqueur, le client
--   voyait le devis du compte démo sans filigrane.
--   En le vérifiant au banc, constaté aussi en production : la page de paiement recevait une fiche entreprise
--   VIDE (« v_entreprise IS NOT NULL » n'est vrai que si toutes ses colonnes sont remplies) : le client voyait
--   « Votre artisan », sans adresse ni IBAN ; et la fiche lue était une fiche quelconque du compte.
-- Effet : get_devis_for_signature transmet `donneesFictives` (vrai, sinon absent) parmi les réglages imprimés ;
--   get_facture_for_payment transmet la fiche de la facture (et le client) et `donnees_fictives` (vrai ou faux).
--   Les définitions en place sont modifiées sur ces seuls points (relues en base, pas recopiées) ; la migration
--   refuse de s'appliquer si elles n'ont pas la forme attendue.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT position('donneesFictives' in pg_get_functiondef('public.get_devis_for_signature(uuid)'::regprocedure)) > 0 AS signature,
--          position('donnees_fictives' in pg_get_functiondef('public.get_facture_for_payment(text)'::regprocedure)) > 0 AS paiement;
--   → true, true
--   SELECT get_facture_for_payment(payment_token) -> 'entreprise' ->> 'nom' FROM devis WHERE type = 'facture' AND payment_token IS NOT NULL LIMIT 1;
--   → le nom de l'entreprise (avant : NULL, fiche vide)
-- ============================================================

DO $migration$
DECLARE
  v_def TEXT;
  v_neuf TEXT;
BEGIN
  -- 1. Page de signature : un réglage de plus dans la liste fermée (083)
  IF to_regprocedure('public.get_devis_for_signature(uuid)') IS NOT NULL THEN
    v_def := pg_get_functiondef('public.get_devis_for_signature(uuid)'::regprocedure);
    IF position('donneesFictives' in v_def) = 0 THEN
      v_neuf := replace(v_def,
        $a$'tauxPenalites', r ->> 'tauxPenalites'$a$,
        $b$'tauxPenalites', r ->> 'tauxPenalites',
        'donneesFictives', CASE WHEN r ->> 'donneesFictives' = 'true' THEN true END$b$);
      IF v_neuf = v_def THEN
        RAISE EXCEPTION '085 : get_devis_for_signature n''a pas la forme attendue (083), rien n''est modifié';
      END IF;
      EXECUTE v_neuf;
    END IF;
  END IF;

  -- 2. Page de paiement (081) : la fiche transmise, et le marqueur
  IF to_regprocedure('public.get_facture_for_payment(text)') IS NOT NULL THEN
    v_def := pg_get_functiondef('public.get_facture_for_payment(text)'::regprocedure);
    IF position('donnees_fictives' in v_def) = 0 THEN
      v_neuf := v_def;
      -- a) « v_entreprise IS NOT NULL » n'est vrai que si TOUTES les colonnes de la fiche sont remplies : la
      --    page recevait une fiche vide (constaté en production le 11 oct. 2026 : « Votre artisan », ni adresse
      --    ni IBAN). Même défaut pour le client.
      v_neuf := replace(v_neuf, 'CASE WHEN v_entreprise IS NOT NULL THEN', 'CASE WHEN v_entreprise.id IS NOT NULL THEN');
      v_neuf := replace(v_neuf, 'CASE WHEN v_client IS NOT NULL THEN', 'CASE WHEN v_client.id IS NOT NULL THEN');
      -- b) La fiche de la facture (puis active, par défaut, la plus ancienne), plus une fiche quelconque du compte
      v_neuf := replace(v_neuf,
        $a$  SELECT * INTO v_entreprise
  FROM entreprise
  WHERE user_id = v_facture.user_id;$a$,
        $b$  SELECT * INTO v_entreprise
  FROM entreprise
  WHERE user_id = v_facture.user_id
  ORDER BY (id IS NOT DISTINCT FROM v_facture.entreprise_id) DESC, (archived_at IS NULL) DESC,
           COALESCE(is_default, false) DESC, created_at
  LIMIT 1;$b$);
      -- c) Le marqueur du compte de démonstration
      v_neuf := replace(v_neuf,
        $a$'bic', v_entreprise.bic$a$,
        $b$'bic', v_entreprise.bic,
      'donnees_fictives', COALESCE(v_entreprise.settings_json -> 'reglages' ->> 'donneesFictives' = 'true', false)$b$);
      IF position('v_entreprise.id IS NOT NULL' in v_neuf) = 0 OR position('v_client.id IS NOT NULL' in v_neuf) = 0
         OR position('ORDER BY (id IS NOT DISTINCT FROM v_facture.entreprise_id)' in v_neuf) = 0
         OR position('donnees_fictives' in v_neuf) = 0 THEN
        RAISE EXCEPTION '085 : get_facture_for_payment n''a pas la forme attendue (081), rien n''est modifié';
      END IF;
      EXECUTE v_neuf;
    END IF;
  END IF;
END $migration$;
