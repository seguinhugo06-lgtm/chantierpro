# Rapport de la session cloud « ia-direction » (3 nov. 2026)

Branche : `cloud/ia-direction` (même contenu poussé sur `claude/ia-direction-89rqzn`, la branche imposée par l'environnement). Rien n'est poussé sur `main`, aucune pull request, aucune migration, aucun déploiement, aucun accès à la production.

## Ce qui est fait

| Livrable | Où |
|---|---|
| Ligne directrice (document de décision, relu par `critique-produit` et `juriste-btp`) | `docs/ia/ligne-directrice.md` |
| Inventaire de l'existant IA | `docs/ia/inventaire.md` |
| Prototype cliquable | `src/components/ia/`, `src/lib/ia/`, branché dans `src/App.jsx` |
| Captures (18, webp, 420 Ko en tout) | `docs/ia/captures/` |
| Tests unitaires (20) et parcours navigateur (2) | `src/lib/ia/__tests__/assistant.test.js`, `scripts/parcours/assistant.cjs` |

**Le prototype** : un bouton « Demander » dans l'en-tête (et Ctrl+J), visible si `FONCTIONS.ia` (toujours `false`) ou en démonstration. Une fenêtre « Que voulez-vous faire ? », à la voix (reconnaissance du navigateur) ou au clavier, avec quatre exemples. Chaque demande donne un résultat prêt à valider :
- devis : client confirmé, HT/TTC et taux de TVA demandés, puis brouillon enregistré (pas envoyé) ;
- relances : factures échues, reste dû, canal, message relu de l'app ; validation sans envoi ;
- encaissé : le même calcul que la tuile de l'accueil ;
- heures : chantier reconnu, personne demandée, pointage « à approuver », annulable.

Hors démo, l'appel suit le contrat `src/lib/ia/contrat.js` (fonction Edge `assistant`, nom provisoire, à aligner avec `cloud/ia-socle`). Le prototype ne touche ni `supabase/` ni `src/components/voice/`.

## Preuves

| Ce qui a tourné | Résultat |
|---|---|
| `npm ci` | OK |
| `npm run verifier` (standard) sur `0f93693` (commit final du code et des documents) | **vert** : 1 219 tests, lint 0 erreur (241 avertissements, inchangé), smoke, build |
| `npm run verifier -- --complet` sur `1b8c924` | Tests, lint, smoke, build, **banc de migrations : verts**. **Parcours : 4 en échec, puis arrêt** par la limite de temps de la session (35 min de parcours sur une machine chargée) ; l'audit d'interface n'a donc pas tourné dans cette chaîne |
| Les 4 parcours en échec, rejoués sur `main` (`adbf08d`) **sans mes changements** | **Échouent aussi sur `main`** : « équipe : … heures à valider », « trésorerie : pas de seuil d'alerte… », « signature sur place sans e-mail… », « signature sur place : demande expresse… » (« Faire signer » introuvable). Sans lien avec l'assistant ; probablement liés à la date du jour dans les données de démo. À traiter par la session locale. |
| `node scripts/audit-ui.cjs` (lancé à part, bouton « Demander » présent) | **0 défaut sur 80 combinaisons** (20 pages × 375 / 768 / 1024 / 1440) |
| `npm run parcours -- "assistant :"` sur la version finale | **2/2 verts** : les quatre demandes à 375 px (22 vérifications : client confirmé, HT/TTC et TVA demandés, brouillon enregistré non envoyé et retrouvé dans la liste des devis, relances avec message, encaissé, heures ajoutées puis annulées) ; clavier seul à 1440 px (Ctrl+J, Entrée, Échap) |
| Tests unitaires `src/lib/ia` | **20/20**. Contre-essai : sans la question du taux de TVA (`preparer.js`), le test « pas de brouillon tant que HT/TTC et TVA ne sont pas répondus » échoue (constaté), puis repasse une fois la ligne remise |
| Captures | 18 webp (436 Ko) à 375 et 1440 px, clair et sombre, régénérées après les corrections |
| Relectures | `critique-produit` (verdict « plus petit ») et `juriste-btp` (13 écarts) : intégrées, résumé au § 11 de la ligne directrice |

Non vérifié : un vrai appel au modèle (la fonction Edge n'existe pas encore) ; la voix sur un vrai téléphone ; les deux générateurs de PDF (le prototype n'y touche pas).

## Ce qui reste
- **Socle serveur** (session `cloud/ia-socle`) : aligner la fonction Edge sur `src/lib/ia/contrat.js`, ou ajuster le contrat ensemble.
- **Lot 1** (après décisions) : plusieurs lignes et prix du catalogue, nouveau client, envoi réel des relances, autoliquidation, préférence HT/TTC, remplacement de `DicteeModal`.
- **Vérifier** qu'un brouillon à 10 % ou 5,5 % créé par l'assistant imprime la mention de certification dans **les deux** générateurs de PDF (non fait : le prototype ne touche pas aux générateurs).
- **Recopier l'article 50 de l'AI Act depuis EUR-Lex** (accès refusé depuis la session) et vérifier la règle de Google sur le contenu généré par IA.
- **Revérifier les concurrents** sur leurs propres sites (non ouverts depuis la session) avant toute comparaison publique.
- **Données de démo** : aucune facture échue au 3 nov. 2026 ; la relance montre donc « Aucune facture en retard » à Hugo. Si Hugo veut voir la liste en démo, ajouter une facture échue dans `src/lib/demo-data.js` (fichier partagé, non touché ici).
- Supprimer au lot 0 les deux promesses fausses (« analyse photo de chantier ») et le code mort listés dans l'inventaire.

## Décisions pour Hugo (détail au § 9 de la ligne directrice)
Bloquent le lot 0 : **Q-ia-credits** (compte API au nom de l'EI, recommandé), **Q-ia-sous-traitance** (accord de traitement avec Anthropic), **Q-ia-accord** (écran d'accord avant le premier usage). Puis : Q-ia-gratuit (20 demandes en Gratuit), Q-ia-ordre (lot 1 = devis à parité), Q-ia-tva-defaut, Q-ia-voix-native, Q-ia-demo (cacher le prototype derrière `&apercu=ia` avant de le livrer sur `main`), Q-ia-relances-ton, Q-ia-pause, Q-ia-bouton.

## Textes nouveaux soumis au juriste
- Textes du prototype : phrase d'introduction, mention « Assistant d'intelligence artificielle : il peut se tromper », messages d'erreur (`contrat.js`), libellés de TVA (`preparer.js`), confirmations (brouillon non envoyé, relances validées, heures à approuver). Relus le 3 nov. ; corrections appliquées.
- Propositions de textes pour la politique de confidentialité (voix), les CGU (annexe art. 28) et les CGV (suspension de l'assistant) : rédigées par le juriste, **à relire de nouveau au lot 0** avant publication.
- Les avis complets sont résumés au § 11 de la ligne directrice.

## Risques
- **Q-ia-demo** : livré tel quel sur `main`, le prototype serait visible par tout visiteur de `?demo=true` alors que la fonction n'existe pas encore (risque L121-2). Recommandation : le cacher derrière un paramètre avant livraison.
- Le bouton « Demander » s'ajoute à l'en-tête en démonstration : l'audit d'interface le mesure à 0 défaut.
- Quatre parcours anciens échouent sur `main` aujourd'hui (voir Preuves) : le garde-fou de livraison exigera de les réparer avant toute livraison, avec ou sans cette branche.
- Le contrat peut diverger de ce que prépare `cloud/ia-socle` : à réconcilier à la relecture locale.
- Les crédits de l'offre Max pour un service commercial : incertain (Q-ia-credits).
- Les estimations de temps gagné sont des hypothèses, non mesurées : elles ne doivent pas être reprises sur le site.

## En 10 lignes
1. Ligne directrice écrite, relue par le critique produit et le juriste, remarques intégrées (`docs/ia/ligne-directrice.md`).
2. Règle d'or : le modèle comprend, l'app calcule, l'artisan valide ; aucun chiffre d'un document ne vient du modèle.
3. Coût : ~0,0005 $ par demande avec Haiku 5.5 ; 100 $ couvrent des centaines d'artisans ; le risque est l'abus et l'arrêt des crédits.
4. Concurrents : devis à la voix banal (Obat, Batappli…) ; contrôle du devis et entrée unique non trouvés.
5. Ordre : socle → devis à la voix à parité → commandes sans modèle → contrôle du devis → factures fournisseurs.
6. Prototype « Demander » visible en démo : quatre demandes, validation en un geste, rien d'envoyé.
7. Preuves : vérification standard verte sur le commit final, audit d'interface 0 défaut, parcours de l'assistant verts ; 4 parcours anciens échouent aussi sur `main`.
8. 11 décisions pour Hugo ; 3 bloquent le socle (compte API, accord de traitement, écran d'accord).
9. Reste : socle serveur, lot 1, article 50 à recopier d'EUR-Lex, mention de TVA dans les deux PDF.
10. Avant de livrer sur `main` : cacher le prototype derrière `&apercu=ia` (Q-ia-demo).
