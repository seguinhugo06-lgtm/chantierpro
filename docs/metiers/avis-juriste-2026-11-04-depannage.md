# Avis juriste-btp du 4 nov. 2026 : dépannage express (lot 3)

**Objet** : relecture au texte des textes nouveaux de la branche `cloud/metier-depannage` (`src/lib/depannage.js`, `src/components/settings/DepannageTab.jsx`).
**Méthode** : relecture faite par la session locale (juriste-btp), sur Légifrance, le **4 nov. 2026**. La session cloud n'a pas accès à Légifrance : elle verse ici l'avis tel que la consigne de correction (metier-depannage-v3) le lui a transmis, sans l'avoir relu elle-même au texte. Les citations sont celles du juriste.

Sources :
- Arrêté du 24 janvier 2017 relatif à la publicité des prix des prestations de dépannage, de réparation et d'entretien dans le secteur du bâtiment et de l'équipement de la maison, art. 2, 3, 4 et 5, annexe 2 (versions du 01/04/2017) : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000033935513/2026-11-04
- C. conso. L221-10 (version du 01/07/2016) : https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069565/LEGISCTA000032226870/2026-11-04
- C. conso. L221-28 (version du 28/05/2022) : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563170/2026-11-04

## À corriger (4)

1. **Avertissement d'urgence**. « pour faire cesser l'urgence » au lieu de « pour répondre à l'urgence » ; « payé qu'après sept jours » ne vaut que pour un contrat conclu chez le client.
   Citation (L221-10, 4°) : « dans la limite des pièces de rechange » « et travaux strictement nécessaires pour répondre à l'urgence ; ».
   Texte retenu : « Urgence : seuls les pièces de rechange et travaux strictement nécessaires pour répondre à l’urgence peuvent être payés sur place et échappent à la rétractation (articles L221-10, 4° et L221-28, 8° du Code de la consommation). Mettez tout le reste (amélioration, confort, remplacement non urgent) sur un devis séparé : signé chez le client, il ne permet de recevoir aucun paiement avant l’expiration d’un délai de sept jours (article L221-10). »

2. **Question des pièces remplacées**. Le modèle-type de l'annexe 2 n'était pas suivi (ordre « OUI □ NON □ », ligne de signature « Lu et approuvé » absente). L'art. 4, III ne prévoit aucune exception.
   Citations : art. 4, III : « Cette information s'effectue selon un modèle-type figurant en annexe du présent arrêté. » ; annexe 2 : « OUI □ NON □ » puis « Signature du consommateur précédée de la mention manuscrite " Lu et approuvé ". »
   Retenu : la question, puis « OUI □ NON □ », puis « Signature du consommateur précédée de la mention manuscrite « Lu et approuvé » : » et une ligne à signer. Sur la page de signature en ligne, la mention manuscrite est impossible : la réponse y sera recueillie par la migration 112 (plus tard).

3. **Obligations citées dans Paramètres › Dépannage**. L'art. 2 vise l'information avant le contrat ; le devis dit s'il est gratuit ou payant selon l'art. 4, I ; l'art. 5 parle d'une « note ».
   Citations : art. 2 : « le caractère payant ou gratuit du devis et, le cas échéant, le coût d'établissement du devis ; » ; art. 5 : « de la délivrance d'une note dans les conditions prévues par l'arrêté du 3 » octobre 1983.
   Textes retenus (recopiés à l'identique dans `docs/metier-btp.md` § 2) :
   - « Taux horaires TTC, décompte du temps, frais de déplacement, prix TTC des forfaits et caractère gratuit ou payant du devis : affichés dans les locaux, communiqués avant un contrat conclu chez le client et accessibles sur tout espace en ligne (art. 2 et 3) » ;
   - « Un devis détaillé est remis avant toute intervention ; conclu dans vos locaux, il dit s’il est gratuit ou payant (art. 4, I) ; il informe le client qu’il peut conserver les pièces remplacées, selon le modèle de l’annexe 2 (art. 4, III) » ;
   - « une note (la facture en tient lieu) est remise gratuitement sur un support durable dès la fin de l’intervention, avant le paiement (art. 5) ».

4. **« Imprimez la grille pour vos locaux et votre véhicule »**. L'arrêté demande aussi de communiquer ces tarifs avant un contrat conclu chez le client.
   Citation (art. 3) : « Ces informations sont également communiquées dans les conditions prévues aux articles L. 221-8, » « L. 221-11 et L. 221-12 du code de la consommation ».
   Texte retenu : « Affichez la grille dans vos locaux, remettez-la au client avant le devis quand vous intervenez chez lui (arrêté du 24 janvier 2017, art. 3), et mettez-la sur votre site. »

## Confirmé (1)

- Grille « Nos tarifs » (deux colonnes TTC, pied TVA, « Devis gratuit. Un devis détaillé vous est remis avant toute intervention. »), « Devis gratuit. » sur le devis d'un particulier, libellés des lignes express, case « Dépannage, réparation ou entretien ».

## Reste à trancher

- **Signature sur place d'un brouillon jamais remis au client (L221-8)** : avis juriste-btp du 4 nov. 2026 (session cloud), rendu sans accès à Légifrance, à confirmer au texte : remettre le PDF avant la signature sur place répond à L221-8, à condition qu'il soit imprimé ou envoyé sur un support durable, pas seulement montré à l'écran. La branche le fait (deux confirmations avant d'ouvrir la signature). Décision d'Hugo.
- Le libellé exact de la question de l'annexe 2 n'a pas été recopié dans cet avis : la session locale le compare au modèle-type avant de livrer.
