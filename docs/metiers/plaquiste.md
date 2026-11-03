# Plaquiste et plâtrier (avec isolation intérieure) — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.31Z (travaux de plâtrerie), 43.29A (travaux d'isolation) — à vérifier sur insee.fr, non recherchés dans cette session.
**Variantes couvertes** : cloisons et doublages en plaques de plâtre, faux plafonds, plâtre traditionnel et enduits, isolation des murs par l'intérieur (ITI), isolation des combles perdus et des rampants.

Règles transverses (TVA, certification sur devis ou facture, décennale et attestation jointe, autoliquidation en sous-traitance, dépannage, hors établissement) : voir `commun.md` et `docs/metier-btp.md` §§ 2, 4. Ci-dessous, seulement ce qui est propre au métier.

## 1. Assurances

- **Cloisons et doublages en plaques de plâtre** : la Cour de cassation a censuré une cour d'appel qui avait traité des cloisons en plaques de plâtre (et du carrelage collé) comme des « éléments d'équipement dissociables » ; un élément n'est un équipement que s'il est destiné à fonctionner [1][2] (arrêt non identifié par son numéro dans les résumés, **à retrouver sur Judilibre**). Une cloison est donc jugée comme un ouvrage ou une partie d'ouvrage, pas comme un équipement : elle peut relever de la décennale si le désordre rend l'ouvrage impropre à sa destination. En pratique, les assureurs classent la plâtrerie dans les activités soumises.
- **Faux plafonds** : un site de vulgarisation range les faux plafonds démontables parmi les revêtements amovibles (biennale) [3] (**à vérifier**, source non juridique). Un faux plafond qui tombe met en jeu la sécurité : ne jamais en déduire « non soumis ».
- **Sur l'existant** : depuis Cass. 3e civ., 21 mars 2024, n° 22-18.694, un élément d'équipement posé sur l'existant ne relève plus en principe de la décennale [4] (déjà dans `docs/metier-btp.md` § 2) ; cela ne vise pas les cloisons, qui ne sont pas des équipements (voir ci-dessus).
- **Isolation** : l'isolation thermique fait partie des activités décennales chez les assureurs ; un défaut d'isolation peut rendre un logement impropre à sa destination (jurisprudence non recherchée dans cette session, **à vérifier**).
- Conclusion pour l'app : la plâtrerie et l'isolation sont, par défaut, des activités soumises ; l'option « non soumis » des Paramètres ne doit pas être suggérée à ce métier.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| Qualibat **7122** « Isolation thermique par l'intérieur », mention RGE « Isolation par l'intérieur des murs ou rampants de toitures ou plafonds » (variante PROB) | Qualibat | Non pour travailler ; oui pour les aides | CEE (combles, rampants, murs), éco-PTZ ; MaPrimeRénov' seulement en rénovation d'ampleur (voir § 7) | [5] [résumé, certificats Qualibat] |
| Qualibat 7131 « Isolation thermique par l'extérieur » | Qualibat | Non | Idem pour l'ITE (hors métier du plaquiste) | [5] [résumé] |
| Combles perdus soufflés | Qualibat ou autre organisme RGE (mention propre) | Non | CEE BAR-EN-101 | Non recherché, **à vérifier** |
| Amiante : formation « sous-section 4 » pour intervenir sur des matériaux amiantés | Organisme de formation certifié | **Oui** dès qu'un salarié ou l'artisan intervient sur un matériau amianté | — | Non recherché, **à vérifier** (C. trav. R4412-94 et s.) |

## 3. Documents remis au client

