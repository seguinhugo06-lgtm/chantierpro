# Session cloud « ia-socle » — le socle technique pour rallumer l'IA

Branche `cloud/ia-socle` (copie : `claude/ia-socle-5getw1`), partie de `main` `adbf08d` le 3 nov. 2026.
L'interrupteur `FONCTIONS.ia` reste **éteint**. Rien n'est appliqué en production, rien n'est déployé.

Ce socle lève, côté code, les trois conditions de la décision D-07 :
- quota côté serveur ;
- sous-traitant déclaré (textes prêts) ;
- saisie au clavier corrigée.

Restent des vérifications et des décisions d'Hugo (voir plus bas) avant d'allumer.

## 1. Ce qui est fait, et la preuve

### 1.1 La dictée passe à Claude Haiku 5.5
- `supabase/functions/voice-intent/consignes.ts` : modèle `claude-haiku-5-5`, effort `low`, sortie structurée (`output_config.format`, `json_schema`).
- Aucun des paramètres refusés par Haiku 5.5 : pas de `temperature`, `top_p`, `top_k`, `budget_tokens`, ni de pré-remplissage. Un test le vérifie.
- La réflexion adaptative reste active par défaut. À l'effort `low`, le modèle peut s'en passer sur une dictée simple.
- La réponse peut commencer par un bloc `thinking` : on lit le bloc `text`, et un test couvre ce cas.
- Plafond de sortie : 3 000 jetons (la réflexion compte dedans).
- Délai : 15 s par tentative, une seule nouvelle tentative au plus.
- La forme de la requête a été vérifiée le 3 nov. dans la documentation officielle : pages *Models overview* et *Structured outputs* (Haiku 5.5 y figure) sur platform.claude.com.
- Le SDK reste `@anthropic-ai/sdk@0.68.0` (esm.sh), qui transmet `output_config` tel quel. Deno n'était pas disponible ici pour vérifier les types : à constater au premier déploiement (voir 4).
- Le test `fonctionsEdgeNoms.test.js` cité dans la mission n'existe pas dans le dépôt. C'est le test de fumée qui vérifie les noms des fonctions appelées : vert, « Toutes les fonctions Edge appelées existent ».

### 1.2 Quota côté serveur, par organisation, par mois et par fonction (migration 107)
- **Table** `usage_ia_log` : une ligne par appel, avec organisation, compte, fonction (`dictee`, plus tard `assistant`…), mois de Paris, statut, offre, modèle, jetons d'entrée et de sortie, durée, motif.
  - Le texte dicté n'est jamais stocké.
  - RLS active, aucune policy, droits retirés à `anon` et `authenticated`.
- **`reserver_usage_ia`** : réserve atomiquement (verrous par compte puis par organisation).
  - Elle refuse au-delà du quota du plan et refuse un compte qui n'est pas membre de l'organisation demandée (`HORS_ORGANISATION`).
  - Au plan gratuit, elle compte aussi les usages du même compte dans ses autres organisations.
  - Plafond anti-abus sur tous les plans : 5 par minute et 100 par jour et par compte.
  - Elle purge les lignes de plus de 12 mois.
- **`terminer_usage_ia`** : clôt une seule fois, avec les jetons, la durée et l'issue.
- **Droits** : les trois fonctions sont `SECURITY DEFINER`, avec `search_path` fixé. `EXECUTE` est donné à `service_role` seulement : c'est la fonction Edge qui les appelle, après avoir vérifié le jeton de l'utilisateur.
- **Le quota par plan** est celui qui existait déjà, `PLANS[plan].limits.dictees` (`src/stores/subscriptionStore.js`) : 10 en Gratuit, illimité en Artisan et Équipe.
  - La fonction Edge le recopie (`regles.ts`, `LIMITES`) et un test vérifie que les deux sont identiques.
  - Je n'ai pas créé de deuxième quota. Le compteur du navigateur (`dicteeQuota.js`) ne sert plus qu'au mode démo.
- **Le plan** est lu en base comme l'app le choisit : la ligne du compte, celle de l'organisation et celle du propriétaire. Une ligne inactive ou une offre testeur échue vaut Gratuit.
- **Ce qui décompte** : les dictées réussies, et les échecs provoqués par la dictée (refus du modèle, réponse illisible). Une panne de notre côté ne coûte pas de dictée : API en panne, crédits épuisés, clé refusée, délai, réseau.

