# Session cloud « ia-socle » — le socle technique pour rallumer l'IA

Branche `cloud/ia-socle` (copie : `claude/ia-socle-5getw1`), partie de `main` `adbf08d` le 3 nov. 2026.
L'interrupteur `FONCTIONS.ia` reste **éteint**. Rien n'est appliqué en production, rien n'est déployé.

Où en sont les trois conditions de la décision D-07 :
- quota côté serveur : fait ;
- saisie au clavier : corrigée ;
- sous-traitant déclaré : les textes sont prêts, mais **l'écran d'accord avant la première dictée (Apple 5.1.2(i)) reste à construire**. Il fait partie de cette condition et **bloque l'allumage**.

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

Sur le commit final `0bdd481`, après le second tour de sécurité : `npm run verifier` (standard) → « Tout est vert » (tests 1 231, lint 0 erreur, smoke, build). Le banc tourne à part : « Tout est vert (687 vérifications) ».

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
  - maintenant : « Mallettico ne reçoit pas le son : votre navigateur le transforme en texte (sur Chrome, par les serveurs de Google). Seul ce texte nous est envoyé, puis analysé par une intelligence artificielle (Claude, d’Anthropic). » (texte du juriste, 3 nov.) ; et, sous le titre, « Analyse par une intelligence artificielle (Claude, d’Anthropic) : elle peut se tromper, vous relisez tout. »
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

**Situation de départ, constatée le 3 nov. par la session locale (lecture seule)** : la version de `voice-intent` en production est la **v11 de juillet**. Elle n'a aucun quota côté serveur, tourne sur Haiku 4.5 avec `max_tokens` 4096, et répond à **tout compte connecté si la clé `ANTHROPIC_API_KEY` est posée**. Poser la clé avant d'avoir déployé la nouvelle version rallumerait donc ce trou.

0. **Constater si la clé est posée** (connecteur Supabase : la liste des secrets, **son nom seulement**, jamais sa valeur).
   - Si elle est posée : Hugo la retire, **ou** l'on déploie tout de suite la nouvelle fonction (point 2). Sans la migration 107, la nouvelle version répond 503 « indisponible » avant tout appel à l'API ; sans le secret `IA_DICTEE`, aussi.
1. **Appliquer la migration 107.**
   - Elle garde son numéro : la `108` de `cloud/metiers` est indépendante (elle ne touche que `get_devis_for_signature`).
   - Contrôle après application (§4.2 ci-dessous).
2. **Déployer `voice-intent`** (vérification du jeton conservée, pas de `--no-verify-jwt`) :
   ```
   npx supabase functions deploy voice-intent --project-ref kofsbgxkrmryfetevetn
   ```
   Fichiers déployés : `index.ts`, `regles.ts`, `consignes.ts`, `_shared/cors.ts`, `_shared/appelant.ts`, `_shared/branchements.ts`. Contrôle : `get_edge_function voice-intent` montre `regles.ts` et `consignes.ts`.
