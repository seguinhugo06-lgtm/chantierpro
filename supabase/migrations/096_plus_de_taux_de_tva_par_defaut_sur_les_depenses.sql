-- 096 — Plus de taux de TVA par défaut sur les dépenses (tâche depenses-defaut-tva, 17 oct. 2026)
--
-- Pourquoi : depuis D-28, la TVA déductible d'une dépense est celle saisie (taux porté sur la facture du fournisseur,
-- 0 % compris) ; sans taux, rien ne se déduit (CGI art. 271). Or en production `depenses.taux_tva` a DEFAULT 20 :
-- une ligne insérée sans ce champ (import, SQL, autre client) recevrait un taux de 20 % présenté comme saisi.
-- L'app envoie toujours le champ (null compris) : aucune ligne n'en a hérité (relevé du 17 oct. : 5 dépenses, aucune
-- avec un taux). Les colonnes montant_ht, taux_tva, montant_tva ont été ajoutées hors dépôt : elles sont créées ici si
-- elles manquent, pour que le dépôt décrive la base.
--
-- Effet : plus de valeur par défaut sur taux_tva ; colonnes documentées. Aucune ligne modifiée.
--
-- Vérification après application :
--   select column_name, column_default from information_schema.columns
--    where table_schema = 'public' and table_name = 'depenses' and column_name in ('montant_ht', 'taux_tva', 'montant_tva');
--   -- attendu : trois lignes, column_default vide partout
--   select count(*) filter (where taux_tva is not null) from depenses;  -- attendu : inchangé (0 le 17 oct. 2026)

DO $$
BEGIN
  IF to_regclass('public.depenses') IS NULL THEN
    RETURN;
  END IF;
  -- Verrou exclusif bref (catalogue seulement, aucune réécriture) : ne pas attendre derrière une requête longue
  PERFORM set_config('lock_timeout', '5s', true);
  ALTER TABLE public.depenses ADD COLUMN IF NOT EXISTS montant_ht NUMERIC;
  ALTER TABLE public.depenses ADD COLUMN IF NOT EXISTS taux_tva NUMERIC;
  ALTER TABLE public.depenses ADD COLUMN IF NOT EXISTS montant_tva NUMERIC;
  ALTER TABLE public.depenses ALTER COLUMN taux_tva DROP DEFAULT;

  COMMENT ON COLUMN public.depenses.montant IS
    'Montant hors taxes de la dépense (D-28) ; en franchise de TVA, le montant payé (la TVA ne se déduit pas).';
  COMMENT ON COLUMN public.depenses.montant_ht IS
    'Montant hors taxes ; NULL en franchise de TVA (le montant payé n''est pas un HT).';
  COMMENT ON COLUMN public.depenses.taux_tva IS
    'Taux de TVA porté sur la facture du fournisseur, 0 compris ; NULL = non saisi : aucune TVA déductible (CGI art. 271, D-28).';
  COMMENT ON COLUMN public.depenses.montant_tva IS
    'TVA de la facture du fournisseur ; prime sur montant HT × taux quand elle est saisie.';
END $$;