- **Facture d'isolation pour les aides** : elle indique la **résistance thermique R atteinte** et la surface ; le devis aussi (R, surface traitée, pare-vapeur) [6][7] (sources non officielles ; **à relire** dans le guide Anah des devis et factures et dans la fiche CEE).
- **Fiche technique de l'isolant** (marque, référence, certification ACERMI le cas échéant) : demandée par les dossiers CEE (pratique courante, non sourcée ici, **à vérifier**).
- **Rapport de repérage amiante avant travaux (RAT)** : ce n'est **pas** l'artisan qui le fait ; c'est le donneur d'ordre (le client) qui le commande à un opérateur certifié, et l'artisan doit l'avoir avant de commencer (§ 6) [8][9].
- Garanties, PV de réception : voir `commun.md`.

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Aucune obligation périodique propre aux cloisons, plafonds ou à l'isolation | — | — | — | Rien trouvé |

Rien à rappeler périodiquement. Le rappel utile est ponctuel : fin de la garantie de parfait achèvement (1 an), pour une visite (voir `commun.md`).

## 5. TVA propre au métier

- **5,5 % (CGI 278-0 bis A)** : isolation thermique des murs, des combles et des rampants dans un logement achevé depuis plus de 2 ans, si l'isolant respecte les critères de l'arrêté (publié au JO du 24 déc. 2024, appliqué au 1er janv. 2025) [10][11]. Seuils cités par les sources pour l'ITI : **R ≥ 3,7 m².K/W** [12][13] ; combles perdus R ≥ 7, rampants R ≥ 6 [7] — ce sont les seuils de MaPrimeRénov' ; leur identité avec ceux du taux de TVA n'est **pas confirmée** (une source le signale) [13]. **À relire au texte avant de coder.**
- **Travaux induits** : la plaque de plâtre qui habille l'isolant (doublage collé, contre-cloison) suit en principe le taux de l'isolation comme travaux indissociables (BOFiP non lu, **à vérifier**). Les cloisons de distribution, les faux plafonds sans isolation, les enduits : **10 %** (CGI 279-0 bis) en rénovation de logement de plus de 2 ans.
- Neuf, agrandissement, locaux professionnels : 20 % (voir `docs/metier-btp.md` § 4).
- **Sous-traitance** (très fréquente pour ce métier, auprès d'une entreprise générale ou d'un maçon) : autoliquidation, pas de TVA facturée (voir `commun.md`).

## 6. Mentions particulières sur le devis et la facture

- **Isolation** : pour chaque poste, la paroi (mur, rampant, plafond, combles perdus), la **surface en m²**, l'isolant (marque, référence, épaisseur), la **résistance thermique R**, le pare-vapeur ou la membrane [6][7]. Ces éléments conditionnent le 5,5 % et les aides.
- **Règles de l'art** : NF DTU 25.41 « ouvrages en plaques de plâtre », édition de **février 2022** (remplace celle de déc. 2012 : cloisons jusqu'à 7 m, plaques BA18 et BA25, locaux EB+ collectifs) ; NF DTU 25.42 (complexes de doublage) reste à l'édition de déc. 2012 [14][15][16]. Citer le DTU sur le devis n'est pas obligatoire ; c'est une référence utile en cas de litige.
- **Amiante** : pour un bâtiment dont le permis de construire est antérieur au **1er janv. 1997**, le donneur d'ordre doit faire réaliser un **repérage avant travaux** (C. trav. R4412-97, décret n° 2019-251 ; arrêté du 16 juil. 2019 pour les immeubles bâtis) par un opérateur certifié « avec mention » ; des cas de dispense existent (R4412-97-3) ; si de l'amiante est trouvé, les travaux doivent être qualifiés et organisés en conséquence [8][9][17]. La dépose de vieux plâtres, d'enduits ou de faux plafonds anciens est typiquement concernée. Le client particulier est donneur d'ordre : l'obligation lui incombe, mais l'artisan qui démarre sans repérage s'expose lui aussi (**à vérifier** : sanctions et cas du particulier pour son propre logement).
- **Plomb** : la dépose de plâtres peints dans un logement d'avant 1949 peut exposer au plomb (voir `peintre.md`).
- **Déchets** : la dépose de plâtre produit des volumes importants ; mention des déchets obligatoire sur le devis (voir `docs/metier-btp.md` § 2).

## 7. Aides du client et pièces que l'artisan fournit

