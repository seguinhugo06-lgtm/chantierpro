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
