# Session cloud « administratif » — rapport (3 nov. 2026)

Branches poussées : `cloud/administratif` (demandée) et `claude/administratif-echeances-m1hvxq` (branche imposée par la session cloud). Même contenu. Rien sur `main`, pas de pull request.

## Ce qui est fait

1. **Un module unique d'échéances** : `src/lib/echeancesAdmin.js`.
   - Il couvre novembre 2026 → décembre 2027.
   - Il calcule les échéances selon la fiche entreprise : micro, EI/EIRL ou société.
   - Il tient compte de trois réponses de l'artisan, et du rythme Urssaf pour une micro.
   - Il lit aussi les dates de fin de la décennale et de la RC pro, saisies dans les Paramètres.
   - Couverture :
     - micro : déclaration du chiffre d'affaires, chaque mois ou chaque trimestre ;
     - CFE : adhésion au prélèvement, paiement, mensualisation, acompte de juin ;
     - TVA : CA3 mensuelle ou trimestrielle ; CA12 avec l'acompte de décembre 2026, la dernière CA12 et le passage à la CA3 en 2027 (régime simplifié supprimé) ; rien pour la franchise ;
     - impôts : liasse 2031, liasse 2065 et IS (acomptes et solde) ; la déclaration de revenus avec la 2042-C-PRO est « à confirmer », car ses dates 2027 ne sont pas publiées ;
     - DSN, si l'entreprise a des salariés ;
     - assurances ;
     - facturation électronique : réception depuis le 1er sept. 2026, émission au 1er sept. 2027.
   - Chaque échéance cite sa source : URL officielle et date de consultation.
2. **Aucune date inventée.**
   - Une date incertaine affiche « Date à confirmer ».
   - Une date qui dépend d'un choix de l'artisan affiche « Selon votre situation ».
   - Pour une fourchette (la CA3 se dépose entre le 15 et le 24), l'écran donne la date la plus tôt.
   - Une date qui tombe un week-end est signalée.
3. **Questions posées une seule fois**, à l'accueil de l'Administratif : TVA, impôt de la société, salariés, rythme Urssaf.
   - « Je ne sais pas » est accepté : la question n'est plus reposée, et l'écran affiche « Selon votre situation ».
   - Les réponses sont gardées sur l'appareil (`localStorage`, clé `cp_admin_profil`).
   - Le calendrier propose « Changer mes réponses ».
   - Sans forme juridique, l'écran demande de la renseigner dans les Paramètres.
4. **« Prochaines échéances »** (accueil) et le **calendrier** lisent le même module.
   - Le tableau en dur `ECHEANCES_2026` est supprimé.
   - Le calendrier liste les 90 prochains jours, avec le détail et le lien vers la source.
   - Une décennale expirée remonte en tête, avec « Dépassée de N j ».
5. **Alertes par e-mail** : rien ne les envoyait. Le code ne lisait le réglage nulle part, à part l'écran lui-même.
   - Le réglage est retiré.
   - L'écran dit : « Rappels dans l’application seulement : aucun e-mail n’est envoyé. »
   - La phrase « Oups, l'URSSAF attend ta DSN » est retirée.
6. **FAQ de l'écran** : les 4 réponses ont été corrigées (DSN, facture électronique, TVA en rénovation, devis obligatoire).
7. **Relecture `juriste-btp`** : toutes ses corrections sont appliquées mot pour mot, les bloquantes, les « à corriger » et les suggestions 8 à 12. Voir plus bas.

### Preuves

- `npx vitest run src/lib/__tests__/echeancesAdmin.test.js` : **17 tests réussis**. Les profils demandés sont couverts :
  - micro trimestriel ;
  - micro mensuel ;
  - EI au réel avec TVA ;
  - société avec salariés.

  S'y ajoutent l'EI au régime simplifié, les assurances, les sources, la couverture et les prochaines échéances.
- Parcours `scripts/parcours/administratif.cjs` : **14 vérifications, réussi** (390 px).
  - Il ouvre l'Administratif et trouve des échéances futures, sans aucune date dépassée.
  - Il répond aux 3 questions. Elles ne reviennent pas après un rechargement.
  - Le calendrier montre une DSN et un lien officiel.
  - Le texte « Alertes email » a disparu.
- **Contre-essai** : avec les anciens composants (`git stash` de `src/components/admin-help`), le parcours **échoue** (« plus de réglage « Alertes email » ni de rappel envoyé promis »).
- L'ancien parcours « administratif : le calendrier s’ouvre sur le mois en cours » passe toujours.
- Captures à 375 px (accueil, questions, calendrier) relues : pas de débordement horizontal (`scrollWidth ≤ largeur`). Les fichiers sont dans `audit-ui/`, qui n'est pas versionné.
- `npm run verifier -- --complet` : résultat dans la section « Vérification finale » ci-dessous.

## Textes soumis au juriste (`juriste-btp`, 3 nov. 2026)

Tous les titres et détails de `src/lib/echeancesAdmin.js`, les étiquettes de `EcheancesUi.jsx`, la carte « Prochaines échéances » et la FAQ de `AdminHelp.jsx`, et l'en-tête du calendrier.

