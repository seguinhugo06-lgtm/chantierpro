# Avis juriste du 4 novembre 2026 : branche `cloud/ia-allumage-a` (dictée IA, textes de l'allumage)

> **Versé par la session cloud `cloud/ia-allumage-a` le 4 nov. 2026**, tel que rendu par l'agent `juriste-btp`. Suite donnée, point par point : `docs/cloud/ia-allumage.md`, section « Corrections de la relecture du 4 nov. ». Les numéros de ligne sont ceux de l'arbre relu (avant application des corrections). **Aucun texte officiel n'a pu être lu depuis cette session** (Légifrance et EUR-Lex inaccessibles) : les citations restent à relire au texte par la session locale.

Relecture des textes de la dictée IA (`FONCTIONS.ia = false` aujourd'hui). Elle complète l'avis résumé du même jour (`docs/cloud/ia-allumage.md`, § 2).

**Ce que j'ai pu lire, et ce que je n'ai pas pu lire.** Depuis cette session, `www.legifrance.gouv.fr` et `eur-lex.europa.eu` ne répondent pas (« getaddrinfo ENOTFOUND », consulté le 4 nov. 2026). Ces deux sites doivent être autorisés dans les réglages réseau de la session. **Je n'ai lu ni le Code de la consommation, ni le Code civil, ni le RGPD.** Aucune citation ci-dessous ne vaut « lue au texte ». Je n'ai modifié aucun fichier. Je n'ai pas pu lancer `git diff` (pas d'accès au terminal) : j'ai lu les fichiers tels qu'ils sont dans l'arbre de travail.

## A. Les citations de L121-2, L121-5 et 1190

**Statut : non vérifiées (4 nov.), puis relues au texte officiel le 5 nov. 2026 (avis du lot 4, point 1) : L121-2, 2° (b et c), L121-5, C. civ. 1190 et RGPD art. 28.3 a), dernier alinéa de 28.3 et 28.4 sont conformes aux citations ci-dessous, sauf l'adresse de 1190 (corrigée). Précision de ce même avis : pour une offre muette sur ce qui compte (C.1), le fondement le plus juste est L121-3 (omission d'une « information substantielle »), étendu aux professionnels par L121-5 comme L121-2 ; la conclusion ne change pas. Deux points ont été corrigés après cette relecture : l'exception de 28.3 a) (« si la loi le permet » élargissait le texte : l'exception est réservée à une interdiction « pour des motifs importants d'intérêt public ») et le texte des CGU, art. 11 (`docs/cloud/ia-allumage.md`, « Corrections du juriste (5 nov.) »).**

| Texte | Citation résumée | Ce que je peux en dire, sans lecture du texte |
|---|---|---|
| C. civ. art. 1190 (https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032041260, lu au texte le 05/11/2026 (avis du lot 4) ; l'adresse LEGIARTI000032040954 de l'avis du 4 nov. renvoie à « Pas de contenu disponible ») | « et le contrat d'adhésion contre celui qui l'a proposé. » | De mémoire, c'est la fin de la phrase unique de l'article : « Dans le doute, le contrat de gré à gré s'interprète contre le créancier et en faveur du débiteur, et le contrat d'adhésion contre celui qui l'a proposé. » **Non lu.** |
| C. conso. L121-2, 2° (URL non confirmée) | « Lorsqu'elle repose sur des allégations, indications ou présentations fausses ou de nature à induire en erreur » | De mémoire, ce début du 2° est exact. Il continue par « et portant sur l'un ou plusieurs des éléments suivants : ». Le b) vise les caractéristiques essentielles du service (dont « ses propriétés et les résultats attendus de son utilisation »). Le c) vise « le prix ou le mode de calcul du prix », et les conditions de vente. **Non lu ; je ne recopie pas b) et c) mot pour mot.** |
| C. conso. L121-5 (URL non confirmée) | « aux pratiques qui visent les professionnels et les non-professionnels. » | Pistes secondaires seulement, qui ne prouvent rien. Un rapport du Sénat sur la ratification de l'ordonnance n° 2016-301 indique que l'article a été modifié pour ajouter « et les non-professionnels ». Une traduction privée rend l'article ainsi : « les articles L. 121-2 à L. 121-4 sont également applicables aux pratiques qui visent les professionnels et les non-professionnels ». La fin de phrase résumée est donc **plausible, mais non lue**. |

