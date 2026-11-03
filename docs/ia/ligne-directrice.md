# L'IA dans Mallettico — ligne directrice

*3 nov. 2026 · session `cloud/ia-direction` · document de décision pour Hugo. Rien n'est décidé tant qu'Hugo n'a pas répondu aux questions du § 9. Relu par `critique-produit` et `juriste-btp` le 3 nov. 2026 ; leurs remarques sont intégrées (§ 11).*

## 0. En une page

**L'idée.** Un seul bouton, « Demander », sur tous les écrans. L'artisan dit ou tape ce qu'il veut, en quelques mots. L'app prépare le résultat : un brouillon de devis, les relances à envoyer, un chiffre, des heures. L'artisan relit et valide d'un geste. Rien n'arrive chez le client et rien n'entre dans ses documents sans ce geste.

**Ce qui nous distinguerait.** Le devis à la voix est devenu banal en 2026 (Obat, Batappli, Renalto, § 2). Nous n'avons trouvé aucun outil qui couvre tout le cycle avec une seule entrée, ni aucun outil BTP qui documente un **contrôle du devis avant envoi** (recherche du 3 nov. 2026, à revérifier). Notre avantage ne serait pas « l'IA » : ce serait d'être l'outil où l'IA ne choisit jamais un taux de TVA, ne calcule aucun total et ne désigne que des clients existants (sinon elle pose la question) : elle ne fait que recopier les chiffres que l'artisan a dits, montrés pour relecture.

**La règle d'or.** Le modèle comprend la demande. L'app calcule. L'artisan valide. Le modèle ne calcule et n'invente aucun chiffre : il recopie ceux que l'artisan a dits (montant, quantité, heures), montrés pour relecture ; les totaux, la TVA et les restes dus sont calculés par l'app. Ce que personne n'a dit (HT ou TTC, taux de TVA, client ambigu) devient une question.

**Le coût n'est pas le sujet.** Avec Claude Haiku 5.5, une demande texte coûte environ **0,0005 $** (§ 3). Les 100 $ du mois couvrent environ 200 000 demandes texte. Les vrais sujets sont : un abus (jeton volé, boucle), l'arrêt de l'API quand les crédits sont épuisés, et **le temps de maintenance d'Hugo**.

**L'ordre proposé** (§ 6), révisé après la relecture du critique produit :
1. **Lot 0 — le socle** : sécurité, quota, coupure, accord de traitement avec Anthropic, textes légaux. Sans lui, rien ne s'allume.
2. **Lot 1 — le devis à la voix, à parité avec l'ancienne dictée**, dans l'entrée unique « Demander » : plusieurs lignes, prix du catalogue de l'artisan, création d'un nouveau client. Mesuré jusqu'au devis **prêt à envoyer**.
3. **Lot 2 — les commandes sans modèle** dans la même entrée : relances, encaissé, heures, « Martin m'a payé 500 € », « facture le devis Dupont ». Elles sont reconnues par l'app elle-même : gratuites, hors ligne, sans risque nouveau.
4. **Lot 3 — le contrôle du devis avant envoi** : des règles d'abord, le modèle ensuite.
5. **Lot 4 — la facture fournisseur photographiée → dépense.**
6. Ensuite, **selon les mesures** : compte rendu de chantier, import de catalogue, réponses aux clients.

**Ce qu'Hugo doit décider** : 11 questions au § 9. Trois bloquent le lot 0 : le compte API (Q-ia-credits), l'accord de traitement avec Anthropic (Q-ia-sous-traitance) et l'écran d'accord (Q-ia-accord).

**Le prototype** se voit seulement en démonstration avec un paramètre caché : `?demo=true&apercu=ia`, bouton « Demander » en haut de l'écran, ou Ctrl+J. Avec `?demo=true` seul (lien « Voir la démo » du site) ou sur un vrai compte, il n'apparaît pas (interrupteur `FONCTIONS.assistant`, éteint). Il montre déjà les quatre demandes, pour juger l'expérience entière ; la feuille de route les livre en plusieurs lots. Captures dans `docs/ia/captures/`.

---

## 1. Ce qui existe déjà

Détail dans [`inventaire.md`](inventaire.md). L'essentiel :
- **Une dictée complète mais masquée** (`DicteeModal` + fonction Edge `voice-intent`, Claude Haiku 4.5). Elle crée client, chantier et devis en brouillon, et rapproche les lignes du catalogue de l'artisan.
- **Trois failles bloquantes** : jeton non vérifié dans la fonction Edge, quota seulement dans le navigateur, Anthropic absent des textes légaux. Elles justifient la décision D-07.
- **Du code mort** (suggestions par règles, tables `ai_*` inutilisées) et **deux promesses fausses** derrière l'interrupteur (« analyse photo de chantier » dans l'aide et le journal des nouveautés). Elles doivent être supprimées au lot 0, pas seulement masquées.

## 2. Ce que font les concurrents

Recherche du 3 nov. 2026. Obat, Batappli, Renalto, Qonto et Abby ont été relus sur leurs pages officielles par le juriste le 3 nov. 2026 ; les autres lignes viennent d'extraits de moteurs de recherche et ne sont pas revérifiées. **À revérifier avant toute comparaison publique** (C. conso. L122-1). **« Annoncé »** = page commerciale, blog ou presse. **« Vérifiable »** = démo vidéo, notes de version, page tarifs, aide en ligne.

