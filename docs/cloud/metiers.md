# Rapport — session cloud « metiers » (3 nov. 2026)

Branche `cloud/metiers` (copie identique poussée sur `claude/metiers-btp-rb0xi4`, la branche imposée par l'environnement). Rien sur `main`, aucune pull request, aucun accès à la production, aucun code.

## Ce qui est fait

Dans `docs/metiers/` :
- **15 fiches métier**, chacune selon les 8 points demandés, avec ses sources (URL, date de consultation, niveau de preuve) : `electricien`, `plombier`, `chauffagiste`, `frigoriste`, `ramoneur`, `macon`, `couvreur`, `charpentier`, `menuisier`, `plaquiste`, `peintre`, `carreleur`, `serrurier`, `paysagiste`, `multiservice`. Le plombier-chauffagiste est couvert par `plombier` + `chauffagiste`.
- **`commun.md`** : les règles valables pour tous (décennale, devis, TVA, autoliquidation, aides, RGE), pour ne pas les répéter dans chaque fiche.
- **`chiffres.md`** : la priorité des métiers, chiffrée là où une source existe (établissements INSEE 2021 via Constructys, CAPEB), « non trouvé » ailleurs.
- **`synthese.md`** : commun et non commun, ce que l'app fait déjà (constaté dans le code), la proposition d'expérience par métier, l'ordre de réalisation, les décisions pour Hugo.
- **`avis-juriste-2026-11-03.md`** : la relecture de `juriste-btp`, recopiée telle quelle ; ses corrections sont appliquées dans les fiches et la synthèse.

Méthode : six agents de recherche en parallèle (trois métiers chacun, plus un pour le commun et les chiffres), puis `juriste-btp`, puis un agent qui a appliqué ses corrections.

## Preuves

- Code relu au commit `adbf08d` (lectures et recherches dans `src/`, détail dans `synthese.md` § 2).
- Constats dans le code, à corriger quel que soit le choix sur les métiers :
  - **le n° RGE saisi dans Paramètres n'est imprimé nulle part** : `Settings.jsx` l. 767-770 enregistre `rge` et `rgeOrganisme` ; les deux générateurs (`devisHtmlBuilder.js` l. 454, `DevisPage.jsx` l. 1692) impriment `labels`, qu'aucun fichier n'écrit (recherche de `labels` dans `src/services`, `src/hooks`, `src/context`, `src/stores` : rien) ;
  - **« Qualiopi » figure parmi les organismes RGE** (`Settings.jsx` l. 140), alors que c'est la certification des organismes de formation ;
  - **aucune mention d'autoliquidation** n'est imprimée sur un devis ou une facture (seule une dépense porte le champ).
- `npm ci` : réussi. `npm run verifier` : voir le résultat en fin de rapport.

## Ce qui n'a pas pu tourner, et pourquoi

- **Aucun texte officiel ouvert.** Le réseau de la session ne résolvait pas `legifrance.gouv.fr`, `service-public.fr`, `bofip.impots.gouv.fr`, `insee.fr`, `consuel.com`, etc. Seule la recherche web marchait : toutes les sources sont des **résumés de moteur de recherche**, marqués [résumé] ou (à vérifier). Aucun texte réglementaire n'est donc recopié « mot pour mot » comme règle à coder.
- **Quota de recherches épuisé** (200 pour la session, partagé entre les agents) : quelques points n'ont pas été cherchés (élagage, certifications de paysagiste, mentions de l'Anah, loi de finances 2026 pour le crédit d'impôt services à la personne). Ils sont marqués « à vérifier » dans les fiches.
- **Chiffres manquants** : pas de nombre officiel d'entreprises pour électricien, peintre, plaquiste, carreleur, serrurier, frigoriste, ramoneur, multiservice. Une requête Sirene par code NAF les donnerait.
- `npm run verifier -- --complet` : non lancé, le changement ne touche que de la documentation (aucun affichage).

## Ce qui reste

1. **Relire au texte** les 10 points listés par le juriste (`synthese.md`, fin) avant tout code : bornes IRVE, PAC air-air, chaudières fossiles, fenêtres et isolation (annexe IV), décret MaPrimeRénov' du 1er sept. 2026, attestations d'entretien, certificats gaz, services à la personne, TVA d'une extension.
2. **Aligner `docs/metier-btp.md` § 4** (« agrandissement > 10 % ») et les fiches maçon et charpentier (« extension = 20 % ») après lecture du BOFiP.
3. Compléter `chiffres.md` par Sirene.
4. Faire passer chaque lot par `/tache` et le `critique-produit`.

## Décisions pour Hugo

Détail dans `synthese.md` § 5. Les principales :
1. Choix du métier à l'inscription : multiple et passable (recommandé) ?
2. Premier lot après le ramonage : l'attestation d'entretien chaudière / PAC / poêle (recommandé) ou l'électricien ?
3. Corrections immédiates (RGE imprimé, Qualiopi retiré, modèles purgés des aides et taux périmés) : à faire tout de suite (recommandé).
4. Un testeur par métier avant de construire son lot.
5. Avance immédiate Urssaf : à écarter pour l'instant (recommandé).
6. TVA : suggestion seulement, jamais blocage, tant que rien n'est relu au texte (recommandé).
7. Autoriser Légifrance, le BOFiP, service-public, l'INSEE et le Consuel dans le réseau de la prochaine session.
8. Rappel de chaudière : peut-il dire « obligatoire » ?
9. Formules « réalisé selon la norme … » : oui ou non ?
10. MaPrimeAdapt' : avertissement (recommandé) ou blocage ?

## Textes nouveaux soumis au juriste

Aucun texte destiné à être imprimé n'a été écrit (pas de code). Les 16 fiches juridiques (`commun.md` + 15 métiers) ont été relues par `juriste-btp` le 3 nov. 2026 : 2 erreurs bloquantes (TVA des bornes rattachée à la qualité du client ; isolation des rampants annoncée aidée par MaPrimeRénov' par geste), une quinzaine « à corriger », toutes appliquées.

