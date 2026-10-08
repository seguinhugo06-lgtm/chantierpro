/* Contenu du Pilote : jalons, étapes d’Hugo, « plus tard », fiches, repères.
   Source versionnée ; la page se construit avec `npm run pilote:page`. Aucune tâche de code ici :
   le travail de Claude vit dans docs/feuille-de-route.md (affiché en lecture seule dans l’onglet Claude). */

const JALONS = [
 {
  "id": "j0",
  "titre": "J0 — Production saine",
  "pour": "mall",
  "auto": "attentes",
  "texte": "Le code livré attend votre main : trois failles de sécurité restent ouvertes en production tant que les migrations 073, 075 et 076 ne sont pas appliquées. Les examinateurs d’Apple et de Google testeront cette production.",
  "sortie": "toutes les actions préparées par Claude sont « vérifiées », preuve à l’appui."
 },
 {
  "id": "j1",
  "titre": "J1 — Décisions",
  "pour": "deux",
  "auto": "questions",
  "texte": "Structure, TVA des abonnements, comptes développeur : tout le reste en dépend. Une seule action physique, le rendez-vous comptable ; le reste, ce sont vos réponses aux questions de Claude.",
  "sortie": "les décisions sont prises et consignées dans le journal des décisions du projet."
 },
 {
  "id": "j2",
  "titre": "J2 — Électricien en règle",
  "pour": "elec",
  "texte": "Exister légalement, être assuré, être prêt à vendre.",
  "sortie": "votre SIRET et votre attestation décennale sont en main."
 },
 {
  "id": "j3",
  "titre": "J3 — Le cycle en vrai",
  "pour": "deux",
  "texte": "La recette se fait dès la production saine, sans attendre le SIRET : elle prouve que la chaîne devis → facture → relance tient avant le premier client.",
  "sortie": "un devis réel signé et une facture encaissée avec Mallettico."
 },
 {
  "id": "j4",
  "titre": "J4 — Testeurs",
  "pour": "mall",
  "texte": "Vous connaissez l’application : vous ne buterez jamais là où un nouveau bute.",
  "sortie": "cinq artisans extérieurs ont envoyé un vrai devis."
 },
 {
  "id": "j5",
  "titre": "J5 — Stores",
  "pour": "mall",
  "texte": "Votre part de la publication : poste, comptes, bêtas, soumission. Le travail de code (Capacitor, partage natif, notifications, fiches) est dans la feuille de route de Claude.",
  "sortie": "Mallettico se télécharge sur l’App Store et sur Google Play."
 },
 {
  "id": "j6",
  "titre": "J6 — Premier abonné payant",
  "pour": "mall",
  "texte": "Le seul signal de valeur qui compte. Le site encaisse déjà : ce jalon peut passer avant les stores.",
  "sortie": "un abonnement réel est actif, payé par un artisan hors du programme testeurs."
 }
];

