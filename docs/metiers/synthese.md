# Une expérience par métier — synthèse

> Recherche du 3 nov. 2026 (session cloud « metiers », branche `cloud/metiers`). Aucun code.
> Base : 15 fiches métier, `commun.md` (règles communes), `chiffres.md` (priorité chiffrée), et le code au commit `adbf08d`.
> **Limite à lire d'abord** : le réseau de la session bloquait Légifrance, le BOFiP, service-public et l'INSEE. Toutes les sources ont été lues par **résumé de moteur de recherche** ([résumé]), aucun texte officiel n'a été ouvert. Rien ne doit devenir une règle bloquante sans relecture au texte. Relecture `juriste-btp` : voir la fin.

## 1. Ce qui est commun à tous les métiers, et ce qui ne l'est pas

### Commun (une tâche sert tout le monde)

| Sujet | Ce qui vaut pour tous | Où |
|---|---|---|
| Décennale | Due pour les travaux de construction ; attestation à **joindre** au devis et à la facture (C. assur. L243-2). La frontière « soumis / non soumis » varie **au sein d'un même métier** (peintre : intérieur non, façade étanche oui ; serrurier : ouverture de porte non, garde-corps oui). | `commun.md` § 1, `metier-btp.md` § 2 |
| Devis | Dépannage, réparation, entretien chez un particulier : devis détaillé préalable, taux horaires et déplacement affichés (arrêté du 24 janv. 2017). Hors établissement : 7 jours sans paiement, 14 jours de rétractation. | `metier-btp.md` § 2 |
| TVA | 20 / 10 / 5,5 % selon les travaux et le logement ; certification du client sur le devis ou la facture ; **plusieurs taux dans un même devis** est la règle, pas l'exception (fenêtres + porte intérieure ; terrasse + plantations). | `commun.md` § 3 |
| Sous-traitance | Autoliquidation (CGI 283-2 nonies), situations, retenue de garantie (5 % max), attestation de vigilance demandée par le donneur d'ordre. | `commun.md`, `macon.md` |
| Aides | MaPrimeRénov' par geste réduit aux pompes à chaleur depuis le 1er sept. 2026 [résumé] ; CEE (offre avant la signature du devis) ; éco-PTZ ; crédit d'impôt services à la personne. | `commun.md` § 4 |
| Réception | PV de réception, avec ou sans réserves : il fait courir les garanties 1 / 2 / 10 ans. | `metier-btp.md` § 6 |
| Preuve | Photos avant / pendant / après : demandées par presque toutes les fiches (litige d'aspect, isolant caché, aides, assurance). | fiches § 8 |

### Propre à certains métiers (le vrai travail « par métier »)

| Famille | Ce qui est propre | Métiers |
|---|---|---|
| **Attestation + rappel périodique** (modèle du ramonage) | Un document réglementaire remis après chaque visite, et une obligation du client à rappeler | ramoneur (fait), chauffagiste (chaudière 1 an, PAC 4-70 kW 2 ans, poêle), frigoriste (contrôle d'étanchéité selon la charge) |
| **Certificat de fin de travaux** | Un document d'un organisme tiers que l'artisan remplit | électricien (Consuel, 4 couleurs), plombier-chauffagiste (certificat gaz modèle 2) |
| **Qualification à afficher** | Un numéro distinct du RGE, parfois condition du taux ou de l'aide | IRVE, attestation de capacité fluides, appellation PG gaz, Certibiocide, Certiphyto, SAP |
| **Ligne technique structurée** | Des valeurs exigées sur le devis et la facture pour l'aide ou le taux | menuisier (Uw, Sw, « remplace existant »), plaquiste et couvreur (R, surface, isolant), PAC (classe, fluide, n° d'agrément) |
| **Métré** | Le devis naît d'un relevé de surfaces | plaquiste, peintre, carreleur |
| **Urgence sur le pas de la porte** | Devis en deux minutes, grille de prix affichée, facture remise avant paiement | serrurier, plombier, couvreur après tempête |
| **Récurrence** | Contrat d'entretien, passages, facture par passage | chauffagiste, paysagiste, multiservice |
| **Attestation fiscale annuelle** | Crédit d'impôt 50 %, plafonds par foyer | multiservice, paysagiste (petit jardinage) |
| **Chantier long** | Situations, PV de réception, retenue de garantie, avenant | maçon, charpentier, couvreur, plaquiste |

## 2. Ce que Mallettico fait déjà (constaté dans le code, commit `adbf08d`)

| Fonction | État | Preuve |
|---|---|---|
| Parcours ramonage complet | Fait : attestation numérotée par la base et figée, facture tirée, rappel automatique, refus des rappels | `src/lib/ramonage.js`, `src/components/ramonage/`, D-30 |
| Bibliothèque métiers | 17 métiers dans `TRADE_LIBRARY` (sans ramonage, sans frigoriste, sans multiservice) | `src/lib/templates/trade-library.js` |
| Modèles de devis | 29 familles, dont ramonage, IRVE-solaire, rénovation énergétique, nettoyage | `src/lib/data/modeles/index.js` |
| Référentiel d'articles | 15 catégories, choisies à l'import du catalogue (seul endroit où l'artisan « choisit ses métiers ») | `src/lib/data/articles-btp.js`, `src/components/catalogue/Demarrage.jsx` |
| Choix du métier à l'inscription | **Absent** (aucune colonne `metier`) | `docs/cadrage-ramonage.md` § 2 |
| Tâches de chantier par métier | Existent, reconnaissent des libellés de métier | `getTaskTemplatesForMetier`, `src/lib/templates/task-templates-v2.js` |
| TVA par défaut | Un seul taux pour l'entreprise (`tvaDefaut`, 10 % par défaut) | `src/services/entrepriseService.js` l. 97 |
| Certification de TVA réduite | Faite, dans les deux générateurs | `src/lib/mentionTvaReduite.js` |
| Décennale, RC pro | Champs complets, case « non soumis » pour toute l'entreprise (D-24) | `src/components/Settings.jsx` |
| **RGE** | **Saisi mais jamais imprimé** : Paramètres enregistre `rge` et `rgeOrganisme`, alors que les deux générateurs impriment `labels`, que rien n'écrit | `Settings.jsx` l. 767-770 ; `devisHtmlBuilder.js` l. 454 ; `DevisPage.jsx` l. 1692 |
| Organismes RGE | La liste propose **« Qualiopi »**, qui n'est pas un organisme RGE (certification des organismes de formation) | `Settings.jsx` l. 140 ; `commun.md` § 5 |
| Autoliquidation | Champ enregistré sur une dépense ; **aucune mention imprimée** sur un devis ou une facture | `useSupabaseSync.js` l. 737 ; aucune occurrence dans les générateurs |
| Attestations autres que ramonage | Aucune | — |
| Rappels autres que ramonage | Aucun ; le mécanisme (`rappelsDus`, refus, lien de désinscription, envoi automatique) est réutilisable | `src/lib/ramonage.js`, migration 104 |
| Situations, acompte, 7 jours | Faits (`delaiSeptJours`, `echeanceApresSeptJours`, situations) | `src/lib/retractation.js`, `situationUtils.js` |

Deux défauts sont à corriger **quel que soit le choix sur les métiers** : le RGE jamais imprimé, et « Qualiopi » dans la liste RGE.

## 3. Proposition : l'expérience par métier

Principe : **un métier ne crée pas une autre app**. Il règle des valeurs par défaut et allume des modules. Tout reste accessible ; un artisan peut avoir plusieurs métiers (plombier-chauffagiste, serrurier-métallier).

### 3.1 Choix du métier
- À l'inscription : « Quels travaux faites-vous ? » — choix multiple, 15 métiers + « Autre », passable. Modifiable dans Paramètres › Mon métier.
- Effets visibles dès le choix : catalogue et modèles du métier en premier, modules du métier allumés (comme « J'effectue des ramonages »), TVA par défaut proposée.
- Rien n'est caché définitivement : « Afficher tous les métiers » en un geste.

### 3.2 Catalogue et modèles
- Ouvrir `TRADE_LIBRARY` et le référentiel sur les métiers choisis ; ajouter les métiers manquants (ramonage, frigoriste, multiservice).
- **Purger les promesses d'aides périmées** des modèles (fenêtres, isolation : MaPrimeRénov' par geste) et les taux de TVA périmés (chaudière gaz à 20 % depuis mars 2025 [résumé]).
- Lignes structurées par métier : menuiserie (dimensions, Uw, Sw, remplacement), isolation (R, surface, isolant), PAC (classe, fluide, n° d'agrément), borne (puissance).

### 3.3 Documents propres au métier (modèle : attestation de ramonage)
Même mécanique pour tous : saisie sur un écran, numéro donné par la base, document figé, PDF, envoi, **facture tirée du document**, rappel éventuel.

| Document | Métier | Statut juridique |
|---|---|---|
| Attestation d'entretien de chaudière | chauffagiste | Obligatoire (décret 2009-649 ; contenu fixé par arrêté, annexe non lue) |
| Attestation d'entretien PAC / clim 4-70 kW | chauffagiste, frigoriste | Obligatoire tous les 2 ans (C. env. R224-44 [résumé]) |
| Attestation d'entretien poêle / insert | ramoneur, chauffagiste | Obligatoire (CSP R1331-67, -68 ; arrêté du 20 juil. 2023, annexe 3) |
| Fiche d'intervention fluides (CERFA 15497*04) | frigoriste | Obligatoire ; format CERFA exact : plus tard |
| Rapport de recherche de fuite | plombier | Usage assurance (convention IRSI), pas un document réglementaire |
| Compte rendu d'intervention / autocontrôle | électricien | Usage ; **jamais le mot « conforme »** |
| PV de réception, levée des réserves | maçon, charpentier, couvreur, plaquiste | Usage établi (C. civ. 1792-6), pas de modèle imposé |
| Attestation fiscale annuelle SAP | multiservice, paysagiste | Obligatoire pour le crédit d'impôt |
| Bon de passage | paysagiste, multiservice | Usage (preuve) |

Le Consuel et le certificat gaz restent des documents **d'organismes tiers** : l'app rappelle de les faire et joint le fichier, elle ne les fabrique pas.

### 3.4 Rappels périodiques
Un seul moteur, celui du ramonage, paramétré par type d'appareil : chaudière 12 mois, PAC 24 mois, poêle selon relecture, contrôle d'étanchéité selon la charge. Mêmes garde-fous : prospection « client existant » (CPCE L34-5), refus à la saisie et dans chaque message, pas d'appel à un particulier sans consentement (C. conso. L223-1), jamais « obligatoire » ni ton administratif. Les rappels « conseillés » (toiture, détartrage, saison du jardin) sont étiquetés comme des conseils.

### 3.5 Mentions
- Dépannage (serrurier, plombier) : grille tarifaire dans les Paramètres avec page imprimable (affichage obligatoire de l'arrêté de 2017), case « urgence demandée par le client », pièces remplacées.
- Sous-traitance : mention d'autoliquidation **imprimée**, dans les deux générateurs.
- Décennale **par devis** et non plus seulement pour toute l'entreprise (prolonge D-24) : utile au peintre, au serrurier-métallier, au paysagiste.
- Photos en annexe du devis et de la facture.

### 3.6 TVA par défaut
Par ligne plutôt que par entreprise : la bibliothèque du métier propose un taux par type de ligne (paysagisme : plantation 20 %, terrasse 10 % [résumé] ; menuiserie : 5,5 % seulement si « remplace existant » et Uw/Sw saisis). **Toujours une suggestion, jamais un blocage**, tant que les seuils ne sont pas relus au BOFiP. Garde-fous : pas de 5,5 % proposé pour du carrelage PMR ; chaudière gaz à 20 %.

### 3.7 Qualifications affichées
Remplacer le champ RGE unique par une liste « Mes qualifications » : nom, organisme, numéro, date de fin, et les métiers ou lignes où l'imprimer (RGE, IRVE, capacité fluides, PG gaz, Certibiocide, Certiphyto, SAP). Alerte avant l'échéance, comme la décennale. Jamais d'impression sans numéro ; jamais « certifié » sans numéro. Ce changement corrige au passage le RGE jamais imprimé.

## 4. Ordre de réalisation

Effort : S (moins d'une session), M (une session), L (plusieurs). Risque juridique : ce qui arrive si la règle est fausse.

| # | Lot | Métiers servis | Valeur | Effort | Risque juridique |
|---|---|---|---|---|---|
| 0 | **Corrections** : RGE imprimé, Qualiopi retiré, promesses MaPrimeRénov' et TVA chaudière retirées des modèles | tous | Forte : mentions fausses aujourd'hui | S | Faible (on retire du faux) |
| 1 | **« Mes qualifications »** + choix du métier (inscription et Paramètres) + catalogue trié | tous | Forte | M | Faible |
| 2 | **Attestation d'entretien chaudière / PAC / poêle + rappel** (réutilise le ramonage) | chauffagiste, plombier-chauffagiste, ramoneur, frigoriste | Très forte : revenu récurrent, modèle déjà prouvé | M-L | Moyen : annexes des arrêtés à lire au texte |
| 3 | **Dépannage express** : grille tarifaire affichable, devis en un écran, urgence, facture immédiate | serrurier, plombier, électricien, couvreur | Forte | M | Moyen : arrêté 2017 (déjà vérifié) |
| 4 | **Électricien** : rappel Consuel à J-20, compte rendu d'intervention, TVA borne suggérée | électricien (Hugo et testeurs) | Forte | S-M | Moyen : base du 5,5 % borne non trouvée |
| 5 | **Lignes structurées** menuiserie / isolation / PAC (valeurs des aides et du taux) | menuisier, plaquiste, couvreur, chauffagiste | Forte (dossiers CEE refusés sinon) | M | Élevé : seuils à relire au texte |
| 6 | **Chantier long** : PV de réception, levée des réserves, retenue de garantie avec rappel à 1 an, avenant | maçon, charpentier, couvreur, plaquiste, carreleur | Moyenne à forte | M | Moyen |
| 7 | **Autoliquidation imprimée** et décennale par devis | sous-traitants, peintre, serrurier-métallier | Moyenne | S-M | Moyen |
| 8 | **Métré par pièce** | plaquiste, peintre, carreleur | Moyenne | M | Nul |
| 9 | **Contrat d'entretien** (passages, facture par passage) | chauffagiste, paysagiste | Moyenne | L | Moyen : reconduction tacite (C. conso. L215-1) |
| 10 | **SAP** : attestation fiscale annuelle, compteur de plafonds | multiservice, paysagiste | Moyenne | M-L | Élevé : fiscal ; avance immédiate Urssaf = compte et habilitation, décision d'Hugo |
| 11 | Fiche d'intervention fluides au format CERFA | frigoriste | Faible (population non mesurée) | L | Élevé |

Pourquoi cet ordre : le lot 0 retire des mentions fausses déjà imprimables. Les lots 1-2 prolongent ce qui a marché (ramonage) vers le trio le plus fréquent (`chiffres.md` : électricien, plombier, chauffagiste). Maçons et peintres, les plus nombreux, sont surtout servis par les règles communes (lots 6-8).

Chaque lot passe par `/tache` et le `critique-produit` avant le code, comme le demande la tâche `metier-personnalise` de la feuille de route.

## 5. Décisions pour Hugo

1. **Choix du métier à l'inscription** : multiple et passable (recommandé), ou unique, ou seulement dans Paramètres ?
2. **Premier métier après le ramonage** : l'attestation d'entretien chaudière / PAC / poêle (recommandé : réutilise le ramonage, sert trois métiers) ou l'électricien (votre métier, vos testeurs) ?
3. **Lot 0 maintenant** (RGE imprimé, Qualiopi retiré, modèles purgés) : à faire tout de suite, indépendamment du reste (recommandé).
4. **Un testeur par métier** : comme les amis ramoneurs. Qui, dans votre entourage, chauffagiste ou plombier ? Sans testeur, ne pas construire le lot (mesure du cadrage ramonage : attestations créées en 4 semaines).
5. **Avance immédiate Urssaf** (multiservice) : demande un compte éditeur et une habilitation. À écarter pour l'instant (recommandé) ?
6. **TVA : suggestion ou blocage ?** Recommandé : suggestion seulement, tant qu'aucune règle n'est relue au texte.
7. **Réseau de la prochaine session** : autoriser `legifrance.gouv.fr`, `bofip.impots.gouv.fr`, `service-public.fr`, `insee.fr` / `api.insee.fr`, `consuel.com` dans les réglages réseau de l'environnement, pour relire au texte avant tout code.

## Relecture juriste-btp

Voir la section ajoutée après relecture, ci-dessous.
