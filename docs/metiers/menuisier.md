# Menuisier (fenêtres, portes, volets, agencement) — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.32A (travaux de menuiserie bois et PVC), 43.32B (menuiserie métallique et serrurerie), 16.23Z (fabrication de charpentes et menuiseries, pour l'atelier), 43.32C (agencement de lieux de vente) — codes à vérifier sur insee.fr, non recherchés dans cette session.
**Variantes couvertes** : poseur de fenêtres et portes-fenêtres, portes d'entrée, volets et volets roulants, portes de garage, garde-corps ; menuisier d'agencement (cuisines, placards, dressings, escaliers).

Règles transverses (TVA, certification sur devis ou facture, décennale et attestation jointe, dépannage et arrêté de 2017, hors établissement, acompte sans plafond légal) : voir `commun.md` et `docs/metier-btp.md` §§ 2, 4, 5. Ci-dessous, seulement ce qui est propre au métier.

## 1. Assurances

- **Menuiseries extérieures (fenêtres, portes d'entrée, volets fixés au bâti)** : elles participent au clos et couvert ; les assureurs les classent dans les activités soumises à la décennale [3][4] (sources commerciales, **à vérifier**). La règle générale (C. assur. L241-1, attestation jointe) est dans `docs/metier-btp.md` § 2.
- **Agencement et mobilier (cuisines, placards, dressings)** : **pas de réponse nette**. Un courtier classe la pose de cuisine équipée en équipement dissociable (garantie biennale, hors décennale) et la fabrication en atelier en bien meuble [5] ; un autre site dit que tout poseur de cuisine doit avoir une décennale [6]. Un meuble posé sur l'existant relève, depuis Cass. 3e civ., 21 mars 2024, n° 22-18.694, en principe de la responsabilité de droit commun et non de la décennale (déjà noté dans `docs/metier-btp.md` § 2, **à relire au texte**). Conséquence pour l'app : ne jamais déduire « non soumis » du seul métier ; laisser l'artisan déclarer ses activités couvertes, comme aujourd'hui.
- **Garantie biennale (2 ans, C. civ. 1792-3)** : elle compte beaucoup pour un menuisier (prestations sur mesure, équipements qui fonctionnent : ouvrants, volets motorisés, portes de garage) [4]. Rien à imprimer de plus : voir `commun.md`.
- **Escaliers et garde-corps** : touchent à la sécurité des personnes ; la qualification décennale dépend de l'ouvrage (neuf ou sur existant) — **à vérifier** auprès de l'assureur, non recherché.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| Qualibat **3511** « Fourniture et pose de menuiseries extérieures », mention RGE « Fenêtres, volets, portes donnant sur l'extérieur » (variante PROB pour maison individuelle et petit collectif) | Qualibat | Non pour travailler ; oui pour que le client touche les aides | CEE (fiche BAR-EN-104), éco-PTZ ; MaPrimeRénov' par geste **plus pour les fenêtres seules depuis le 1er sept. 2026** (voir § 7) | [7] [résumé, certificats Qualibat] |
| Qualibat 3512 (menuiseries extérieures, autre technicité) | Qualibat | Non | Idem selon mention RGE | [8] (à vérifier) |
| Pose selon NF DTU 36.5 (mise en œuvre des fenêtres et portes extérieures) | AFNOR | Référence technique exigée par Qualibat pour 3511 et 3512 selon une note FFB de 2016 | Preuve des règles de l'art en cas de litige | [8] (à vérifier) |

L'app n'a qu'un champ RGE (n° + organisme). Pour un menuisier, ce qui compte pour l'aide est la **mention RGE** (le domaine de travaux), pas seulement le numéro.

## 3. Documents remis au client

- **Déclaration des performances (DoP) et marquage CE** : les fenêtres et portes extérieures piétonnes relèvent de la norme harmonisée EN 14351-1 ; le marquage CE y est obligatoire depuis le 1er juillet 2013 [9][10]. C'est le **fabricant** qui établit la DoP et appose le marquage CE (règlement (UE) n° 305/2011) ; une copie de la DoP est fournie « lors de la mise sur le marché », sur papier ou par voie électronique [11]. **Rien trouvé** sur une obligation propre au poseur de la remettre au client final (les obligations du distributeur, art. 14 du règlement, sont **à vérifier**). Quand le menuisier fabrique lui-même ses fenêtres, il est fabricant : DoP et marquage CE sont alors à sa charge (**à vérifier**).
- **Attestation de fin de travaux / données Uw et Sw** pour les aides : le dossier CEE justifie le nombre de fenêtres, leur surface totale et les Uw et Sw des équipements posés [12]. Ces valeurs viennent de la fiche du fabricant : à garder avec la facture.
- **Notice et livret d'entretien** des portes de garage motorisées et volets motorisés : fournis par les fabricants [13] ; aucune obligation légale de remise trouvée (**à vérifier**).
- Garanties 1/2/10 ans, PV de réception : voir `commun.md`.

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Entretien des **portes automatiques de garage** des bâtiments d'habitation, par **contrat écrit** | Au moins 2 visites par an selon une source (non officielle) | Propriétaire (souvent un syndic) | CCH, ex-L125-3 et R125-3-1 et s., recodifiés au 1er juil. 2021 ; arrêté du 12 nov. 1990 (opérations du contrat) ; vise les portes installées avant le 7 janv. 1992 selon un résumé | [13][14][15] (à vérifier : champ exact et périodicité) |
| Maintenance des portes et portails automatiques **sur les lieux de travail** | Semestrielle | Employeur | Arrêté du 21 déc. 1993 (C. trav.) | [16] [résumé] |
| Volets, fenêtres d'un particulier | Aucune obligation | — | — | Rien trouvé |

À retenir : pour un client professionnel (commerce, atelier) ou une copropriété, un **contrat d'entretien de porte automatique** est un vrai rappel périodique, comme le ramonage. Pour une maison individuelle, rien n'est obligatoire.

## 5. TVA propre au métier

- **5,5 % (CGI 278-0 bis A)** sur les parois vitrées **seulement si une fenêtre, fenêtre de toit ou porte-fenêtre existante est remplacée** (arrêté publié au JO du 24 déc. 2024, appliqué au 1er janv. 2025) [17][18]. La **création** d'une fenêtre n'y est plus depuis le 1er janv. 2025 [18][19].
  - Seuils cités par des sources professionnelles, **pas lus dans l'arrêté** : fenêtre Uw ≤ 1,3 et Sw ≥ 0,3 ou Uw ≤ 1,7 et Sw ≥ 0,36 ; vitrage de remplacement sur menuiserie existante Ug ≤ 1,1 ; double fenêtre Uw ≤ 1,8 et Sw ≥ 0,32 [17][20][21]. **À relire au texte avant de coder.**
  - Remplacer **du simple vitrage** : condition nette pour MaPrimeRénov' [1] ; pour le 5,5 %, une source le dit [21], une autre parle seulement de « fenêtre existante remplacée » [17]. **À vérifier** : le 5,5 % vaut-il aussi pour remplacer un vieux double vitrage ?
  - **RGE exigé pour le 5,5 % ?** Sources divergentes : non selon l'une [22], oui selon une autre [23]. Ne pas bloquer sur le RGE pour le taux tant que ce n'est pas tranché (Q à poser au juriste).
- **10 % (CGI 279-0 bis)** : pose de menuiseries hors critères (portes intérieures, placards intégrés, fenêtre sans gain énergétique) dans un logement achevé depuis plus de 2 ans.
- **Cuisine** : 10 % pour les meubles **fixés au bâti** (encastrés, plan de travail intégré) fournis et posés par le même professionnel dans un logement de plus de 2 ans ; **20 %** pour les meubles autonomes, l'électroménager, la fourniture achetée à part par le client (seule la pose est alors à 10 %), et tout logement de moins de 2 ans [24][25] (sources non officielles ; BOFiP BOI-TVA-LIQ-30-20-90 **à relire**). Une même facture peut donc porter **trois taux** (5,5 / 10 / 20).
- **Portes de garage motorisées, portails** : la motorisation est un équipement ; taux à vérifier (non recherché).
- Locaux professionnels, neuf : 20 % (voir `docs/metier-btp.md` § 4).

## 6. Mentions particulières sur le devis et la facture

- **Pour les aides et le 5,5 %** (sources secondaires, **à relire au texte**) : pour chaque fenêtre, type (fenêtre, porte-fenêtre, fenêtre de toit, double fenêtre), **dimensions ou surface**, **Uw** et **Sw** (ou Ug pour un vitrage seul), marque et référence, nombre ; mention que la fenêtre remplace une menuiserie existante (et en simple vitrage pour les aides) [1][12][20].
- **Taux par ligne** : une cuisine mêle 10 % et 20 % ; une rénovation mêle 5,5 % et 10 %. Le devis doit séparer fourniture et pose quand les taux diffèrent.
- **Délai de fabrication et de pose** : sur mesure, 4 à 10 semaines usuelles (pratique, non sourcée). Un délai ou une date d'exécution doit figurer dans l'information due au client particulier (C. conso. L111-1, à défaut 30 jours, L216-1 — **à vérifier au texte**, non recherché dans cette session).
- **Acompte à la commande** : courant pour lancer la fabrication ; aucun plafond légal ; mais hors établissement, aucun paiement avant 7 jours (voir `docs/metier-btp.md` § 5 et `commun.md`). Le menuisier qui signe chez le client ne peut donc pas encaisser l'acompte de fabrication le jour même.
- **Garde-corps** : hauteur minimale de 1 m (0,80 m si plus de 50 cm d'épaisseur) pour les balcons, terrasses et loggias hors rez-de-chaussée, ex-CCH R111-15 (renuméroté en 2021, **à vérifier**) ; la norme NF P01-012 (révisée le 22 nov. 2024) donne les dimensions, son caractère obligatoire est discuté (« préconisée, non d'application obligatoire » selon une présentation DREAL) [26][27][28]. Mention utile sur le devis : « garde-corps conforme à NF P01-012 » seulement si c'est vrai — affirmation vérifiable par l'artisan, jamais pré-cochée par l'app.

## 7. Aides du client et pièces que l'artisan fournit

- **MaPrimeRénov' par geste** : depuis le **1er sept. 2026** (décret n° 2026-822 du 25 août 2026, JO du 27 août), le remplacement de fenêtres fait seul **n'est plus aidé** ; le parcours par geste est recentré sur les pompes à chaleur [29][30][31]. Les dossiers déposés avant le 1er sept. 2026 gardent l'ancienne règle [29]. Les fenêtres restent finançables dans une **rénovation d'ampleur** (accompagnée), à vérifier. Avant : forfait par fenêtre remplaçant du simple vitrage (100 € pour les très modestes selon une source) [1].
- **CEE, fiche BAR-EN-104** (fenêtre ou porte-fenêtre complète avec vitrage isolant) : Uw ≤ 1,3 et Sw ≥ 0,3, ou Uw ≤ 1,7 et Sw ≥ 0,36 ; fenêtre de toit Uw ≤ 1,5 ; nouvelle version de la partie A applicable au 1er juil. 2026 (titre du document officiel, contenu non lu) ; fiche applicable aux opérations engagées avant le 1er juil. 2028 selon un calculateur [12][32][33]. Pièces : nombre de fenêtres, surface totale, Uw et Sw [12]. Professionnel RGE exigé.
- **Éco-PTZ** : reste ouvert aux fenêtres, avec les critères de MaPrimeRénov' (Uw/Sw), professionnel RGE [34] (sources non officielles, **à vérifier** : un site affirme que l'arrêté de sept. 2026 a recopié les critères dans l'éco-PTZ [35]).
- **TVA 5,5 %** : voir § 5 ; la certification du client se fait sur le devis ou la facture (voir `docs/metier-btp.md` § 4).

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

**Problèmes réels**
1. Un devis de 8 fenêtres : 8 lignes avec dimensions, sens d'ouverture, couleur, vitrage, Uw/Sw. Saisi au téléphone, c'est long et les erreurs de cote coûtent une fenêtre refaite.
2. Les aides ont changé deux fois en 2025-2026 (création exclue du 5,5 % ; fenêtres sorties de MaPrimeRénov' par geste en sept. 2026). Le client arrive avec une information périmée ; l'artisan promet une aide qui n'existe plus.
3. Mélange de taux sur un même chantier (fenêtres 5,5 %, porte intérieure 10 %, électroménager 20 %).
4. Acompte de fabrication : l'artisan veut encaisser à la commande, mais la règle des 7 jours hors établissement l'interdit.
5. Délai fournisseur qui glisse : le client relance, l'artisan n'a pas de trace de la date promise.
6. Le dossier CEE ou la banque (éco-PTZ) refuse faute de Uw/Sw ou de mention RGE sur la facture.

**Propositions**

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | **Ligne « menuiserie »** structurée : type, largeur × hauteur (surface calculée), nombre, Uw, Sw (ou Ug), marque/référence, « remplace une menuiserie existante » (oui/non, simple vitrage oui/non). Imprimée dans les deux générateurs. | M | Faible si l'app n'affirme rien : les valeurs sont celles saisies par l'artisan |
| Indispensable | **Aide au taux de TVA par ligne** : proposer 5,5 % seulement si « remplace existante » est coché et Uw/Sw saisis ; sinon 10 % ; 20 % pour l'électroménager et les meubles non fixés. Suggestion, jamais blocage, tant que les seuils ne sont pas relus au texte. | M | Moyen : un seuil faux = redressement chez l'artisan ; d'où « à relire au texte » |
| Indispensable | **Ne plus parler de MaPrimeRénov' par geste pour les fenêtres** dans les modèles de devis et textes d'aide (vérifier les 29 modèles, dont « rénovation énergétique »). | S | Élevé si on laisse une promesse d'aide fausse (pratique commerciale trompeuse) |
| Utile | **Acompte de fabrication** : sur un devis signé hors établissement, la facture d'acompte porte « Paiement au plus tôt le … » (déjà codé : `echeanceApresSeptJours`) — l'expliquer dans le parcours du menuisier. | S | Déjà relu (L221-10) |
| Utile | **Délai de fabrication et date de pose** affichés sur le devis, et rappel à l'artisan quand la date approche (relance fournisseur, prévenir le client). | S | Faible |
| Utile | **Photos avant pose** (état de l'existant, simple vitrage visible) rattachées au devis : preuve pour le 5,5 % et les CEE. | M | Faible |
| Utile | Choix de la **mention RGE** (domaine « fenêtres, volets, portes ») et pas seulement du n° RGE. | S | Faible |
| Plus tard | **Contrat d'entretien de porte automatique** (copropriétés, pros) avec rappel périodique, sur le modèle du ramonage. | M | Moyen : périodicité et champ à relire au texte (arrêté 1990 / 1993) |
| Plus tard | Joindre la **DoP** du fabricant (PDF) au dossier client. | S | Faible |

## Sources

1. MaPrimeRénov' fenêtre 2026 : conditions — https://www.laprimeenergie.fr/les-aides/ma-prime-renov/fenetre — consulté le 03/11/2026 — (à vérifier, site commercial)
2. Comment bénéficier de MaPrimeRénov' pour changer ses fenêtres — https://www.effy.fr/aide-energetique/ma-prime-renov/fenetres-parois-vitrees — consulté le 03/11/2026 — (à vérifier)
3. Garantie décennale menuisier — https://www.magnolia.fr/garantie-decennale/metiers/menuisier — consulté le 03/11/2026 — (à vérifier)
4. Assurance décennale menuisier — https://www.coover.fr/garantie-decennale/metiers/menuiserie — consulté le 03/11/2026 — (à vérifier)
5. Assurance décennale menuisier : pose et fabrication — https://www.france-epargne.fr/academy/assurance-decennale/assurance-decennale-menuisier — consulté le 03/11/2026 — (à vérifier)
6. Poseur de cuisine — https://www.portail-autoentrepreneur.fr/academie/fiches-metiers/artisanat/poseur-cuisine — consulté le 03/11/2026 — (à vérifier)
7. Certificat Qualibat RGE (exemple, 3511) — https://www.qualibat.com/pdf/get-certificate/dq_rge_786663 — consulté le 03/11/2026 — [résumé]
8. FFB, démarches qualité pour les menuiseries extérieures (note 2016) — https://www.batiweb.com/actualites/vie-pratique/quelles-demarches-qualite-pour-les-menuiseries-exterieures-la-ffb-lance-une-note-29588 — consulté le 03/11/2026 — (à vérifier)
9. Finstral, la norme produit européenne fenêtres et portes extérieures — https://www.finstral.com/files/content/1262486_53067_4_0/la-norme-produit-européenne.-fenêtres-et-porte-extérieures..pdf — consulté le 03/11/2026 — (à vérifier)
10. NSAI, Market Surveillance Campaign 2015, windows and doors — https://www.nsai.ie/images/uploads/certification-agrement/Information-Note-Windows-Doors-(FINAL4).pdf — consulté le 03/11/2026 — (à vérifier, source irlandaise)
11. Fiche règlement (UE) 305/2011, portail qualité Luxembourg — https://portail-qualite.public.lu/dam-assets/fr/securite-sante/surveillance-marche/fiches-produits/directive/p/Factsheet-UE-305-2011.pdf — consulté le 03/11/2026 — [résumé]
12. Fiche CEE BAR-EN-104 (calculateur ADEME) — https://calculateur-cee.ademe.fr/pdf/display/22/BAR-EN-104 — consulté le 03/11/2026 — [résumé]
13. Novoferm, livret d'entretien — https://www.novoferm.fr/fileadmin/novoferm_fr/Dateien/PHOTOS/Habitat/Documentations/NOVOFERM-LIVRET-ENTRETIEN.pdf — consulté le 03/11/2026 — (à vérifier)
14. Portes automatiques de garage, entretien (monimmeuble) — https://monimmeuble.com/?p=103891 — consulté le 03/11/2026 — (à vérifier)
15. CCH, section portes automatiques (version au 01/07/2021) — https://www.legifrance.gouv.fr/codes/id/LEGISCTA000043818868/2021-07-01 — consulté le 03/11/2026 — [résumé]
16. OPPBTP, arrêté du 21 déc. 1993, portes et portails automatiques sur les lieux de travail, art. 9 — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-9-de-l-arrete-du-21-decembre-1993-relatif-aux-portes-et-portails-automatiques-et-semi-automatiques-sur-les-lieux-de-travail.pdf — consulté le 03/11/2026 — [résumé]
17. CAPEB, modifications du taux de TVA à 5,5 % — https://www.capeb.fr/actualites/les-modifications-apportees-a-l-application-du-taux-de-tva-a-5-5 — consulté le 03/11/2026 — [résumé]
18. FFB, TVA à 5,5 % : nouvel arrêté fixant les prestations concernées — https://www.ffbatiment.fr/actualites-batiment/actualite/ffbeure-tva-5,-d-,5-2025 — consulté le 03/11/2026 — [résumé]
19. FFB, TVA à taux réduit et rénovation énergétique — https://www.ffbatiment.fr/gestion-entreprise/comptabilite-banque-assurances/fiscalite-impots/dossier/tva-taux-reduit-renovation-energetique — consulté le 03/11/2026 — [résumé]
20. CAPEB Centre-Val de Loire, fiche pratique TVA 5,5 % (déc. 2025) — https://www.capeb.fr/www/capeb/media//centrevaldeloire/document/fiche-pratique-tva-5.5-decembre-2025.pdf — consulté le 03/11/2026 — [résumé]
21. Selectra, travaux concernés par la TVA à 5,5 % — https://selectra.info/energie/renovation-energetique/aides/tva-taux-reduit/tva-5.5 — consulté le 03/11/2026 — (à vérifier)
22. Selectra (même page, sur le RGE) — https://selectra.info/energie/renovation-energetique/aides/tva-taux-reduit/tva-5-5 — consulté le 03/11/2026 — (à vérifier)
23. Copeps, TVA réduite pour le remplacement de fenêtres — https://copeps.fr/actualites/tva-remplacement-fenetre/ — consulté le 03/11/2026 — (à vérifier)
24. Copeps, TVA réduite à 10 % pour la pose de cuisine — https://copeps.fr/actualites/tva-reduite-pose-cuisine/ — consulté le 03/11/2026 — (à vérifier)
25. Copeps, TVA cuisine dans une maison neuve — https://copeps.fr/actualites/tva-cuisine-maison-neuve/ — consulté le 03/11/2026 — (à vérifier)
26. CETE Lyon / DDT Yonne, bilan des contrôles en Bourgogne 2010-2012 (garde-corps) — https://www.yonne.gouv.fr/index.php/contenu/telechargement/10034/60648/file/Diaporama%20sur%20le%20bilan%20des%20contr%C3%B4les%20en%20Bourgogne%20de%202010%20%C3%A0%202012_CETE%20LYON.pdf — consulté le 03/11/2026 — [résumé]
27. DREAL Occitanie, garde-corps et fenêtres basses — https://www.occitanie.developpement-durable.gouv.fr/IMG/pdf/502-_garde-corps_et_fenetres_basses.pdf — consulté le 03/11/2026 — [résumé]
28. AQC, fiche qualité réglementaire A01, hauteurs de protection des garde-corps — https://qualiteconstruction.com/wp-content/uploads/2024/05/Fiche-Qualite-Reglementaire-A01-Hauteurs-Protection-Garde-Corps-AQC.pdf — consulté le 03/11/2026 — [résumé]
29. CAPEB, MaPrimeRénov' au 1er sept. 2026 : la plupart des mono-gestes supprimés — https://www.capeb.fr/actualites/maprimerenov-au-1er-septembre-2026-la-plupart-des-mono-gestes-supprimes-le-demantelement-du-dispositif-continue — consulté le 03/11/2026 — [résumé]
30. Actu-Environnement, décret n° 2026-822 du 25/08/2026 — https://www.actu-environnement.com/ae/reglementation/decret-du-25-08-2026-2026-822-40231.php — consulté le 03/11/2026 — [résumé]
31. economie.gouv.fr, MaPrimeRénov' parcours par geste — https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-parcours-par-geste-la-prime-pour-la-renovation-energetique — consulté le 03/11/2026 — [résumé]
32. Ministère, fiche BAR-EN-104 vA54-2, partie A à compter du 01/07/2026 — https://www.ecologie.gouv.fr/sites/default/files/documents/BAR-EN-104%20vA54-2%20%C3%A0%20compter%20du%2001-01-2024%20-%20Partie%20A%20%C3%A0%20compter%20du%2001-07-2026.pdf — consulté le 03/11/2026 — [résumé, titre seulement]
33. Opéra Énergie, BAR-EN-104 — https://opera-energie.com/bar-en-104/ — consulté le 03/11/2026 — (à vérifier)
34. Hellowatt, éco-PTZ : conditions 2026 — https://www.hellowatt.fr/prime-energie/eco-ptz/conditions — consulté le 03/11/2026 — (à vérifier)
35. Selectra, l'éco-PTZ finance isolation, VMC, chauffe-eau sortis de MaPrimeRénov' en sept. 2026 — https://selectra.info/energie/actualites/renovation-energetique/eco-ptz-finance-isolation-vmc-chauffe-eau-sorties-maprimerenov-septembre-2026 — consulté le 03/11/2026 — (à vérifier)

## Relecture juriste-btp

Non faite. Questions à trancher avant tout code bloquant : seuils Uw/Sw/Ug de l'arrêté TVA du 4 déc. 2024 (ou du 24 déc.) ; RGE exigé ou non pour le 5,5 % ; remplacement d'un double vitrage au 5,5 % ; décennale de la pose de cuisine ; obligations du poseur sur la DoP (règl. 305/2011, art. 14) ; périodicité de l'entretien des portes de garage (arrêté du 12 nov. 1990, CCH recodifié).