const ETAPES = [
 {
  "id": "rdv-comptable",
  "jalon": "j1",
  "rang": 1,
  "qui": "vous",
  "effort": "10 min + rendez-vous",
  "titre": "Prendre rendez-vous avec un comptable",
  "action": "Réserver le rendez-vous cette semaine. Claude prépare une fiche d’une page avec les questions, les options et leurs conséquences.",
  "pourquoi": "Quatre décisions bloquent tout le reste et se calculent avec un comptable : la structure (une seule entreprise individuelle par personne), le régime de TVA de l’électricité, la TVA des abonnements Mallettico (irréversible dans Stripe après le premier abonné) et, par ricochet, le type de comptes développeur.",
  "comment": [
   "Choisir un comptable habitué aux artisans du bâtiment (votre Chambre de métiers peut en recommander).",
   "Demander à Claude la fiche du rendez-vous : structure, régime de TVA de l’électricité, TVA des abonnements, « système de caisse » (art. 286 du CGI) pour « marquer payée » et le paiement en ligne, versement libératoire, ACRE, et une éventuelle immatriculation au RCS pour l’édition de logiciel.",
   "Après le rendez-vous : répondre aux questions dans l’onglet Aujourd’hui. Claude consigne les décisions."
  ],
  "fait": "La date du rendez-vous est fixée.",
  "fiches": [
   {
    "titre": "Une seule entreprise individuelle par personne",
    "pourquoi": "Une personne ne peut détenir qu’une seule entreprise individuelle. Si vous exercez déjà Mallettico ou le studio web en nom propre, l’électricité deviendra une activité de plus sous le même SIREN : plafonds de micro-entreprise partagés, régime de TVA commun, et un seul patrimoine professionnel exposé à un sinistre de chantier.",
    "comment": [
     "Lister vos activités actuelles et le SIREN sous lequel chacune est déclarée.",
     "Poser trois questions au comptable : une entreprise individuelle multi-activités tient-elle mes plafonds ? une société (SASU, EURL) pour l’électricité ou pour Mallettico ? quel effet sur une revente future de Mallettico ?",
     "Trancher, et écrire la décision datée dans la note ci-dessous."
    ],
    "piege": "Mallettico et des chantiers dans la même entreprise individuelle : un sinistre décennal pèse sur le même patrimoine professionnel que votre logiciel. Et un logiciel se revend bien plus simplement depuis une société.",
    "liens": [
     [
      "Annuaire des entreprises",
      "https://annuaire-entreprises.data.gouv.fr"
     ]
    ]
   },
   {
    "titre": "La TVA des abonnements Mallettico",
    "pourquoi": "Aucune TVA n’est calculée sur les abonnements alors que tout affiche « HT ». Le réglage Stripe (tax_behavior) est figé à la création d’un prix : après le premier abonné, on ne corrige plus sans casser les abonnements. Si Mallettico et l’électricité partagent un SIREN, c’est la même décision que « franchise ou assujettissement ».",
    "comment": [
     "Trancher avec le comptable, en même temps que la structure.",
     "Puis régler Stripe en conséquence, avant tout premier abonné."
    ]
   }
  ]
 },
 {
  "id": "qualif",
  "jalon": "j2",
  "rang": 1,
  "qui": "vous",
  "effort": "1 h",
  "titre": "Prouver ma qualification d’électricien",
  "action": "Retrouver le diplôme ou rassembler trois ans de preuves d’expérience, puis le scanner.",
  "pourquoi": "L’électricité est une activité réglementée (code de l’artisanat, art. L121-1, 3° ; l’ancien art. 16 de la loi de 1996 est abrogé depuis le 1er juillet 2023). Pour l’exercer, il faut un CAP, un BEP, ou un diplôme ou titre de niveau égal ou supérieur enregistré au RNCP dans le métier, ou trois années d’expérience effective comme salarié, indépendant ou dirigeant (art. R121-1 et R121-3), ou exercer sous le contrôle effectif et permanent d’une personne qualifiée (art. L121-2). Exercer sans qualification : 7 500 € d’amende. Toutes les autres étapes en dépendent.",
  "comment": [
   "Retrouver votre diplôme (CAP ou BEP électricien, bac pro, BTS…) ou rassembler trois ans de preuves : certificats de travail, bulletins de paie, attestations d’employeur dans le métier.",
   "Le travail chez des proches ou sur vos propres chantiers ne compte pas : il faut une expérience professionnelle déclarée.",
   "Si vous n’avez ni l’un ni l’autre : CAP électricien en candidat libre, validation des acquis de l’expérience, ou exercer sous la qualification d’un associé ou d’un salarié qualifié.",
   "Scanner le justificatif : la Chambre de métiers et l’assureur le demanderont."
  ],
  "fait": "Le justificatif est scanné, et vous pourriez le présenter demain à un assureur.",
  "piege": "Un dossier d’immatriculation peut passer sans contrôle approfondi — mais en pratique l’assureur demandera ce justificatif, et un sinistre révélerait le défaut au pire moment.",
  "liens": [
   [
    "Électricien : conditions d’accès (service-public)",
    "https://entreprendre.service-public.gouv.fr/vosdroits/F38552"
   ],
   [
    "CMA — artisanat.fr",
    "https://www.artisanat.fr"
   ]
  ]
 },
 {
  "id": "decennale",
  "jalon": "j2",
  "rang": 2,
  "qui": "tiers",
  "effort": "2 h + délai des assureurs",
  "titre": "Souscrire la décennale et la RC Pro",
  "action": "Demander trois devis d’assurance décennale et RC pro, justificatif de qualification joint.",
  "pourquoi": "L’assurance décennale est obligatoire pour tout ouvrage de bâtiment (Code des assurances, art. L241-1) ; travailler sans : 6 mois d’emprisonnement et 75 000 € d’amende (art. L243-3). L’attestation est jointe à vos devis et factures (art. L243-2), et chaque devis et facture indique l’assurance, les coordonnées de l’assureur et la couverture géographique (code de l’artisanat, art. L132-1). Elle doit couvrir précisément les activités que vous exercerez : un sinistre sur une activité non déclarée n’est pas couvert. La fiche officielle de l’électricien cite aussi la RC pro.",
  "comment": [
   "Demander trois devis à des assureurs spécialisés dans les artisans du bâtiment, avec votre justificatif de qualification.",
   "Lister vos activités exactes : installation neuve, rénovation, dépannage, courants faibles, ventilation… et les bornes de recharge seulement si vous êtes qualifié IRVE.",
   "Vérifier le plafond de garantie, la franchise et la date d’effet : elle doit précéder votre premier chantier.",
   "Garder l’attestation PDF : ses références figurent sur vos devis et factures."
  ],
  "fait": "L’attestation est en main, et sa date d’effet précède votre premier chantier.",
  "piege": "Déclarer moins d’activités pour payer moins cher, c’est créer un trou de garantie exactement là où le sinistre arrivera.",
  "deps": [
   "qualif"
  ],
  "fiches": [
   {
    "titre": "Décider si je pose des bornes de recharge",
    "pourquoi": "Au-delà de 3,7 kW, la pose d’une borne de recharge est réservée aux installateurs qualifiés IRVE (décret n° 2017-26). Le Référentiel de Mallettico propose encore une borne sans le signaler (tâche de Claude « referentiel-depannage »).",
    "comment": [
     "Décider : je me qualifie (formation dédiée), je sous-traite, ou je décline ces chantiers.",
     "Aligner la liste d’activités de votre décennale sur cette décision."
    ],
    "liens": [
     [
      "Programme ADVENIR",
      "https://www.advenir.mobi"
     ]
    ]
   }
  ]
 },
 {
  "id": "tvaregime",
  "jalon": "j2",
  "rang": 3,
  "qui": "vous",
  "effort": "1 h",
  "titre": "Choisir : franchise de TVA ou assujettissement",
  "action": "Estimer vos achats de matériel de l’année, et faire chiffrer les deux régimes par le comptable.",
  "pourquoi": "La franchise en base dispense de facturer la TVA tant que votre chiffre d’affaires de l’année précédente ne dépasse pas 37 500 € de prestations de services (seuil majoré : 41 250 € en cours d’année). Le seuil unique à 25 000 € a été abandonné (loi du 3 novembre 2025) ; le BOFiP du 1er juillet 2026 applique ce seuil aux travaux immobiliers, sans seuil spécial pour le bâtiment. Si vous fournissez aussi le matériel, l’administration admet une activité mixte : 85 000 € au total, dont 37 500 € de services au plus. Mallettico, s’il est dans la même entreprise individuelle, compte dans les mêmes seuils. En franchise, vous ne récupérez pas la TVA payée sur le matériel — et l’obligation de logiciel de caisse sécurisé (art. 286 du CGI) ne vous concerne pas.",
  "comment": [
   "Estimer vos achats annuels de matériel et la part de clients particuliers ou professionnels.",
   "Faire chiffrer les deux options par votre comptable : la bonne réponse se calcule, elle ne se devine pas.",
   "En franchise, chaque devis et facture porte « TVA non applicable, art. 293 B du CGI » — Mallettico le gère déjà."
  ],
  "fait": "Le régime est choisi, et vous savez quelle mention TVA portent vos documents.",
  "piege": "La franchise paraît plus simple, mais en électricité elle peut coûter plus que la TVA qu’elle évite. Comparez avec vos vrais achats de matériel.",
  "deps": [
   "rdv-comptable"
  ],
  "liens": [
   [
    "BOFiP — franchise en base (1er juillet 2026)",
    "https://bofip.impots.gouv.fr/bofip/849-PGP.html/identifiant=BOI-TVA-DECLA-40-10-10-20260701"
   ]
  ]
 },
 {
  "id": "immat",
  "jalon": "j2",
  "rang": 4,
  "qui": "tiers",
  "effort": "1 h + 1 à 4 semaines",
  "titre": "M’immatriculer au guichet unique",
  "action": "Déposer la déclaration sur formalites.entreprises.gouv.fr, justificatif de qualification joint.",
  "pourquoi": "L’immatriculation vous donne votre SIRET et vous inscrit au Registre national des entreprises (RNE), seul registre depuis le 1er janvier 2023 : il n’y a plus de répertoire des métiers. Gratuite en micro-entreprise (45 € pour une entreprise individuelle artisanale hors micro). L’option pour le versement libératoire peut se prendre dans le même formulaire. Sans SIRET, pas de devis légal.",
  "comment": [
   "Déposer la déclaration sur formalites.entreprises.gouv.fr — le site officiel, gratuit pour une micro-entreprise.",
   "Déclarer l’activité précisément : travaux d’installation électrique, et ce que vous ferez réellement (dépannage, courants faibles, ventilation…).",
   "Joindre le justificatif de qualification.",
   "Suivre le dossier : l’étape passe « En attente » le temps du traitement."
  ],
  "fait": "Vous avez reçu votre numéro SIRET.",
  "piege": "Les sites qui « immatriculent pour vous » contre 80 à 200 € ne sont pas l’administration : la démarche officielle est gratuite.",
  "liens": [
   [
    "Guichet unique",
    "https://formalites.entreprises.gouv.fr"
   ]
  ],
  "deps": [
   "qualif",
   "rdv-comptable",
   "tvaregime"
  ]
 },
 {
  "id": "pa",
  "jalon": "j2",
  "rang": 5,
  "qui": "vous",
  "effort": "1 h",
  "titre": "Désigner ma Plateforme Agréée de facturation électronique",
  "action": "Choisir une plateforme dans la liste officielle d’impots.gouv.fr, puis vérifier votre inscription à l’annuaire.",
  "pourquoi": "Depuis le 1er septembre 2026, toute entreprise assujettie à la TVA — franchise en base comprise — doit pouvoir recevoir des factures électroniques : avoir choisi une Plateforme Agréée et être inscrite dans l’annuaire. Sans plateforme, l’administration vous met en demeure ; trois mois après : 500 € d’amende, puis 1 000 € par nouvelle période de trois mois. Pendant la phase de démarrage, pas de sanction automatique si vous montrez vos démarches : gardez les échanges avec la plateforme.",
  "comment": [
   "Choisir une plateforme dans la liste officielle publiée sur impots.gouv.fr — jamais depuis un lien reçu par mail.",
   "Comparer les prix : chaque plateforme fixe les siens.",
   "Préférer une plateforme qui propose aussi une API aux éditeurs de logiciels : Mallettico pourra s’y raccorder.",
   "Vérifier ensuite votre inscription dans l’annuaire, et activer l’authentification à deux facteurs."
  ],
  "fait": "Vous êtes inscrit dans l’annuaire, rattaché à une plateforme de la liste officielle.",
  "piege": "De faux mails DGFiP et de fausses plateformes circulent : voir l’étape « Reconnaître le vrai mail DGFiP des faux ».",
  "liens": [
   [
    "Liste officielle des plateformes agréées",
    "https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees"
   ]
  ],
  "deps": [
   "immat"
  ],
  "fiches": [
   {
    "titre": "Reconnaître le vrai mail DGFiP des faux",
    "pourquoi": "Les messages de la DGFiP se terminent toujours par @dgfip.finances.gouv.fr. L’administration ne demande jamais d’identifiant, de mot de passe, de RIB ni de paiement par mail, et la réforme ne coûte aucun frais d’inscription. En juin et juillet 2026, des données d’environ 250 000 entreprises ont été volées à la DGFiP : un faux mail peut connaître votre dossier.",
    "comment": [
     "Le vrai expéditeur se termine par @dgfip.finances.gouv.fr — cliquer sur le nom pour voir l’adresse réelle.",
     "La DGFiP ne demande jamais d’identifiant, de mot de passe, de RIB ni de paiement par mail.",
     "Aucun frais n’est dû à l’administration pour la réforme : toute demande de paiement est une arnaque.",
     "Ne jamais cliquer un lien reçu : aller soi-même sur impots.gouv.fr.",
     "Signaler les faux sur signal-spam.fr. En cas de doute : 0806 807 807, le numéro officiel."
    ],
    "liens": [
     [
      "DGFiP — FAQ vol de données (24 août 2026)",
      "https://www.impots.gouv.fr/sites/default/files/media/2_actu/2026-08_acces_illegitime_donnees/faq_acces_illegitime_donnes_fiscales_professionnels.pdf"
     ],
     [
      "Cybermalveillance.gouv.fr",
      "https://www.cybermalveillance.gouv.fr"
     ]
    ]
   },
   {
    "titre": "Sécuriser mon compte de plateforme",
    "pourquoi": "Un accès volé à une plateforme de facturation donne au fraudeur le contexte crédible pour détourner un paiement.",
    "comment": [
     "Activer l’authentification à deux facteurs.",
     "Un compte nominatif par personne, jamais partagé.",
     "Couper les accès d’un ancien prestataire le jour où il s’arrête."
    ]
   }
  ]
 },
 {
  "id": "banque",
  "jalon": "j2",
  "rang": 6,
  "qui": "vous",
  "effort": "1 h",
  "titre": "Ouvrir un compte bancaire dédié",
  "action": "Ouvrir un compte dédié à l’activité et reporter l’IBAN dans votre profil Mallettico.",
  "pourquoi": "Obligatoire en micro-entreprise dès que le chiffre d’affaires dépasse 10 000 € deux années de suite ; indispensable dès le départ pour séparer vos flux et rapprocher les paiements de vos factures.",
  "comment": [
   "Un compte dédié suffit en micro-entreprise : il n’a pas besoin d’être un compte « professionnel ».",
   "Le compte porte votre nom avec la mention « EI » ou « entrepreneur individuel ».",
   "Reporter l’IBAN dans votre profil Mallettico : il figurera sur vos factures.",
   "Activer l’authentification forte et les alertes de mouvements."
  ],
  "fait": "Votre IBAN dédié figure dans votre profil Mallettico.",
  "deps": [
   "immat"
  ]
 },
 {
  "id": "tarifs",
  "jalon": "j2",
  "rang": 7,
  "qui": "vous",
  "effort": "2 h",
  "titre": "Fixer taux horaire, déplacement et forfaits de dépannage",
  "action": "Calculer votre taux horaire à partir du revenu visé et de 1 100 à 1 300 heures facturables par an.",
  "pourquoi": "L’arrêté du 24 janvier 2017 impose, pour le dépannage, la réparation et l’entretien chez les particuliers, d’afficher vos taux horaires TTC, votre façon de décompter le temps, vos frais de déplacement, vos forfaits TTC et le caractère gratuit ou payant du devis, dans vos locaux et sur tout espace en ligne. Il impose aussi un devis détaillé AVANT toute intervention, quel que soit le montant : le seuil de 150 € de l’ancien arrêté de 1990 n’existe plus. Le devis indique que le client peut garder les pièces remplacées. Un taux mal calculé ne se rattrape pas : il se répète à chaque intervention.",
  "comment": [
   "Partir du revenu visé, ajouter charges sociales, assurances, véhicule, outillage, logiciels.",
   "Diviser par vos heures réellement facturables — souvent 1 100 à 1 300 par an, pas 1 600 : la route, les devis et les achats ne se facturent pas.",
   "Fixer des frais de déplacement par zone et un forfait diagnostic.",
   "Écrire la grille dans la note : elle deviendra vos articles Mallettico."
  ],
  "fait": "Une grille écrite : taux horaire, déplacement par zone, forfait diagnostic, majorations éventuelles.",
  "piege": "Copier le taux d’un concurrent installé depuis dix ans : ses charges, son volume et sa réputation ne sont pas les vôtres.",
  "liens": [
   [
    "Arrêté du 24 janvier 2017",
    "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000033935513"
   ]
  ]
 },
 {
  "id": "fournisseurs",
  "jalon": "j2",
  "rang": 8,
  "qui": "vous",
  "effort": "2 h",
  "titre": "Ouvrir mes comptes fournisseurs",
  "action": "Ouvrir deux comptes chez des distributeurs proches et demander vos remises par famille de produits.",
  "pourquoi": "Les distributeurs de matériel électrique accordent des remises professionnelles à l’ouverture d’un compte : c’est votre marge sur le matériel.",
  "comment": [
   "Ouvrir au moins deux comptes chez des distributeurs proches de votre zone d’intervention.",
   "Demander vos conditions de remise par famille de produits.",
   "Donner à chaque distributeur votre plateforme de réception : les grandes entreprises émettent déjà leurs factures en électronique.",
   "Enregistrer leurs coordonnées bancaires une fois, vérifiées par téléphone."
  ],
  "fait": "Deux comptes ouverts et vos remises connues.",
  "piege": "Fraude au faux IBAN : un mail « nos coordonnées bancaires changent » se vérifie toujours par téléphone, au numéro que vous aviez déjà.",
  "fiches": [
   {
    "titre": "Adopter ma règle anti-faux IBAN",
    "pourquoi": "Les fraudeurs utilisent la réforme de la facturation électronique comme prétexte pour annoncer un « changement de coordonnées bancaires ». Une règle simple évite la perte : un IBAN qui change se vérifie toujours par téléphone, au numéro que vous connaissiez déjà.",
    "comment": [
     "Tout changement d’IBAN d’un fournisseur se vérifie par téléphone, au numéro que vous aviez déjà — jamais celui du mail.",
     "Double vérification avant le premier paiement à un nouveau compte.",
     "Garder la liste des coordonnées déjà validées."
    ]
   }
  ]
 },
 {
  "id": "vitrine",
  "jalon": "j2",
  "rang": 9,
  "qui": "vous",
  "effort": "2 h",
  "titre": "Être trouvable : fiche Google, puis vitrine",
  "action": "Créer la fiche d’établissement Google avec zone d’intervention, horaires et photos de vrais chantiers.",
  "pourquoi": "En dépannage, le client cherche « électricien » et le nom de sa ville au moment de la panne. Au démarrage, une fiche d’établissement Google bien remplie vaut plus qu’un site.",
  "comment": [
   "Créer la fiche d’établissement Google : zone d’intervention, horaires, photos de vrais chantiers.",
   "Y publier votre grille de prix de dépannage et votre médiateur de la consommation.",
   "Demander un avis à chaque client satisfait — un vrai, jamais acheté.",
   "Plus tard, un site : avec les mentions légales (nom suivi de « EI », adresse, téléphone, SIREN, hébergeur)."
  ],
  "fait": "La fiche est publiée et apparaît sur une recherche « électricien » avec votre ville.",
  "liens": [
   [
    "Google Business Profile",
    "https://business.google.com"
   ]
  ]
 },
 {
  "id": "recette",
  "jalon": "j3",
  "rang": 1,
  "qui": "vous",
  "effort": "1 h",
  "titre": "Faire la recette du cycle complet avec un compte de test",
  "action": "Dès que les migrations sont appliquées : créer un compte de test et dérouler la liste, en vous envoyant les documents à vous-même.",
  "pourquoi": "Aucun usage réel n’a encore eu lieu. Une recette ne demande pas de SIRET : elle prouve la délivrabilité, la TVA réduite, la signature au téléphone, l’acompte et le solde, la relance et l’export avant qu’un vrai client ne tombe sur un défaut.",
  "comment": [
   "Envoyer un devis à une adresse Gmail ET à une adresse Outlook : arrive-t-il, hors des indésirables, lisible ?",
   "Un devis à 10 % : la mention de certification du client est-elle sur l’aperçu et le PDF ?",
   "Signer le devis seul, depuis un téléphone, comme le ferait le client.",
   "Facturer un acompte, puis le solde : les montants se répondent-ils ?",
   "Laisser une facture en retard : la relance part-elle, et la recevez-vous ?",
   "Exporter le mois et l’envoyer à votre comptable : peut-il s’en servir ?",
   "Chaque accroc : une note « Ça coince » dans l’onglet Aujourd’hui."
  ],
  "fait": "Les six points sont passés, ou chaque échec est noté pour Claude.",
  "fiches": [
   {
    "titre": "Vérifier un devis à 10 % de bout en bout",
    "pourquoi": "La mention TVA réduite doit apparaître partout où le client la lit : aperçu, PDF envoyé, facture finale.",
    "comment": [
     "Créer un devis de rénovation à 10 %.",
     "Vérifier la mention dans l’aperçu, puis dans le PDF reçu par mail.",
     "Transformer en facture et vérifier à nouveau."
    ]
   },
   {
    "titre": "Envoyer un devis à une adresse extérieure",
    "pourquoi": "Un devis qui arrive en indésirables n’a jamais été envoyé, quoi qu’affiche l’application. C’est la panne verte la plus fréquente du courrier.",
    "comment": [
     "Vous l’envoyer sur une adresse Gmail et sur une adresse Outlook.",
     "Vérifier : boîte de réception ou indésirables ? rendu du PDF sur téléphone ?",
     "Si indésirables : vérifier SPF, DKIM et DMARC du domaine chez Resend."
    ]
   },
   {
    "titre": "Faire signer un client sur son téléphone",
    "pourquoi": "La signature est le moment où le produit prouve sa valeur. La seule question qui compte : le client y arrive-t-il seul ?",
    "comment": [
     "Envoyer le lien de signature, sans expliquer.",
     "Observer, ou demander ensuite : qu’est-ce qui a été clair, qu’est-ce qui ne l’a pas été ?",
     "Vérifier le statut « Signé » dans Mallettico."
    ]
   },
   {
    "titre": "Facturer un acompte, puis le solde",
    "pourquoi": "Le chemin de l’échéancier est couvert par des tests automatiques ; il reste à le vivre sur un vrai chantier.",
    "comment": [
     "Facturer un acompte de 30 %.",
     "Facturer le solde : l’acompte doit apparaître en déduction.",
     "Comparer le total avec le devis signé."
    ]
   },
   {
    "titre": "Laisser une facture en retard et vérifier la relance",
    "pourquoi": "Le cron de relances est déjà resté huit jours en panne silencieuse. Seul un e-mail réellement reçu prouve qu’il marche.",
    "comment": [
     "Activer les relances automatiques sur une facture test envoyée à vous-même.",
     "Attendre l’échéance, et vérifier la réception du mail de relance."
    ]
   },
   {
    "titre": "Exporter le mois pour mon comptable",
    "pourquoi": "Si le comptable ressaisit tout, l’outil n’a pas tenu sa promesse.",
    "comment": [
     "Exporter le FEC ou le CSV du mois.",
     "Demander au comptable s’il l’importe sans retouche."
    ]
   }
  ]
 },
 {
  "id": "profilapp",
  "jalon": "j3",
  "rang": 2,
  "qui": "vous",
  "effort": "30 min",
  "titre": "Configurer Mallettico avec mes vraies informations",
  "action": "Créer votre compte réel et remplir identité, assurances et mention TVA jusqu’à ce que l’aperçu n’affiche plus aucune alerte.",
  "pourquoi": "Vos devis portent votre identité légale : SIRET, adresse, forme, assurances, régime de TVA. C’est aussi le premier vrai test de l’accueil de Mallettico — vécu par un nouvel artisan : vous.",
  "comment": [
   "Créer votre compte réel (pas la démo), depuis le téléphone de préférence.",
   "Remplir identité (votre nom suivi de « EI »), assureur et couverture géographique, médiateur, mention TVA, logo et couleur.",
   "Importer le référentiel électricité et y mettre vos prix.",
   "Ouvrir l’aperçu d’un devis : il ne doit plus afficher aucune alerte légale.",
   "Noter chaque hésitation pour Claude, même minime."
  ],
  "fait": "Un aperçu de devis sans aucune alerte légale, et vos hésitations notées pour Claude.",
  "deps": [
   "immat",
   "decennale",
   "tvaregime",
   "mediateur"
  ],
  "fiches": [
   {
    "titre": "Importer le référentiel électricité et y mettre mes prix",
    "pourquoi": "Le catalogue est la matière première de chaque devis. Le régler à vos prix, c’est éprouver l’import, l’édition et la recherche.",
    "comment": [
     "Importer le référentiel électricité depuis l’écran vide du Catalogue.",
     "Remplacer les prix par défaut par les vôtres, au moins sur vos vingt articles les plus fréquents.",
     "Noter ce qui manque ou ce qui ralentit."
    ]
   }
  ]
 },
 {
  "id": "premierdevis",
  "jalon": "j3",
  "rang": 3,
  "qui": "vous",
  "effort": "1 h",
  "titre": "Envoyer mon premier vrai devis avec Mallettico",
  "action": "Créer le prochain devis réel depuis le chantier, au téléphone, et l’envoyer depuis Mallettico.",
  "pourquoi": "Le moment où l’outil cesse d’être une démo. Accepté ou refusé, il vous apprend quelque chose — sur votre prix comme sur l’application.",
  "comment": [
   "Créer le devis depuis le chantier, au téléphone si possible.",
   "Vérifier l’aperçu, puis l’envoyer depuis Mallettico.",
   "Signé chez le client : lui laisser le formulaire de rétractation, ne rien encaisser avant 7 jours, et ne commencer dans les 14 jours que s’il le demande par écrit (sauf réparation urgente qu’il a demandée)."
  ],
  "fait": "Un devis réel envoyé au client depuis Mallettico.",
  "deps": [
   "profilapp",
   "tarifs",
   "hors-etab"
  ]
 },
 {
  "id": "premierefacture",
  "jalon": "j3",
  "rang": 4,
  "qui": "vous",
  "effort": "1 h",
  "titre": "Facturer et encaisser mon premier chantier",
  "action": "Transformer le devis signé en facture, encaisser par virement, marquer la facture payée.",
  "pourquoi": "Boucler la chaîne de l’argent dans l’outil : facture, paiement, rapprochement.",
  "comment": [
   "Transformer le devis signé en facture (avec acompte si prévu).",
   "Remettre la facture dès la fin de l’intervention, avant le paiement (arrêté du 24 janvier 2017, art. 5).",
   "Devis signé chez le client : aucun acompte avant le 8e jour, sauf réparation urgente qu’il a demandée.",
   "Encaisser par virement ou chèque, et marquer la facture payée.",
   "Ne pas proposer le paiement en ligne au client tant que la question qui le concerne n’est pas tranchée."
  ],
  "fait": "Le paiement est sur votre compte, et la facture est marquée payée dans Mallettico.",
  "deps": [
   "premierdevis"
  ]
 },
 {
  "id": "t-mobile",
  "jalon": "j3",
  "rang": 5,
  "qui": "vous",
  "effort": "une journée",
  "titre": "Une journée entière au téléphone seul",
  "action": "Choisir une journée de chantier et ne pas ouvrir l’ordinateur.",
  "pourquoi": "L’artisan vit sur son téléphone, dans la camionnette. Chaque fois que vous devez ouvrir l’ordinateur, c’est une friction à noter.",
  "comment": [
   "Une journée de travail sans ouvrir l’ordinateur.",
   "Noter chaque moment où il vous manque."
  ],
  "fait": "Une journée complète, et la liste de ce qui a forcé l’ordinateur.",
  "deps": [
   "premierdevis"
  ]
 },
 {
  "id": "liste-testeurs",
  "jalon": "j4",
  "rang": 1,
  "qui": "vous",
  "effort": "30 min",
  "titre": "Dresser la liste nominative des testeurs",
  "action": "Écrire 14 noms d’artisans de l’entourage, avec leur adresse e-mail et leur téléphone (Android ou iPhone).",
  "pourquoi": "C’est le délai le plus long de la publication : avec un compte Google personnel, il faut 12 testeurs inscrits sans interruption pendant 14 jours. Commencer la liste maintenant ne coûte rien et évite d’attendre plus tard.",
  "comment": [
   "Viser 14 noms pour absorber les désistements.",
   "Noter qui a un téléphone Android : ce sont eux qui comptent pour le test fermé Google.",
   "Garder la liste dans vos notes de cette étape."
  ],
  "fait": "14 noms avec e-mail et type de téléphone."
 },
 {
  "id": "restauration",
  "jalon": "j4",
  "rang": 2,
  "qui": "vous",
  "effort": "4 h",
  "titre": "Restaurer une sauvegarde, une fois",
  "action": "Vérifier la politique de sauvegarde dans Supabase, puis restaurer vers un projet neuf et y ouvrir un devis.",
  "pourquoi": "Une sauvegarde jamais restaurée n’est pas une sauvegarde, c’est une hypothèse. Et le jour où vos propres factures d’électricien sont dans la base, c’est votre comptabilité qui en dépend.",
  "comment": [
   "Vérifier d’abord l’offre Supabase du projet : selon l’offre, il peut n’y avoir aucune sauvegarde restaurable.",
   "Vérifier la politique de sauvegarde : Supabase → Settings → Database → Backups.",
   "Restaurer vers un projet neuf, y pointer une copie locale, se connecter, ouvrir un devis."
  ],
  "fait": "Vous avez ouvert un devis dans une base restaurée."
 },
 {
  "id": "testeurs",
  "jalon": "j4",
  "rang": 3,
  "qui": "vous",
  "effort": "2 semaines",
  "titre": "Faire tester trois à cinq artisans qui ne sont pas vous",
  "action": "Inviter les artisans de la liste avec le discours préparé, et installer l’app avec chacun.",
  "pourquoi": "Vous connaissez l’application : vous ne buterez jamais là où un nouveau bute. Votre usage éprouve la chaîne de l’argent, pas l’accueil. Le discours oral et le message sont rédigés dans « Documents/Mallettico/Prochaine session — préparation.md » : un an offert contre un vrai devis envoyé dans le mois et des retours francs. Si vous publiez sur Android avec un compte personnel, ces mêmes testeurs font le test fermé de 14 jours.",
  "comment": [
   "Relire et adapter le discours à votre voix.",
   "Viser au moins 14 artisans sur Android si le test fermé Google est nécessaire.",
   "Installer l’app avec chacun : une demi-heure, entreprise et dix articles.",
   "Les regarder s’inscrire sans les aider : chaque question posée à voix haute est un défaut.",
   "Leurs retours arrivent dans l’app (« Un bug ? Une idée ? ») : Claude les lit."
  ],
  "fait": "Au moins cinq artisans extérieurs ont envoyé un vrai devis avec Mallettico.",
  "deps": [
   "recette",
   "liste-testeurs"
  ]
 },
 {
  "id": "st-outils",
  "jalon": "j5",
  "rang": 1,
  "qui": "tiers",
  "effort": "une demi-journée, surtout du téléchargement",
  "titre": "Mettre macOS à jour, puis installer Xcode et Android Studio",
  "action": "Sauvegarde Time Machine, puis mise à jour de macOS (Réglages → Mise à jour de logiciels) : à lancer cette semaine, c’est long et passif.",
  "pourquoi": "Votre Mac est en macOS 15.1.1. Capacitor 8 exige Xcode 26 au minimum, et Apple refuse depuis le 28 avril 2026 tout build fait avec une version plus ancienne. Or Xcode 26 demande au moins macOS 15.6, et le Xcode proposé aujourd’hui sur l’App Store (Xcode 27) demande macOS Tahoe 26.6. Sans mise à jour du système, Xcode ne s’installe pas.",
  "comment": [
   "Faire une sauvegarde Time Machine.",
   "Réglages → Mise à jour de logiciels → macOS Tahoe 26.6 ou plus récent.",
   "Installer Xcode depuis l’App Store, l’ouvrir, accepter la licence, installer un simulateur iOS.",
   "Dans un terminal : sudo xcode-select -s /Applications/Xcode.app/Contents/Developer",
   "Installer Android Studio 2025.2.1 ou plus récent, puis un émulateur Android 16 (API 36)."
  ],
  "fait": "xcodebuild -version affiche 26 ou plus ; un simulateur iPhone et un émulateur Android démarrent."
 },
 {
  "id": "comptes-dev",
  "jalon": "j5",
  "rang": 2,
  "qui": "vous",
  "effort": "1 h + délais",
  "titre": "Créer les comptes développeur Apple et Google",
  "action": "Après votre réponse à la question « type de comptes développeur » : créer les deux comptes et payer les frais.",
  "pourquoi": "Apple : en entreprise individuelle, le compte est forcément individuel et votre nom légal s’affiche comme vendeur ; une app peut être transférée plus tard vers un compte société, avec ses avis. Google : un compte personnel impose un test fermé (12 testeurs, 14 jours) et une vérification sur un téléphone Android ; un compte organisation (D-U-N-S) en est dispensé. Dans les deux cas, des coordonnées sont publiées (statut de commerçant).",
  "comment": [
   "Répondre d’abord à la question « Quels comptes développeur ouvrir ? ».",
   "Apple : en entreprise individuelle, compte individuel (99 USD par an) — possible dès maintenant.",
   "Google (25 USD une fois) : avec un SIREN, chercher ou demander un D-U-N-S (gratuit, jusqu’à 5 jours ouvrés) et tenter le compte organisation ; sinon compte personnel, vérifié sur un téléphone Android.",
   "C’est vous qui saisissez vos informations et payez."
  ],
  "fait": "Les deux comptes développeur sont actifs."
 },
 {
  "id": "cles-push",
  "jalon": "j5",
  "rang": 3,
  "qui": "vous",
  "effort": "30 min",
  "titre": "Créer les clés de notification (Apple et Firebase)",
  "action": "Dans le compte Apple, créer une clé de notifications (APNs) ; dans Firebase, créer le projet Android. Claude vous guide pas à pas.",
  "pourquoi": "Les notifications (devis signé, paiement reçu) sont une des fonctions natives qui distinguent l’app d’un site emballé aux yeux d’Apple. Elles exigent des clés que seul le titulaire des comptes peut créer.",
  "comment": [
   "Demander à Claude le guide pas à pas au moment de le faire.",
   "Ne jamais coller une clé dans le Pilote ni dans la conversation : elle se dépose directement là où Claude vous l’indique."
  ],
  "fait": "Les deux clés existent et sont déposées au bon endroit.",
  "deps": [
   "comptes-dev"
  ]
 },
 {
  "id": "st-testflight",
  "jalon": "j5",
  "rang": 4,
  "qui": "tiers",
  "effort": "1 h + examen de la bêta",
  "titre": "Bêta iOS avec TestFlight",
  "action": "Signer et envoyer la compilation préparée par Claude depuis Xcode, puis inviter les testeurs iPhone.",
  "pourquoi": "TestFlight permet de faire tester l’app iPhone avant la publication, à des testeurs invités par e-mail.",
  "comment": [
   "Commencer par le test interne (membres de votre équipe App Store Connect) : il ne passe pas d’examen.",
   "Claude prépare la compilation ; c’est vous qui signez avec votre compte Apple dans Xcode et l’envoyez.",
   "Puis inviter les testeurs iPhone (le premier build externe passe un examen complet).",
   "TestFlight ne demande pas le statut de commerçant : la bêta peut démarrer avant l’immatriculation."
  ],
  "fait": "Au moins trois testeurs ont installé la bêta et l’ont ouverte.",
  "deps": [
   "st-outils",
   "comptes-dev"
  ]
 },
 {
  "id": "st-testferme",
  "jalon": "j5",
  "rang": 5,
  "qui": "tiers",
  "effort": "14 jours minimum",
  "titre": "Test fermé Android : 12 testeurs pendant 14 jours",
  "action": "Inscrire au moins 14 testeurs Android au test fermé et vérifier chaque semaine qu’ils l’utilisent.",
  "pourquoi": "Obligatoire pour un compte Google personnel créé après le 13 novembre 2023 : au moins 12 testeurs inscrits sans interruption pendant au moins 14 jours ; un testeur qui se désinscrit avant ne compte pas. Ensuite, la demande d’accès à la production pose des questions sur l’usage réel par les testeurs ; elle est examinée en général en sept jours ou moins, puis vient l’examen de la version publique. Sans objet avec un compte organisation.",
  "comment": [
   "Avant de lancer : section « Sécurité des données » remplie (brouillon préparé par Claude) et compte vérifié (pièce d’identité, téléphone Android).",
   "Inscrire au moins 14 testeurs (marge pour les désistements) : un compte Google et un téléphone Android suffisent, ils n’ont pas besoin d’être artisans.",
   "Mettre en test fermé dès qu’une version tient debout : les améliorations arrivent par des mises à jour pendant le test.",
   "Ne demander l’accès à la production qu’après 14 jours pleins."
  ],
  "fait": "12 testeurs inscrits depuis 14 jours consécutifs, et l’accès production demandé.",
  "liens": [
   [
    "Règle Google des 12 testeurs",
    "https://support.google.com/googleplay/android-developer/answer/14151465?hl=fr"
   ]
  ],
  "deps": [
   "st-outils",
   "comptes-dev",
   "liste-testeurs",
   "st-android-tel"
  ]
 },
 {
  "id": "st-soumission",
  "jalon": "j5",
  "rang": 6,
  "qui": "tiers",
  "effort": "1 à 7 jours d’examen",
  "titre": "Soumettre aux deux stores et répondre aux examinateurs",
  "action": "Soumettre depuis les deux consoles avec les notes d’examen et le compte de démonstration préparés par Claude.",
  "pourquoi": "Apple examine 50 % des soumissions en moins de 24 h et 90 % en moins de 48 h ; chez Google, de quelques heures à 7 jours, parfois plus. Prévoir au moins un refus et une resoumission : un refus n’est pas un échec, on corrige et on resoumet avec la liste des changements.",
  "comment": [
   "C’est vous qui soumettez depuis les consoles ; Claude prépare les notes d’examen (en français et en anglais) et un compte de démonstration réaliste.",
   "Remplir les formulaires de confidentialité avec les brouillons préparés par Claude.",
   "En cas de refus, copier le message à Claude : il propose la correction et la réponse."
  ],
  "fait": "Mallettico est téléchargeable sur l’App Store et sur Google Play.",
  "deps": [
   "st-testflight",
   "st-testferme",
   "dsa"
  ]
 },
 {
  "id": "stripelive",
  "jalon": "j6",
  "rang": 1,
  "qui": "vous",
  "effort": "30 min guidées",
  "titre": "Passer Stripe en mode réel",
  "action": "Avec Claude à côté : activer le compte Stripe réel, puis remplacer ENSEMBLE la clé secrète et le secret du webhook.",
  "pourquoi": "Aujourd’hui Stripe est en mode test : aucun abonnement ne peut être payé. La clé et le secret du webhook doivent changer ensemble, sinon les paiements passent mais l’app ne le sait pas. La règle de TVA des abonnements doit être décidée avant (irréversible après le premier abonné).",
  "comment": [
   "Répondre d’abord à la question sur la TVA des abonnements.",
   "Activer le compte Stripe réel (identité, IBAN) : c’est vous qui saisissez.",
   "Créer les prix réels selon la règle de TVA décidée.",
   "Remplacer la clé secrète et le secret du webhook ensemble, là où Claude l’indique : jamais dans le Pilote ni dans la conversation.",
   "Claude vérifie ensuite qu’un paiement réel arrive bien jusqu’à l’app."
  ],
  "fait": "Un paiement réel de test (que vous remboursez) apparaît comme abonnement actif dans l’app.",
  "deps": [
   "rdv-comptable"
  ]
 },
 {
  "id": "premierpayant",
  "jalon": "j6",
  "rang": 2,
  "qui": "vous",
  "effort": "continu",
  "titre": "Trouver le premier artisan qui paie",
  "action": "Proposer Mallettico à trois artisans hors de l’entourage proche, au tarif fondateur.",
  "pourquoi": "Les testeurs ont un an offert : sans abonné payant, le premier euro arriverait au mieux en octobre 2027. Un artisan qui paie est la seule preuve que l’outil vaut son prix.",
  "comment": [
   "Commencer par les artisans croisés sur vos chantiers (plaquistes, plombiers, maçons).",
   "Montrer le cycle en 5 minutes sur votre téléphone : un devis, sa signature, la relance.",
   "Noter chaque objection pour Claude : c’est la meilleure matière produit."
  ],
  "fait": "Un abonnement réel est actif.",
  "deps": [
   "stripelive"
  ]
 },
 {
  "id": "risques-elec",
  "jalon": "j2",
  "rang": 1.5,
  "qui": "tiers",
  "effort": "formation de quelques jours",
  "titre": "Me former à la prévention des risques électriques",
  "action": "Choisir un organisme et réserver une formation adaptée à vos opérations (travaux, dépannage, consignation).",
  "pourquoi": "Un travailleur indépendant ne s’habilite pas lui-même, mais depuis le 19 décembre 2024, quand il intervient sur un chantier de bâtiment, il doit justifier d’une formation à la prévention des risques électriques adaptée à son activité (Code du travail, art. R4535-12-1). Le périmètre exact (dépannage chez un particulier compris ou non) reste à vérifier : par prudence, se former avant le premier chantier.",
  "comment": [
   "Choisir une formation adaptée à vos opérations.",
   "Garder l’attestation avec votre justificatif de qualification : l’assureur et les donneurs d’ordre peuvent la demander."
  ],
  "fait": "L’attestation de formation est scannée.",
  "liens": [
   [
    "OPPBTP — formation des indépendants",
    "https://www.preventionbtp.fr/ressources/questions/les-travailleurs-independants-doivent-ils-suivre-une-formation-a-la-prevention-des-risques-electriques_hMncPCc6t3mLMQTn3HYxXK"
   ]
  ]
 },
 {
  "id": "demarrage-admin",
  "jalon": "j2",
  "rang": 4.5,
  "qui": "vous",
  "effort": "1 h 30",
  "deps": [
   "immat"
  ],
  "titre": "Après l’immatriculation : ACRE, versement libératoire, impots.gouv, CFE",
  "action": "Le jour où le SIRET arrive : noter les quatre échéances dans votre agenda et déposer la demande d’ACRE si vous y avez droit.",
  "pourquoi": "Plusieurs démarches ont un délai qui court dès la création. L’ACRE se demande au plus tard le 60e jour après le début d’activité (exonération de 25 % pour une micro-entreprise créée depuis le 1er juillet 2026). L’option pour le versement libératoire se prend au plus tard le dernier jour du 3e mois. La CFE n’est pas due l’année de création, mais la déclaration 1447-C-SD est à déposer avant le 31 décembre 2026. Le chiffre d’affaires se déclare chaque mois ou chaque trimestre à l’Urssaf. Ces options se calculent avec le comptable.",
  "comment": [
   "Vérifier votre droit à l’ACRE et, si oui, la demander sur autoentrepreneur.urssaf.fr avant le 60e jour.",
   "Décider du versement libératoire avec le comptable, avant la fin du 3e mois.",
   "Créer votre espace professionnel sur impots.gouv.fr.",
   "Déposer la 1447-C-SD avant le 31 décembre 2026.",
   "Noter les échéances de déclaration du chiffre d’affaires."
  ],
  "fait": "Les quatre dates sont dans votre agenda, et les démarches à délai court sont faites.",
  "liens": [
   [
    "ACRE : du changement (service-public)",
    "https://entreprendre.service-public.gouv.fr/actualites/A18795"
   ],
   [
    "CFE du micro-entrepreneur",
    "https://entreprendre.service-public.gouv.fr/vosdroits/F23999"
   ]
  ]
 },
 {
  "id": "mediateur",
  "jalon": "j2",
  "rang": 5.5,
  "qui": "tiers",
  "effort": "1 h + délai d’adhésion",
  "deps": [
   "immat"
  ],
  "titre": "Adhérer à un médiateur de la consommation",
  "action": "Choisir un médiateur compétent pour le bâtiment dans la liste officielle, et adhérer.",
  "pourquoi": "Dès que vous travaillez pour des particuliers, vous devez adhérer à un médiateur de la consommation et donner ses coordonnées à vos clients : sur vos devis, vos conditions de vente et votre site (Code de la consommation, art. L612-1). Sans médiateur : jusqu’à 3 000 € d’amende administrative pour une entreprise individuelle. Le recours au médiateur est gratuit pour le client.",
  "comment": [
   "Choisir dans la liste officielle (economie.gouv.fr › médiation de la consommation) — jamais depuis un démarchage.",
   "Adhérer et garder l’attestation.",
   "Renseigner son nom et son site dans votre profil Mallettico : ils s’impriment sur vos devis."
  ],
  "fait": "L’adhésion est signée, et le nom du médiateur apparaît sur l’aperçu d’un devis.",
  "liens": [
   [
    "Liste des médiateurs référencés",
    "https://www.economie.gouv.fr/mediation-conso/liste-des-mediateurs-references"
   ]
  ]
 },
 {
  "id": "hors-etab",
  "jalon": "j2",
  "rang": 7.5,
  "qui": "vous",
  "effort": "1 h",
  "titre": "Connaître la règle du devis signé chez le client",
  "action": "Lire la fiche et préparer le formulaire de rétractation à laisser au client.",
  "pourquoi": "Un devis signé chez le client est un contrat « hors établissement », même si c’est lui qui vous a appelé. Vous ne pouvez recevoir aucun paiement ni aucune contrepartie, sous quelque forme que ce soit (acompte, chèque à encaisser plus tard…), avant 7 jours (Code de la consommation, art. L221-10) : c’est un délit, puni de 2 ans de prison et de 150 000 € d’amende (art. L242-7). Le client a 14 jours pour se rétracter avec le formulaire que vous lui remettez ; vous ne commencez dans ce délai que s’il le demande par écrit. Exception : la réparation urgente qu’il vous a demandée. Un devis signé en ligne (lien de signature) est un contrat à distance : 14 jours de rétractation, mais pas l’interdiction des 7 jours.",
  "comment": [
   "Pour chaque devis, savoir où il est signé : chez le client, en ligne, ou dans vos locaux.",
   "Chez le client : laisser le formulaire de rétractation, ne rien encaisser avant le 8e jour, faire écrire sa demande s’il veut que vous commenciez avant 14 jours.",
   "Dépannage urgent demandé par le client : noter l’urgence sur le devis.",
   "Sans information sur le droit de rétractation, le délai s’allonge de 12 mois (art. L221-20)."
  ],
  "fait": "Vous savez dire, pour votre prochain devis, quand vous pourrez encaisser l’acompte.",
  "liens": [
   [
    "Code de la consommation, art. L221-10",
    "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226864"
   ]
  ]
 },
 {
  "id": "reception",
  "jalon": "j3",
  "rang": 4.5,
  "qui": "vous",
  "effort": "15 min par chantier",
  "deps": [
   "premierefacture"
  ],
  "titre": "Faire signer un procès-verbal de réception",
  "action": "À la fin du premier chantier de travaux, faire signer un PV de réception, avec les réserves éventuelles.",
  "pourquoi": "La réception fait courir vos garanties : parfait achèvement (1 an), bon fonctionnement des équipements (2 ans), décennale (10 ans). Sans procès-verbal, la date se discute, et la décennale avec elle (Code civil, art. 1792 et suivants, à revérifier au texte).",
  "comment": [
   "Faire signer un PV de réception à la fin de chaque chantier de travaux.",
   "Le joindre à la facture finale et l’archiver."
  ],
  "fait": "Votre premier chantier a un PV de réception signé et archivé."
 },
 {
  "id": "registres",
  "jalon": "j3",
  "rang": 4.7,
  "qui": "vous",
  "effort": "30 min",
  "deps": [
   "premierefacture"
  ],
  "titre": "Tenir le livre des recettes et conserver 10 ans",
  "action": "À la fin du premier mois, exporter le mois depuis Mallettico et l’archiver hors de l’app.",
  "pourquoi": "En micro-entreprise, vous tenez un livre chronologique des recettes (montant, origine, mode de paiement, justificatif) et, si vous vendez des fournitures, un registre des achats. Factures et justificatifs se conservent 10 ans. Mallettico ne fait pas d’archivage à valeur probante : la copie hors de l’app est votre archive.",
  "comment": [
   "Vérifier que l’export de Mallettico contient ces colonnes (sinon, le noter pour Claude).",
   "Archiver l’export de chaque mois hors de Mallettico."
  ],
  "fait": "Le livre des recettes du premier mois existe, exporté et archivé.",
  "liens": [
   [
    "Registres du micro-entrepreneur",
    "https://entreprendre.service-public.gouv.fr/vosdroits/F36018"
   ]
  ]
 },
 {
  "id": "st-android-tel",
  "jalon": "j5",
  "rang": 1.5,
  "qui": "vous",
  "effort": "30 min",
  "titre": "Avoir un téléphone Android sous la main",
  "action": "Emprunter ou acheter un modèle d’entrée de gamme (Android 10 ou plus).",
  "pourquoi": "Google exige des nouveaux comptes personnels une vérification depuis l’application Play Console, sur un téléphone Android physique, non rooté, Android 10 ou plus. C’est aussi le seul moyen d’essayer le partage, l’appareil photo et les notifications comme un artisan : l’émulateur ne remplace pas un vrai téléphone.",
  "comment": [
   "Un modèle d’entrée de gamme suffit.",
   "Y installer la Play Console mobile le jour de la création du compte Google."
  ],
  "fait": "Un téléphone Android 10 ou plus est disponible."
 },
 {
  "id": "dsa",
  "jalon": "j5",
  "rang": 5.5,
  "qui": "vous",
  "effort": "30 min + vérification",
  "deps": [
   "comptes-dev",
   "immat"
  ],
  "titre": "Déclarer mon statut de commerçant sur les stores (UE)",
  "action": "Dans App Store Connect → Business : déclarer le statut de commerçant, valider téléphone et e-mail, déposer le justificatif d’immatriculation.",
  "pourquoi": "Le règlement européen sur les services numériques (DSA) oblige Apple à vérifier et publier, sur la fiche de l’app dans l’UE, l’adresse (ou une boîte postale justifiée), le téléphone et l’e-mail de tout développeur qui en fait commerce. Vous vendez des abonnements : vous êtes commerçant. Sans ce statut, l’app n’est pas distribuée dans l’UE. Apple peut demander des documents prouvant votre nom et votre adresse : il faut l’immatriculation. Google publie aussi des coordonnées selon le type de compte.",
  "comment": [
   "Répondre d’abord à la question sur l’adresse publiée.",
   "Prévoir un numéro de téléphone professionnel.",
   "Déclarer le statut dans App Store Connect (et vérifier l’équivalent dans la Play Console)."
  ],
  "fait": "Le statut est vérifié, avec les coordonnées que vous avez choisi de publier.",
  "liens": [
   [
    "Apple — exigences DSA",
    "https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/"
   ]
  ]
 }
];