**Pourquoi ces articles comptent ici.** Les clients de Mallettico sont des professionnels. C'est L121-5 qui leur rend applicable L121-2. Sans cette extension, l'argument « pratique trompeuse » tombe pour l'offre aux artisans, et seul 1190 resterait. La citation de L121-5 est donc à relire en priorité.

**RGPD art. 28.3 a), dernier alinéa du 28.3, et 28.4** : EUR-Lex est illisible aujourd'hui. L'avis du 25 oct. 2026 n'avait lu que 28.1, le début de 28.3 et 28.9 (page CNIL). Les passages utilisés au point B.3 sont cités de mémoire.

## B. Textes relus

### B.1 En-tête de la dictée en mode démo — à corriger (risqué)

- **Affiché** (`src/components/voice/DicteeModal.jsx:577`) : « Mode démonstration : analyse simplifiée, sans IA ; rien n’est envoyé à Mallettico ni à une IA. »
- **Contradiction** avec `DicteeModal.jsx:656-657` (affiché aussi en démo) : « votre navigateur le transforme en texte (sur Chrome, par les serveurs de Google) ».
  - La reconnaissance vocale de Google est elle-même un système automatisé. « Ni à une IA » peut donc être faux sur Chrome.
  - Mallettico ne peut pas prouver le contraire (D-02, affirmation invérifiable).
- **Ce qui est vrai.** En démo, l'analyse se fait sur l'appareil, sans appel au serveur (`src/lib/voiceIntent.js:127-128`). Le texte dicté ne part donc pas chez Mallettico.
- **Source** : C. conso. L121-2, 2°, b (caractéristiques du service, non lu, voir A). Règlement (UE) 2024/1689, art. 50 § 1 (non relu aujourd'hui).
- **Correction**, `DicteeModal.jsx:577` :
  > Mode démonstration : analyse simplifiée, faite sur votre appareil, sans IA. Votre texte n’est pas envoyé à Mallettico.
- **À améliorer**, `DicteeModal.jsx:657`. Sur Safari, la reconnaissance vocale passe par le navigateur et le système. Je n'ai pas vérifié où va le son. Texte proposé, qui reste vrai partout :
  > Votre navigateur va demander l’accès au micro. Mallettico ne reçoit pas le son : votre navigateur le transforme en texte, parfois sur les serveurs de son éditeur (sur Chrome, ceux de Google).
- `DicteeModal.jsx:790` (« Mode démonstration : analyse simplifiée, sans IA. ») : **conforme**.
- `docs/cloud/ia-allumage.md:61` cite encore l'ancien texte (« rien n’est envoyé. ») : à mettre à jour avec la correction.

### B.2 Paragraphe du micro hors démo — conforme

- **Affiché** (`DicteeModal.jsx:658`) : « Ce texte nous est envoyé, avec les noms de vos clients et les libellés de votre catalogue, puis analysé par une intelligence artificielle (Claude, d’Anthropic). »
- Il est cohérent avec l'écran d'accord et la politique (art. 2 et 4), et avec la phrase d'avant (« Mallettico ne reçoit pas le son »). « Nous » désigne bien Mallettico.
- **Source** : RGPD art. 13.1 e) (destinataires), non relu aujourd'hui. Règlement 2024/1689, art. 50 § 1.

### B.3 CGU, art. 11 (sous l'interrupteur) — à corriger (à améliorer : lecture et ponctuation)

**Phrase 1** (`src/components/legal/TexteCgu.jsx:216`). Mon insertion se lit mal. Le « , et l'avertit immédiatement… » qui la suit semble alors dépendre de « sauf obligation ». Or l'alerte sur une instruction illicite est une obligation à part (RGPD art. 28.3, dernier alinéa, non relu). « Dont il l’informe » est correct, mais le sujet est loin. Remplacer :

> …y compris les transferts décrits à l'article 4 de la Politique de confidentialité, sauf obligation du droit de l’Union ou du droit français, dont il l’informe avant le traitement si la loi le permet, et l'avertit immédiatement si une instruction lui paraît contraire…

