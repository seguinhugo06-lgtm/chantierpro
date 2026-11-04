# Session cloud « metier-depannage » — dépannage express (lot 3)

> 4 nov. 2026. Branches `cloud/metier-depannage` et `claude/metier-depannage-fd3cwg` (même contenu), parties de `main` @ `73b1e04`. Rien n'est livré sur `main`, aucune migration, aucun accès à la production.

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
