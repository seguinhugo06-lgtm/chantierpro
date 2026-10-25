# Avis juriste-btp — Task 5 « coque et accueil » (commit 319c95b4, base cbae813b)

Relecture du 25 oct. 2026, en lecture seule (aucun fichier du dépôt modifié).

**Périmètre lu.**
- Le diff `/private/tmp/claude-501/t5-textes.diff` (App.jsx, CGUAcceptanceModal.jsx, CookieConsent.jsx, Dashboard.jsx) et le rapport de l'implémenteur (§ 5, 6, 7).
- Le code source en entier pour tout ce que le diff ne montre pas : `CookieConsent.jsx`, `CGUAcceptanceModal.jsx`, le formulaire d'inscription (`App.jsx` l. 1355-1470), `HelpModal` et `OnboardingModal` (`App.jsx` l. 2262-2680), `Dashboard.jsx`, `LegalPages.jsx` (CGU, politique de confidentialité), `analytics.js`, `sentry.js`, `PWAUpdatePrompt.jsx`, `public/offline.html`.
- Le parcours des documents créés (`DevisPage`, `ramonage/`) et l'historique git de `index.html`.

**Conclusion : aucun BLOQUANT aujourd'hui.** Le commit peut rester sur la branche. Il y a 26 points « À CORRIGER » (beaucoup sont légers), dont 9 corrections de texte à faire tout de suite (colonne « Texte de remplacement » : elles tiennent en une chaîne chacune).

Deux points deviendraient BLOQUANTS sans que le code change :
- l'activation de Plausible ou de Sentry avec Replay, tant que le bandeau n'est pas refait (C5, C12) ;
- l'ouverture de l'app à des abonnés extérieurs tant que l'acceptation des CGU n'est pas posée à l'inscription et que l'accord de sous-traitance (RGPD art. 28) n'existe pas (G1, G4, G5).

**Trois constats qui changent la lecture de la Task 5.**

1. **Plausible ne tourne pas.** Le script a été retiré de `index.html` le 16 mars 2026 (commit 227534e3, il portait en plus le mauvais domaine `batigesti.vercel.app`). Rien ne le recharge : `analytics.js` ne fait donc rien (`window.plausible` n'existe jamais). Le bandeau, l'article 6 de la politique de confidentialité et le journal des versions décrivent pourtant un outil actif. L'interrupteur « Cookies analytiques » du bandeau ne commande rien.
2. **Le bandeau n'a aucun moyen de revenir sur son choix.** Le bouton « Cookies » de réouverture est du code mort (`showReopenButton` n'est jamais vrai). Aucun lien « Gérer les cookies » n'existe dans les Réglages ni dans le pied de page. La politique de confidentialité (art. 6) promet pourtant « depuis les paramètres de l'application ».
3. **Le « premier document » ne couvre pas tout.**
   - Le filet est `addDevis` de `App.jsx`. Le parcours ramoneur passe par `useData().addDevis` (`ramonage/OngletRamonage.jsx` l. 33, `FicheAttestation.jsx` l. 67), qui ne demande rien.
   - L'attestation de ramonage, la facture tirée de l'attestation et l'envoi automatique des rappels par e-mail aux clients de l'artisan se font donc sans jamais passer par les CGU.
   - Le formulaire d'inscription ne mentionne ni les CGU ni la politique de confidentialité (aucun lien, aucune case).

## Tableau des points

### Bandeau cookies (question 1)