par :

> …y compris les transferts décrits à l'article 4 de la Politique de confidentialité, sauf obligation du droit de l’Union ou du droit français, dont il informe l'utilisateur avant le traitement si la loi le permet ; l'avertit immédiatement si une instruction lui paraît contraire…

**Phrase 2** (`TexteCgu.jsx:219`). Deux défauts :
- « (RGPD, art. 28.4) » apparaît deux fois de suite ;
- « aux mêmes obligations » ne dit pas lesquelles.

Remplacer :

> …selon la liste qu'ils publient, tous tenus par contrat aux mêmes obligations de protection des données (RGPD, art. 28.4) ; Mallettico reste pleinement responsable envers l'utilisateur de leur exécution (RGPD, art. 28.4).

par :

> …selon la liste qu'ils publient, tous tenus par contrat aux mêmes obligations de protection des données que Mallettico envers l'utilisateur ; Mallettico reste pleinement responsable envers l'utilisateur de l'exécution de ces obligations par ces sous-traitants (RGPD, art. 28.4).

Typographie : la ligne 216 mélange les apostrophes ’ et '. À unifier, sans effet juridique.

### B.4 Erreur de l'écran d'accord — à améliorer

- **Affiché** (`src/components/voice/AccordIaModal.jsx:28`) : « Votre accord n’a pas pu être enregistré. Vérifiez votre connexion et réessayez, ou saisissez votre devis à la main. »
- Le texte est exact sur le fond : la dictée ne s'ouvre pas sans accord enregistré. Mais « vérifiez votre connexion » suppose une cause. Le refus peut aussi venir de la borne de 10 accords par jour (migration 109). Le texte ne dit pas non plus que rien n'est parti, alors que c'est la garantie donnée.
- **Source** : RGPD art. 12.1 (information claire), non relu aujourd'hui.
- **Correction**, `AccordIaModal.jsx:28` :
  > Votre accord n’a pas pu être enregistré, et rien n’a été envoyé. Réessayez dans un moment, ou saisissez votre devis à la main.

### B.5 Paramètres › Données (`src/components/settings/AccordIaReglage.jsx`)

- **l. 43**, « Aucun accord en cours. Il vous sera demandé avant votre prochaine dictée. » : **conforme**.
- **l. 50-55**, « Vous avez accepté l’analyse de vos dictées par une intelligence artificielle (Claude, d’Anthropic) le … » suivi du texte du 4 nov. : **conforme**, à une condition. La date affichée doit être celle de l'accord **en cours**, prise sur le serveur (`depuis`), et non celle du premier accord. Point technique à confirmer par la session. Les apostrophes ’ et ' sont mélangées.
- **l. 32**, « Accord retiré : il vous sera redemandé avant votre prochaine dictée. » : **conforme**. Le serveur relit l'accord à chaque appel (`regles.ts:181`).
- **l. 28**, à améliorer. « Le retrait de votre accord n’a pas pu être enregistré. Réessayez. » ne dit pas que les envois continuent. L'artisan doit le savoir. Source : RGPD art. 12.1 et 21, non relus aujourd'hui. Correction :
  > Le retrait de votre accord n’a pas pu être enregistré : votre accord reste en cours. Réessayez.

### B.6 Les quatre textes non relus de `docs/cloud/ia-allumage.md` (§ 2)

**a) Fenêtre des CGU** (`src/components/CGUAcceptanceModal.jsx:73` et `:69`) : **conforme**.
- « Avant votre première dictée, lisez et acceptez les conditions d’utilisation de Mallettico. »
- « … acceptez-les pour utiliser la dictée. Vos données et vos documents restent accessibles et exportables, que vous acceptiez ou non. »
- La ligne 73 ne s'affiche que si aucune version n'a jamais été acceptée, donc avant toute dictée. Source : C. civ. 1119 (avis du 25 oct. 2026, G2).

