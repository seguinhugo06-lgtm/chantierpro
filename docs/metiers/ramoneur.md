# Ramoneur — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.
>
> **Le ramonage est déjà vérifié au texte** (juriste-btp, 23 et 24 oct. 2026) et **livré** (24 oct. 2026, `811402c2`, migration 104, D-30). Ce qui est vérifié vit dans `docs/metier-btp.md` § 10 et `docs/cadrage-ramonage.md` ; cette fiche le résume en renvoyant, et n'ajoute que ce qui manquait.

**Codes NAF** : 81.22Z (autres activités de nettoyage des bâtiments et nettoyage industriel), qui comprend le ramonage selon la nomenclature usuelle **(à vérifier sur insee.fr, non recherché)** ; 43.22B si l'entreprise pose aussi poêles et tubages (fumisterie).
**Variantes couvertes** : ramoneur seul ; ramoneur-fumiste (tubage, chemisage, pose de chapeau, débistrage) ; installateur de poêles qui fait l'entretien annuel.

Règles transverses (TVA, devis obligatoire, contrat hors établissement, décennale, médiateur) : voir `commun.md`.

## Déjà vérifié dans le dépôt (ne pas refaire)

| Sujet | Règle | Où |
|---|---|---|
| Textes | CSP R. 1331-66 à R. 1331-78 (décret 2023-641, renuméroté par le 2023-695) ; arrêté du 20 juil. 2023 qui cite les anciens numéros | metier-btp § 10 |
| Définition | « action mécanique directe », vacuité « sur toute sa longueur », chimique = complément (R. 1331-70) | metier-btp § 10, cadrage § 3 |
| Fréquence | au moins 12 mois ; règlement sanitaire départemental ou arrêté municipal peut imposer plus ; collectifs 6 mois (R. 1331-71) | metier-btp § 10 |
| Qui | l'occupant, sauf clause du bail (R. 1331-73) | metier-btp § 10 |
| Attestation de ramonage | 15 jours ouvrés, conduits ramonés, vacuité, conservée 2 ans par le commanditaire (R. 1331-75) | metier-btp § 10, cadrage § 5 (textes imprimés) |
| Conseils | combustible solide hors chaudière (R. 1331-77, annexe 2) | metier-btp § 10 |
| Devis | obligatoire (arrêté du 24 janv. 2017, annexe 1 « ramonage ») ; parcours sans devis choisi par Hugo (D-30) | metier-btp § 10, decisions D-30 |
| TVA | 10 % (BOI-ANNX-000210, § 20) ; dispense de certification sous 1 000 € TTC si adresse de l'immeuble sur la facture (BOI-TVA-LIQ-30-20-90-40, § 90) | metier-btp § 10 |
| Rappel | prospection (CPCE L. 34-5, exception client existant) ; pas d'appel à un particulier (C. conso. L. 223-1 depuis le 11 août 2026) | metier-btp § 10, D-30 |

## 1. Assurances

- **Ramonage seul** : un nettoyage n'est pas un travail de construction ; en principe hors décennale (voir `commun.md` sur le champ de L241-1). Aucune source propre au ramonage trouvée **(à vérifier)**. L'app permet déjà « non soumis » dans les Paramètres.
- **Tubage, chemisage, pose de conduit ou de sortie de toit** : travaux sur un ouvrage, qui touchent à la sécurité incendie ; la décennale est vraisemblablement due (régime général, voir `commun.md`). Les sources trouvées parlent de la décennale du maçon pour un conduit maçonné et de produits « justifiant d'une garantie décennale », sans trancher pour le tubage [5] **(à vérifier)**.
- **RC pro** : non obligatoire en général ; déjà imprimée sur l'attestation (cadrage § 5). Un assureur habitation peut demander l'attestation après un sinistre (cadrage § 5).

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| **Qualification professionnelle** : diplôme de niveau CAP/BEP ou titre homologué équivalent, **ou 3 ans d'expérience** | CMA (attestation de qualification) | **Oui** : l'ancien art. 16 de la loi n° 96-603 du 5 juil. 1996 nommait expressément « le ramonage » ; aujourd'hui C. artisanat L121-1, recodifié à droit constant au 1er juil. 2023 (MB § 7) | Un ramonage fait par un professionnel qualifié | [3, 4, 9] [résumé] |
| Titre « ramoneur-fumiste » du COSTIC (RNCP, niveau 3) | COSTIC | Non (une des voies de la qualification) | — | [3, 10] [résumé] |
| CQP ramoneur-fumiste | Branche | Ne suffit pas seul selon la DGCCRF | — | [3] [résumé] |
| Qualibat | Qualibat | Non | Aucune qualification « ramonage » propre trouvée ; les codes 5111/5112 sont de la plomberie, pas du ramonage | [11] (à vérifier dans le catalogue Qualibat) |
| RGE (Qualibois, QualiPAC…) | Qualit'EnR | Non | Aides du client pour la **pose** d'un poêle, pas pour le ramonage | voir fiche chauffagiste |