| N° | Point | Verdict | Raison | Source | Texte de remplacement |
|---|---|---|---|---|---|
| C1 | « RGPD conforme » retiré | OK | Bon retrait : la CNIL ne délivre pas de label et l'écran ne prouve rien. Cohérent avec `.claude/rules/marketing.md` (jamais « conformes RGPD »). | Règle du dépôt ; page CNIL « Solutions pour la mesure d'audience » (les éditeurs ne peuvent pas se dire « validés par la CNIL ») | aucun |
| C2 | Catégorie « marketing » retirée ; « Accepter tout » n'enregistre plus `marketing: true` | OK | Exact. Aucun pixel, tag publicitaire ni outil tiers dans `src/` ni `index.html` (recherche faite : gtag, fbq, hotjar, clarity, posthog, mixpanel, segment, `_vercel/insights` : rien). Le paiement passe par une redirection vers Stripe, `js.stripe.com` n'est pas chargé dans l'app. Cohérent avec la politique (art. 6 : « pas de cookies publicitaires ni de tracking tiers »). | Loi 78-17 art. 82 ; recherche dans le dépôt | aucun |
| C3 | « Refuser » et « Accepter tout » au même niveau et de même poids ; « Personnaliser » au premier niveau ; cases décochées | OK | Conforme à la recommandation : refus aussi simple que l'acceptation, mêmes boutons, même format, même mise en évidence ; accès au choix finalité par finalité depuis le premier niveau. | Délibération CNIL 2020-092 du 17/09/2020, § 27-32 et 34 | aucun |
| C4 | Texte d'introduction : « …pour assurer le bon fonctionnement de Mallettico et améliorer votre expérience » | À CORRIGER | Une finalité « améliorer votre expérience » ne dit pas ce à quoi l'on consent : la recommandation demande des finalités « intelligibles… pour comprendre précisément ». Le texte dit aussi « cookies » alors que l'app n'en pose pas (session en `localStorage`) ; l'art. 82 vise tout traceur, la CNIL parle de « cookies et autres traceurs ». | Loi 78-17 art. 82 al. 1 (information claire et complète sur la finalité) ; CNIL 2020-092 § 12-13 | Voir **R-C1** |
| C5 | Catégorie « Cookies analytiques — Plausible Analytics — données anonymisées, pas de cookies tiers… » | À CORRIGER (BLOQUANT le jour où l'on active quoi que ce soit) | Elle décrit un service qui n'est pas chargé depuis le 16 mars 2026 (commit 227534e3 ; aucun chargeur dans `src/`, `index.html`, `dist/`). L'interrupteur ne commande rien : c'est un placebo, et le texte annonce un traitement qui n'existe pas. Aucun consentement n'est contourné (rien n'est lu ni écrit), le défaut est un défaut d'exactitude. | Loi 78-17 art. 82 ; règle « rien d'invérifiable » (CLAUDE.md, marketing.md) ; `git show 227534e3 -- index.html` | **Option A recommandée** : retirer la catégorie et le bandeau tant qu'aucun traceur facultatif n'existe (voir **R-C2** et la question Q1 pour Hugo). Option B : charger Plausible d'abord, puis garder la catégorie reformulée (**R-C1**). |
| C6 | Faut-il une catégorie « mesure d'audience » en plus ? | OK : non | La catégorie « analytiques » est déjà celle-là ; une seconde n'apporterait que de la confusion. Plausible sans cookie ne dispense pas par principe : l'art. 82 couvre toute lecture ou écriture dans le terminal, et la CNIL n'exempte la mesure d'audience que si ses conditions sont réunies (voir Vérifications). Elle ne publie aucune liste d'outils validés : je ne peux pas écrire « Plausible est exempté ». Surtout, `analytics.js` envoie des événements de produit (Signup, Checkout Started, Plan Upgraded, Feature Used, PDF Downloaded…) : c'est du suivi d'entonnoir, au-delà de la mesure de fréquentation. Les garder sous consentement, comme le fait déjà `track()` (`consent.analytics`), est le bon montage. | CNIL, page « Mesurer la fréquentation de vos sites web et de vos applications » (lue le 25/10/2026) ; art. 82 | Renommer la catégorie « Mesure d'audience » seulement si Plausible est rechargé (R-C1). Si Hugo veut juste compter les comptes et les devis : des comptages en base (Supabase) ne lisent rien dans le terminal de l'utilisateur et n'ont besoin d'aucun bandeau. |
| C7 | La croix du bandeau refuse (`aria-label` « Fermer (refuser les cookies facultatifs) ») mais rien ne le dit à l'écran | À CORRIGER (léger) | Le nom accessible est juste, mais la recommandation veut que la possibilité de refuser par fermeture soit « clairement indiquée » sur la fenêtre, faute de quoi l'utilisateur ne sait pas ce que sa fermeture signifie. | CNIL 2020-092 § 33 | Une phrase visible : « Fermer cette fenêtre revient à refuser. » (incluse dans R-C1) |
| C8 | Aucun moyen de retirer ou changer son choix ; la politique (art. 6) promet « depuis les paramètres de l'application » | À CORRIGER | Faux aujourd'hui : le bouton de réouverture est mort et aucun lien n'existe. Retirer son consentement doit être aussi simple que le donner, avec un accès « à tout moment ». Tant qu'aucun traceur facultatif ne tourne, le défaut est sans effet pratique, mais la phrase de la politique est inexacte. | RGPD art. 7.3 ; CNIL 2020-092 § 40-44 | Option A : supprimer la phrase (R-C2). Option B : lien « Gérer les cookies » dans le menu du compte et le pied du site, qui rouvre le bandeau (le code `handleReopen` existe déjà), puis garder la phrase. |
| C9 | Choix gardé 12 mois (`TWELVE_MONTHS_MS`) | OK | Écart à une bonne pratique, pas à la loi : la CNIL juge que 6 mois, pour le consentement comme pour le refus, est une bonne pratique. Les 13 mois de la politique visent la durée des traceurs, pas celle du choix. À faire seulement si le bandeau est conservé. | CNIL 2020-092 § 35-39 | Option B : `6 * 30 * 24 * 60 * 60 * 1000` |
| C10 | Sur l'accueil du site et les pages publiques, `<CookieConsent />` est monté sans `setPage` (App.jsx l. 1277 et 1297) : pas de lien « Politique de confidentialité » dans le bandeau pour un visiteur | À CORRIGER (léger) | C'est le premier écran vu par un visiteur, et le seul où l'information complète manque. | Art. 82 (moyens de s'opposer, information complète) | Passer `setPage={onNavigate}` du site (page « confidentialite »). Sans objet si l'option A est retenue. |
| C11 | Politique de confidentialité art. 6 : « Cookies de performance : mesure d'audience anonymisée… Base légale : consentement » | À CORRIGER | Même défaut que C5 : un traitement décrit au présent qui n'existe pas. Plausible n'est pas non plus dans la table des sous-traitants (art. 4). | RGPD art. 13.1 c) et e) ; `LegalPages.jsx` l. 616-626 | Voir **R-C2** (option A) ; en option B, ajouter Plausible à l'art. 4 et garder l'article 6 |
| C12 | Sentry avec Replay (1 % des sessions, 100 % sur erreur) à activer ensuite (`etat-production.md`, tâche `rgpd-soustraitance`) | OK aujourd'hui ; BLOQUANT avant activation | Sentry est inactif en production (pas de DSN). Replay garde un identifiant de session dans le terminal et enregistre ce que fait l'utilisateur : ce n'est pas du « strictement nécessaire » à la demande de l'utilisateur. Avant d'activer : soit sans Replay, soit sous consentement (catégorie « Diagnostic des erreurs » du bandeau), et le sous-traitant ajouté à la politique. | Art. 82 ; `sentry.js` l. 38-46 | À décider avec l'activation (voir Q1) |

### Acceptation des CGU (question 2)

| N° | Point | Verdict | Raison | Source | Texte de remplacement |
|---|---|---|---|---|---|
| G1 | Moment de l'acceptation : au premier document, plus à l'arrivée | À CORRIGER — **recommandation : à l'inscription** | Des conditions générales n'ont d'effet à l'égard de l'autre partie que si elle les a portées à sa connaissance et acceptées. Le « premier document » laisse entre l'inscription et lui un temps d'usage non couvert : profil, clients, chantiers, catalogue, planning, équipe, réglages de relances, rappels de ramonage. Pendant ce temps, la limitation de responsabilité (art. 7), les obligations de l'utilisateur et la licence sur les données (art. 6 de la page) ne le lient pas, et c'est à Hugo de prouver l'acceptation. Le choix de la Task 5 n'est pas illégal en soi (offre gratuite, aucun paiement), mais il est moins protecteur que l'ancien comportement (fenêtre dès la fiche entreprise) et il ouvre trois fuites (G3). **Le plus sûr et le plus simple : une case à l'inscription**, au moment où tout utilisateur l'attend, sur le même écran, sans fenêtre surprise : la plainte d'Hugo (la fenêtre au clic sur la couleur) disparaît aussi. La fenêtre actuelle reste pour les comptes déjà créés sans acceptation et pour les nouvelles versions. | C. civ. 1119 (version en vigueur depuis le 1/10/2016) ; C. civ. 1353 (charge de la preuve) | Voir **R-G1** (case et mention d'information) |
| G2 | Les CGU disent que l'inscription vaut acceptation, le mécanisme dit l'inverse | À CORRIGER | Fenêtre, art. 1 : « En créant un compte ou en utilisant le service, l'utilisateur accepte sans réserve ». Page `/cgu`, art. 2 : « L'inscription sur Mallettico vaut acceptation sans réserve ». Or l'acceptation réelle est demandée plus tard. Une clause qui contredit la pratique se lit contre son auteur, et ne remplace pas l'acceptation exigée par 1119. | C. civ. 1119, 1190 | Voir **R-G3** |
| G3 | « Tout document passe par `addDevis` » (rapport § 5) : faux pour le parcours ramoneur ; `aJour` vaut `true` pendant le chargement de l'entreprise | À CORRIGER | `OngletRamonage` et `FicheAttestation` utilisent `addDevis` de `useData()` : la facture tirée d'une attestation, la plus probable pour un ramoneur (D-30, sans devis), est créée sans acceptation. L'attestation et l'envoi automatique des rappels par e-mail aux clients de l'artisan (Mallettico écrit en son nom, via Resend) sont des actes qui engagent Mallettico et ne passent par aucun garde. Dans `App.jsx`, `cguRef.current.aJour` inclut `entrepriseLoading` : un clic pendant le chargement saute la fenêtre. | `ramonage/OngletRamonage.jsx` l. 33 ; `FicheAttestation.jsx` l. 67 ; `App.jsx` l. 569-573 | Pour le code (hors de mon périmètre) : l'acceptation à l'inscription (G1) supprime ces trois fuites d'un coup. À défaut : `exigerCgu()` avant l'activation des rappels automatiques, avant l'attestation et dans l'enveloppe de `addDevis` du ramonage ; `entrepriseLoading` ne vaut pas « accepté ». |
| G4 | Des données de clients saisies avant toute acceptation ; RGPD art. 28 | À CORRIGER (ouvrir/avancer la tâche `rgpd-soustraitance`) | Pour les clients de l'artisan, l'artisan est responsable du traitement et Mallettico son sous-traitant. Le traitement est « régi par un contrat » (art. 28.3), qui peut être électronique (28.9). Aujourd'hui, aucun texte accepté ne contient les clauses de l'art. 28 : la fenêtre (art. 5-6) et la page `/cgu` parlent des données de l'utilisateur, pas de celles de ses clients ; la politique se déclare sous-traitant (art. 2, ramonage) sans contrat qui la fonde. Le défaut existe donc quel que soit le moment, mais l'acceptation au premier document l'aggrave : un artisan peut saisir des dizaines de clients, leurs appareils, leurs adresses, avant tout contrat. Aucun texte ne fixe le moment où le contrat doit exister ; la lecture prudente est qu'il précède la première saisie de données d'un client (non vérifiée dans les lignes directrices du CEPD 07/2020, non relues). | RGPD art. 28.1, 28.3, 28.9 (texte lu sur cnil.fr le 25/10/2026) | **Ordre à suivre** : (1) rédiger l'annexe « accord de traitement des données » (objet, durée, nature, finalité, catégories de données et de personnes, instructions, confidentialité, sécurité, sous-traitants ultérieurs listés, aide aux droits, suppression à la fin, audit) ; (2) la rattacher aux CGU ; (3) la faire accepter par la même case que les CGU, à l'inscription (R-G1). Je peux en écrire le texte dans la tâche. |
| G5 | Le formulaire d'inscription ne donne aucune information RGPD ni lien vers les CGU/la politique | À CORRIGER | À la création du compte, Mallettico recueille directement e-mail, nom et mot de passe : l'information (identité du responsable, finalités, droits, durée) doit être donnée « au moment où les données sont obtenues ». Un renvoi vers la notice complète est admis si les éléments essentiels figurent. Existant avant la Task 5, mais c'est le moment de le régler avec la case. | RGPD art. 13 ; CNIL « Exemples de mentions d'information » | Voir **R-G1** (mention sous le formulaire) |
| G6 | Fenêtre, variante `premier` : « Avant votre premier document, lisez et acceptez les conditions d'utilisation de Mallettico. » | OK | Exact tant que la fenêtre ne sert qu'aux comptes sans acceptation. | — | aucun |
| G7 | Fenêtre, variante `version` : « Les conditions ont changé : lisez et acceptez la nouvelle version pour continuer. » | À CORRIGER (léger) | Ne dit ni la version, ni ce que devient l'utilisateur qui refuse. Un refus bloque la création de documents : il faut dire que ses données restent accessibles et exportables. La page `/cgu` promet 30 jours de préavis par e-mail pour une modification substantielle (art. 10) : l'acceptation immédiate à l'écran n'y déroge pas pour les anciens comptes, mais l'e-mail doit partir (procédure R3 de l'avis du 24 oct.). | C. civ. 1119 ; avis du 24/10/2026, H2 et R3 | Voir **R-G2** |
| G8 | « Acceptation non enregistrée. Vérifiez votre connexion, puis réessayez. » | OK sauf pour un membre invité : À CORRIGER | Honnête pour une panne réseau. Mais un membre invité ne peut pas écrire la fiche de l'entreprise (rapport § 6, point 2) : son blocage vient d'un droit, pas de sa connexion. Le message l'enverrait vérifier son réseau en boucle. | Règle « la panne verte » (CLAUDE.md) | Voir **R-G2** (message pour le membre) |
| G9 | « Document non créé : les conditions d'utilisation n'ont pas été acceptées. » ; « Annuler » | OK | Dit exactement ce qui s'est passé. | — | aucun |
| G10 | Preuve de l'acceptation : `cgu_accepted_at` et `cgu_version` sur la fiche entreprise | À CORRIGER (léger) | Date et version suffisent comme début de preuve entre professionnels, mais le texte de la version `2025-02` n'est archivé que dans l'historique git et deux textes de CGU coexistent (H1 de l'avis du 24/10, toujours ouvert). Qui a coché n'est pas gardé. | C. civ. 1119, 1353, 1366 | Garder le texte de chaque version consultable (`/cgu/2025-02` ou `docs/`) ; à l'inscription, enregistrer aussi la date dans les métadonnées du compte (`signUp(…, { nom, cgu_version, cgu_accepted_at })`). |
| G11 | Deux textes de CGU (fenêtre v2025-02 et page `/cgu`) toujours divergents ; art. 2 et 10 de la page contradictoires ; art. 4 de la fenêtre (« tarifs… modifiés avec un préavis de 30 jours ») sans l'exception du tarif fondateur | À CORRIGER (rappel) | Ouverts depuis l'avis du 24/10 (H1, H2, R1). La Task 5 touche à la fenêtre et laisse le texte tel quel : la fenêtre reste le seul texte accepté. | C. civ. 1119, 1190 ; avis du 24/10/2026 | Reprendre H1, H2 et R1 de `docs/avis-juriste-2026-10-24.md` dans la même tâche que G1. |
| G12 | Fenêtre, art. 6 : « Les données sont hébergées dans l'Union Européenne » | À CORRIGER (léger) | Vrai pour la base (Supabase, Paris), inexact pour l'ensemble : le site est servi par Vercel (États-Unis/CDN) et les e-mails passent par Resend (États-Unis) ; la politique (art. 4) le dit bien avec les clauses contractuelles types. | `LegalPages.jsx` l. 548-590 ; règle marketing.md (« ne pas écrire données hébergées en France ») | « Les données de votre compte sont stockées dans une base hébergée à Paris. Certains prestataires techniques (envoi d'e-mails, diffusion du site) peuvent les traiter hors de l'Union, dans le cadre de clauses contractuelles types : la liste est dans la politique de confidentialité. » |

### Accueil d'un compte neuf et bienvenue (question 3)

| N° | Point | Verdict | Raison | Source | Texte de remplacement |
|---|---|---|---|---|---|
| A1 | « Pour envoyer votre premier devis » ; étapes « Compléter mon profil », « Ajouter mon premier client », « Créer mon premier devis » ; boutons « Compléter », « Ajouter un client », « Créer le devis » | OK | Aucune promesse : ce sont des actions. « Manque : … » reprend la liste exacte du contrôle d'envoi (`profilManquant`). | — | aucun |
| A2 | « Les mentions obligatoires sont prêtes » (profil complet) | À CORRIGER | Affirme que toutes les mentions obligatoires sont réunies. `PROFIL_EXIGE` ne contient que SIRET, adresse, nom, forme juridique, nom de l'EI, décennale, téléphone, e-mail. Capital, RCS et TVA intracommunautaire (comptés dans la jauge des Réglages depuis le 10 oct.) n'y sont pas ; la liste n'est pas toute la loi. C'est une affirmation de complétude voisine du « conforme » que le projet s'interdit. | Règle CLAUDE.md (« jamais afficher… « conforme » ») ; `profilLegal.js` | « Les informations exigées avant l'envoi sont renseignées » |
| A3 | « Il partira dès que votre profil sera complet », affiché même quand le profil est complet | À CORRIGER (léger) | Exact tant que le profil manque ; contradictoire ensuite. | — | Profil complet : « Votre profil est prêt : il pourra partir dès qu'il est rédigé » ; sinon, texte actuel |
| A4 | « Son nom et son e-mail suffisent pour commencer » | OK | « Pour commencer » est exact : l'e-mail n'est exigé que pour envoyer par e-mail. | — | aucun |
| A5 | « N devis envoyé(s) », « Avancement N % », « Aucun retard », « Premier mois suivi », « Tout envoyer » et sa confirmation (« Par e-mail, à : … Les relances partent par N… ») | OK | Tous décrivent un état calculé ou un acte précisé avant l'envoi (destinataires nommés, canal, reste à envoyer). | — | aucun |
| A6 | Bienvenue : « Devis en 5 min », « Du devis à la facture en 2 clics » | À CORRIGER | Deux promesses de performance chiffrées, jamais mesurées. La FAQ dit elle-même que « Facturer » ouvre un choix (acompte, échéancier, facture complète), donc « 2 clics » est faux dans certains cas. Réponse à la décision n° 1 de l'implémenteur : garder la bienvenue n'est pas un enjeu juridique, mais ces chiffres sortent ou se mesurent d'abord. | CLAUDE.md (affirmation invérifiable) | Voir **R-B** |
| A7 | Bienvenue : exemple « 5 500 € CA / 1 200 € dépenses / 3 685 € marge / marge nette 67 % » | À CORRIGER | Arithmétique fausse (5 500 − 1 200 = 4 300, pas 3 685, sans main-d'œuvre affichée). Le chiffre d'affaires est donné TTC, alors que la TVA n'est pas un revenu : l'exemple apprend à calculer sa marge sur un montant que l'artisan reversera à l'État. « Marge nette » promet une marge après charges. Le client « Dupont Marie » et le numéro « DEV-2025-001 » sont des illustrations acceptables, à condition d'être étiquetés « Exemple ». | Règle marketing.md (rien d'invérifiable) | Voir **R-B** |

### Aide (question 3)

| N° | Point | Verdict | Raison | Source | Texte de remplacement |
|---|---|---|---|---|---|
| H1 | FAQ « Facturer » : « …facture d'acompte, échéancier, facture complète ou situation de travaux. Les lignes sont reprises automatiquement. » | À CORRIGER | La facture de situation est éteinte (`FONCTIONS.facturesSituation = false`, 10 oct., relecture juridique) : l'entrée « Situation de travaux » du menu mène au suivi du chantier, et l'écran dit « Facture de situation : bientôt disponible ». Le texte promet donc une facture que l'app ne produit pas. | `fonctions.js` ; `SituationsTravaux.jsx` l. 803-805 ; `DevisPage.jsx` l. 3168-3177 | Voir **R-H** |
| H2 | FAQ « Export comptable » : « …FEC, CSV ou compatible Pennylane/Indy » | À CORRIGER | L'export propose CSV, FEC, Excel (`ExportComptable.jsx` l. 285-289). Aucun format Pennylane ni Indy : leurs synchronisations simulées ont été retirées (`integrations/accounting.js`). Affirmation fausse d'une compatibilité avec des marques tierces. | Code | Voir **R-H** |
| H3 | « La marge nette est calculée automatiquement : Marge = CA − Dépenses − Main d'œuvre » ; seuils « > 40 % = Excellent… » | À CORRIGER (léger) | La formule exclut cotisations, impôts et frais généraux : c'est une marge sur chantier, pas une marge nette. Les seuils sont des repères sans source : l'implémenteur a déjà retiré « Marge standard du BTP » (bien) ; il reste à les dire indicatifs. | CLAUDE.md (statistique sans source) | Voir **R-H** |
| H4 | « Mallettico fonctionne parfaitement sur téléphone » ; « …transformez-les en factures en un clic » | À CORRIGER (léger) | Superlatif et promesse contredite par la FAQ (« Facturer » ouvre un choix). | — | Voir **R-H** |
| H5 | FAQ « Puis-je utiliser Mallettico hors ligne ? Oui ! … vos données se synchronisent automatiquement » | À CORRIGER (à constater) | Une file d'écritures hors ligne existe (`lib/offline/sync.js`), mais je n'ai pas constaté ce qui est utilisable sans réseau ; l'envoi d'un document demande évidemment une connexion. Le « Oui ! » est plus large que ce qui est prouvé. À constater (`/sonde` hors ligne) avant de le garder. | Règle de vérification (CLAUDE.md) | Voir **R-H** |
| H6 | Retraits : exemple « Jean, plombier » (identité fictive), « Marge standard du BTP », « prioritaire pour les abonnés Pro » | OK | Bons retraits : identité fictive, statistique sans source, plan inexistant. | marketing.md | aucun |
| H7 | FAQ « Les données sont-elles sécurisées ? Elles sont chiffrées, et la base de données est hébergée à Paris. » | OK | Aligné sur la règle du dépôt (base à Paris, pas « hébergé en France ») et sur l'art. 7 de la politique (chiffrement en transit, au repos « selon » Supabase). | marketing.md ; `LegalPages.jsx` l. 626-640 | Facultatif : « …chiffrées pendant leur transfert et chez notre hébergeur de base de données (Paris) » |
| H8 | FAQ « Supprimer mon compte : Paramètres > Données, section RGPD » ; « Mon plan » ; « Touchez l'œil, en haut de l'écran » | OK | Vérifié dans `Settings.jsx` (onglet `donnees`, « Vos droits RGPD ») et dans la navigation. | — | aucun |
| H9 | Support : « Notre équipe répond sous 48h ouvrées » | OK | Engagement de délai : à garder seulement si Hugo le tient. « Notre équipe » pour un fondateur solo est une tournure courante, sans identité fictive. | — | aucun |
| H10 | FAQ Trésorerie (« en temps réel avec un prévisionnel automatique »), relances « automatiques » | Non vérifié | Hors de ce que le diff change ; je ne les ai pas constatés dans l'app. Les relances automatiques existent (cron, activation par l'artisan). | — | À constater avec `/sonde` |

