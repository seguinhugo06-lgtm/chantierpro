# Session cloud « metier-depannage » — dépannage express (lot 3)

> 4 nov. 2026. Branches `cloud/metier-depannage` et `claude/metier-depannage-fd3cwg` (même contenu), parties de `main` @ `73b1e04`. Rien n'est livré sur `main`, aucune migration, aucun accès à la production.
>
> Mise à jour du 5 nov. 2026 (lot 4) : Hugo a tranché les décisions de cette session (D-40) et elles sont appliquées sur `corr4-metier-depannage` (dernière section). Les passages « Décisions pour Hugo » et « Décisions d'Hugo (recopiées, non appliquées) » ci-dessous sont donc tranchés, et la date de remise d'un devis n'est plus posée à la signature mais à la remise.

## Ce qui est fait

Pour le serrurier, le plombier, l'électricien et le couvreur (`docs/metiers/synthese.md` § 3.5, lot 3).

1. **Grille tarifaire** — Paramètres › Documents › Dépannage.
   - Un interrupteur « Je fais du dépannage, des réparations ou de l'entretien chez le client ».
   - Les champs : taux horaire, décompte du temps (quart d'heure, demi-heure ou heure entamée), frais de déplacement et leur zone, majoration de nuit et ses horaires, majoration du dimanche et des jours fériés, forfaits.
   - Les prix se saisissent **HT**, comme sur les devis. Chaque prix est aussi montré TTC à 10 % et à 20 %.
   - Le bouton « Imprimer la grille » produit un PDF A4 « Nos tarifs ». Il donne l'identité de l'entreprise (nom EI, forme, adresse, téléphone, e-mail, SIRET) et les prix **TTC en deux colonnes, TVA 10 % et TVA 20 %**. En franchise, il n'y a qu'une colonne, avec la mention 293 B.
   - La carte cite les obligations mot pour mot depuis `docs/metier-btp.md` § 2, avec leur source (arrêté du 24 janv. 2017, art. 2 à 5). Un test vérifie qu'elles y figurent toujours.
   - Stockage : `settings_json.reglages` (`depannageActif`, `depannageGrille`), comme le ramonage. **Aucune migration** : le numéro 112 n'a pas servi.
2. **Devis en un écran** (`src/components/depannage/DevisExpress.jsx`). On l'ouvre depuis :
   - la page Devis : menu « Nouveau » › « Dépannage express », ou le bouton de l'état vide ;
   - la fiche d'un client : bouton « Dépannage express ».

   Ce que fait l'écran :
   - Il prend un client de la liste ou en crée un nouveau.
   - On y saisit l'intervention et le lieu.
   - La case « Urgence demandée par le client » n'est jamais pré-cochée. Cochée, elle affiche l'avertissement du juriste.
   - Les lignes viennent de la grille : déplacement (décochable), main-d'œuvre en heures arrondie au décompte, une majoration de la grille seulement, les forfaits, puis les pièces remplacées. L'écran demande aussi au client s'il garde les pièces (Oui, Non, ou « répondra sur le devis »).
   - Le total TTC se calcule en direct.
   - **L'urgence ne majore jamais le prix**, et aucune majoration hors de la grille n'est possible.

   Le devis s'enregistre en brouillon, en deux lots, « Intervention » et « Pièces remplacées ». Chaque ligne porte sa catégorie (`depannage`), si bien que l'information reste figée avec les lignes.
3. **Mentions imprimées** sur un devis de dépannage d'un client particulier, dans les **trois** générateurs (`devisHtmlBuilder.js`, inline de `DevisPage.jsx`, `pdfHtmlBuilder.js`) :
   - « Devis gratuit. »
   - « Souhaitez-vous conserver les pièces, éléments ou appareils remplacés ? ☐ Oui ☐ Non », avec la case cochée si la réponse est connue.

   Un devis compte comme dépannage s'il vient de l'écran express, s'il porte la case urgence, ou si la nouvelle case « Dépannage, réparation ou entretien » de l'éditeur classique est cochée (le juriste a signalé ce risque : sans elle, un dépannage saisi à la main sortait sans les mentions).
4. **Signature sur place, puis facture immédiate.**
   - Sur un brouillon de dépannage, le bouton principal devient « Faire signer ». Il fait passer les mêmes contrôles que l'envoi (mentions obligatoires, client, validité), puis la signature sur place existante prend le relais, avec la phrase d'urgence.
   - La date de remise est posée à la signature.
   - Ensuite vient « Facturer », qui existe déjà. Avec l'urgence, la facture est payable sur place (L221-10, 4°). Sans l'urgence, la règle existante des sept jours s'applique (« Paiement au plus tôt le … »).
5. **Serrurier, alerte « abus de faiblesse »** : **non codée**, comme demandé. Voir « Décisions ».

## Preuves (commandes lancées dans la session)

- `npx vitest run src/lib/__tests__/depannage.test.js` : **33 tests verts**. Chaque règle a son contre-essai :
  - grille illisible ;
  - prix TTC affiché ;
  - décompte arrondi ;
  - lignes et lots ;
  - déplacement décoché ;
  - majoration hors grille refusée ;
  - pièce sans prix ;
  - l'urgence ne change pas les lignes ;
  - mentions seulement pour un dépannage d'un particulier (contre-essais : devis ordinaire, client professionnel, facture) ;
  - case de l'éditeur ;
  - les trois textes OBLIGATIONS présents mot pour mot dans `metier-btp.md` ;
  - page imprimable (deux taux, franchise, échappement contre l'injection) ;
  - sept jours (urgence : rien ; sans urgence : 13/11 pour une signature le 04/11, le 11 novembre reporte le délai) ;
  - les deux générateurs de `src/lib/` impriment les mentions (contre-essai : un devis ordinaire ne les a pas).
- `npm run verifier` (standard, avant le commit) : **vert**. Tests 1260/1260, lint 0 erreur, smoke, build.
- `npm run parcours -- depannage` : **vert, 20 vérifications à 375 px**. Le parcours enchaîne :
  - activer le module, saisir la grille ;
  - imprimer le PDF (`audit-ui/depannage-grille.pdf`) ;
  - faire le devis d'une fuite urgente, avec un siphon que le client garde (total 122,10 € TTC) ;
  - ouvrir l'aperçu réel du document, qui porte « Devis gratuit », la case « Oui » cochée, le lot « Pièces remplacées » et l'exception d'urgence ;
  - signer sur place (la phrase d'urgence s'affiche, le devis passe « accepté » avec sa date de remise) ;
  - facturer en facture complète (122,10 €, sans report du paiement, la pièce reprise).

  Captures : `audit-ui/depannage-1-grille.png`, `-2-devis-express.png`, `-3-facture.png` (dossier ignoré par git).
- `npm run verifier -- --complet` sur le commit `9f7679a` : **vert** (détail ci-dessous).

## Relectures

- **critique-produit** (avant le code) : verdict « plus petit ». Appliqué :
  - pas de majoration « urgence » ;
  - pas de bloc qui répète le taux horaire (il est dans le libellé de la ligne) ;
  - devis gratuit seulement ;
  - pas de lien public de la grille.

  Point non suivi : il conseillait une seule entrée. La mission demande aussi la fiche du client ; c'est le même écran, avec le client déjà choisi.
- **juriste-btp** (textes nouveaux). **Il n'a pas pu ouvrir Légifrance** : le réseau de la session le bloque. Il a corrigé, et ses corrections sont appliquées mot pour mot :
  - la question sur les pièces (art. 4 III, case Oui / Non au lieu de « dites-le ») ;
  - la case « dépannage » sur tout devis ;
  - la grille à deux taux et son pied (« Prix toutes taxes comprises. TVA de 10 % pour un logement achevé depuis plus de deux ans ; sinon, TVA de 20 %. Le prix toutes taxes comprises de votre intervention est indiqué sur le devis. ») ;
  - l'avertissement d'urgence (`AVERTISSEMENT_URGENCE`), qu'il jugeait **bloquant** sans lui.
- **gardien-securite** : non lancé. Rien ne touche au SQL, aux policies, à l'authentification ni aux fonctions Edge. Les réglages vont dans une colonne JSON existante, déjà écrite par l'app.

## Textes nouveaux soumis au juriste

| Texte | Où |
|---|---|
| « Devis gratuit. » | trois générateurs, grille |
| « Souhaitez-vous conserver les pièces, éléments ou appareils remplacés ? ☐ Oui ☐ Non » | trois générateurs, écran express |
| « Frais de déplacement (42,90 € TTC) », « Main-d'œuvre, taux horaire 66,00 € TTC », « Majoration de nuit (de 20 h à 8 h) : + 50 % du taux horaire », « Majoration dimanche et jour férié : + … % du taux horaire » ; lot « Pièces remplacées » | lignes du devis |
| Page « Nos tarifs » : libellés, deux colonnes TTC, pied TVA, « Devis gratuit. Un devis détaillé vous est remis avant toute intervention. », « Tarifs en vigueur au … » | PDF de la grille |
| Avertissement d'urgence (texte du juriste) | écran express |
| Case de l'éditeur « Dépannage, réparation ou entretien » et son aide | éditeur de devis (écran) |

## Ce qui reste

- **Relire au texte** les art. 2 à 5 de l'arrêté du 24 janv. 2017. Deux points sont à confirmer : la formulation exacte de l'art. 4 III, et une éventuelle exception pour les pièces renvoyées au fabricant au titre de la garantie. Cela demande l'accès réseau à Légifrance.
- **Signature en ligne** : le client ne peut pas répondre à la question des pièces sur la page de signature. Les cases restent vides, et la réponse ne s'y enregistre pas. Pour l'enregistrer, il faudrait une colonne et une modification de `sign_devis`, donc une migration (112) avec le banc et `gardien-securite`.
- **Aperçu à l'écran** (l'onglet « Document » de la fiche, en React) : il ne montre pas les deux mentions. Les PDF les portent.
- Le lien public de la grille, pour le site de l'artisan (art. 3, « tout espace en ligne ») : reporté (critique-produit).
- Le devis payant : voir « Décisions ».

## Décisions pour Hugo

1. **Alerte « abus de faiblesse » (serrurier)** : non codée. C'est un profilage des clients, donc il faut un **avis RGPD préalable** (minimisation, aucune déduction de vulnérabilité stockée) avant d'envisager quoi que ce soit. La faire ou non ?
2. **Devis payant** : l'app n'imprime que « Devis gratuit ». Faut-il permettre un devis payant ? Il faudrait décider de son prix, du moment où il est dû et de son traitement si le client refuse.
3. **Case « dépannage »** : aujourd'hui elle est facultative dans l'éditeur, et automatique avec l'écran express ou l'urgence. Le juriste demande s'il vaut mieux imprimer « Devis gratuit » sur **tout** devis d'un particulier. Ce n'est vrai que tant que le devis payant n'existe pas.
4. **Réseau** : autoriser `legifrance.gouv.fr` pour la relecture au texte (déjà demandé dans la synthèse des métiers, décision n° 7).
5. **Testeur** : un dépanneur de votre entourage, ou vous-même en électricien. Critère proposé par critique-produit : un vrai dépannage fait avec ce parcours en moins de trois minutes.

## Risques

- **« Strictement nécessaire »** : avec l'urgence cochée, toute la facture est payable sur place. Or l'exception ne couvre que les pièces et travaux strictement nécessaires (L221-10, 4° ; L221-28, 8°), et un paiement interdit est un délit (L242-7). L'avertissement le dit à l'artisan, mais l'app ne contrôle pas le contenu des lignes.
- **Textes non relus au texte** (voir « Ce qui reste ») : la question sur les pièces est la rédaction du juriste d'après des sources secondaires (INC, Que Choisir).
- **TVA de la grille** : la grille affiche 10 % et 20 %. Un dépannage à 5,5 % (rénovation énergétique) n'y figure pas, mais l'écran express permet de le choisir.
- **Signer un brouillon sur place** : le parcours n'impose pas l'envoi préalable. Les contrôles de l'envoi s'appliquent avant la signature, et l'exemplaire du client suit le parcours de signature sur place existant (e-mail avec son accord, ou papier signé par les deux).

## Vérification complète

`npm run verifier -- --complet`, commit `9f7679a`, arbre propre :
- tests 1263/1263 ;
- lint 0 erreur ;
- smoke ;
- build ;
- banc de migrations ;
- **tous les parcours navigateur**, dont celui du dépannage ;
- **audit d'interface sans défaut**.

Un premier passage avait échoué pour une cause extérieure au code : un `git push` lancé pendant la vérification a déclenché le hook de pré-push, qui a reconstruit `dist/` au milieu des parcours. Le second passage, sans interférence, est entièrement vert.

## Résumé

- Paramètres › Dépannage : une grille tarifaire saisie HT, imprimable en PDF avec les prix TTC à 10 % et 20 % (obligation d'affichage, arrêté du 24 janv. 2017).
- « Dépannage express » : un devis en un écran depuis la page Devis ou une fiche client. Les lignes viennent de la grille. L'urgence ne change jamais le prix.
- Les trois générateurs impriment « Devis gratuit » et la question « conserver les pièces ? Oui / Non » sur un devis de dépannage d'un particulier.
- Un brouillon de dépannage se fait signer sur place tout de suite, puis se facture (paiement immédiat seulement en urgence).
- Aucune migration : les réglages vont dans `settings_json`.
- Preuves : 33 tests avec contre-essais, `verifier --complet` vert (parcours, audit d'interface sans défaut), parcours du dépannage à 375 px vert (20 vérifications).
- Juriste : corrections appliquées, mais l'arrêté n'a pas pu être relu au texte (Légifrance bloqué).
- Abus de faiblesse : non codé, c'est une décision d'Hugo, avec un avis RGPD préalable.
- À décider : le devis payant, et la case dépannage obligatoire ou non.
- Reste : la réponse sur les pièces lors de la signature en ligne (migration 112), et le lien public de la grille.

## Corrections de la relecture du 4 nov.

Session cloud de correction (consigne metier-depannage-v3). Branche mise à jour avec `origin/main` (fusion, un conflit dans `entrepriseService.js` : `REGLAGES_SANS_COLONNE`, les clés `depannageActif`, `depannageGrille` et `ramonageConseils` sont toutes gardées). Toutes les corrections de code sont dans le commit `29c5a58`.

### Les 11 défauts

1. **En-tête sous l'encoche** — fait (`29c5a58`). `min-h-14` et `minHeight: calc(3.5rem + env(safe-area-inset-top))`, comme `SaisieRamonage.jsx`. Sonde avec une encoche simulée de 47 px : en-tête de 103 px, zone utile de 56 px, bouton Fermer entre 53 et 97 px.
2. **Chemin du dépôt et guillemets dans Paramètres › Dépannage** — fait. Les sources n'ont plus de chemin (il est en commentaire). Le texte est présenté comme un résumé : « Ce que demande l'arrêté du 24 janvier 2017 : », en liste, sans guillemets. Testé : aucune source ne contient `docs/`, `.md` ou `§`.
3. **Textes relus au texte, avis versé** — fait. Les textes du juriste de la session locale sont recopiés tels quels : obligations, avertissement d'urgence (« pour répondre à l'urgence », L221-10, 4° ; L221-28, 8°), modèle de l'annexe 2, phrase « Affichez la grille… ». Ils sont aussi recopiés dans `docs/metier-btp.md` § 2, et le test compare les deux. L'avis est versé dans `docs/metiers/avis-juriste-2026-11-04-depannage.md`. Cette session n'a pas accès à Légifrance : l'avis reprend la consigne et le dit.
4. **Signature d'un brouillon jamais remis (L221-8)** — solution d'attente codée, décision d'Hugo. « Faire signer » sur un brouillon de dépannage affiche d'abord « Remettez d'abord le devis » (papier, ou e-mail avec l'accord du client ; « Le montrer à l'écran ne suffit pas »). Le PDF s'ouvre ensuite, puis l'app demande « Le client a-t-il reçu le devis ? ». La signature ne s'ouvre qu'après ces deux étapes. Le parcours vérifie aussi le contre-essai : en annulant, la signature ne s'ouvre pas.
5. **Constat d'affichage** — fait. Sonde avec script à 375 et 768 px, module allumé et grille saisie (taux, déplacement, zone, deux majorations, un forfait), sur Paramètres › Dépannage et sur l'écran express (urgence cochée, une pièce). Résultat : aucun débordement, aucun bouton coupé, aucune cible sous 44 px, aucune case sous 44 px. Scripts et captures dans `audit-ui/` (non versionné) : `sonde-depannage.js`, `sonde-express-complet.js`, `sonde-*-375.png` et `sonde-*-768.png`.
6. **« Client créé mais non choisi »** — fait. Quand le retour est vide : « Client non enregistré. Réessayez. » (le juriste a demandé « Réessayez »). Le composeur (`DevisComposer.jsx`) n'est pas touché : tâche à part.
7. **TTC figé dans la désignation** — fait. Les libellés sont maintenant « Frais de déplacement » et « Main-d'œuvre, au taux horaire », sans montant. Testé : aucun libellé ne contient « € » ni « TTC ». Le libellé est le même à 10 % et à 20 %.
8. **Lieu d'exécution vide** — fait. Le champ est pré-rempli avec l'adresse du client (au choix du client, ou à sa création). S'il reste vide, l'adresse du client s'imprime. S'il n'y a ni lieu ni adresse, le devis est refusé : « Indiquez le lieu d'intervention. ». Parcours : le champ est pré-rempli et la note est enregistrée.
9. **Réponse sur les pièces perdue** — fait. Plus de choix par défaut : seulement Oui ou Non. Pour un particulier avec des pièces, la création demande une réponse. La duplication retire `conservee` des lignes et des lots. Parcours (base) : sans réponse, refus ; avec « Non », `conservee: false` est enregistré.
10. **Parcours en mode réel simulé** — fait. Nouveau parcours « dépannage express (base) » : la grille est rangée dans `settings_json.reglages.depannageGrille`, le devis est envoyé en base avec ses lignes et leurs catégories (déplacement, main-d'œuvre, pièce). Il contrôle aussi les points 8, 9 et 11.
11. **Forfait à moitié saisi effacé** — fait. Les champs ne se relisent que sur un changement venu d'ailleurs (on mémorise la dernière grille enregistrée). Contre-essai : avec l'ancien `DepannageTab.jsx`, le parcours échoue (« le forfait à moitié saisi est gardé (null) ») ; avec le nouveau, il passe.

### Preuves

- `npx vitest run src/lib/__tests__/depannage.test.js` : 36 tests verts. Contre-essai avec l'ancien `depannage.js` : 12 échecs (libellés, annexe 2, obligations, sources, avertissement, deux générateurs).
- `npm run parcours -- depannage` : les deux parcours sont verts (démo : 28 vérifications ; base : 8).
- `npm run verifier` (standard) : vert (1330 tests, lint 0 erreur, smoke, build). Il a tourné sur l'arbre modifié avant deux retouches de texte demandées par juriste-btp (fenêtre de remise, « Réessayez »), puis commitées dans `29c5a58` : seule la vérification complète porte sur le commit exact.
- `npm run verifier -- --complet` sur `29c5a58` (commit exact) : **vert**. 1330 tests, lint 0 erreur, smoke, build, banc de migrations, parcours navigateur (2395 s), audit d'interface.
- Les deux générateurs impriment le bloc de l'annexe 2, qui vient de `mentionsDepannageHtml` dans `src/lib/`. Testé pour `devisHtmlBuilder` et `pdfHtmlBuilder`. L'aperçu de `DevisPage` est vérifié par le parcours.

### Textes nouveaux soumis au juriste (juriste-btp, session cloud, sans Légifrance)

- Fenêtres avant la signature sur place (`remettrePuisFaireSigner`, `DevisPage.jsx`) : texte corrigé selon son avis. L221-8 est cité de mémoire : **à recopier au texte avant de livrer**.
- Messages de l'écran express (pièces, lieu, client) : jugés conformes.
- Non appliqué : le juriste propose de retirer « Un devis détaillé est remis avant toute intervention » de `docs/metier-btp.md`, parce que la phrase fait doublon. Je l'ai gardé : c'est le texte du juriste local, et le test exige qu'il figure à l'identique dans ce fichier.

### Ce qui reste (session locale)

- Relire L221-8 et le libellé exact de la question de l'annexe 2 sur Légifrance.
- Les libellés « HT » de l'écran express et de l'onglet Dépannage ne tiennent pas compte de la franchise (D-31). Cela relève des conflits entre branches (franchise-suite) : non traité ici.
- Hors périmètre : `handleSignatureSave` ne teste pas le retour de `onUpdate` ; « Passer a la signature » n'a pas d'accent ; le composeur garde le faux message sur le client.

### Décisions d'Hugo (recopiées, non appliquées)

- Alerte « abus de faiblesse » (serrurier) : la faire ou non, après un avis RGPD préalable (c'est un profilage).
- Devis payant : faut-il le permettre ? Il faudrait fixer son prix, le moment où il est dû et le cas du refus.
- « Devis gratuit » : l'imprimer sur tout devis d'un particulier, ou seulement sur les dépannages ?
- Signature sur place d'un brouillon : accepter la solution d'attente (remise du PDF puis confirmation), ou exiger un envoi par e-mail d'abord ?
- Pas de majoration « urgence » : confirmer (la grille ne propose que la nuit et le dimanche ou jour férié).
- Testeur : un dépanneur de l'entourage, ou Hugo lui-même en électricien. Critère proposé : un vrai dépannage fait en moins de trois minutes.
- Réseau des sessions cloud : autoriser legifrance.gouv.fr.

### Risques

- Urgence cochée : toute la facture est payable sur place (`delaiSeptJours` renvoie null). Seul l'avertissement protège : laissé tel quel, comme prévu.
- La confirmation « le client a reçu le devis » repose sur la parole de l'artisan : l'app ne prouve pas la remise.
- La vérification complète porte sur `29c5a58`, le dernier commit de code ; le commit suivant ne touche que ce rapport. À rejouer sur le commit fusionné.

### Résumé (10 lignes)

1. Branche à jour avec main (conflit `REGLAGES_SANS_COLONNE` résolu, toutes les clés gardées).
2. Les 11 défauts sont corrigés dans `29c5a58`, sauf le 4 : il a une solution d'attente (remise du PDF puis confirmation) et reste une décision d'Hugo.
3. Textes juridiques alignés sur l'avis local, avis versé dans `docs/metiers/`.
4. En-tête sous l'encoche : constaté à 56 px utiles avec une encoche simulée.
5. Sondes à 375 et 768 px : 0 débordement, 0 cible sous 44 px.
6. Nouveau parcours en mode réel simulé (grille en base, devis et catégories).
7. 36 tests unitaires, avec contre-essais.
8. `verifier --complet` vert sur `29c5a58`, le dernier commit de code.
9. À relire au texte en local : L221-8 et l'annexe 2.
10. Sept décisions d'Hugo recopiées ci-dessus.

## Décisions d'Hugo du 5 nov. (lot 4)

> 5 nov. 2026, session de correction `corr4-metier-depannage`, partie de `cloud/metier-depannage` @ `5a01a5b9` (base `main` @ `4da73220` : `main` n'est pas fusionnée, elle a 69 commits d'avance). Aucun SQL, aucune migration, aucune fonction Edge, rien de poussé. D-40 n'est pas consignée dans `docs/decisions.md` : ce fichier a divergé de `main`, la session locale s'en charge.

### Contrôle des corrections v3

| Point de la consigne v3 | État | Preuve |
|---|---|---|
| 1. En-tête sous l'encoche | fait | `DevisExpress.jsx:114` : `min-h-14` et `minHeight: calc(3.5rem + env(safe-area-inset-top))`, le motif de `SaisieRamonage.jsx:211-212`. Constaté par une sonde (point 5) : avec une encoche simulée de 47 px, en-tête de 103 px, zone utile de 56 px, bouton Fermer entre 53 et 97 px, à 375 et 768 px. |
| 2. Chemin du dépôt et guillemets | fait | `depannage.js:40-53` : sources « Arrêté du 24 janvier 2017, articles 2 et 3 / article 4 / article 5 » ; le chemin n'est plus qu'en commentaire (au-dessus de `OBLIGATIONS`). `DepannageTab.jsx:145-152` : « Ce que demande l’arrêté du 24 janvier 2017 : », liste sans guillemets. Test « les sources affichées ne nomment aucun fichier du dépôt » ; le parcours lit l'écran (ni `docs/`, ni guillemets). |
| 3. Textes relus, avis versé | fait, aligné sur l'avis | Avis versé : `docs/metiers/avis-juriste-2026-11-04-depannage.md`. `AVERTISSEMENT_URGENCE` (`depannage.js:339`, « pour répondre à l’urgence »), question et modèle de l'annexe 2 (`depannage.js:249`, `:264-274`), phrase « Affichez la grille… » (`DepannageTab.jsx:152`). Ajouté ici : un test compare mot pour mot l'avertissement à l'avis versé. Le juriste a relu l'ensemble au texte le 5 nov. ; les trois obligations et la phrase « Affichez la grille… » ont été reformulées (voir « Corrections du juriste »). |
| 4. Signature d'un brouillon jamais remis | fait autrement | Solution d'attente de la v3 insuffisante : rien n'était enregistré avant la signature et `date_envoi` était posée à la signature (`handleSignatureSave`). Corrigé, voir la décision 2. |
| 5. Constat d'affichage | fait en v3 sans preuve versionnée (`audit-ui/` est ignoré) : refait | Sonde jetable `audit-ui/sonde-depannage-v4.cjs`, module allumé, grille saisie (taux, déplacement, zone, deux majorations, un forfait), express avec urgence et une pièce, à 375 et 768 px : débordement horizontal 0, aucun élément coupé, aucune cible sous 44 px (cases comptées par leur libellé), en-tête avec encoche conforme (point 1), aucune erreur JavaScript. |
| 6. « Client créé mais non choisi » | fait | `DevisExpress.jsx:249` et `:252` : « Client non enregistré. Réessayez. » ; `DevisComposer.jsx` non touché (tâche à part). |
| 7. TTC figé dans la désignation | fait | `depannage.js:173`, `:178` : « Frais de déplacement », « Main-d’œuvre, au taux horaire », sans montant ; tests « aucun montant dans les libellés » et « même libellé à 10 % et à 20 % ». |
| 8. Lieu d'exécution vide | fait | `DevisExpress.jsx:31-35` (pré-rempli avec l'adresse du client), `:66` (refus sans lieu ni adresse), `:83` (imprimé en note), `:105-109` (changer de client reprend son adresse). Le parcours « (base) » contrôle le pré-remplissage et l'enregistrement. |
| 9. Réponse sur les pièces perdue | fait | `DevisExpress.jsx:41` (aucune réponse par défaut), `:68` (réponse exigée pour un particulier avec des pièces) ; `DevisPage.jsx:683-688` (la duplication retire `conservee` des lignes et des lots). Le parcours « (base) » contrôle le refus sans réponse et `conservee: false` enregistré. |
| 10. Parcours en mode réel simulé | fait | `scripts/parcours/depannage.cjs`, second parcours `reel: true` : grille dans `settings_json.reglages`, devis envoyé en base avec ses lignes et leurs catégories. |
| 11. Forfait à moitié saisi effacé | fait | `DepannageTab.jsx:36-53` (`dernierEnvoi` : les champs ne se relisent que sur un changement venu d'ailleurs) ; le parcours « (base) » le contrôle. |
| Section « Conflits » de la consigne : libellés « HT » sans égard pour la franchise (D-31) | pas fait en v3 (renvoyé à la session locale), aucune décision nécessaire : fait ici | `DepannageTab.jsx:58`, `:103`, `:109`, `:130` et `DevisExpress.jsx:48`, `:164`, `:188`, `:199` : plus de « HT » en franchise. Test `libellesFranchiseDepannage.test.jsx` (4 tests), contre-essai sur l'ancien code : 2 échecs. |
| Hors périmètre, sur le chemin du dépannage (consigne v3 : tâches à part) | traités le 5 nov. à la demande du coordinateur (réserve 3) | `handleSignatureSave` affichait « Devis signé et accepté » sans tester le retour de `onUpdate` ; « Passer a la signature » (`SignaturePad.jsx`) n'avait pas d'accent : corrigés, voir « Corrections du juriste ». |

### Décisions appliquées

#### 1. « Devis gratuit » seulement sur les dépannages

- **Comportement vérifié, déjà conforme** : `mentionsDepannage` (`depannage.js:258`) n'imprime la mention que pour `estDevisDepannage(doc)` (`:226` : devis express, case « urgence demandée », ou case facultative « Dépannage, réparation ou entretien » de l'éditeur) et un client particulier. Il y a trois générateurs, pas deux, et tous appellent le même bloc : `devisHtmlBuilder.js:341`, `pdfHtmlBuilder.js:272`, générateur inline de `DevisPage.jsx:1578`. Aucun devis payant n'existe dans le code.
- **Rien à coder** ; seul le commentaire de `depannage.js` (« devis payant : décision d'Hugo ») est remplacé par la décision.
- **Tests** (`depannage.test.js`, « “Devis gratuit” seulement sur un dépannage ») : devis express, case « urgence » et case de l'éditeur impriment « Devis gratuit. » dans `devisHtmlBuilder` et `pdfHtmlBuilder`. Contre-essais : un devis ordinaire de particulier n'imprime rien (le test vérifie que le formulaire de rétractation y est, donc que c'est bien un devis de particulier), ni un dépannage pour un client professionnel. Un test de câblage vérifie que les trois fichiers appellent `${mentionsDepannageHtml({ doc, client })}`.
- **Parcours** (générateur inline, qu'aucun test unitaire ne peut rendre) : l'aperçu du devis de dépannage porte « Devis gratuit. » ; l'aperçu de `DEV-2026-00001` (Marie Dupont, un particulier, devis ordinaire de la démo) n'en porte pas et porte le formulaire de rétractation.
- **Contre-essai fait** : en retirant `estDevisDepannage` de `mentionsDepannage` (la mention sur tout devis de particulier, l'option écartée), 4 tests échouent ; code remis, tests verts.

#### 2. Pas de signature sur place d'un devis jamais remis (C. conso. L221-8)

> État de la matinée du 5 nov. Les textes des fenêtres, le choix du mode de remise et la preuve de la remise ont été complétés l'après-midi par les corrections du juriste : voir « Corrections du juriste » plus bas.

- **Constat sur la v3** : la fenêtre de signature s'ouvrait après deux confirmations sans que rien soit enregistré, et `handleSignatureSave` posait `date_envoi` à la signature : la date de remise était celle de la signature. Les deux points de la fiche étaient donc faux.
- **Corrigé** (`src/lib/remiseDevis.js`, nouveau ; `DevisPage.jsx:1920-1945` (la porte et le parcours de remise), `:2997` et `:3009` (les deux boutons « Faire signer »), `:797-798` (la signature sans date de remise)) :
  - « Faire signer » sur un brouillon de dépannage : fenêtre « Remettez d’abord le devis » (texte de la v3, inchangé) → le PDF s'ouvre (imprimé ou partagé) → fenêtre « Le client a-t-il reçu le devis ? » → bouton « Devis remis au client » → la remise est **enregistrée** (statut « envoyé » et jour de la remise, on attend l'écriture) → la signature s'ouvre. Si la base refuse, la signature reste fermée et l'artisan est prévenu.
  - La signature n'a plus qu'une porte, `ouvrirSignature` : elle refuse un devis qui n'est ni « envoyé » ni « vu ». Le « Faire signer » d'un devis envoyé (par e-mail, WhatsApp, SMS) passe par la même porte, sans changement pour lui.
  - Seconde voie : « Envoyer » par e-mail enregistre la même chose (statut « envoyé », jour d'envoi, comportement existant) ; « Faire signer » ouvre ensuite la signature sans nouvelle fenêtre.
  - `handleSignatureSave` ne pose plus aucune date de remise : la date reste celle de la remise.
  - Les deux fenêtres passent en variante « info » (elles étaient rouges, la variante « danger » étant celle par défaut).
- **Tests** (`remiseDevis.test.js`, 20 tests) : sans remise, rien n'est enregistré et la signature ne s'ouvre pas (deux contre-essais : on renonce à la première fenêtre ; le PDF est ouvert mais la remise n'est pas confirmée) ; remise confirmée, elle est enregistrée avant que la signature s'ouvre ; la base refuse, la signature reste fermée et l'artisan est prévenu ; une écriture mise en file hors ligne compte ; un devis déjà remis s'ouvre sans nouvelle remise ; le jour de la remise est posé sans donnée de signature, et la première date est gardée ; la signature n'a qu'une porte (un seul `setShowSignaturePad(true)`, derrière `devisRemis`) et `handleSignatureSave` ne contient plus `date_envoi`.
- **Parcours** (`depannage.cjs`, 1er parcours, étape 5, puis étape 8) : on renonce à la première fenêtre → la signature ne s'ouvre pas, le devis reste brouillon sans date de remise ; le PDF est ouvert mais la remise n'est pas confirmée → idem ; remise confirmée → le devis stocké est « envoyé » avec le jour de la remise **avant** que la signature soit dessinée, puis la signature s'ouvre ; la signature a lieu 2 jours plus tard (horloge de la page avancée) et `date_envoi` reste celle de la remise ; voie e-mail : un second devis envoyé (envoi simulé) est « envoyé », puis « Faire signer » ouvre la signature sans fenêtre de remise.
- **Contre-essais faits** : (a) parcours modifié sur l'**ancien** code : échec à « l’artisan confirme “Devis remis au client” » (le bouton n'existe pas) ; avec l'ancien code et seulement ce libellé changé, échec à « la remise est enregistrée avant la signature » (le devis est encore brouillon, sans date de remise, quand la signature s'ouvre) ; (b) tests : en laissant la signature s'ouvrir sans confirmation de la remise, 2 échecs ; en l'ouvrant avant l'enregistrement, 2 échecs ; avec l'ancien `DevisPage.jsx` (deux portes, date posée à la signature), 3 échecs.

#### 3. Pas d'alerte « abus de faiblesse »

- Rien à coder. Recherche dans `src/`, `scripts/`, `supabase/`, `docs/` : aucune trace dans l'application ni dans le site. Restaient trois annonces dans les docs, retirées ou remplacées par la décision : la ligne « Plus tard » de `docs/metiers/serrurier.md` (alerte douce), sa liste « Restent à vérifier au texte » (« avis RGPD avant tout code »), et la ligne de `docs/metiers/synthese.md`, qui dit maintenant « pas d’alerte (D-40) ».
- Laissés tels quels : les avis du juriste du 3 nov. (`avis-juriste-2026-11-03*.md`, archives) et la description du risque légal dans `serrurier.md` (l. 65, ce n'est pas une alerte annoncée).

#### 4. Pas de majoration d'urgence

- **Vérifié, déjà conforme** : la grille n'a que `majorationNuit` et `majorationDimanche` (`depannage.js:69`, `:71`) ; le devis express n'accepte que `'nuit'` et `'dimanche'` (`:179`, toute autre valeur est refusée) ; l'écran express ne propose que les majorations de la grille (`DevisExpress.jsx:178`) ; Paramètres › Dépannage dit « Une urgence demandée par le client ne majore jamais le prix » (`DepannageTab.jsx:120`).
- **Gardé, et verrouillé par des tests** (`depannage.test.js`, « aucune majoration d’urgence ») : deux majorations seulement dans la grille, une majoration d'urgence saisie dans les réglages est ignorée, `majoration: 'urgence'` est refusée (contre-essai : la nuit et le dimanche passent), aucun écran ne contient de majoration d'urgence. Parcours : les options de majoration de l'écran express sont celles de la grille (« Aucune », « Nuit »), jamais l'urgence, et le total reste 122,10 € urgence cochée.

### Corrections du juriste (avis du 5 nov. 2026, lot 4, points 7 et 8)

Le juriste a relu au texte officiel (Légifrance, le 5 nov. 2026). Avis : `audit-ui/cloud/v4/avis-juriste-lot4.md` du worktree de la session locale (hors dépôt : non versé ici), lignes 23 à 26 de « À corriger » ; plus la réserve 3 de la section précédente. `docs/decisions.md` n'est pas touché (D-40 y est consignée par la session locale). Les textes du juriste sont recopiés **par programme** depuis son avis (comparaison exacte, aucune différence), puis verrouillés par des tests mot pour mot.

| Correction | Où | Test et contre-essai |
|---|---|---|
| 1. Fenêtres avant « Faire signer » (point 7) : message de la 1re fenêtre (« Avant de signer chez lui… »), message de la 2e (« Répondez oui seulement s’il l’a reçu… »), bouton « Devis remis au client », annulation « Pas encore » ; titres et « Ouvrir le PDF » inchangés | `src/lib/remiseDevis.js`, `TEXTES_REMISE` ; la 2e fenêtre est le nouveau `src/components/devis/RemiseDevisModal.jsx` (montée avec les fenêtres d'envoi, `DevisPage.jsx`) | `remiseDevis.test.js` : textes mot pour mot ; le parcours lit les deux messages à l'écran |
| 2. Preuve de la remise (L221-7) : date, heure et mode, sur le devis | voir ci-dessous | `remiseDevis.test.js` (34 tests), `remiseAuClient.test.js` (7), parcours (démo et base) |
| 3. Paramètres › Dépannage (point 8) : les trois obligations (l. 38, 42 facultative et 46 de l'avis, maintenant l. 44, 48 et 52) et la phrase « Affichez la grille… » | `depannage.js` (`OBLIGATIONS`, commentaires), `docs/metier-btp.md` l. 24 (mêmes chaînes : le test les compare), `DepannageTab.jsx:152` | `depannage.test.js` : 5 tests de plus (textes mot pour mot, « toute autre condition de rémunération », « pièces, éléments ou appareils remplacés » comme l'annexe 2, la facture ne tient lieu de note qu'avec la date et le lieu, la nouvelle phrase). Contre-essai avec les anciens textes : 7 échecs |
| 4. Réserve 3 : `handleSignatureSave` teste le retour de `onUpdate` ; « Passer à la signature » | `DevisPage.jsx:806-809` ; `SignaturePad.jsx:229` | parcours (base) : la base refuse la signature, l'artisan lit « La signature n’a pas été enregistrée… », aucun « Devis signé », rien de signé en base ; parcours `depannage` et `facturation` mis à jour pour l'accent |

#### La preuve de la remise (correction 2)

- **Donnée** : `devis.remise_au_client = { le, mode, canal? }`. `le` : l'instant de la remise (ISO, UTC), donc la date et l'heure. `mode` : `papier` (« Imprimé et remis ») ou `envoye` (« Envoyé par e-mail ou par message »). `canal` : `email` quand l'envoi part de l'app.
- **Voie « PDF »** : la 2e fenêtre (`RemiseDevisModal.jsx`) propose les deux modes du juriste, **sans choix par défaut** ; « Devis remis au client » reste éteint tant qu'aucun n'est choisi ; « Pas encore », la croix ou Échap n'enregistrent rien. Le choix et l'instant partent avec la remise (statut « envoyé », jour d'envoi, preuve) dans **une seule écriture, attendue** : `enregistrer` attend `onUpdate` ; s'il rend faux (la base refuse), la fiche revient en brouillon, l'artisan lit « La remise du devis n’a pas été enregistrée. Réessayez. » et la signature reste fermée ; vrai, ou en file hors ligne, la signature s'ouvre.
- **Voie « Envoyer » (e-mail)** : le premier envoi d'un devis par e-mail ajoute la preuve (mode « envoyé », canal e-mail) à l'écriture du statut, en démo comme en réel (`sendEmail`, `preuveEnvoiParEmail`). Pas de preuve pour une facture, ni quand une première remise est déjà enregistrée (la première est celle qui compte). Les messages WhatsApp et SMS ne sont que préparés : ils n'enregistrent pas de preuve.
- **Où elle est rangée, sans migration** : dans la colonne JSON **existante `devis.payment_metadata`**, sous la clé `remise_au_client` (colonne ajoutée par les migrations 012 et 067). Mappage dans `src/hooks/useSupabaseSync.js` : `toSupabase` l'écrit pour un devis seulement, et seulement si la preuve existe (une copie périmée n'efface rien) ; `fromSupabase` la relit pour un devis seulement (`remiseAuClientLue`). Les autres colonnes JSON du devis ne conviennent pas : `lignes`, `sections` et `tva_details` sont lues partout pour calculer et imprimer, une clé étrangère y casserait un document. `payment_metadata`, elle, n'est lue par aucun écran ni générateur ; le serveur ne l'écrit que sur les **factures** payées en ligne (`create-invoice-payment`), d'où « jamais écrite ni relue sur une facture ».
- **Limites, à connaître** : (1) le nom de la colonne est trompeur ; une vraie colonne (migration) serait plus propre, si Hugo le veut. (2) Si une base n'avait pas cette colonne, la couche d'écriture la retirerait puis réessaierait, comme pour toute colonne inconnue (comportement existant, signalé en console) : la remise serait enregistrée sans sa preuve. La colonne existe en production si 067 y est appliquée (`create-invoice-payment` l'écrit sur les factures) : à constater en lecture seule par la session locale. (3) La preuve n'est pas affichée sur la fiche du devis. (4) Elle reste la parole de l'artisan (L221-7 : c'est ce que le juriste demande d'enregistrer).
- **Tests** : `remiseDevis.test.js` : tant que le mode n'est pas valide (« Pas encore », mode inconnu) rien n'est enregistré, la preuve porte l'instant et le mode, un mode inconnu ou un instant illisible lèvent une erreur (jamais une preuve vide), « Envoyer » joint le mode « envoyé » et le canal e-mail, rien pour une facture ni quand une preuve existe. `remiseAuClient.test.js` : aller-retour app, base, app ; jamais écrite sur une facture ; jamais relue sur une facture ; JSON rendu en texte. Parcours démo : la preuve (heure comprise, mode « papier ») est posée avant la signature et intacte après une signature deux jours plus tard ; la voie e-mail pose « envoyé », canal e-mail. Parcours base : la base refuse la remise (signature fermée, message dit, rien en base) ; la base répond lentement (la signature reste fermée tant qu'elle n'a pas répondu, ce qui prouve l'attente de l'écriture) ; la requête porte `payment_metadata.remise_au_client` ; la base refuse la signature (message dit, aucun faux « Devis signé », rien signé) ; puis la signature passe sans nouvelle remise et la preuve est gardée.
- **Contre-essais faits** : remise enregistrée sans sa preuve : 7 échecs ; preuve écrite aussi sur une facture : 1 échec ; ancien `DevisPage.jsx` : les gardes de source échouent (voir plus haut). Le parcours base contrôle ce qu'un test unitaire ne voit pas : le contenu de la requête et l'ordre (base lente), avec ses propres contre-essais (la base refuse la remise, puis la signature).

### Textes nouveaux : À relire par le juriste

Le juriste a relu au texte, le 5 nov., les fenêtres de la remise (point 7) et les textes de Paramètres › Dépannage (point 8) : ils sont recopiés de son avis (voir ci-dessus), et la 2e fenêtre n'a ni légende ni autre texte que les siens. Restent à relire les textes écrits par cette session :

| Texte | Où |
|---|---|
| « La remise du devis n’a pas été enregistrée. Réessayez. » | message si la base refuse d'enregistrer la remise |
| « Remettez d’abord le devis au client. » | message si « Faire signer » est demandé sur un devis non remis (porte de sécurité) |
| « La signature n’a pas été enregistrée : le devis n’est pas signé. Refaites-le signer. » | message si la base refuse d'enregistrer la signature (correction du 5 nov., réserve 3) |
| « Vos prix, comme sur vos devis. La grille imprimée porte la mention « TVA non applicable, article 293 B du CGI ». » (et libellés sans « HT ») | Paramètres › Dépannage, en franchise de TVA |

### Ce qui n'a pas été fait

- **Voie e-mail** : l'accord du client à l'e-mail est rappelé dans la 1re fenêtre (« s’il est d’accord »), mais pas recueilli au clic sur « Envoyer » (comportement existant). Le juriste juge la voie conforme à quatre conditions, dont l'accord du client pour tout support autre que le papier : à décider si un recueil explicite est voulu.
- **La preuve reste déclarative** : l'app ne prouve pas que le client a reçu le devis ; elle enregistre ce que l'artisan déclare, à l'instant où il le déclare. Elle n'est pas affichée sur la fiche, et WhatsApp et SMS n'en enregistrent pas.
- **`payment_metadata` en production** : colonne à constater par la session locale (lecture seule), voir la correction 2.
- **Hors périmètre** : la réponse sur les pièces à la signature en ligne (migration 112) ; `docs/metier-btp.md` : seuls les trois textes de § 2 sont alignés, la règle « remise enregistrée, avec sa preuve, avant la signature » n'y est pas décrite.
- **Vérification complète** (`npm run verifier -- --complet`) et banc de migrations : non lancés (aucun SQL touché ; l'assemblage est vérifié par la session locale).

### Commandes lancées et résultats

Machine chargée par d'autres sessions (charge moyenne 18 à 20) : les durées sont gonflées, pas les résultats.

- **Départ, état v3 (`5a01a5b9`)** : `npx vitest run src/lib/__tests__/depannage.test.js` : 36 verts. `npm run build` puis `npm run parcours -- depannage` : 2 parcours verts (28 et 8 vérifications).
- **Contre-essais** (code remis ensuite, tests de nouveau verts) :
  - parcours modifié, sur l'ancien code : échec à « l’artisan confirme “Devis remis au client” » ; avec l'ancien code et **seulement** ce libellé changé, échec à « la remise est enregistrée avant la signature (brouillon, remis le undefined, attendu 2026-11-05) » ;
  - `remiseDevis.test.js` : sans confirmation de la remise, 2 échecs ; signature ouverte avant l'enregistrement, 2 échecs ; ancien `DevisPage.jsx`, 3 échecs ;
  - « Devis gratuit » sur tout devis de particulier : 4 échecs ;
  - ancienne `DepannageTab.jsx` et ancien `DevisExpress.jsx` (libellés « HT ») : 2 échecs.
- **Sonde** `node audit-ui/sonde-depannage-v4.cjs` (jetable, non versionnée) : 375 et 768 px, débordement 0, aucun élément coupé, aucune cible sous 44 px, en-tête avec encoche simulée de 47 px à 103 px (zone utile 56 px), aucune erreur JavaScript. Captures des deux fenêtres de la remise à 375 px : `audit-ui/depannage-4-remise-1.png` et `depannage-5-remise-2.png` (elles ne sont plus rouges, le bouton dit « Devis remis au client »).
- **`npm run verifier -- --rapide`** (arbre modifié) : tests 1371/1371, lint 0 erreur (241 avertissements, déjà présents), smoke vert.
- **`npm run verifier` (standard) sur `9b97cc9`**, arbre propre, dernier commit de code : tests 1372/1372, lint 0 erreur (241 avertissements), smoke, build : « Tout est vert ». Les tests du lot passent aussi sous `TZ=America/Martinique` et `TZ=Pacific/Noumea` (78/78), et le script `test:fuseaux` du standard rejoue toute la suite sous ces fuseaux.
- **`npm run parcours -- depannage` sur le code final (`9b97cc9`)** : 2 parcours verts (46 et 10 vérifications), après `npm run build`.
- **`npm run parcours -- facturation`** (l'autre parcours qui fait signer un devis sur place ; lancé avant les commits, sur le même code d'application : il n'a changé ensuite que des commentaires et des tests) : 10 parcours verts.
- **Non lancés** : `npm run verifier -- --complet`, `npm run banc:migrations` (aucun SQL touché). Le commit qui suit `9b97cc9` ne touche que ce rapport.

Corrections du juriste (après-midi du 5 nov., `e98cbd7f`, `c86de88b`, `c5c10739`) :

- **Tests du lot** : `npx vitest run` de `remiseDevis` (34), `remiseAuClient` (7), `depannage` (59) et `libellesFranchiseDepannage` (4) : 104 verts.
- **Contre-essais** (code remis ensuite, tests de nouveau verts) : remise enregistrée sans sa preuve, 7 échecs ; preuve écrite aussi sur une facture, 1 échec ; anciens textes des obligations, 7 échecs.
- **`npm run parcours -- depannage`** : un premier passage du parcours démo avait échoué, par la faute du parcours : il lisait le stockage de la démo à délai fixe, avant sa sauvegarde différée de 500 ms, sur une machine chargée. Les lectures attendent maintenant l'état attendu, et celles qui disent « rien n'est enregistré » attendent la sauvegarde. Ensuite : 2 parcours verts (54 et 34 vérifications), puis les mêmes 2 parcours verts, 54 et 34 vérifications, sur le build vérifié ci-dessous.
- **`npm run verifier` (standard) sur `e2202c9`**, arbre propre, dernier commit de code, de tests et de textes : tests 1398/1398, lint 0 erreur (241 avertissements, déjà présents), smoke, build : « Tout est vert ».
- **`npm run parcours -- facturation`** sur ce même build (les parcours qui font signer un devis sur place, avec « Passer à la signature » et l'écriture de la signature testée) : 10 parcours verts.
- Le commit qui suit `e2202c9` ne touche que ce rapport ; `npm run verifier -- --complet` et le banc de migrations ne sont pas lancés (aucun SQL touché).
