# Avis juriste-btp du 4 nov. 2026 : lot électricien (Consuel, compte rendu d'intervention, TVA d'une borne)

**Objet** : relecture au texte de la branche `cloud/metier-electricien` (rappel Consuel, compte rendu d'intervention et d'autocontrôle, TVA de la pose d'une borne).
**Méthode** : relecture faite par la session locale le **4 nov. 2026**, textes officiels ouverts (Légifrance, versions en vigueur au 04/11/2026 ; recherche sur bofip.impots.gouv.fr). Versé ici tel que transmis à la session cloud de correction, qui n'avait pas accès aux textes : les citations n'ont pas été rouvertes par elle.
**Effet** : les trois points « à corriger » sont appliqués mot pour mot dans `src/lib/electricite.js`, `src/components/electricite/OngletElectricite.jsx`, `src/components/devis/TvaBorne.jsx` et `docs/metier-btp.md` § 7 (commit `fix(electricite): apply the 4 Nov local review…`).

---

## À corriger (appliqué)

### 1. Aide Consuel : d'où vient le délai de 20 jours

Le délai de 20 jours était attribué à D342-19, qui n'en contient aucun. Il vient de l'arrêté du 17 octobre 1973 : l'attestation doit « parvenir » au Consuel avant la « mise sous tension ». L'aide disait aussi « immeuble collectif » au lieu de « bâtiment d'habitation collectif ».

- **Sources** :
  - arrêté du 17 oct. 1973, art. 2 (version en vigueur depuis le 12/12/2024, modifié par l'arrêté du 4 déc. 2024, art. 3) : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000453474/2026-11-04 ;
  - code de l'énergie, art. D342-19 (version du 01/01/2025, décret n° 2024-1122) : https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023983208/LEGISCTA000031749125/2026-11-04 ;
  - décret n° 2017-26, art. 23 (version du 06/05/2021) : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000033860620/2026-11-04 ;
  - consultés le 04/11/2026.
- **Citation** : « doit parvenir à l’organisme agréé ayant délivré la formule vingt jours au moins avant la date prévue » « de la mise sous tension de l’installation par le distributeur d’énergie électrique. »
- **Texte retenu** (`AIDE_CONSUEL`) : « L’attestation de conformité visée par le Consuel est due notamment pour une installation neuve raccordée au réseau, une installation de production de moins de 250 kVA (photovoltaïque) qui demande une modification de l’installation intérieure, une installation entièrement rénovée après mise hors tension par le distributeur à la demande du client (code de l’énergie, art. D342-19), et une borne de recharge de plus de 36 kW ou située dans un bâtiment d’habitation collectif, quelle que soit sa puissance (décret n° 2017-26, art. 23). Elle doit parvenir au Consuel au moins vingt jours avant la date prévue de la mise sous tension par le distributeur (arrêté du 17 octobre 1973, art. 2). »
- `docs/metier-btp.md` § 7 : « Elle doit parvenir au Consuel au moins vingt jours avant la mise sous tension prévue (arrêté du 17 oct. 1973, art. 2, version du 12 déc. 2024) ; le Consuel la met ensuite à disposition du gestionnaire de réseau (D342-19, II). Vérifié au texte le 4 nov. 2026. »
- Note : l'aide nomme le document du Consuel par son nom officiel, « attestation de conformité visée par le Consuel ». C'est la seule occurrence admise du mot ; le document de l'artisan ne s'appelle jamais ainsi (test `electricite.test.js`).

### 2. Tâche et onglet Consuel : « mise sous tension » et « à faire parvenir »

« Mise en service » et « demande à envoyer » remplacés par « mise sous tension » et « à faire parvenir ».

- **Source** : arrêté du 17 oct. 1973, art. 2 (même version, même lien), consulté le 04/11/2026.
- **Citation** : « vingt jours au moins avant la date prévue » « de la mise sous tension de l’installation par le distributeur d’énergie électrique. »
- **Textes retenus** :
  - notes de la tâche : « À faire parvenir au Consuel au plus tard le {date limite}, vingt jours avant la mise sous tension prévue le {date} (arrêté du 17 octobre 1973, art. 2). Joignez ensuite l’attestation visée aux fichiers du chantier. » ;
  - état en retard : « Attestation à faire parvenir au Consuel : la date limite du {date} est passée. » ;
  - état à venir : « Attestation à faire parvenir au Consuel au plus tard le {date}. » ;
  - onglet : champ « Mise sous tension prévue » ; « Indiquez la date de mise sous tension prévue. » ; « Cette mise sous tension est dans moins de 20 jours : l’attestation devait déjà être parvenue au Consuel. Le rappel est créé en retard. » ; « Rappel créé : attestation à faire parvenir au Consuel au plus tard le {date}. » ; « Une tâche datée du dernier jour pour que l’attestation parvienne au Consuel (20 jours avant la mise sous tension) apparaîtra dans « À faire ». Aucun message n’est envoyé au client. »
- Le texte de la tâche (« Envoyer la demande d’attestation Consuel — chantier ») n'a pas changé : il sert à retrouver la tâche.

### 3. Qualification de l'installateur d'une borne : art. D. 353-2 du code de l'énergie

L'écran citait l'art. 22 du décret n° 2017-26, abrogé depuis le 1er juillet 2024. La règle est à l'art. D. 353-2 du code de l'énergie, et le 5,5 % y renvoie.

- **Sources** :
  - décret n° 2017-26, art. 22, « Abrogé par Décret n°2024-649 du 30 juin 2024 - art. 2 » : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000033860620/2026-11-04 ;
  - code de l'énergie, art. D353-2, I (en vigueur depuis le 01/07/2024) : https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023983208/LEGISCTA000043490868/2026-11-04 ;
  - CGI, annexe IV, art. 30-0 H, 3, a (version du 19/06/2025) : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051757592/2026-11-04 ;
  - consultés le 04/11/2026.
- **Citation** (30-0 H, 3, a) : « l'habilitation et, le cas échéant, la qualification, » « instituées au I ou au II de l'article D. 353-2 du code de l'énergie ; »
- **Textes retenus** :
  - case du volet (`TvaBorne.jsx`) : « J’ai l’habilitation (code du travail, art. R. 4544-9) et, sauf borne de 3,7 kW au plus dans une habitation privée non ouverte au public, la qualification IRVE (code de l’énergie, art. D. 353-2) » ;
  - ce qui manque (`suggestionTvaBorne`) : « l’habilitation et, le cas échéant, la qualification de l’installateur (code de l’énergie, art. D. 353-2 ; CGI, annexe IV, art. 30-0 H) ne sont pas indiquées » ;
  - `docs/metier-btp.md` § 7 : « Borne de recharge (IRVE) : installateur habilité (C. trav. R4544-9) et, sauf borne de 3,7 kW au plus dans une habitation privée non ouverte au public, qualifié par un organisme agréé (C. énergie D353-2, depuis le 1er juil. 2024 ; l'art. 22 du décret 2017-26 est abrogé). Vérifié au texte le 4 nov. 2026. »
- Erratum porté dans `avis-juriste-2026-11-03-soir.md` et `electricien.md`, qui citaient l'art. 22.

## À décider par Hugo (non appliqué)

### 4. Part « fourniture » d'une borne, case obligatoire « la ligne ne comprend que la pose »

- **Sources** : CGI art. 278-0 bis, N ; BOFiP : aucun paragraphe commentant le N trouvé (recherche sur bofip.impots.gouv.fr le 04/11/2026).
- **Citation** : « Les prestations de pose, d'installation et d'entretien d'infrastructures de recharge pour véhicules électriques »
- **Avis** : `TEXTE_FOURNITURE` est exact, à garder. Recommandé (décision n° 2 d'Hugo) : garder la case comme condition, par prudence, tant que le BOFiP ne dit pas si la borne fournie par l'installateur suit le 5,5 %.

### 5. Facture de dépannage tirée d'un compte rendu, sans devis préalable (décision n° 3)

- **Source** : arrêté du 24 janv. 2017, annexe 1 et art. 4, I (version du 01/04/2017) : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000033935513/2026-11-04, consulté le 04/11/2026.
- **Citation** : annexe 1 : « électricité »
- **Avis** : l'arrêté vise l'électricité, sans seuil. Recommandé : avertir sans bloquer, à la création de la facture d'un compte rendu de dépannage : « Dépannage chez un particulier : un devis détaillé devait lui être remis avant l’intervention (arrêté du 24 janvier 2017, art. 4). Pour le prochain, faites-le depuis « Dépannage express ». »

## Confirmé (rien à faire)

- **TVA de la pose d'une borne** : 5,5 % suggéré selon le local, les résidents et la configuration (type 2 ou prise E d'au moins 14 A), sans condition d'ancienneté ; la ligne marquée est retirée de la certification du client. Ce dernier point reste soumis à la **décision n° 6 d'Hugo** (règle documents-legal : une mention imprimée ne se retire pas sans décision).
- **Compte rendu d'intervention et d'autocontrôle** : titre, déclaration, mention de portée. Jamais « conforme », « certifié » ni « attestation de conformité » ; le Consuel n'est pas imité.

## Textes nouveaux de la session de correction, non relus au texte

Écrits sans accès aux textes officiels, à faire relire par juriste-btp (voir `docs/cloud/metier-electricien.md`, corrections du 4 nov.) :
- rappel de Paramètres › Électricité (calqué sur Paramètres › Ramonage, relu le 24 oct.) ;
- `TEXTE_TAUX_A_VERIFIER`, complété pour le photovoltaïque ;
- titre « Compte rendu d’intervention » quand aucune mesure n'est saisie.

## Suite : décisions d'Hugo du 5 nov. 2026 (D-39)

L'avis ci-dessus est versé tel qu'il a été rendu. Hugo a tranché le 5 nov. 2026 (« OK pour tout » : chaque recommandation est retenue) :

- **Point 4 (case « la ligne ne comprend que la pose »)** : gardée comme condition du bouton 5,5 % d'une borne (test `src/components/__tests__/electriciteEcrans.test.jsx`).
- **Point 5 (facture de dépannage sans devis)** : avertir sans bloquer, pour un client particulier seulement (`estClientParticulier`). Le texte est celui de l'avis, à une différence près : le renvoi « Pour le prochain, faites-le depuis « Dépannage express » » devient « Pour le prochain, faites-le depuis « Devis » », « Dépannage express » étant un écran de `cloud/metier-depannage`, absent de cette branche (`TEXTE_DEPANNAGE_SANS_DEVIS`, `src/lib/electricite.js`). **Renvoi à relire par le juriste.**
- **Retrait de la certification du client pour une pose de borne à 5,5 %** (décision n° 6 du rapport) : tranché, le code garde ce retrait.
- **Mention propre à la borne** (décision n° 1 du rapport) : imprimée sur le devis et la facture pour une ligne de pose marquée à 5,5 %, texte de la décision gardé tel quel (`MENTION_BORNE`, `src/lib/mentionTvaReduite.js`). **À relire par le juriste**, qui vérifiera la lettre N de l'art. 278-0 bis au texte officiel.
- **Exception du dépannage urgent** (L. 221-10, 4°) : ajoutée au rappel de Paramètres › Ramonage, recopiée de celui de Paramètres › Électricité. **À relire par le juriste** : un ramonage est-il visé par cette exception ?
