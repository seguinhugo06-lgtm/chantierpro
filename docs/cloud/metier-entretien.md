# Rapport de la session cloud « metier-entretien » (4 nov. 2026)

Branche : `cloud/metier-entretien`, partie de `main` (`95dedf8`). Rien n'est appliqué ni déployé en production.

## 1. Ce qui est fait

**L'attestation d'entretien, pour trois appareils** (décision D-33) : chaudière (gaz, fioul, bois, granulés, charbon), pompe à chaleur ou climatisation, poêle ou insert à foyer fermé. Un seul parcours, comme le ramonage.

- **Activation** : Paramètres → Documents → Entretien. Interrupteur « J'entretiens des chaudières, pompes à chaleur ou poêles ». Éteint, rien ne change.
- **Fiche client, onglet « Entretien »** : les appareils entretenus, leur historique (date, numéro, prix, facture), la date conseillée du prochain entretien.
- **Saisie au téléphone** (plein écran, 375 px) :
  - commanditaire, adresse de l'installation, local ;
  - identification de l'appareil (marque, modèle, énergie, mode d'évacuation, n° de série, mise en service, puissance) ;
  - points contrôlés en cases, recopiés des annexes 1 des trois arrêtés, avec « Tout cocher » ;
  - mesures et appareils de mesure ;
  - chaudière : CO en ppm, qui choisit la phrase a, b ou c, avec l'alerte de l'article 3 à l'écran (10 à 50 ppm : informer l'usager ; 50 ppm ou plus : injonction de maintenir à l'arrêt) ; rendement, émissions et classe énergétique saisis par l'artisan ;
  - PAC : contrôle d'étanchéité ou « équipement soumis au règlement (UE) 2024/573 », fluide, défauts constatés, actions effectuées ;
  - poêle : plusieurs appareils dans la même attestation (« Ajouter un autre appareil entretenu »), points granulés et circuit hydraulique ;
  - conseils : les trois rubriques du tableau 11 pour la chaudière, les sujets de l'annexe 2 pour la PAC et le poêle ;
  - signature au doigt, reprise pour le même intervenant.