### Autres textes (question 4)

| N° | Point | Verdict | Raison | Source | Texte de remplacement |
|---|---|---|---|---|---|
| X1 | Journal des versions public (`Changelog.jsx` l. 30, 35, 78) : « Bandeau de consentement cookies RGPD », « Analytics Plausible (privacy-first, sans cookies) », « Export comptable (FEC, CSV, Pennylane, Indy) » | À CORRIGER (hors diff) | Page publique : trois fonctions annoncées qui n'existent plus ou n'ont jamais existé (Plausible retiré le 16/03, Pennylane/Indy simulés puis retirés). | marketing.md ; CLAUDE.md | Retirer ces trois lignes, ou la page si elle n'a pas d'usage |
| X2 | `public/offline.html` : « Disponible hors ligne : devis en brouillon, consulter clients, photos en attente, catalogue produits » | Non vérifié (hors diff) | Texte repris à l'identique (seuls les accents ont changé). Une page de secours n'apparaît que si l'app elle-même n'a pas pu se charger : la liste peut être fausse à cet instant. | — | À constater ; à défaut : « Vos saisies seront envoyées dès le retour de la connexion » si c'est avéré |
| X3 | Notifications, palette (« Factures à encaisser », « Accueil »), pastilles, menus (« Se déconnecter », « Mon plan »), « N en attente », « Sur iPhone : Partager, puis « Sur l'écran d'accueil » », « Des améliorations sont prêtes. », « Mode confidentiel activé — Montants masqués » | OK | Descriptifs et exacts ; « Factures à encaisser » (avant « impayées ») est plus juste pour une facture non échue. | — | aucun |

