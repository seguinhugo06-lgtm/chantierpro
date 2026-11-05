# Session cloud « metier-electricien » — rapport (4 nov. 2026)

Branche `cloud/metier-electricien`, partie de `main` à `73b1e04`. Rien n'est livré, rien n'est appliqué. Lot 4 de `docs/metiers/synthese.md`.

## 1. Le cadrage, revu par `critique-produit` avant le code

Verdict : « go avec changements ». Ce que j'ai repris :
- **Correctif TVA d'abord.** C'est un défaut déjà en production : une ligne de borne à 5,5 % imprimait la certification « rénovation énergétique, locaux achevés depuis plus de deux ans » (CGI 278-0 bis A), qui ne vise pas une borne.
- **Rappel Consuel par une tâche datée.** Pas de nouvelle colonne ni de nouveau moteur de rappel. La tâche passe par le mécanisme existant des tâches, qui alimente déjà « À faire ».
- **TVA de la borne dans l'éditeur de devis**, sur la ligne : le taux se décide sur le devis signé. Je ne l'ai pas mise dans le compte rendu.

Ce que je n'ai pas repris : le critique proposait de remettre le compte rendu à plus tard. Ta mission le demande explicitement, je l'ai donc construit, en version simple : pas d'envoi par e-mail, le PDF passe par la feuille de partage du téléphone.

## 2. Ce qui est fait

### Réglage
Paramètres › Documents › **Électricité** : « Je fais des travaux d'électricité ». Il est éteint par défaut. Une fois allumé, la fiche chantier gagne un onglet **Électricité**.