Preuve : `npm run banc:migrations` → **« Tout est vert (687 vérifications) »**, dont 38 pour 107. Elles vérifient :
- le quota atteint (la 11e dictée est refusée) ;
- le refus pour une autre organisation, pour un compte sans organisation, pour un utilisateur connecté, pour un visiteur ;
- qu'on ne peut pas se rendre des dictées en effaçant ou en modifiant ses lignes ;
- qu'une nouvelle organisation ne rouvre pas le quota ;
- le plafond par minute et par jour ;
- le plan de l'entreprise pour un salarié ;
- l'abonnement résilié et l'offre testeur échue ;
- le mois suivant, la purge, le départ d'un membre.

Contre-essai : sans le décompte par compte, la vérification « une nouvelle organisation ne rouvre pas de dictées » échoue (`autorise: true`).

### 1.3 Crédits épuisés, API en panne : une erreur propre, et la suite proposée
- **Côté fonction** (`regles.ts`) : un code et un message court pour chaque cas, toujours avec la saisie à la main.

  | Cas | Réponse |
  |---|---|
  | Clé absente, crédits épuisés, API en panne ou surchargée, délai dépassé, compteur absent | 503 `IA_INDISPONIBLE` : « Dictée indisponible pour le moment. Saisissez votre devis à la main. » |
  | Quota du mois atteint | 429 `QUOTA_ATTEINT` : « Vos 10 dictées du mois sont utilisées. Saisissez votre devis à la main, ou passez au plan Artisan : dictées sans limite. » |
  | Trop de dictées en peu de temps | 429 `PLAFOND` |
  | Entreprise qui n'est pas la sienne | 403 |
  | Refus du modèle | 422 |
  | Réponse illisible | 502 |
  | Pas connecté | 401 |

  La cause réelle (`credits`, `cle`, `surcharge`…) ne va qu'au journal de la fonction. Tous ces cas sont couverts par des tests.
- **Côté app** (`src/lib/voiceIntent.js`, `erreurDictee`) : on lit le vrai message de la fonction.
  - Avant, supabase-js ne montrait que « Edge Function returned a non-2xx status code » : les messages propres du serveur n'arrivaient jamais à l'artisan. Le contre-essai le montre.
  - Sans réseau : « Pas de réseau : la dictée a besoin d'une connexion. Saisissez votre devis à la main. »
- **Dans la fenêtre de dictée** : le texte reste dans le champ.
  - Un bouton « Saisir mon devis à la main » ouvre un devis vierge.
  - Si le quota est atteint, un bouton « Voir les offres » s'ajoute.
  - Aucun bouton « Créer » n'apparaît après un échec.

### 1.4 La saisie au clavier corrigée (3e condition de D-07)
Les documents ne décrivaient pas le défaut. Je l'ai cherché dans `src/components/voice/` et `src/hooks/useDictation.js`, et trouvé trois défauts :
1. **Taper pendant que le micro écoute lançait l'analyse au milieu de la frappe.** Le délai de silence (3,5 s) se comptait depuis le dernier mot *parlé*.
2. **Le dernier résultat du micro, livré après l'arrêt, recopiait le texte déjà entendu** derrière la correction : texte en double, ou correction écrasée.
3. **Sans micro (Firefox, certains iPhone), le focus partait sur un bouton désactivé** au lieu du champ de saisie.

Correctif :
- taper coupe le micro (`saisirAuClavier`) ;
- un résultat tardif du micro est ignoré ;
- sans micro, c'est le champ qui prend le focus.

### 1.5 Coûts
- Chaque appel journalise le modèle, les jetons d'entrée et de sortie, la durée et l'issue (`usage_ia_log`).
- Requête pour Hugo (éditeur SQL), coût estimé au tarif public de Haiku 5.5 : 0,10 $ par million de jetons en entrée et 0,50 $ en sortie, pour une requête de moins de 100 000 jetons.
  ```sql
  SELECT mois, fonction, count(*) FILTER (WHERE statut = 'reussi') AS reussies, count(*) FILTER (WHERE statut = 'echec') AS echecs,
         sum(jetons_entree) AS entree, sum(jetons_sortie) AS sortie,
         round((sum(jetons_entree) * 0.10 + sum(jetons_sortie) * 0.50) / 1e6, 4) AS cout_dollars
    FROM public.usage_ia_log GROUP BY mois, fonction ORDER BY mois DESC, fonction;
  ```