## Textes de remplacement

### R-C1 — Bandeau (option B : on garde le bandeau et on recharge Plausible)

À n'utiliser qu'après avoir chargé le script (domaine `mallettico.fr`, la CSP autorise déjà plausible.io) et ajouté Plausible à l'art. 4 de la politique.

- Titre : « Vos choix sur les traceurs »
- Texte : « Mallettico enregistre sur votre appareil ce qui est nécessaire à son fonctionnement : votre connexion, vos préférences d'affichage et vos brouillons. Avec votre accord, il compte aussi les pages et les fonctions utilisées, de façon anonyme, avec Plausible Analytics. Fermer cette fenêtre revient à refuser. » + lien « Politique de confidentialité ».
- Catégorie 1, « Nécessaires » (toujours actifs) : « Connexion, sécurité, préférences d'affichage et brouillons en cours. Sans eux, l'application ne fonctionne pas : ils ne demandent pas votre accord. »
- Catégorie 2, « Mesure d'audience » : « Plausible Analytics compte les pages et les fonctions utilisées, sans cookie et sans profil publicitaire. »
- Boutons : « Refuser » et « Accepter tout » inchangés (même poids) ; « Enregistrer » en mode personnalisé. Lien permanent « Gérer les cookies » (menu du compte, pied du site).