## Risques

- **Tout repose sur des résumés.** Une règle codée depuis ces fiches sans relecture au texte peut imprimer une mention ou un taux faux. Les fiches le disent en tête.
- **Le droit des aides bouge vite** (MaPrimeRénov' modifié en février et en septembre 2026, TVA des PAC en juillet 2026). Dater toute règle et la relire avant chaque lot.
- **Des modèles de devis existants promettent sans doute des aides qui n'existent plus** (fenêtres, isolation) : risque de pratique commerciale trompeuse tant que le lot 0 n'est pas fait (non vérifié ligne à ligne dans cette session).

## Résumé

- 15 fiches métier, un fichier commun, les chiffres et la synthèse sont dans `docs/metiers/`.
- Aucun texte officiel n'a pu être ouvert : tout est à relire au texte avant de coder.
- Relu par `juriste-btp` ; 2 erreurs bloquantes et une quinzaine d'autres corrigées.
- Trois défauts constatés dans l'app : RGE jamais imprimé, « Qualiopi » dans la liste RGE, pas de mention d'autoliquidation.
- Commun à tous : décennale, devis de dépannage, TVA par ligne, sous-traitance, photos.
- Propre aux métiers : attestation + rappel (chauffagiste, frigoriste), certificat tiers (Consuel, gaz), qualifications, lignes techniques, urgence, récurrence, crédit d'impôt.
- Proposition : choisir son métier, catalogue trié, « Mes qualifications », documents sur le modèle du ramonage.
- Ordre : corrections, qualifications et métier, attestation d'entretien, dépannage, électricien.
- 10 décisions attendent Hugo, dont le premier lot après le ramonage.
- À faire ensuite : ouvrir le réseau aux sites officiels et relire les 10 points prioritaires.