const PLUS_TARD = [
 {
  "id": "ia",
  "titre": "Remettre la dictée vocale (IA)",
  "declencheur": "après la publication sur les stores",
  "pourquoi": "quota côté serveur, sous-traitant déclaré et saisie clavier d’abord (décision D-07)."
 },
 {
  "id": "modules",
  "titre": "Arbitrer les modules secondaires",
  "declencheur": "après un mois d’usage réel",
  "pourquoi": "on coupe ce qui ne sert pas, sur la base de votre usage et de celui des testeurs."
 },
 {
  "id": "parcours",
  "titre": "Construire un parcours de lancement dans Mallettico",
  "declencheur": "pas avant 10 artisans actifs, puis revue critique-produit",
  "pourquoi": "votre parcours d’électricien en est le prototype ; trop tôt, ce serait du périmètre en plus."
 },
 {
  "id": "e-partenaires",
  "titre": "Interroger trois Plateformes Agréées pour Mallettico",
  "declencheur": "avant fin janvier 2027",
  "pourquoi": "l’émission des factures électroniques devient obligatoire pour les TPE le 1er septembre 2027 ; il faut le temps d’intégrer leur API."
 },
 {
  "id": "t-paiement",
  "titre": "Tester le paiement en ligne avec une facture de 1 €",
  "declencheur": "si vous décidez de garder le paiement en ligne des factures",
  "pourquoi": "la fonction serveur qui le permet n’est pas confirmée en production."
 },
 {
  "id": "e-factures-mallettico",
  "titre": "Émettre les factures d’abonnement Mallettico par une Plateforme Agréée",
  "declencheur": "avant le 1er septembre 2027, après le choix de la plateforme",
  "pourquoi": "vos abonnés sont des entreprises : les factures PDF de Stripe ne suffiront plus."
 }
];