### Rappel Consuel à J-20
- Dans l'onglet, l'artisan saisit la date de mise en service prévue, puis touche « Me rappeler l'envoi au Consuel ».
- L'app crée une tâche « Envoyer la demande d'attestation Consuel — chantier », datée de la mise en service moins 20 jours (code de l'énergie, art. D342-19).
- La tâche entre dans « À faire » ce jour-là et passe en retard le lendemain.
- « J'ai envoyé la demande » coche la tâche. « Joindre l'attestation visée » range le fichier dans les fichiers du chantier.
- C'est un rappel pour l'artisan : aucun message ne part au client. L'app ne fabrique ni n'imite le Consuel (ni couleur, ni CERFA).
- Fichiers : `src/lib/electricite.js` (`tacheConsuel`, `etatConsuel`) et `src/components/electricite/OngletElectricite.jsx`.

### Compte rendu d'intervention et d'autocontrôle
- **Saisie** sur un écran : client, adresse, date, nature, travaux réalisés, mesures facultatives (terre, isolement, différentiels, continuité, repérage), réserves, observations, prix HT.
- **Aperçu**, puis **enregistrement** : la base donne le numéro `CRI-AAAA-NNNNN` et fige le document.
- **Annulation** motivée, puis « Refaire » : le nouveau compte rendu « annule et remplace » l'ancien.
- **PDF** et **« Faire la facture »** : un brouillon de facture lié au chantier, qui cite le numéro du compte rendu.
- **Mots** : le document ne s'appelle jamais « attestation de conformité » ; aucun « conforme » ni « certifié ».
- Un pied dit ce que le compte rendu ne remplace pas : le Consuel, et l'état de l'installation intérieure d'électricité établi par un diagnostiqueur.
- Sans aucune mesure saisie, le document ne parle pas d'autocontrôle.
- C'est un document propre : un seul générateur, `src/lib/compteRenduElectriciteHtml.js`. La facture tirée passe, elle, par les deux générateurs habituels.

### TVA d'une borne, suggérée selon le local
Sous une ligne de devis qui parle d'une borne (« borne », « IRVE », « wallbox »…), un volet « Borne de recharge : quel taux pour la pose ? » pose ces questions :
- local d'habitation ou autre ;
- borne destinée aux résidents ;
- point de charge : type 2, ou prise de type E « renforcée » d'au moins 14 A ;
- habilitation et qualification de l'installateur (décret n° 2017-26, art. 22) ;
- « la ligne ne comprend que la pose ».

Si tout est oui, l'app suggère 5,5 % (CGI 278-0 bis, N). Le bouton « Appliquer » est un choix de l'artisan, jamais un blocage.

La fonction ne reçoit pas le client : le critère est le local. Un syndic, une SCI ou un professionnel ont la même suggestion (testé).

Pour la part « fourniture », l'app ne suggère **aucun** taux.

**Correctif des deux générateurs.** Une ligne marquée « pose de borne » à 5,5 % ne déclenche plus la certification du client. Le bloc commun est `src/lib/mentionTvaReduite.js` ; `devisHtmlBuilder.js` et `DevisPage.jsx` lui passent les lignes. La marque s'efface quand on change le taux ou la désignation.

### Qualification IRVE : un point d'accroche seulement
La branche `cloud/metier-qualifications` n'existait pas sur le dépôt le 4 nov. La fonction `qualificationIrve(entreprise)` lit `entreprise.qualifications` (type IRVE, avec un numéro). Un compte rendu de borne imprime « Qualification IRVE (organisme) : n° … », seulement si le numéro existe.

À brancher quand la liste « Mes qualifications » sera livrée :
- vérifier le nom des champs (`type`, `organisme`, `numero`) ;
- pré-cocher la case « qualification » du volet TVA.

### Migration 111 (préparée, appliquée nulle part)
`supabase/migrations/111_comptes_rendus_d_intervention_electricite.sql` et `scripts/banc/111.mjs` (22 vérifications).
- **Table** `comptes_rendus_electricite` : RLS par organisation, aucune suppression, rien pour un visiteur.
- **Numéro** donné par la base, sous verrou.
- **Contenu figé** pour un compte connecté ; liens au client, au chantier et au compte rendu remplacé figés ; date de mise à jour posée par la base ; tailles bornées.
- **Contrôles** : chantier, client, facture et compte rendu remplacé doivent être de la même organisation.
- **Départ d'un membre** (105) et suppression du compte d'un salarié : ses comptes rendus passent au gérant.
- Requêtes de contrôle après application : dans l'en-tête du fichier.
- **À appliquer AVANT d'allumer le réglage Électricité en production.** Sans la table, la lecture reste muette (erreur de schéma), mais l'enregistrement d'un compte rendu échouerait.

## 3. Preuves (ce qui a tourné)

| Contrôle | Résultat |
|---|---|
| `npm ci` | fait |
| `npm run verifier` (standard) sur `12547fc` | vert : 1 255 tests, lint 0 erreur, smoke, build |
| `npm run banc:migrations` | vert : 668 vérifications, dont les 22 de 111 |
| `src/lib/__tests__/electricite.test.js` | 28 tests : J-20 (au 30/11, dans « À faire » le 10/11, en retard le 11/11), nom du document, mots interdits, TVA selon le local (avec contre-essais : autre local, client professionnel, ligne non marquée qui garde la certification), générateur de la page de signature |
| Parcours `scripts/parcours/electricite.cjs` à 375 px (`npm run parcours -- électricien`) | vert, 21 vérifications : sans le réglage, pas d'onglet (contre-essai) ; rappel créé ; compte rendu à vide refusé, puis saisi ; aperçu sans « conforme » ; numéro `CRI-2026-00001` ; PDF produit (`audit-ui/electricite-compte-rendu.pdf`) ; facture tirée (495,00 € TTC, numéro du compte rendu cité) ; tâche Consuel dans « À faire » |
| `npm run verifier -- --complet` sur `cee017c` | tests (1 258), lint, smoke, build, banc et audit d'interface **verts** ; parcours : **6 échecs** au premier passage, pendant que deux `git push` faisaient tourner en même temps le hook de pré-push (tests + build) sur la même machine ; noms des 6 non affichés par le résumé |
| `npm run parcours` relancé seul, même commit | **172 parcours réussis sur 172** ; le fichier `audit-ui/derniere-verification.json` garde l'échec du premier passage : la session locale doit rejouer `npm run verifier -- --complet` avant de livrer |

Captures (dossier `audit-ui/`, ignoré par git) : `electricite-consuel-375.png`, `electricite-compte-rendu-375.png`, `electricite-facture-375.png`.

## 4. Relectures

- **critique-produit** : voir § 1.
- **juriste-btp** : Légifrance n'était pas joignable depuis la session, donc rien n'a été relu au texte ce jour-là. Le juriste s'est appuyé sur sa relecture au texte du 3 nov. au soir.
  - Ses 2 points bloquants sont corrigés : une ligne marquée mais passée à 10 % gardait la marque et faisait perdre la certification 10 % ; le 5,5 % pouvait s'appliquer à une ligne « fourniture et pose ».
  - Ses 5 corrections de texte sont appliquées : fourniture, autocontrôle sans mesure, aide Consuel, fichier « Consuel », nom de l'« état de l'installation intérieure d'électricité ».
  - Sa correction n° 8 est appliquée : pour une installation neuve ou une borne, un avertissement s'affiche à la création de la facture, « Vérifiez le taux de TVA… ».
  - Son avis : l'exclusion de la certification pour une borne est juste. Le 278-0 bis N ne demande aucune certification du client, et la loi n° 2025-127, art. 41, ne vise que les art. 279-0 bis et 278-0 bis A. À confirmer au BOFiP.
- **gardien-securite** : « migration applicable telle quelle », rien de critique ni de moyen.
  - Les points faibles F1, F2, F3 et une partie de F5 sont corrigés, et vérifiés au banc.
  - F4 (pas de contrôle de rôle) reste, comme pour les devis et les ramonages : c'est la tâche `org-droits`.
  - F5, seconde partie (comparer les bases de `tvaDetails`) : non faite, voir les risques.

## 5. Textes nouveaux soumis au juriste

Tous dans `src/lib/electricite.js`, `src/lib/compteRenduElectriciteHtml.js` et `src/components/devis/TvaBorne.jsx` :
- **Consuel** : `AIDE_CONSUEL`, le texte et les notes de la tâche, les états de l'onglet ;
- **compte rendu** : titre, libellés des mesures, déclaration (`phraseCompteRendu`), `MENTION_PORTEE` ;
- **TVA de la borne** : textes de la suggestion, `TEXTE_FOURNITURE`, questions et avertissements du volet ;
- **facture** : `TEXTE_TAUX_A_VERIFIER`.

## 6. Décisions pour Hugo

1. **Mention propre à la borne** sur le devis et la facture (facultative, proposée par le juriste) : « TVA à 5,5 % : pose d'une infrastructure de recharge dans un local à usage d'habitation, destinée aux résidents (CGI art. 278-0 bis, N) ». L'imprimer ou non ? Aujourd'hui, rien n'est imprimé.
2. **« La ligne ne comprend que la pose »** : la case est aujourd'hui obligatoire pour faire apparaître le bouton 5,5 %. On garde cette condition, ou un simple avertissement suffit ?
3. **Facture de dépannage tirée d'un compte rendu, sans devis.** L'arrêté du 24 janv. 2017 pourrait imposer un devis préalable au-delà d'un seuil (non relu au texte). Bloquer, avertir, ou laisser ?
4. **Le compte rendu sans testeur** : le critique demande que toi et un testeur disiez que vous remettriez ce papier, et sous quelle forme. Sinon, le réglage reste éteint.
5. **Signature tracée au doigt** sur le compte rendu : la colonne existe, l'écran ne la propose pas encore. La veux-tu ?

## 7. Ce qui reste

- **Vérification complète à rejouer en local**, sur une machine au repos (voir § 3) ; je ne l'ai pas relancée en entier, pour économiser le crédit cloud.
- **À relire au texte** (réseau à ouvrir : `legifrance.gouv.fr`, `bofip.impots.gouv.fr`) :
  - D342-19 : le texte dit-il « mise en service » ou « mise sous tension » ? La tâche doit reprendre son mot.
  - Taux de la part « fourniture » d'une borne (BOFiP).
  - CCH L271-4 et loi n° 89-462, art. 3-3, si l'on veut citer ces articles dans le pied du compte rendu (aujourd'hui, aucun article n'y est cité).
- **Non fait, hors périmètre** :
  - dossier de fin de chantier en un PDF ;
  - photos du tableau jointes au compte rendu ;
  - photovoltaïque ;
  - modèle de devis avec une ligne « attestation Consuel (frais de visa) » : les modèles photovoltaïques en ont déjà une, et une borne individuelle de 22 kW n'en demande pas.
- **Pour la session locale** : la migration 111 n'est pas encore inscrite dans `docs/etat-production.md` (fichier commun aux six sessions : je ne l'ai pas touché, pour éviter les conflits).

## 8. Risques

