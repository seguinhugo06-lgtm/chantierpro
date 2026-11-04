# Règles communes à tous les métiers — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Ce qui est déjà **vérifié au texte** vit dans
> `docs/metier-btp.md` (cité « MB § n ») : ce fichier le résume et ne le contredit pas.
> Les fiches métier renvoient ici (« voir commun.md ») et ne gardent que ce qui est propre au métier.

Niveaux de preuve : **[texte]** = vérifié au texte dans `metier-btp.md` · **[résumé]** = vu dans le résumé d'un moteur de recherche · **(à vérifier)** = sources divergentes, non officielles, ou rien trouvé.

## 1. Assurances

| Assurance | Qui | Obligatoire ? | Ce que l'app doit faire | Source |
|---|---|---|---|---|
| Responsabilité civile décennale | L'artisan, pour des travaux de construction (ouvrage) | Oui (C. assur. L241-1) ; sans elle : 6 mois et 75 000 € (L243-3) | **Joindre l'attestation** au devis et à la facture (L243-2) ; aujourd'hui l'app imprime une ligne, mais ne joint pas l'attestation (tâche `devis-mentions`) | MB § 2 [texte] |
| RC professionnelle | L'artisan | Non, en général | Si souscrite et client particulier : assureur, coordonnées et zone avant contrat (C. conso. R111-2, 9°) | MB § 2 [texte] |
| Dommages-ouvrage | **Le client** (maître d'ouvrage), avant l'ouverture du chantier | Oui pour le maître d'ouvrage (C. assur. L242-1) | Rien à imprimer. Au plus, un rappel neutre au client sur les gros travaux. Ne jamais dire qu'elle est « obligatoire » pour un cas précis sans relecture | [1] [résumé] |

**Décennale, ce qui compte pour l'app** :
- Champ : les travaux de construction. Le dépannage, l'entretien et les petites réparations n'y sont pas soumis ; l'artisan peut le déclarer (D-24), rien n'est alors imprimé. Limites mouvantes (toiture refaite = ouvrage neuf ; équipement posé sur l'existant) : MB § 2 [texte].
- **Modèle d'attestation** : arrêté du 5 janv. 2016, pris pour L243-2 ; articles A243-2 à A243-5 du C. assur. ; s'applique aux attestations émises à partir du 1er juil. 2016 pour des chantiers ouverts après cette date [2] [résumé]. Mentions les plus citées : assureur, n° de contrat, activités couvertes, période de validité, zone géographique ; l'attestation ne peut pas renvoyer à des clauses qu'elle ne reproduit pas [2] [résumé]. La liste exacte des mentions : **à relire au texte** (annexe de l'arrêté) avant de coder un contrôle.
- L'origine de l'obligation de jointure est la loi « Macron » du 6 août 2015 [2] [résumé].
- Conséquence produit : l'attestation est **un fichier fourni par l'assureur**, pas un texte que l'app génère. L'app peut le stocker, vérifier sa date de validité et ses activités face au devis, et le joindre au PDF. Elle ne doit jamais l'imiter.

**Dommages-ouvrage** : obligation du maître d'ouvrage (vendeurs, promoteurs, mais aussi le particulier qui fait construire ou rénover lourdement : agrandissement, surélévation), avant l'ouverture du chantier ; sanction pénale citée : 6 mois et 75 000 € (L243-3) [1] [résumé]. L243-3 ne punit pas la personne physique qui construit un logement pour l'occuper elle-même ou le faire occuper par son conjoint, ses ascendants ou descendants (à relire au texte). L'obligation d'assurance (L242-1) demeure.

**Garanties après réception** : parfait achèvement 1 an (C. civ. 1792-6), bon fonctionnement 2 ans (1792-3), décennale 10 ans (1792, 1792-4-1). Elles courent à la **réception** (PV avec ou sans réserves) : MB § 1 et § 6 [texte]. Conséquence produit : un PV de réception daté est la pièce qui fait partir les trois délais ; c'est un document commun à tous les métiers de construction.

## 2. Devis

Tout est vérifié au texte dans `metier-btp.md` ; résumé :
- **Dépannage, réparation, entretien** (arrêté du 24 janv. 2017) : devis détaillé avant toute intervention, sans seuil ; il dit s'il est gratuit ou payant ; frais de déplacement ; le client peut garder les pièces remplacées ; taux horaires TTC et frais affichés dans les locaux et en ligne ; facture remise à la fin de l'intervention, avant le paiement. MB § 2 [texte]. Concerne au premier chef : électricien, plombier, chauffagiste, frigoriste, serrurier, ramoneur, multiservice.
- **Contrat hors établissement** (signé chez le client) avec un particulier : aucun paiement ni contrepartie avant 7 jours (C. conso. L221-10), rétractation 14 jours avec formulaire (L221-18), exception de l'urgence demandée par le client (L221-10, 4° ; L221-28, 8°). Signé en ligne : contrat à distance (14 jours, pas les 7 jours), sauf si le lien est signé chez le client ou juste après sa visite : le contrat est alors hors établissement (L221-1, I, 2°, MB § 2). MB § 2 [texte]. L'urgence concerne surtout serrurier, plombier, électricien.
- **Médiateur de la consommation** : adhésion obligatoire pour qui travaille avec des particuliers (L612-1) ; nom et site sur le site, les CGV et les bons de commande (R616-1). MB § 2 [texte].
- **Déchets de chantier** : tout devis de construction, rénovation ou démolition indique les modalités d'enlèvement et de gestion, leur coût, les installations de collecte et une estimation de la quantité (C. env. L541-21-2-3, décret n° 2020-1817). Absent des deux générateurs. MB § 2 [texte].
- **Entrepreneur individuel** : « EI » après le nom (C. com. R526-27). MB § 2 [texte].

## 3. TVA

| Taux | Quand | Source |
|---|---|---|
| 20 % | Neuf, agrandissement, locaux non habitation, et **fourniture des gros équipements** (ci-dessous) | CGI 278 ; MB § 4 [texte] |
| 10 % | Amélioration, transformation, aménagement, entretien d'un logement achevé depuis plus de 2 ans | CGI 279-0 bis ; MB § 4 [texte] |
| 5,5 % | Rénovation énergétique de ces mêmes logements, équipements et critères fixés par l'annexe IV | CGI 278-0 bis A ; MB § 4 [texte] |

- **Certification par le client** sur le devis (signé) ou sur la facture (« par le règlement ») : l'attestation Cerfa 1300/1301 est supprimée (loi n° 2025-127) ; modèles du BOI-LETTRE-000280 du 9 sept. 2026, déjà dans l'app (`src/lib/mentionTvaReduite.js`). MB § 4 [texte].
- **Gros équipements exclus du 10 %** : la part « fourniture » de certains gros équipements reste au taux normal ; la liste est fixée à l'**article 30-00 A de l'annexe IV du CGI** [3] [résumé]. Ce que la recherche y trouve :
  - **ascenseurs** (fourniture et montage), sauf ascenseur spécialement conçu pour les personnes handicapées ; l'entretien et la mise aux normes restent au taux réduit [3][4] [résumé] ;
  - **chaudières, cuves à fioul et citernes à gaz implantées pour un usage commun dans un immeuble collectif** [5] [résumé] ;
  - **climatisation et pompe à chaleur air/air** : fourniture au taux normal (toutes pièces constitutives), la pose restant au taux réduit, sauf si l'équipement remplit les critères du 5,5 % [5] [résumé] (voir plus bas) ;
  - **cabines de hammam ou de sauna prêtes à poser** : citées par un guide et par une source de 2001 (ancien art. 18 bis de l'annexe IV) [4] **(à vérifier)** ;
  - cuisines équipées : **rien trouvé** ; les équipements ménagers et mobiliers relèvent d'une exclusion distincte [4] **(à vérifier)**.
  - L'exclusion du 10 % ne fait pas obstacle au 5,5 % si ses conditions sont remplies [3] [résumé].
  - Version en vigueur : BOI-TVA-LIQ-30-20-90-20 du 9 sept. 2026 [3] (non lue). **À relire au texte avant de coder** (liste exacte, et dates de bascule citées par des blogs seulement : chaudières fossiles au 1er mars 2025, PAC au 18 juil. 2026 [5] **(à vérifier)**).
- **5,5 %** : équipements et critères aux art. 30-0 D à 30-0 D nonies de l'annexe IV, arrêté du 4 déc. 2024 (JO du 24 déc. 2024 selon `menuisier.md` ; date de l'arrêté ou du JO **(à vérifier)**) [6] [résumé]. Nouveauté 2026 : la loi de finances pour 2026 fait entrer les **PAC air/air réversibles fixes** dans le 5,5 % ; un arrêté (du 13 juil. 2026 selon un site) insère un 1° bis à l'art. 30-0 D ter, critères cumulatifs [6] [résumé] **(à vérifier : date et numéro de l'arrêté)**. Être RGE n'est une condition du 5,5 % dans **aucune source trouvée** (c'est une condition des aides) **(à vérifier)**.
- **Autoliquidation en sous-traitance BTP** (CGI 283-2 nonies, depuis le 1er janv. 2014) : le sous-traitant facture HT, sans TVA, avec la mention « Autoliquidation » exigée par CGI ann. II art. 242 nonies A, I, 13° [7] [résumé] ; MB § 1 [texte]. Chaque maillon d'une chaîne de sous-traitance facture ainsi ; exclus : prestations intellectuelles (études), location de matériel sans opérateur [7] [résumé]. La qualité de sous-traitant doit pouvoir être prouvée (CAA Lyon, 6 nov. 2025) [7] [résumé]. Sous-traitant en franchise en base : il facture sans TVA avec la mention 293 B, pas d'autoliquidation **(à vérifier)**.
- **Recodification CIBS** et renvois au CGI admis sur les factures : MB § 3 et § 4 [texte].

## 4. Aides du client : ce que l'artisan fournit

### MaPrimeRénov' (Anah) — état au 03/11/2026
- **Calendrier 2026** : guichet fermé au 1er janv. 2026 faute de loi de finances (les sources divergent : tout le dispositif ou la seule rénovation d'ampleur), rouvert le **23 févr. 2026** ; budget 2026 : 3,6 Md€ [8][9] [résumé].
- **Rénovation d'ampleur** : rendez-vous préalable avec un conseiller France Rénov' obligatoire, accompagnateur obligatoire, au moins 2 gestes d'isolation et gain d'au moins 2 classes DPE [8][10] [résumé]. Accès : logements E, F, G selon une source, tous les ménages selon une autre **(à vérifier)**.
- **Rénovation par geste** : depuis janv. 2026, l'isolation des murs et les chaudières biomasse en sortent [8] [résumé]. Depuis le **1er sept. 2026** (décret n° 2026-822 du 25 août 2026, JO du 27 août, selon la presse), sortent aussi : isolation des combles et des planchers bas, fenêtres, VMC double flux, chauffe-eau thermodynamiques et solaires, poêles et inserts à bois ; plusieurs sources disent le parcours par geste « réservé aux pompes à chaleur » [10] [résumé]. Ces gestes restent possibles dans une rénovation d'ampleur, et restent finançables par les CEE [10] [résumé]. **(à vérifier au décret)**.
- **2027** : projet de loi de finances déposé le 1er oct. 2026, baisse du budget (500 M€ ou 217 M€ selon les sources) ; déposer avant le 31 déc. 2026 garderait le barème 2026 [11] [résumé] **(à vérifier)**. Projet de loi n° 3210, **non voté** ; aucune source officielle trouvée (3 nov. 2026) ne parle d'une date limite de dépôt. Ne rien afficher dans l'app sur le budget 2027 ni sur une date limite.
- **Ce que l'artisan fournit** : être **RGE** pour le geste concerné ; un devis détaillé ; une facture. Les mentions exactes que l'Anah exige sur devis et facture **n'ont pas été relevées** dans cette recherche **(à vérifier)** ; idem pour la règle « pas de début des travaux avant le dépôt de la demande ».

### Certificats d'économies d'énergie (CEE)
- **Cadre** : 6e période du 1er janv. 2026 au 31 déc. 2030 (décret n° 2025-1048 du 30 oct. 2025) [12] [résumé]. Les fournisseurs d'énergie (« obligés ») financent des primes.
- **Rôle actif et incitatif** : l'obligé (ou son délégataire) doit s'être engagé envers le client **avant** l'engagement de l'opération ; la date d'engagement est l'**acceptation du devis** (signature) [13] [résumé]. Une preuve fabriquée après la signature ne régularise pas le dossier [13] [résumé]. Depuis le 1er janv. 2026, le seuil minimal d'incitation financière a disparu [12] [résumé].
- **Coup de pouce** : bonifications par chartes ; pour les PAC (« Coup de pouce Chauffage »), depuis le **1er sept. 2026** le modèle doit être agréé (décret n° 2026-413) à la date d'engagement de l'opération, et la preuve de réalisation de l'opération mentionne le numéro d'agrément du modèle installé (arrêté du 29 mai 2026, art. 2, pour les opérations engagées à compter du 1er sept. 2026) [12][13]. La preuve de réalisation est en principe la facture, à confirmer à l'arrêté du 4 sept. 2014. Ne pas en faire une mention bloquante avant d'avoir lu la charte.
- **Conséquence produit** : la date de signature du devis est une donnée à enjeu (elle ne doit jamais pouvoir être antidatée ni modifiée après coup) ; l'app peut demander « prime CEE prévue ? » avant l'envoi du devis pour rappeler que l'offre de prime doit être datée d'avant la signature. Elle ne remplit pas le dossier CEE.

### Éco-prêt à taux zéro (éco-PTZ)
- Offres émises jusqu'au 31 déc. 2027 (CGI 244 quater U). Montant maximal : 7 000 € pour les seules parois vitrées, 15 000 € pour une autre action seule, 25 000 € pour deux, 30 000 € pour trois ou plus, 50 000 € pour une rénovation globale, 10 000 € pour l'assainissement non collectif (service-public F19905, vérifiée le 1er sept. 2026).
- Deux formulaires : « emprunteur » et « **entreprise** » ; le second est rempli par l'artisan **RGE**, avec les devis détaillés ; versement possible sur la base des devis [14][15] [résumé]. Il finance notamment les gestes sortis de MaPrimeRénov' par geste en sept. 2026 [10] [résumé].

### TVA réduite
Voir § 3 : c'est l'aide la plus fréquente, sans dossier, portée par le devis ou la facture.

### Crédit d'impôt services à la personne (CGI 199 sexdecies)
- 50 % des dépenses, plafond général 12 000 € par an [16] [résumé] ; **petit bricolage** : 500 € par an et par foyer, interventions de 2 heures au plus ; **petit jardinage** : 5 000 € par an [17] [résumé] **(à vérifier sur BOFiP : plafonds 2026)**.
- Il faut passer par un organisme **déclaré** services à la personne ; il remet à chaque client une **attestation fiscale annuelle** (date de remise non fixée par C. trav. D7233-4 ; « avant le 31 mars » vient du modèle service-public : un conseil, jamais une obligation légale), avec son n° et la date de sa déclaration ; seuls certains moyens de paiement ouvrent droit (carte, prélèvement, virement, chèque, CESU) [16] [résumé].
- **Avance immédiate** (Urssaf) depuis 2022 pour ménage, bricolage, jardinage : le client ne paie que sa part ; le prestataire doit être habilité [17][18] [résumé]. Aucune obligation pour les prestataires n'a été trouvée **(à vérifier)**.
- Version en vigueur depuis le 14 juin 2026 (loi n° 2026-492 du 12 juin 2026, art. 12) : contenu de la modification à lire avant de coder ; plafonds en vigueur : 12 000 € et ceux de C. trav. D7233-5.
- Concerne : **multiservice** et **paysagiste** (entretien), pas les travaux du bâtiment.

### Ce qui a changé en 2025-2026, et ce qui est incertain
- Changé : certification TVA sur devis/facture (2025) ; MaPrimeRénov' suspendue puis rouverte (févr. 2026), resserrée en janv. puis en sept. 2026 ; CEE 6e période (2026) ; agrément PAC pour le Coup de pouce (sept. 2026) ; PAC air/air au 5,5 % (2026) ; réforme RGE (juin 2026, § 5).
- Incertain : budget MaPrimeRénov' 2027 ; mentions Anah sur devis/facture ; liste exacte des gros équipements ; plafonds 2026 du crédit d'impôt.

## 5. RGE (« Reconnu garant de l'environnement »)

- **Principe (éco-conditionnalité)** : les aides (MaPrimeRénov', éco-PTZ, CEE) exigent une entreprise RGE pour le geste aidé [14][19] [résumé]. Critères : arrêté du 1er déc. 2015 [20] [résumé].
- **Organismes** : qualification délivrée par des organismes accrédités par le Cofrac : **Qualibat**, **Qualifelec**, **Qualit'EnR**, **Certibat**, **Cerqual Qualitel** [19][21] [résumé]. **Cequami** n'est cité que par une source **(à vérifier)**. AFNOR n'est cité par aucune.
- **Durée et contrôles** : 4 ans ; mise à jour annuelle (assurances, moyens, frais) ; contrôle d'un chantier dans les 24 mois après l'attribution, sinon suspension possible [22] [résumé]. Annuaire officiel France Rénov' (par nom ou SIREN) et liste ouverte de l'ADEME [21][22] [résumé].
- **Réforme 2026** : arrêté du 23 juin 2026 (JO du 26 juin) modifiant l'arrêté de 2015 : « RGE par VAE » (attestation de chantier après un contrôle conforme), contrôles proportionnés à l'activité, suspension jusqu'à 24 mois ; dates d'effet divergentes (26 juil. 2026 selon la CAPEB, 1er mars 2027 pour une partie selon un autre site) [20] [résumé] **(à vérifier au JO)**.
- **Nombre** : 54 000 à 63 000 entreprises RGE selon les sources, en baisse (−16 % en un an selon l'ADEME citée par la presse, 2024) [23] [résumé].
- **Qualiopi n'est pas un organisme RGE — l'app se trompe.** Qualiopi est la certification qualité des **organismes de formation** (C. trav. L6316-1, loi du 5 sept. 2018), obligatoire depuis le 1er janv. 2022 pour recevoir des fonds publics de formation, valable 3 ans [24] [résumé]. Qualibat peut certifier Qualiopi des organismes de formation [25] [résumé], ce qui explique peut-être la confusion. **À corriger** dans la liste des Paramètres (Qualibat, Qualifelec, Qualit'EnR, Qualiopi, Autre) : retirer Qualiopi, ajouter Certibat et Cerqual Qualitel (et Cequami après vérification). Une qualification RGE porte sur un **domaine de travaux** : un seul champ « n° + organisme » ne dit pas quels gestes l'artisan peut faire aider.

## 6. Facture électronique

Réception au 1er sept. 2026, émission au 1er sept. 2027 pour les TPE, par une Plateforme Agréée : voir MB § 8 [texte].

## Sources

1. Assurance construction (dossier Lefebvre Dalloz) ; Assurance dommages-ouvrage (Hellio) — https://formation.lefebvre-dalloz.fr/dossier/construction-urbanisme/assurance-construction ; https://particulier.hellio.com/blog/travaux/assurance-dommages-ouvrage — consulté le 03/11/2026 — [résumé] (sources non officielles)
2. Assurance décennale : de nouvelles attestations (FFB) ; Loi Macron et arrêté du 5 janvier 2016 (Lefebvre Dalloz) — https://www.ffbatiment.fr/actualites-batiment/actualite-ba/de-nouvelles-attestations ; https://formation.lefebvre-dalloz.fr/actualite/loi-macron-arrete-janvier-2016 — consulté le 03/11/2026 — [résumé]
3. BOI-TVA-LIQ-30-20-90-20 (version du 09/09/2026) — https://bofip.impots.gouv.fr/bofip/1666-PGP.html/identifiant=BOI-TVA-LIQ-30-20-90-20-20260909 — consulté le 03/11/2026 — [résumé]
4. Gros équipements : taux de TVA et crédit d'impôt (ANIL, 2005) ; questions écrites AN (13e législature) — https://www.anil.org/documentation-experte/analyses-juridiques-jurisprudence/analyses-juridiques/analyses-juridiques-2005/gros-equipements-taux-de-tva-et-credit-dimpot/ ; https://www.assemblee-nationale.fr/dyn/13/questions/QANR5L13QE16273.pdf — consulté le 03/11/2026 — (à vérifier) (anciens)
5. BOI-TVA-LIQ-30-20-90-20 (version 2014) ; Clim non éligible au 5,5 % (blog) — https://bofip.impots.gouv.fr/bofip/1666-PGP.html/identifiant=BOI-TVA-LIQ-30-20-90-20-20140929 ; https://batiproconnect.com/clim-non-eligible-au-55-le-materiel-a-20-la-pose-a-10/ — consulté le 03/11/2026 — [résumé] / (à vérifier) pour le blog
6. TVA à 5,5 % sur les PAC air/air (CAPEB, 20-21 juil. 2026) ; arrêté du 13 juillet 2026 (JeChange) ; Qualit'EnR, TVA 5,5 % — https://www.capeb.fr/actualites/tva-a-5-5-sur-les-pac-air-air-la-capeb-obtient-une-avancee-majeure-hq2cnx ; https://www.jechange.fr/energie/electricite/news/tva-5-5-climatisation-reversible-conditions ; https://www.qualit-enr.org/conseils-maison-autonome/aide-a-la-renovation-energetique/tva-reduite-5-5-travaux-renovation/ — consulté le 03/11/2026 — [résumé]
7. Autoliquidation TVA sous-traitance BTP (marche-public.fr ; Hayot Expertise ; CAA Lyon 6 nov. 2025 via Doctrine) — https://www.marche-public.fr/contrats-publics/Autoliquidation-tva-sous-traitance-btp.htm ; https://hayot-expertise.fr/blog/facturation-de-la-sous-traitance ; https://www.doctrine.fr/d/CAA/Lyon/2025/CETATEXT000052557299 — consulté le 03/11/2026 — [résumé] (non officielles, sauf l'arrêt)
8. Réouverture de MaPrimeRénov' (info.gouv.fr) ; MaPrimeRénov' 2026 (FFB) — https://www.info.gouv.fr/actualite/reouverture-de-maprimerenov ; https://www.ffbatiment.fr/en/actualites-batiment/actualite/maprimernov-reouverture-du-guichet-de-demande-imminente — consulté le 03/11/2026 — [résumé]
9. MaPrimeRénov' : la suspension est terminée (La Maison Saint-Gobain) ; Suspension MaPrimeRénov' 2026 (imop) — https://www.lamaisonsaintgobain.fr/blog/c-est-deja-maintenant/maprimerenov-suspension-terminee-ce-qui-change-en-2026 ; https://www.imop.fr/blog/nos-conseils-pratiques-pour-vendre-et-acheter/maprimerenov-en-2026 — consulté le 03/11/2026 — (à vérifier) (divergent sur la suspension)
10. Aides à la rénovation énergétique : ce qui change au 1er septembre 2026 (ADIL 66) ; MaPrimeRénov' réservée aux PAC dès septembre 2026 ; éco-PTZ et gestes sortis (Selectra) — https://www.anil.org/adil-66/toutes-nos-actualites/details/aides-a-la-renovation-energetiques-ce-qui-change-au-1er-septembre-2026/ ; https://www.les-energies-renouvelables.eu/article/actualites/energies/maprimerenov-reservee-aux-pompes-a-chaleur-des-septembre-2026-quest-ce-que-cela-change-1889/ ; https://selectra.info/energie/actualites/renovation-energetique/eco-ptz-finance-isolation-vmc-chauffe-eau-sorties-maprimerenov-septembre-2026 — consulté le 03/11/2026 — [résumé]
11. PLF 2027 et MaPrimeRénov' (toulouseimmo9 ; JeChange) — https://www.toulouseimmo9.com/actualites/politique/maprimerenov-2027-baisse-dotation-anah ; https://www.jechange.fr/energie/electricite/news/maprimerenov-2027-500-millions-de-moins-deposer-dossier-avant-31-decembre — consulté le 03/11/2026 — (à vérifier)
12. Le décret relatif à la sixième période est paru (Banque des Territoires) ; Ce qui change en 2026 pour les CEE (Hellio) — https://www.banquedesterritoires.fr/certificats-deconomies-denergie-le-decret-relatif-la-sixieme-periode-est-paru ; https://www.hellio.com/actualites/reglementation/changements-cee-2026 — consulté le 03/11/2026 — [résumé]
13. Rôle actif et incitatif (Kohen Avocats ; question écrite AN 16e lég. n° 5720) — https://kohenavocats.fr/?p=2112362 ; https://questions.assemblee-nationale.fr/dyn/16/questions/QANR5L16QE5720.pdf — consulté le 03/11/2026 — [résumé]
14. Éco-PTZ 2026-2027 (construires.fr) — https://www.construires.fr/eco-ptz-2025-financement-travaux/ — consulté le 03/11/2026 — (à vérifier) (non officiel)
15. Éco-prêt à taux zéro (justice.fr, reprise de service-public, 1er juil. 2025) ; fiche Toulouse Métropole (avr. 2026) — https://www.justice.fr/fiche/eco-pret-taux-zero-eco-ptz ; https://renov.toulouse-metropole.fr/wp-content/uploads/sites/15/2026/04/FP_EcoPTZ.pdf — consulté le 03/11/2026 — [résumé]
16. Crédit d'impôt services à la personne, BOFiP (mise à jour 2026) ; art. 199 sexdecies commenté — https://bofip.impots.gouv.fr/doctrine/pgp/13448-PGP ; https://advizexperts.fr/code-general-impots/article-199-sexdecies-cgi-credit-impot-services-domicile/ — consulté le 03/11/2026 — [résumé]
17. Crédit d'impôt aide à domicile (aide-sociale.fr) — https://www.aide-sociale.fr/credit-impot-aide-domicile/ — consulté le 03/11/2026 — (à vérifier) (non officiel)
18. Avance immédiate du crédit d'impôt (Legifiscal ; Deloitte Avocats) — https://www.legifiscal.fr/impots-taxes-entreprise/credits-reductions-impot/avance-immediate-credit-impot-service-personne.html ; https://blog.avocats.deloitte.fr/emploi-a-domicile-lancement-du-dispositif-du-credit-dimpot-instantane-pour-les-services-a-la-personne/ — consulté le 03/11/2026 — [résumé]
19. Les qualifications professionnelles dans le bâtiment (FFB) ; Tout savoir sur les certifications RGE (TotalEnergies) — https://www.ffbatiment.fr/gestion-entreprise/creer-perenniser-mon-entreprise/qualifications-certifications-labels-dentreprise/dossier/qualifications-professionnelles-dans-le-batiment ; https://www.totalenergies.fr/particuliers/nos-services/certificats-deconomies-denergie/certification-rge — consulté le 03/11/2026 — [résumé]
20. Évolutions réglementaires du dispositif RGE (FFB) ; RGE VAE : l'arrêté est publié au JO (CAPEB, 29 juin 2026) ; Réforme RGE (Selectra) — https://www.ffbatiment.fr/actualites-batiment/actualite/evolutions-reglementaires-du-dispositif-rge ; https://www.capeb.fr/actualites/rge-vae-larrete-est-publie-au-journal-officiel-une-victoire-majeure-obtenue-par-la-capeb ; https://selectra.info/energie/actualites/renovation-energetique/reforme-rge-criteres-controles-2026 — consulté le 03/11/2026 — [résumé] / (à vérifier) pour les dates
21. Annuaire RGE et organismes (Selectra) ; Comment devenir qualifié RGE (Effy) — https://selectra.info/energie/renovation-energetique/qualification-rge ; https://www.effy.fr/pro/gestion-entreprise/dossier-qualification-rge — consulté le 03/11/2026 — (à vérifier) (non officiels)
22. Comment devenir RGE (Qualit'EnR) ; Audits RGE (CAPEB) — https://www.qualit-enr.org/?p=747 ; https://www.capeb.fr/actualites/audits-rge-avez-vous-recu-le-courrier-de-demande — consulté le 03/11/2026 — [résumé]
23. MomentPro RGE 2025 (DREAL Nouvelle-Aquitaine) ; chute de 16 % (MySweetImmo, mars 2024) — https://www.nouvelle-aquitaine.developpement-durable.gouv.fr/IMG/pdf/2025_moment_pro_rge_ffb.pdf ; https://www.mysweetimmo.com/2024/03/21/immobilier-et-renovation-energetique-chute-de-16-du-nombre-de-societes-rge-en-1-an/ — consulté le 03/11/2026 — [résumé] / (à vérifier)
24. Qualiopi, la certification qualité des organismes de formation (DREETS Normandie, DREETS PACA ; Centre Inffo) — https://normandie.dreets.gouv.fr/QUALIOPI-la-certification-qualite-des-organismes-de-formation ; https://paca.dreets.gouv.fr/La-certification-qualite-QUALIOPI-18834 ; https://www.centre-inffo.fr/?p=465471 — consulté le 03/11/2026 — [résumé]
25. Activités accréditées Cofrac de Qualibat (avr. 2023) — https://www.qualibat.com/wp-content/uploads/2023/04/Activites_accreditees_cofrac_Avril-2023.pdf — consulté le 03/11/2026 — [résumé]

## Relecture juriste-btp
Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- exception pénale de L243-3 (personne physique qui construit pour elle-même ou sa famille) ;
- plafonds de l'éco-PTZ : relus le 3 nov. 2026 (service-public F19905 ; CGI 244 quater U ; voir l. 74) ;
- n° d'agrément PAC : relu au texte le 3 nov. 2026 (arrêté du 29 mai 2026, art. 2 : la preuve de réalisation de l'opération le mentionne ; voir l. 70) ; reste à confirmer à l'arrêté du 4 sept. 2014 que cette preuve est la facture ; pas de mention bloquante ;
- liste exacte des mentions de l'attestation décennale (arrêté du 5 janv. 2016) ;
- liste des gros équipements (BOI-TVA-LIQ-30-20-90-20) ; date de l'arrêté du 5,5 % (4 déc. 2024 ou JO du 24 déc.) ;
- sous-traitant en franchise : 293 B sans autoliquidation (jugé juste, non lu au BOFiP).
