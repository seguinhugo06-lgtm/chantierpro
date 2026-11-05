# Serrurier et dépanneur — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.32B « Travaux de menuiserie métallique et serrurerie » ; vitrerie : 43.34Z « Travaux de peinture et vitrerie » ; métallerie en atelier : division 25 (aucune source trouvée pour ces libellés **(à vérifier sur insee.fr)**) · **Variantes couvertes** : serrurier dépanneur (ouverture de porte, changement de cylindre, mise en sécurité après effraction), poseur de portes blindées et de serrures certifiées, serrurier-métallier (garde-corps, portails, grilles), vitrier en urgence.

Règles transverses : voir `commun.md` et `docs/metier-btp.md`. Le dépannage d'urgence est le cœur du métier : il est déjà traité dans **metier-btp.md § 2** (arrêté du 24 janv. 2017, vérifié) et **§ 2, rétractation** (L221-28 8°, L221-10 4°, phrase signée par le client). Cette fiche ne le redétaille pas.

## 1. Assurances

- **Décennale** — dépend de l'intervention :
  - **Oui** pour la **serrurerie-métallerie** qui crée un ouvrage fixe : garde-corps, portails, grilles, escaliers métalliques scellés. Un assureur résume : ouvrage fixe, indémontable sans abîmer le bâti, fonction essentielle à la sécurité ou à l'usage [1] **[résumé, source commerciale — à vérifier]**.
  - **Non** pour l'**ouverture de porte**, le **remplacement d'un cylindre ou d'une serrure**, la **mise en sécurité provisoire** : pas de construction d'ouvrage. Aucune source ne le dit expressément [1] **(à vérifier)** ; c'est le cas « dépannage, entretien, petites réparations » de D-24 (l'artisan déclare « non soumis » dans ses paramètres, rien n'est imprimé).
  - **Porte blindée posée sur un existant** : élément d'équipement ajouté. Depuis Cass. 3e civ., 21 mars 2024, n° 22-18.694 (metier-btp.md § 2), un élément ajouté sur l'existant ne relève plus de la décennale ; un bloc-porte complet avec reprise du bâti pourrait être un ouvrage **(à vérifier)**. L'app ne doit pas trancher : elle laisse l'artisan choisir et imprime son attestation s'il en a une.
- **RC pro** : non obligatoire (voir commun.md) mais indispensable en pratique : une ouverture de porte abîme souvent la porte.
- L'assurance habitation **du client** joue un grand rôle (effraction, bris de glace) : voir § 7.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| Certification **A2P** des serrures | CNPP | Non : démarche volontaire du **fabricant**, elle certifie un **produit**, pas l'artisan | Exigée ou valorisée par certains contrats d'assurance habitation (réduction de prime, condition d'indemnisation en cas d'effraction) | [2][3] **[résumé ; niveaux de serrure 1 à 3 étoiles : à vérifier]** |
| Certification **A2P BP1 / BP2 / BP3** des blocs-portes | CNPP | Non | Même effet. Résistance annoncée d'environ 5, 10 et 15 minutes ; le bloc-porte **et** sa serrure doivent être certifiés pour parler de porte blindée certifiée | [2][3] **[résumé, sources non officielles]** |
| Qualification « serrurerie-métallerie » | Qualibat | Non | Preuve de compétence ; aucune aide liée | (à vérifier) |
| RGE | — | Non pour la serrurerie | Une porte d'entrée isolante pourrait relever de la rénovation énergétique **(à vérifier, voir commun.md)** | — |

Point de vigilance : un serrurier ne peut pas écrire « porte blindée A2P » si le produit posé n'a pas le certificat ; le numéro de certificat se vérifie sur le site du CNPP [3] **[résumé]**. Affirmer une certification fausse est une pratique trompeuse (voir § 6).

## 3. Documents remis au client