- Estimation, non mesurée : environ 2 500 jetons en entrée et 500 en sortie par dictée, soit moins d'un millième de dollar. Haiku 4.5 coûtait dix fois plus par jeton.
- Le nouveau tokenizer compte environ 30 % de jetons en plus pour le même texte. Le vrai chiffre se lira dans la table.

### 1.6 Fluidité
- **Je n'ai pas pu mesurer la réponse de la dictée** : il n'y a pas de clé API dans cette session, et la mission l'interdit.
- La fonction renvoie `usage.duree_ms` et l'enregistre à chaque appel. Mesure après déploiement :
  ```sql
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY duree_ms) AS mediane_ms,
         percentile_cont(0.95) WITHIN GROUP (ORDER BY duree_ms) AS p95_ms, count(*)
    FROM public.usage_ia_log WHERE fonction = 'dictee' AND statut = 'reussi';
  ```
  Cible : médiane sous 3 000 ms.
- Ce que j'ai fait pour la cible : effort `low`, et des consignes fixes (le contexte est passé dans le message). Les consignes peuvent ainsi être gardées en cache d'une dictée à l'autre.
- Leviers si la cible n'est pas tenue :
  1. couper la réflexion (`thinking: {type: "disabled"}`, accepté par Haiku 5.5 à l'effort `low`), après un essai sur 10 dictées réelles ;
  2. activer le cache des consignes (`cache_control`) ;
  3. réduire le délai de silence avant l'analyse automatique (3,5 s côté app, en plus du temps du modèle).

### 1.7 Commandes qui ont tourné
| Commande | Résultat |
|---|---|
| `npm ci` | OK |
| `npm run banc:migrations` | Tout est vert (687 vérifications) |
| `npx vitest run` (nouveaux tests) | 32 tests verts : `voiceIntentServeur` (26), `erreurDictee` (4), `cguIa` (2) |
| `npm run parcours -- dictee` | 6 parcours réussis (voir 1.8) |
| Contre-essais | sans les correctifs : 3 parcours en échec (clavier, organisation absente, « non-2xx » affiché) ; sans le décompte par compte : banc en échec |
| `bash scripts/smoke-test.sh` | 0 erreur |
| `npm run verifier -- --complet` | voir 1.9 |

### 1.8 Parcours de la dictée (`scripts/parcours/dictee.cjs`)
- **Le principe.** Ils tournent en mode « réel simulé », avec un faux micro et une fausse fonction `voice-intent`. Ils utilisent un build **de test** où l'interrupteur est allumé au moment du build (`scripts/lib/vite-ia.config.mjs`, dans `audit-ui/dist-ia-reel`, ignoré par git). Le code livré garde `ia: false`.
- **Les six parcours :**
  1. corriger au clavier pendant l'écoute ;
  2. API indisponible, puis « Saisir mon devis à la main » ;
  3. quota atteint ;
  4. relecture avant création ;
  5. avec l'IA allumée, la politique et les CGU déclarent Anthropic, et la version change ;
  6. avec l'IA éteinte, rien n'annonce Anthropic.
- **Petits changements d'outillage** pour les faire tourner :
  - `scripts/parcours/lancer.cjs` accepte le build propre à un parcours ;
  - `scripts/lib/cgu.cjs` lit la version des CGU, qui suit maintenant l'interrupteur.

### 1.9 Vérification complète
`npm run verifier -- --complet` sur `47d9d6b` (arbre propre) :
- **verts** : tests (1 231), lint (0 erreur), smoke, build, banc de migrations, et les 6 parcours de la dictée ;
- **4 parcours en échec**, et **les mêmes 4 échouent sur `main`** (`origin/main` `adbf08d`, rejoués dans une copie à part le 3 nov.) : ils ne viennent pas de cette branche.

  | Parcours | Échec |
  |---|---|
  | « signature sur place » (×2) | « Bouton « Faire signer » introuvable » |
  | « trésorerie : pas de seuil d'alerte… » | bandeau « negatif » |
  | « équipe : … heures à valider » | « 0 h validées ce mois » |

  Ils semblent liés à la date du jour (début de mois, 3 nov.). C'est à traiter par la session locale, hors de cette mission.

Sur le commit final, après le second tour de sécurité : `npm run verifier` (standard), voir la fin du rapport.

## 2. Textes nouveaux soumis au juriste (relecture `juriste-btp` du 3 nov. 2026, sa version appliquée)
Tous ces textes ne s'affichent **que si `FONCTIONS.ia` est allumé**. Aujourd'hui, rien ne change pour les utilisateurs (parcours 6).
- **Politique de confidentialité** (`src/components/LegalPages.jsx`) :
  - article 2 : paragraphe « Dictée vocale » ;
  - article 3 : journal des analyses conservé 12 mois ;
  - article 4 : ligne « Anthropic » (stockage aux États-Unis, calcul possible ailleurs, DPA et clauses contractuelles types, pas d'entraînement, conservation jusqu'à 2 ans d'un contenu signalé) ;
  - la version affichée suit l'interrupteur.
- **CGU** (`src/components/legal/TexteCgu.jsx`) :
  - article 7 : la dictée peut se tromper, à relire ;
  - article 11 : clause de sous-traitance (RGPD art. 28) et autorisation des sous-traitants ultérieurs, avec 30 jours de préavis ;
  - `CGU_VERSION` passe d'elle-même à `2026-11-03` quand l'IA est allumée, ce qui redemande l'acceptation. Le juriste juge le préavis de 30 jours non requis : on ajoute une fonction, on ne retire rien.
- **Fenêtre de dictée**, avant la demande d'accès au micro :
  - avant : « Votre voix n'est pas enregistrée : elle est transcrite puis oubliée » (invérifiable : sur Chrome, le son part chez Google) ;
  - maintenant : « Mallettico ne reçoit pas le son : votre navigateur le transforme en texte (sur Chrome, par les serveurs de Google). Seul ce texte nous est envoyé, pour l'analyse. »
- **Fenêtre d'offre « dictées »** (`subscriptionStore.js`) :
  - avant : « En illimité, vous ne rentrez plus rien à la main » (faux) ;
  - maintenant : « La dictée prépare un brouillon de devis à partir de ce que vous dites ; vous le relisez. Avec le plan Artisan, dictez sans limite. »

## 3. Relectures
- **`gardien-securite`** (migration, fonction Edge, droits). Deux failles hautes, corrigées et prouvées au banc :
  - H1 : le quota gratuit se contournait en créant des organisations ;
  - H2 : aucun plafond de coût.

  Basses, corrigées : B1 journal réattribué au patron au départ d'un membre ; B2 aucune durée de conservation ; B3 abonnement inactif ; B4 contexte du navigateur dans les consignes.

  Non fait : un coupe-circuit de budget global dans la fonction. Je recommande plutôt la limite de dépense de la Console Anthropic (point 5.2) : au-delà, l'API refuse et l'app affiche « indisponible, à la main ».

  Second tour sur les correctifs : « les correctifs tiennent, rien de critique, haut ou moyen n'est ouvert ». Ses quatre points bas :
- deux sont corrigés : un salarié qui dicte dans l'entreprise payante n'entame plus son quota gratuit personnel (vérification au banc ajoutée), et la purge ne bloque plus deux réservations (`SKIP LOCKED`) ;
- le test de rafale vérifie maintenant les 5 premières ;
- le dernier, le coût résiduel borné par la limite de dépense de la Console, est à régler par Hugo avant l'allumage (point 5.2).
- **`juriste-btp`** (textes) : sa version est appliquée mot pour mot. Ses quatre blocages avant l'allumage sont repris en 5 et 6.

## 4. Marche exacte pour appliquer et déployer (l'ordre compte)
À faire depuis `main`, une fois la branche relue et livrée par la session locale (D-22).
1. **Hugo règle les secrets et les crédits (point 5).** Sans clé, la fonction répond 503 « indisponible », sans casser l'app.
2. **Appliquer la migration 107 avant la fonction.**
   - Sans la migration, la nouvelle fonction refuse toute dictée (« indisponible ») : c'est sûr, mais inutile.
   - Une autre session cloud a pu créer aussi une 107 : la renuméroter à la fusion, dans le nom du fichier et dans `scripts/banc/NNN.mjs`.
   - Contrôle après application (éditeur SQL), avec le résultat attendu :
     ```sql
     SELECT to_regclass('public.usage_ia_log') IS NOT NULL AS table_ok,
            (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.usage_ia_log'::regclass) AS rls,
            has_table_privilege('authenticated', 'public.usage_ia_log', 'select') AS lisible_utilisateur,
            has_function_privilege('authenticated', 'public.reserver_usage_ia(uuid,uuid,text,jsonb)', 'execute') AS reserver_public,
            has_function_privilege('anon', 'public.terminer_usage_ia(bigint,text,text,integer,integer,integer,text)', 'execute') AS terminer_visiteur,
            has_function_privilege('service_role', 'public.reserver_usage_ia(uuid,uuid,text,jsonb)', 'execute') AS serveur;
     -- attendu : t, t, f, f, f, t
     ```
3. **Déployer `voice-intent`** (vérification du jeton conservée, pas de `--no-verify-jwt`) :
   ```
   npx supabase functions deploy voice-intent --project-ref kofsbgxkrmryfetevetn
   ```
   Fichiers déployés : `index.ts`, `regles.ts`, `consignes.ts`, `_shared/cors.ts`, `_shared/appelant.ts`, `_shared/branchements.ts`.
4. **Constater**, avant d'allumer quoi que ce soit :
   - un appel sans jeton rend 401 ;
   - avec le compte démo, depuis la console du navigateur sur mallettico.fr :
     ```js
     supabase.functions.invoke('voice-intent', { body: { transcript: 'Madame Exemple, 10 m² de peinture à 20 euros' } })
     ```
     on attend une intention, puis une ligne `reussi` dans `usage_ia_log` avec des jetons et `duree_ms` ;
   - la médiane de `duree_ms` (requête de 1.6) ;
   - le journal de la fonction ne montre ni erreur de type, ni 400 de l'API (forme de la requête).
5. **Allumer `FONCTIONS.ia`** : décision d'Hugo seulement, après les points 5 et 6.

## 5. Ce qu'Hugo doit régler
1. **La clé API**, dans Supabase › Edge Functions › Secrets › `ANTHROPIC_API_KEY`. Elle se crée dans la Console Anthropic (platform.claude.com › API keys). Claude ne saisit aucune clé.
2. **Les crédits API.**
   - L'abonnement Claude Max couvre claude.ai et Claude Code. **L'API se paie à part**, avec des crédits achetés dans la Console (Billing).
   - À vérifier dans la Console : est-ce que l'offre d'Hugo y donne des crédits API ? Je ne l'ai pas vérifié depuis ici.
   - **Régler une limite de dépense mensuelle** dans la Console (par exemple 10 $) : c'est le coupe-circuit du coût. Au-delà, l'API refuse et l'app dit « indisponible, saisissez à la main ».
3. **L'accord avec Anthropic** :
   - vérifier dans la Console que l'organisation est couverte par les Commercial Terms et le DPA d'Anthropic, et que ce DPA contient les clauses contractuelles types ;
   - vérifier sur dataprivacyframework.gov si Anthropic est certifié au Data Privacy Framework ;
   - sans au moins l'une de ces deux garanties, pas d'IA (RGPD art. 44, avis du juriste).
4. **Ne jamais autoriser l'entraînement** dans la Console (programme partenaire, partage de données) : sinon la phrase de l'article 4 devient fausse.

## 6. Décisions qui reviennent à Hugo
1. **Le plafond anti-abus de 100 dictées par jour**, aussi sur les plans « sans limite ».
   - Le juriste rappelle que « sans limite » est un engagement.
   - Choisir : l'écrire dans l'offre avant l'allumage (« sans limite, dans la limite d'un usage normal : 100 par jour »), le relever, ou le retirer.
   - Le plafond de 5 par minute ne gêne personne.
2. **Localisation du calcul** : `inference_geo: "us"` (coût ×1,1, la politique pourra dire « États-Unis »), ou le réglage par défaut (`global`, le texte actuel dit « calcul possible dans d'autres pays »).
3. **Clause de sous-traitance (CGU art. 11)** : la publier dès maintenant, sans attendre l'IA (le défaut existe déjà pour les données des clients), ce qui relève la version des CGU ; ou attendre l'allumage (choix par défaut du code).
4. **Journal des analyses** : 12 mois, codé et annoncé, ou une autre durée.
5. **L'écran d'accord avant la première dictée** (Apple 5.1.2(i)) : il faut valider son texte, proposé par le juriste.
6. **La date des CGU et de la politique** : le jour de l'allumage, remplacer « 2026-11-03 » et « 3 novembre 2026 » (`src/lib/cgu.js`) par la date réelle. Un test (`cguIa.test.js`) échoue tant que ce n'est pas fait.

## 7. Ce qui reste
- **L'écran d'accord avant la première dictée** (Apple 5.1.2(i), à confirmer pour Google Play). Ce n'est pas fait : il demande d'enregistrer l'accord en base, avec le compte, la date et la version. Texte du juriste, prêt :
  > **Avant votre première dictée** — Pour transformer votre dictée en devis, Mallettico envoie le texte à Anthropic, une société américaine d'intelligence artificielle (modèle Claude), avec les noms de vos clients et les libellés de votre catalogue. Mallettico ne reçoit pas le son : votre navigateur le transforme en texte (sur Chrome, par Google). Anthropic s'engage à ne pas utiliser ces données pour entraîner ses modèles. Vous relisez tout avant que quoi que ce soit soit créé. [J'accepte et je dicte] [Non, je saisis à la main] · En savoir plus
- **Dans l'app, un abonnement inactif au plan élevé** garde ce plan (`choisirAbonnement`, relecture B3). Le serveur est désormais plus strict, il vaudrait mieux aligner l'app.
- **Écarts relevés par le juriste, hors de ma mission :**
  - CGU art. 11, « consent au traitement de ses données » : la base légale est le contrat ;
  - ligne Resend de la politique, sans garantie de transfert.
- **Le premier vrai appel** : forme de la requête, latence, coût. Il est à constater au déploiement (point 4).
- **Sources non joignables** depuis cette session, que le juriste n'a pas pu relire : privacy.claude.com (politique de conservation commerciale d'Anthropic), dataprivacyframework.gov, EUR-Lex, CNIL, Google Play. Il faut les autoriser dans les réglages réseau de la session pour les relire.

## 8. Risques
- **Il n'y a eu aucun appel réel à l'API.** Le SDK 0.68.0 avec `output_config.effort`, la latence et le coût sont à constater au premier déploiement.
- **Un plan illimité reste coûteux s'il est détourné.** C'est plafonné à 100 par jour et par compte, et par la limite de dépense de la Console, à régler.
- **Si la 107 d'une autre session porte le même numéro**, il faut renuméroter à la fusion.
- **Le build de test** de la dictée allume l'IA par un greffon Vite : il ne doit jamais servir à un déploiement. Il est écrit dans `audit-ui/`, ignoré par git.

## Résumé
1. La dictée passe à Claude Haiku 5.5 (effort `low`, sortie structurée, 3 000 jetons au plus). La forme de la requête a été vérifiée dans la documentation officielle.
2. Migration 107 : quota serveur par entreprise, mois et fonction. Elle sert aussi de journal des jetons, réutilisable par le futur assistant.
3. Banc vert : 687 vérifications, dont 38 pour 107 (quota atteint, autre entreprise, visiteur, contournement).
4. Crédits épuisés ou API en panne : « Dictée indisponible pour le moment. Saisissez votre devis à la main. » Un bouton ouvre alors un devis.
5. L'app affiche enfin le vrai message du serveur, et non plus « non-2xx ».
6. Saisie au clavier : taper coupe le micro, plus d'analyse au milieu de la frappe ni de texte en double.
7. Les textes d'Anthropic sous-traitant sont prêts (version du juriste), affichés seulement quand l'IA sera allumée.
8. Rien n'est appliqué ni déployé. Ordre : secrets et crédits, puis 107, puis `voice-intent`, puis le constat.
9. Avant d'allumer : vérifier le DPA d'Anthropic, l'écran d'accord, le plafond de 100 par jour, la date des CGU.
10. Latence non mesurée faute de clé : elle se lit dans `usage_ia_log.duree_ms` dès le premier appel.
