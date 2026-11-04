# Session cloud « ia-allumage » — rendre la dictée prête à être allumée

Branche `cloud/ia-allumage` (copie : `claude/ia-allumage-d6x7tt`), partie de `origin/cloud/ia-socle` (`24f2f7e`), avec `origin/main` fusionné.
Décision d'Hugo du 4 nov. 2026 : « Je veux que l'IA marche directement » (inscrite en **D-34** et **D-35**, `docs/decisions.md`).
Rien n'est appliqué en production, rien n'est déployé, aucune clé n'a été touchée.

Deux commits finaux :
- **A** — tout le travail, `FONCTIONS.ia` toujours à `false` ;
- **B** — seulement l'allumage : `FONCTIONS.ia = true`, l'enveloppe de l'article 11 des CGU retirée, et les tests et parcours qui en dépendent.
  **B contient volontairement deux tests rouges** : les dates d'attente des CGU et des CGV (`2026-11-03`) doivent être remplacées par la date réelle de la livraison (voir §6).

## 1. Ce qui est fait, et la preuve

### 1.1 Quotas par offre (migration 107 modifiée, serveur, app)
- **Gratuit 5 par mois, Artisan 100 par mois, Équipe sans limite mensuelle** : `LIMITES` de `supabase/functions/voice-intent/regles.ts` et `PLANS[plan].limits.dictees` (`src/stores/subscriptionStore.js`) ; un test vérifie qu'ils sont identiques.
- **Équipe : 100 par jour et par personne.** Le plafond du jour existait (100 par jour et par compte aux plans payants, 20 au gratuit). Il compte maintenant par **jour de Paris** (de minuit à minuit), pour que « réessayez demain » soit vrai, et il rend son propre motif `plafond_jour` (429 `PLAFOND_JOUR`).
- Le plafond de 5 par minute et le coupe-circuit global (3 000 par jour) restent.
- **Le serveur fait foi** : l'app affiche le message rendu par `voice-intent`. Le titre de la fenêtre d'offre ne porte plus de nombre (« Vos dictées du mois sont utilisées »).
- Preuve : `npm run banc:migrations` → **« Tout est vert (725 vérifications) »** (107 : quotas des trois offres, plafond par personne, jour de Paris autour de minuit, `service_role` en lecture seule ; 109 : 24 vérifications).
- **Contre-essai de chaque quota** (migration ou limites cassées une à une, puis fichiers remis) :

  | Défaut introduit | Vérification qui échoue |
  |---|---|
  | plafond du jour à 101 | « au plan Équipe, la 101e dictée du jour d'une même personne est refusée » et « au-delà de 100 analyses dans la journée » |
  | Artisan illimité (`-1`) | « au plan Artisan, la 100e dictée du mois passe et la 101e est refusée » |
  | Gratuit à 6 | « cinq dictées acceptées… », « la 6e est refusée (quota) » |
  | plafond compté par entreprise au lieu de par personne | « le plafond est par personne : un autre membre de l'entreprise dicte encore » |

### 1.2 Textes de l'offre (à relire par le juriste, §4)
- Fenêtre d'offre et tarifs (`featureLabels`) : « 5 dictées par mois », « 100 dictées par mois », « Dictées sans limite mensuelle (100 par jour et par personne au plus) ». Masqués tant que l'IA est éteinte.
- Messages du serveur (`regles.ts`) :
  - quota Gratuit : « Vos 5 dictées du mois sont utilisées. Saisissez votre devis à la main, ou passez au plan Artisan : 100 dictées par mois. »
  - quota Artisan : « Vos 100 dictées du mois sont utilisées. Saisissez votre devis à la main, ou passez au plan Équipe : dictées sans limite mensuelle (100 par jour et par personne au plus). »
  - plafond du jour (plans payants), texte du juriste : « Vous avez atteint le maximum de 100 analyses par jour et par personne. Saisissez votre devis à la main, ou réessayez demain. » Au plan gratuit, le message court du plafond (les 20 comptent aussi des échecs).