- **Réglage allumé avant la migration 111** : l'enregistrement d'un compte rendu échoue en production. Il faut appliquer 111 d'abord.
- **Repérage des bornes** : il se fait sur la désignation libre de la ligne. Une ligne mal nommée n'affiche pas le volet, et garde alors le comportement d'avant : certification imprimée à 5,5 %.
- **Une marque mal posée peut retirer la certification à tort.** Cas : une ligne marquée à 5,5 % qui ne serait pas une borne (la marque s'efface pourtant au changement de désignation). L'exclusion compare les lignes, pas les bases de `tvaDetails` (gardien, F5, seconde partie).
- **Le volet n'existe que dans l'éditeur principal (`DevisComposer`)**, pas dans l'assistant `DevisWizard`, qui sert aux avoirs.
- **La tâche Consuel est retrouvée par le début de son texte** : si l'artisan la renomme, l'onglet ne la voit plus et propose d'en créer une autre.

## Résumé (10 lignes)

1. Réglage « Électricité », éteint par défaut ; il ajoute un onglet à la fiche chantier.
2. Rappel Consuel : une tâche datée de la mise en service moins 20 jours, dans « À faire ». Le fichier visé se joint au chantier.
3. Compte rendu d'intervention et d'autocontrôle : numéroté par la base, figé, PDF, facture tirée. Jamais « conforme ».
4. TVA d'une borne : 5,5 % suggéré sur la ligne du devis selon le local, jamais selon le client. Aucun taux pour la fourniture.
5. Correctif des deux générateurs : une pose de borne ne déclenche plus la certification « rénovation énergétique ».
6. Migration 111 préparée et vérifiée au banc (668 vérifications vertes). À appliquer avant d'allumer le réglage.
7. Standard vert ; complet vert sauf 6 parcours tombés sous charge, puis 172 parcours sur 172 relancés seuls. À rejouer en local.
8. Relectures : critique-produit (cadrage réduit), juriste-btp (2 points bloquants corrigés), gardien-securite (applicable).
9. Qualification IRVE : point d'accroche seulement (`cloud/metier-qualifications` absente).
10. Tes 5 décisions sont au § 6 ; restent à relire au texte : D342-19 et la TVA de la fourniture.

## Corrections de la relecture du 4 nov.

Session cloud de correction, le 4 nov. au soir. `origin/main` (à `4da7322`) fusionné d'abord dans la branche (`ee5f6af`) : un seul conflit, `src/services/entrepriseService.js`, résolu en gardant les deux clés (`ramonageConseils` de main et `electriciteActif`). Commits : `f7677cf` (code, migration, parcours), `073a768` (avis du juriste, documents, parcours des deux générateurs), `f3d2e19` (texte corrigé par le juriste, banc).

### Défauts de la relecture

| # | Point | Fait | Commit, ou pourquoi non |
|---|---|---|---|
| 1 | Vérification complète rouge sur `cee017c` | Rejouée sur le commit final, machine au repos : voir « Preuves » | — |
| 2 | Aucun parcours `reel: true` | 3 parcours en base simulée : numéro donné par la base et repris à l'écran, relecture, facture puis lien, annulation, tâche Consuel ; droits (chef de chantier, lecture seule, contre-essai patron) ; deux générateurs | `f7677cf`, `073a768` |
| 3 | Prix visible sans `canViewPrices` | `voitPrix` passé à l'onglet puis à la saisie ; sans ce droit, champ masqué et prix non recopié par « Refaire » | `f7677cf`. **Pas fait dans `SaisieRamonage`** (même défaut sur main, hors de cette branche ; il reprend aussi les prix des tarifs et du dernier passage : à traiter à part) |
| 4 | Annuler, Refaire, « J'ai envoyé la demande » sans droit | Annuler et Refaire sous `peutModifier` ; « J'ai envoyé la demande » sous `canPerform('memo', 'edit')` ; côté base, 111 refuse l'écriture d'un membre `readonly` | `f7677cf` |
| 5 | Certification retirée pour une pose de borne, sans décision | Relu par juriste-btp au texte (local) : « confirmé ». **Code laissé tel quel, en attente de la décision n° 6 d'Hugo** ; `electricien.md` l. 109 dit maintenant cet état | `073a768`. Si Hugo refuse : retirer le bloc `REGIME_BORNE` de `tauxReduitsPresents` (`mentionTvaReduite.js`) |
| 6 | Avis du juriste non versé | Avis versé : `docs/metiers/avis-juriste-2026-11-04-electricien.md` (les 7 points, sources et citations de la relecture locale) ; les 3 « à corriger » appliqués mot pour mot (vérifié par juriste-btp) | `f7677cf`, `073a768` |
| 7 | Décision n° 3 mal posée ; rappel absent de Paramètres › Électricité | Décision reposée ci-dessous ; rappel ajouté, avec l'exception du dépannage urgent (L221-10, 4°) demandée par juriste-btp | `f7677cf`, `f3d2e19` |
| 8 | Accroche IRVE incompatible avec « Mes qualifications » | `qualificationIrve` lit la forme de la migration 110 (`type: 'irve'`, intitulé, organisme, numéro, `fin`, `imprimer`), juge la validité à la date de l'intervention, et la ligne imprimée est figée dans `emetteur` ; le PDF ne lit plus la fiche du jour. Règles **recopiées** de `qualifications.js` (absent de main) : à la fusion, importer `raisonNonImprimee` et `ligneImprimee` à la place | `f7677cf` |
| 9 | Envoi au client absent | **Non fait** : c'est la décision n° 8 d'Hugo | — |
| 10 | Rappel Consuel par tâche au lieu de `rappelsDus` | **Non changé** : écart à la consigne, à valider (décision n° 7) | — |
| 11 | Titre « … et d'autocontrôle » sans mesure | Sans mesure : « Compte rendu d'intervention » (titre, `<title>`, nom de partage) | `f7677cf` |
| 12 | « bornes » au pluriel, bornes d'éclairage | Pluriel reconnu ; borne d'éclairage, lumineuse, de jardin… écartée, sauf si la ligne parle de recharge ; tests | `f7677cf` |
| 13 | Photovoltaïque sans avertissement de taux | `photovoltaique` ajouté à `TAUX_A_VERIFIER` ; texte complété, relu « exact » par juriste-btp (sur pièces) | `f7677cf` |
| 14 | Générateur de DevisPage non vérifié | Parcours : aperçu (DevisPage) et page de signature (devisHtmlBuilder) d'un devis avec pose marquée à 5,5 % et ligne à 10 % ; contre-essai sans la marque | `073a768` |
| 15 | Boutons de TVA globale gardent la marque | La marque est retirée par ces boutons ; le titre du volet suit le taux réel de la ligne | `f7677cf` |
| 16 | Tailles de 111, colonne `signature` | Tous les champs bornés ; colonne `signature` retirée (et de l'envoi) | `f7677cf` |
| 17 | Mémoire du gardien | F1 à F3 « corrigée », F4 et F6 corrigées dans 111, F5 en partie ; note pour la fusion avec metier-entretien (pas de fusion faite ici) | `073a768` |
| 18 | « décision d'Hugo n° 22 » | Remplacé par D-36 | `f7677cf` |

Points du juriste (à corriger 1 à 3) : appliqués mot pour mot, tests et parcours mis à jour. Points du gardien (1 à 3) : appliqués à 111 (tailles, refus « Organisation interdite » avant le verrou, `readonly` sans écriture). **Pas reportés dans 104 ni 113** (hors de cette branche).

### Preuves

| Contrôle | Résultat |
|---|---|
| `src/lib/__tests__/electricite.test.js` | 31 tests verts. Contre-essai : avec l'ancien `estLigneBorne`, l'ancien `TAUX_A_VERIFIER`, l'ancien générateur et l'ancienne IRVE, 5 tests échouent |
| `npm run banc:migrations` | vert, 674 vérifications. Contre-essai : contre l'ancienne 111, 4 échouent (tailles, colonne `signature`, `readonly`, oracle) |
| `npm run parcours -- électricien` | 4 parcours verts (démo à 375 px ; base : numéro, facture, annulation, Consuel ; droits ; deux générateurs). Contre-essai : sans `voitPrix` ni la condition sur « Annuler », le parcours des droits échoue (« la saisie ne montre aucun prix au chef de chantier ») |
| `npm run verifier` (standard) sur `073a768` | vert : 1 325 tests, lint 0 erreur, smoke, build |
| `npm run verifier -- --complet` sur `f3d2e19` (dernier commit de code), machine au repos | **vert** : 1 325 tests, lint 0 erreur, smoke, build, banc, parcours (tous verts, 2 584 s), audit d'interface. Les commits suivants ne touchent que ce rapport : la session locale rejoue la vérification sur le commit qu'elle livre |

### Relectures de cette session

- **juriste-btp** : Légifrance injoignable depuis la session, avis sur pièces. Rappel de Paramètres › Électricité : corrigé (exception du dépannage urgent, L221-10, 4°) ; `TEXTE_TAUX_A_VERIFIER` et titre sans mesure : exacts ; textes de l'avis du 4 nov. : recopiés mot pour mot. Reste à confirmer au texte : L221-10 et l'arrêté du 24 janv. 2017.
- **gardien-securite** : rien de bloquant ; banc vert. Son trou de banc (un `readonly` qui n'envoie pas d'organisation) est comblé (`f3d2e19`). Deux points faibles laissés :
  - un `readonly` qui tente une écriture lit « Cet élément n'existe plus ou ne vous appartient pas » (bouton masqué : sans effet) ;
  - la base ne distingue pas l'ouvrier du chef de chantier : un ouvrier peut annuler un compte rendu par la console, et un chef de chantier lit `prix_ht` par un `select('*')`. Même règle que les autres tables (tâche `org-droits`).

### Décisions d'Hugo (non appliquées)

*Mise à jour du 5 nov. 2026 : Hugo les a toutes tranchées (D-39). Voir « Décisions d'Hugo du 5 nov. (lot 4) » plus bas ; la liste ci-dessous est celle de la session du 4 nov., gardée telle quelle.*

1. Imprimer ou non une mention propre à la borne : « TVA à 5,5 % : pose d'une infrastructure de recharge dans un local à usage d'habitation, destinée aux résidents (CGI art. 278-0 bis, N) ».
2. Garder la case obligatoire « la ligne ne comprend que la pose » (recommandé par le juriste, par prudence), ou un simple avertissement.
3. **(reposée)** Facture tirée d'un compte rendu de dépannage, sans devis. L'arrêté du 24 janv. 2017 impose un devis détaillé avant **tout** dépannage chez un particulier, **sans seuil** (metier-btp.md § 2, D-30) ; hors établissement, aucun paiement avant sept jours (L221-10), sauf dépannage urgent demandé. Bloquer, avertir (recommandé par le juriste), ou laisser avec le rappel de Paramètres ? Attention : le texte proposé renvoie à « Dépannage express », écran qui n'existe pas sur main (`cloud/metier-depannage`) ; sinon écrire « depuis « Devis » ».
4. Garder le compte rendu éteint tant que toi ou un testeur n'a pas dit que vous remettriez ce papier, et sous quelle forme.
5. Signature tracée au doigt : la colonne a été **retirée** de 111 ; elle reviendra avec son écran si tu la veux.
6. Retirer la certification du client pour une pose de borne à 5,5 % : relu « juste » par le juriste au texte, mais c'est à toi de trancher (aujourd'hui le code la retire).
7. Rappel Consuel par une tâche datée, au lieu du moteur `rappelsDus` demandé par la consigne.
8. Envoyer le compte rendu par e-mail comme l'attestation de ramonage, ou s'en tenir au partage depuis le téléphone.
9. (à la fusion avec metier-qualifications) Le choix « Électricien » à l'inscription allume-t-il le réglage Électricité ? Seulement une fois 111 en production.
10. (juriste) Ajouter l'exception du dépannage urgent au rappel de Paramètres › Ramonage aussi, pour garder les deux écrans alignés ?

### Textes nouveaux soumis au juriste

- Paramètres › Électricité : le rappel (devis obligatoire, sept jours, exception d'urgence) — corrigé par lui, sur pièces.
- `TEXTE_TAUX_A_VERIFIER` (photovoltaïque) — exact, sur pièces.
- `TITRE_SANS_MESURE` — exact.

### Ce qui reste

- Relire au texte (réseau à ouvrir : legifrance.gouv.fr) L221-10 et l'arrêté du 24 janv. 2017, pour le rappel de Paramètres › Électricité.
- `SaisieRamonage` : même défaut de prix (point 3), sur main. *Corrigé le 5 nov. (lot 4).*
- Gardes du gardien (tailles, oracle, `readonly`) à reporter dans 104 et 113.
- À la fusion avec metier-qualifications : remplacer la copie des règles IRVE par l'import de `qualifications.js`, et pré-cocher la case « qualification » du volet borne.
- Libellés « HT » de la saisie sans `estFranchiseTva` (conflit signalé avec franchise-suite) : non traité ici. *Corrigé le 5 nov. (lot 4).*
- Migration 111 à inscrire dans `docs/etat-production.md` à la livraison (fichier commun, non touché).

### Risques

- La copie des règles IRVE peut diverger de `qualifications.js` d'ici la fusion.
- La base laisse un ouvrier annuler un compte rendu hors de l'écran (voir gardien).
- Le retrait de la certification (décision n° 6) est dans le code : ne pas livrer avant la décision. *Tranché le 5 nov. : le code le garde.*

### Résumé (10 lignes)

1. main fusionnée ; 18 points de la relecture traités : 15 corrigés, 3 laissés à tes décisions (n° 6, 7 et 8).
2. Droits : prix masqué sans le droit, Annuler, Refaire et « J'ai envoyé la demande » sous droit ; `readonly` refusé en base.
3. Textes Consuel du juriste au texte : « mise sous tension », « à faire parvenir », arrêté du 17 oct. 1973.
4. Qualification de l'installateur : code de l'énergie D. 353-2 (l'art. 22 du décret 2017-26 est abrogé).
5. IRVE : validité à la date du document, case « imprimer » respectée, ligne figée dans le compte rendu.
6. Migration 111 : tout borné, plus de colonne signature, plus d'oracle ; banc vert (674), contre-essai rouge.
7. 3 parcours en base simulée et un parcours des deux générateurs, avec contre-essais.
8. Avis du juriste versé dans `docs/metiers/` ; metier-btp.md et electricien.md alignés.
9. Vérification complète verte sur le dernier commit de code (`f3d2e19`), tous parcours compris.
10. Tes 10 décisions sont listées ci-dessus ; la n° 3 est reposée avec la règle exacte (devis obligatoire, sans seuil).

## Décisions d'Hugo du 5 nov. (lot 4)

Session de correction du 5 nov. 2026, branche locale `corr4-metier-electricien`, partie de `cloud/metier-electricien` à `d13d9936`. Hugo a répondu « OK pour tout » : chaque recommandation de ce rapport est retenue (D-39). Rien n'est fusionné ni poussé ; la production, les secrets, `CLAUDE.md` et `.claude/` ne sont pas touchés. La session locale assemble cette branche en dernier (après qualifications, entretien et dépannage), puis lance la vérification complète.

Commits de code, dans l'ordre : `fff17009` (les décisions de l'électricien), `601dcead` (ramonage : prix et exception d'urgence), `28718d6d` (tests et parcours), `dd0e59d0` (nom d'un test). Les documents (ce rapport compris) suivent dans un dernier commit.

### 1. Contrôle des corrections de la consigne v3

Chaque point est relu dans le code d'aujourd'hui ; les lignes sont celles de `corr4-metier-electricien`.

| # | Point de la consigne v3 | État | Preuve |
|---|---|---|---|
| 1 | Vérification complète rouge sur `cee017c` | **Fait par la session cloud, non rejoué ici** | § « Preuves » plus haut : complète verte sur `f3d2e19`, dernier commit de code d'alors. La complète est celle de la session locale, sur l'assemblage (consigne) : ici, niveau standard seulement (§ 5). |
| 2 | Aucun parcours `reel: true` | Fait | `scripts/parcours/electricite.cjs:74-75`, `:138-139`, `:220-221` : numéro donné par la base et repris à l'écran, relecture, facture liée, annulation, tâche Consuel, droits, deux générateurs. Verts aujourd'hui (§ 5). Deux parcours ajoutés par ce lot (`:288`, `:366`). |
| 3 | `canViewPrices` : prix visible et recopié | **Fait** pour le compte rendu ; **pas fait par la v3 pour l'attestation de ramonage, fait ici** | `SaisieCompteRendu.jsx:48,53,146` ; `OngletElectricite.jsx:136` ; `FicheChantier.jsx:555`. Ramonage : `SaisieRamonage.jsx:110,120,124,342,358` et `OngletRamonage.jsx:162` (`voitPrix={canViewPrices}`) : sans le droit, ni champ de prix, ni titre « et prix », ni prix du dernier passage, des tarifs ou de l'attestation refaite. Test `electriciteEcrans.test.jsx` et parcours `:366`. |
| 4 | `canPerform` : annuler, refaire, « J'ai envoyé la demande » | Fait | `FicheCompteRendu.jsx:114` (annuler) et `:129` (refaire) sous `peutModifier` ; `OngletElectricite.jsx:93-94` sous `peutMemoModifier` (`FicheChantier.jsx:167`, `canPerform('memo', 'edit')`) ; la base refuse l'écriture d'un `readonly` (`111` l.99-107). Parcours des droits `:220`. |
| 5 | Certification du client retirée sans décision | **Fait autrement : tranché par Hugo** (D-39) | Le code garde le retrait (`mentionTvaReduite.js:65,97-105`, `estPoseBorne`). `docs/metiers/electricien.md:109` aligné sur la décision (y compris « fourniture et pose par la même entreprise », qui contredisait la case « pose seule »). |
| 6 | Avis du juriste non versé | Fait | `docs/metiers/avis-juriste-2026-11-04-electricien.md`. Les textes retenus de l'avis (aide Consuel, tâche, onglet, case et « ce qui manque » du volet borne) sont comparés au code **mot pour mot** par un script d'aujourd'hui : aucun écart. |
| 7 | Décision 3 mal posée ; rappel absent de Paramètres › Électricité | Fait | `ElectriciteTab.jsx:23` : devis obligatoire, sept jours, exception d'urgence. La décision, reposée avec la règle exacte, est tranchée : avertir sans bloquer (§ 2, décision 4). |
| 8 | Accroche IRVE incompatible avec « Mes qualifications » | Fait | `electricite.js:145` (`qualificationIrve` : `type: 'irve'`, intitulé, organisme, numéro, `fin`, `imprimer`, validité à la date du document) et `:196` (`avecEmetteur` fige la ligne dans l'émetteur) ; tests `electricite.test.js` « qualification IRVE ». **À la fusion** : importer `raisonNonImprimee` et `ligneImprimee` de `qualifications.js` à la place de la copie. |
| 9 | Envoi au client absent | **Pas fait par la v3 (décision 8), fait ici** | § 2, décision 5. |
| 10 | Rappel Consuel par tâche, pas par `rappelsDus` | Écart assumé, **tranché par Hugo** : la tâche datée reste | `electricite.js:56` (`tacheConsuel`). |
| 11 | Titre sans mesure | Fait | `electricite.js:95,124` ; `compteRenduElectriciteHtml.js:43` ; test et parcours `:138` (`<h1>Compte rendu d’intervention</h1>`). |
| 12 | `estLigneBorne` : pluriel et bornes d'éclairage | Fait | `electricite.js:236` ; test « reconnaît le pluriel et écarte les bornes d’éclairage ». |
| 13 | Photovoltaïque sans avertissement de taux | Fait | `electricite.js:253` (`TAUX_A_VERIFIER`) ; test. |
| 14 | Générateur de `DevisPage` non vérifié | Fait | Parcours `:74` : aperçu (`DevisPage`) et page de signature (`devisHtmlBuilder`), avec contre-essai. |
| 15 | TVA globale garde la marque | Fait | `DevisComposer.jsx:382` (`retirerRegimeSiTaux`) et `:850` (boutons « appliquer à tout le devis »). |
| 16 | Tailles de 111, colonne `signature` | Fait | `111` l.71-75 (`comptes_rendus_tailles` : émetteur, noms, contact, adresse, motif) ; aucune colonne `signature` dans le `CREATE TABLE`. SQL non touché ici, banc non relancé. |
| 17 | Mémoire du gardien | Fait | `.claude/agent-memory/gardien-securite/MEMORY.md:26-39` : F1 à F3 « corrigée ». Fichier lu, non modifié (`.claude/` interdit). |
| 18 | « décision d'Hugo n° 22 » | Fait | Plus aucune occurrence ; `electricite.js:12` cite D-36. |
| J | 3 corrections du juriste au texte (Consuel, tâche, qualification D. 353-2) | Fait | Comparaison mot pour mot (voir 6) ; `docs/metier-btp.md:107-108` conforme à l'avis. |
| G | 3 défauts du gardien (tailles, oracle, `readonly`) | Fait dans 111 ; **hors périmètre dans 104 et 113** (autres branches, SQL interdit hors 111) | `111` l.71-75, `:135-137` (refus avant le verrou), `:99-107`. |
| H | Libellés « HT » de la saisie (conflit signalé avec franchise-suite) | **Pas fait par la v3, fait ici** | `SaisieCompteRendu.jsx:147` : « Prix (€) » en franchise, « Prix (€ HT) » sinon (même formule que `SaisieRamonage` sur main). Test `electriciteEcrans.test.jsx`. |

### 2. Décisions appliquées

| # | Décision | Ce qui a changé | Test | Contre-essai |
|---|---|---|---|---|
| 1 | Compte rendu **allumé** | **Rien à allumer dans le code.** Aucune constante, aucun interrupteur global, aucun réglage masqué ne garde le compte rendu éteint : seul le réglage de l'artisan « Je fais des travaux d'électricité » (Paramètres › Documents › Électricité, `ElectriciteTab.jsx`, défaut éteint `entrepriseService.js:60`) ajoute l'onglet (`FicheChantier.jsx:486`). Il est gardé : l'artisan l'active. **Aucune valeur posée d'office** pour les comptes existants (`reglagesDe` ne force rien ; aucune migration de données). Le choix « Électricien » à l'inscription l'allumera à l'assemblage (session locale), pas ici. Le texte du réglage dit maintenant que le PDF s'envoie par e-mail. | Parcours `:399` (démo) : réglage allumé dans Paramètres, onglet, rappel, compte rendu, PDF, facture. | Même parcours, étape 0 : sans le réglage, pas d'onglet. Mutation : onglet forcé à « éteint » dans `FicheChantier.jsx` → le parcours démo échoue (« l’onglet « Électricité » est sur la fiche chantier ») et le parcours en base aussi (« onglet « Électricité » introuvable »). |
| 2 | Case « la ligne ne comprend que la pose » **reste exigée** | Aucun changement (`TvaBorne.jsx:66-73`). | **Aucun test ne la couvrait** : ajouté, `electriciteEcrans.test.jsx` (3 tests : sans la case, le 5,5 % est suggéré mais aucun bouton ; avec la case, le bouton ; hors habitation ou sans qualification, jamais). | Mutation : condition `poseSeule === true` retirée → « toutes les autres réponses sont bonnes mais la case n’est pas cochée » échoue. |
| 3 | **Mention imprimée** pour une borne à 5,5 % | `mentionTvaReduite.js:73` (`MENTION_BORNE`, texte de la décision, apostrophes droites comme dans la fiche), `:79` (`portePoseBorne`), `:148` et `:163` (bloc après la certification, ou seul). Repère : la marque `regimeTva` de la borne **et** le taux de 5,5 % (`:65`, le même que pour retirer la certification). Les deux générateurs appellent ce bloc sans changer (`devisHtmlBuilder.js:338`, `DevisPage.jsx:1561`). Ni franchise ni avoir. | `electricite.test.js` : texte exact ; borne marquée → mention seule (devis, facture, facture d'acompte aux lignes marquées) ; **autre ligne à 5,5 % → pas de mention, certification gardée** ; borne + isolation → les deux ; `buildDevisHtml` (page de signature) devis et facture. Parcours `:74` : **aperçu `DevisPage` et page de signature** impriment la mention pour la ligne marquée. | Ligne marquée passée à 10 %, ligne **sans la marque**, montant nul, sans lignes, franchise, avoir : pas de mention (tests et parcours). Mutations : mention supprimée → 4 tests rouges et le parcours (« la mention de la borne est imprimée ») ; mention pour toute ligne à 5,5 % → 3 tests rouges. |
| 4 | Facture d'un dépannage, **sans devis** : avertir sans bloquer | `electricite.js:264` (`TEXTE_DEPANNAGE_SANS_DEVIS`, texte de l'avis, « Dépannage express » remplacé par « Devis ») et `:272` (`avertissementFactureCompteRendu`) ; `FicheCompteRendu.jsx:72-75`. Seulement pour un client particulier (`estClientParticulier` de `retractation`) ; la facture est créée avant, jamais de blocage. | `electricite.test.js` (texte exact, particulier, un seul avertissement à la fois). Parcours `:138` : le dépannage d'un particulier montre l'avertissement, la facture est créée. | Syndic, professionnel, entreprise, client inconnu, autres natures : rien (test) ; parcours `:288` : client professionnel, facture créée, aucun avertissement. Mutations : avertissement retiré → test et parcours rouges ; condition « particulier » retirée → test rouge. |
| 5 | Compte rendu **envoyé par e-mail** comme l'attestation de ramonage | `actionsCompteRendu.js:40` (`corpsEmailCompteRendu`) et `:58` (`envoyerCompteRendu`) : même fonction que `envoyerAttestation`, `sendDocumentEmail` → `send-email`, PDF joint, mêmes contrôles côté serveur. `FicheCompteRendu.jsx:47` (`envoyer`) et `:140` (bouton « Envoyer au client ») : on attend la réponse, « envoyé » seulement après ; un refus est dit tel quel ; en démo, rien ne part et l'écran le dit ; bouton inactif et phrase d'aide sans e-mail sur la fiche du client (`:111`). Client = la fiche du client du compte rendu (`OngletElectricite.jsx:47,141`). Sous `peutModifier` (un e-mail part au nom de l'entreprise). **Aucune nouvelle fonction Edge.** | `envoiCompteRendu.test.js` (5 tests : appel unique à `send-email`, destinataire, objet, PDF joint en base64, mêmes champs que l'attestation, refus 403 / 429 / erreur dans un 200 / réseau → exception). Parcours `:288` : envoi, PDF joint, « envoyé » après la réponse ; **refus du serveur dit tel quel, aucun « envoyé »** ; sans e-mail : bouton inactif, rien ne part. Parcours `:220` : lecture seule sans bouton, patron avec. | Mutation : refus avalé (faux succès) → 2 tests rouges ; message de succès affiché même sur refus → le parcours échoue (« le refus du serveur est dit tel quel »). |
| 6 | Exception du **dépannage urgent** au rappel de Paramètres › Ramonage | `RamonageTab.jsx:136` : clause recopiée mot pour mot de `ElectriciteTab.jsx:23` (« sauf dépannage urgent qu’il a expressément demandé, dans la limite des pièces et travaux strictement nécessaires »). Condition de la fiche (« si ton rapport contient le texte du juriste ») : le rapport nomme l'exception (L. 221-10, 4°, § « Relectures de cette session ») et son texte exact est dans `ElectriciteTab.jsx:23`, corrigé par le juriste le 4 nov. au soir : appliquée. | `electriciteEcrans.test.jsx` : les deux écrans portent la même clause. | Mutation : clause retirée du ramonage → test rouge. |
| — | Points tranchés par Claude | **Signature au doigt : pas maintenant** (colonne absente de 111 et de la synchronisation, rien à faire). **Certification retirée pour une borne à 5,5 % : on garde** (relue « juste » par le juriste). **Rappel Consuel : tâche datée**. **Choix « Électricien » à l'inscription : pas sur cette branche.** | — | — |

### 3. Textes nouveaux « À relire par le juriste »

1. **Mention de la borne** (`MENTION_BORNE`, `mentionTvaReduite.js:73`) : « TVA à 5,5 % : pose d'une infrastructure de recharge dans un local à usage d'habitation, destinée aux résidents (CGI art. 278-0 bis, N) ». À vérifier : la **lettre N** au texte officiel (aucun paragraphe du BOFiP ne commente le N, recherche du 4 nov.). Apostrophes **droites**, comme dans la décision ; le reste du document en utilise de typographiques.
2. **Avertissement du dépannage** (`TEXTE_DEPANNAGE_SANS_DEVIS`, `electricite.js:264`) : texte du juriste, relu au texte le 4 nov. ; seul le renvoi change (« Pour le prochain, faites-le depuis « Devis ». »). À valider : ce renvoi.
3. **E-mail du compte rendu** (`corpsEmailCompteRendu`, `actionsCompteRendu.js:40`) : « Bonjour, / Veuillez trouver ci-joint le compte rendu d’intervention et d’autocontrôle n° … du … (nature). / Cordialement, nom de l'entreprise, contact ». Objet : « Compte rendu d’intervention et d’autocontrôle n° … — nom de l'entreprise » (sans « et d’autocontrôle » quand aucune mesure n'est saisie, comme le document). Calqué sur l'e-mail du ramonage, sans ses deux phrases propres (conservation, rappels). Ni « conforme » ni « certifié » (testé).
4. **Rappel de Paramètres › Ramonage** (`RamonageTab.jsx:136`) : clause du dépannage urgent ajoutée. À vérifier : **un ramonage est-il visé** par cette exception (L. 221-10, 4°) ? Elle est alignée sur Paramètres › Électricité, relu par le juriste le 4 nov. au soir sur pièces ; le texte officiel de L. 221-10 reste à rouvrir (réserve déjà inscrite plus haut).

### 4. Ce qui n'a pas été fait, et réserves

- **Facture d'acompte ou d'étape d'une borne : ni mention, ni retrait de la certification.** Ces factures sont faites de lignes forfaitaires par taux (« Acompte 30 % sur devis… », `src/lib/facturation.js`) qui ne portent pas la marque de la borne : le repère de la décision (« selon le repère que ta branche utilise déjà ») n'y est pas. Elles gardent le comportement d'avant (certification « rénovation énergétique » imprimée à 5,5 %). Le devis, la facture complète et la facture de solde, qui gardent les lignes du devis, sont couverts. Suite possible, à décider : porter la marque sur la ligne d'acompte quand tout le 5,5 % du devis vient de poses de borne marquées (`lignesFactureAcompte`, `buildFactureLignesForEtape`) ; c'est le cas courant avec l'acompte de 30 % par défaut. Non fait : cela touche trois constructeurs de lignes de facture, hors des décisions de la fiche.
- **L'avertissement du dépannage ne cherche pas de devis existant** : il paraît pour tout dépannage chez un particulier, comme la fiche le demande (conditions : particulier, jamais de blocage). Un devis fait avant n'éteint pas le toast. Affinement possible : le taire si un devis envoyé précède la date de l'intervention.
- **Deux commentaires restent périmés** (« décision n° 5 d'Hugo attendue », signature) : `useSupabaseSync.js:1112` et `111_…sql:27`. Non touchés : le premier est dans un fichier déjà en conflit avec `metier-entretien`, le second est du SQL. À mettre à jour à l'assemblage.
- **`docs/decisions.md`** : D-39 n'y est pas (fichier commun, conflits ; la session locale le tient).
- **Vérification complète non rejouée** (consigne : celle de la session locale, sur l'assemblage). Banc de migrations non relancé : aucun SQL touché.
- **Gardes de 104 et 113** (tailles, oracle, `readonly`) : hors de cette branche, comme dit plus haut.

### 5. Commandes lancées et résultats

| Commande | Résultat |
|---|---|
| `npm ci` | fait |
| `npm run verifier -- --rapide` sur `d13d9936` (point de départ, avant toute modification) | vert : 1 325 tests, lint 0 erreur (241 avertissements), smoke |
| `npm run verifier` (standard) sur `dd0e59d0`, dernier commit de code | **vert** : 1 353 tests (28 de plus), lint 0 erreur, smoke, build. Les commits suivants ne touchent que des documents. |
| `npm run parcours -- electricite` (après `npm run build`) | **6 parcours réussis**, 75 vérifications : les 4 de la v3 et les 2 de ce lot (e-mail ; prix de l'attestation de ramonage) |
| `npm run parcours -- ramonage` | **18 parcours réussis** (RamonageTab et SaisieRamonage sont touchés), dont le nouveau « un chef de chantier n’a pas le champ de prix de l’attestation » |
| Tests ajoutés | `electricite.test.js` 31 → 45 ; `electriciteEcrans.test.jsx` 9 (nouveau) ; `envoiCompteRendu.test.js` 5 (nouveau) |
| `npm run banc:migrations` | non lancé : aucun SQL touché |
| `npm run verifier -- --complet` | non lancé : celui de la session locale, sur l'assemblage |

**Contre-essais** (une correction défaite à la fois, puis restaurée par `git checkout` ; l'arbre est revenu au commit) :

| Correction défaite | Résultat |
|---|---|
| Mention de la borne supprimée (`mentionTvaReduite.js`) | 4 tests rouges ; le parcours des deux générateurs échoue (« aperçu (DevisPage) : pose marquée à 5,5 %, la mention de la borne est imprimée ») |
| Mention pour toute ligne à 5,5 %, marque ignorée | 3 tests rouges (autre ligne à 5,5 %, contre-essais, page de signature) |
| Avertissement du dépannage retiré | 1 test rouge ; le parcours en base échoue (« l’avertissement du devis est montré ») |
| Condition « client particulier » retirée | 1 test rouge (syndic, professionnel, entreprise, inconnu) |
| Refus du serveur avalé dans `envoyerCompteRendu` | 2 tests rouges (refus 403 / 429, erreur dans un 200, réseau) |
| « Envoyé » affiché même quand le serveur refuse (`FicheCompteRendu.jsx`) | le parcours d'envoi échoue (« le refus du serveur est dit tel quel ») |
| Case « la ligne ne comprend que la pose » non exigée (`TvaBorne.jsx`) | 1 test rouge |
| « Prix (€ HT) » même en franchise | 1 test rouge |
| `SaisieRamonage` : prix montré et repris sans le droit | 1 test rouge ; le parcours du chef de chantier échoue (« la saisie ne montre aucun champ de prix au chef de chantier ») |
| Clause du dépannage urgent retirée de Paramètres › Ramonage | 1 test rouge |
| Réglage « Électricité » éteint pour tous (`FicheChantier.jsx`) | le parcours en démo échoue (« l’onglet « Électricité » est sur la fiche chantier ») et celui en base aussi (« onglet « Électricité » introuvable ») |

Les quatre mutations du navigateur (mention, avertissement, faux succès, prix du ramonage) ont été jouées ensemble sur un seul arbre : 4 parcours rouges, chacun pour sa propre mutation, et les 2 autres (droits, démo) verts.

### 6. À l'assemblage (pour la session locale)

- Appliquer **111 avant** que quiconque active le réglage (sinon l'enregistrement d'un compte rendu échoue) ; l'inscrire dans `docs/etat-production.md`. `send-email` n'est pas modifiée : rien à redéployer.
- Le choix « Électricien » à l'inscription allume `electriciteActif` (avec `metier-qualifications`) ; ne pas poser la valeur aux comptes existants.
- Remplacer la copie des règles IRVE par l'import de `qualifications.js` ; pré-cocher la case « qualification » du volet borne.
- Ajouter D-39 à `docs/decisions.md` ; mettre à jour les deux commentaires périmés (§ 4).
- Faire relire par juriste-btp les quatre textes du § 3, textes officiels ouverts.
- Rejouer, après chaque fusion : `npm run parcours -- electricite` et `-- ramonage` (le second parcours de ce lot, « un chef de chantier n’a pas le champ de prix de l’attestation », est dans `electricite.cjs` pour ne pas toucher `ramonage.cjs`).

### Résumé (10 lignes)

1. Contrôle v3 : 18 points + juriste + gardien relus dans le code ; 3 « pas faits » traités ici (envoi, prix de la saisie du ramonage, libellés « HT »).
2. Décision 1 : rien à allumer dans le code, le réglage de l'artisan est la porte ; aucune valeur posée d'office.
3. Décision 2 : la case « pose seule » reste exigée ; elle n'avait aucun test, elle en a trois.
4. Décision 3 : la mention de la borne est imprimée à 5,5 % pour une ligne marquée, par le bloc commun aux deux générateurs ; pas pour une autre ligne à 5,5 %.
5. Décision 4 : avertissement (sans blocage) pour la facture d'un dépannage chez un particulier, texte du juriste avec « Devis ».
6. Décision 5 : « Envoyer au client » par le chemin de l'attestation de ramonage ; aucun faux succès ; aucune nouvelle fonction Edge.
7. Exception du dépannage urgent ajoutée au rappel de Paramètres › Ramonage.
8. Tests : 28 de plus, chacun avec son contre-essai (mutation) ; deux parcours de plus.
9. Réserves : l'acompte d'une borne n'imprime ni mention ni retrait de certification ; l'avertissement du dépannage ne cherche pas de devis.
10. Quatre textes à relire par le juriste (§ 3).