**b) Message `ACCORD_REQUIS`** (`supabase/functions/voice-intent/regles.ts:58`) : **à corriger (risqué : information inexacte)**.
- Affiché : « Avant votre première dictée, il faut accepter l’analyse par l’intelligence artificielle. Touchez « Dicter » pour lire l’écran d’accord. »
- Ce message n'arrive que dans deux cas : l'accord a été retiré sur un autre appareil, ou la version du texte a changé. Ce n'est donc **jamais** la « première dictée ».
- « Touchez « Dicter » » contredit le bouton affiché juste à côté (`DicteeModal.jsx:733`).
- Le serveur a reçu le texte puis l'a refusé avant tout envoi. Il faut écrire « rien n'a été transmis à Anthropic », et non « rien n'a été envoyé ».
- Source : RGPD art. 12.1 ; C. conso. L121-2 via L121-5 (non lus, voir A).
- Correction, `regles.ts:58` (le test `voiceIntentServeur.test.js:293` lit `MESSAGES.accordRequis` et suit le changement) :
  > Votre accord pour l’analyse par l’intelligence artificielle n’est pas enregistré : il a été retiré, ou le texte de l’écran d’accord a changé. Rien n’a été transmis à Anthropic. Relisez l’écran d’accord, ou saisissez votre devis à la main.
- Bouton « Lire l’écran d’accord » (`DicteeModal.jsx:733`) : **conforme**.

**c) FAQ de la dictée** (`src/App.jsx:2523`) : **à améliorer**.
- « La première fois » est incomplet : l'écran revient aussi après un retrait ou un nouveau texte. Remplacer :
  > La première fois, un écran vous explique ce qui est envoyé et vous demande votre accord.

  par :
  > Avant votre première dictée, et de nouveau si vous retirez votre accord, un écran vous explique ce qui est envoyé et vous demande votre accord.
- Pour les quotas, voir C.
- Le commentaire `App.jsx:2522` (« À compléter selon la décision d'Hugo sur le plafond… ») est à garder tant que Q2 n'est pas tranchée.

**d) Fenêtre d'offre** (`src/stores/subscriptionStore.js:252-255`) : **conforme**.
- Le titre « Vos dictées du mois sont utilisées » et le sous-titre sont exacts.
- Hors droit, à vérifier par la session : `recommendedPlan: 'artisan'` propose à un abonné Artisan, à sa 101e dictée, le plan qu'il a déjà.
- Pour les quotas, voir C.

**e) Texte de la démo** : voir B.1.

## C. Fait nouveau (migration 107) et textes de l'offre

Ce que je lis dans `supabase/migrations/107_quota_ia.sql:244-252` et `regles.ts:239-242` :

1. **Une réponse coupée par le plafond de jetons (`coupee`) compte dans le quota mensuel**, comme `refus` et `illisible`.
   - L'artisan voit alors `MESSAGES.illisible` : « L’analyse a échoué. Réessayez, ou saisissez votre devis à la main. »
   - Ce message l'invite à recommencer la même dictée. Elle sera encore coupée et comptera encore.
2. **Aux plans payants, le quota mensuel est compté par abonnement.** Il couvre toutes les organisations du même abonné et tous leurs membres. Au plan Gratuit, il couvre l'organisation, plus les dictées du même compte dans ses autres organisations gratuites.

**Est-ce que cela change les textes ? Oui, sur trois points.**

**C.1 Ce qui compte comme une dictée — à corriger (risqué).** « 100 dictées par mois » ne dit pas qu'une analyse ratée compte. Dans un contrat d'adhésion, le doute se lit contre Mallettico (C. civ. 1190). Une offre muette sur ce point touche aussi au « mode de calcul du prix » (L121-2, 2°, c, via L121-5). Ces articles n'ont pas été lus, voir A.

- **CGV, art. 4** (`src/lib/cgv.js`, texte « avec IA », après les trois descriptions des l. 67-77), ajouter :
  > Dictées : une dictée compte dès qu’elle est analysée, y compris quand l’analyse échoue à cause de la dictée elle-même (trop longue, incompréhensible ou refusée par l’intelligence artificielle). Une panne de Mallettico ou de son prestataire ne compte pas. Le compteur repart à zéro le 1er de chaque mois, heure de Paris.

  À vérifier avant de poser ce texte :
  - le délai dépassé ne compte pas aujourd'hui (`regles.ts:12`), mais c'est une décision d'Hugo encore ouverte. Si elle change, ce texte change ;
  - le mois est compté heure de Paris (en-tête de 107, l. 8-9).