### R-C2 — Option A (recommandée) : pas de bandeau tant qu'aucun traceur facultatif n'existe

- Retirer `CookieConsent` des trois endroits où il est monté (`App.jsx` l. 1277, 1297, 2255). Garder l'export `getCookieConsent` ou rendre `analytics.js` inerte, car `analytics.js` l'importe.
- Politique de confidentialité, art. 6, remplacer le texte actuel par :

> **Article 6 - Cookies et autres traceurs.** Mallettico n'enregistre sur votre appareil que ce qui est nécessaire au service que vous demandez : votre connexion, vos préférences d'affichage et vos brouillons en cours. Ces éléments ne demandent pas votre consentement (loi du 6 janvier 1978, art. 82). Mallettico n'utilise ni traceur de mesure d'audience, ni traceur publicitaire, ni suivi entre sites. Si cela change, cette page sera mise à jour et votre accord sera demandé avant tout traceur qui l'exige.

- Retirer la phrase « depuis les paramètres de l'application » (C8).

### R-G1 — Case à l'inscription et information

Sous les champs du formulaire « Créer un compte », avant le bouton « Créer mon compte » :

- Case, non cochée par défaut, obligatoire : « J'ai lu et j'accepte les [Conditions générales d'utilisation] de Mallettico (version du [date de la version]). » Quand l'annexe de l'art. 28 existera : « …, y compris l'accord de traitement des données de mes clients. »
- Si la case n'est pas cochée au clic : « Cochez la case pour accepter les conditions d'utilisation et créer votre compte. »
- Mention d'information (CNIL : identité, finalité, droits, renvoi à la notice) : « Mallettico (Hugo Seguin EI) utilise votre e-mail et votre nom pour créer et sécuriser votre compte. Vos droits et la durée de conservation de vos données sont détaillés dans la [politique de confidentialité]. »
- Même case pour un invité qui crée son compte depuis un lien d'invitation. Aucune case en mode démo.
- À enregistrer : la date et la version dans les métadonnées du compte, recopiées sur la fiche entreprise à sa création (le code existe déjà côté fenêtre : `cgu_accepted_at`, `cgu_version`).

### R-G2 — Fenêtre d'acceptation (anciens comptes, nouvelles versions, membre invité)

- Variante `premier` (compte créé avant la case) : texte actuel, inchangé.
- Variante `version` : « Les conditions d'utilisation ont changé (version du [date]). Lisez-les et acceptez-les pour continuer à créer des documents. Vos données et vos documents restent accessibles et exportables, que vous acceptiez ou non. »
- Case : « J'ai lu et j'accepte les Conditions Générales d'Utilisation de Mallettico (version du [date]) ».
- Message pour un membre invité qui ne peut pas enregistrer l'acceptation : « Seul le gérant peut accepter les conditions d'utilisation de l'entreprise. Demandez-lui de se connecter à Mallettico : vous pourrez ensuite créer des documents. »
- Pour une panne réseau, le message actuel est juste.

### R-G3 — Textes des CGU alignés sur le mécanisme

Fenêtre, article 1 :

> **1. Objet.** Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du service Mallettico. Elles sont acceptées en cochant la case prévue à la création du compte ; pour un compte créé avant cette case, elles sont acceptées avant la création d'un premier document.

Page `/cgu`, article 2, premier paragraphe (le second paragraphe est à remplacer comme dans l'avis du 24/10, H2) :

> L'utilisateur accepte les présentes CGU en cochant la case prévue à la création de son compte ; pour un compte plus ancien, avant la création d'un premier document. Il reconnaît en avoir pris connaissance et s'engage à les respecter. La date d'acceptation et la version acceptée sont enregistrées.

### R-A — Accueil

- Profil complet, étape « Compléter mon profil » : « Les informations exigées avant l'envoi sont renseignées »
- Profil complet, étape « Créer mon premier devis » : « Votre profil est prêt : il pourra partir dès qu'il est rédigé »

### R-B — Bienvenue

- Tuiles : « Devis rapides », « Marge calculée pour vous », « Sur téléphone ».
- Sous-titre de l'écran 2 : « Du devis à la facture, sans ressaisie » (vrai : les lignes sont reprises).
- Exemple de devis : ajouter le mot « Exemple » sur la carte.
- Exemple de chantier, cohérent et en hors taxes : « Chiffre d'affaires HT 5 000 € ; Dépenses 1 200 € ; Main-d'œuvre 800 € ; Marge 3 000 € » et, à la place de « Marge nette 67 % », « Marge sur chantier 60 % ». Calcul : 5 000 − 1 200 − 800 = 3 000 ; 3 000 / 5 000 = 60 %.

### R-H — Aide

- Devis, introduction : « Créez vos devis, puis facturez-les sans ressaisir les lignes. »
- FAQ « Comment transformer un devis en facture ? » : « Ouvrez le devis signé et touchez « Facturer » : facture d'acompte, échéancier ou facture complète (ou de solde). Les lignes sont reprises automatiquement. Depuis un chantier, vous suivez aussi l'avancement par situations de travaux ; leur facture n'est pas encore disponible. »
- FAQ export : « Dans Finances > Export Comptable, exportez vos écritures au format FEC, CSV ou Excel, à remettre à votre comptable. »
- Rentabilité : « La marge sur chantier est calculée automatiquement, avant cotisations, impôts et frais généraux : » ; la formule reste ; intitulé des trois lignes : « Repères indicatifs : plus de 40 %, entre 20 et 40 %, moins de 20 % ».
- Astuce mobile : « Mallettico fonctionne sur téléphone. Ajoutez-le à votre écran d'accueil pour un accès rapide. »
- FAQ hors ligne, à ne garder qu'après constat : « En partie. Sans réseau, ce que vous saisissez est mis en attente sur votre appareil et envoyé au retour de la connexion (voir « N en attente »). L'envoi d'un document demande une connexion. »

## Vérifications au texte (à consigner dans `docs/metier-btp.md` et la mémoire de l'agent)

- **25 oct. 2026, CNIL, recommandation 2020-092 du 17 sept. 2020 (PDF cnil.fr, lu en entier)** :
  - § 12-13 : finalités intelligibles, intitulé court + descriptif ;
  - § 27-32 : boutons « tout accepter » et « tout refuser » au même niveau, « personnaliser » sur le premier niveau ;
  - § 33 : refus par fermeture de la fenêtre à indiquer sur la fenêtre ;
  - § 34 : même taille, même mise en évidence ;
  - § 35-39 : conservation du choix, 6 mois « bonne pratique » ;
  - § 40-45 : retrait aussi simple que le consentement, lien « gérer mes cookies » accessible à tout moment.
- **25 oct. 2026, CNIL, page « Mesurer la fréquentation de vos sites web et de vos applications »** : exemption si la finalité est strictement limitée à la mesure d'audience pour le compte exclusif de l'éditeur, statistiques anonymes, pas de recoupement, pas de suivi entre sites, pas de transmission à des tiers ; durée de vie du traceur 13 mois (sans prolongation automatique), conservation des données 25 mois ; information des utilisateurs. Aucune liste d'outils validés ; un fournisseur ne peut pas se dire « validé par la CNIL ». Cette page ne traite pas de la possibilité de s'opposer : le point n'est pas tranché ici.
- **25 oct. 2026, RGPD art. 28.1, 28.3 (début) et 28.9** : texte lu sur la page CNIL du règlement. Pas de commentaire officiel retrouvé sur le moment où le contrat doit exister ; CEPD 07/2020 non relu.
- **25 oct. 2026, art. 13 RGPD** : information « au moment où les données sont obtenues » ; la CNIL admet un renvoi vers une notice complète (page « Exemples de mentions d'information », extraits).
- **C. civ. 1119** : lu comme texte en vigueur depuis le 1/10/2016 (Légifrance, page de l'article via recherche). Le texte intégral de l'art. 82 de la loi 78-17 n'a pas pu être ouvert sur Légifrance (erreur 404) ; son contenu a été vérifié par les pages CNIL ci-dessus.
- **Dépôt, constats datés du 25 oct.** :
  - `index.html` : script Plausible retiré par le commit 227534e3 (16 mars 2026) ;
  - aucun chargeur de Plausible, de Google, de Meta ni d'un autre outil de suivi dans `src/` ni `index.html` ;
  - `CookieConsent.jsx` : `showReopenButton` jamais vrai ;
  - `OngletRamonage.jsx` l. 33 : `addDevis` de `useData()`, hors du garde de `App.jsx`.
- **Non fait** : pas de relecture du site marketing (`src/components/landing/`) ni de `Settings.jsx` hors la section RGPD ; pas d'essai dans un navigateur (lecture seule).

## À faire par la session principale

1. **Immédiat (une chaîne chacune, Task 5)** : A2, A6, A7, H1, H2, H3, H4, G7, G8 (textes R-A, R-B, R-G2, R-H).
2. **Décision d'Hugo, puis code** : Q1 (traceurs) → C4, C5, C7, C8, C10, C11 ; Q2 (CGU à l'inscription) → G1, G2, G3, G5, G10, G11.
3. **Tâche `rgpd-soustraitance`** : annexe de l'art. 28 à écrire avant d'ouvrir à des abonnés extérieurs (G4) ; je peux la rédiger. Ajouter Plausible ou Sentry à l'art. 4 avant leur activation.
4. **Tâche `cgv-acceptation`** : y rattacher G10, G11, G12 (une seule source pour les CGU).
5. Mettre à jour `docs/etat-production.md` : « Plausible : non chargé depuis le 16 mars 2026 ; le bandeau cookies ne commande rien » ; ajouter X1 aux retours à traiter.

## Questions pour Hugo

- **Q1 — Traceurs.** Option A (recommandée) : pas de bandeau tant qu'aucun traceur facultatif n'existe (aujourd'hui : aucun), politique corrigée, comptages de produit tirés de la base. Option B : recharger Plausible (domaine `mallettico.fr`), garder le bandeau reformulé et un lien « Gérer les cookies ». Dans les deux cas, Sentry avec Replay ne s'active qu'après décision (sans Replay, ou sous consentement).
- **Q2 — CGU.** Case à l'inscription (recommandé), la fenêtre gardée pour les anciens comptes et les nouvelles versions. Impose de rédiger l'annexe de l'art. 28 avant l'ouverture aux abonnés extérieurs.
- **Q3 — Bienvenue.** Mon avis juridique : la garder est sans risque une fois les chiffres corrigés (A6, A7) ; le reste est une décision de produit.