const FICHES = [
 {
  "titre": "Savoir quand prévoir le Consuel",
  "pourquoi": "L’attestation de conformité visée par le Consuel est exigée avant la mise sous tension d’une installation neuve raccordée au réseau, d’une installation de production (photovoltaïque) qui modifie l’installation intérieure, et d’une installation entièrement rénovée après coupure par le distributeur à la demande du client (code de l’énergie, art. D342-19). Pour les bornes : au-delà de 36 kW, et quelle que soit la puissance en immeuble collectif. Elle est envoyée au Consuel au moins 20 jours avant la mise en service prévue. L’oublier dans un devis, c’est un passage, un délai et un coût que personne n’avait prévus.",
  "comment": [
   "Créer votre espace installateur sur consuel.com.",
   "Repérer les chantiers qui l’imposent : installation neuve, rénovation complète, raccordement.",
   "L’inclure systématiquement comme ligne de devis quand c’est le cas (l’article existe dans le référentiel Mallettico)."
  ],
  "liens": [
   [
    "consuel.com",
    "https://www.consuel.com"
   ]
  ]
 },
 {
  "titre": "Comprendre ce qui m’attend le 1er septembre 2027",
  "pourquoi": "Au 1er septembre 2027, vous transmettrez par votre plateforme : pour vos clients particuliers, le total de vos ventes par jour et par taux de TVA, sans nom de client ; pour toutes vos prestations, particuliers comme professionnels, vos encaissements (date et montant). En franchise, ces envois se font tous les deux mois. Vos clients professionnels recevront à la même date de vraies factures électroniques, qui porteront quatre nouvelles mentions (SIREN du client, catégorie de l’opération, option pour les débits, adresse de livraison si différente).",
  "comment": [
   "En franchise de TVA : transmission tous les deux mois, montants agrégés par jour et par taux de TVA.",
   "Aucune donnée nominative de vos clients particuliers n’est transmise.",
   "Pour vos clients professionnels : émission obligatoire par votre plateforme à partir du 1er septembre 2027.",
   "Vérifier la fréquence exacte de votre régime dans la FAQ officielle avant d’en dépendre."
  ]
 }
];