Corrections appliquées mot pour mot :
- **Bloquant** : la FAQ sur le devis ne parle plus du seuil de 150 € (abandonné) ; elle cite l'arrêté du 24 janvier 2017.
- **Bloquant** : le changement de rythme Urssaf passe en « Date à confirmer » (31 octobre ou 31 janvier selon les sources).
- **À corriger** :
  - seuil de la CA3 trimestrielle en 2027 (1 000 000 €, ou 1 100 000 € en cours d'année) ;
  - texte de l'adhésion au prélèvement de la CFE ;
  - dispense de l'acompte CA12 quand la TVA est inférieure à 1 000 € ;
  - FAQ TVA : ajout de la certification par le client ;
  - accord de la phrase des questions.
- **Suggestions** :
  - exceptions aux acomptes d'IS ;
  - solde d'IS au vendredi 14 mai ;
  - « déclarez au plus tard le vendredi précédent » ;
  - plus de mention de Factur-X ;
  - CFE non due sous 5 000 € de chiffre d'affaires.

## Ce qui reste

1. **Relire les sources sur les pages officielles.** Ni moi ni le juriste n'avons pu ouvrir impots.gouv.fr, urssaf.fr, autoentrepreneur.urssaf.fr, service-public.fr, net-entreprises.fr ou legifrance : le réseau de la session les bloque.
   - Les dates viennent d'extraits de moteur de recherche, recoupés avec `docs/metier-btp.md` (§5 et §8, déjà vérifiés par le juriste en octobre).
   - La session locale doit relire chaque URL de `SOURCES` et confirmer en priorité :
     - la date limite de mensualisation de la CFE 2027 (15 déc.) ;
     - la fourchette du 15 au 24 décembre pour l'acompte CA12 ;
     - le seuil de 1 M€ ;
     - la date limite du changement de rythme Urssaf ;
     - les articles du CGI cités de mémoire par le juriste : 287, 1668, 1647 D.
2. Les dates de la déclaration de revenus 2027 seront publiées au printemps : il faudra les saisir.
3. Fin 2027, il faudra prolonger le calendrier. L'écran le signale deux mois avant la fin (`couvertureBientotFinie`), et le parcours échoue après le 31 déc. 2027.

## Décisions pour Hugo

1. **Où garder les réponses** (TVA, impôt, salariés, rythme Urssaf) ? Aujourd'hui, sur l'appareil seulement : sur un autre téléphone, les questions reviennent. Les garder dans la fiche entreprise demande une migration (colonnes `entreprises`). Je ne l'ai pas faite, pour rester dans le périmètre.
2. **EI ou société en franchise de TVA** (non micro) : la question TVA n'a pas de réponse « Je ne facture pas de TVA ». Faut-il l'ajouter ? (question du juriste)
3. **Déclaration 1330-CVAE**, si le chiffre d'affaires dépasse 152 500 € HT : le juriste suggère de l'ajouter. Elle n'y est pas, faute d'une source officielle lue.
4. **Vrais rappels par e-mail** : à décider plus tard. Il faudrait une fonction planifiée côté serveur. Pour l'instant, rien n'est promis.

## Risques

- **Dates non relues au texte officiel** : voir « Ce qui reste », point 1. L'écran demande de vérifier chaque date sur le site indiqué, et met un lien sous chaque échéance du calendrier.
- **Micro = franchise de TVA** dans l'app (`estFranchiseTva`) : une micro qui a opté pour la TVA ne voit pas ses CA3. C'est un cas rare.
- **Exercice clos le 31 décembre supposé** pour les liasses, l'IS et la CA12. Ces échéances affichent donc « Selon votre situation ».
- **DSN** : un 15 qui tombe un dimanche s'affiche tel quel. C'est la date la plus tôt, donc sans risque.

## Vérification finale

`npm run verifier -- --complet` sur le commit `382059b` (code final ; ce rapport n'ajoute que de la documentation) :

| Étape | Résultat |
|---|---|
| Tests | ✓ 1216 réussis (17 nouveaux) |
| Lint | ✓ 0 erreur |
| Smoke | ✓ |
| Build | ✓ |
| Banc de migrations | ✓ (aucune migration dans ce travail) |
| Parcours | ✗ 4 en échec |
| Audit d'interface | ✓ |

Les **4 parcours en échec ne viennent pas de ce travail**. Rejoués sur `main` sans mes changements (anciens composants de l'Administratif remis, build refait), ils échouent de la même façon :
- « équipe : une seule rangée d’onglets, et les heures à valider dites sur la carte de chacun (375 px) » : « 0 h validées ce mois », alors que le parcours attend des heures « à valider » ;
- « trésorerie : pas de seuil d’alerte tant qu’il n’est pas réglé, un bandeau au plus (390 px) » : un bandeau « négatif » s'affiche ;
- « signature sur place : demande expresse enregistrée… (375 px) » : le bouton « Faire signer » est introuvable ;
- « signature sur place sans e-mail… (375 px) » : même cause.

Cause probable : les données de démo dépendent de la date du jour (3 nov. 2026). À traiter par la session locale, hors de cette mission.

Tous les autres parcours réussissent, dont les deux de l'Administratif.

## Résumé

- L'Administratif affiche les vraies échéances de novembre 2026 à décembre 2027, selon la fiche entreprise.
- Un seul module (`src/lib/echeancesAdmin.js`), avec 17 tests, alimente l'accueil et le calendrier.
- Chaque date cite sa source. Les dates incertaines affichent « Date à confirmer » ou « Selon votre situation ».
- Ce que la fiche ne dit pas est demandé une fois (TVA, impôt, salariés, rythme Urssaf).
- Les alertes par e-mail n'envoyaient rien : le réglage est retiré, l'écran dit « rappel dans l'application seulement ».
- Toutes les corrections du juriste sont appliquées mot pour mot.
- Parcours navigateur réussi ; le contre-essai échoue bien sans la correction.
- Limite : les sites officiels étaient bloqués, les dates viennent d'extraits de recherche et sont à relire en local.
- Décision pour Hugo : garder les réponses dans la fiche entreprise (migration) ou sur l'appareil.
