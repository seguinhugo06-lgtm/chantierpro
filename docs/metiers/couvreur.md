# Couvreur-zingueur — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.91B (travaux de couverture par éléments) — NAF rév. 2, non vérifié ce jour ; la NAF 2025 peut changer ce code **(à vérifier sur insee.fr)**.
**Variantes couvertes** : couverture tuiles / ardoises / bac acier, zinguerie (gouttières, chéneaux, noues, faîtages), démoussage et traitement, réparation après tempête, fenêtres de toit, isolation de toiture (rampants, sarking), désamiantage de plaques (par une entreprise certifiée).

Règles transverses (TVA, certification du taux réduit, décennale, devis obligatoire en dépannage, hors établissement, médiateur, garanties) : **voir `commun.md` et `docs/metier-btp.md` §§ 2, 4, 6**. Ici, seulement ce qui est propre au couvreur.

## 1. Assurances

- **Décennale** : obligatoire pour la couverture (voir commun.md), avec les activités « couverture », « zinguerie », « étanchéité » à déclarer séparément selon la nomenclature de l'assureur **(à vérifier)**.
- **Réfection de toiture = ouvrage ?** La Cour de cassation a jugé qu'une réfection de toiture pouvait constituer un ouvrage (Cass. 3e civ., 30 mai 2024, n° 22-20.711, déjà cité dans metier-btp.md § 2) **(à vérifier au texte)**. Conséquence pratique : une réfection complète n'est pas « de l'entretien » pour la décennale. Le **démoussage**, le remplacement de quelques tuiles, le nettoyage de gouttières sont plutôt de l'entretien ou de la petite réparation, hors décennale **(à vérifier : aucune source ne trace la frontière)** : c'est là que le réglage « non soumis » de l'app (D-24) peut s'appliquer.
- **RC pro** : non obligatoire (voir commun.md), mais un couvreur cause souvent des dommages à des tiers (chute d'objet sur la voie publique, infiltration chez le voisin) **(conseil, pas un texte)**.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| RGE (isolation de toiture) | Qualibat (ou autre) | Non pour poser ; **oui pour que le client ait MaPrimeRénov' et les CEE** | Aides à l'isolation | [9] [10] |
| Certification amiante sous-section 3 | Organisme accrédité | **Oui pour retirer** des plaques de fibrociment amianté | Seule entreprise autorisée au retrait | [1] [2] |
| Formation amiante sous-section 4 | Organisme de formation | Oui pour **intervenir** sur un matériau amianté sans le retirer | — | [1] |
| Certibiocide « désinfectants » (TP2) | Organisme agréé (formation de 7 h) | **Oui depuis le 1er janv. 2026** pour un démoussage **curatif** professionnel | — | [4] [5] |

## 3. Documents remis au client

**Devis de réparation / démoussage** : devis obligatoire avant tout dépannage, réparation ou entretien chez un particulier, sans seuil (voir metier-btp § 2). Souvent signé **chez le client** → contrat hors établissement : 7 jours sans paiement, 14 jours de rétractation (voir commun.md). Exception : réparation **urgente** demandée par le client (bâche après tempête, fuite active), limitée au strict nécessaire.

**Amiante — fibrociment** [1] [2] [3] **[résumé]**
- Toitures en plaques fibres-ciment d'avant 1997 : présumées amiantées tant que le repérage avant travaux (RAT) ne dit pas le contraire ; c'est au **propriétaire / donneur d'ordre** de faire faire le repérage et de le remettre au couvreur (C. trav. R4412-97 et s., voir macon.md § 3).
- **Retrait** des plaques (avant réfection ou démolition) = **sous-section 3** : entreprise **certifiée**, plan de retrait (PDRE) [1] [2]. Un couvreur non certifié doit **sous-traiter** le retrait à une entreprise certifiée (note DGT 2017 citée par la FFB) [1].
- **Intervention** sans retrait (pose d'un velux, fixation, réparation ponctuelle sur une toiture amiantée) = **sous-section 4** : pas de certification, mais formation, mode opératoire et prévention [1].
- C'est le donneur d'ordre qui classe les travaux en SS3 ou SS4 lors de la consultation [1] **[résumé]**.
- **Nettoyage / démoussage d'une toiture en fibrociment** : la CAPEB y consacre une fiche [3], dont le contenu n'a pas été résumé : c'est une intervention sur un matériau amianté, donc au minimum sous-section 4 **(règles exactes à vérifier)**.

**Démoussage et produits biocides** [4] [5] [6] **[résumé]**
- Traitement **curatif** (algicide, antimousse, produits TP2) : **Certibiocide « désinfectants » obligatoire depuis le 1er janv. 2026** pour le professionnel qui l'applique [4] [5] (arrêté du 23 janv. 2023 cité **(à vérifier)**).
- Traitement **préventif** hydrofuge (produits TP10) : pas de Certibiocide selon la FFB [5] **[résumé]**. Beaucoup d'étiquettes portent TP2 et TP10 : c'est l'usage (curatif ou préventif) qui compte [6].
- Pour l'app : le devis devrait nommer le produit et son type (TP2 / TP10), et l'artisan devrait pouvoir enregistrer son n° de Certibiocide.

**Déclaration préalable de travaux (urbanisme)** [7] **[résumé]**
- Obligation du **propriétaire**, pas du couvreur. Due quand la réfection **modifie l'aspect extérieur** (changement de matériau ou de couleur, tuiles → ardoises, isolation par l'extérieur qui rehausse la toiture) (C. urb. R421-17 a) [7]. Réfection **à l'identique** : en général dispensée [7].
- Fenêtres de toit : sources divergentes **(à vérifier auprès de la mairie)** ; secteur protégé (abords de monuments) : règles plus strictes.
- Pour le couvreur : demander au client si la DP est déposée et accordée avant de commander les matériaux ; le noter sur le devis.

**Échafaudage et domaine public** [8] **[résumé]**
- Échafaudage posé sur le trottoir **sans emprise au sol** : **permis de stationnement** (autorité de police de la circulation, en général le maire). Avec **emprise** (scellé, palissade) : **permission de voirie** (gestionnaire de la voie : maire, département) [8].
- Peut être demandé par le particulier riverain **ou** l'entreprise [8]. Arrêté de circulation si la circulation est gênée ; redevance selon la commune. Pas de délai national trouvé **(rien trouvé)**.

**Travail en hauteur** [11] **[résumé]**
- Pour l'employeur : protection **collective** d'abord (garde-corps, échafaudage), le harnais seulement si elle est techniquement impossible (C. trav. R4323-58 et s.) [11]. Obligations exactes d'un couvreur **indépendant sans salarié** : **(à vérifier : rien trouvé ; C. trav. L4535-1 probable)**.
- Pour le devis : la ligne « échafaudage / protections » est souvent oubliée ou rabotée par le client. La chiffrer à part la rend visible.

**PV de réception** : comme le maçon (voir macon.md § 3). Important pour une réfection : la date fait courir la décennale.

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Entretien de toiture, nettoyage de gouttières | Conseillé (souvent annuel) | Propriétaire | **Aucun texte trouvé qui l'impose** pour une maison | (rien trouvé) |
| Ramonage (si conduit) | Selon arrêté / règlement sanitaire | Occupant | Voir ramonage dans l'app | metier-btp § 10 |

À dire clairement dans l'app : un **rappel d'entretien de toiture est un conseil commercial**, pas une obligation légale. Un contrat d'assurance habitation ou un règlement de copropriété peut en exiger un **(à vérifier au cas par cas)**. Ne jamais écrire « obligatoire ».

## 5. TVA propre au métier

Taux et certification : voir commun.md.
- Réfection, réparation, **démoussage** d'un logement achevé depuis plus de 2 ans : **10 %** (entretien) ; aucune source ne nomme le démoussage, mais il relève de l'entretien [12] **(à vérifier)**.
- **Isolation de la toiture** (rampants, sarking, combles) : **5,5 %** (rénovation énergétique, CGI 278-0 bis A), sous conditions de performance **(seuil de résistance thermique à relire au BOFiP du 9 sept. 2026)**. Selon la plupart des sources, la **RGE n'est pas une condition du 5,5 %** ; elle l'est pour MaPrimeRénov' et les CEE [9] **(à vérifier : une source dit le contraire)**.
- Une réfection de toiture **avec** isolation : la part couverture à 10 %, la part isolation à 5,5 %, chacune sur sa ligne **(ventilation à vérifier au BOFiP)**.
- Logement de moins de 2 ans, local professionnel, surélévation : 20 %.

## 6. Mentions particulières sur le devis et la facture

- Démoussage : produit, type TP2 / TP10, surface ; n° Certibiocide de l'applicateur si curatif (conseil ; mention non imposée trouvée).
- Isolation : résistance thermique R visée, marque et épaisseur de l'isolant, surface, n° RGE si le client demande une aide (les aides imposent des mentions propres : voir fiche isolation **(à vérifier)**).
- Fibrociment : « Repérage amiante fourni le … » ; « Retrait sous-traité à une entreprise certifiée SS3 : … ».
- Échafaudage : ligne distincte ; « Autorisation d'occupation du domaine public : à la charge de … ».
- Urbanisme : « Déclaration préalable : à la charge du propriétaire, déposée le … / non requise selon le client ».
- Déchets (obligatoire, voir metier-btp § 2) : tuiles, ardoises, zinc ; plaques amiantées = déchet dangereux, filière propre **(à vérifier)**.

## 7. Aides du client et pièces que l'artisan fournit

- **MaPrimeRénov' par geste 2026** : isolation des **rampants** et des **plafonds de combles** éligible (environ 15 à 25 €/m² selon les revenus) ; **combles perdus exclus** du parcours par geste depuis le 1er janv. 2026, mais éligibles en rénovation d'ampleur ; logement d'au moins 15 ans ; entreprise RGE [10] **(à vérifier : sources non officielles, montants à relire sur france-renov.gouv.fr)**.
- **CEE** : prime classique toujours possible avec une résistance thermique minimale (R ≥ 6 m².K/W cité pour les combles) [9] **(à vérifier)**. Le **« Coup de pouce isolation »** (l'« isolation à 1 € ») est **terminé** : fin en 2022, date exacte divergente (1er janvier ou 1er juillet 2022) [9] **(à vérifier)**.
- Pièces fournies par l'artisan : devis et facture conformes aux exigences de l'aide, n° RGE valide à la date du devis, attestation sur l'honneur / cadre de contribution CEE signée **avant** le devis **(à vérifier : règle des CEE)**.
- **Démarchage** : le démarchage **téléphonique** pour la rénovation énergétique est interdit depuis la loi du 24 juill. 2020 [13] **[résumé]** (n° de loi non relevé dans le résumé, **à vérifier**). La DGCCRF invite à vérifier la RGE et à signaler sur SignalConso [13]. Le démarchage **à domicile** reste légal mais encadré (hors établissement, voir commun.md). Les arnaques au démoussage en porte-à-porte sont documentées en Belgique [14] ; aucune alerte française propre au démoussage n'a été trouvée **(rien trouvé)**.

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

Problèmes réels (constats de métier, non sourcés par des statistiques) :
- **Devis sur le toit, sans réseau**, photos à l'appui ; surfaces mesurées à vue ou au drone.
- **Urgences après tempête** : bâchage le jour même, puis devis de réparation pour l'assurance du client.
- **Météo** : pluie, vent, gel décalent tout ; chantier ouvert sous la pluie = sinistre.
- **Confiance** : la profession souffre de l'image du démarcheur (démoussage « au noir », prix gonflés). Un devis net, daté, avec SIRET, assurance et photos rassure.
- **Acomptes** pour les matériaux (zinc, ardoises) alors que le client signe chez lui : 7 jours sans paiement.
- **Amiante** découverte en cours de chantier : arrêt, surcoût, avenant.

Propositions :

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | **Photos avant / après** attachées au devis et à la facture (toiture, gouttières), horodatées | M | Faible |
| Indispensable | Mode **« dépannage urgent »** (bâche, fuite) : devis court signé sur place avec la phrase d'urgence déjà prévue par l'app, paiement possible du strict nécessaire | S (existe en partie) | Moyen : périmètre L221-10 4° et L221-28 8° déjà relu ; ne pas l'étendre au démoussage |
| Indispensable | Modèles de devis « démoussage curatif / préventif », « réfection à l'identique », « zinguerie », « isolation rampants » avec TVA proposée (10 % / 5,5 %) et lignes séparées | S | Moyen : TVA à relire au BOFiP |
| Utile | Facture pour l'**assurance du client** après sinistre (photos, date du sinistre, nature) | S | Faible |
| Utile | Champs Paramètres : n° Certibiocide (avec date de fin), certification SS3 / formation SS4 ; avertissement si un devis « fibrociment » n'a pas de repérage amiante | S | Faible si c'est une alerte, pas un blocage |
| Utile | Rappel **« entretien conseillé »** (tous les N ans, choisi par l'artisan), libellé comme un conseil, **jamais « obligatoire »** ; consentement du client pour être recontacté | M | Moyen : prospection commerciale, consentement à vérifier (RGPD) |
| Plus tard | Lignes « échafaudage » et « autorisation de voirie » avec un aide-mémoire (permis de stationnement / permission de voirie) | S | Faible |
| Plus tard | Avenant « découverte d'amiante » ou « bois pourri » en cours de chantier, signé par le client | M | Moyen |

## Sources

1. FFB, « Amiante : quels travaux relèvent des sous-sections 3 et 4 ? » — https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-amiante-plomb-silice/dossier/amiante-sous-section-3-ou-4 ; FFB, sous-traitance SS3 / SS4 — https://www.ffbatiment.fr/gestion-entreprise/passer-executer-un-marche/sous-traitance/dossier/amiante-une-entreprise-qualifiee-sous-section-4-peut-elle-sous-traiter-des-travaux-en-sous-section-3 — consulté le 03/11/2026 — [résumé]
2. DREETS Auvergne-Rhône-Alpes, plaquette couvreur (7 juill. 2021) — https://auvergne-rhone-alpes.dreets.gouv.fr/sites/auvergne-rhone-alpes.dreets.gouv.fr/IMG/pdf/plaquette_couvreur_-_07.07.2021.pdf — consulté le 03/11/2026 — [résumé]
3. CAPEB, « Nettoyage d'une toiture en fibro-ciment » — https://www.capeb.fr/actualites/nettoyage-d-039-une-toiture-en-fibro-ciment — consulté le 03/11/2026 — (à vérifier : contenu non résumé)
4. FFB, « Le Certibiocide "désinfectants" obligatoire pour les professionnels à partir du 1er janvier 2026 » — https://www.ffbatiment.fr/actualites-batiment/actualite/certificat-certibiocide-desinfectants-obligatoire-pour-professionnels-1er-janvier-2026 — consulté le 03/11/2026 — [résumé]
5. FFB, « La certification Certibiocide » — https://www.ffbatiment.fr/techniques-batiment/normalisation-regles-de-lart/certifications-labels-de-produits-ouvrages/dossier/certification_certibiocide ; CAPEB Alpes-Maritimes, fiche Certibiocide février 2026 — https://www.capeb.fr/www/capeb/media//alpesmaritimes/document/fp-certibiocide-fevrier-2026.pdf — consulté le 03/11/2026 — [résumé]
6. Géorisques, rapport d'inspection (démoussage par drone, TP2) — https://www.georisques.gouv.fr/webappReport/ws/installations/inspection/1UOISNaHIou3JaylDOAM5zZxvONHR9vQ ; fiche technique Algimouss — https://algimouss.com/wp-content/uploads/ft-algi202.pdf — consulté le 03/11/2026 — [résumé]
7. justice.fr, « Autorisation d'urbanisme pour des travaux de réparation de toiture » — https://www.justice.fr/fiche/autorisation-urbanisme-deposer-faire-travaux-reparation-toiture ; Construires.fr, « Réfection toiture : faut-il une déclaration préalable ? » — https://www.construires.fr/refection-toiture-declaration-prealable/ — consulté le 03/11/2026 — [résumé]
8. Service-public.fr (copie communale), fiche F23509 « Occupation du domaine public » — https://sites.service-information-publique.fr/vias/guide-professionnels/F23509.html — consulté le 03/11/2026 — [résumé]
9. Quelle Énergie, « L'isolation des combles perdus à 1 € : est-ce encore possible en 2026 ? » — https://www.quelleenergie.fr/economies-energie/isolation-combles/programme-1-euro ; Effy, « Coup de pouce Isolation » — https://www.effy.fr/aide-energetique/dispositif-coup-de-pouce/isolation ; Selectra, « TVA 5,5 % » — https://selectra.info/energie/renovation-energetique/aides/tva-taux-reduit/tva-5-5 — consulté le 03/11/2026 — (à vérifier : non officiel)
10. Hellowatt, « MaPrimeRénov' isolation des combles » — https://www.hellowatt.fr/prime-energie/ma-prime-renov/isolation-combles ; Ootravaux, « Zoom MaPrimeRénov' » — https://www.ootravaux.fr/guide-construction/demarches-et-formalites/financement-de-travaux/zoom-maprimerenov.html — consulté le 03/11/2026 — (à vérifier : non officiel)
11. Ministère du Travail, fiche prévention travaux de toiture (déc. 2024) — https://travail-emploi.gouv.fr/sites/travail-emploi/files/2024-12/Fiche%20pr%C3%A9vention%20travaux%20toiture.pdf ; DREETS ARA, mémo juridique chutes de hauteur — https://auvergne-rhone-alpes.dreets.gouv.fr/sites/auvergne-rhone-alpes.dreets.gouv.fr/IMG/pdf/memo_juridique_prevention_chute_de_hauteur.pdf — consulté le 03/11/2026 — [résumé]
12. impots.gouv.fr, « Quel taux de TVA appliquer pour les travaux réalisés dans les logements ? » — https://www.impots.gouv.fr/professionnel/questions/quel-taux-de-tva-appliquer-pour-les-travaux-realises-dans-les-logements — consulté le 03/11/2026 — [résumé]
13. economie.gouv.fr (DGCCRF) — https://www.economie.gouv.fr/node/3226140 ; préfecture d'Indre-et-Loire, communiqué du 25 juin 2024 sur les arnaques à la rénovation — https://indre-et-loire.gouv.fr/contenu/telechargement/42209/296366/file/2024-06-25%20-%20CP%20-%20Lutte%20contre%20les%20arnaques%20dans%20le%20secteur%20des%20travaux%20de%20r%C3%A9novation.pdf — consulté le 03/11/2026 — [résumé]
14. Police belge, « Abus en matière de démarchage (dont démoussage de toitures) » — https://www.police.be/5302/node/12606 — consulté le 03/11/2026 — [résumé] (Belgique, pas le droit français)

---
**Relecture juriste-btp** : non faite. Points à relire au texte avant tout code : frontière entretien / ouvrage pour la décennale (Cass. 3e civ., 30 mai 2024), Certibiocide TP2 (arrêté, date du 1er janv. 2026), R421-17 a (déclaration préalable), conditions du 5,5 % pour l'isolation (BOFiP du 9 sept. 2026), MaPrimeRénov' 2026 (france-renov.gouv.fr), loi de 2020 sur le démarchage téléphonique (numéro et périmètre).