- **Reprise de l'an dernier** : pour un appareil connu, l'identification, le lieu, les appareils de mesure et le prix sont repris. Jamais les points, les mesures ni les conseils. La date du dernier entretien et celle du dernier ramonage du client sont proposées.
- **L'attestation imprimée** : trois documents distincts, chacun avec son titre et son pied de page (« à conserver au moins deux ans » sauf la PAC, sans durée). Chaudière : tableaux 9, 10, 11 et 13, classe énergétique, phrase du CO mot pour mot. Numéro `ENT-AAAA-NNNNN` attribué par la base, contenu figé, « annule et remplace ». PDF, envoi par e-mail.
- **La facture** en un geste, au taux **proposé** : 10 % dans un logement de plus de deux ans, 5,5 % seulement si l'artisan coche « appareil éligible » (critères affichés), 20 % sinon. Jamais bloquant : l'artisan change le taux sur la facture. La ligne porte l'adresse de l'installation et « immeuble achevé depuis plus de deux ans ». La certification du client s'imprime déjà dans les deux générateurs (`mentionTvaReduite.js`) : aucun générateur de devis ou de facture n'a été modifié.
- **Le rappel** : date conseillée (12 mois, ou 24 mois pour une PAC) et échéance légale calculée (chaudière : 31 décembre de l'année suivante ; PAC : 2 ans ; poêle : 12 mois). Dans « À faire » sur l'accueil et sur la fiche, avec un SMS prêt. E-mail automatique si l'artisan l'active : même mécanisme que le ramonage (consentement, lien de désinscription sans compte, une fois par échéance, jamais en retard). La phrase « obligatoire » du juriste n'apparaît que si la puissance est connue et dans le champ (chaudière 4-400 kW, PAC 4-70 kW hors contrat de performance énergétique ; poêle à bois ou granulés).
- **Désinscription** : page publique `/rappel-entretien/{jeton}`. Elle réutilise la fonction publique du ramonage, étendue : aucune nouvelle fonction ouverte aux visiteurs. Un refus vaut pour tous les rappels de l'artisan (ramonage et entretien), et c'est dit au client.
- **Politique de confidentialité** : paragraphe « Rappels d'entretien » ajouté.
- **Migration 113** (`supabase/migrations/113_attestations_d_entretien.sql`) et ses vérifications (`scripts/banc/113.mjs`).
- **Fonction Edge** `send-scheduled-relances` : bloc des rappels d'entretien (`entretien.ts`). **Non déployée.**

### Preuves

| Commande | Résultat |
|---|---|
| `npx vitest run` (fichiers du lot) | 52 tests verts : `entretien.test.js` (33), `attestationEntretienHtml.test.js` (5), `rappelsEntretienServeur.test.js` (7), `rappelsRamonageServeur.test.js` (7, inchangé). Chaque règle a son contre-essai (ex. : échéance chaudière ≠ 12 mois ; chaque champ de l'annexe 5 retiré fait échouer ; puissance inconnue → pas d'article ; 5,5 % refusé au charbon ; fiche d'un ouvrier écartée) |
| `npm run banc:migrations` | **663 vérifications, tout vert** (17 pour 113 : numérotation, lecture par l'organisation, gel, annulation, CO exigé, client et facture de l'organisation, lien de désinscription entretien ET ramonage, rappel automatique non effaçable, départ d'un membre) |
| `npm run verifier` (standard) | vert sur `b8eecde` + modifications : 1268 tests, lint 0 erreur, smoke, build |
| `npm run verifier -- --complet` | sur `5f36ced` : tests, lint, smoke, build, banc verts ; parcours : 3 échecs, sans nom dans le journal, arrêtée là. Relancés seuls sur le commit final (`987cc79`, build du pre-push) : **172 parcours sur 172 verts**. Audit d'interface lancé seul : **0 défaut sur 80 combinaisons** (il n'ouvre pas les fenêtres de saisie ; elles sont couvertes par le parcours entretien). La chaîne complète n'a donc pas été enregistrée verte d'un seul tenant : à relancer par la session locale avant de livrer |
| pre-push (smoke + tests + build) | vert sur `987cc79` |
| `npm run parcours -- entretien` | **vert, 27 vérifications**, en démo à 375 px : activer → onglet Entretien en premier → à vide, le type d'appareil est demandé → chaudière gaz saisie → alerte CO à 30 ppm → aperçu avec la phrase b, les tableaux, la classe, NF X50-010 → numéro `ENT-2026-00001` → PDF produit (> 20 ko) → facture à 10 % avec « immeuble achevé depuis plus de deux ans » → horloge avancée de 340 jours : rappel dans « À faire », SMS avec l'article R. 224-41-7 et STOP, sans « obligatoire » |

Captures (dossier ignoré `audit-ui/`) : `entretien-attestation-375.png`, `entretien-rappel-375.png`, `entretien-attestation.pdf`.

## 2. Relectures

- **critique-produit** (avant le code) : recommandait de ne faire que la chaudière. J'ai gardé les trois appareils, comme le demande D-33, avec un seul moteur. Retenu de son avis : reprise de l'an dernier, alerte CO à l'écran, tableau 11 mot pour mot, dates préremplies, plusieurs poêles dans une attestation, rappel du devis préalable dans Paramètres. Son risque principal reste vrai : **aucun testeur chauffagiste n'est nommé**.
- **juriste-btp** : « non applicable en l'état » au premier passage (2 bloquants). **Tout est corrigé** : plus de référence COV inventée pour le charbon ; plus de case 5,5 % pour une chaudière au charbon ; tableau 10 et phrases des conseils mot pour mot ; refus « pour tous les rappels » dit sur la page et l'attestation ; O2 et CO2 exigés pour une chaudière automatique ; échéance légale affichée seulement quand l'obligation est certaine ; « climatisation » pour le froid seul ; accords et libellés. Non fait : une puissance par poêle (« si possible », non exigé).
- **gardien-securite** : migration 113 **applicable**. Corrigé : M1 (dans une organisation, seule la fiche entreprise du propriétaire envoie les rappels automatiques ; avant, une fiche créée par un ouvrier pouvait écrire aux clients sous son nom — **vrai aussi pour le ramonage en production**, corrigé dans le même code) ; m1 (un rappel envoyé par le serveur ne s'efface plus par une ligne relue avant l'envoi) ; m2 (vérifications ajoutées). Reste : m1 côté ramonage (même défaut dans `figer_ramonage`, à corriger par une migration à part).

## 3. Ce qui reste

1. **Session locale** : relire, livrer sur `main`, puis appliquer 113 (après 107-112 si elles passent avant), **puis** redéployer `send-scheduled-relances` (D-22). Dans cet ordre : la fonction lit la table `entretiens`. Noté dans `docs/etat-production.md`.
2. `figer_ramonage` : même garde que m1 pour les ramonages (petite migration à part).
3. Le journal des rappels d'entretien (`relance_executions`) ne suit pas un membre qui quitte l'équipe (105 ne connaît que `devis` et `ramonages`) : sans effet sur l'envoi, à ajouter dans une prochaine migration de 105.
4. Calcul automatique du rendement, des NOx et de la classe (tableaux 1, 2, 4, 5, 12) : pas avant la relecture du fac-similé du JO.
5. Normes NF X50-010 / 011 non lues : l'artisan décrit ses opérations en texte libre.
6. Contrat d'entretien au forfait (lot 9), devis en un geste depuis l'attestation.

## 4. Décisions pour Hugo

1. **Devis préalable** : comme pour le ramonage, le parcours ne fait pas le devis exigé avant une visite payée à l'acte chez un particulier (arrêté du 24 janv. 2017, art. 4). Le risque est rappelé dans Paramètres → Entretien. Garder ainsi, ou ajouter un « devis en un geste » (recommandé par le juriste, question 5) ?
2. **Un refus vaut pour tous les rappels** (ramonage et entretien) : c'est mon choix, le plus protecteur, et il est dit au client. À confirmer.
3. **Phrase « Vous restez libre de confier cet entretien au professionnel qualifié de votre choix »** dans l'e-mail quand l'obligation est citée : ajoutée (recommandée par le juriste, question 6). À confirmer.
4. **PAC sans attestation de capacité** : simple rappel à l'écran, jamais bloquant (recommandé, question 2).
5. **Testeur** : un chauffagiste ou un frigoriste réel pour essayer le parcours avant d'en parler.

## 5. Textes nouveaux soumis au juriste

Tous relus le 4 nov. (voir § 2) : libellés des points contrôlés (trois annexes 1), phrases du CO et devoir de l'article 3, tableaux 9, 10, 11, 13, phrases des conseils (PAC, poêle ; la mention « conformes aux recommandations de l'ADEME » n'est pas imprimée, ces recommandations n'ayant pas été lues), pieds de page, phrase d'attestation, information sur les rappels, e-mail et SMS de rappel, critères du 5,5 %, aides à l'écran (TVA, CO, attestation de capacité, devis préalable, foyer ouvert), page de désinscription, paragraphe de la politique de confidentialité.

## 6. Risques

- **Panne verte possible** : avant l'application de 113, la lecture de `entretiens` échoue en silence (erreur de schéma, comme prévu par `detecterEchecsChargement`) ; un artisan qui active le module verrait ses attestations refusées à l'enregistrement. **Ne pas livrer le front sans appliquer 113 le même jour.**
- La fonction Edge redéployée avant 113 : le bloc entretien écrirait une erreur de lecture par entreprise concernée (aucune tant que personne n'a activé l'envoi automatique), le reste continue.
- Réappliquer 104 un jour remettrait l'ancienne fonction de désinscription : les liens des rappels d'entretien répondraient « lien non reconnu ». Contrôle noté dans l'en-tête de 113.
- 15 jours ouvrés du poêle : comptés du lundi au vendredi sans jours fériés (alerte seulement, date limite plus prudente que la vraie).
- Environ 25 champs pour une chaudière : le temps de saisie réel n'est pas mesuré.

### Recoupements avec `cloud/retours`

`origin/main` n'avait rien de nouveau (fusion : « Already up to date »). `cloud/retours` touche des fichiers que je modifie aussi, dans d'autres zones :
- `src/components/ramonage/SaisieRamonage.jsx` : j'exporte `Choix`, `Section` et `Signature` (3 lignes) ; `cloud/retours` ajoute la case « Imprimer les conseils ». Fusion sans conflit attendue.
- `src/services/entrepriseService.js` : les deux branches ajoutent un réglage juste après `ramonageTarifs` (`ramonageConseils` d'un côté, les `entretien…` de l'autre) : **conflit textuel probable, à résoudre en gardant les deux**.
- `src/context/DataContext.jsx` : `cloud/retours` fait rendre `ECRITURE_EN_ATTENTE` (valeur vraie) à `modifierEnBase` ; mon code teste `!== false`, donc compatible.
- `src/lib/ramonage.js`, `src/components/settings/RamonageTab.jsx` : j'en importe seulement `lienSms`, `lienAppel`, `emetteurDe` et `Interrupteur`, que `cloud/retours` ne change pas.

## Résumé (10 lignes)

1. L'attestation d'entretien (chaudière, PAC/clim, poêle/insert) marche de bout en bout en démo à 375 px.
2. Activation dans Paramètres → Entretien ; onglet « Entretien » sur la fiche client.
3. Champs exigés par l'annexe de chaque arrêté, alerte CO, reprise de l'an dernier.
4. Numéro par la base, document figé, PDF, envoi, facture au taux proposé (10 / 5,5 / 20 %, jamais imposé).
5. Rappel à la bonne périodicité ; « obligatoire » avec son article seulement si la puissance le permet.
6. Migration 113 prête (banc : 663 vérifications vertes), non appliquée ; fonction Edge prête, non déployée.
7. Juriste et gardien : tous les bloquants et majeurs corrigés ; un défaut de sécurité du ramonage corrigé au passage.
8. Ordre en production : livrer, appliquer 113, puis redéployer `send-scheduled-relances`.
9. À décider par Hugo : devis préalable, refus valable pour tous les rappels, testeur chauffagiste.
10. Conflit probable avec `cloud/retours` dans `entrepriseService.js` (garder les deux réglages).

## Corrections de la relecture du 4 nov.

Session cloud de correction (consigne metier-entretien-v3). `origin/main` fusionné d'abord (`955b1e9`) : un seul conflit, `src/services/entrepriseService.js`, résolu en gardant `ramonageConseils` ET les six réglages `entretien…`.

### Défauts de la relecture

| # | Point | Fait | Commit |
|---|---|---|---|
| 1 | Vérification sur le dernier commit de code | `npm ci` puis `npm run verifier -- --complet`, vert sur `ed21da3` (voir « Preuves ») | — |
| 2 | Appareils de mesure inventés pour le poêle | `manquants()` : exigés pour la chaudière et la PAC seulement ; 113 : colonne sans NOT NULL et contrainte `entretiens_appareils_mesure` conditionnelle à la catégorie ; champ « facultatif » à la saisie d'un poêle ; pas de bloc « Mesures » vide sur l'attestation ; aide de Paramètres corrigée | `ca408c7` |
| 3 | Obligation PAC et poêle dans l'e-mail | `phraseObligation` et `phraseObligationServeur` ne rendent la phrase que pour la chaudière ; les formules du juriste sont gardées, non utilisées (`PHRASES_OBLIGATION_EN_ATTENTE`). Question posée à Hugo : `Q-entretien-obligation` dans `docs/decisions.md` | `ca408c7`, `docs` |
| 4 | Lien `/rappel-entretien/…` sans preuve | Deux parcours `reel: true` dans `scripts/parcours/entretien.cjs` : rien à l'ouverture, refus au bouton avec le jeton, « C'est noté » ; contre-essai jeton refusé → pas de « C'est noté » | `27a6cdd` |
| 5 | Fiche du propriétaire choisie avant le filtre | `fichesQuiEnvoient(fiches, proprietaires, valable)` : parmi les fiches du propriétaire, la première qui a le module actif et un e-mail ; si aucune, la première (pour consigner la raison). Test ajouté | `ca408c7` |
| 6 | TVA proposée en franchise | `estFranchiseTva(entreprise)` passé à `tauxPropose` ; case « logement de plus de deux ans » et 5,5 % masquées en franchise ; libellé « Prix (€) » et « TVA non applicable (article 293 B du CGI) » | `ca408c7` |
| 7 | Banc 113 : appel serveur masquant le visiteur | Appel serveur supprimé ; le refus est relu dans la transaction du visiteur (`commeAnonyme` annule sa transaction : relu après coup, on ne voyait rien). Fait pour l'entretien ET le ramonage. Mémoire du gardien mise à jour | `ca408c7`, `27a6cdd` |
| 8 | « Rappel noté » avant l'écriture | `noterRappel()` (`src/lib/noterRappel.js`) : l'état ne change qu'après l'écriture, rien si elle rend `false`. Entretien et ramonage. Test avec contre-essai. Placée d'abord dans `actionsRamonage.js`, elle tirait le générateur de devis dans le paquet chargé au démarrage : le parcours « site : fonctionnalités en action » échouait (constaté sur `f4bfff3`, vert sur `main`) ; déplacée dans un module sans dépendance | `ca408c7`, `ed21da3` |
| 9 | 5,5 % PAC air/air au-delà de 12 kW | Phrase ajoutée (145 % / 250 %) | `ca408c7` |
| 10 | Seconde relecture | juriste-btp et gardien-securite relancés sur les textes, la 113 et la fonction finales (résultats ci-dessous). Erratum 5 : `Q-entretien-reseau` dans `docs/decisions.md` | `docs`, `f4bfff3` |

### Juriste-btp (10 corrections « à corriger »)

Toutes appliquées avec le texte exact demandé (`ca408c7`) : critères du 5,5 % (poêle, chaudière bois, PAC air/air), classe « Non déterminée » et sa règle, aides de puissance (R. 224-42, R. 224-20) et du CO, délais « établie / remise », attestation de capacité (R. 543-75), modèles `chauffage.js` (« Entretien PAC », ligne d'attestation). Exception : le texte de Paramètres sur l'obligation (point 9) a été réécrit pour dire « chaudière seulement », puisque le point 3 limite la phrase à la chaudière.

Non appliqué (à décider) : le devis préalable (point « à décider » 1).

### Gardien-securite

`figer_entretien` : `client_id`, `remplace_id`, `updated_at` figés, `NEW.updated_at := now()` ; banc 7 bis (un compte ne vide ni le client ni l'attestation remplacée). `ca408c7`.

### Seconde relecture (après corrections)

- **juriste-btp** : « applicable ». Légifrance injoignable depuis la session (domaine non autorisé) : relu sur les citations de l'avis. Appliqué (`f4bfff3`) : parenthèse « seuils propres aux PAC en toiture » retirée (absente des citations) ; aide du CO limitée à « la pièce de la chaudière » ; texte de Paramètres simplifié ; modèle « Entretien PAC (de 4 à 70 kW : au moins tous les deux ans) » et ligne PAC « Établissement et remise de l'attestation d'entretien ». Non vérifié au texte : les « 10 % d'O2 » de la chaudière bois (3°).
- **gardien-securite** : « 113 applicable, fonction déployable », aucun défaut moyen ou plus. Deux points faibles :
  1. `entreprise.created_at` : lue par 083/086 en production (`ORDER BY en.created_at`), indice fort mais pas une preuve. Si elle manquait, **tous** les rappels de ramonage s'arrêteraient (erreur consignée dans le rapport du passage). À contrôler en production avant redéploiement : `select column_name from information_schema.columns where table_schema='public' and table_name='entreprise' and column_name in ('created_at','archived_at','forme_juridique','code_postal','ville');` → 5 lignes.
  2. Banc 7 : supprimer le client en compte connecté. Essayé : **au banc, aucune policy DELETE n'existe sur `clients`** (`pg_policies` vide pour DELETE) ; le DELETE de l'artisan ne touche aucune ligne, sans erreur. Le banc vérifie donc maintenant qu'un compte ne supprime rien, et la mise à NULL par le chemin serveur. **À vérifier par la session locale** : la suppression d'un client depuis l'app marche-t-elle en production (policy présente en production mais absente du banc, ou panne verte) ?

### Preuves

| Commande | Résultat |
|---|---|
| `npx vitest run` (fichiers entretien, rappels, noterRappel) | entretien 37, attestation 6, rappels serveur 9, noterRappel 2 : verts. Contre-essais : phrase PAC/poêle vide mais conditions connues ; fiche du propriétaire sans filtre = fiche invalide choisie ; écriture `false` = état inchangé |
| `npm run banc:migrations` | **665 vérifications, tout vert** (19 pour 113). Contre-essai du point 7 : avant la correction de la lecture, les deux contrôles de refus visiteur échouaient (« rien posé ») |
| `npm run parcours -- entretien` | **3 parcours verts** (27 + 4 + 1 vérifications). Contre-essai : route `/rappel-entretien` retirée de `main.jsx` → le parcours du lien échoue |
| `npm ci` puis `npm run verifier -- --complet` | Sur `f4bfff3` : **échec**, 1 parcours (« site : fonctionnalités en action »), causé par ce lot (voir point 8), corrigé. Sur **`ed21da3`** (dernier commit de code, arbre propre) : **vert d'un seul tenant** — 1348 tests, lint 0 erreur, smoke, build, banc, parcours (navigateur, 2313 s), audit d'interface. Enregistré dans `audit-ui/derniere-verification.json` (`reussi: true`). Les commits suivants ne touchent que ce rapport |

### Ce qui reste (session locale)

- Fusion, puis complet, parcours entretien et ramonage, banc (comme prévu par la consigne).
- Contrôle de `entreprise.created_at` et des 2 fiches à envoi automatique en production, avant de redéployer `send-scheduled-relances`.
- Suppression d'un client : policy DELETE absente du banc (voir ci-dessus).
- `articles-btp-suite.js:315` garde « Entretien annuel PAC » (bibliothèque d'articles, hors des corrections demandées) : à soumettre au juriste.
- `figer_ramonage` (m1 côté ramonage) : migration à part, inchangé.
- Push : `git push origin cloud/metier-entretien` a été **refusé** dans cette session (permission). Les commits sont sur la branche locale ; voir la fin du rapport.

### Décisions d'Hugo

1. Obligation dans le rappel d'une PAC ou d'un poêle (`Q-entretien-obligation`, recommandé : oui, formules du juriste).
2. Chaudières en réseau : une attestation par chaudière ou pour l'ensemble (`Q-entretien-reseau`, erratum 5).
3. Devis préalable : parcours sans devis, ou « devis en un geste » (recommandé par le juriste).
4. Un refus vaut pour tous les rappels (ramonage et entretien).
5. Phrase « Vous restez libre de confier cet entretien… » dans l'e-mail.
6. PAC sans attestation de capacité : information, jamais bloquante.
7. Case « Logement achevé depuis plus de deux ans » cochée par défaut, ou choix exigé.
8. 5,5 % sur déclaration de l'artisan, rendement saisi à la main.
9. Noms de modèles qui énoncent une périodicité légale (« au moins tous les deux ans ») : acceptés ?
10. Autoriser `www.legifrance.gouv.fr` dans le réseau des sessions cloud, pour les relectures au texte.
11. Trouver un chauffagiste ou un frigoriste pour tester.

### Textes nouveaux soumis au juriste

Paramètres › Entretien (obligation chaudière seulement ; appareils de mesure ; attestation de capacité), aides de la saisie (puissance, CO, classe), alerte de délai, bloc TVA en franchise, critères du 5,5 %, modèles `chauffage.js`. Tous relus à la seconde relecture, sur les citations de l'avis.

### Risques

- Redéployer la fonction change aussi le ramonage en production (fiche choisie parmi les fiches valables du propriétaire). Comparer le passage à blanc à celui de v23.
- 113 doit être appliquée le jour de la livraison du front (sinon lecture d'une table absente, attestations refusées).

### Résumé

1. `origin/main` fusionné ; conflit `entrepriseService.js` résolu (toutes les clés gardées).
2. Appareils de mesure facultatifs pour le poêle (app, 113, attestation).
3. Obligation dans les rappels : chaudière seulement, en attendant Hugo.
4. Lien de désinscription prouvé par deux parcours en mode réel simulé.
5. Fiche d'envoi choisie parmi les fiches valables du propriétaire ; « Rappel noté » après l'écriture.
6. Franchise de TVA : aucun taux proposé ; 10 textes du juriste appliqués.
7. 113 : `figer_entretien` aligné sur 111 ; banc 665 vérifications vertes.
8. Seconde relecture : juriste « applicable », gardien « 113 applicable, fonction déployable ».
9. Vérification complète verte sur `ed21da3`, le dernier commit de code.
10. À vérifier en local : `entreprise.created_at` en production, suppression d'un client (pas de policy DELETE au banc) ; push refusé ici, commits à pousser.