Réponse ministérielle ancienne : pas de CAP de l'Éducation nationale propre au métier [4] — peut être dépassée **(à vérifier)**.

## 3. Documents remis au client

### Attestation de ramonage
Voir cadrage § 5 et metier-btp § 10 : livrée dans l'app (numérotée `RAM-AAAA-NNNNN`, figée, vacuité « assurée / non assurée »).

### Attestation d'entretien d'un poêle, insert ou appareil à foyer fermé (manque)
- **Quand** : à l'**entretien annuel** des appareils à combustible solide à **foyer fermé** (R. 1331-67 et R. 1331-68 ; arrêté du 20 juil. 2023, art. 4, annexes 1 et 3). Les foyers ouverts n'y sont pas soumis (metier-btp § 10). En vigueur depuis le 1er oct. 2023 [1, 2] [résumé].
- **Délai de remise** : **15 jours** après l'entretien selon le résumé de l'arrêté [2] [résumé] (jours ouvrés ou calendaires : **(à vérifier)** ; pour le ramonage, le code dit « ouvrés »).
- **Contenu minimal** (annexe 3, point 2) [1] [résumé] : identité et adresse du commanditaire ; adresse et local de l'installation ; caractéristiques de l'appareil ; dates des dernières interventions ; identité de l'intervenant ; date de la visite ; signature ; **liste des points contrôlés** selon l'annexe 1 ; **plus les conseils** (annexe 2). Le document « ne doit pas pouvoir être confondu avec un autre document » [1] : une attestation de ramonage et une attestation d'entretien doivent rester deux documents distincts, même sur une même visite.
- **Points contrôlés** (annexe 1, foyers fermés) : non lus. Les modes opératoires suivent la notice du fabricant [1]. **Granulés** : vérifier en plus l'adéquation entre la puissance réglée par défaut et les besoins de chauffage (art. 4) [1] [résumé].
- **Conseils** : « Aucun investissement proposé (…) ne revêt un caractère obligatoire » ; ce sont des conseils, pas des injonctions [1] [résumé] — cohérent avec la phrase déjà imprimée sur l'attestation de ramonage.
- **Conservation** : non trouvée **(à vérifier)**.
- Note : l'arrêté renvoie à « R. 1331-23 » et « R. 1331-25 » (anciens numéros) ; citer ceux du code (R. 1331-68, R. 1331-77), comme le fait déjà l'app.

### Devis et facture des travaux de fumisterie
Tubage, chemisage, débistrage : devis et facture ordinaires (voir `commun.md`). Le modèle « Tubage conduit flexible inox » existe déjà (`src/lib/data/modeles/ramonage.js`).

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Ramonage | ≥ 1 fois / 12 mois ; 2 si le règlement sanitaire départemental ou un arrêté municipal l'impose ; 6 mois en collectif | Occupant (sauf bail) | R. 1331-71 | metier-btp § 10 (vérifié) |
| Entretien d'un foyer fermé à combustible solide | annuel | Occupant **(à vérifier : qui, si bail)** | R. 1331-67, -68 | [1, 2] [résumé] |
| Deux ramonages par an recommandés | au-delà de 6 m³ de bûches ou 2,5 t de granulés par an | — (recommandation) | arrêté, annexe 2 | metier-btp § 10 |