- **Devis préalable, avant toute intervention, même en urgence, quel que soit le montant** (arrêté du 24 janv. 2017, en vigueur au 1er avril 2017, modifié par l'arrêté du 28 févr. 2017 ; l'urgence n'a plus de traitement particulier) [4] **[résumé]** ; contenu : voir metier-btp.md § 2 (frais de déplacement, devis gratuit ou payant, pièces remplacées).
- **Barème des prix** des principales prestations publié **sur le site internet** du professionnel, s'il en a un ; affichage dans les locaux : metier-btp.md § 2 (art. 3) [4] **[résumé]**.
- **Pièces remplacées** : le client peut les garder ; s'il n'en veut pas, une fiche DGCCRF ancienne dit que le professionnel lui fait signer une **décharge** [5] **[résumé — d'après une fiche antérieure à 2017, à relire avec l'art. 4 III de l'arrêté]**.
- **Facture remise dès la fin de l'intervention, avant le paiement** (arrêté de 2017, art. 5 — metier-btp.md § 2). Une campagne DREETS rappelle aussi qu'**au-delà de 25 €** une facture détaillée est obligatoire pour un particulier [5] **[résumé ; seuil de l'arrêté de 1983 sur les prix, à vérifier]**. En pratique : toujours une facture, tout de suite.
- **Hors établissement en urgence** : la phrase signée par le client, l'avis et le formulaire de rétractation avec l'exception : metier-btp.md § 2 (rétractation).
- **Facture « pour l'assureur »** après effraction : voir § 7.
- Conservation : voir commun.md.

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Aucune obligation légale trouvée pour un particulier | — | — | — | — |
| Entretien des portes et portails automatiques d'immeubles collectifs ou de lieux de travail | périodique | syndic, employeur | existe dans le Code de la construction et le Code du travail | (à vérifier : non recherché) |
| Contrôle du contrat d'assurance après pose d'une porte ou serrure certifiée (le client déclare le nouvel équipement) | une fois | client | contrat d'assurance | [2] (à vérifier) |

## 5. TVA propre au métier

- **Dépannage dans un logement achevé depuis plus de 2 ans** : la CAPEB range le **dépannage et la réparation des équipements** parmi les travaux d'**entretien** au taux de 10 % (CGI 279-0 bis) [6] **[résumé]**. Un remplacement de serrure ou de cylindre posé par l'artisan : 10 % ; vendu sans pose : 20 % [7] **[résumé, sources non officielles]**.
- **Ouverture de porte seule** (sans pièce) : est-ce un « entretien » d'un local d'habitation ? Aucune source officielle trouvée **(à vérifier au BOFiP BOI-TVA-LIQ-30-20-90-20)**. Par prudence, l'app ne doit pas proposer 10 % de force : elle propose le taux selon le local (habitation de plus de 2 ans) et laisse l'artisan décider.
- Une règle « 10 % seulement si la main-d'œuvre dépasse la moitié du devis » circule sur des sites de comptables [7] **(non confirmée — ne pas coder)**.
- **Local professionnel, commerce, logement de moins de 2 ans** : 20 %.
- **Porte d'entrée isolante, double vitrage** : 5,5 % possible au titre de la rénovation énergétique selon les critères techniques **(à vérifier, voir commun.md)**.
- **Certification du client** : la facture d'un dépannage à 10 % porte la mention « par le règlement » ; sous 1 000 € TTC, elle n'est pas exigée mais la facture doit alors dire que l'immeuble est achevé depuis plus de 2 ans (metier-btp.md § 4). L'app l'ajoute déjà.

## 6. Mentions particulières sur le devis et la facture

- **Taux horaire TTC, frais de déplacement, forfaits, majorations de nuit, dimanche et jours fériés** affichés **avant** l'intervention et repris sur le devis (arrêté de 2017) [4] **[résumé]**. Une majoration non annoncée au devis ne peut pas apparaître sur la facture.
- **Heure d'arrivée et heure de fin** sur la facture : non exigées par un texte trouvé, mais elles justifient le décompte du temps **(recommandé)**.
- **Référence et certification du produit posé** (marque, modèle, n° de certificat A2P s'il existe).
- **Ce qu'il ne faut jamais imprimer** :
  - une référence à la **mairie**, à un service public ou des signes qui l'imitent (bleu-blanc-rouge, faux logo, « numéros utiles ») : la loi du 17 mars 2014 (« loi Hamon ») interdit de faire référence à un service public dans sa publicité sans son accord [8][9] **[résumé]** ; la DGCCRF décrit ces prospectus [10] **[résumé]** ;
  - une certification ou un agrément non détenus : pratique commerciale trompeuse (C. conso. L121-2 à L121-4 ; se dire agréé par un organisme public est une pratique réputée trompeuse de L121-4, article exact à vérifier), punie de 2 ans d'emprisonnement et de 300 000 € d'amende, jusqu'à 10 % du chiffre d'affaires [11] **[résumé ; montant peut-être modifié en 2024 — à vérifier]**.
- **Abus de faiblesse** (C. conso. L121-8 à L121-10, sanctions L132-14 et L132-15) : profiter de la détresse d'une personne lors d'une visite à domicile ; une seule visite suffit (Cass. crim., 8 mars 2016, n° 14-88.347) ; contrat nul, sommes restituées ; peine annoncée de 3 ans et 375 000 € [12][13] **[résumé ; montant à vérifier au texte]**. C'est le risque n° 1 du dépannage d'urgence chez une personne âgée.

## 7. Aides du client et pièces que l'artisan fournit

Pas d'aide publique pour la serrurerie. Le « financeur » est l'**assureur habitation** du client.

- **Effraction / cambriolage** : le client déclare le vol à son assureur dans un délai qui ne peut être inférieur à **2 jours ouvrés** (5 jours ouvrés pour les autres sinistres), C. assur. L113-2 4° ; le contrat peut prévoir plus long [14] **[résumé]**. Les justificatifs peuvent suivre. Le retard ne fait perdre la garantie que si l'assureur prouve un préjudice [14] **[résumé, à vérifier]**.
- **Ce que l'assureur attend du serrurier** : un **devis détaillé** et une **facture précisant la nature de l'intervention** (traces d'effraction, fermeture provisoire, remplacement), avec photos [14] **[résumé, sources non officielles]**. La fermeture provisoire se facture à part de la réparation définitive.
- **Bris de glace (vitrerie d'urgence)** : le client choisit son vitrier puis envoie la facture à l'assureur, ou passe par un réparateur agréé payé directement par l'assureur (il ne paie que la franchise) ; garder les débris jusqu'à l'accord de l'assureur, ne pas remplacer avant de l'avoir prévenu sauf urgence [15][16] **[résumé, sources d'assureurs]**. La condensation entre deux verres n'est pas un bris de glace [16] **[résumé]**.
- **Ce que l'artisan fournit** : facture détaillée (dimensions, type de vitrage ou de serrure, nombre d'éléments), photos avant et après, mention « mise en sécurité provisoire » s'il y a lieu.

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

Problèmes réels :
- Client en détresse sur le palier, de nuit, qui veut seulement que la porte s'ouvre : le devis écrit se fait **sur le pas de la porte**, sur le téléphone, en deux minutes.
- La profession souffre des « faux dépanneurs » (prospectus imitant la mairie, prix multipliés) [10] ; un artisan honnête doit **prouver** qu'il a respecté les règles : devis signé avant, tarifs affichés, facture remise.
- Paiement sur place : carte ou espèces (1 000 € maximum, voir commun.md) ; la DGCCRF relève des **cartes débitées plusieurs fois** [5] **[résumé]**.
- L'assureur du client demande une facture précise, parfois des jours plus tard.
- Le serrurier-métallier fait aussi des chantiers (portails, garde-corps) avec décennale et acompte, donc deux façons de travailler dans le même compte.

Propositions :

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | **Parcours « dépannage d'urgence »** en un écran : forfait choisi dans une grille préremplie (ouverture, cylindre, mise en sécurité), frais de déplacement et majoration horaire tirés des paramètres, signature du client sur le téléphone avec la phrase d'urgence (déjà rédigée, metier-btp.md § 2), puis **facture immédiate** tirée du devis | M | Moyen : relu en partie ; à faire relire par juriste-btp |
| Indispensable | **Grille tarifaire** dans les paramètres (taux horaire TTC, déplacement, forfaits, majorations nuit / dimanche) avec une **page publique imprimable** et un lien pour le site : répond à l'affichage obligatoire | M | Faible si reprise telle quelle |
| Indispensable | Garde-fou : une ligne de majoration ou de déplacement **absente de la grille** demande une confirmation ; jamais de montant de facture supérieur au devis signé sans nouvel accord | S | Faible |
| Indispensable | Paiement : un encaissement par facture, refus d'un second encaissement identique le même jour sans confirmation ; plafond espèces 1 000 € (règle commune) | S | Faible |
| Utile | **Facture « pour l'assureur »** : bloc « constat » (date et heure, adresse, traces d'effraction oui/non, photos jointes, fermeture provisoire), à imprimer ou envoyer plus tard | M | Faible ; aucune affirmation à la place de l'assureur |
| Utile | Champ « produit certifié » par ligne (marque, modèle, n° de certificat CNPP) imprimé tel quel ; aucun texte « A2P » sans numéro | S | Faible ; évite la pratique trompeuse |
| Utile | Case « pièces remplacées : conservées par le client / laissées à l'artisan » sur la facture | S | Faible |
| Plus tard | Modèle « portail / garde-corps » avec décennale et acompte, séparé du dépannage | S | Voir commun.md |

## Sources

1. Assurup, assurances du serrurier — https://www.assurup.com/activities/serrurier — consulté le 03/11/2026 — (à vérifier : source commerciale)
2. Matmut, choisir sa serrure — https://www.matmut.fr/assurance/habitation/conseils/securite-choisir-serrure — consulté le 03/11/2026 — [résumé]
3. CNPP, document sur la certification A2P — https://www.cnpp.com/private/cnpp/ftp/PDF/23.86.64.pdf ; Habitatpresto, prix d'une porte blindée — https://www.habitatpresto.com/mag/menuiserie/prix-porte-blindee — consulté le 03/11/2026 — [résumé] / (à vérifier)
4. DGCCRF, fiche pratique « Dépannage à domicile » (01/07/2025) — https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/depannage-domicile ; arrêté du 24 janv. 2017 — https://www.legifrance.gouv.fr/eli/arrete/2017/1/24/ECFC1701378A/jo/texte — consulté le 03/11/2026 — [résumé]
5. DREETS Bretagne, fiche pratique DGCCRF dépannage à domicile (2018) — https://bretagne.dreets.gouv.fr/sites/bretagne.dreets.gouv.fr/IMG/pdf/2018_10_fiche_pratique_dgccrf_depannage-a-domicile.pdf ; DREETS PACA — https://paca.dreets.gouv.fr/Depannage-a-domicile-evitez-les-arnaques — consulté le 03/11/2026 — [résumé]
6. CAPEB Morbihan, brève TVA — https://www.capeb.fr/www/capeb/media//morbihan/document/brève_tva5,5.pdf — consulté le 03/11/2026 — [résumé]
7. Advizexperts, expert-comptable serrurier — https://advizexperts.fr/expert-comptable-serrurier/ — consulté le 03/11/2026 — (à vérifier : source non officielle)
8. Question écrite AN (14e lég.) n° 67344, référence aux services publics dans la publicité — https://www2.assemblee-nationale.fr/questions/detail/14/qe/67344/(vue)/pdf — consulté le 03/11/2026 — [résumé]
9. Ville de Paris, « Stop aux arnaques » — https://www.paris.fr/pages/stop-aux-arnaques-6719 — consulté le 03/11/2026 — [résumé]
10. Préfecture d'Île-de-France, dossier de presse DGCCRF dépannage — https://www.prefectures-regions.gouv.fr/ile-de-france/ile-de-france/irecontenu/telechargement/37369/251833/file/Dossier de presse.pdf — consulté le 03/11/2026 — [résumé]
11. Le Mag juridique, répression des pratiques commerciales trompeuses — https://www.lemag-juridique.com/articles/publicite-mensongere-tromperie-quelle-repression-pour-ces-pratiques-commerciales-frauduleuses-9695.htm — consulté le 03/11/2026 — (à vérifier)
12. INC, abus de faiblesse : définition et recours — https://www.inc-conso.fr/content/abus-de-faiblesse-definition-et-recours — consulté le 03/11/2026 — [résumé]
13. Generali, abus de faiblesse : quels recours — https://www.generali.fr/actu/abus-faiblesse-quels-recours/ — consulté le 03/11/2026 — (à vérifier : montant des peines)
14. Selectra, délais de déclaration de sinistre ; Ornikar, cambriolage — https://selectra.info/assurance/comprendre/delai-declaration-sinistre et https://www.ornikar.com/assurance-habitation/sinistres/cambriolage-que-faire — consulté le 03/11/2026 — [résumé] (texte de L113-2 non ouvert)
15. Société Générale, bris de glace habitation — https://particuliers.sg.fr/nos-conseils/assurer/habitation-bris-de-glaces-reparation-et-assurance — consulté le 03/11/2026 — [résumé]
16. Groupama, bris de glace habitation — https://www.groupama.fr/assurance-habitation/conseils/bris-de-glace-habitation/ — consulté le 03/11/2026 — [résumé]

## Relecture juriste-btp

Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- C. conso. L121-4 : article exact pour « se dire agréé par un organisme public » ;
- TVA d'une ouverture de porte seule ; décharge pour les pièces remplacées (arrêté de 2017, art. 4 III) ; seuil de 25 €.