3. **Seulement alors, Hugo pose la clé** `ANTHROPIC_API_KEY`, avec des crédits prépayés sans rechargement automatique et **une limite de dépense mensuelle dans la Console**. Il règle aussi le secret `IA_DICTEE` sur l'identifiant du **compte de test** (pas « tous »).
4. **Constater avec ce compte de test**, avant d'allumer quoi que ce soit :
   - un appel sans jeton rend 401 ;
   - un compte qui n'est pas dans `IA_DICTEE` rend 503 `IA_INDISPONIBLE`, sans ligne dans `usage_ia_log` ;
   - avec le compte de test connecté sur mallettico.fr, dans la console du navigateur (la page n'expose pas de client `supabase` ; on lit le jeton de session dans le stockage local, et la clé anon publique est celle de l'app) :
     ```js
     const cle = Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k));
     const jeton = JSON.parse(localStorage.getItem(cle)).access_token;
     const ANON = '<clé anon publique, Supabase › Project Settings › API>';
     const r = await fetch('https://kofsbgxkrmryfetevetn.supabase.co/functions/v1/voice-intent', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${jeton}` },
       body: JSON.stringify({ transcript: 'Madame Exemple, 10 m² de peinture à 20 euros' }),
     });
     console.log(r.status, await r.json());
     ```
     on attend 200 et une intention, puis une ligne `reussi` dans `usage_ia_log` avec des jetons et `duree_ms` ;
   - la médiane de `duree_ms` (requête de 1.6) ;
   - le journal de la fonction ne montre ni erreur de type, ni 400 de l'API (forme de la requête).
5. **Allumer** : `IA_DICTEE` à « tous » et `FONCTIONS.ia` à `true`, décision d'Hugo seulement, après les points 5 et 6 et l'écran d'accord.

### 4.2 Contrôle de la migration 107 après application (éditeur SQL)
```sql
SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS visiteur,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS connecte,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS serveur,
       p.prosecdef AS definer, array_to_string(p.proconfig, ',') AS reglages
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname IN ('plan_pour_usage_ia', 'reserver_usage_ia', 'terminer_usage_ia') ORDER BY 1;
-- attendu : 3 lignes f, f, t, t, search_path=public, pg_temp
SELECT (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_ia_log') AS policies,
       has_table_privilege('anon', 'public.usage_ia_log', 'SELECT,INSERT,UPDATE,DELETE') AS visiteur,
       has_table_privilege('authenticated', 'public.usage_ia_log', 'SELECT,INSERT,UPDATE,DELETE') AS connecte;
-- attendu : 0, f, f
SELECT jobname, schedule FROM cron.job WHERE jobname = 'purger-journal-ia';
-- attendu : 1 ligne, 17 3 * * *
```

## 5. Ce qu'Hugo doit régler
1. **La clé API, en dernier** (§4, point 3), dans Supabase › Edge Functions › Secrets › `ANTHROPIC_API_KEY`, **seulement après** la migration 107 et le déploiement de la nouvelle `voice-intent` : la v11 en production n'a aucun quota. Si elle est déjà posée aujourd'hui, la retirer (§4, point 0). Elle se crée dans la Console Anthropic (platform.claude.com › API keys). Claude ne saisit aucune clé. Avec elle, le secret `IA_DICTEE` (compte de test d'abord).
2. **Les crédits API.**
   - L'abonnement Claude Max couvre claude.ai et Claude Code. **L'API se paie à part**, avec des crédits achetés dans la Console (Billing). *(Le juriste signale le 3 nov. que c'est inexact : l'offre Max inclut des crédits API. Correction en attente de la décision d'Hugo, voir « Corrections du 3 nov. », décision J4.)*
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
  > **Avant votre première dictée** — Votre dictée est analysée par une intelligence artificielle : Claude, de la société Anthropic, qui stocke les données aux États-Unis (le calcul peut avoir lieu dans d'autres pays). Mallettico lui envoie le texte de la dictée, avec les noms de vos clients (60 au plus) et les libellés de votre catalogue (80 au plus). Mallettico ne reçoit pas le son : votre navigateur le transforme en texte (sur Chrome, par Google). Anthropic n'utilise pas ces données pour entraîner ses modèles et les efface sous 30 jours (jusqu'à 2 ans si ses contrôles de sécurité les signalent). L'IA peut se tromper : vous relisez tout, rien n'est créé sans votre validation. [J'accepte et je dicte] [Non, je saisis à la main] · En savoir plus (Politique de confidentialité, article 4)

  Texte du juriste du 3 nov. (sources : Apple 5.1.2(i) ; règlement (UE) 2024/1689, art. 50 § 1 et § 5 ; page de conservation d'Anthropic du 1er juil. 2026). Enregistrer l'accord (compte, date, version du texte). Aucun appel avant l'accord. Accord révocable dans les Paramètres. Si `inference_geo` « us » est choisi : « qui traite les données aux États-Unis ».
- **Dans l'app, un abonnement inactif au plan élevé** garde ce plan (`choisirAbonnement`, relecture B3). Le serveur est désormais plus strict, il vaudrait mieux aligner l'app.
- **Écarts relevés par le juriste, hors de ma mission :**
  - CGU art. 11, « consent au traitement de ses données » : corrigé le 3 nov. (base légale : le contrat, art. 6.1.b) ;
  - ligne Resend de la politique, sans garantie de transfert.
- **Le premier vrai appel** : forme de la requête, latence, coût. Il est à constater au déploiement (point 4).
- **Sources non joignables** depuis cette session, que le juriste n'a pas pu relire : privacy.claude.com (politique de conservation commerciale d'Anthropic), dataprivacyframework.gov, EUR-Lex, CNIL, Google Play. Il faut les autoriser dans les réglages réseau de la session pour les relire.

## 8. Risques
- **Il n'y a eu aucun appel réel à l'API.** Le SDK 0.68.0 avec `output_config.effort`, la latence et le coût sont à constater au premier déploiement.
- **Un plan illimité reste coûteux s'il est détourné.** C'est plafonné à 100 par jour et par compte, et par la limite de dépense de la Console, à régler.
- **Numéro 107 gardé** : la 108 de `cloud/metiers` est indépendante, aucune renumérotation.
- **La v11 de juillet en production n'a aucun quota** : poser la clé avant de déployer la nouvelle version la rallume pour tout compte connecté (ordre du §4).
- **Le build de test** de la dictée allume l'IA par un greffon Vite : il ne doit jamais servir à un déploiement. Il est écrit dans `audit-ui/`, ignoré par git.

## Résumé
1. La dictée passe à Claude Haiku 5.5 (effort `low`, sortie structurée, 3 000 jetons au plus). La forme de la requête a été vérifiée dans la documentation officielle.
2. Migration 107 : quota serveur par entreprise, mois et fonction. Elle sert aussi de journal des jetons, réutilisable par le futur assistant.
3. Banc vert : 687 vérifications, dont 38 pour 107 (quota atteint, autre entreprise, visiteur, contournement).
4. Crédits épuisés ou API en panne : « Dictée indisponible pour le moment. Saisissez votre devis à la main. » Un bouton ouvre alors un devis.
5. L'app affiche enfin le vrai message du serveur, et non plus « non-2xx ».
6. Saisie au clavier : taper coupe le micro, plus d'analyse au milieu de la frappe ni de texte en double.
7. Les textes d'Anthropic sous-traitant sont prêts (version du juriste), affichés seulement quand l'IA sera allumée.
8. Rien n'est appliqué ni déployé. Ordre : constater la clé (la retirer si posée), puis 107, puis `voice-intent`, puis la clé et sa limite de dépense, puis le constat avec un compte de test.
9. Avant d'allumer : vérifier le DPA d'Anthropic, l'écran d'accord, le plafond de 100 par jour, la date des CGU.
10. Latence non mesurée faute de clé : elle se lit dans `usage_ia_log.duree_ms` dès le premier appel.

## Corrections du 3 nov.

Session cloud de correction, après deux relectures locales (code, sécurité) et la lecture des textes officiels par le juriste. `FONCTIONS.ia` reste `false` ; rien n'est appliqué ni déployé. Commits : `1fa99e2` (serveur et migration), `efb633e` (app et textes), `231bfc8` (documents), puis celui de cette section.

### Ce qui est fait, et la preuve
- `npm run banc:migrations` : **tout vert, 693 vérifications** (44 pour 107, dont 7 nouvelles). **Contre-essai** : en remettant `SET NULL`, sans contrôle de rôle, sans `coalesce(status, 'active')` et avec 100 par jour au gratuit, 5 vérifications passent au rouge (statut NULL, ouvrier, quota du salarié, 21e analyse, suppression de compte).
- `npx vitest run src/lib/__tests__/voiceIntentServeur.test.js` : 30 tests verts (4 nouveaux : interrupteur fermé, SANS_DROIT, coupe-circuit, exception imprévue avec CORS ; motif `coupee`).
- `npx vitest run src/lib/__tests__/droitsDictee.test.js` : 6 tests verts. **Contre-essai** : avec l'ancien `DicteeModal.jsx`, 2 tests sur 6 échouent (TVA par défaut, montants sans droit).
- `npm run verifier` (standard) : résultat ci-dessous (« Vérification »).

### Point par point

**Propres à la branche (consignes de la session)**
- Ordre de mise en production réécrit (§4, §5.1, ligne `voice-intent` d'`etat-production.md`) : v11 sans quota en production ; 0) clé constatée, retirée si posée ; 1) 107 ; 2) `voice-intent` ; 3) clé et limite de dépense ; 4) constat avec un compte de test. — `231bfc8`.
- Conservation chez Anthropic : textes exacts du juriste (politique art. 4, ligne du tableau, ligne de conservation). — `efb633e`.
- Textes « sans limite » : **non changés**, en attente d'Hugo (décisions ci-dessous).
- Numéro 107 gardé ; migration passée au banc ; appliquée nulle part.
- `origin/main` fusionné (`19af887`, sans conflit), refusionné avant le dernier push.

**Relecture de code**
1. « Sans limite » (subscriptionStore.js, regles.ts) — non appliqué : décision d'Hugo.
2. Conservation chez Anthropic (LegalPages.jsx) — fait, texte du juriste, sources en commentaire. `efb633e`.
3. Droits de la dictée — fait : `src/lib/droitsDictee.js` ; « Dicter » et la fenêtre seulement avec la page `ia-devis` ET `canPerform('devis', 'create')` ; le repli « Saisir mon devis à la main » seulement avec `devis.create` ; montants de la relecture (récap, sous-titre, prix unitaire, total de ligne, totaux) derrière `voitPrix = canViewPrices` (absent : caché). Test `droitsDictee.test.js`. `efb633e`.
4. etat-production.md — ligne vide retirée, action 8 « En attente côté Hugo » (clé, limite de dépense, `IA_DICTEE`, DPA, pages DPF et sous-traitants), date mise au 3 nov. `231bfc8`.
5. Commande de constat — remplacée par un `fetch` vers `/functions/v1/voice-intent` avec le jeton de session et la clé anon (§4, point 4). `231bfc8`.
6. Phrase « lève les trois conditions de D-07 » — corrigée : quota et clavier faits, textes prêts, écran d'accord à construire, bloquant. `231bfc8`.
7. `scripts/lib/cgu.cjs` — lit maintenant `ia:` dans `src/lib/fonctions.js` pour choisir la version. `efb633e`.
8. Commentaire du cache (consignes.ts) — corrigé : aucun cache demandé. `1fa99e2`.
9. `max_tokens` → motif `coupee`, non décompté ; filet `try/catch` global → 503 `IA_INDISPONIBLE` avec `corsHeaders`. Tests. `1fa99e2`.
10. Purge planifiée (pg_cron, `purger-journal-ia`, 3 h 17 chaque nuit, bloc ignoré sans pg_cron) ; jetons inconnus gardés NULL (vérifié au banc). `1fa99e2`.
11. Textes faux à l'allumage — FAQ réécrite (texte du juriste), ligne « IA Devis : analyse photo de chantier » supprimée du Changelog, libellé « Compléter (IA) » remplacé par « Tâches types ». `efb633e`.

**Relecture de sécurité (gardien)**
1. Ordre de mise en production — fait (voir plus haut). `231bfc8`.
2. Membre sans droit — `SANS_DROIT` dans `reserver_usage_ia` (owner, admin, comptable), `{ sansDroit: true }` dans index.ts, 403 « Votre rôle ne permet pas de créer un devis. », bouton gardé par `ia-devis` + `devis.create`. Banc : un ouvrier est refusé sans rien compter ; le salarié du socle passe comptable. `1fa99e2`, `efb633e`.
3. Délais non décomptés — plafond du jour à 20 au plan gratuit, 100 aux payants ; banc : la 21e du jour est refusée au gratuit. `1fa99e2`.
4. Coupe-circuit global — 3 000 analyses par jour et par fonction, index `idx_usage_ia_jour`, motif `global` → 503 `IA_INDISPONIBLE` (plus « quota »). Banc et test. Valeur à fixer par Hugo. `1fa99e2`.
5. Interrupteur serveur — `ouverte(userId)` lu dans le secret `IA_DICTEE` (liste d'identifiants ou « tous ») ; sans lui, 503 et rien de réservé (test). `1fa99e2`.
6. Conservation — `ON DELETE CASCADE` sur `user_id` (la phrase de la politique devient vraie ; banc : lignes effacées avec le compte, même chez le patron) et purge quotidienne pg_cron. `1fa99e2`.
7. Tri du plan — `coalesce(status, 'active')` dans le second CASE ; banc : une ligne gratuite au statut NULL ne masque pas l'abonnement Équipe du patron. `1fa99e2`.
8. Contrôle après application — les deux requêtes du gardien, plus celle de la tâche cron (en-tête de 107 et §4.2). `1fa99e2`, `231bfc8`.

**Juriste (points de cette branche)**
- 1 (ligne Anthropic, art. 4) — fait, texte exact. `efb633e`.
- 2 (CGU art. 11) — fait, textes exacts des l. 196-197, 205, 208. **Attention** : la phrase des l. 196-197 (base légale du contrat au lieu du consentement) est **visible aujourd'hui** (hors interrupteur), sans hausse de `CGU_VERSION` ; voir décisions.
- 3 (écran d'accord) — texte posé dans §7 ; l'écran n'est pas codé (bloquant avant l'allumage).
- 4 (conservation 30 jours) — fait (l. 352 et l. 404). La ligne directrice (`docs/ia/ligne-directrice.md`) n'existe pas sur cette branche (branche `cloud/ia-direction`) : non touchée.
- 5 (mention IA, art. 50) — fait : phrase sous le titre de la fenêtre, et phrase du micro remplacée. `efb633e`.
- 6, 7, 10, 12, 13 — fichiers de `cloud/ia-direction` : hors branche, non touchés.
- 8 (promesses fausses) — fait (Changelog, OngletTaches, FAQ). `efb633e`.
- 9 (TVA en franchise) — fait : `tauxTvaParDefaut(entreprise)` (0 en franchise). Test : le taux par défaut et son usage dans la fenêtre. **Pas fait** : le constat que les deux PDF impriment la mention 293 B pour un brouillon dicté à 0 % (pas d'outil de rendu de composant dans le dépôt) ; à faire par le parcours `documents` ou `/sonde` à la livraison.
- 11 (`assistant: false` dans fonctions.js) — non fait ici : il concerne `App.jsx` de `cloud/ia-direction` ; l'ajouter dans cette branche créerait un conflit sans effet.
- Introuvable 1 (DPF, sous-traitants d'Anthropic) — rien écrit sur le DPF ; Hugo ouvre les deux pages (action 8 d'`etat-production.md`).
- Introuvable 2 (voix sur Chrome) — formulation prudente gardée.

### Décisions d'Hugo (ne pas appliquer sans lui)
Option recommandée en premier.
1. **Plafond anti-abus de 100 par jour sur les plans « sans limite »** (et 20 par jour au gratuit, déjà codé). Textes en attente, non changés : « Avec le plan Artisan, dictez sans limite » (`src/stores/subscriptionStore.js`, fenêtre d'offre) et « passez au plan Artisan : dictées sans limite » (`supabase/functions/voice-intent/regles.ts`, `MESSAGES.quota`), et la FAQ (« sans limite mensuelle », à compléter). Recommandé : garder 100 et l'annoncer (« sans limite mensuelle (100 dictées par jour au plus) », texte du juriste) ; sinon retirer le plafond du jour des plans payants et garder 5 par minute.
2. **Valeur du coupe-circuit global** (3 000 par jour codés). Un abus peut l'atteindre et couper la dictée pour tous.
3. **Lieu du calcul** : mondial (texte actuel), ou `inference_geo` « us » (prix ×1,1 ; textes : « États-Unis »).
4. **Clause de sous-traitance (CGU art. 11)** : recommandé, la publier maintenant (retirer l'enveloppe `FONCTIONS.ia`, nouvelles `CGU_VERSION` et date sans condition) ; ou attendre l'allumage. Lié : la phrase « base légale : le contrat », déjà visible, devrait partir avec une nouvelle version des CGU.
5. **Durée du journal** : 12 mois (codés et annoncés) ou autre.
6. **Écran d'accord** : valider le texte du juriste (§7), puis le construire (accord en base).
7. **Date des CGU le jour de l'allumage** (`src/lib/cgu.js`, « 2026-11-03 », « 3 novembre 2026 ») ; un test le rappelle.
8. **Les trois défauts de « saisie clavier »** (analyse pendant la frappe, texte en double, focus perdu) correspondent-ils à D-07 ?
9. **Décompter ou non** une dictée refusée par le modèle (aujourd'hui décomptée). Une réponse coupée par notre plafond n'est plus décomptée (correction 9).
10. **Qui peut dicter** : owner, admin, comptable (codé, comme `ia-devis`), ou aussi le chef de chantier.
11. **Journal à la suppression d'un compte** : CASCADE codé (phrase de la politique vraie) ; ou garder les lignes et corriger la phrase avec le juriste.
12. **Minimisation** : 60 noms de clients à chaque dictée, ou seulement ceux qui ressemblent au texte dicté.
13. **Ouverture côté serveur** : `IA_DICTEE` sur le compte de test pendant le constat, « tous » le jour de l'allumage.
14. **Avant la clé** : crédits prépayés sans rechargement automatique, limite de dépense mensuelle, DPA et DPF vérifiés, entraînement jamais autorisé.
15. **J1 (juriste) — conservation du texte des demandes** : recommandé, option A, aucun texte conservé (déjà codé) ; la ligne directrice de `cloud/ia-direction` est à aligner.
16. **J4 (juriste) — crédits API de l'offre Max** : selon le juriste du 3 nov. (page « API credits for Max, Ultra, and Team plans »), l'offre Max inclut 100 $ de crédits API par mois (une seule organisation liée, sans report) ; la relecture de cette session n'a pas pu le confirmer : **Hugo le constate dans claude.ai › Réglages › Facturation et dans la Console › Billing** avant de choisir. Choisir : crédits Max, ou compte payant au nom de l'EI. Le §5.2 de ce rapport, qui dit le contraire, est à corriger selon ce choix (texte du juriste prêt).
17. **J5 (juriste) — la TVA quitte le CGI au 1er janvier 2027** (ordonnance n° 2025-1247) : tâche hors IA à ouvrir par la session principale (mentions 293 B, 279-0 bis, 278-0 bis A, 257 des deux générateurs).

### Textes nouveaux soumis au juriste
Tous viennent de ses corrections exactes du 3 nov. : ligne Anthropic et conservation (politique), CGU art. 11 (trois paragraphes), mention IA et phrase du micro (fenêtre de dictée), FAQ de la dictée, texte de l'écran d'accord (§7). Un seul texte est de moi : le message serveur 403 « Votre rôle ne permet pas de créer un devis. » (texte du gardien). Relecture `juriste-btp` de la reprise : ci-dessous.

### Relectures de ces corrections
- **`juriste-btp`** : textes conformes à ses corrections. Il juge que changer la phrase de l'art. 11 (base légale) sans relever `CGU_VERSION` est permis (art. 10 des CGU : correction de forme, aucun droit retiré) ; la correction est notée dans le commentaire de `src/lib/cgu.js`. Deux alignements de documents faits (phrase du micro dans §2, commentaire de LegalPages).
- **`gardien-securite`** : les 8 corrections sont justes et complètes, banc relancé vert (693), aucune régression. Restent, **non corrigés** (choix d'Hugo, aucun ne bloque l'application de 107) :
  1. *moyen* — le coupe-circuit de 3 000 est partagé : environ 150 comptes gratuits (150 × 20) couperaient la dictée aux payants pendant 24 h. Proposition : un budget gratuit à part (par exemple 1 500 par jour, motif `global`). **À régler avant de passer `IA_DICTEE` à « tous ».**
  2. *faible* — une réponse `coupee` ne décompte pas, alors que sa longueur vient de la dictée (jusqu'à 20 appels par jour au coût de sortie maximal au gratuit). Proposition : décompter `coupee`. Lié à la décision 9.
  3. *faible* — le comptage global n'a pas de verrou global : quelques unités de dépassement possibles. Accepté.
  4. *faible* — `IA_DICTEE` sensible à la casse : corrigé (comparaison en minuscules).

### Ce qui reste
- Les points 1 et 2 du gardien ci-dessus (décision d'Hugo).
- L'écran d'accord avant la première dictée (bloquant).
- Le constat des deux PDF pour un brouillon dicté en franchise (parcours `documents`).
- Les décisions ci-dessus, puis la marche du §4.

### Risques
- La v11 en production est ouverte à tout compte connecté si la clé est posée : l'étape 0 du §4 passe avant tout.
- Le coupe-circuit global protège le coût mais peut couper la dictée pour tous en cas d'abus.
- `ON DELETE CASCADE` : un compte supprimé libère ses dictées dans le décompte de l'entreprise du patron (faible : le compte n'existe plus).
- La phrase de l'art. 11 modifiée est visible sans nouvelle version des CGU (décision 4).