/* Onglet Repères : les règles du Pilote, l'état sans fard, la réforme, les arnaques, les sources. */
function vueReperes(){
  const j = Math.max(0, Math.ceil((new Date(ECHEANCE_2027 + "T00:00:00") - new Date()) / 86400000));
  return '<div class="reperes">'
  + '<section class="bloc"><h3>Comment on travaille ensemble</h3><ol class="regles">'
  + '<li><span><b>Le matin, trois minutes au téléphone.</b> Lire ce qui est nouveau, répondre à une question au plus, cocher ce que vous avez fait (avec la preuve), noter en une phrase ce qui a coincé la veille.</span></li>'
  + '<li><span><b>Quand vous avez une heure devant l’ordinateur</b> : ouvrir une session Claude Code, taper <span class="mono">/debut</span>. Claude a lu vos notes, vous propose la suite, et attend votre « vas-y ».</span></li>'
  + '<li><span><b>Le lundi, un quart d’heure.</b> La semaine passée, ce qui attend depuis trop longtemps, et vos trois engagements de la semaine.</span></li>'
  + '<li><span><b>Ce que vous écrivez ici n’est jamais exécuté tout seul.</b> Claude le lit, le reformule dans la session et attend votre feu vert. Aucun bouton du Pilote ne met en production, n’applique de SQL ni ne touche à un compte.</span></li>'
  + '<li><span><b>Une étape n’est faite que lorsque son critère est observé.</b> « J’ai envoyé le dossier » n’est pas « j’ai reçu mon SIRET » ; une migration n’est faite que lorsque son contrôle le montre. C’est la leçon de toutes les pannes vertes de Mallettico.</span></li>'
  + '<li><span><b>Jamais de mot de passe, de clé ni de code secret dans le Pilote.</b></span></li>'
  + '</ol></section>'

  + '<section class="bloc"><h3>Mallettico, sans fard (8 octobre 2026)</h3><ul>'
  + '<li><b>Ce qui est solide</b> : la chaîne de calcul des devis et factures (testée), la certification TVA réduite, une interface sans défaut mesuré sur téléphone, tablette et ordinateur, et une vérification automatique avant chaque mise en production.</li>'
  + '<li><b>Ce qui est ouvert en production tant que vous n’avez pas appliqué les migrations</b> : un utilisateur peut se passer lui-même en plan Équipe (073), deux tables sont lisibles par tous (075), et la clé Stripe d’un artisan peut être lue par un visiteur (076).</li>'
  + '<li><b>Ce que la revue du 8 octobre a trouvé</b> : des affirmations de conformité restaient en ligne (retirées), l’envoi d’e-mails est trop ouvert, les devis manquent de trois mentions (déchets, dépannage, médiateur sur la page de signature), et Sentry n’est pas actif. Tout est dans « Ce que Claude fera ensuite ».</li>'
  + '<li><b>Pour les stores</b> : il faut d’abord mettre macOS à jour, puis Xcode et Android Studio ; vos décisions (structure, adresse, comptes, achats dans l’app) ; et l’immatriculation pour le statut de commerçant d’Apple.</li>'
  + '<li><b>L’échéance qui décide de tout : le 1er septembre 2027.</b> Sans raccordement à une Plateforme Agréée, Mallettico cesse d’être un outil de facturation pour devenir un générateur de PDF à ressaisir.</li>'
  + '</ul></section>'

  + '<section class="bloc"><h3>Facturation électronique : où on en est</h3>'
  + '<div class="defile"><table><tr><th>Date</th><th>Obligation</th><th>Pour vous</th></tr>'
  + '<tr><td class="mono">1er sept. 2026</td><td>Réception des factures électroniques, pour toutes les entreprises assujetties — franchise en base comprise</td><td><b>Déjà en vigueur.</b> Choisir une plateforme dans la liste officielle et vérifier l’annuaire. Sinon : mise en demeure, puis 500 €, puis 1 000 € par trimestre.</td></tr>'
  + '<tr><td class="mono">1er sept. 2026</td><td>Émission pour les grandes entreprises et les ETI</td><td>Vos distributeurs vous en envoient déjà.</td></tr>'
  + '<tr><td class="mono">1er sept. 2027</td><td>Émission, e-reporting et données de paiement pour les PME, TPE et micro-entreprises ; quatre nouvelles mentions sur les factures</td><td><b>Dans ' + j + ' jours.</b> Factures électroniques vers vos clients pros ; pour les particuliers, ventes par jour et par taux ; vos encaissements de prestations ; tous les deux mois en franchise. Amende : 50 € par facture, plafonnée à 15 000 € par an.</td></tr>'
  + '</table></div>'
  + '<p style="margin-top:10px"><b>Le portail public n’est plus qu’un annuaire</b> : toute facture passe par une Plateforme Agréée, et seule la liste publiée sur impots.gouv.fr fait foi. Mallettico produit déjà le fichier Factur-X, mais n’est raccordé à aucune plateforme : il n’est donc pas « conforme », et ne le dira pas avant de l’être.</p>'
  + '</section>'

  + '<section class="bloc"><h3>Reconnaître une arnaque en dix secondes</h3><ul>'
  + '<li>Les messages de la DGFiP se terminent toujours par <span class="mono">@dgfip.finances.gouv.fr</span>.</li>'
  + '<li>L’administration ne demande <b>jamais</b> d’identifiant, de mot de passe, de RIB ni de paiement par mail. La réforme ne coûte aucun frais d’inscription.</li>'
  + '<li>Des données d’environ 250 000 entreprises ont été volées à la DGFiP en juin-juillet 2026 : un faux mail peut connaître votre dossier.</li>'
  + '<li>« Nos coordonnées bancaires changent avec la facturation électronique » : se vérifie par téléphone, au numéro déjà connu.</li>'
  + '<li>Signaler sur cybermalveillance.gouv.fr ou signal-spam.fr. Assistance facturation électronique : 0806 807 807.</li>'
  + '</ul></section>'

  + '<section class="bloc"><h3>Sources</h3><ul>'
  + '<li><a href="https://www.impots.gouv.fr/professionnel/je-passe-la-facturation-electronique" target="_blank" rel="noopener noreferrer">impots.gouv.fr — Je passe à la facturation électronique</a></li>'
  + '<li><a href="https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees" target="_blank" rel="noopener noreferrer">Liste officielle des plateformes agréées</a></li>'
  + '<li><a href="https://entreprendre.service-public.gouv.fr/vosdroits/F38552" target="_blank" rel="noopener noreferrer">Électricien : conditions d’accès et d’exercice</a></li>'
  + '<li><a href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000033935513" target="_blank" rel="noopener noreferrer">Arrêté du 24 janvier 2017 (dépannage, réparation, entretien)</a></li>'
  + '<li><a href="https://entreprendre.service-public.gouv.fr/actualites/A18088" target="_blank" rel="noopener noreferrer">TVA réduite : la mention qui remplace l’attestation</a></li>'
  + '<li><a href="https://www.cybermalveillance.gouv.fr" target="_blank" rel="noopener noreferrer">Cybermalveillance.gouv.fr</a></li>'
  + '</ul><p class="date">Vérifié le 8 octobre 2026 par l’agent juriste de Claude, sur les sources officielles. Repères pour s’organiser, pas un avis juridique ou fiscal : votre comptable valide les choix de structure et de TVA.</p></section>'
  + '</div>';
}
