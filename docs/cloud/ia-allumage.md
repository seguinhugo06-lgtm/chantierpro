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

## Décisions d'Hugo du 5 nov. (lot 4)

Session locale de correction, branche **`corr4-ia`**, partie d'`origin/main` (`868b924c`, où le commit A de l'IA est déjà livré, l'IA éteinte). Elle applique les décisions d'Hugo du 5 nov. 2026 (« OK pour tout », numérotées **D-37**), sans les rouvrir. **`FONCTIONS.ia` reste à `false`** ; le commit B n'est pas fait (la session locale le fera après la pose de la clé). Rien n'est poussé, rien n'est appliqué en production, aucun secret ni `CLAUDE.md` ni `.claude/` touchés ; la migration 107, appliquée nulle part, est modifiée en place.

| Commit | Contenu |
|---|---|
| `c9ba9019` | migration 107 (rôles, coupe-circuit à deux compteurs) et son banc ; `permissions.js`, `droitsDictee.js` et leurs tests |
| `ac7ddb84` | textes de quota (offre, CGV, FAQ, messages du serveur, page des tarifs), `regles.ts`, FAQ selon le droit de dicter, parcours de la dictée |
| `78855333` | `docs/etat-production.md` (lignes 107 et `voice-intent`) |
| (ce commit) | ce rapport |

### Contrôle des corrections v3

Non refait ici : la fiche du lot dit qu'il a été fait. Aucun point v3 n'a été rouvert.

### Décisions appliquées

#### 1. Quota par abonnement, et les textes qui le disent

Le compteur n'a pas bougé (colonne `payeur`, `107_quota_ia.sql`). Les textes de l'avis de juriste-btp (C.2), mot pour mot :