- Plan Artisan, quand l'IA est allumée : « Tout le plan Gratuit » au lieu de « Tout le plan Gratuit, sans limite » (à côté de « 100 dictées par mois », la phrase était trompeuse ; juriste : C. conso. L121-2, C. civ. 1190). Le texte sans IA ne change pas.
- **Page des tarifs** (tableau et cartes, `src/components/landing/comparaisonPlans.js`, ligne dans `src/lib/limitesDictees.js` : le test d'honnêteté refuse le mot dans les fichiers du site) : avec l'IA allumée, une ligne « Dictées » rejoint les limites : « 5 par mois », « 100 par mois », « Sans limite mensuelle (100 par jour et par personne au plus) » (jamais « Illimité »). Sans cela, les libellés de dictée tombaient parmi les « fonctions ». Test `limitesDictees.test.js`.
- **CGV, article 4** : il est figé et versionné (`src/lib/cgv.js`, décision du 20 oct.). Ajouter les dictées aux offres change donc les CGV. Comme pour les CGU, le texte « avec IA » et sa version suivent l'interrupteur. Un test le compare aux listes des offres.

### 1.3 L'écran d'accord au premier « Dicter » (migration 109)
- Texte du juriste posé **mot pour mot** (`src/lib/accordIa.js`, test qui le compare), fenêtre `Modal.jsx` (`src/components/voice/AccordIaModal.jsx`) : focus sur « J'accepte et je dicte », cibles de 44 px, un seul bouton plein.
- **Migration 109** `accords_ia` : compte, date (du serveur), version du texte, date du retrait. RLS : chacun ne lit, ne crée et ne retire que le sien ; aucun accès anonyme ; GRANT explicites par colonne (INSERT `version`, UPDATE `revoque_le`) ; un déclencheur pose la date du retrait et refuse de « dé-retirer » ; rien ne s'efface sauf avec le compte. Au plus 10 accords donnés par compte et par jour (relecture gardien, M1). `service_role` en lecture seule (B1). Banc : 24 vérifications. Contre-essais : policy de lecture ouverte → « un artisan ne lit que son accord » échoue ; sans déclencheur → 3 vérifications échouent.
- **CGU d'abord** : « Dicter » demande les CGU en vigueur avant l'écran d'accord (la clause qui autorise Anthropic, RGPD art. 28.2, est dans celles de l'allumage ; relecture juriste). Annuler n'ouvre rien.
- **Serveur** : `voice-intent` lit l'accord (clé de service, après le jeton) avant toute réservation. Sans accord à la version attendue : **403 `ACCORD_REQUIS`**, rien de réservé ni envoyé. Table absente ou illisible : 503 fermé. Contre-essai : sans la ligne de refus, le test « sans accord » échoue. Si l'accord est retiré sur un autre appareil pendant une dictée, la fenêtre propose « Lire l’écran d’accord » (relecture gardien, B3).
- **« Non, je saisis à la main »** ouvre un devis vierge, sans rien envoyer ni enregistrer.
- **Retrait dans Paramètres › Données** (« Retirer mon accord », relu après coup : un refus RLS est silencieux). L'app relit l'accord à chaque « Dicter » : après un retrait, l'écran revient.
- En **démo**, pas d'écran : rien n'est envoyé.