**Règlements sanitaires départementaux** : ils restent applicables là où ils imposent deux ramonages (metier-btp § 10). Celui de la Dordogne (clients des amis d'Hugo, Sarlat) est introuvable en ligne. Aucune recherche nouvelle faite ici : la liste département par département n'est pas disponible en ligne de façon fiable, et le code laisse la fréquence à l'artisan (« dans 12 mois » ou « dans 6 mois »), ce qui suffit.

## 5. TVA propre au métier

- Ramonage : 10 % dans un logement de plus de 2 ans (vérifié, metier-btp § 10).
- **Débistrage** : « élimination de suie et de dépôts corrosifs » est dans la même ligne du BOFiP que le ramonage (BOI-ANNX-000210, § 20, cité dans metier-btp § 10) ; le débistrage semble donc à 10 % au même titre — lecture plausible selon juriste-btp, à confirmer au BOFiP.
- Tubage, chemisage : travaux d'amélioration ou d'entretien d'un logement de plus de 2 ans, 10 % (voir `commun.md`).
- Pose d'un poêle : voir la fiche chauffagiste (5,5 % possible sous conditions de performance).

## 6. Mentions particulières sur le devis et la facture

- Déjà fait : certification « Par le règlement de la présente facture, le client certifie… » sur la facture tirée d'une attestation (metier-btp § 10, BOI-LETTRE-000280).
- Manque : l'**adresse de l'immeuble ramoné** sur la facture quand elle diffère de celle du client (tâche `ramonage-adresse-facture`, feuille de route 0 quater octies).
- Les modèles de devis disent « Certificat de ramonage » ; le texte dit « attestation » (R. 1331-75). Simple correction de vocabulaire.

## 7. Aides du client et pièces que l'artisan fournit

- Aucune aide publique au ramonage trouvée.
- L'attestation sert d'abord aux agents de contrôle et, à la demande, à l'assureur habitation (cadrage § 5).
- Remplacement d'un appareil ancien (conseil de l'annexe 2) : aides du client pour un nouveau poêle (MaPrimeRénov', CEE, fonds air-bois locaux) : voir la fiche chauffagiste.

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

### Ce que le parcours livré fait (24 oct. 2026)
Réglage « J'effectue des ramonages » ; fiche client → onglet Ramonage avec appareils et historique ; attestation sur un seul écran, numérotée par la base et figée (annulation et « annule et remplace ») ; PDF partagé ou envoyé ; « Faire la facture » sans ressaisie ; rappel du prochain ramonage (30 jours avant, réglable), e-mail automatique si activé, SMS pré-rempli, « Appeler » seulement pour un client professionnel, refus des rappels ; tarifs fixes par type d'appareil ; mention « ne vaut pas attestation d'entretien » pour un foyer fermé (`src/lib/ramonage.js`, `src/components/ramonage/`, D-30).

### Ce que les ramoneurs ont remonté (écrit dans le dépôt)
- Documents papier montrés par Hugo : fiche client avec tableau date / méthode / prix / n° de facture / prochain ramonage, attestation numérotée et signée (cadrage § 1).
- Tarif fixe, **pas de devis** (D-30).
- Rien d'autre n'est écrit. Les questions du cadrage § 8 restent sans réponse dans le dépôt : une attestation par conduit ou par visite ? du réseau chez les clients ? comment préviennent-ils leurs clients ? comment sont-ils payés ? La mesure prévue (attestations créées au bout de 4 semaines) n'a pas de résultat consigné.

### Ce qui manque

| Proposition | Priorité | Effort | Risque juridique |
|---|---|---|---|
| **Attestation d'entretien de poêle / insert** (annexe 3) : document distinct, même mécanique (numéro de la base, figée, signature reprise), points contrôlés en cases à cocher, conseils exigés, puissance réglée pour les granulés | Indispensable dès qu'un ramoneur entretient des poêles (à demander aux amis d'Hugo) | M (réutilise table, PDF et rappel ; nouvelle série de numéros) | Moyen : annexe 1 (points contrôlés) et délai exact à relire au texte avant de coder |
| **Plusieurs conduits sur une visite** : le texte dit « le ou les conduits » (R. 1331-75) ; aujourd'hui une attestation = un appareil. Soit une attestation par conduit (simple, déjà possible), soit plusieurs conduits sur une attestation | Utile (selon la réponse des amis) | M | Faible |
| **Une facture pour plusieurs ramonages** (même visite, plusieurs appareils) | Utile | S à M | Faible |
| **Adresse d'intervention sur la facture** (`ramonage-adresse-facture`) | Indispensable (déjà à la feuille de route) | S | Moyen : dispense de certification sous 1 000 € TTC |
| **Devis** : le parcours sans devis reste un risque pour l'artisan (D-30). Proposer un devis d'un geste, signé sur place, pour un nouveau client | Utile | S (mécanique existante) | Le risque est celui de l'artisan, déjà rappelé |
| **Tournée** : liste des rappels dus par commune, ordre de passage, carte | Plus tard | M à L | Faible |
| Vocabulaire « Certificat » → « Attestation » dans les modèles | Utile | S | Faible |
| Qualification (CAP ou 3 ans) dans les Paramètres, imprimée sur l'attestation | Plus tard | S | Faible ; aucune obligation d'impression trouvée |
| Les CGU acceptées avant la première attestation (avis juriste du 25 oct., G3) | Indispensable (hors métier, déjà relevé) | — | voir `docs/avis-juriste-2026-10-25-coque.md` |

## Sources

1. Légifrance, arrêté du 20 juil. 2023 (entretien et ramonage des dispositifs de chauffage décentralisés à combustible solide) — https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047873344 — consulté le 03/11/2026 — [résumé]
2. AIDA (INERIS), arrêté du 20 juil. 2023 (attestation d'entretien, délai de 15 jours) — https://aida.ineris.fr/reglementation/arrete-200723-precisant-specifications-techniques-modalites-lentretien-ramonage — consulté le 03/11/2026 — [résumé]
3. DGCCRF, « Entretien de chaudières : utilisation du terme ramonage » (qualification, loi de 1996 art. 16) — https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/entretien-de-chaudieres-utilisation-du-terme-ramonage — consulté le 03/11/2026 — [résumé]
4. Assemblée nationale, réponse ministérielle (qualification du ramoneur, 3 ans d'expérience) — https://questions.assemblee-nationale.fr/dyn/12/questions/QANR5L12QE58961.pdf — consulté le 03/11/2026 — [résumé]
5. CAPEB/FFTB, guide conduits de fumée (décennale du maçon) — https://capeb.fr/www/capeb/media/fftb-capeb-qlf-1-.pdf — consulté le 03/11/2026 — (à vérifier)
6. Avis technique tubage flexible (NF DTU 24.1) — https://bo.joncoux.fr/storage/media/shares/tubage-flexible-dta.pdf — consulté le 03/11/2026 — (à vérifier)
7. FFB, « Les nouvelles obligations de maintenance des installations de combustion » — https://www.ffbatiment.fr/actualites-batiment/actualite-bam/les-nouvelles-obligations-de-maintenance-des-installations-de-combustion — consulté le 03/11/2026 — [résumé]
8. CAPEB, « Entretien et ramonage des dispositifs de chauffage : nouvelle réglementation » — https://www.capeb.fr/actualites/entretien-et-ramonage-des-dispositifs-de-chauffage-nouvelle-reglementation — consulté le 03/11/2026 — [résumé]
9. Légifrance, loi n° 96-603 du 5 juil. 1996, art. 16 — https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000038086589/ — consulté le 03/11/2026 — [résumé]
10. France Compétences, titre ramoneur-fumiste — https://www.francecompetences.fr/recherche/rncp/41734 — consulté le 03/11/2026 — (à vérifier)
11. Qualibat, certificat (codes 5111/5112 = plomberie) — https://www.qualibat.com/pdf/get-certificate/dq_1029619 — consulté le 03/11/2026 — (à vérifier)

Sources du dépôt : `docs/metier-btp.md` § 10, `docs/cadrage-ramonage.md`, `docs/decisions.md` (D-30), `docs/feuille-de-route.md` (0 quater septies, 0 quater octies, 4 quaterdecies), `docs/avis-juriste-2026-10-25-coque.md`.

## Relecture juriste-btp

Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- débistrage à 10 % (BOI-ANNX-000210) ;
- annexes 1 et 3 de l'arrêté du 20 juil. 2023 : contenu de l'attestation d'entretien, délai de 15 jours (ouvrés ou non), conservation ;
- décennale du tubage.
