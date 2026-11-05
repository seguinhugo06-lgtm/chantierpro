# Avis juriste-btp du 4 nov. 2026 : lot 1 « métiers » (qualifications, bibliothèque, climatisation)

**Objet** : relecture au texte officiel de la branche `cloud/metier-qualifications` (lot 1 de `docs/metiers/synthese.md`).
**Provenance** : avis rendu à la session locale le 4 nov. 2026 (relecture de la branche), transmis à la session cloud de correction dans sa consigne (« metier-qualifications-v3 »). Il est versé ici **tel qu'il a été transmis** : la session cloud n'a pas pu rouvrir les textes (BOFiP et Légifrance non joignables depuis le cloud). Sources, citations et dates de consultation sont celles du juriste.

## À corriger (3)

### 1. Multiservice : « Pose d'étagère ou de tringle à rideaux » proposée à 10 %
Ce sont des éléments mobiliers, au taux normal.
- **Source** : BOI-TVA-LIQ-30-20-90-20-20260909, § 300 et § 370, https://bofip.impots.gouv.fr/bofip/1666-PGP.html/identifiant=BOI-TVA-LIQ-30-20-90-20-20260909, consulté le 04/11/2026.
- **Citation** : § 370 : « Les opérations portant sur des éléments mobiliers, telles que la fourniture et la pose de tringles à rideaux » … « relèvent du taux normal de la taxe »
- **Correction** : `src/lib/templates/trade-library.js` : ligne à 20 %, commentaire « éléments mobiliers : taux normal (BOI-TVA-LIQ-30-20-90-20 § 300 et 370) ». **Fait** (voir le rapport de la branche).

### 2. Services à la personne : numéro ET date d'enregistrement de la déclaration
Le texte exige « le numéro et la date d'enregistrement de la déclaration » sur la facture. L'app disait « date de la déclaration » et n'imprimait rien par défaut.
- **Source** : C. trav. D7233-1, 2° (version du 30/12/2016), https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033747505/2026-11-04, consulté le 04/11/2026.
- **Citation** : « produisent une facture faisant apparaître : » … « 2° Le numéro et la date d'enregistrement de la déclaration si celle-ci a été demandée »
- **Correction** : ligne imprimée « Services à la personne : déclaration enregistrée sous le n° {numéro} le {date} » ; raison « Ajoutez la date d'enregistrement de la déclaration : elle s'imprime avec son numéro. » ; libellé « Date d'enregistrement de la déclaration » ; aide « Obligatoire avec le numéro sur vos factures de services à la personne (code du travail, art. D7233-1, 2°). » ; avertissement « À imprimer sur vos factures de services à la personne, où elle est obligatoire (code du travail, art. D7233-1, 2°) ; sur d'autres travaux, elle laisserait croire à un crédit d'impôt. » **Fait.**
- **Décision d'Hugo** (5 nov. 2026, D-41) : par défaut « Seulement si une ligne contient… » plutôt que « Ne pas l'imprimer ». **Remplacée le même jour** après l'avis du lot 4 (point 9, `docs/metiers/multiservice.md` § 3 et § 6) : la déclaration de services à la personne ne s'imprime plus du tout, pour l'instant ; « Où l'imprimer » est figé sur « Ne pas l'imprimer », sans autre choix, avec la raison à l'écran (décision de la session locale).

### 3. « Qualiopi certifie les organismes de formation »
Qualiopi est le nom de la certification, pas un certificateur.
- **Source** : C. trav. L6316-1 (version du 01/01/2024), https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048600506/2026-11-04, consulté le 04/11/2026.
- **Citation** : Les prestataires « sont certifiés sur la base de critères définis par décret en Conseil » « d'Etat. »
- **Correction** : « Qualiopi est la certification des organismes de formation, pas une qualification RGE. Choisissez l'organisme qui a délivré votre RGE (Qualibat, Qualifelec, Qualit'EnR…). » et « Qualiopi est la certification des organismes de formation : choisissez l'organisme qui a délivré cette qualification. » **Fait.**

## Confirmé (rien à faire) (2)

- Climatisation : fourniture séparée à 20 %, pose à 10 % (bibliothèque Chauffage et nouveau métier Froid).
- Lignes de qualification imprimées (RGE avec intitulé, organisme, numéro et date ; IRVE, fluides, PG, Certibiocide, Certiphyto) ; jamais sans numéro ni après la date ; « 20 métiers » sur le site.

## Ce que cet avis ne couvre pas (à relire au texte par la session locale)

- Libellé « Autre » (« {intitulé} — {organisme} — N° {numéro} — Valide jusqu'au {date} ») : non cité dans l'avis.
- Complément de charge en fluide frigorigène (bibliothèque Froid, laissé à 10 %, commentaire « à vérifier ») et petites fournitures de climatisation (liaisons, pompe de relevage, passées à 20 %) : l'avis confirme le principe fourniture 20 % / pose 10 %, sans viser ces lignes une à une. CGI 279-0 bis, 1 ; ann. IV art. 30-00 A.
- Modèles de devis de climatisation (`src/lib/data/modeles/chauffage.js`) séparés après l'avis selon le même principe : relus par juriste-btp dans la session cloud de correction (voir le rapport), sans le BOFiP.
- « Fourniture et pose d'étagères mélaminées 19 mm sur crémaillères » (métier Menuiserie, à 10 %) : hors du lot 1, à trancher au regard du même § 370.