### 1.4 CGU et politique
- Clause de sous-traitance (art. 11) **et** phrase de la base légale (art. 11) : toutes deux sous l'interrupteur. Rien ne change à l'écran sans nouvelle version ; c'est l'option B du contrôle local, sans décision d'Hugo à prendre maintenant. Le commit B retire l'enveloppe.
- `CGU_VERSION` et `CGV_VERSION` « avec IA » : **valeur d'attente `2026-11-03`**, signalée par `cguIa.test.js` et `cgvVersion.test.jsx` dans le commit B.
- Politique, art. 2 et 3 : l'enregistrement de l'accord est déclaré, ainsi que sa durée de conservation. Art. 4 : ancre `#article-4` pour le lien « En savoir plus ».
- **Écran et politique disent la même chose** (60 clients, 80 libellés, son non reçu, États-Unis et calcul ailleurs, 30 jours / 2 ans, pas d'entraînement). Un test le vérifie.

### 1.5 Promesses fausses
Déjà retirées sur le socle et constatées ici : la FAQ « Prenez une photo… », la nouveauté « IA Devis : analyse photo », « Compléter (IA) » (devenu « Tâches types »). La FAQ de la dictée annonce maintenant les nouveaux quotas.

### 1.6 Corrections du contrôle local du socle (4 nov.)
- **TVA en franchise** : `src/lib/brouillonDictee.js` (fonction pure) ; en franchise, chaque ligne à 0 % (catalogue compris), TVA 0, total = HT ; relecture sans « HT », « TTC » ni choix de taux, avec « Total » et « TVA non applicable, art. 293 B du CGI ». Test vitest avec `buildDevisHtml` (brouillon et devis signé) et contre-essai ; parcours « dictée en franchise » jusqu'à l'aperçu imprimé du générateur de `DevisPage`.
- **Clavier** : `texteAffiche` (`useDictation.js`) ne recolle plus le texte tapé. Test « devis pour  » ; contre-essai avec l'ancienne ligne : 2 tests échouent. Parcours : frappe touche par touche.
- **`IA_DICTEE`** : `ouvertePour()` ignore casse et espaces (« Tous », « tous  »), testé.
- **Démo** : la fenêtre ne dit plus « analyse par Claude » ni « envoyé » ; elle dit « Mode démonstration : analyse simplifiée, faite sur votre appareil, sans IA. Votre texte n’est pas envoyé à Mallettico. » (texte du juriste, 4 nov.)
- **Chef de chantier** : parcours (ni bouton ni fenêtre), avec le gérant en contre-essai.
- **`dictee.cjs`** : « CGU : version inchangée, sans clause de sous-traitance », et la phrase de la base légale vérifiée dans les deux builds.
- **Docs** : étape 0 (Hugo lit les noms des secrets **maintenant**), `etat-production.md` (action 8, lignes 107, 109, `voice-intent`), rapport du socle (clavier, Juriste 9, vérification non concluante).
- **Défaut trouvé en route** : la fenêtre de dictée (z-9999) cachait la demande d'acceptation des CGU (z-1050) qu'ouvre la première création après une nouvelle version, celle de l'allumage justement. L'artisan restait sur « Création… ». Corrigé (z-1040, focus clavier laissé à la fenêtre du dessus), parcours ajouté, contre-essai à z-9999.

### 1.7 Commandes qui ont tourné
| Commande | Résultat |
|---|---|
| `npm ci` | OK |
| `npm run banc:migrations` | Tout est vert (725 vérifications) |
| `npm run verifier` (standard), avant les corrections des relecteurs | Tout est vert : tests 1 299, lint 0 erreur, smoke, build |
| `npm run verifier` (standard), après les corrections, sur l'arbre du commit A | Tout est vert : tests 1 299, lint 0 erreur, smoke, build |
| `npm run parcours -- dictee` (build de test, IA allumée) | **13 parcours réussis** |
| Contre-essais du banc | 4 sur les quotas (107), 2 sur 109 : chacun fait échouer sa vérification |
| Contre-essais vitest | clavier (2 tests rouges), brouillon en franchise (2), retrait relu (1), refus sans accord (1) |
| Contre-essais navigateur (défaut remis, scénario relancé) | z-9999 → la demande des CGU n'est plus au premier plan ; franchise ignorée → « HT/TTC » à la relecture ; ancienne ligne du clavier → « MadameDurand,15m²decarrelage » ; bouton sans le droit → le chef de chantier voit « Dicter » ; dictée sans écran → l'écran d'accord manque ; retrait qui n'écrit rien → « le retrait est enregistré ([]) » ; CGU non demandées au « Dicter » → échec. **7 sur 7 échouent comme attendu** |
| Constat à 375 px (build de test, démo et réel simulé) | fenêtre de dictée et écran d'accord : rien ne déborde, aucun texte sous 12 px, aucune cible sous 44 px (`audit-ui/sonde-dictee-demo-375.png`, `audit-ui/sonde-accord-375.png`) |

Pas tourné ici : `npm run verifier -- --complet` jusqu'au bout (voir §5).

## 2. Textes nouveaux soumis au juriste
Relecture `juriste-btp` du 4 nov. 2026 (sans accès à Légifrance depuis cette session : L121-2, L121-5 et C. civ. 1190 cités de mémoire, à relire au texte). Appliqué mot pour mot :
- « Tout le plan Gratuit » (plan Artisan, IA allumée), dans l'offre et l'article 4 des CGV ;
- le message du plafond du jour (ci-dessus) ;
- Paramètres › Données, sous l'accord : « Si vous retirez votre accord, plus rien n'est envoyé à Anthropic tant que vous ne l'avez pas donné de nouveau : l'écran d'accord vous sera présenté avant la prochaine dictée. Vos devis, clients et chantiers restent tels quels ; ce qu'Anthropic a déjà reçu est effacé selon ses règles (Politique de confidentialité, article 4). »
- politique, art. 2 : « Avant votre première dictée, un écran vous explique ce traitement et vous demande votre accord : nous enregistrons votre compte, la date et la version du texte accepté, puis la date si vous retirez cet accord (Paramètres › Données), pour pouvoir prouver que vous avez été informé et que vous avez accepté ce traitement (intérêt légitime, art. 6.1.f). Sans cet accord, rien n'est envoyé. » ; art. 3 : « L'accord donné avant la première dictée, et son retrait éventuel, sont conservés tant que votre compte existe ».

Jugés conformes par le juriste : l'écran d'accord (son texte du 3 nov., mot pour mot), les textes Équipe, la FAQ, la fenêtre d'offre, les messages du quota et de l'accord, la TVA en franchise dans la dictée, le texte de la démo, les CGU (rien ne change avant l'allumage). CGV : **une nouvelle version suffit, sans préavis de 30 jours** (ajout d'une fonction, ni hausse de prix ni baisse de droits), sous réserve de la question 1 ci-dessous.

Textes de moi, **non relus** par le juriste (ajoutés après sa relecture) :
- fenêtre des CGU, quand c'est « Dicter » qui les demande : « Avant votre première dictée, lisez et acceptez les conditions d’utilisation de Mallettico. » et « … acceptez-les pour utiliser la dictée » ;
- message du serveur sans accord : « Avant votre première dictée, il faut accepter l’analyse par l’intelligence artificielle. Touchez « Dicter » pour lire l’écran d’accord. » et le bouton « Lire l’écran d’accord » ;
- FAQ : « La première fois, un écran vous explique ce qui est envoyé et vous demande votre accord. »

## 3. Relecture de sécurité
Relecture `gardien-securite` du 4 nov. 2026 : **aucun point critique ni haut ; 107 et 109 applicables en l'état.** Corrigé ensuite, banc relancé vert :
- M1 (insertions sans borne dans `accords_ia`) : au plus 10 accords par compte et par jour ;
- B1 (`service_role` gardait tous les droits par défaut de Supabase) : lecture seule sur `accords_ia` et `usage_ia_log`, vérifié au banc (le socle du banc donne maintenant ces droits par défaut à `service_role`, comme Supabase) ;
- B2 (minuit à Paris non testé) : vérification ajoutée ;
- B3 (`ACCORD_REQUIS` pas traité par l'app) : bouton « Lire l’écran d’accord ».
Jugé sain : impossible de créer l'accord d'un autre ou de l'antidater, déclencheur non contournable, aucune fuite par l'index unique, ordre des contrôles du serveur, z-index et focus de la fenêtre de dictée.

## 4. Décisions d'Hugo
1. **(juriste Q1)** Un abonné payant a-t-il déjà vu une dictée « sans limite » annoncée (avant D-07, version de juillet) ? Si oui, le quota réduit ses droits : e-mail 30 jours avant (CGV art. 10). Sinon, une nouvelle version suffit.
2. **(juriste Q2)** Les 100 par jour comptent aujourd'hui tous les appels, nos pannes comprises (pour borner le coût). Recommandé : garder (le message dit « analyses », pas « dictées ») ; sinon ne compter que les dictées décomptées.
3. **(juriste 1-b)** Écrire « pour l'entreprise » après les quotas mensuels (« 5 dictées par mois pour l'entreprise »), puisque le compteur est par entreprise et que ces plans comptent « vous + 1 collaborateur ». Je n'ai pas changé vos textes exacts ; à décider avant la publication (sinon une autre version des CGV).
4. **La date réelle de livraison**, la même pour `CGU_VERSION` / `CGU_VERSION_DATE` (`src/lib/cgu.js`) et `CGV_VERSION` (`src/lib/cgv.js`) : la session locale la pose dans le commit B.
5. Restent du socle (non changées ici) : valeur du coupe-circuit global (3 000 par jour, partagé entre gratuits et payants : environ 150 comptes gratuits à 20 par jour le couperaient pour tous), décompte des réponses coupées, lieu du calcul, durée du journal (`docs/cloud/ia-socle.md`, décisions).

## 5. Ce qui reste
- **`npm run verifier -- --complet`** jusqu'au bout, sur le commit exact, après fusion d'`origin/main` : par la session locale (les 5 échecs non nommés du socle restent à identifier ; `npm run parcours` seul pour lire chaque « ✗ »).
- Relire au texte (Légifrance) L121-2, L121-5 et C. civ. 1190, cités de mémoire par le juriste.
- Faire relire au juriste mes quatre textes non relus (§2).
- L'ancre `#article-4` : le lien « En savoir plus » ouvre `/confidentialite#article-4` ; la page étant rendue après le chargement, le navigateur peut ne pas descendre jusqu'à l'article 4 (non constaté).
- Le premier vrai appel à l'API (forme de la requête, latence, coût) : à constater au déploiement (§6, point 5).

## 6. Ce qui reste à la session locale et à Hugo, dans l'ordre
1. **Tout de suite** : Hugo ouvre Supabase › Edge Functions › Secrets et lit les noms seulement. Si `ANTHROPIC_API_KEY` y figure, il la retire (la v11 en production n'a aucun quota).
2. La session locale livre le commit **A** (`npm run verifier -- --complet` sur le commit exact, après fusion d'`origin/main`), puis applique **107**, puis **109** (contrôles : en-têtes des migrations).
3. Elle déploie `voice-intent` (`verify_jwt` conservé) et constate le 401 sans jeton, le 503 sans `IA_DICTEE`.
4. Hugo pose la clé `ANTHROPIC_API_KEY`, avec une **limite de dépense mensuelle** dans la Console Anthropic et l'accord de traitement (DPA) accepté ; `IA_DICTEE` sur le compte de test.
5. Constat avec le compte de test : 403 `ACCORD_REQUIS` avant l'accord, puis l'écran, puis 200 et une ligne `reussi` dans `usage_ia_log`.
6. Livraison du commit **B**, après avoir posé la date du jour dans `src/lib/cgu.js` (`CGU_VERSION`, `CGU_VERSION_DATE`) et `src/lib/cgv.js` (`CGV_VERSION`) ; puis `IA_DICTEE` à « tous ».

## 7. Risques
- **Le commit B ne passe pas la vérification tel quel** : deux tests rouges, voulus, tant que la date de livraison n'est pas posée (§6). Ne pas « corriger » ces tests : poser la date.
- **L'ordre de mise en production compte** : sans 109, la nouvelle `voice-intent` répond 503 à tous (fermé) ; sans 107, aussi. Poser la clé avant le déploiement rallumerait la v11 sans quota.
- **Tous les comptes devront réaccepter les CGU** (nouvelle version) au premier document ou à la première dictée après le commit B.
- Le plafond de 100 par jour compte aussi nos pannes : un jour de panne de l'API, un artisan Équipe très actif peut l'atteindre plus tôt (décision 2).
- Le coupe-circuit global de 3 000 par jour est partagé : un abus de comptes gratuits peut couper la dictée pour tous pendant 24 h (décision 5).

## Résumé
1. Quotas codés et prouvés au banc : Gratuit 5 par mois, Artisan 100, Équipe sans limite mensuelle avec 100 par jour et par personne (jour de Paris). Contre-essai de chaque quota.
2. Textes de l'offre exacts (offre, CGV art. 4, FAQ, messages du serveur), relus par le juriste ; « Tout le plan Gratuit, sans limite » retiré avec l'IA.
3. Écran d'accord au premier « Dicter », texte du juriste mot pour mot ; accord en base (migration 109), révocable dans Paramètres ; serveur : 403 `ACCORD_REQUIS`.
4. « Dicter » demande d'abord les CGU de l'allumage ; la fenêtre de dictée ne cache plus la demande des CGU (défaut trouvé en route).
5. CGU art. 11 (base légale et sous-traitance) partent ensemble avec la nouvelle version ; rien ne change à l'écran avant.
6. Corrections du contrôle local : TVA à 0 % en franchise (test des PDF, parcours de l'aperçu), clavier, « Tous », démo, chef de chantier, docs.
7. Gardien : rien de critique ni de haut ; ses 4 points corrigés. Banc vert (725).
8. 13 parcours de la dictée verts ; 7 contre-essais navigateur échouent comme attendu.
9. Commit B : l'allumage seul, avec deux tests rouges voulus (date de livraison à poser).
10. Ordre pour la suite : Hugo regarde les secrets maintenant ; puis A, 107, 109, `voice-intent`, la clé, le constat, B.

## Corrections de la relecture du 4 nov.

Session cloud de correction, consigne ia-allumage-v3. Tout est sur la branche **`cloud/ia-allumage-a`**, partie du commit A (`b5fc6738`). **`FONCTIONS.ia` reste à `false`** sur tous les commits de cette branche. `cloud/ia-allumage` n'a pas été touchée.

### Les commits

| Commit | Contenu |
|---|---|
| `067eea4` | Fusion d'`origin/main` dans A. `docs/decisions.md` de main gardé (D-32 à D-36). Les renvois « D-32 » de `comparaisonPlans.js:31` et `limitesDictees.js:3` deviennent « D-35 ». Ligne 4 de ce rapport : D-34 et D-35. |
| `a32a8c9` | Migration 107 (quota par abonnement, réponse coupée décomptée, verrou par abonnement…), `voice-intent` sans nouvelle tentative, garde-fou du banc contre les numéros en double, en-tête de 109, textes du juriste (fenêtre de dictée, CGU art. 11), docs. |
| `6b361e1` | Textes de la relecture juriste du 4 nov. (deuxième passage), message à part pour une réponse coupée, phrase de l'art. 4 des CGV sur ce qui compte comme une dictée, avis versé dans `docs/avis-juriste-2026-11-04-ia.md`. |
| (ce commit) | Ce rapport. |

Commits venus après B sur `cloud/ia-allumage` : il n'y en a qu'un, la fusion `a63f95f5`. Elle n'apporte que main (repris par ma propre fusion) et les renvois D-32 → D-35 (refaits à la main dans les deux fichiers de A ; les cinq autres sont dans des fichiers de B). Rien d'autre à reprendre.

### Point par point (défauts de la relecture)

1. **[important] A, decisions.md, D-32** — fait, `067eea4`. Contrôle : `grep -rn "D-32" src scripts supabase` ne trouve plus rien.
2. **[important] site.cjs dans B** — non fait ici : le fichier ne change qu'avec l'IA allumée (B). Voir « Ce que B doit changer ».
3. **[important] vérification** — voir « Ce qui a tourné ». La vérification de B n'est pas de mon ressort (B n'existe pas sur cette branche).
4. **[important] le comptable ne peut pas retirer son accord** — **non fait : décision d'Hugo** (la consigne dit « Hugo décide d'abord »). Recopié dans les décisions.
5. **[mineur] ia-socle.md** — fait, `a32a8c9` : les cinq lignes (270, 339, 355, 374, 391) sont annotées (« phrase mise sous l'interrupteur, publiée avec la `CGU_VERSION` de l'allumage ; la décision 4 n'a plus d'objet »).
6. **[mineur] etat-production, 109** — fait : 24 vérifications (compté au banc : 24 lignes « ✓ 109 : »). La ligne 107 dit aussi le nouveau compte : 57.
7. **[mineur] avis du juriste** — fait, `6b361e1` : `docs/avis-juriste-2026-11-04-ia.md`. Textes soumis : les sept listés par la relecture plus les miens (voir « Textes soumis »). **Légifrance et EUR-Lex ne répondent pas depuis cette session** (ENOTFOUND) : L121-2, L121-5, C. civ. 1190 et RGPD art. 28 **n'ont pas été relus au texte**. Reste à la session locale.
8. **[mineur] démo, « rien n'est envoyé »** — fait. Texte final du juriste (deuxième passage) : « Mode démonstration : analyse simplifiée, faite sur votre appareil, sans IA. Votre texte n’est pas envoyé à Mallettico. » Et la phrase du micro : « … votre navigateur le transforme en texte, parfois sur les serveurs de son éditeur (sur Chrome, ceux de Google). »
9. **[mineur] commentaires « éteint »** — `fonctions.js`, `vite-ia.config.mjs`, `dictee.cjs` : vrais dans A (l'IA y est éteinte), à changer dans B (voir plus bas). Le commentaire d'`App.jsx` est réécrit dès A : il renvoie aux questions 2 et 3 du juriste encore ouvertes (le juriste demande de garder une trace tant que la question 2 n'est pas tranchée).
10. **[mineur] 109 sans organization_id** — fait, `a32a8c9` : l'en-tête explique que l'accord est personnel, et que sans cette colonne 072 et 105 ne le transfèrent pas au patron.

### Juriste-btp « à corriger »

1. **« Seul ce texte nous est envoyé »** — fait, texte exact de la consigne (`DicteeModal.jsx`).
2. **CGU art. 11** — fait, puis reformulé au deuxième passage du juriste : « sauf obligation du droit de l’Union ou du droit français, dont il informe l'utilisateur avant le traitement si la loi le permet ; l'avertit immédiatement… » et « tous tenus par contrat aux mêmes obligations de protection des données que Mallettico envers l'utilisateur ; Mallettico reste pleinement responsable envers l'utilisateur de l'exécution de ces obligations par ces sous-traitants (RGPD, art. 28.4). » Sous l'interrupteur : rien ne change à l'écran avant B.
3. **Dates d'attente** — pour B (voir plus bas).

### Gardien-securite

1. **Deux migrations 107** — la renumérotation de `franchise-suite` en 114 se fait sur cette autre branche (hors de mon périmètre). Fait ici : le **garde-fou du banc** (`scripts/banc-migrations.mjs`) refuse deux migrations du même numéro. Contre-essai : un fichier `107_doublon_essai.sql` → « ✗ numéros de migration en double : 107 » (fichier retiré ensuite).
2. **Quota payant par organisation** — fait, `a32a8c9`. Colonne `payeur` (titulaire de l'abonnement retenu, NULL au gratuit) ; `abonnement_pour_usage_ia` rend le plan et le payeur (`plan_pour_usage_ia` l'enveloppe) ; aux plans payants, le décompte mensuel prend aussi toutes les lignes du même payeur. Banc : « au plan Artisan, une organisation neuve du même abonné ne rouvre pas 100 dictées ». Contre-essai : sans la clause `payeur`, la neuve repart de 1 (« ✗ … utilise: 1, autorise: true »).
3. **Coupée et délai** — `coupee` décompte (tous plans) ; `maxRetries: 0` dans `index.ts` ; commentaires de `regles.ts` et de 107 à jour. **Le délai ne décompte toujours pas : décision d'Hugo.** Banc : « une réponse coupée décompte, un délai non ». Contre-essai : sans `coupee` dans la liste, « ✗ … (3 = 3 + celle-ci) ».
4. **Coupe-circuit global partagé** — **non fait : les seuils sont à fixer par Hugo** (recopié dans les décisions).

Seconde relecture du gardien sur ces changements : contournement fermé, rien de critique, élevé ou moyen. Trois défauts faibles et un manque, **tous corrigés** :
- F1, appels simultanés sur un même abonnement depuis deux organisations : verrou par abonnement (compte → abonnement → organisation). Banc : la fonction contient bien ce verrou.
- F2, passer d'Artisan au gratuit en cours de mois rouvrait 5 dictées dans une organisation neuve : au gratuit, le décompte prend aussi ce que le compte a payé lui-même. Banc + contre-essai (« ✗ … utilise: 1 » sans la correction).
- F3, égalité de tri : l'abonnement de l'appelant d'abord, puis un ordre fixe.
- B1 : banc « ni un utilisateur ni un visiteur ne lisent l'abonnement d'un autre ».

### Juriste-btp, deuxième passage (avis versé)

Appliqué (textes exacts du juriste) :
- fenêtre de dictée, démo et micro (voir point 8) ;
- erreur de l'écran d'accord : « Votre accord n’a pas pu être enregistré, et rien n’a été envoyé. Réessayez dans un moment, ou saisissez votre devis à la main. » ;
- échec du retrait : « Le retrait de votre accord n’a pas pu être enregistré : votre accord reste en cours. Réessayez. » ;
- `ACCORD_REQUIS` (`regles.ts`) : « Votre accord pour l’analyse par l’intelligence artificielle n’est pas enregistré : il a été retiré, ou le texte de l’écran d’accord a changé. Rien n’a été transmis à Anthropic. Relisez l’écran d’accord, ou saisissez votre devis à la main. » ;
- réponse coupée, nouveau message (elle décompte, on n'invite plus à refaire la même dictée) : « Votre dictée est trop longue pour être analysée en une fois. Elle compte dans vos dictées du mois. Coupez-la en deux, ou saisissez votre devis à la main. » Test + contre-essai (« FAIL … refus du modèle ou réponse illisible » si l'on remet l'ancien message) ;
- FAQ : « Avant votre première dictée, et de nouveau si vous retirez votre accord, un écran… » et « Une dictée trop longue ou incompréhensible compte quand même ; une panne de notre côté ne compte pas. » ;
- CGV art. 4, sous l'interrupteur (`CGV_ARTICLE_4_DICTEES`) : « Dictées : une dictée compte dès qu’elle est analysée, y compris quand l’analyse échoue à cause de la dictée elle-même (trop longue, incompréhensible ou refusée par l’intelligence artificielle). Une panne de Mallettico ou de son prestataire ne compte pas. Le compteur repart à zéro le 1er de chaque mois, heure de Paris. » Test : présent avec l'IA, absent sans. **À revoir si Hugo décide de décompter le délai.**

Non appliqué : le choix du texte « pour l'entreprise » / « par abonnement » (décision d'Hugo, voir plus bas) ; la remarque hors droit sur la fenêtre d'offre (`recommendedPlan: 'artisan'` proposé à un abonné Artisan à sa 101e dictée) : signalée, non corrigée (hors consigne).

### Textes nouveaux soumis au juriste

Tous ceux ci-dessus ont été relus par lui (deuxième passage). Restent à relire au texte officiel par la session locale : L121-2, L121-5, C. civ. 1190, RGPD art. 28.3 a), 28.3 dernier alinéa et 28.4. Le texte de Paramètres « Vous avez accepté… le … » est conforme **si** la date affichée est celle de l'accord en cours (à constater par la session locale).

### Ce qui a tourné

- `npm ci` ; `npm run banc:migrations` : **vert, 732 vérifications** (57 pour 107, 24 pour 109), avec les quatre contre-essais ci-dessus.
- `npm run verifier` (standard) sur `067eea4` + modifications : vert (1 365 tests, lint 0 erreur, smoke, build).
- `npx vitest run` des tests légaux et de `voice-intent` après les textes du juriste : 69 et 38 verts.
- `npm run verifier -- --complet` sur `6b361e1`, arbre propre : **tout vert** : tests 1 365, lint 0 erreur, smoke, build, banc, parcours navigateur (2 567 s), audit d'interface (386 s). Le dernier commit (ce rapport) ne touche que `docs/`.
- Pas de `/sonde` à 375 px dans le build IA : la consigne la place chez la session locale sur B.

### Ce que B doit changer (la session locale refait B)

Partir de A tel que livré, puis l'équivalent de `99b9b370` :
1. `src/lib/fonctions.js` : `ia: true` ; l'en-tête (« Éteint tant que la fonction n'est pas prête ») devient : allumé le JJ/MM/AAAA (D-35).
2. `src/components/legal/TexteCgu.jsx` : retirer l'enveloppe `FONCTIONS.ia` de l'art. 11 (base légale et sous-traitance). **Conflit attendu au cherry-pick** : les deux paragraphes ont changé dans A (textes du juriste). Garder les textes de A, sans l'enveloppe.
3. `scripts/lib/vite-ia.config.mjs` (l. 2-4 et l. 17), `scripts/parcours/dictee.cjs` (l. 1-2 et l. 151) : commentaires « éteint » → allumé ; « D-32 » → « D-35 ».
4. Tests : `src/components/landing/__tests__/comparaisonPlans.test.js:20`, `src/components/legal/__tests__/cgvVersion.test.jsx:82` (conflit possible avec l'import ajouté dans A), `src/stores/__tests__/plansReels.test.js:17` : « D-32 » → « D-35 », plus les attentes de B.
5. `scripts/parcours/site.cjs` : les limites attendues (l. 61, contrôles l. 1350 et 1440) tirées de `LIMITES_AFFICHEES` et `valeurDeLimite` de `comparaisonPlans.js` (déjà chargé l. 1256) au lieu de la copie locale. Puis `npm run parcours -- site` sur le build de B.
6. Dates, le jour de la livraison, la même partout : `src/lib/cgu.js:23` `CGU_VERSION = FONCTIONS.ia ? 'AAAA-MM-JJ' : '2026-10-28'` ; `src/lib/cgu.js:26` `CGU_VERSION_DATE = FONCTIONS.ia ? 'JJ mois AAAA' : '28 octobre 2026'` ; `src/lib/cgv.js:22` `CGV_VERSION = FONCTIONS.ia ? 'AAAA-MM-JJ' : '2026-10-24'`. La politique (`LegalPages.jsx`) suit `CGU_VERSION_DATE`. Ne pas toucher `ACCORD_IA_VERSION`. `cguIa.test.js` et `cgvVersion.test.jsx` sont rouges tant que ce n'est pas fait.
7. Si Hugo tranche les questions 2 ou 3 du juriste, ou le décompte du délai : poser les textes AVANT B (sinon une version de plus des CGV). Le commentaire d'`App.jsx` (FAQ) est à mettre à jour avec la décision.
8. `docs/decisions.md` : D-07 levée.

### Décisions d'Hugo (non appliquées)

- **Tout de suite** : Supabase › Edge Functions › Secrets, regarder les noms seulement. Si `ANTHROPIC_API_KEY` y figure, la retirer (la v11 en production n'a aucun quota).
- **Le comptable** peut dicter mais ne peut pas retirer son accord (Paramètres fermés). Choisir : retrait dans la fenêtre de dictée, onglet Données ouvert au comptable, ou dictée réservée au patron et à l'admin (alors aligner `SANS_DROIT` de 107). Puis un parcours `dictee` pour ce rôle, avec contre-essai.
- **Le délai dépassé** : le décompter ou non (aujourd'hui non). Il conditionne la phrase de l'art. 4 des CGV.
- **Question 1 du juriste** : un abonné payant a-t-il vu la dictée annoncée « sans limite » (juillet, avant D-07) ? Si oui, e-mail 30 jours avant (CGV art. 10).
- **Question 2** : le plafond du jour compte aussi nos pannes. Garder (et écrire « 100 analyses par jour et par personne, échecs compris ») ou ne compter que les dictées décomptées.
- **Question 3 (ex-1-b)** : dire qui partage le quota. Fait nouveau : aux plans payants le compteur suit l'**abonnement**, pas l'entreprise ; « pour l'entreprise » n'est plus exact. Texte proposé par le juriste : « 100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises » et « 5 dictées par mois, partagées entre les utilisateurs de l’entreprise » (détail dans l'avis, C.2).
- **Coupe-circuit global** (3 000 par jour, partagé) : deux compteurs gratuits / payants et leurs seuils, plafond quotidien par abonnement, alerte à l'exploitant (gardien, point 4).
- Restées du socle : lieu du calcul, durée du journal.
- **Date réelle** de livraison de B.
- À la pose de la clé : limite de dépense mensuelle (Console Anthropic), DPA accepté, liste DPF et liste des sous-traitants d'Anthropic.

### Risques

- Le cherry-pick de B bute sur `TexteCgu.jsx` (et peut-être `cgvVersion.test.jsx`) : à résoudre en gardant les textes de A.
- Les citations juridiques de l'avis du 4 nov. ne sont pas lues au texte (sites inaccessibles d'ici).
- 107 a beaucoup changé depuis la relecture locale : à relire par la session locale avant de l'appliquer (le gardien l'a relue ici, au banc).
- La renumérotation de `franchise-suite` (114) reste à faire sur sa branche ; le banc refusera la fusion tant qu'il y a deux 107.

### Résumé

1. Branche `cloud/ia-allumage-a` : A + main fusionné, IA éteinte partout, D-32 → D-35.
2. Quota payant compté par abonnement : une organisation neuve ne rouvre plus 100 dictées (banc + contre-essai).
3. Réponse coupée décomptée, plus de seconde tentative du SDK ; le délai reste à Hugo.
4. Seconde relecture du gardien : 3 défauts faibles et 1 manque, corrigés et prouvés au banc (732 vertes).
5. Le banc refuse deux migrations du même numéro.
6. Textes du juriste posés (dictée, accord, retrait, ACCORD_REQUIS, coupée, FAQ, CGV art. 4, CGU art. 11) ; avis versé dans docs/.
7. Textes officiels non relus (Légifrance et EUR-Lex inaccessibles) : à faire par la session locale.
8. Le comptable, le délai, le coupe-circuit et les textes « pour l'entreprise » : décisions d'Hugo.
9. Vérification complète : verte (niveau complet) sur `6b361e1`, le dernier commit de code, arbre propre.
10. B : liste exacte ci-dessus (fichiers, tests, site.cjs, dates de cgu.js et cgv.js).