- **MaPrimeRénov' par geste** : l'isolation des murs (intérieur et extérieur) n'est **plus financée depuis le 1er janv. 2026** [12][18] ; l'isolation des combles et des rampants **en sort au 1er sept. 2026** (décret n° 2026-822 du 25 août 2026) [19][20][21]. Le parcours par geste ne finance plus que les pompes à chaleur (et le raccordement à un réseau de chaleur) [21][22]. L'isolation reste finançable dans une **rénovation d'ampleur** accompagnée [7]. Dossiers déposés avant le 1er sept. 2026 : anciennes règles [19].
- **CEE** : la fiche BAR-EN-101 (combles perdus, R ≥ 7) reste active selon les sources [23][24] ; montant variable selon l'obligé, la surface et la zone climatique (pas de montant officiel trouvé). Murs (BAR-EN-102) et rampants (BAR-EN-101 ou autre) : **à vérifier**.
- **Fin des offres « à 1 € »** : le Coup de pouce isolation a été fortement réduit au 1er juil. 2021 puis arrêté (date donnée : 30 juin 2022 ou 1er janv. 2022 selon les sources) [24][25][26]. Quelques offres très bas prix subsistent sur les combles perdus via les CEE, avec de nombreuses arnaques signalées [27]. Un artisan honnête doit pouvoir expliquer au client que « 1 € » n'est plus un dispositif public.
- **Éco-PTZ** : isolation finançable, professionnel RGE exigé [28] (**à vérifier**).
- Pour tout dossier : n° et mention RGE du domaine « isolation par l'intérieur », R, surface, devis signé **après** l'engagement de l'obligé CEE (« rôle actif et incitatif » — non vérifié dans cette session, recherche épuisée, **à vérifier**).

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