| Éditeur | Ce qu'il fait en IA | Niveau de preuve | Source |
|---|---|---|---|
| **Obat** | Devis dicté à la voix, chiffré avec la bibliothèque de prix de l'artisan ou 30 000 ouvrages ; aucun prix affiché pour cette fonction (essai de 14 jours). | **Vérifiable** : page de l'éditeur ; notes de version App Store (devis à la voix dès la 1.1.2, 19/01/2025), lues le 3 nov. 2026 | [obat.fr](https://www.obat.fr/devis-factures/devis-vocal-ia/), [App Store](https://apps.apple.com/fr/app/obat/id1666504412) |
| **Batappli** | Batappli.ia : devis par IA. 8 devis IA/mois avec l'offre Devis (39 € HT/mois), 16 avec l'offre Artisan (79 € HT/mois) ; option mensuelle de 16 devis IA à 6 € HT. | **Page tarifs** lue le 3 nov. 2026 (date de lancement non affichée) | [batappli.fr/tarifs](https://www.batappli.fr/tarifs) |
| **Renalto (Rita)** | Devis à la voix, dans l'app et par WhatsApp. 30 devis IA/mois en Pro (20 € HT) et Pro+ (25 € HT), 100 en PME (41 € HT). | **Pages fonctionnalité et tarifs** lues le 3 nov. 2026 | [renalto.fr](https://www.renalto.fr/fonctionnalites/compagnon-ia-btp), [tarifs](https://www.renalto.fr/tarifs) |
| **Axonaut** | Serveur MCP, en lecture seule au lancement. Contrôle IA du devis : non confirmé, ne pas citer. | MCP : presse. Contrôle du devis : **une seule source tierce**, non confirmée | [informatiquenews.fr](https://www.informatiquenews.fr/axonaut-integre-lia-et-le-support-de-mcp-dans-son-logiciel-de-facturation-107854), [repha.fr](https://repha.fr/axonaut-outils-gestion/) |
| **Pennylane** | Lecture des justificatifs ; agents qui **proposent** des relances, envoyées en un clic (ordinateur). Non revérifié au 3 nov. 2026 : ne pas citer. | Webinaire relayé par un cabinet comptable | [blc-conseil.com](https://blc-conseil.com/blog/replay-webinar-pennylive-show-et-toi-pennylane-tu-fais-quoi-comme-ia/) |
| **Qonto** | Agent IA de facturation présenté comme disponible avec l'offre L'Opérateur : brouillons de factures, factures en retard, relance des impayés (page officielle lue le 3 nov. 2026). | Presse + page officielle | [Usine Digitale](https://www.usine-digitale.fr/intelligence-artificielle/redaction-de-factures-planification-des-paiements-analyses-des-depenses-qonto-lance-deux-agents-ia-pour-ses-600-000-clients.7ZBD4WSIVJFULPWSYF2PCBN5PI.html), [qonto.com](https://qonto.com/fr/ai/use-cases/invoices-get-paid) |
| **Indy** | Lecture des justificatifs (photo → dépense), décrite comme mûre. Non revérifié au 3 nov. 2026 : ne pas citer. | Blog de l'éditeur | [indy.fr](https://www.indy.fr/blog/nouvelle-fonction-scanner-georges/) |
| **Abby** | « Abby Intelligence », en bêta ; l'éditeur prévient que les réponses peuvent être imprécises (page officielle lue le 3 nov. 2026). | Page officielle | [abby.fr/ai-info](https://abby.fr/ai-info) |
| **Tolteck, Henrri, Extrabat, Graneet** | Aucune IA trouvée. Henrri : relances automatiques sans IA. Non revérifié au 3 nov. 2026 : ne pas citer. | Pages éditeurs, comparatifs | [tolteck.com](https://www.tolteck.com/fr-fr/facturation-electronique/), [dixmilleheures.fr](https://www.dixmilleheures.fr/avis/henrri) |

**Ce qui en ressort :**
1. **Le devis à la voix ne suffit plus pour se distinguer.** Obat l'annonce depuis janvier 2025 ; Batappli et Renalto l'incluent avec des quotas mensuels (8 à 100 devis IA selon l'offre). Mais il reste **attendu** : sans lui, nous serions en retard.
2. **Les quotas sont la norme** chez ceux qui les affichent (Batappli : 8 à 16 devis IA/mois ; Renalto : 30 à 100).
3. **Relances par l'IA** : présentées par Qonto (outil bancaire) ; lecture des factures fournisseurs et relances annoncées chez Pennylane et Indy (non revérifié). Pas trouvées chez les outils BTP grand public.
4. **Le contrôle du devis avant envoi** : non trouvé chez un outil BTP au 3 nov. 2026. C'est la place qui semble la plus libre, et celle qui correspond le mieux à « l'outil le plus fiable ».
5. **Une seule entrée pour tout le cycle** : non trouvée. Chacun ajoute un bouton IA par écran.

## 3. Coûts et modèles

Prix au million de jetons (entrée / sortie) donnés par Hugo : Haiku 5.5 : 0,10 $ / 0,50 $ ; Sonnet 5.5 : 2 $ / 10 $ ; Opus 5.5 : 4 $ / 20 $. **À revérifier sur la page tarifs d'Anthropic** : des sources secondaires indiquent que le prix de Haiku 5.5 ne vaut que pour les demandes de moins de 100 000 jetons, et serait environ cinq fois plus élevé au-delà. Seul l'import d'un catalogue PDF peut approcher ce seuil.

**Hypothèses de taille** (à mesurer dès le lot 1, dans le journal) :
- consignes du système : environ 1 500 jetons, **mises en cache** (une lecture en cache coûte une fraction du prix normal) ;
- repère des noms (100 clients, 30 chantiers, l'équipe) et 80 libellés du catalogue avec leur prix : environ 2 500 jetons ;
- la demande : 30 à 80 jetons ; la réponse structurée : 150 à 600 jetons ;
- une photo de 1 Mpx : environ 1 500 jetons ; une page de PDF : environ 1 500 à 3 000 jetons.

| Usage | Entrée / sortie (jetons) | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 |
|---|---|---|---|---|
| Devis à la voix (plusieurs lignes, catalogue) | 4 000 / 600 | **0,0007 $** | 0,014 $ | 0,028 $ |
| Commande simple (relances, encaissé, heures, paiement) | reconnue par l'app : **0** ; sinon 3 000 / 200 | **0 à 0,0004 $** | 0,008 $ | 0,016 $ |
| Contrôle d'un devis avant envoi (partie modèle) | 5 000 / 400 | 0,0007 $ | **0,014 $** | 0,028 $ |
| Facture fournisseur photographiée | 3 500 / 800 | **0,00075 $** | 0,015 $ | 0,03 $ |
| Compte rendu (5 photos + voix) | 9 000 / 700 | **0,0013 $** | 0,025 $ | 0,05 $ |
| Import d'un catalogue PDF de 20 pages | 45 000 / 20 000 | 0,0145 $ | **0,29 $** | 0,58 $ |

**Ce que couvrent 100 $ par mois :**
- tout en Haiku : environ 140 000 devis à la voix, ou 130 000 factures photographiées ;
- un artisan très actif (100 devis à la voix, 40 contrôles, 30 photos par mois) coûte environ **0,12 $** avec Haiku partout, **0,7 $** avec Sonnet pour le contrôle ;
- **le budget tient plusieurs centaines d'artisans actifs**, à condition de plafonner les gros usages (PDF, Sonnet).

**Le modèle conseillé : Haiku 5.5 par défaut.** La tâche (comprendre une phrase courte et désigner des fiches existantes) est simple. Sonnet seulement là où une erreur de jugement coûte cher (contrôle du devis, catalogue PDF), et seulement si l'évaluation (§ 5.6) montre que Haiku ne suffit pas. Opus : jamais en production pour ces usages.

**Le risque sur le budget n'est pas la moyenne :**
- un jeton volé ou une boucle peut brûler les 100 $ en une nuit → quota par organisation **et** plafond global quotidien ;
- les crédits **expirent chaque mois et l'API s'arrête quand ils sont épuisés** → coupure propre, l'app continue sans IA (§ 5.1) ;
- **les crédits de l'offre Max** : 100 $ par mois, versés à une seule organisation Console liée, qui expirent à chaque cycle ; l'API s'arrête quand ils sont épuisés, sauf crédits achetés. L'accord de traitement d'Anthropic doit couvrir le compte qui paie (§ 5.3). Le choix entre ces crédits et un compte payant au nom de l'EI revient à Hugo (Q-ia-credits).

## 4. Toutes les occasions de gagner du temps

**Comment lire les temps gagnés.** Ce sont des **hypothèses**, pas des mesures, et **aucune n'a encore été vérifiée auprès d'artisans**. Elles comparent les gestes nécessaires aujourd'hui dans Mallettico au téléphone et les gestes avec l'assistant. Chaque lot (§ 6) a un critère qui les mesure pour de vrai. Aucune ne doit être reprise sur le site avant d'être mesurée.

**Fréquences** : un artisan seul type (électricien, plombier), hypothèse de travail à confirmer par Hugo sur sa propre activité : 3 à 6 devis par semaine, 3 à 5 factures, 1 à 3 relances, 10 à 20 achats fournisseurs par mois.

| # | Occasion | Aujourd'hui | Avec l'assistant | Gain estimé par usage | Fréquence (artisan seul) | Modèle, coût | Faisabilité | Risque |
|---|---|---|---|---|---|---|---|---|
| 1 | **Devis à la voix** (« devis pour Mme Martin : dépose de l'ancien tableau, tableau 3 rangées, 6 disjoncteurs, mise à la terre ») | Ouvrir Devis, chercher le client, ajouter chaque ligne (libellé, quantité, prix, unité), TVA : 3 à 8 min au téléphone pour 3 à 6 lignes | Dire la liste, répondre à 1 ou 2 questions, relire : 1 à 2 min | **2 à 6 min** (un devis d'une seule ligne se saisit déjà vite : le gain est sur les devis de plusieurs lignes) | 3 à 6 / semaine | Haiku, 0,0007 $ | **Forte** : `voice-intent` (lignes + catalogue) et le contrat existent | Moyen : mauvais client, mauvaise ligne → questions, brouillon seulement |
| 2 | **Refaire un devis** (« refais le devis Dupont pour Martin ») | Dupliquer, changer le client, relire : 1 à 2 min | Une phrase : 15 s | **1 à 2 min** ; les prix sont ceux de l'artisan | 1 à 3 / semaine | Haiku, 0,0005 $ | Forte (duplication existe) | Faible |
| 3 | **Facture depuis un devis signé** (« facture l'acompte de 30 % du devis Dupont ») | 1 à 2 min | 15 s | **1 min** | 1 à 3 / semaine | Haiku ou reconnu par l'app | Forte (`acompteUtils.js`) | Moyen : montant → calculé par l'app, jamais par le modèle |
| 4 | **Paiement reçu** (« Martin m'a payé 500 € par virement ») | Trouver la facture, Encaisser, saisir : 1 min | Une phrase, un geste : 10 s | **45 s** | 3 à 5 / semaine | Reconnu par l'app (0 $) ou Haiku | Forte (`addPaiement`, migration 099) | Faible : le montant vient de l'artisan ; la facture est désignée parmi les factures ouvertes |
| 5 | **Relances des factures en retard** | Ouvrir chaque facture, vérifier le reste dû, envoyer : 1 à 2 min par facture | Une demande, une liste cochée, un geste | **1 à 2 min par facture** | 1 à 3 / semaine | **Aucun** : calcul de l'app (`relanceDe`) | **Forte** : `texteCourt`, envois existants | Faible si le texte relu reste la base ; **élevé** si l'IA rédige librement |
| 6 | **Question chiffrée** (« combien j'ai encaissé », « qui me doit le plus ») | Finances, choisir la période : 30 s à 1 min | Une phrase : 5 s | **30 s** (la tuile de l'accueil répond déjà pour le mois en cours) | Plusieurs / semaine | Reconnu par l'app, ou Haiku | **Forte** : `encaisseEntre`, `creances` | Faible : le chiffre vient de l'app ; la période est affichée |
| 7 | **Heures à la voix** (« 3 h sur Dupont ») | Équipe › Pointage, personne, chantier, date : 1 min | Une phrase, un geste : 10 s | **45 s** | Quotidien **avec une équipe** ; rare seul | Reconnu par l'app, ou Haiku | **Forte** : `addPointage` | Faible : pointage « à approuver », annulable |
| 8 | **Contrôle du devis avant envoi** (ligne sans prix, quantité à 0, TVA à 10 % sans attestation, devis d'une seule ligne au forfait chez un particulier, oubli métier) | Rien : l'artisan relit seul, ou pas | Un avis « points à vérifier » au moment d'envoyer | Peu de temps gagné ; **évite des erreurs coûteuses** (devis refait, TVA à régulariser, litige) | Chaque devis | **Règles de l'app d'abord (0 $)**, Sonnet ensuite pour le « bon sens métier » : 0,014 $ | **Moyenne** : les contrôles légaux existent déjà en partie (blocage d'envoi D-23, D-24) | Moyen : faux « tout va bien » → jamais « conforme », seulement « points à vérifier » |
| 9 | **Facture fournisseur photographiée → dépense** (+ prix d'achat du catalogue) | Saisir fournisseur, date, HT, TVA, chantier : 2 à 3 min | Photo, relecture, geste : 30 s | **2 min** | 10 à 20 / mois | Haiku vision, 0,00075 $ | **Moyenne** : dépenses et catalogue existent ; il faut le stockage de la photo et l'accord d'envoi au modèle | Moyen : chiffre mal lu → **montants lus affichés à côté de la photo, à confirmer** ; TVA déductible = le **montant de TVA lu** sur la facture (CGI art. 271, D-28), jamais recalculé ; la photo ne remplace pas l'original |
| 10 | **Compte rendu de chantier** (photos + voix) | Écrire un message avec photos : 10 à 15 min | Photos + 30 s de voix → compte rendu à relire : 2 min | **8 à 12 min** | **Inconnue** (hypothèse : 1 à 3 / semaine, non vérifiée) | Haiku vision, 0,0013 $ | **Moyenne** : photos de chantier existent (`RapportChantier.jsx`) | Moyen : affirmation fausse sur l'avancement ; photos de personnes (RGPD) ; texte rédigé par le modèle → obligation de marquage (§ 5.2) |
| 11 | **Import d'un catalogue fournisseur en PDF** | Saisir 50 à 300 articles : des heures, donc jamais fait | Un PDF → une liste à relire | **Plusieurs heures, une fois** | 1 à 3 fois en tout | Sonnet, 0,29 $ par PDF de 20 pages | **Moyenne** : import CSV existe (`csvImport.js`) | Moyen : prix mal lus → relecture ligne par ligne |
| 12 | **Réponse à un message de client** (« quand venez-vous ? ») | Écrire : 2 à 5 min | Un brouillon de réponse, à corriger : 30 s | **2 à 4 min** | 3 à 10 / semaine | Haiku, 0,001 $ | **Faible aujourd'hui** : les messages arrivent par SMS, WhatsApp ou e-mail, hors de l'app | Élevé : engagement commercial (prix, délai) → jamais d'envoi direct |
| 13 | **Informations sur les réglages légaux** (« je suis micro-entrepreneur, que remplir ? ») | Chercher, ou appeler son comptable | Informations générales tirées de textes relus, avec leur source et leur date | 10 à 30 min, une fois | 1 fois | Haiku + textes de `docs/metier-btp.md` | Moyenne | **Élevé** : la consultation juridique personnalisée est réservée (loi n° 71-1130, art. 54) → jamais « vous devez » ; « pour votre cas, votre comptable » |
| 14 | **Recherche en langage courant** (« le devis de la salle de bain Martin ») | Recherche par mot ⌘K : 10 à 20 s | 5 s | Faible | Quotidien | Haiku | Forte | Faible |
| 15 | **Photo ou plan → métré** (« la photo de la cote de ce mur », plan coté en PDF ou en photo) | Mesurer, puis saisir longueur, largeur, hauteur, nombre et chutes dans la fenêtre « Métré » de l'éditeur (`MetreModal`, `src/lib/metre.js`) : 30 s à 1 min par ligne | Photo ou plan → dimensions lues affichées dans la même fenêtre « Métré », à confirmer : 15 s par ligne | **15 à 45 s par ligne** (hypothèse) | **Inconnue** (hypothèse : quelques lignes par devis de plâtrerie, peinture, carrelage ; rare en électricité) | Haiku vision, ~0,001 $ par image (même ordre que la ligne 9) ; Sonnet si les plans le demandent | **Moyenne** : le calcul existe (`calculerMetre`, testé) ; le modèle ne fournit que les dimensions lues, la quantité reste calculée par l'app | **Moyen à élevé** : cote mal lue (chiffre, unité cm/m, échelle d'un plan) → quantité fausse sur le devis. Parade : dimensions lues affichées à côté de l'image, à confirmer une par une, jamais de quantité sans cette confirmation ; photos : § 5.3 |

**Le classement par temps gagné sur un mois** (gain × fréquence, artisan seul, hypothèses) :
1. devis à la voix (2 à 6 min × 12 à 24) ≈ 0,5 à 2,5 h, plus les devis refaits ;
2. compte rendu de chantier ≈ 0,5 à 2 h, **mais sa fréquence est inconnue** ;
3. factures fournisseurs (2 min × 10 à 20) ≈ 20 à 40 min ;
4. réponses aux clients ≈ 0,5 à 2,5 h, mais **hors de l'app aujourd'hui** ;
5. paiements, factures, relances (≈ 1 min × 20 à 40) ≈ 20 à 40 min ensemble ;
6. heures (45 s × 20) ≈ 15 min, seulement avec une équipe.

**Pourquoi le compte rendu n'arrive pas en premier** malgré son gain possible : sa fréquence n'est pas connue, et c'est le seul usage où le modèle **rédige** un texte envoyé au client (risque d'affirmation fausse, obligation de marquage). Le devis à la voix est attendu, sûr et déjà à moitié construit. Le contrôle du devis ne gagne pas de temps : il **évite de perdre de l'argent**, et c'est la différence la plus nette (§ 2).

## 5. Principes de produit

### 5.1 Les règles qui ne se discutent pas
1. **L'IA propose, l'artisan valide.** Chaque résultat a un seul bouton plein : le geste de validation. Avant ce geste, rien n'entre dans ses documents. (La demande, elle, part chez Anthropic pour être comprise ; le journal n'en garde que la date, les jetons et l'issue : c'est dit à l'artisan, § 5.3.)
2. **Aucun envoi automatique.** Une relance, une réponse, un devis : l'envoi reste un geste de l'artisan, avec le texte sous les yeux. Le contrat (`contrat.js`) ne contient même pas d'intention « envoyer » : une consigne glissée dans une dictée ne peut pas en déclencher un.
3. **Jamais de valeur inventée sur un document légal.** Le modèle ne choisit ni taux de TVA, ni mention légale, ni date d'échéance, et ne calcule aucun montant : il recopie seulement les nombres dits par l'artisan, affichés « Montant dicté » avant validation. Il désigne des fiches existantes (clients, chantiers, articles du catalogue avec **leur** prix) et reprend les mots de l'artisan. Les totaux sont calculés par l'app. Le taux de TVA est demandé, sauf en franchise (voir Q-ia-tva-defaut pour un pré-remplissage justifié).
4. **Ce que l'IA ne sait pas, elle le demande.** Client ambigu, HT ou TTC, personne qui a pointé : une question, avec des réponses en boutons de 44 px.
5. **Les chiffres viennent des données.** « Combien j'ai encaissé » utilise le même calcul que la tuile de l'accueil, et le dit.
6. **Hors ligne ou en panne, l'app marche.** Sans réseau : la demande reste dans le champ, l'app le dit. Les commandes simples reconnues par l'app marchent même hors ligne. Crédits épuisés : « L'assistant est momentanément indisponible. Tout le reste de l'app fonctionne normalement. » Aucun écran ne dépend de l'IA.
7. **Pas de réglages d'IA, pas de jargon.** Pas de choix de modèle, pas de « jetons ». Le quota n'apparaît que quand il est presque atteint. Une seule préférence possible : « je dicte mes prix en HT / en TTC » (§ 7.1).

### 5.2 Transparence (AI Act)
*Relecture `juriste-btp` du 3 nov. 2026. Article 50 lu au texte le 3 nov. 2026 (https://ai-act-service-desk.ec.europa.eu/fr/ai-act/article-50). § 1 : « Les fournisseurs veillent à ce que les systèmes d’IA destinés à interagir directement avec des personnes physiques soient conçus et développés de manière que les personnes physiques concernées soient informées qu’elles interagissent avec un système d’IA, sauf si cela ressort clairement du point de vue d’une personne physique normalement informée et raisonnablement attentive et avisée […] ». § 5 : « Les informations visées aux paragraphes 1 à 4 sont fournies aux personnes physiques concernées de manière claire et reconnaissable au plus tard au moment de la première interaction ou de la première exposition. »*

- **Qui est qui.** Mallettico met le système « Demander » en service sous son nom : il en est le **fournisseur** (art. 3, point 3). Anthropic fournit le modèle. L'artisan est le **déployeur**.
- **Art. 50 § 1 — informer qu'on interagit avec une IA**, au plus tard à la première interaction (§ 5 du même article). Obligation du fournisseur, donc de Mallettico. Dans l'app : « Assistant d'intelligence artificielle : il peut se tromper. Relisez avant de valider. », dans la fenêtre et sur l'écran d'accord.
- **Art. 50 § 2 — marquage lisible par machine du texte généré.** Obligation du fournisseur. Exception pour une fonction d'assistance à la mise en forme standard, ou quand le système ne modifie pas substantiellement les données fournies. Lots 1 à 4 : le libellé du devis reprend les mots de l'artisan, les chiffres viennent de l'app → l'exception paraît couvrir ces cas. **À réexaminer avant tout lot où le modèle rédige** (compte rendu, réponse aux clients).
- **Art. 50 § 4 — texte publié pour informer le public sur des questions d'intérêt public** : ne vise ni un devis ni une relance.
- **Date d'application** : 2 août 2026 (selon des sources secondaires ; à confirmer au texte consolidé).
- **Pas de badge « IA » sur les documents envoyés aux clients** : c'est le document de l'artisan, qu'il a relu et validé.

### 5.3 RGPD
- **Anthropic devient sous-traitant de Mallettico.** Pour les données des clients de l'artisan, Mallettico est lui-même sous-traitant de l'artisan : Anthropic est un **sous-traitant ultérieur** (art. 28.2 et 28.4). Il faut une **autorisation écrite** de l'artisan. Texte de la clause : celui de l'article 11 des CGU, corrigé par le juriste le 3 nov. 2026 (branche `cloud/ia-socle`) : sous-traitants listés à l'article 4 de la politique et leurs propres sous-traitants selon leurs listes publiées ; préavis de 30 jours pour les sous-traitants directs de Mallettico ; faculté d'opposition et de résiliation. Mallettico reste pleinement responsable de ses sous-traitants.
- **Accord de traitement des données** (DPA) avec Anthropic, **sur le compte qui paie l'API** (lien avec Q-ia-credits, et Q-ia-sous-traitance).
- **Transferts hors UE** (chapitre V) : Anthropic stocke les données aux États-Unis ; pour l'Union européenne, le cocontractant est Anthropic Ireland, Limited. Son accord de traitement (version du 24 février 2025) comprend les clauses contractuelles types (décision (UE) 2021/914 ; RGPD, art. 46). L'adhésion au Data Privacy Framework n'a pas pu être lue (page en JavaScript) : ne rien écrire sur le DPF ; Hugo ouvre dataprivacyframework.gov et la liste des sous-traitants d'Anthropic dans un navigateur et note le résultat dans `docs/etat-production.md`.
- Conservation chez Anthropic (page officielle mise à jour le 1er juillet 2026, lue le 3 nov. 2026) : entrées et sorties de l'API supprimées sous 30 jours ; jusqu'à 2 ans si signalées ; scores de classification jusqu'à 7 ans ; plus si la loi l'exige. À relire le jour de l'allumage.
- **Base légale** : le contrat (art. 6.1 b), **pas le consentement** au sens du RGPD (l'artisan ne peut pas consentir pour ses clients). L'écran s'appelle donc « accord avant envoi à un service d'IA tiers », il est révocable (désactiver l'assistant), et **aucun appel ne part avant l'accord** (exigé aussi par Apple, ci-dessous).
- **Minimiser** : le repère envoyé ne contient **que des noms** (pas d'e-mail, pas de téléphone, pas de montant) — vérifié par un test (`contrat.js`). Au lot 1, les libellés et prix du catalogue de l'artisan s'y ajoutent (ce sont ses données, pas celles de ses clients).
- Journal côté Mallettico : jamais le texte de la demande ; seulement l'organisation, le compte, la date, l'offre, le modèle, les jetons, la durée et l'issue (12 mois).
- **Les photos** (facture fournisseur, plan, photo de chantier, lots 4 et suivants) :
  - **personnes visibles** : une photo de chantier peut montrer le client, un voisin, un ouvrier ou une plaque d'immatriculation. Consigne à l'écran : cadrer le document ou la pièce, pas les personnes. Rien ne part au modèle sans le geste de l'artisan, après l'aperçu de la photo ;
  - **position GPS** : la plupart des téléphones enregistrent le lieu de la prise de vue dans le fichier (données EXIF), souvent l'adresse du client. L'app retire ces métadonnées avant l'envoi au modèle et avant tout stockage (en réduisant l'image côté app) ; à vérifier par un test sur une vraie photo de téléphone ;
  - **durée de conservation** : la photo envoyée au modèle suit la règle d'Anthropic (30 jours, ci-dessus). Côté Mallettico, une photo n'est gardée que si elle est rattachée à une fiche (dépense, chantier) par l'artisan, aussi longtemps que cette fiche ; une facture fournisseur suit la durée de conservation des pièces comptables, dont l'original reste chez l'artisan. Sinon, elle n'est pas stockée. Ces durées s'écrivent dans la politique de confidentialité avant l'allumage ;
  - **finalité** : une photo sert seulement à remplir la fiche demandée, jamais à entraîner un modèle ni à une autre fin (art. 28.3 a).
- **« Signaler une erreur »** : Mallettico ne peut pas réutiliser les données des clients de l'artisan pour ses propres fins (art. 28.3 a et 28.10). Le signalement envoie la demande **après suppression des noms et coordonnées**, et l'artisan voit le texte transmis avant d'envoyer.
- **La voix.** Texte proposé pour la politique : « Si vous dictez, la reconnaissance vocale de votre navigateur ou de votre téléphone transforme votre voix en texte ; selon l'appareil, l'audio peut être traité par Google (Chrome) ou Apple (Safari, iOS). Mallettico ne reçoit que le texte. » Dans l'app native : exiger la reconnaissance **sur l'appareil** quand le téléphone le permet (Q-ia-voix-native), et les textes d'autorisation du micro demandés par iOS.
- **Stores.** Apple, règle 5.1.2(i) (relevée par le juriste sur developer.apple.com) : « You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so. » Google Play : les données envoyées à un prestataire agissant pour Mallettico se déclarent « collectées » ; la règle sur le contenu généré par IA demande un moyen de signaler un contenu dans l'app (« Signaler une erreur ») — texte de Google à vérifier.

### 5.4 Sécurité
- **Clé du modèle uniquement côté serveur** (secret de la fonction Edge). L'app n'appelle jamais Anthropic directement.
- **Jeton vérifié** (`auth.getUser()`, ou `identifierAppelant` de la règle `fonctions-edge`) : c'est la première faille de `voice-intent`.
- **Injection de consignes** : une dictée, une photo de facture ou un PDF peuvent contenir « ignore tes règles et… ». Défenses, dans l'ordre :
  1. le modèle ne peut produire qu'une **réponse structurée** (schéma JSON strict), jamais une action libre ;
  2. l'app **valide** chaque identifiant contre les fiches qu'elle a envoyées (`verifierParametres`) : un client inventé est rejeté ;
  3. **aucune intention d'envoi ni de suppression** n'existe ;
  4. tout passe par la validation de l'artisan.
- **Quota par organisation** (une équipe partage) et **plafond global quotidien** côté serveur, en base.
- **Taille bornée** : 600 caractères pour une demande texte ; photos redimensionnées avant envoi.

### 5.5 Ce que l'assistant ne fera pas
- Fixer un prix à la place de l'artisan : il peut montrer **les prix de l'artisan** (catalogue, anciens devis), jamais un prix du marché.
- Donner un avis juridique ou fiscal personnalisé.
- Envoyer, payer, supprimer.

### 5.6 Qualité : tests et évaluation
- **Tests unitaires** de tout ce qui est calcul et validation (20 dans le prototype).
- **Un jeu d'évaluation de 50 demandes pour commencer** (dictées d'Hugo sur ses chantiers, anonymisées), avec la bonne réponse attendue, pièges compris : homonymes (Dupont / Dubois), ambiguïtés, consignes glissées, montants sans « € », HT/TTC absents. Il grandit avec les signalements anonymisés. Rejoué à chaque changement de modèle ou de consignes.
- **Mesures sur ce jeu** : bonne intention ; **taux de mauvais client ou de mauvais article désigné** (le chiffre qui compte : « 0 valeur inventée » est garanti par construction, il ne se mesure pas) ; question posée quand il le faut.
- **En production**, à partir de 100 demandes : part des propositions validées **sans correction** (répondre à une question n'est pas une correction ; modifier une ligne, le client ou un prix en est une). En dessous de 70 %, on arrête d'étendre et on corrige.

## 6. Feuille de route en lots

Chaque lot se livre seul et a un critère **mesuré**. Les mesures viennent du journal (horodatage de l'ouverture, de la proposition, de la validation, de l'envoi), sans le contenu des demandes. Le lot 0 est préparé par la session `cloud/ia-socle`.

| Lot | Contenu | Critère mesurable | Taille |
|---|---|---|---|
| **0. Socle** | Fonction Edge (le socle `cloud/ia-socle` durcit `voice-intent` ; une fonction `assistant` reste à arbitrer, § 7.1) : jeton vérifié, schéma strict, quota par organisation en base (`usage_ia_log`, migration 107), plafond, coupure, journal (jetons, durée, issue ; sans le texte de la demande). Compte API et accord de traitement. Anthropic dans la politique de confidentialité et les CGU, écran d'accord. Suppression des fausses promesses et du code mort. | Un jeton forgé reçoit 401 ; quota atteint → `QUOTA_ATTEINT` ; crédits épuisés → `IA_INDISPONIBLE` et l'app continue ; aucun appel avant l'accord ; coût par demande < 0,001 $ (journal) | M |
| **1. Devis à la voix, à parité** | Dans « Demander » : devis de **plusieurs lignes** rapprochées du catalogue de l'artisan, création d'un nouveau client, préférence HT/TTC, questions ; brouillon, puis « Ouvrir le devis pour l'envoyer ». Remplace `DicteeModal`. Alerte « détaillez les prestations » quand un devis à un particulier n'a qu'une ligne au forfait : obligatoire pour un dépannage, une réparation ou un entretien listés en annexe de l'arrêté du 24 janvier 2017 (art. 1er et 4), conseillée ailleurs. Texte de l'alerte dans l'app : « Détaillez chaque prestation (quantité, unité, prix unitaire) : obligatoire pour un dépannage, une réparation ou un entretien chez un particulier. » | Sur les **mêmes 10 devis réels d'Hugo**, saisis une fois à la main et une fois à la voix : médiane « ouverture → devis **prêt à envoyer** » divisée par 2 au moins ; taux de mauvais client désigné < 5 % sur le jeu d'évaluation | M |
| **2. Commandes sans modèle** | Dans la même entrée, reconnues par l'app (comme le simulateur du prototype) : relances (envoi par le circuit existant), encaissé, heures, paiement reçu, facture ou acompte depuis un devis, refaire un devis. Le modèle n'est appelé que si l'app ne reconnaît pas la phrase. | 0 $ par commande reconnue ; ≥ 80 % des commandes reconnues sans le modèle sur le jeu d'évaluation ; médiane « demande → relance envoyée » < 20 s | M |
| **3. Contrôle du devis** | Au moment d'envoyer : **règles d'abord** (ligne sans prix, quantité à 0, TVA réduite sans mention de certification, une seule ligne au forfait chez un particulier), puis un avis « points à vérifier » du modèle. Jamais « conforme ». | Sur un jeu de 50 devis **étiqueté à l'avance par Hugo** : ≥ 1 vrai problème trouvé par tranche de 10 devis, < 1 fausse alerte sur 5 | M |
| **4. Facture fournisseur → dépense** | Photo → fournisseur, date, HT, **montant** de TVA lu, chantier proposé ; prix d'achat du catalogue mis à jour **avec accord**. | Médiane « photo → dépense enregistrée » < 40 s (contre 2 à 3 min) ; 0 TVA déductible qui ne figure pas sur la facture | M |
| **Selon les mesures** | Compte rendu de chantier (après examen du marquage, § 5.2), import de catalogue PDF, réponses aux clients (quand les messages passent par l'app), informations sur les réglages, recherche en langage courant. | — | — |

**Ce qui n'est pas dans la feuille de route** : un « chat » libre ; une IA qui « apprend » seule des prix (la table `ai_memory` reste inutilisée) ; toute action sans validation.

**Après le lot 1, on mesure avant d'aller plus loin.** Si le devis à la voix n'est pas utilisé par les premiers artisans, le reste est à revoir.

## 7. Conséquences sur l'app

### 7.1 Architecture
- **Une seule fonction Edge** (proxy), plutôt qu'une par usage : un seul endroit pour le jeton, le quota, la coupure et le journal. **État au 3 nov. 2026** : le socle (`cloud/ia-socle`) durcit `voice-intent` et ne crée pas de fonction `assistant` ; il refuse toute fonction sans quota décidé. Le contrat du prototype (`src/lib/ia/contrat.js`) reprend ses codes d'erreur (`QUOTA_ATTEINT`, `PLAFOND`, `IA_INDISPONIBLE`, `NON_CONNECTE`…) et sa forme d'erreur (`{ error, code }`). À arbitrer par Hugo : étendre `voice-intent` à l'assistant, ou créer `assistant` sur le même socle.
- **Deux étages de compréhension.** D'abord l'app (règles, comme `src/lib/ia/simulateur.js`) pour les commandes simples : gratuites, instantanées, hors ligne. Ensuite le modèle, seulement pour ce que l'app ne reconnaît pas (devis, phrases libres). C'est ce qui rend l'expérience **fluide et presque gratuite**.
- **Quota par organisation** : table `usage_ia_log` (migration 107 du socle) : une ligne par usage (organisation, compte, fonction, modèle, jetons, durée, issue), réservée **par le serveur** avant l'appel, sous verrou, puis close. Aucun texte de demande. Lecture seule pour l'app. Quotas du socle aujourd'hui : 10 dictées par mois en Gratuit, sans limite mensuelle en Artisan et Équipe (100 par jour au plus) ; à trancher avec l'option A du § 7.2 (Q-ia-gratuit).
- **Coupure** : un réglage serveur (marche / pause) + coupure automatique sur erreur de crédit ou au-delà d'un seuil (par exemple 90 $ dans le mois). L'app reçoit `IA_INDISPONIBLE` et le dit sans paniquer.
- **Suivi des coûts** : coût calculé à chaque appel à partir de l'usage renvoyé par l'API. Un résumé dans le Pilote d'Hugo (coût du mois, demandes, organisations au plafond).
- Journal : usage_ia_log (migration 107), sans le texte ; ai_analyses reste inutilisée.
- **Démo** : le simulateur reste la réponse en démonstration : aucune dépense, et la démo marche hors ligne.
- **Remplacer `DicteeModal`** au lot 1, en gardant son savoir-faire (annulation en 20 s, reprise sans doublon, rapprochement du catalogue).
- **Préférence HT/TTC** : réglée une fois (« je dicte mes prix en HT »), pour supprimer une question à chaque devis.
- **Bouton au téléphone** : en haut dans le prototype ; on mesure au lot 1 avant de le déplacer (Q-ia-bouton).
- **Mention de certification de la TVA réduite** : vérifier, au lot 1, qu'un brouillon créé par l'assistant à 10 % ou 5,5 % imprime bien la mention (`mentionTvaReduite.js`) dans **les deux** générateurs de PDF. Ajouter l'autoliquidation (sous-traitance) aux choix de TVA.

### 7.2 Offres et prix
Aujourd'hui : Gratuit (5 devis par mois), Artisan 9,90 €, Équipe 19,90 € (D-29 : on n'annonce que les limites réellement appliquées).

| Option | Gratuit | Artisan | Équipe | Coût max. par compte et par mois (Haiku) |
|---|---|---|---|---|
| **A (recommandée)** | 20 demandes au modèle / mois | 300 demandes + 30 photos | 1 000 demandes + 100 photos, partagées | Gratuit 0,015 $ ; Artisan 0,23 $ ; Équipe 0,8 $ |
| B | Rien | Comme A | Comme A | — |
| C | Illimité partout (« usage raisonnable ») | | | Non borné : **déconseillé** |

Les commandes reconnues par l'app (lot 2) ne comptent pas dans le quota : elles ne coûtent rien. Avec A, 500 comptes gratuits actifs coûtent moins de 10 $ par mois. L'IA ne justifie pas une hausse de prix aujourd'hui : elle sert à **convaincre et retenir**. Les quotas affichés doivent être **ceux que le serveur applique** (D-29), et la page des tarifs doit dire ce qui se passe au plafond.

### 7.3 Textes légaux (à faire relire par `juriste-btp` au lot 0)
- **Politique de confidentialité** : Anthropic dans le tableau des sous-traitants (finalité, données, pays, garanties de transfert, conservation citée) ; la voix (texte au § 5.3).
- **CGU** : ce que fait l'assistant ; l'artisan reste responsable de ce qu'il valide et envoie ; l'assistant peut se tromper ; annexe art. 28 avec l'autorisation générale de sous-traitance ultérieure (texte au § 5.3) ; quotas.
- **CGV** : un artisan, même en EI, n'est pas un consommateur (C. conso., article liminaire) ; règles applicables : C. civ. 1170 et 1171 (contrat d'adhésion), C. com. L442-1, I, 2°. Texte proposé par le juriste : « L'assistant est une fonction complémentaire, limitée par les quotas de votre offre. Il peut être suspendu temporairement, notamment pour maîtriser les coûts ou la sécurité ; le reste du service n'est pas affecté. Une suspension de moins de [15] jours consécutifs dans le mois n'ouvre pas droit à remboursement. » (seuil : Q-ia-pause).
- **Écran d'accord** : court, une fois, avec la mention IA (art. 50 § 1) et un lien vers la politique ; révocable.
- **Stores** : déclarations de sécurité des données mises à jour (`redacteur-stores`).

### 7.4 Marketing
- On peut reparler d'IA **uniquement de ce qui est en production et mesuré** (C. conso. L121-2, étendu aux pratiques visant des professionnels par L121-5). Le test `honnetete.test.js` est assoupli **mot par mot** (« assistant », « à la voix ») et seulement pour les fonctions allumées.
- **Interdit** : « l'IA fait vos devis » (elle prépare, vous validez) ; « devis conformes » ; « le seul outil qui… » ; « l'IA ne peut pas se tromper sur la TVA » ; « gagnez X heures » sans mesure publiée ; toute comparaison avec Obat ou Batappli qui ne soit pas objective et vérifiable à sa date (L122-1).
- **Possible après le lot 1 et ses mesures** : « Dites "devis pour Mme Martin, tableau 3 rangées, 6 disjoncteurs" : le brouillon est prêt, vous validez. » ; « Le taux de TVA, c'est toujours vous qui le choisissez. » — avec une vidéo réelle tournée sur le compte démo (D-26, D-27).

### 7.5 Support
- Une page d'aide courte : ce que l'assistant sait faire, ce qu'il ne fait jamais (envoyer, inventer un prix), que faire s'il est indisponible.
- « Signaler une erreur » sur chaque proposition, **anonymisé** et montré à l'artisan avant envoi (§ 5.3).

## 8. Risques

| Risque | Probabilité | Effet | Parade |
|---|---|---|---|
| Un montant ou une TVA faux sur un devis envoyé | Moyenne sans garde-fous | Perte d'argent, de crédibilité, litige | Règle d'or : le modèle ne produit aucun montant ni taux ; questions ; brouillon ; relecture ; contrôle avant envoi (lot 3) |
| Devis d'une seule ligne au forfait chez un particulier | Moyenne | Devis non détaillé, contraire à l'arrêté du 24 janvier 2017 (art. 4) pour un dépannage, une réparation ou un entretien | Lot 1 : plusieurs lignes ; alerte « détaillez les prestations » |
| Crédits épuisés en milieu de mois | Faible avec quotas | Assistant indisponible | Coupure propre, seuil, quotas ; commandes simples sans modèle |
| Arrêt de l'API (crédits Max épuisés, ou Hugo quitte Max) | Faible avec quotas | Assistant indisponible | Espace de travail dédié avec limite de dépense ; coupure propre ; ou compte payant au nom de l'EI (Q-ia-credits) |
| Jeton volé, abus | Moyenne si la faille reste | Budget brûlé | Jeton vérifié, quota en base, plafond global |
| Injection de consignes | Moyenne | Action non voulue | Schéma strict, validation des identifiants, pas d'intention d'envoi, validation humaine |
| Données des clients réutilisées par Mallettico | Faible | Mallettico devient responsable de traitement (art. 28.10) | Signalements anonymisés, rien d'autre |
| Refus d'un store (IA tierce sans accord) | Moyenne sans écran | Retard de publication | Écran d'accord, aucun appel avant, déclarations à jour |
| Promesse marketing fausse | Moyenne (pression concurrentielle) | Pratique commerciale trompeuse (L121-2, L121-5) | Ne parler que du mesuré ; test d'honnêteté |
| Personne ne l'utilise | Moyenne | Effort perdu | Lot 1 petit, mesuré, puis décision |
| **Temps de maintenance d'Hugo** | Élevée | Moins de temps pour le reste | Une seule entrée, une seule fonction Edge, commandes sans modèle, jeu d'évaluation court |
| Reconnaissance vocale médiocre sur Safari et iOS | Élevée sur iPhone | Dictée peu utilisable | Le clavier reste l'entrée de secours ; reconnaissance du téléphone dans l'app native |

## 9. Décisions pour Hugo

Format de `docs/decisions.md`. Elles ne sont pas ajoutées à `docs/decisions.md` : la session locale le fera après relecture.

### Q-ia-credits · Quel compte API pour l'app en production ?
Contexte : l'offre Claude Max inclut 100 $ de crédits API par mois, à réclamer en liant une organisation Console (claude.ai › Réglages › Facturation › Crédits API) ; ils expirent à chaque cycle, sans report, et l'API s'arrête quand ils sont épuisés, sauf crédits achetés. La documentation d'Anthropic destine ces crédits à ses propres applications ; ils ne se cèdent pas. L'organisation Console relève des Conditions commerciales et de leur DPA. Risque restant : l'arrêt de l'API si Hugo quitte Max ou épuise les crédits. Créer pour Mallettico un espace de travail dédié, avec sa limite de dépense. Le coût réel est faible (§ 3). (Sources lues par le juriste le 3 nov. 2026 : platform.claude.com, « API credits for Max, Ultra, and Team plans » ; anthropic.com/legal/credit-terms.)
Option `api-payante` : un compte API facturé à l'usage au nom de l'EI, avec un plafond de dépense mensuel (par exemple 30 $) — aucune incertitude ; quelques dollars par mois au début.
Option `credits-max` : les crédits de l'offre Max (gratuits, une seule organisation liée), dans un espace de travail dédié avec sa limite de dépense — arrêt de l'API s'ils sont épuisés ou si Hugo quitte Max.
Recommandation : à décider par Hugo. Le juriste ne relève pas d'interdiction pour `credits-max` ; `api-payante` évite le risque d'arrêt lié à l'abonnement personnel, pour quelques dollars par mois.
Irréversible : non
Bloque : lot 0

### Q-ia-sous-traitance · Signer l'accord de traitement des données avec Anthropic ?
Contexte : les demandes contiennent les noms des clients de l'artisan. Anthropic devient sous-traitant ultérieur (RGPD art. 28.2 et 28.4). Il faut l'accord de traitement d'Anthropic sur le compte qui paie, vérifier les garanties de transfert (Data Privacy Framework ou clauses types) et la durée de conservation, puis l'écrire dans la politique de confidentialité et les CGU.
Option `signer` : accepter l'accord de traitement d'Anthropic sur le compte API, puis faire relire les textes par `juriste-btp` — condition pour allumer.
Option `attendre` : ne rien allumer tant que ce n'est pas fait.
Recommandation : `signer` — c'est une condition de D-07.
Irréversible : non
Bloque : lot 0

### Q-ia-accord · Comment demander l'accord de l'artisan ?
Contexte : avant le premier usage, l'artisan doit savoir que sa demande (et les noms de ses clients) part chez Anthropic, aux États-Unis, et qu'il parle à une IA (AI Act art. 50 § 1). Apple (5.1.2(i)) exige une permission explicite avant tout partage avec une IA tierce. Ce n'est pas un « consentement » au sens du RGPD (base : le contrat).
Option `ecran` : un écran court au premier « Demander », une fois, révocable, avec un lien vers la politique — aucun appel avant l'accord.
Option `inscription` : une case à l'inscription — moins de friction, mais les comptes existants ne l'ont pas vue.
Recommandation : `ecran` — clair, et marche pour les comptes existants.
Irréversible : non
Bloque : lot 0

### Q-ia-gratuit · L'assistant dans le plan Gratuit ?
Contexte : une demande au modèle coûte environ 0,0005 à 0,0007 $ (§ 3). Batappli limite à 8 devis IA par mois dans son offre à 39 € HT. L'assistant est surtout un argument pour essayer et rester. Les commandes reconnues par l'app (lot 2) ne coûtent rien.
Option `a` : Gratuit 20 demandes au modèle par mois ; Artisan 300 + 30 photos ; Équipe 1 000 + 100 photos — fait essayer ; coût négligeable et borné.
Option `b` : pas d'assistant en Gratuit — pousse à payer, mais on ne peut pas l'essayer.
Option `c` : illimité partout — simple, mais coût non borné.
Recommandation : `a` — l'essai convainc mieux qu'une promesse.
Irréversible : non (mais une baisse de quota après annonce déçoit)
Bloque : lot 0 (quotas), page des tarifs

### Q-ia-ordre · Quel premier lot après le socle ?
Contexte : Hugo veut une entrée unique pour tout le cycle. Le critique produit relève que relances, encaissé et heures n'ont pas besoin d'un modèle (calculs existants) et qu'un premier lot à quatre demandes, voix, remplacement de la dictée et nouveau bouton est trop gros pour être livré et mesuré.
Option `devis-parite` : lot 1 = devis à la voix à parité avec la dictée, dans l'entrée unique ; lot 2 = les commandes sans modèle — l'entrée unique existe dès le lot 1 et grandit.
Option `quatre` : lot 1 = les quatre demandes du prototype d'un coup — l'expérience complète plus tôt, mais un lot gros et difficile à mesurer.
Option `controle` : commencer par le contrôle du devis — la vraie différence, mais moins visible.
Recommandation : `devis-parite` — on garde l'entrée unique, on livre petit, on mesure.
Irréversible : non
Bloque : lot 1

### Q-ia-tva-defaut · Peut-on pré-remplir le taux de TVA ?
Contexte : demander le taux à chaque devis ajoute un geste. Le critique produit propose de pré-afficher un taux avec sa raison (« comme le dernier devis de ce client »), modifiable. Le juriste a validé que le taux soit toujours demandé ; un pré-remplissage n'a pas été relu.
Option `toujours-demander` : le taux est toujours demandé (sauf franchise) — aucun risque nouveau ; un geste de plus.
Option `pre-rempli` : taux du dernier devis du même client, affiché avec sa raison, à confirmer dans le récapitulatif — un geste de moins ; à faire relire par `juriste-btp` (la mention de certification doit suivre).
Recommandation : `pre-rempli` — après relecture du juriste ; `toujours-demander` en attendant.
Irréversible : non
Bloque : lot 1

### Q-ia-voix-native · Dans l'app native, la reconnaissance vocale sur l'appareil ?
Contexte : selon l'appareil, l'audio peut être traité par Google (Chrome, Android) ou Apple (Safari, iOS). Sur les téléphones récents, la reconnaissance peut se faire sur l'appareil, sans envoi.
Option `appareil` : exiger la reconnaissance sur l'appareil quand le téléphone le permet, sinon le clavier — rien ne part, un téléphone ancien n'a que le clavier.
Option `annoncer` : utiliser la reconnaissance du système telle quelle et l'écrire dans la politique de confidentialité — marche partout.
Recommandation : `annoncer` au lancement, `appareil` dès que l'app native est prête.
Irréversible : non
Bloque : app native

### Q-ia-demo · Le prototype reste-t-il visible en démonstration publique ?
Contexte : avant la correction du 3 nov. 2026, `?demo=true` (le lien « Voir la démo » du site) montrait le prototype (réponses simulées) à tout visiteur, alors que le site ne parle plus d'IA et que la fonction n'existe pas encore pour de vrai. La fenêtre dit « Démonstration : réponses simulées ».
Option `demo` : visible en démo (comme dans la branche) — Hugo peut le montrer.
Option `cache` : visible seulement avec un paramètre en plus (`?demo=true&apercu=ia`) — rien de visible par hasard.
Recommandation : `cache` — aucune ambiguïté pour un visiteur (relecture juriste : L121-2), et Hugo garde le lien.
Irréversible : non
Bloque : livraison du prototype sur `main`

### Q-ia-relances-ton · L'IA peut-elle adapter le texte des relances ?
Contexte : aujourd'hui, les relances reprennent un texte relu par le juriste (`messageRelance.js`). Adapter le ton gagne peu de temps et ajoute un risque (ton, mentions de pénalités, marquage AI Act).
Option `texte-relu` : toujours le texte relu ; l'app ne fait que choisir les factures — aucun risque nouveau.
Option `ton` : l'IA propose une variante de ton, que l'artisan voit avant d'envoyer — plus personnel.
Recommandation : `texte-relu` — `ton` seulement si les artisans le demandent.
Irréversible : non
Bloque : lot 2

### Q-ia-pause · Remboursement si l'assistant est indisponible ?
Contexte : l'assistant peut être coupé (crédits, sécurité). Le juriste propose une clause des CGV : pas de remboursement pour une suspension de moins de N jours consécutifs dans le mois.
Option `quinze` : 15 jours — protège l'abonné en cas de longue panne.
Option `aucun` : aucun remboursement (fonction complémentaire) — plus simple, plus contestable (C. civ. 1171).
Recommandation : `quinze`.
Irréversible : non
Bloque : CGV du lot 0

### Q-ia-bouton · Où placer « Demander » au téléphone ?
Contexte : le prototype le met dans l'en-tête (visible partout). Au pouce, un bouton central dans la barre du bas est plus facile à atteindre.
Option `entete` : en haut, comme le prototype ; on mesure l'usage au lot 1.
Option `barre` : au centre de la barre du bas (téléphone), en haut sur ordinateur.
Recommandation : `entete` d'abord, puis décider avec les mesures et `ingenieur-mobile`.
Irréversible : non
Bloque : rien (décision après le lot 1)

## 10. Le prototype

**Où l'essayer** : `?demo=true&apercu=ia`, bouton « Demander » en haut de l'écran, ou Ctrl+J. Il est absent avec `?demo=true` seul et sur un vrai compte (interrupteur `FONCTIONS.assistant`, éteint, séparé de `FONCTIONS.ia`).

**Ce qu'il fait** : les quatre demandes, avec des exemples à toucher sous le champ. Il montre l'expérience entière ; la feuille de route la livre en plusieurs lots (§ 6).
- « Devis pour Mme Martin, remplacement du tableau, 1 200 € » : le client est reconnu mais confirmé (« C'est bien Jean Martin ? », ou choisi dans la liste ; la création d'un nouveau client attend le lot 1), HT ou TTC est demandé, le taux de TVA est demandé (libellés relus par le juriste) ; puis les totaux, et « Enregistrer le brouillon ». Le brouillon est vraiment créé dans les données de démo, pas envoyé ; « Ouvrir le devis pour l'envoyer » mène au devis.
- « Relance les factures en retard » : la liste des factures échues, avec le reste dû, le retard, le canal et le message (le texte déjà relu de l'app). Le bouton dit « Simuler l'envoi de N relances » ; après le geste : « Démonstration : aucun message n'est parti ». Hors démo, pas de bouton : « Pour l'instant, envoyez vos relances depuis chaque facture. » **Au 3 nov. 2026, les données de démo n'ont aucune facture échue** : l'assistant le dit (« Aucune facture en retard »), ce qui est vrai. Les captures et le parcours avancent l'horloge de la page de 40 jours pour montrer la liste.
- « Combien j'ai encaissé ce mois-ci » : le même chiffre que la tuile de l'accueil, avec le détail des paiements.
- « Ajoute 3 h sur le chantier Dupont » : le chantier est reconnu, la personne est demandée, l'ajout est « à approuver » et annulable.

**Ce qu'il ne fait pas encore** (lot 1) : appeler un vrai modèle (hors démo, l'appel suit le contrat, mais la fonction Edge n'existe pas encore) ; plusieurs lignes et prix du catalogue ; créer un nouveau client ; envoyer les relances ; l'autoliquidation.

**Captures** (`docs/ia/captures/`) : `accueil`, `devis`, `devis-pret`, `relances`, `encaisse`, `heures`, à 375 et 1440 px, en clair ; `accueil`, `devis-pret`, `relances` en sombre.

## 11. Relectures intégrées (3 nov. 2026)

**`critique-produit`** — verdict : « plus petit ». Intégré : lot 1 réduit au devis à parité avec la dictée (plusieurs lignes, catalogue, nouveau client) ; commandes sans modèle en lot 2 ; occasions ajoutées (paiement reçu, refaire un devis, facture depuis un devis) ; critère mesuré jusqu'au devis prêt à envoyer sur les mêmes 10 devis ; « 0 valeur inventée » remplacé par le taux de mauvais client ; « correction » définie, minimum de 100 demandes ; contrôle du devis par des règles d'abord, jeu étiqueté par Hugo ; jeu d'évaluation à 50 ; fréquences marquées « non vérifiées » et ordre expliqué ; seuil de prix de Haiku à revérifier ; « non trouvé au 3 nov. 2026 » ; Q-ia-credits recommande le compte payant ; Q-ia-bouton ne bloque plus ; Q-ia-sous-traitance, Q-ia-voix-native et Q-ia-tva-defaut ajoutées ; préférence HT/TTC ; « Ouvrir le devis pour l'envoyer » ; libellés de TVA qui dépassaient à 375 px corrigés et champ de demande qui s'agrandit. Non retenu tel quel : pré-remplir la TVA sans relecture juridique (devenu Q-ia-tva-defaut).

**`juriste-btp`** — intégré : « rien n'est ajouté à vos documents et rien n'est envoyé à vos clients sans votre accord » (au lieu de « rien n'est enregistré ni envoyé ») ; Mallettico fournisseur au sens de l'AI Act, art. 50 § 1 et § 2, § 4 hors champ ; « Assistant d'intelligence artificielle » ; signalements anonymisés (art. 28.10) ; autorisation générale de sous-traitance ultérieure dans les CGU ; « accord » et non « consentement » ; texte sur la voix ; règle Apple 5.1.2(i) citée ; libellés de TVA corrigés, autoliquidation à ajouter, mention de certification à vérifier dans les deux générateurs ; alerte pour un devis à une seule ligne au forfait ; « momentanément indisponible » ; libellé des relances validées hors démo ; facture fournisseur : montant de TVA lu, la photo ne remplace pas l'original ; informations générales et non consultation (loi 71-1130, art. 54) ; marketing L121-5 et L122-1 ; clause de suspension des CGV. **Reste ouvert** : vérifier la règle de Google sur le contenu généré par IA. L'article 50 § 1 et § 5 a été lu par le juriste le 3 nov. 2026 sur ai-act-service-desk.ec.europa.eu.

**`juriste-btp`, au texte officiel (3 nov. 2026, EUR-Lex, Légifrance, CNIL, pages publiques d'Anthropic)** — intégré : concurrents relus sur leurs pages (§ 2) ; « ne choisit jamais un taux de TVA » et « recopie les chiffres dits » (§ 0, § 5.1) ; alerte « détaillez les prestations » limitée au dépannage, à la réparation et à l'entretien de l'arrêté du 24 janvier 2017 (§ 6, § 8) ; conservation chez Anthropic (§ 5.3) ; aucun texte de demande conservé (option A, § 5.3, § 6, § 7.1) ; crédits de l'offre Max présentés comme une option (Q-ia-credits) ; rien sur le Data Privacy Framework (introuvable).
