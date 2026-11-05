# Multiservice (homme toutes mains, petits travaux, services à la personne) — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.
> Le quota de recherches de la session a été épuisé avant la fin : deux recherches prévues (loi de finances 2026 sur le crédit d'impôt, page service-public sur la déclaration) n'ont pas pu être faites.

**Codes NAF** : variables selon l'activité déclarée (jardinage, petit bricolage, travaux de finition) ; non recherchés **(à vérifier sur insee.fr)**.
**Variantes couvertes** : micro-entrepreneur « homme toutes mains » chez des particuliers, déclaré services à la personne (SAP) ou non ; jardinier ; entreprise multiservice du bâtiment (petits travaux de plusieurs corps de métier).

Règles transverses (TVA 20/10/5,5 et certification, devis en dépannage, contrat hors établissement, décennale, garanties) : voir `commun.md`.

## 1. Assurances

- **Petit bricolage SAP** (monter un meuble, poser une étagère, changer une ampoule) : pas un ouvrage, en principe hors décennale ; RC pro conseillée.
- **Travaux du bâtiment** (carrelage, plâtrerie, peinture qui touche au bâti, plomberie, électricité) : c'est de la construction au sens de C. assur. L241-1 dès qu'il y a ouvrage ou élément d'équipement → **décennale due**, voir `commun.md`. La frontière n'est pas l'intitulé « multiservice » mais la nature de chaque chantier ; les activités déclarées à l'assureur doivent couvrir ce qui est fait.
- Aucune source propre au multiservice n'a été recherchée sur ce point : déduction des règles communes **(à vérifier)**.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| **Déclaration SAP** (extranet NOVA) | DREETS / ministère | **Non** pour exercer ; **oui** pour que le client ait le crédit d'impôt et pour la TVA réduite SAP | Crédit d'impôt 50 %, avance immédiate | [8, 9, 12] [résumé] (« facultative » : à confirmer sur service-public, recherche non faite) |
| **Qualification artisanale** (CAP/BEP ou 3 ans d'expérience, ou un salarié qualifié) | CMA | **Oui** pour la construction, l'entretien et la réparation des bâtiments et pour les réseaux et équipements (eau, gaz, chauffage, électricité) | Travaux faits sous le contrôle d'une personne qualifiée | C. artisanat L121-1 ; R121-1 et s. [15] [résumé] |
| Agrément ou autorisation SAP | Préfet / département | Seulement pour les publics fragiles (enfants, personnes âgées ou handicapées) : hors cible | — | [8] [résumé] |
| Qualibat, RGE | Qualibat, etc. | Non | Aides du client pour la rénovation énergétique : voir les fiches des métiers concernés | — |

**Conséquence directe** : un « homme toutes mains » sans qualification ne peut pas faire de l'électricité ou de la plomberie sous son nom, même petite (catégorie « réseaux et équipements » de L121-1 : plombier, électricien, chauffagiste, gaz) [15] ; et le petit bricolage SAP exclut justement ces travaux (§ 4).

## 3. Documents remis au client

Textes lus sur Légifrance le 5 nov. 2026 (avis juriste-btp du lot 4, point 9) : C. trav. D7233-1 à D7233-4 (https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018500094/) et arrêté du 17 mars 2015 (https://www.legifrance.gouv.fr/loda/id/JORFTEXT000030395494). Les listes ci-dessous sont recopiées de ces textes ; elles remplacent celles des résumés.

### Devis SAP (arrêté du 17 mars 2015, en vigueur depuis le 01/07/2015)
- Art. 4 : prix par prestation rapporté à l'heure, ou forfaitaire ; prix HT et TTC.
- Art. 5 : « La mention d'un éventuel avantage fiscal ou social est clairement définie, détachée du prix et exprimée dans une police de caractère d'imprimerie de taille inférieure à celle de l'information sur le prix. »
- Art. 6 : devis gratuit obligatoire à partir de 100 € TTC par mois, et sur demande en dessous.
- Art. 7, le devis mentionne (les points relus ; les autres points de l'article ne sont pas recopiés dans l'avis) :
  - 3° « Le numéro de la déclaration si elle a été faite » ;
  - 5° le lieu de l'intervention ;
  - 7° « Le ou les modes d'intervention proposés » ;
  - 8° le nombre d'heures par prestation ;
  - 9° le prix horaire ou forfaitaire ;
  - 10° le taux de TVA ;
  - 11° et 12° le total et les frais annexes, HT et TTC.
- Art. 8 : « La facture prévue à l'article D. 7233-1 du code du travail est délivrée au consommateur avant paiement. Elle est gratuite quel que soit le support durable utilisé à cette fin. »

S'ajoute au devis obligatoire du dépannage (voir `commun.md`) quand la prestation est aussi un dépannage.

### Facture SAP (C. trav. D7233-1, en vigueur depuis le 30/12/2016, décret n° 2016-1895)
> « Lorsqu'ils assurent la fourniture aux personnes physiques de prestations de services à la personne, les personnes morales et les entrepreneurs individuels produisent une facture faisant apparaître : 1° Le nom et l'adresse de la personne morale ou de l'entrepreneur individuel ; 2° Le numéro et la date d'enregistrement de la déclaration si celle-ci a été demandée ainsi que le numéro et la date de délivrance de l'agrément lorsque les activités relèvent de l'article L. 7232-1 ; 3° Le nom et l'adresse du bénéficiaire de la prestation de service ; 4° La nature exacte des services fournis ; 5° Le montant des sommes effectivement acquittées au titre de la prestation de service ; 6° Un numéro d'immatriculation de l'intervenant permettant son identification dans les registres des salariés de l'entreprise ou de l'association prestataire ; 7° Les taux horaires de main-d'oeuvre ou, le cas échéant, le prix forfaitaire de la prestation ; 8° Le décompte du temps passé ; 9° Les prix des différentes prestations ; 10° Le cas échéant, les frais de déplacement ; 11° […] »

(Le 11° n'est pas recopié dans l'avis du 5 nov. 2026.) Même page :
- **D7233-2** (depuis le 01/05/2008) : « Lorsque les prestations de service sont imposables à la taxe sur la valeur ajoutée, les taux, prix et frais de déplacement mentionnés à l'article D. 7233-1 comprennent cette taxe. »
- **D7233-3** : seules les factures acquittées par carte, prélèvement, virement, titre interbancaire de paiement, chèque ou CESU ouvrent droit au crédit d'impôt de CGI 199 sexdecies.

Le taux horaire ou le forfait (7°) et le décompte du temps passé (8°) sont donc des mentions de la facture ; pour le petit bricolage, la durée (≤ 2 h) justifie en plus l'éligibilité.

### Attestation fiscale annuelle (C. trav. D7233-4, en vigueur depuis le 30/12/2016)
L'entrepreneur déclaré « délivre à chacun de ses clients une attestation fiscale annuelle ». Elle mentionne :
1. nom, adresse et numéro d'identification ;
2. numéro et date d'enregistrement de la déclaration ;
3. nom et adresse du bénéficiaire, numéro du compte débité le cas échéant, montant effectivement acquitté ;
4. « récapitulatif des interventions faisant apparaître le nom et le code identifiant de l'intervenant, ainsi que la date et la durée de l'intervention ».

- **Quand** : une fois par an, à chaque client ; D7233-4 (lu au texte le 5 nov. 2026) ne fixe aucune date de remise. « Avant le 31 mars » vient du modèle service-public : à présenter comme un conseil, jamais comme une obligation légale [3] [résumé] ; un guide ancien dit « 31 janvier » : le texte ne fixe aucune date.
- **Pourquoi** : permettre au client le crédit d'impôt de CGI art. 199 sexdecies [4] [résumé].
- Modèle officiel : service-public R32522 [3].

### Ce que l'app produit (avis du lot 4, point 9)
La ligne `Services à la personne : déclaration enregistrée sous le n° {numéro} le {date}` répond à D7233-1, 2° (facture) et à l'art. 7, 3° (devis). Il ne faut pas y ajouter « crédit d'impôt » : l'art. 5 l'encadre. L'app ne sait aujourd'hui produire ni le 6° (identifiant de l'intervenant), ni des prix unitaires TTC (D7233-2), ni l'attestation fiscale annuelle. **Elle n'imprime donc pas la déclaration, pour l'instant** : « Où l'imprimer » est figé sur « Ne pas l'imprimer » dans Paramètres › Légal › Mes qualifications (décision de la session locale du 5 nov. 2026, après l'avis).

## 4. Obligations et plafonds propres aux services à la personne

| Règle | Contenu | Texte | Source |
|---|---|---|---|
| Liste des activités | C. trav. D7231-1 ; y figurent les « petits travaux de jardinage, y compris les travaux de débroussaillage » et les « travaux de petit bricolage dits “homme toutes mains” » | D7231-1 | [1, 2] [résumé] |
| **Jardinage** | dépenses retenues plafonnées à **5 000 € par an et par foyer** (crédit max. 2 500 €) ; entretien courant, taille de haies et d'arbres, hors travaux forestiers | D7233-5 ; CGI 199 sexdecies | [1, 14] [résumé] |
| **Petit bricolage** | **500 € par an et par foyer** (crédit max. 250 €) ; **intervention ≤ 2 heures** ; ni vente de produits, ni travaux sur équipements électriques, gaz ou chauffage | D7233-5 (à vérifier) | [1, 13] [résumé] ; Petit bricolage : 500 € par an et par foyer fiscal, intervention de deux heures au plus (C. trav. D7233-5, à relire au texte) ; l'amendement I-415 n'en est pas la source. |
| Plafond général | 12 000 € par an, majoré sous conditions | CGI 199 sexdecies | [1] (à vérifier) |
| **Condition d'activité exclusive** | pour ouvrir les avantages fiscaux, l'entreprise ne fait que du SAP (C. trav. L7232-1-1) ; **dispense** depuis le 1er janv. 2025 pour les micro-entrepreneurs (micro-BIC, micro-BNC) qui font du SAP à titre principal (décret n° 2024-851 du 25 juil. 2024), demande dans NOVA, à jour des déclarations TSA et EMA | L7232-1-1 | [8, 9, 12] [résumé] ; seuil « hors SAP ≤ 30 % du CA de l'année précédente » vu sur une seule source **(à vérifier)** |
| Déclarations d'activité | états statistiques TSA (trimestriel ?) et EMA (annuel ?) dans NOVA | — | [12] [résumé] ; périodicité **(à vérifier)** |

**Conséquence pour un multiservice** : un même artisan qui fait à la fois du « petit bricolage SAP » et des chantiers de rénovation n'est plus en activité exclusive ; sans dispense, il perd les avantages SAP. La dispense micro-entrepreneur suppose que le SAP reste l'activité principale.

### Crédit d'impôt 50 % et avance immédiate
- **Crédit d'impôt** : 50 % des sommes payées, dans les plafonds ci-dessus (CGI 199 sexdecies) [1, 4] [résumé]. Les évolutions de la loi de finances 2026 n'ont **pas** pu être recherchées (quota épuisé) **(à vérifier)**.
- **Avance immédiate** (Urssaf, depuis le 14 juin 2022 pour les clients de prestataires) [16, 17] [résumé] :
  1. le prestataire inscrit son client auprès de l'Urssaf (via le service en ligne ou un logiciel habilité à l'**API Tiers de prestation**) ;
  2. après chaque prestation, le prestataire envoie une **demande de paiement** ;
  3. le client a **48 heures** pour valider ou contester sur particulier.urssaf.fr ; sans réponse, validée ;
  4. l'Urssaf prélève au client **la moitié seulement** et verse le total au prestataire (délais de quelques jours, divergents selon les sources) [16, 17] **(à vérifier)**.
  - Le service est gratuit et facultatif [17]. Un site dit que le client doit activer Cesu+ **(à vérifier)**. L'habilitation d'un éditeur à l'API passe par l'Urssaf (conditions non trouvées) **(à vérifier)**.

## 5. TVA propre au métier

- **Micro-entrepreneur en franchise** : pas de TVA, mention « TVA non applicable, art. 293 B du CGI » (voir `commun.md`) ; c'est le cas le plus fréquent pour un homme toutes mains. Les prix de D7233-1 sont alors des prix nets.
- **Assujetti, prestation SAP déclarée** : **10 %** pour le petit bricolage et le jardinage (CGI art. 279, i), passé de 7 % à 10 % au 1er janv. 2014 [18, 19] [résumé] ; **5,5 %** pour certains services d'aide aux personnes fragiles (CGI 278-0 bis D) : hors cible [18].
- **Travaux du bâtiment** (hors SAP) : 10 % ou 5,5 % dans un logement de plus de 2 ans, avec certification ; 20 % sinon (voir `commun.md`).
- **Prestation SAP non déclarée** : taux normal 20 % sauf si elle est aussi un travail dans un logement de plus de 2 ans (10 % de droit commun) — déduction, **(à vérifier)** avec juriste-btp.

## 6. Mentions particulières sur le devis et la facture

- Facture SAP : celles de D7233-1 (§ 3), en plus des mentions communes (voir `commun.md`). Le n° SAP se saisit dans Mes qualifications, mais l'app ne l'imprime pas pour l'instant (§ 3).
- Mention (C. trav. D7233-1, 2° ; arrêté du 17 mars 2015, art. 7, 3° ; avis du lot 4, point 9) : `Services à la personne : déclaration enregistrée sous le n° … le …`. Ne pas écrire « ouvrant droit au crédit d'impôt » : le droit dépend du foyer, des plafonds et du moyen de paiement (art. 5 de l'arrêté). Ne jamais l'imprimer pour un travail exclu (électricité, plomberie, chauffage, au-delà de 2 h pour le bricolage), sinon c'est une affirmation fausse qui engage l'artisan. L'app ne l'imprime pas pour l'instant (§ 3).
- Séparer sur des factures distinctes la part SAP et la part « travaux du bâtiment » d'un même client : déduction pratique pour l'attestation fiscale **(à vérifier)**.
- Devis SAP ≥ 100 € TTC par mois : mentions de l'arrêté du 17 mars 2015, art. 7 (lues le 5 nov. 2026 : § 3).

## 7. Aides du client et pièces que l'artisan fournit

- **Crédit d'impôt 50 %** : l'artisan fournit l'**attestation fiscale annuelle** (conseil : avant le 31 mars, aucune date légale, § 3).
- **Avance immédiate** : l'artisan inscrit le client et fait les demandes de paiement (§ 4).
- **CESU préfinancés** : acceptés par le prestataire déclaré ; la part payée ainsi figure sur l'attestation fiscale [5] **(à vérifier)**.
- Travaux de rénovation énergétique : voir les fiches des métiers concernés.

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

Aucun retour de multiservice n'est écrit dans le dépôt. Problèmes déduits des textes et de l'app :
- L'attestation fiscale annuelle se fait à la main en mars, client par client, en relisant les factures de l'année.
- Le plafond de 500 € par foyer pour le bricolage est vite atteint (quelques interventions) ; au-delà, le client n'a plus de crédit d'impôt et le découvre tard.
- Le mélange SAP / bâtiment fait perdre la condition d'activité exclusive sans que l'artisan le voie.
- L'avance immédiate fait payer au client la moitié seulement : argument commercial fort, mais demande une inscription et un flux de paiement que Mallettico n'a pas.
- L'app garde la déclaration SAP (Mes qualifications) sans l'imprimer ; elle ne connaît ni la durée d'intervention, ni l'intervenant, ni la notion de « prestation SAP » ; le modèle « nettoyage » existe mais pas de modèle homme toutes mains.

| Proposition | Priorité | Effort | Risque juridique |
|---|---|---|---|
| **Paramètres SAP** : n° et date de déclaration, mode (prestataire), imprimés sur les factures marquées « SAP » ; case par facture « prestation de services à la personne » avec la catégorie (bricolage, jardinage, autre) et la durée | Indispensable | S | Moyen : liste D7233-1 à relire au texte |
| **Attestation fiscale annuelle générée automatiquement** : en janvier, pour chaque client, somme des factures SAP **payées** dans l'année (pas émises), par un moyen de paiement admis seulement (pas les espèces, voir `commun.md` § 4), détail des interventions, n° SAP ; PDF figé et numéroté comme l'attestation de ramonage ; rappel « à remettre avant le 31 mars », présenté comme un conseil (aucune date fixée par C. trav. D7233-4, relu le 3 nov. 2026 : voir l. 45), et envoi par e-mail | Indispensable | M (réutilise PDF, numérotation, envoi) | Élevé : contenu de l'arrêté d'application non lu ; une attestation fausse expose l'artisan et le client à un redressement. À relire au texte avant de coder |
| **Compteur de plafonds par foyer** : cumul de l'année par client et par catégorie (500 € bricolage, 5 000 € jardinage), alerte non bloquante à l'approche et au dépassement, alerte si une intervention bricolage dépasse 2 h | Utile | S | Moyen : le foyer fiscal n'est pas le client (deux clients d'un même foyer) ; l'app ne peut qu'aider, jamais affirmer « éligible » |
| **Garde-fou électricité / plomberie / chauffage** : une ligne de ces catégories sur une facture SAP déclenche un avertissement (exclues du petit bricolage, et réservées aux qualifiés par L121-1) | Utile | S | Faible (avertissement) |
| Indicateur « part hors SAP du chiffre d'affaires » de l'année précédente (dispense micro-entrepreneur) | Plus tard | S | Moyen : seuil de 30 % non confirmé |
| **Avance immédiate** : inscription du client et demande de paiement via l'API Tiers de prestation de l'Urssaf | Plus tard | L | Élevé : habilitation de l'éditeur, données fiscales, paiement ; à remonter à Hugo (compte, convention, sécurité : `gardien-securite`) |
| Modèles de devis « petit bricolage » (forfait ≤ 2 h) et « entretien de jardin » | Utile | S | Faible |

## Sources

1. Fiscaloo, « Travaux de jardinage : crédit d'impôt et plafond 2026 » (D7231-1, D7233-5, 5 000 €, tableau des plafonds dont 500 € bricolage, 12 000 €) — https://www.fiscaloo.fr/14022-travaux-de-jardinage-reduction-dimpot/ — consulté le 03/11/2026 — (à vérifier)
2. Légifrance, code du travail, article D7231-1 (version citée) — https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018516725 — consulté le 03/11/2026 — [résumé] (version consolidée à relire)
3. Service-public, modèle d'attestation fiscale annuelle (avant le 31 mars N+1) — https://entreprendre.service-public.gouv.fr/vosdroits/R32522?profil=societe — consulté le 03/11/2026 — [résumé]
4. Code du travail numérique, article D7233-4 — https://code.travail.gouv.fr/code-du-travail/d7233-4 — consulté le 03/11/2026 — [résumé]
5. La Poste, attestation fiscale services à la personne (CESU préfinancés, mentions) — https://www.laposte.fr/senior/attestation-fiscale-services-a-la-personne-et-credit-d-impot — consulté le 03/11/2026 — (à vérifier)
6. INC, « Services à la personne : de nouvelles obligations d'information » (arrêté du 17 mars 2015, D7233-1) — https://www.inc-conso.fr/content/services-la-personne-de-nouvelles-obligations-dinformation — consulté le 03/11/2026 — [résumé]
7. Weblex, devis obligatoire services à la personne (art. 7 de l'arrêté) — https://www.weblex.fr/articles/services-a-la-personne-des-informations-precontractuelles-obligatoires — consulté le 03/11/2026 — (à vérifier)
8. Bpifrance Création, « Services à la personne — Réglementation » — https://bpifrance-creation.fr/activites-reglementees/services-a-personne — consulté le 03/11/2026 — [résumé]
9. Code du travail numérique, article L7232-1-1 — https://code.travail.gouv.fr/code-du-travail/l7232-1-1 — consulté le 03/11/2026 — [résumé]
10. Code du travail numérique, article D7233-1 — https://code.travail.gouv.fr/code-du-travail/d7233-1 — consulté le 03/11/2026 — [résumé]
11. Accès SAP, « Facture services à la personne » (n° et date de déclaration, mode, intervenant) ; D7233-2 (prix TTC) — https://www.acces-sap.com/actualites/professionnels/facture-services-a-la-personne/ — consulté le 03/11/2026 — (à vérifier)
12. DGE, fascicule « aménagement CAE micro-entrepreneurs et petites entreprises » (2026) — https://www.servicesalapersonne.gouv.fr/files/sap/files/documents/2026/fascicule-amenagement-CAE-micro-entrepreneurs-petites-entreprises.pdf — consulté le 03/11/2026 — [résumé] ; seuil de 30 % : https://lefreelance.fr/articles/services-a-la-personne-micro-entreprise/ — (à vérifier)
13. Sénat, amendement I-415 au PLF 2026 (petit bricolage, 2 heures) — https://www.senat.fr/enseance/2025-2026/138/Amdt_I-415.html — consulté le 03/11/2026 — (à vérifier : amendement, pas un texte en vigueur) ; Accès SAP, petit bricolage (500 €, exclusions) — https://www.acces-sap.com/particuliers/services-a-la-personne/travaux-petit-bricolage/ — (à vérifier)
14. Assemblée nationale, réponses ministérielles de la 14e législature sur la TVA des SAP (jardinage : entretien courant, hors travaux forestiers ; plafond 3 000 € → 5 000 € et taux 10 % en 2014) ; le moteur a résumé plusieurs réponses sans dire laquelle, par ex. — https://www.assemblee-nationale.fr/dyn/14/questions/QANR5L14QE27918.pdf — consulté le 03/11/2026 — (à vérifier : réponse exacte non identifiée)
15. Bpifrance Création, activités artisanales réglementées (C. artisanat L121-1, R121-1 et s.) — https://bpifrance-creation.fr/encyclopedie/trouver-proteger-tester-son-idee/definir-nature-son-activite/activites-artisanales-0 — consulté le 03/11/2026 — [résumé]
16. Legifiscal, « Avance immédiate du crédit d'impôt service à la personne » — https://www.legifiscal.fr/impots-taxes-entreprise/credits-reductions-impot/avance-immediate-credit-impot-service-personne.html — consulté le 03/11/2026 — [résumé]
17. Mon parcours handicap (gouv.fr), « Services à la personne : avance immédiate du crédit d'impôt » — https://www.monparcourshandicap.gouv.fr/actualite/services-la-personne-avance-immediate-du-credit-dimpot — consulté le 03/11/2026 — [résumé] ; API Tiers de prestation et Cesu+ : https://abby.fr/blog/tuto-urssaf-inscrire-un-client-particulier-avance-immediate-credit-impot/ — (à vérifier)
18. Legifiscal, « Taux de TVA des services à la personne » (279 i, 278-0 bis D) — https://www.legifiscal.fr/actualites-fiscales/412-taux-de-tva-des-services-la-personne.html — consulté le 03/11/2026 — [résumé]
19. Voir 14 (même lot de réponses ministérielles, 10 % au 1er janv. 2014) — (à vérifier)

## Relecture juriste-btp

Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- plafond et durée du petit bricolage (C. trav. D7233-5) ;
- contenu de la facture (D7233-1) et de l'attestation fiscale (D7233-4 et arrêté) avant de coder la génération automatique ;
- CGI 199 sexdecies après la loi de finances 2026 ;
- TVA d'une prestation SAP non déclarée ;
- avance immédiate : à remonter à Hugo (habilitation, compte).