**Problèmes réels**
1. Le **métré** est le cœur du devis : surfaces de murs moins les ouvertures, plafonds, linéaires de bandes et de cornières, hauteur sous plafond. Fait à la main sur un carnet, recopié, avec des erreurs.
2. Le client a entendu parler d'« isolation à 1 € » ou de MaPrimeRénov' par geste : les deux n'existent plus pour ce métier ; l'artisan perd du temps ou fait une promesse fausse.
3. Les dossiers CEE sont rejetés pour une mention manquante (R, surface, référence de l'isolant) sur la facture.
4. Sous-traitant d'une entreprise générale : facture en autoliquidation, retenue de garantie, situations mensuelles ; oubli de la mention = TVA réclamée.
5. Dépose de plâtre ancien dans une maison de 1970 : personne ne parle d'amiante ; si on en trouve en cours de chantier, arrêt, surcoût, litige.
6. Chantiers longs (appartement complet) payés par **situations de travaux** : il faut suivre l'avancement poste par poste.

**Propositions**

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | **Métré par pièce** : longueur × hauteur moins ouvertures, plafond, total en m² qui alimente les lignes du devis ; réutilisable pour la facture. | M | Nul |
| Indispensable | **Ligne « isolation »** structurée : paroi, surface, isolant (marque, référence, épaisseur), **R**, pare-vapeur ; imprimée dans les deux générateurs ; rappel si R manque sur une ligne au 5,5 %. | M | Faible si c'est un rappel, pas un blocage ; seuils à relire au texte |
| Indispensable | Retirer toute mention de MaPrimeRénov' par geste pour l'isolation des modèles de devis « isolation » et « rénovation énergétique ». | S | Élevé si on laisse une promesse d'aide fausse |
| Utile | **Question amiante** à la création d'un devis de dépose sur un bâtiment d'avant 1997 : « Le client vous a-t-il remis un repérage amiante avant travaux ? » + mention sur le devis (repérage fourni / à fournir par le client). | S | Moyen : formulation à faire relire (ne pas affirmer « sans amiante ») |
| Utile | **Situations de travaux** par poste et pourcentage d'avancement, avec la mention d'autoliquidation pour un client donneur d'ordre (déjà dans l'app pour l'autoliquidation ; vérifier le lien avec les situations, tâche `tva-situation`). | M | Moyen (TVA) |
| Utile | **Photos avant / pendant / après** (isolant posé avant fermeture par la plaque) : la seule preuve de l'épaisseur une fois le doublage fermé. | M | Faible |
| Plus tard | Calcul indicatif des **quantités de matériaux** (plaques, rails, montants, bandes) depuis le métré. | M | Nul |

## Sources

1. ANIL, éléments d'équipement dissociables : condition de mise en œuvre de la garantie décennale — https://www.anil.org/jurisprudences-element-equipement-dissociable-mise-en-oeuvre-garantie-decennale/ — consulté le 03/11/2026 — [résumé]
2. CMS, application de la garantie décennale aux éléments d'équipement dissociables — https://cms.law/fr/fra/a-la-une/l-application-de-la-garantie-decennale-aux-elements-d-equipements-dissociables — consulté le 03/11/2026 — [résumé]
3. Swim Legal, garantie biennale et décennale — https://www.swim.legal/blog/garantie-biennale-et-decennale-definition-enjeux-entreprise — consulté le 03/11/2026 — (à vérifier)
4. BJDA, commentaire du revirement du 21 mars 2024 — https://bjda.fr/wp-content/uploads/2024/05/458po45I48O9P_AC_1.pdf — consulté le 03/11/2026 — [résumé]
5. Certificats Qualibat RGE (exemples, 7122 et 7131) — https://www.qualibat.com/pdf/get-certificate/dq_rge_786663 — consulté le 03/11/2026 — [résumé]
6. Hellio, MaPrimeRénov' isolation : conditions — https://particulier.hellio.com/blog/financement/ma-prime-renov-isolation — consulté le 03/11/2026 — (à vérifier)
7. Hellio, MaPrimeRénov' pour isoler les combles, guide 2026 — https://particulier.hellio.com/blog/financement/maprimerenov-isolation-combles — consulté le 03/11/2026 — (à vérifier)
8. DREETS Occitanie, courrier aux donneurs d'ordre sur le repérage avant travaux — https://occitanie.dreets.gouv.fr/sites/occitanie.dreets.gouv.fr/IMG/pdf/courrier_rat_donneurs_ordre_occitanie_internet.pdf — consulté le 03/11/2026 — [résumé]
9. DREETS Bretagne, présentation RAT aux maîtres d'ouvrage (sept. 2022) — https://bretagne.dreets.gouv.fr/sites/bretagne.dreets.gouv.fr/IMG/pdf/presentation_rat_moa_septembre_2022.pdf — consulté le 03/11/2026 — [résumé]
10. CAPEB, modifications du taux de TVA à 5,5 % — https://www.capeb.fr/actualites/les-modifications-apportees-a-l-application-du-taux-de-tva-a-5-5 — consulté le 03/11/2026 — [résumé]
11. FFB, TVA à 5,5 % : nouvel arrêté fixant les prestations concernées — https://www.ffbatiment.fr/actualites-batiment/actualite/ffbeure-tva-5,-d-,5-2025 — consulté le 03/11/2026 — [résumé]
12. Hellowatt, réforme MaPrimeRénov' : isolation des murs exclue en 2026 — https://www.hellowatt.fr/blog/reforme-maprimerenov-isolation-murs-exclue-2026/ — consulté le 03/11/2026 — (à vérifier)
13. Selectra, travaux concernés par la TVA à 5,5 % — https://selectra.info/energie/renovation-energetique/aides/tva-taux-reduit/tva-5.5 — consulté le 03/11/2026 — (à vérifier)
14. FFB, publication du nouveau NF DTU 25.41 — https://www.ffbatiment.fr/actualites-batiment/actualite/publication-nouveau-nf-dtu-25-41 — consulté le 03/11/2026 — [résumé]
15. AFNOR, NF DTU 25.41 P1-1 (février 2022) — https://www.boutique.afnor.org/fr-fr/norme/nf-dtu-2541/travaux-de-batiment-ouvrages-en-plaques-de-platre-partie-11-cahier-des-clauses-te/fa204809/321490 — consulté le 03/11/2026 — [résumé]
16. FFB, calepin NF DTU 25.41 et 25.42 illustrés — https://www.ffbatiment.fr/techniques-batiment/amenagement-finitions/platrerie-plafonds-planchers-techniques/calepin/ouvrages-plaques-platre-nf-dtu-25-41-25-42 — consulté le 03/11/2026 — [résumé]
17. OPPBTP, C. trav. art. R4412-97 (repérage amiante avant travaux) — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-r4412-97-du-code-du-travail-reperage-amiante-avant-travaux.pdf — consulté le 03/11/2026 — [résumé]
18. Hellowatt, fin de MaPrimeRénov' par geste : comment financer l'isolation — https://www.hellowatt.fr/blog/fin-MPR-geste-isolation/ — consulté le 03/11/2026 — (à vérifier)
19. CAPEB, MaPrimeRénov' au 1er sept. 2026 : la plupart des mono-gestes supprimés — https://www.capeb.fr/actualites/maprimerenov-au-1er-septembre-2026-la-plupart-des-mono-gestes-supprimes-le-demantelement-du-dispositif-continue — consulté le 03/11/2026 — [résumé]
20. Actu-Environnement, décret n° 2026-822 du 25/08/2026 — https://www.actu-environnement.com/ae/reglementation/decret-du-25-08-2026-2026-822-40231.php — consulté le 03/11/2026 — [résumé]
21. economie.gouv.fr, MaPrimeRénov' parcours par geste — https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-parcours-par-geste-la-prime-pour-la-renovation-energetique — consulté le 03/11/2026 — [résumé]
22. Anah, guide des aides financières, édition septembre 2026 — https://www.anah.gouv.fr/document/guide-des-aides-financieres-0226 — consulté le 03/11/2026 — [résumé]
23. Quelle Énergie, isolation des combles perdus à 1 € en 2026 — https://www.quelleenergie.fr/economies-energie/isolation-combles/programme-1-euro — consulté le 03/11/2026 — (à vérifier)
24. Choisir.com, prime Coup de pouce isolation : date de fin — https://www.choisir.com/energie/articles/117295/la-prime-coup-de-pouce-isolation — consulté le 03/11/2026 — (à vérifier)
25. Fournisseurs-electricite.com, « isolation à 1 € » n'existe plus depuis le 1er juillet 2021 — https://www.fournisseurs-electricite.com/renovation-energetique/aides/isolation-un-euro — consulté le 03/11/2026 — (à vérifier)
26. Hellio, la fin des primes Coup de pouce en 2026 — https://particulier.hellio.com/blog/actualites/fin-primes-coup-pouce — consulté le 03/11/2026 — (à vérifier)
27. Quelle Énergie, isolation à 1 € : toujours d'actualité en 2026 ? — https://www.quelleenergie.fr/economies-energie/isolation-thermique/1-euro — consulté le 03/11/2026 — (à vérifier)
28. Selectra, l'éco-PTZ finance isolation, VMC, chauffe-eau sortis de MaPrimeRénov' — https://selectra.info/energie/actualites/renovation-energetique/eco-ptz-finance-isolation-vmc-chauffe-eau-sorties-maprimerenov-septembre-2026 — consulté le 03/11/2026 — (à vérifier)

## Relecture juriste-btp

Non faite. Questions à trancher avant tout code bloquant : seuils R de l'arrêté TVA (identiques ou non à ceux de MaPrimeRénov') ; taux de la plaque de plâtre d'un doublage isolant ; référence de l'arrêt de cassation sur les cloisons en plaques de plâtre ; obligation de repérage amiante pour un particulier dans son propre logement et responsabilité de l'artisan qui démarre sans repérage ; mentions CEE exigées sur devis et facture (« rôle actif et incitatif »).