| Texte | Où |
|---|---|
| « 5 dictées par mois, partagées entre les utilisateurs de l’entreprise » | `src/stores/subscriptionStore.js:64` (offre Gratuit) ; `src/lib/cgv.js:74` (CGV, article 4) ; `src/App.jsx:2527` (FAQ) ; `src/lib/limitesDictees.js:21` (page des tarifs, sans le mot « dictées » qui est le titre de la ligne) |
| « 100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises » | `subscriptionStore.js:109` (offre Artisan) et `:261` (sous-titre de la fenêtre d'offre) ; `cgv.js:79` ; `supabase/functions/voice-intent/regles.ts:57` (message du serveur au quota Gratuit atteint) ; `App.jsx:2527` ; `limitesDictees.js:22` |
| « au plan Gratuit, vos dictées dans vos autres entreprises au plan Gratuit comptent aussi. » | `cgv.js:92` (paragraphe des dictées de l'article 4) |

- **Tous ces textes sont « avec IA »** : ils suivent l'interrupteur comme ceux qui existaient (libellés de `PLANS` retirés quand l'IA est éteinte, article 4 « avec IA », FAQ, ligne des tarifs, serveur fermé sans `IA_DICTEE`). Rien ne change à l'écran tant qu'elle est éteinte : constaté par le parcours « les CGV (IA allumée)… ; IA éteinte, rien de cela » (build livré), par `cgvVersion.test.jsx` (texte sans IA inchangé) et par le parcours `site` (voir plus bas).
- **La page des tarifs** : `valeurDeLimite(cle, valeur, planId)` prend maintenant le plan (`comparaisonPlans.js:58`, appelé avec `plan.id` à la l. 83), parce que le partage dépend du plan et non du nombre. Sans plan, la ligne ne dit rien du partage (rien d'inventé).
- **Commentaires C.3 alignés** (« par organisation » → par abonnement aux plans payants, par entreprise et par compte au plan Gratuit) : `107_quota_ia.sql` (titre, conception, `COMMENT ON TABLE`), `regles.ts` (en-tête, `LIMITES`), `voice-intent/index.ts`, `src/lib/dicteeQuota.js`, `DicteeModal.jsx`.
- **Tests** : `cgvVersion.test.jsx` (le texte figé « avec IA » est celui que donne `PLANS`, plus la phrase des échecs ; textes exacts ; phrase des autres entreprises mot pour mot ; rien sans IA) ; `limitesDictees.test.js` (les trois valeurs ; la valeur de chaque plan est son libellé d'offre sans le mot « dictées » : une seule formule pour l'app et le site) ; `voiceIntentServeur.test.js` (messages exacts du quota ; le serveur et l'app disent la même chose, lu dans `LIBELLES_COMPLETS`). Le test « `LIMITES` = `PLANS[plan].limits.dictees` » est resté vert (les nombres ne changent pas). Parcours sur le build IA : FAQ, CGV, page des tarifs à 375 et 1 440 px.
- **Contre-essais** : libellé Artisan de `PLANS` remis à « 100 dictées par mois » → **3 tests rouges** (CGV, valeur des tarifs, serveur/app) ; phrase des autres entreprises retirée de `CGV_ARTICLE_4_DICTEES` → **1 test rouge**.

#### 2. Plafond du jour : toutes les analyses comptent, échecs compris

Le décompte n'a pas bougé (chaque appel compte, même en échec : `107_quota_ia.sql`, plafond du jour). Textes :

- offre Équipe « Dictées sans limite mensuelle (100 analyses par jour et par personne au plus) » : `subscriptionStore.js:149` (offre) et `:261` (sous-titre) ; `cgv.js:84` ; `regles.ts:58` (message du quota Artisan atteint) ; `App.jsx:2527` (FAQ) ; `limitesDictees.js:14` (page des tarifs : « Sans limite mensuelle (100 analyses par jour et par personne au plus) ») ;
- **CGV** : « 100 analyses par jour et par personne, échecs compris. » ajouté à la description de l'offre Équipe (`cgv.js:84`, sous l'interrupteur) ;
- le message du serveur pour le plafond du jour **ne change pas** (`regles.ts` `plafondJour`, il dit déjà « 100 analyses par jour et par personne »).
- **Tests** : `cgvVersion.test.jsx` (la description Équipe se termine par la phrase ; le garde-fou la compare à `PLANS` plus la phrase, et voit la différence sans elle) ; `limitesDictees.test.js` ; `voiceIntentServeur.test.js` ; parcours « les CGV (IA allumée) ».
- **Contre-essais** : phrase « échecs compris » retirée → **2 tests rouges** ; `DICTEES_SANS_LIMITE` remis à « (100 par jour… » → **2 tests rouges**.

#### 3. Dictée réservée au propriétaire et à l'administrateur

- **App** : `src/lib/permissions.js:38`, `'ia-devis'` → `comptable: false`. « Dicter » n'a qu'un point d'entrée, le bouton de l'en-tête (`App.jsx:1807`), puis l'écran d'accord (`:2127`) et la fenêtre (`:2144`) : tous trois derrière `FONCTIONS.ia && dictee.peutDicter` (`droitsDictee.js:13`, qui lit `canAccess('ia-devis')`). Les autres droits du comptable ne changent pas : `devis` (page `full`, créer, modifier, envoyer, voir), clients, finances ; « Saisir mon devis à la main » lui reste (`peutSaisirAMain`).
- **Serveur** : `107_quota_ia.sql:223`, `v_role NOT IN ('owner', 'admin')` → `SANS_DROIT`, avant tout verrou et tout décompte (commentaire d'en-tête mis à jour, l. 33-39). `voice-intent` ne garde **aucune liste de rôles** (la base fait foi) : rien à aligner ; son message `sansDroit` (`regles.ts:67`) est réécrit, voir « À relire par le juriste ».
- **Tests** :
  - banc `scripts/banc/107.mjs:121-156` : comptable, chef de chantier, ouvrier et lecture seule reçoivent `SANS_DROIT` et rien n'est compté ; le refus précède le calcul du quota (dans une entreprise gratuite au quota épuisé, le comptable reçoit `SANS_DROIT` et son patron « quota ») ; l'administrateur et le propriétaire dictent (contre-épreuve) ;
  - vitest : `permissions.test.js` (page `ia-devis` : owner et admin seulement ; le comptable garde tous ses droits sur les devis), `droitsDictee.test.js` (le comptable : `peutDicter: false`, `peutSaisirAMain: true`, `voitPrix: true` ; **et l'app et la migration listent les mêmes rôles**, lus dans le fichier SQL : ce désaccord est ce qui laissait dicter sans pouvoir retirer son accord) ; `voiceIntentServeur.test.js` (403 `SANS_DROIT`, sans appel à l'API) ;
  - parcours `dictée : le propriétaire et l’administrateur ont « Dicter » ; le comptable et le chef de chantier n’ont ni bouton ni fenêtre, et le comptable crée toujours un devis` : le faux Supabase le permettait (`creerBase(…, { role })`), donc fait, avec contre-épreuves (le propriétaire et l'administrateur ont le bouton ; le chef de chantier ne crée pas de devis, la vérification distingue bien les rôles).
- **Contre-essais** : comptable remis dans la liste de 107 → **3 vérifications du banc rouges** + le test « mêmes rôles » ; `comptable: 'full'` remis dans `permissions.js` → **3 tests rouges** + le parcours (« comptable : ni bouton « Dicter » ni fenêtre ({"bouton":true…}) ») ; ancien message `sansDroit` remis → 1 test rouge.
- **Textes (mentions de rôle)** : cherchées dans la FAQ, les CGU (art. 7 et 11), la politique de confidentialité (art. 2, 3, 4), l'écran d'accord, Paramètres › Données et les descriptions de rôles (`getRoleDescription`). **Aucune ne promet la dictée à un rôle.** La seule qui le faisait sans le dire était la FAQ (« Touchez « Dicter »… »), montrée à tous les rôles : elle ne l'est plus qu'à ceux qui peuvent dicter (`HelpModal` reçoit `peutDicter`, `App.jsx:2116`, `:2380`, `:2527`). Parcours « la FAQ n’explique la dictée qu’à ceux qui peuvent dicter… » ; contre-essai (condition retirée) → le parcours échoue (« comptable : la FAQ ne lui explique pas une dictée qu’il n’a pas »).

#### 4. Coupe-circuit global séparé

- **Où** : `107_quota_ia.sql:265-270`, deux compteurs indépendants sur 24 h glissantes, lus dans la colonne `plan` de `usage_ia_log` : **1 000 analyses pour l'ensemble des comptes au plan Gratuit, 3 000 pour l'ensemble des plans payants** ; l'appel n'est regardé que contre le compteur de son plan ; le motif reste `global`. Une ligne sans plan (insérée à la main) compte avec les payants. Aucun droit ni verrou changé.
- **Commentaires qui disent les deux seuils** : en-tête de 107 (l. 50-54) et commentaire du code (l. 260-264), `regles.ts` (l. 21-24) et `docs/etat-production.md` (lignes 107 et `voice-intent`). `regles.ts:224` : le journal de la fonction dit quel compteur a coupé (« plan gratuit : 1 000 » ou « plans payants : 3 000 ») ; la réponse à l'artisan est la même (503 « Dictée indisponible… »).
- **Requête de contrôle après application** ajoutée à l'en-tête de 107 (l. 76-78) : `… ~ 'v_role NOT IN \(''owner'', ''admin''\)'` et `… ~ 'THEN 1000 ELSE 3000'` doivent rendre `t, t` ; le banc la rejoue sur le vrai corps de la fonction.
- **Banc** (`scripts/banc/107.mjs:280-336`) : 1 000 gratuites vieilles de 25 h ne coupent rien ; à 999 gratuites la 1 000e passe et la suivante est coupée (`global`, rien de compté), pendant que **l'appel payant passe, même avec 2 500 analyses payantes en plus** (3 500 au total) ; à 2 999 payantes (Artisan et Équipe confondus) la 3 000e passe, la suivante est coupée, et **l'appel gratuit passe** ; 3 000 lignes sans plan coupent les payants, pas les gratuits.
- **Contre-essais** : l'ancien compteur unique de 3 000 remis → **5 vérifications rouges** (à 1 000 gratuites l'appel gratuit n'est plus coupé ; avec 1 000 gratuites et 2 500 payantes l'appel payant est coupé ; l'appel gratuit est coupé par l'abus des payants ; les lignes sans plan ; la requête de contrôle) ; deux seuils mais sans distinguer le plan → **3 vérifications rouges** (dont « avec 1 000 gratuites et 2 500 payantes, l'appel payant passe »).
- Vitest : `voiceIntentServeur.test.js` (le journal nomme le bon compteur ; la réponse est la même) ; contre-essai (ancien journal) → test rouge.

#### 5. Pas d'e-mail aux abonnés

Rien à coder, rien fait : la nouvelle version des CGV suffit. Le délai dépassé ne compte toujours pas : les commentaires qui disaient « décision d'Hugo attendue » le disent décidé (`107_quota_ia.sql` en-tête, `regles.ts` en-tête, `cgv.js`).

### À relire par le juriste

Textes qui ne sont ni de l'avis du 4 nov. ni de la fiche (ma main) :

1. **« Votre rôle ne permet pas d’utiliser la dictée. »** (`regles.ts:67`, message du serveur pour `SANS_DROIT`). Il remplace « Votre rôle ne permet pas de créer un devis. », devenu faux pour le comptable (il peut créer un devis). Vu seulement par un appel direct ou une app périmée : l'app n'offre plus « Dicter » à ces rôles.
2. **Place de la phrase des autres entreprises gratuites** (`cgv.js:92`). Le texte est celui de l'avis, mot pour mot, y compris la minuscule : je l'ai relié à la phrase d'avant du paragraphe des dictées par un point-virgule (« …le 1er de chaque mois, heure de Paris ; au plan Gratuit, vos dictées dans vos autres entreprises au plan Gratuit comptent aussi. »). L'avis dit « dans les CGV » sans dire où : à confirmer.
3. **Description Équipe dans les CGV** (`cgv.js:84`) : « … Dictées sans limite mensuelle (100 analyses par jour et par personne au plus). 100 analyses par jour et par personne, échecs compris. » Les deux textes sont ceux d'Hugo, mis bout à bout ; la répétition de « 100 analyses par jour et par personne » se lit un peu lourdement. À alléger si le juriste le préfère.
4. **Valeurs de la page des tarifs** (`limitesDictees.js:21-22`) : « 5 par mois, partagées entre les utilisateurs de l’entreprise » et « 100 par mois par abonnement, partagées entre ses utilisateurs et ses entreprises » : les textes de C.2 sans le mot « dictées », titre de la ligne (un test les lie aux libellés d'offre).

Toujours à relire au texte officiel, comme avant (Légifrance et EUR-Lex inaccessibles aux sessions cloud) : L121-2, L121-5, C. civ. 1190, RGPD art. 28.3 a), 28.3 dernier alinéa et 28.4.

### Ce qui n'a pas pu être fait, ou reste à la session locale

- **D-37 n'est pas consignée dans `docs/decisions.md`** : tous les lots y ajoutent leur ligne et se heurteraient à la fusion. Ligne proposée : « | D-37 | 05/11/2026 | Dictée IA, décisions d'Hugo (« OK pour tout ») : quota dit « par abonnement, partagées entre ses utilisateurs et ses entreprises » aux plans payants et « partagées entre les utilisateurs de l’entreprise » au plan Gratuit ; plafond du jour dit « 100 analyses par jour et par personne », échecs compris (offre Équipe et CGV) ; dictée réservée au propriétaire et à l'administrateur (le comptable la perd) ; coupe-circuit global en deux compteurs (1 000 analyses par 24 h pour l'ensemble des comptes gratuits, 3 000 pour l'ensemble des plans payants) ; pas d'e-mail aux abonnés, la nouvelle version des CGV suffit ; le délai dépassé ne compte toujours pas | Avis de juriste-btp du 4 nov. 2026 (`docs/avis-juriste-2026-11-04-ia.md`, C.1 et C.2) ; le comptable ne peut pas retirer son accord (Paramètres lui est fermé) ; un abus de comptes gratuits ne doit pas couper les payants | décidé |».
- **`docs/etat-production.md`** : seules les lignes 107 et `voice-intent` ont changé de contenu. Leur statut (« non livrées », « à appliquer ») et la ligne « dernière mise à jour » sont ceux d'avant la livraison du commit A : à refaire par la session locale.
- **Commit B, un point de plus** : `scripts/parcours/site.cjs`, point 5 de « Ce que B doit changer ». Quand ses limites attendues viendront de `valeurDeLimite` de `comparaisonPlans.js`, passer le plan en troisième argument (l. 1241 : `valeurDeLimite(cle, plan.limits[cle] ?? -1, plan.id)` ; l. 1337 : `valeurDeLimite(cle, PLANS[id].limits[cle], id)`). Sans cela le parcours attendrait « 5 par mois » au lieu de « 5 par mois, partagées entre les utilisateurs de l’entreprise ». Les parcours `dictee` ci-dessus le font déjà (build IA). Les numéros de ligne de la liste « Ce que B doit changer » (`cgvVersion.test.jsx`, `cgv.js`, `subscriptionStore.js`) ont bougé avec ce lot : se fier aux noms.
- **Cosmétique, au téléphone** : dans la liste « Comparer les plans en détail » à 375 px, les trois valeurs de la ligne « Dictées » sont côte à côte et la valeur Artisan occupe huit lignes étroites. Lisible, rien ne déborde (parcours, mesuré), mais dense. À 1 440 px : deux ou trois lignes. Mise en page non touchée (hors lot).
- **Application en production** : 107 (modifiée), 109, puis redéploiement de `voice-intent` (`regles.ts` change : textes, message `SANS_DROIT`, journal du coupe-circuit) : ordre inchangé (§ 6). Après 107, la requête de contrôle de son en-tête doit rendre `t, t`.
- **Pour le gardien de sécurité**, ce qui a changé dans 107 : (a) la liste de rôles (l. 223) ; (b) le coupe-circuit (l. 265-270 : un compteur par plan, sans verrou global comme avant, donc un léger dépassement possible sous appels simultanés) ; (c) des commentaires et le `COMMENT ON TABLE` ; (d) la requête de contrôle de l'en-tête. Aucun `GRANT`/`REVOKE`, aucune table ni colonne, aucun verrou changé.
- **Restent ouverts, non décidés, non faits** (gardien du 4 nov., point 4, et `docs/cloud/ia-socle.md`) : un plafond quotidien par abonnement, une alerte à l'exploitant quand un coupe-circuit se déclenche (aujourd'hui seul le journal de la fonction le dit), le lieu du calcul, la durée du journal.
- **Textes historiques non réécrits** : `docs/cloud/ia-socle.md` (l. 329 et 361) décrit encore la règle « owner, admin, comptable » et l'ancien message du refus ; la section « Décisions d'Hugo (non appliquées) » plus haut dans ce rapport (« Corrections de la relecture du 4 nov. ») liste comme ouvertes des décisions que ce lot applique. Ce qui est dit ici fait foi.
- **Vérification complète** (`--complet`, audit d'interface) : non lancée ici, comme le dit la règle du lot.

### Commandes lancées et résultats

| Commande | Résultat |
|---|---|
| `git fetch origin && git checkout -B corr4-ia origin/main`, `npm ci` | OK, départ `868b924c` |
| `npm run banc:migrations` avant toute modification | Tout est vert (767 vérifications), dont 57 pour 107 |
| `npm run banc:migrations` sur `78855333` | **Tout est vert (776 vérifications)**, dont **66** pour 107 |
| `npx vitest run src/lib/__tests__/voiceIntentServeur.test.js` (les tests de `voice-intent` : le fichier importe `regles.ts` et `consignes.ts`) | 41 tests verts |
| `npm run verifier -- --rapide` (pendant le travail) | vert |
| `npm run verifier` (standard) sur `78855333`, arbre propre | **Tout est vert** : tests 1 423 (13 de plus qu'avant le lot), lint 0 erreur, smoke, build |
| `npm run build` puis `npm run parcours -- dictee` (build IA, `scripts/lib/vite-ia.config.mjs`), sur `78855333` | 16 parcours (13 d'avant + 3 nouveaux : FAQ, CGV, page des tarifs) : **15 réussis, 1 expiré** (« Network.setCacheDisabled timed out » : le navigateur de test n'a pas répondu, machine très chargée, charge moyenne de 9 à 13) ; relancé seul : réussi. Le premier lancement avait connu le même cas sur un autre parcours (« API indisponible… »), réussi seul lui aussi : aucun des deux n'est touché par ce lot |
| `npm run parcours -- site` (build livré, IA éteinte), sur `78855333` | **12 parcours réussis** (dont « tarifs et construit en public », 226 vérifications) : la page des tarifs sans IA n'a pas bougé |
| 11 contre-essais (défaut remis, le test ou la vérification devient rouge, fichier restauré, somme de contrôle identique) | tous rouges comme attendu : chacun est dit sous sa décision |
| Constat de la page des tarifs avec l'IA allumée, à 375 et 1 440 px (captures non versionnées) | valeurs lisibles, rien ne déborde ; voir « Cosmétique, au téléphone » |

Non lancé ici : `npm run verifier -- --complet` (banc, parcours complets, audit d'interface), qui revient à la session locale sur l'assemblage.

### Corrections du juriste (5 nov.)

Le juriste a relu l'avis au texte officiel le 5 nov. 2026 (Légifrance, EUR-Lex) : `audit-ui/cloud/v4/avis-juriste-lot4.md` du worktree de la session locale, hors dépôt. Ses points 2 et 3 donnent les textes exacts, recopiés ici **par programme** (aucune retape) puis verrouillés par des tests mot pour mot. `corr4-ia` partait de `f47cc71b`, déjà fusionnée dans `main` : la fusion d'`origin/main` (`e238170c`, lot 4 des métiers) s'est faite sans conflit, en avance rapide. **`FONCTIONS.ia` reste à `false`**, pas de commit B, rien de poussé, rien d'appliqué en production.

| Ligne de l'avis | État | Où | Preuve |
|---|---|---|---|
| 1. Adresse de C. civ. 1190 | fait | `docs/avis-juriste-2026-11-04-ia.md`, section A (adresse `…032041260`, « lu au texte le 05/11/2026 », précision L121-3) | documentation |
| 2. « règlement (UE) 2016/679 » | fait | `TexteCgu.jsx` (base légale, art. 11, sous l'interrupteur) | `cguArticle11.test.jsx` ; parcours des CGU avec l'IA |
| 3. Paragraphe du sous-traitant (RGPD 28.3 complet, 33.2) | fait | `TexteCgu.jsx` (art. 11, sous `FONCTIONS.ia`) | idem |
| 4. Paragraphe des sous-traitants ultérieurs (28.2, 28.4) | fait | `TexteCgu.jsx` (art. 11, sous `FONCTIONS.ia`) | idem |
| 5 à 7. Libellés des offres, `(100 analyses par jour…)` | déjà faits au lot précédent ; relus : identiques à l'avis | `subscriptionStore.js:64, 109, 149`, `cgv.js` (descriptions), `limitesDictees.js:14` | tests existants |
| 8. Sous-titre de la fenêtre d'offre | déjà identique à l'avis | `subscriptionStore.js:261` | idem |
| 9. `SUITE_QUOTA` | déjà identique à l'avis | `regles.ts:59-60` | `voiceIntentServeur.test.js` |
| 10. `plafondJour(reservation.parJour ?? 100)` pour tous les plans | fait : le Gratuit reçoit « maximum de 20 analyses par jour et par personne… réessayez demain » au lieu de « Réessayez un peu plus tard » (faux : il faut attendre minuit) | `regles.ts`, branche `plafond_jour` | `voiceIntentServeur.test.js` (nouveau test, 20 au Gratuit) ; ancien comportement remis → rouge |
| 11. Cellules de la page des tarifs | fait : « 5 par mois, par entreprise » et « 100 par mois, par abonnement » | `limitesDictees.js:21-22` | `limitesDictees.test.js` ; parcours « page des tarifs (IA allumée) » à 375 et 1 440 px |
| 12. `CGV_ARTICLE_4_DICTEES` | fait : texte complet du juriste | `cgv.js:99` | `cgvVersion.test.jsx` (égalité mot pour mot et phrases clés) ; parcours « les CGV (IA allumée) » |
| 13. FAQ | fait : phrases des quotas, du rôle et des pannes | `App.jsx` (entrée « Comment fonctionne la dictée ? ») | parcours « la FAQ… » |
| 14. 107 et `permissions.js` limités à `owner` et `admin` | déjà fait au lot précédent | `107_quota_ia.sql:228`, `permissions.js:38` | banc, vitest, parcours |
| 15. Réservation non close : compter `reserve` seulement si `created_at > now() - interval '10 minutes'` | fait | `107_quota_ia.sql`, décompte du mois (l. 287, clause `statut = 'reserve' AND created_at > now() - interval '10 minutes'`) | banc : 4 vérifications de plus (70 pour 107), contre-essai |
| 16. Commentaires « par organisation » | fait : « par organisation, et par abonnement aux plans payants », avec la règle exacte (paiements compris) | `107_quota_ia.sql` (en-tête, `COMMENT ON TABLE`), `regles.ts`, `index.ts`, `dicteeQuota.js`, `DicteeModal.jsx` | — |

- **CGU, article 11** : les deux paragraphes du juriste (28.3 a) à h) et dernier alinéa, 28.2, 28.4, 33.2) remplacent ceux de la session précédente, qui élargissaient l'exception de 28.3 a) (« si la loi le permet »), disaient « audits raisonnables » et « sans délai ». Ils restent **sous `FONCTIONS.ia`** : rien ne change à l'écran. Le nouveau test `cguArticle11.test.jsx` force l'IA allumée dans son seul fichier (`vi.mock`) et compare le texte rendu aux deux paragraphes ; `cguIa.test.js` vérifie l'ancien texte, IA éteinte ; le parcours des CGU le vérifie dans les deux builds. **Contre-essai** : « dans les meilleurs délais après en avoir pris connaissance » remplacé par « sans délai » et « règlement (UE) » par « Règlement UE » → 2 tests rouges.
- **Textes des quotas** : tous recopiés de l'avis par programme. **Contre-essais** : (a) la phrase sur les pannes du paragraphe des CGV raccourcie, (b) le Gratuit de nouveau envoyé au message de la minute, (c) la cellule du Gratuit remise à « partagées entre les utilisateurs de l’entreprise » → 4 tests rouges (voir « Commandes »). La phrase de D-37 « 100 analyses par jour et par personne, échecs compris. », que j'avais ajoutée à la description de l'offre Équipe, est **retirée** : le juriste la remplace par le paragraphe des dictées, qui dit « échecs compris, même dus à une panne » (et « une panne ne compte pas dans les dictées du mois »). Les textes de l'offre (libellés, sous-titre, `SUITE_QUOTA`) n'ont pas bougé : ils étaient déjà ceux de l'avis.
- **Réservation non close (107)** : une ligne `reserve` jamais close (`terminer` en échec, fonction arrêtée après la réservation) ne compte plus au mois au bout de 10 minutes ; une dictée réussie compte tout le mois ; le plafond de la minute, celui du jour et les coupe-circuit comptent toutes les lignes (c'est ce que dit le paragraphe des CGV : « échecs compris, même dus à une panne »). Banc (`scripts/banc/107.mjs`, bloc « Une réservation jamais close… ») : cinq réservations en cours comptent et la 6e est refusée ; une réservation de plus de 11 minutes libère une place ; une dictée réussie vieille de 11 minutes compte toujours ; 20 réservations non closes de plus de 11 minutes frappent encore le plafond du jour (20 au Gratuit ; contrôle sauté dans les onze minutes qui suivent minuit, heure de Paris). **Contre-essai** : l'ancienne clause (`statut IN ('reserve', 'reussi')`) remise → « une réservation jamais close, vieille de plus de 10 minutes, ne compte plus au mois » **rouge**. L'assistant `reserver` du banc date maintenant la réservation d'il y a 5 minutes (elle reste « en cours » et compte) au lieu d'avant-hier, et les fenêtres de 24 h sont remises à zéro avant les blocs Équipe et coupe-circuit. La requête de contrôle de l'en-tête de 107 vérifie aussi cette clause : elle doit rendre `t, t, t`. **À relire par `gardien-securite`** (consigne du juriste) : une seule clause ajoutée au décompte du mois ; une réservation légitime dure moins de 20 s (délai de l'API : 15 s), donc 10 minutes ne coupent aucune dictée en cours.
- **Ce qui n'est pas de ma main** : tous les textes affichés viennent de l'avis. Reste de ma main, à relire : « Votre rôle ne permet pas d’utiliser la dictée. » (`regles.ts`, message `SANS_DROIT`, déjà signalé plus haut). Les trois autres points « à relire par le juriste » de la section précédente (place de la phrase des autres entreprises, description Équipe, valeurs de la page des tarifs) sont **remplacés** par ses propres textes.
- **Pas fait, volontairement** (hors des lignes demandées) : lignes 17 à 30 de l'avis (métiers : borne, dépannage, ramonage, entretien, qualifications), point 9 « à décider », phrase de l'art. 8 des CGV sur l'indisponibilité (« Une phrase suffit » : la dernière phrase du paragraphe des dictées la dit déjà pour la dictée).
- **À constater par Hugo avant l'allumage** (condition de vérité de l'avis, point 2) : « Chacun est tenu, par contrat… » n'est vrai que si l'accord de traitement de chaque sous-traitant de l'art. 4 est accepté : Supabase, Resend, Vercel, Anthropic, et Stripe selon son rôle (D-02 : pas d'affirmation invérifiable). Rien à faire dans le code.
- **FAQ** : l'entrée reste montrée seulement à ceux qui peuvent dicter ; la phrase du juriste « Seuls le propriétaire de l’entreprise et ses administrateurs peuvent dicter » ne sera donc lue que par eux. Si l'on préfère que le comptable et le chef de chantier la lisent aussi, il suffit de retirer `&& peutDicter` de la condition de l'entrée (une ligne, `App.jsx`) ; le parcours de la FAQ devra alors changer.

**Commandes lancées** (commits de code : `49917d33` CGU, `0ee32f5c` textes de quota, `f6ac8a4d` migration 107) :

| Commande | Résultat |
|---|---|
| `git fetch origin && git merge origin/main` | avance rapide sur `e238170c` (`main` contenait déjà `f47cc71b`), aucun conflit |
| `npm run verifier` (standard) sur `f6ac8a4d`, arbre propre | **Tout est vert** : tests 1 800, lint 0 erreur, smoke, build |
| `npm run banc:migrations` | **Tout est vert (849 vérifications)**, dont **70** pour 107 (66 avant) |
| `npx vitest run src/lib/__tests__/voiceIntentServeur.test.js` (tests de `voice-intent`) | 42 tests verts |
| `npm run parcours -- dictee` (build IA, `scripts/lib/vite-ia.config.mjs`) | **16 parcours réussis** (CGU avec et sans IA, FAQ, CGV, page des tarifs à 375 et 1 440 px comprises) |
| Contre-essais (défaut remis, rouge, fichier restauré) | CGU : 2 tests rouges ; texte des CGV (« ne compte pas dans les dictées du mois » retiré), message du plafond du jour au Gratuit (ancien renvoi à la minute), cellule des tarifs (« partagées… ») : 4 tests rouges ; fenêtre de 10 minutes retirée de 107 : 1 vérification du banc rouge |

### Gardien du 6 nov. (F1, F2)

Relecture `gardien-securite` de 107 et 109 (`audit-ui/cloud/v4/gardien-107-109.md` du worktree de la session locale, hors dépôt) : applicables en l'état, quatre failles faibles. F1 et F2 touchent `voice-intent` et sont corrigées ici, avant son déploiement ; F3 (suppression du compte d'un collaborateur) et F4 (plafond par abonnement) restent des décisions d'Hugo. Migrations et `FONCTIONS.ia` non touchées.

- **F1, clôture en deux tentatives** (`supabase/functions/voice-intent/regles.ts`, fonction `terminer`) : si `terminer_usage_ia` échoue, la dictée était livrée mais sa réservation, jamais close, sortait du quota du mois au bout de 10 minutes. La clôture est maintenant tentée deux fois, chaque échec journalisé avec son numéro d'essai. Si le premier essai avait réussi en base mais que sa réponse s'est perdue, le second rend « déjà clos » : journalisé, sans effet. Tests (`voiceIntentServeur.test.js`) : échec puis réussite = 2 appels et réponse 200 ; deux échecs = 2 appels seulement, réponse 200, deux lignes de journal ; réussite du premier coup = 1 appel. **Contre-essai** : boucle réduite à un essai → 2 tests rouges.
- **F2, requête construite avant la réservation, contexte borné avant d'être filtré** : `requeteDictee(transcript, corps.contexte)` est construite avant `reserver` (`regles.ts`) : une exception tombe dans le filet global (503, rien de réservé), et plus aucun travail dépendant de l'entrée ne s'exécute entre la réservation et l'appel. `listeDeTextes` (`consignes.ts`) lit au plus 1 000 éléments avant de filtrer et de couper (60 clients, 80 libellés, 120 caractères). Tests : ordre requête, réservation, appel ; une requête impossible à construire ne réserve rien (503, ni réservation, ni appel, ni clôture) ; un refus avant la réservation (sans accord) ne construit rien ; un tableau de 100 000 éléments n'est jamais lu au-delà de 1 000 (espion sur les indices) ; un contexte qui n'est pas un tableau de textes donne une requête sans contexte. **Contre-essais** : requête remise après la réservation → 2 tests rouges ; filtre sur le tableau entier → 1 test rouge. Effet connu : 1 000 éléments vides en tête d'un tableau masquent les noms qui suivent (le navigateur n'en envoie pas).
- **Fichiers de `supabase/functions/` que `voice-intent` importe, directement ou non** (à déployer ensemble) : `voice-intent/index.ts`, `voice-intent/regles.ts`, `voice-intent/consignes.ts`, `_shared/branchements.ts`, `_shared/appelant.ts`, `_shared/cors.ts`. Chaîne : `index.ts` → `regles.ts` et `_shared/branchements.ts` ; `regles.ts` → `_shared/cors.ts`, `_shared/appelant.ts`, `consignes.ts` ; `branchements.ts` → `appelant.ts` (type seulement). Les autres fichiers de `_shared/` ne sont pas importés. Seuls `regles.ts` et `consignes.ts` changent dans ce correctif.
- **À ajouter aux contrôles de `docs/etat-production.md` après le déploiement** (requête du gardien, attendu : aucune ligne) : `SELECT date_trunc('day', created_at) AS jour, count(*) AS reservations_jamais_closes FROM public.usage_ia_log WHERE statut = 'reserve' AND created_at < now() - interval '10 minutes' GROUP BY 1 ORDER BY 1 DESC;`
- **Commandes** (sur `a808dbd3`, puis `c5ffe344` : documentation seulement) : `npm run verifier` (standard) **vert** (tests 1 808, lint 0 erreur, smoke, build) ; `npx vitest run src/lib/__tests__/voiceIntentServeur.test.js` : 50 tests verts ; `npm run parcours -- dictee` (build IA) : **16 parcours réussis**, sous `caffeinate -d -u`. Un premier lancement, de nuit et écran en veille, avait expiré sur deux parcours de l'écran d'accord (focus sur « Aller au contenu principal », bouton introuvable) : réussis seuls, puis au complet (le code de l'application n'a pas changé depuis le dernier lancement vert ; seul `voice-intent`, que le navigateur ne charge pas, a changé).
