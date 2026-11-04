# Session cloud « ia-allumage » — rendre la dictée prête à être allumée

Branche `cloud/ia-allumage` (copie : `claude/ia-allumage-d6x7tt`), partie de `origin/cloud/ia-socle` (`24f2f7e`), avec `origin/main` fusionné.
Décision d'Hugo du 4 nov. 2026 : « Je veux que l'IA marche directement » (inscrite en **D-32**, `docs/decisions.md`).
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
- **Démo** : la fenêtre ne dit plus « analyse par Claude » ni « envoyé » ; elle dit « Mode démonstration : analyse simplifiée, sans IA ; rien n’est envoyé. »
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
