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

## Corrections du 3 nov.

*Session cloud de correction, branches `cloud/ia-direction` (code + documents) et `cloud/ia-direction-docs` (documents seuls, depuis `origin/main`). Rien sur `main`, aucune pull request, aucun accès à la production. `FONCTIONS.ia` reste `false`.*

### Ce qui est fait, avec la preuve

| Quoi | Commit(s) | Preuve |
|---|---|---|
| Branche documents seule (`docs/ia/`, ce rapport, captures) | `cloud/ia-direction-docs` : b386bfa, 4759dbc, puis 4ea2d8d et ce rapport | `git diff origin/main --stat` : seulement `docs/` |
| `FONCTIONS.assistant: false`, séparé de `FONCTIONS.ia` ; bouton, Ctrl+J et montage seulement si `FONCTIONS.assistant` ou démo + `?apercu=ia` (`src/lib/ia/visibilite.js`) | a0462bb | Tests « visibilité du prototype » (4) ; parcours de contre-essai : absent sur `/?demo=true` seul et en mode réel simulé avec `?apercu=ia`. **Contre-essai** : avec l'ancienne règle (démo seule), le parcours échoue (« aucun bouton « Demander » dans l'en-tête »), constaté après reconstruction |
| Contrat aligné sur le socle : codes `QUOTA_ATTEINT`, `PLAFOND`, `IA_INDISPONIBLE`, `NON_CONNECTE`…, forme `{ success, intention, quota }` / `{ error, code }`, `organisation` envoyée ; aucun appel hors démo tant que l'interrupteur est éteint | 4759f8d, 9f4e014 | Tests « codes d'erreur du socle », « forme de succès », « aucun appel à une fonction Edge qui n'existe pas » |
| Client absent accepté si la question « client » est posée ; l'app pose client, montant, heures ; plus de choix « nouveau client » ; nom tapé cherché parmi les clients ; message qui dit quoi faire | 4759f8d | Tests sur « Devis remplacement du tableau, 1 200 € » et « devis pour la cuisine, 800 € » ; **contre-essai** : sans la correction, 4 tests échouent |
| Heures : plus de 1 h par défaut, « à préciser », `lireHeures` (« 3h », « 3 ») ; « trois » redemandé | 4759f8d | Test « heures non dites » ; contre-essai : 1 échec avec `heures = 1` |
| Montant tapé lu par `lireMontant` (« 1 200 € », « 1 200 ») | 4759f8d | Test ; contre-essai : 1 échec avec `Number()` |
| `validite` reprise de `entreprise.validiteDevis` / `validite_devis` | 4759f8d | Test (60, 45, 30) ; contre-essai : 1 échec avec 30 en dur ; la date imprimée par `devisHtmlBuilder` suit (30/12/2026 pour 45 jours) |
| Relances : « Simuler l'envoi de N relances » en démo ; hors démo, pas de bouton : « Pour l'instant, envoyez vos relances depuis chaque facture. » ; commentaire de `validerRelances` corrigé ; bandeau de démo du juriste | be2fece | Tests de rendu `resultatAssistant.test.jsx` ; parcours (« jamais « Envoyer N relances » ») |
| Franchise : ni « HT » ni « TTC » dans `ResultatAssistant.jsx` ; ni question HT/TTC ni taux, même posées par le modèle (drapeau de `estFranchiseTva`) | 4759f8d, be2fece | Tests ; **contre-essai** : l'ancienne carte fait échouer 6 tests de rendu |
| Taper au clavier coupe le micro et devient le texte de la dictée (`setTranscript`, comme `saisirAuClavier` du socle) | be2fece | Relu ; pas de test automatique (le micro n'existe pas dans le navigateur de test) |
| « Masquer les montants » transmis et appliqué (montants, messages de relance, encaissé) | a0462bb, be2fece | Test de rendu |
| Droits : relances et encaissé avec `canAccess('finances')`, e-mail du client avec `canAccess('clients')`, `canPerform('devis','send')` | be2fece | Test de rendu (e-mail) ; relu |
| « Demander » en bouton secondaire ; `aria-label` « Demander (démonstration) » | a0462bb | Parcours ; sonde |
| Encaissé : « comme la tuile » retiré ; le pied dit quand le total compte des factures payées sans paiement détaillé | 4759f8d, be2fece | Test de rendu |
| Libellé 5,5 % du juriste ; phrases « le modèle recopie les chiffres dits » (preparer.js, contrat.js) | 4759f8d | Test du libellé |
| Brouillon de l'assistant à 10 % et 5,5 % dans `devisHtmlBuilder` (page de signature) : certification imprimée, avec l'article | 4759f8d | 2 tests unitaires. **Le générateur inline de `DevisPage` n'est pas constaté** (voir « Ce qui reste ») |
| Parcours : `?demo=true&apercu=ia`, `ouvrir({ jour: '2026-11-03' })`, numéro DEV-… relevé puis cherché dans la liste | a0462bb | `npm run parcours -- "assistant :"` : **5/5 verts** (23 + 3 + 4 + 3 vérifications, plus le parcours franchise qui partage le filtre) |
| Documents : concurrents, « ne choisit jamais un taux de TVA », alerte « détaillez les prestations », conservation chez Anthropic, option A (aucun texte conservé), crédits Max en option, rien sur le DPF, « photo ou plan → métré » (depuis `MetreModal`), paragraphe RGPD des photos, accord au socle (`usage_ia_log`, quotas, codes) | 4759dbc / 3a06016, 4ea2d8d | Relecture `juriste-btp` des textes nouveaux : 4 corrections, appliquées (9f4e014, 4ea2d8d) |
| `origin/main` fusionné (a9b2e86) | 6e6489b | Aucun conflit |

**Vérifications qui ont tourné** : `npm ci` ; `npm run verifier` (standard) sur 3a06016 : **vert** — 1 249 tests, lint 0 erreur (241 avertissements, inchangé), smoke, build ; après, tests `src/lib/ia` + `src/components/ia` : 45/45 sur 9f4e014 ; parcours de l'assistant : 5/5 ; sonde de la fenêtre ouverte (devis en cours) à 375 px (aucun débordement, aucun bouton sous 44 px) et 1440 px (seul « Fermer » de la fenêtre commune `Modal` fait moins de 44 px, hors de ce changement).
**Pas tourné** : `npm run verifier -- --complet` (budget de la session partagé entre quatre sessions ; les parcours complets avaient pris plus de 35 min la dernière fois). À rejouer par la session locale sur le commit final.

### Ce qui reste
- `npm run verifier -- --complet` sur le commit final (session locale).
- Constater le brouillon de l'assistant à 10 % et 5,5 % dans l'aperçu de `DevisPage` (générateur inline) : prévu au lot 1 par le juriste (parcours « documents »).
- Garde-fou conseillé par le juriste, non fait : refuser dans `lireReponse` un montant ou des heures dont les chiffres n'apparaissent pas dans la demande (le commentaire de `contrat.js` dit donc « pas encore vérifiée »).
- Le correctif de `useDictation` du socle (ignorer un résultat arrivé après l'arrêt) n'est pas sur `main` : sans lui, un dernier résultat du micro peut encore suivre une correction au clavier. Il arrivera avec `cloud/ia-socle`.
- Points du juriste sur d'autres fichiers, non faits ici (hors de cette branche) : a-corriger 1, 2, 3, 5, 9 et les textes « avant d'allumer » du point 11 (`LegalPages.jsx`, `TexteCgu.jsx`, `DicteeModal.jsx` : `cloud/ia-socle`) ; point 8 (FAQ de `App.jsx` marquée ia-socle ; `Changelog.jsx` l. 74 et `OngletTaches.jsx` l. 109 sans branche indiquée, aucune des deux branches ne les modifie : **à attribuer par la session locale** pour qu'ils ne soient pas oubliés).
- Quotas : le socle garde 10 dictées en Gratuit et l'illimité ; la ligne directrice recommande 20 / 300 / 1 000 (Q-ia-gratuit).
- Les captures de `docs/ia/captures/` montrent l'ancien bouton plein et l'ancien libellé des relances : à refaire au lot 1.

### Décisions d'Hugo (ne pas appliquer)
- **Q-ia-demo** : prototype visible en démo publique ? Recommandé : `cache` (`?demo=true&apercu=ia`), **c'est ce que code maintenant la branche** ; reste à décider pour livrer le code sur `main`. Les documents peuvent partir seuls (`cloud/ia-direction-docs`).
- **Q-ia-credits** : compte API au nom de l'EI avec plafond (recommandé par la relecture de code), ou crédits de l'offre Max (le juriste n'y voit pas d'interdiction : une seule organisation liée, ne se cèdent pas, l'API s'arrête s'ils sont épuisés ou si Hugo quitte Max). Bloque le lot 0.
- **Q-ia-sous-traitance** : signer l'accord de traitement d'Anthropic sur le compte qui paie. Bloque le lot 0.
- **Q-ia-accord** : écran d'accord au premier « Demander » (recommandé), ou case à l'inscription. Bloque le lot 0.
- **Q-ia-gratuit** : 20 demandes en Gratuit, 300 + 30 photos en Artisan, 1 000 + 100 photos en Équipe (option a, recommandée) ; à trancher avec le socle (10 / illimité).
- **Q-ia-ordre** : lot 1 = devis à la voix au niveau de l'ancienne dictée (recommandé).
- **Q-ia-tva-defaut** : toujours demander le taux en attendant ; pré-remplir seulement après relecture du juriste.
- **Q-ia-voix-native** : annoncer la reconnaissance vocale du système au lancement, puis la faire sur l'appareil dans l'app native.
- **Q-ia-relances-ton** : garder le texte de relance relu (recommandé).
- **Q-ia-pause** : pas de remboursement pour une suspension de moins de 15 jours (recommandé).
- **Q-ia-bouton** : « Demander » dans l'en-tête d'abord, décision après le lot 1 (en bouton secondaire en attendant).
- **Une seule fonction Edge « assistant » ou `voice-intent` étendu** : à arbitrer en relisant les deux branches. Le socle réserve déjà le nom `assistant` dans son compteur et le refuse tant qu'aucun quota n'est décidé ; le prototype garde ce nom.
- Juriste, à décider 1 : publier maintenant la clause de sous-traitance des CGU, sans attendre l'IA (recommandé), ou attendre l'allumage.
- Juriste, à décider 2 : conservation du texte des demandes. **Option A (aucun texte conservé) appliquée dans la ligne directrice, sur consigne de cette session** (elle est déjà codée dans le socle) ; l'option B (30 jours) reste possible.
- Juriste, à décider 3 : « sans limite » alors que le serveur plafonne à 100 dictées par jour : annoncer « sans limite mensuelle (100 dictées par jour au plus) » (recommandé), ou retirer le plafond du jour.
- Juriste, à décider 4 : crédits Max ou compte payant (= Q-ia-credits) ; la ligne directrice présente maintenant les deux options.
- Juriste, à décider 5 : la TVA quitte le CGI au 1er janvier 2027 (ordonnance n° 2025-1247) : tâche à ouvrir par la session principale pour les mentions 293 B, 279-0 bis, 278-0 bis A, 257, 283 des deux générateurs.
- Juriste (relecture de cette session) : Mallettico doit-il un jour conserver les justificatifs de dépense 6 à 10 ans (copie fiable, LPF art. A102 B-2) ? Tant que ce n'est pas tranché, la ligne directrice dit « copie de travail ».

### Textes nouveaux soumis au juriste
Relus le 3 nov. 2026 : messages d'erreur ajoutés (`contrat.js`), questions posées par l'app (`preparer.js`, `simulateur.js`), pied de la carte encaissé, messages masqués, carte devis en franchise, `aria-label` du bouton, refus « accès aux finances », ligne « photo ou plan → métré » et paragraphe sur les photos. Verdict : rien d'illégal ; 4 corrections appliquées (erreurs `HORS_ORGANISATION` et `ILLISIBLE`, position GPS, conservation des factures fournisseurs). Les références L123-22 du C. com. et L102 B du LPF ont été données sans relecture en ligne : à relire au texte avant publication.

### Risques
- Le code n'est pas livrable sur `main` avant la décision Q-ia-demo (et la vérification complète).
- Le contrat suppose que la future fonction rendra `{ success, intention: { intention, parametres, questions, confiance } }` : si l'arbitrage choisit `voice-intent` étendu, sa réponse (`intention` = la dictée) devra porter ce champ.
- Les droits (finances, clients, `send`) ne se voient pas en démo (rôle titulaire) : seulement relus et testés au rendu pour l'e-mail.
- Deux corrections touchent la même ligne directrice sur deux branches : `cloud/ia-direction-docs` et `cloud/ia-direction` portent les mêmes commits de documents (cherry-pick), la fusion devrait se faire sans conflit.

### Corrections du 3 nov. : chaque point
**Relecture de code et de produit**
1. [critique] prototype visible par un visiteur : **fait** (a0462bb), parcours de contre-essai.
2. dépendance à `FONCTIONS.ia` : **fait** (a0462bb), interrupteur `FONCTIONS.assistant`.
3. client absent → « souci technique » : **fait** (4759f8d), tests sur les deux phrases.
4. heures = 1 par défaut : **fait** (4759f8d), test « 3h ».
5. impasses (nouveau client, montant « 1 200 € ») : **fait** (4759f8d).
6. `validite: 30` en dur : **fait** (4759f8d), test.
7. brouillon dans les deux générateurs : **en partie** (4759f8d) : `devisHtmlBuilder` testé à 10 % et 5,5 % ; aperçu `DevisPage` non constaté (lot 1, selon le juriste).
8. « photo ou plan → métré », `MetreModal`, RGPD des photos : **fait** (4759dbc / 3a06016, 4ea2d8d).
9. contrat ≠ socle : **fait** pour le nom (expliqué), les codes et la forme (4759f8d) ; quotas → Q-ia-gratuit.
10. contrôle « Martin » du parcours, Date modifiée : **fait** (a0462bb) ; l'avance de 40 jours reste, après `ouvrir({ jour })`, pour la seule demande de relances (les données de démo se calent sur le jour de la page : sans elle, aucune facture n'est échue).
11. `modeDiscret` : **fait** (a0462bb, be2fece).
12. droits : **fait** (be2fece).
13. « Envoyer 1 relance » : **fait** avec le texte du juriste, qui l'emporte sur « Valider (démonstration) » (be2fece).
14. bouton plein et nom : bouton **secondaire** (a0462bb) ; le nom visible reste « Demander » ; « assistant » ne reste que dans la mention IA exigée (AI Act art. 50) ; le choix du nom suit Q-ia-bouton.
15. vérification complète et sonde : branche à jour de `main` ; sonde à 375 et 1440 px **faite** ; `--complet` **non lancé** (budget), à rejouer en local.
16. « comme la tuile » : **retiré** ; détail cohérent avec `encaisseEntre` (part sans paiement détaillé dite) (4759f8d, be2fece).

**Juriste — à corriger**
1, 2, 3, 5, 9 : autre branche (`cloud/ia-socle`), non faits ici.
4. **fait** pour la ligne directrice (l. 148) ; `LegalPages.jsx` : ia-socle.
6. **fait** pour ia-direction (ligne directrice l. 9, 11, 128 ; `preparer.js` l. 2 ; `contrat.js`) ; garde-fou conseillé non fait ; `consignes.ts`, `TexteCgu.jsx`, `subscriptionStore.js` : ia-socle.
7. **fait** (be2fece, a0462bb) ; la condition d'App.jsx suit le point 11 (`FONCTIONS.assistant` au lieu de `FONCTIONS.ia`).
8. non fait ici : FAQ dans App.jsx marquée ia-socle ; `Changelog.jsx` et `OngletTaches.jsx` sans branche : à attribuer.
10. **fait** (libellé 5,5 %) ; constat dans `devisHtmlBuilder` fait par test, `DevisPage` au lot 1.
11. **fait** (`fonctions.js`, App.jsx) ; textes « avant d'allumer » de `LegalPages.jsx` et `TexteCgu.jsx` : ia-socle, au moment de l'allumage.
12. **fait** (ligne directrice § 0 et § 2).
13. **fait** (ligne directrice § 6, § 8, texte de l'alerte).

**Juriste — introuvable** : 1. rien écrit sur le DPF (ligne directrice § 5.3 : « ne rien écrire », vérification par Hugo) ; 2. texte de la voix : autre branche, rien changé ici.

**Juriste — à décider** : recopiés ci-dessus ; 2 (option A) et 4 (crédits Max en option) mis dans la ligne directrice sur consigne de la session, sans trancher le 4.

### En 10 lignes
1. Le prototype « Demander » n'apparaît plus sur `/?demo=true` ni pour un vrai compte : seulement sur `/?demo=true&apercu=ia`.
2. Il a son propre interrupteur, `FONCTIONS.assistant`, éteint ; `FONCTIONS.ia` reste éteint et ne l'ouvre plus.
3. Contrat aligné sur le socle (codes `QUOTA_ATTEINT`…, forme des réponses) ; aucun appel hors démo.
4. Plus d'impasse : client, montant et heures sont demandés par l'app ; plus de « nouveau client » ; validité reprise des réglages.
5. Relances : « Simuler l'envoi » en démo, aucun bouton hors démo ; franchise sans HT ni TTC ; montants masqués ; droits.
6. Documents corrigés selon le juriste et poussés seuls sur `cloud/ia-direction-docs`.
7. Preuves : vérification standard verte, parcours de l'assistant 5/5, contre-essais rouges sans les corrections.
8. Non fait : vérification complète, aperçu `DevisPage` à 10 % / 5,5 %, points du juriste des autres branches.
9. À attribuer : `Changelog.jsx` et `OngletTaches.jsx` (promesses d'IA fausses).
10. Bloquant pour livrer le code : la décision d'Hugo Q-ia-demo.