- **FAQ** (`App.jsx:2523`), à la fin de la réponse, ajouter :
  > Une dictée trop longue ou incompréhensible compte quand même ; une panne de notre côté ne compte pas.
- **Message de la réponse coupée** (`regles.ts:242`). Il faut un message à part, par exemple `MESSAGES.coupee` :
  > Votre dictée est trop longue pour être analysée en une fois. Elle compte dans vos dictées du mois. Coupez-la en deux, ou saisissez votre devis à la main.

  Le message `illisible` reste pour l. 251.

**C.2 Le texte « pour l'entreprise » de la question 3 n'est plus exact aux plans payants.** Le compteur suit l'abonnement, pas l'entreprise. Si Hugo choisit de préciser qui partage le quota, le texte exact devient :
- `subscriptionStore.js:105`, `cgv.js:72`, `regles.ts:40`, sous-titre `subscriptionStore.js:255`, `App.jsx:2523` :
  > 100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises
- `subscriptionStore.js:61`, `cgv.js:67`, `App.jsx:2523` :
  > 5 dictées par mois, partagées entre les utilisateurs de l’entreprise

  Ce texte reste approximatif au plan Gratuit : les dictées d'un compte dans ses autres entreprises gratuites comptent aussi. Pour l'écrire en entier, ajouter dans les CGV :
  > au plan Gratuit, vos dictées dans vos autres entreprises au plan Gratuit comptent aussi.
- `limitesDictees.js:19` (« 5 par mois », « 100 par mois ») : même choix, sur la page des tarifs.
- Équipe : rien à changer. Le plafond du jour est compté par compte (`107:231-233`), donc « par personne » est exact.

**C.3 Commentaires (non affichés).** `regles.ts:21` et le `COMMENT ON TABLE` de `107:90` disent « par organisation ». Aucun effet juridique, mais à aligner.

Tout cela fait partie du texte « avec IA », pas encore publié. Le corriger avant le commit B ne demande pas de version de CGV en plus.

## Points vérifiés conformes

- B.2 (micro hors démo).
- B.5, l. 32 et 43, et l. 50-55 sous la réserve de la date.
- B.6 a (fenêtre des CGU), le bouton « Lire l’écran d’accord », B.6 d (fenêtre d'offre).
- `DicteeModal.jsx:790`.
- Équipe, « 100 par jour et par personne au plus » : exact au regard du code (`107:226-236`).

## À décider par Hugo (non tranché)

1. **(question 3, ex-« 1-b ») Dire qui partage le quota mensuel.** Le fait nouveau change les options : « pour l'entreprise » n'est plus exact aux plans payants (voir C.2). Les choix sont :
   - le texte de C.2 (« par abonnement, partagées… ») ;
   - laisser « 100 dictées par mois » et préciser seulement dans les CGV.

   Dans les deux cas, à faire avant le commit B.
2. **(question 2) Le plafond du jour compte nos échecs**, pannes comprises (`107:225`, « chaque appel compte, même en échec »). Le message dit « analyses ». L'offre dit « (100 par jour et par personne au plus) » à côté du mot « Dictées ». Deux options :
   - garder, et écrire dans les CGV « 100 analyses par jour et par personne, échecs compris » ;
   - ne compter que les dictées décomptées.

Restent ouvertes, sans changement : la question 1 (un abonné a-t-il déjà vu une dictée « sans limite » ?) et la décision sur le décompte du délai dépassé (elle conditionne le texte de C.1).

## Vérifications au texte (à consigner)

- **4 nov. 2026** : Légifrance et EUR-Lex inaccessibles depuis la session cloud. **Aucune vérification au texte faite.** L121-2, L121-5, C. civ. 1190 et RGPD art. 28.3 a), 28.3 dernier alinéa et 28.4 restent **à relire**.
- Je ne peux pas écrire dans `docs/metier-btp.md` : aucun point « à vérifier » n'est tranché.
