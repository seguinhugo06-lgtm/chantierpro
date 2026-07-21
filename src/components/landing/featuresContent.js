/**
 * featuresContent — Contenu des pages de détail par fonctionnalité (/fonctionnalites/:slug).
 *
 * RÈGLE : uniquement des capacités RÉELLES, vérifiées dans le code de l'app.
 * Pas de claims marketing invérifiables (cf. refonte honnêteté du 19 juil. 2026).
 */

export const FEATURES_CONTENT = {
  'devis-factures': {
    slug: 'devis-factures',
    label: 'Devis & Factures',
    color: '#f97316',
    badge: 'Cœur de métier',
    title: 'Des devis professionnels en quelques minutes',
    tagline:
      'Un éditeur plein écran pensé pour le BTP : catalogue intégré, lots avec sous-totaux, métré, TVA multi-taux et mentions légales automatiques. Vous créez, vous envoyez, votre client signe en ligne.',
    screenshot: '/screenshots/devis-editor.png',
    metaDescription:
      'Créez des devis et factures BTP professionnels : éditeur plein écran, catalogue intégré, lots et sous-totaux, TVA multi-taux, PDF conforme avec mentions légales automatiques.',
    steps: [
      { title: 'Choisissez un modèle ou partez de zéro', text: 'Modèles par métier (17 métiers couverts), vos propres modèles, ou une page blanche. Le catalogue s\'ouvre avec vos articles favoris et récents.' },
      { title: 'Composez vos lignes', text: 'Recherche dans le catalogue avec autocomplétion, lots repliables avec sous-totaux, métré express (L×l×h, chutes), 12 unités, TVA par ligne ou globale (20/10/5,5/0 %).' },
      { title: 'Vérifiez l\'aperçu', text: 'L\'aperçu PDF exact — celui que recevra votre client — se génère avant la création. Mentions légales, assurance décennale et conditions ajoutées automatiquement.' },
      { title: 'Envoyez et faites signer', text: 'Envoi par email avec PDF joint et lien de signature électronique. Le statut passe à « Envoyé », les relances prennent le relais.' },
    ],
    groups: [
      {
        name: 'Création',
        items: [
          'Éditeur plein écran avec total en direct et badge de marge',
          'Lots (sections) repliables avec sous-totaux par lot',
          'Métré express : longueur × largeur (× hauteur), chutes en %',
          'Prix d\'achat et marge par ligne (modal marge %/€)',
          'Acompte en %, conditions de règlement, adresse du chantier',
          'Brouillon autosauvegardé — reprenez où vous en étiez',
        ],
      },
      {
        name: 'Documents',
        items: [
          'Factures, acomptes, situations de travaux et avoirs',
          'Numérotation automatique et duplication en un clic',
          'PDF conforme avec mentions obligatoires (décennale, rétractation, pénalités)',
          'Format Factur-X pour la facturation électronique 2026',
          'Historique complet et suivi des statuts (envoyé, signé, payé)',
        ],
      },
    ],
    faq: [
      { q: 'Est-ce que je pars d\'une page blanche ?', a: 'Non. 17 métiers ont des modèles prêts à l\'emploi, et plus de 1 000 articles et ouvrages BTP pré-chiffrés sont inclus. Vous pouvez aussi enregistrer vos propres modèles.' },
      { q: 'Les mentions légales sont-elles gérées ?', a: 'Oui. Assurance décennale, droit de rétractation, pénalités de retard et conditions de règlement sont générés automatiquement depuis votre profil entreprise.' },
      { q: 'Puis-je facturer en plusieurs fois ?', a: 'Oui : factures d\'acompte, situations de travaux (facturation à l\'avancement) et facture de solde sont gérées.' },
    ],
    related: ['signature-electronique', 'relances', 'catalogue'],
  },

  'signature-electronique': {
    slug: 'signature-electronique',
    label: 'Signature électronique',
    color: '#22c55e',
    badge: 'Encaissez plus vite',
    title: 'Vos devis signés en ligne, sans courir après',
    tagline:
      'Votre client reçoit un lien sécurisé, consulte le devis sur son téléphone et signe du doigt. Pas de compte à créer, pas d\'impression, pas d\'aller-retour. Le devis passe « Signé » dans votre app.',
    screenshot: '/screenshots/signature.png',
    metaDescription:
      'Signature électronique de devis BTP : lien sécurisé, signature au doigt sur mobile, horodatage et traçabilité. Vos clients signent en ligne sans créer de compte.',
    steps: [
      { title: 'Envoyez votre devis', text: 'L\'email d\'envoi contient le PDF et un bouton « Consulter et signer le devis en ligne ». Le lien est unique et sécurisé, valable 30 jours.' },
      { title: 'Votre client consulte et signe', text: 'Il voit le devis complet dans son navigateur — mobile, tablette ou ordinateur — et signe directement au doigt ou à la souris. Aucun compte à créer.' },
      { title: 'Vous êtes fixé', text: 'Le devis passe automatiquement en « Signé » dans votre app, avec le nom du signataire, la date et l\'heure. Votre client peut télécharger son exemplaire signé.' },
    ],
    groups: [
      {
        name: 'Sécurité & traçabilité',
        items: [
          'Lien unique et sécurisé par devis, expiration automatique à 30 jours',
          'Horodatage de la signature et enregistrement du signataire',
          'Signature apposée sur le PDF final, téléchargeable par les deux parties',
          'Le devis ne peut plus être signé deux fois',
        ],
      },
      {
        name: 'Expérience client',
        items: [
          'Fonctionne sur mobile, tablette et ordinateur',
          'Aucune application à installer, aucun compte à créer',
          'Le devis complet est consultable avant signature',
          'Vos coordonnées et votre identité visuelle sur la page',
        ],
      },
    ],
    faq: [
      { q: 'Mon client doit-il créer un compte ?', a: 'Non. Il clique sur le lien reçu par email et signe directement. C\'est volontairement sans friction.' },
      { q: 'Combien de temps le lien reste-t-il valable ?', a: '30 jours. Si le devis expire, renvoyez-le : un nouveau lien est généré automatiquement.' },
      { q: 'Que se passe-t-il après la signature ?', a: 'Le devis passe en statut « Signé » dans votre application, avec le nom du signataire et l\'horodatage. Vous pouvez alors le transformer en facture en un clic.' },
    ],
    related: ['devis-factures', 'relances'],
  },

  relances: {
    slug: 'relances',
    label: 'Relances automatiques',
    color: '#f59e0b',
    badge: 'Automatisation',
    title: 'Ne laissez plus un devis ou une facture sans réponse',
    tagline:
      'Des scénarios de relance par email — devis sans réponse, factures impayées — avec des messages personnalisables. Vous relancez en un clic depuis l\'accueil, ou laissez tout partir automatiquement.',
    screenshot: '/screenshots/relances.png',
    metaDescription:
      'Relances automatiques de devis et factures pour artisans BTP : scénarios J+7/J+15/J+30, emails personnalisables, envoi en un clic ou 100 % automatique.',
    steps: [
      { title: 'Activez vos scénarios', text: 'Relance devis (J+7, J+15, J+30) et relance factures impayées (4 étapes) sont pré-configurées. Ajustez les délais, ajoutez ou retirez des étapes.' },
      { title: 'Personnalisez vos messages', text: 'Chaque étape a son template email avec variables dynamiques : nom du client, montant, numéro de devis, date. Prévisualisez avant d\'activer.' },
      { title: 'Relancez sans y penser', text: 'Les relances dues apparaissent sur votre accueil — envoi en un clic. Ou activez l\'envoi 100 % automatique : elles partent seules chaque jour.' },
    ],
    groups: [
      {
        name: 'Scénarios',
        items: [
          'Relance devis en 3 étapes (J+7, J+15, J+30), modifiables',
          'Relance factures impayées en 4 étapes',
          'Templates personnalisables avec variables dynamiques',
          'Aperçu de l\'email avant activation',
        ],
      },
      {
        name: 'Contrôle',
        items: [
          'Envoi en un clic depuis le tableau de bord (« À faire aujourd\'hui »)',
          'Mode 100 % automatique optionnel — vous gardez la main',
          'Historique complet des relances par document',
          'Exclusion d\'un client ou d\'un document en un clic',
        ],
      },
    ],
    faq: [
      { q: 'Les relances partent-elles toutes seules ?', a: 'C\'est vous qui choisissez : par défaut, les relances dues s\'affichent sur votre accueil et partent en un clic. Vous pouvez activer l\'envoi 100 % automatique quand vous êtes prêt.' },
      { q: 'Puis-je exclure un client des relances ?', a: 'Oui, un client ou un document précis peut être exclu en un clic — utile pour les clients sensibles ou les litiges en cours.' },
      { q: 'Les emails sont-ils personnalisables ?', a: 'Chaque étape a son propre template, avec des variables (nom, montant, numéro…). Vous écrivez une fois, Mallettico personnalise à chaque envoi.' },
    ],
    related: ['devis-factures', 'tresorerie'],
  },

  chantiers: {
    slug: 'chantiers',
    label: 'Suivi de chantiers',
    color: '#3b82f6',
    badge: 'Suivi complet',
    title: 'Chaque chantier sous contrôle, du devis à la facture',
    tagline:
      'Avancement, rentabilité, dépenses, photos, documents et tâches — tout est rattaché au chantier. Sur place, les actions terrain (en route, arrivé, terminé, pointage) se font en deux taps.',
    screenshot: '/screenshots/chantier-detail.png',
    metaDescription:
      'Suivi de chantiers BTP : avancement, marge en temps réel, dépenses, photos, tâches et actions terrain depuis le mobile.',
    steps: [
      { title: 'Créez le chantier', text: 'Client, adresse des travaux, dates, budget estimé. Le chantier est lié à ses devis et factures — la rentabilité se calcule toute seule.' },
      { title: 'Suivez au quotidien', text: 'Avancement en %, dépenses par catégorie, photos, documents, tâches et check-lists. Le journal d\'activité garde la trace de tout.' },
      { title: 'Pilotez depuis le terrain', text: 'Sur mobile : itinéraire GPS en un tap, statuts terrain (en route, arrivé, terminé) et pointage des heures directement depuis la fiche chantier.' },
    ],
    groups: [
      {
        name: 'Pilotage',
        items: [
          'Marge et rentabilité en temps réel (devis − dépenses − main-d\'œuvre)',
          'Suivi d\'avancement et statuts personnalisés',
          'Dépenses par catégorie rattachées au chantier',
          'Tâches et check-lists par chantier',
        ],
      },
      {
        name: 'Terrain',
        items: [
          'Actions rapides : en route, arrivé, terminé, pointer',
          'Itinéraire GPS vers l\'adresse du chantier en un tap',
          'Photos de chantier organisées en galerie',
          'Documents et pièces jointes centralisés',
        ],
      },
    ],
    faq: [
      { q: 'La rentabilité est-elle calculée automatiquement ?', a: 'Oui : les devis et factures liés au chantier, les dépenses saisies et les heures pointées alimentent la marge en temps réel.' },
      { q: 'Ça fonctionne sur le chantier, sans réseau ?', a: 'Mallettico est une application web installable (PWA) qui fonctionne aussi hors-ligne pour consulter vos données. Les modifications se synchronisent au retour du réseau.' },
    ],
    related: ['devis-factures', 'equipe'],
  },

  catalogue: {
    slug: 'catalogue',
    label: 'Catalogue & bibliothèque BTP',
    color: '#8b5cf6',
    badge: 'Prêt à l\'emploi',
    title: 'Plus de 1 000 articles et ouvrages BTP, déjà chiffrés',
    tagline:
      'Un référentiel d\'articles par métier et une bibliothèque d\'ouvrages organisée en 11 lots (gros œuvre, second œuvre, CVC, électricité…). Importez votre métier en un clic et composez vos devis sans page blanche.',
    screenshot: '/screenshots/catalogue.png',
    metaDescription:
      'Catalogue BTP intégré : plus de 1 000 articles et ouvrages pré-chiffrés, import par métier en un clic, prix d\'achat et marges, import CSV fournisseurs.',
    steps: [
      { title: 'Importez votre métier', text: '15 métiers disponibles : plomberie, électricité, maçonnerie, peinture, menuiserie… Sélectionnez le vôtre, les articles arrivent pré-chiffrés.' },
      { title: 'Personnalisez vos prix', text: 'Ajustez les prix de vente, renseignez vos prix d\'achat pour suivre vos marges, marquez vos articles favoris.' },
      { title: 'Composez vos devis en un clic', text: 'Dans l\'éditeur de devis, la recherche retrouve vos articles instantanément (insensible aux accents). Vos favoris et articles récents sont proposés en premier.' },
    ],
    groups: [
      {
        name: 'Contenu inclus',
        items: [
          'Plus de 500 articles par métier (15 métiers du BTP)',
          'Bibliothèque de plus de 600 ouvrages en 11 lots techniques',
          'Prix indicatifs modifiables — vos tarifs restent les vôtres',
          'Modèles de devis par métier (17 métiers)',
        ],
      },
      {
        name: 'Votre catalogue',
        items: [
          'Vos propres articles avec prix d\'achat et marge',
          'Favoris et articles récents pour aller vite',
          'Import CSV de vos tarifs fournisseurs',
          'Suivi de stock avec alertes (plan Équipe)',
        ],
      },
    ],
    faq: [
      { q: 'Les prix du catalogue sont-ils fiables ?', a: 'Ce sont des prix indicatifs de marché, pensés comme point de départ. Vous les ajustez à votre réalité — vos prix restent toujours prioritaires.' },
      { q: 'Puis-je importer mes propres tarifs ?', a: 'Oui, par fichier CSV (export de vos fournisseurs ou de votre ancien logiciel), ou article par article.' },
    ],
    related: ['devis-factures', 'chantiers'],
  },

  tresorerie: {
    slug: 'tresorerie',
    label: 'Trésorerie',
    color: '#10b981',
    badge: 'Finances',
    title: 'Sachez où vous en êtes, et où vous allez',
    tagline:
      'Projections de trésorerie à 30, 60 et 90 jours à partir de vos factures et échéances. Les impayés remontent automatiquement, les exports partent chez votre comptable.',
    screenshot: '/screenshots/tresorerie.png',
    metaDescription:
      'Trésorerie pour artisans BTP : projections à 30/60/90 jours, suivi des impayés, exports comptables Pennylane, Indy et FEC.',
    steps: [
      { title: 'Vos flux se construisent seuls', text: 'Factures émises, échéances de paiement et dépenses alimentent automatiquement vos prévisions de trésorerie.' },
      { title: 'Anticipez les creux', text: 'Projections à 30, 60 et 90 jours : vous voyez les mois tendus avant qu\'ils n\'arrivent, et les impayés remontent en priorité.' },
      { title: 'Transmettez à votre comptable', text: 'Exports compatibles Pennylane et Indy, export FEC (plan Équipe). Vos données comptables sortent proprement.' },
    ],
    groups: [
      {
        name: 'Pilotage',
        items: [
          'Projections de trésorerie à 30, 60 et 90 jours',
          'Suivi des paiements et détection des impayés',
          'Mouvements prévisionnels récurrents (loyers, charges…)',
          'Tableau de bord financier en temps réel',
        ],
      },
      {
        name: 'Comptabilité',
        items: [
          'Exports compatibles Pennylane et Indy',
          'Export FEC pour votre expert-comptable (plan Équipe)',
          'Journal d\'audit des documents (plan Équipe)',
          'Conformité facturation électronique 2026 (Factur-X)',
        ],
      },
    ],
    faq: [
      { q: 'Dois-je saisir mes flux à la main ?', a: 'Non pour l\'essentiel : factures et échéances alimentent les prévisions automatiquement. Vous pouvez ajouter des mouvements prévisionnels (charges récurrentes, loyers…).' },
      { q: 'Mon comptable peut-il récupérer les données ?', a: 'Oui : exports compatibles Pennylane et Indy, et export FEC sur le plan Équipe.' },
    ],
    related: ['relances', 'devis-factures'],
  },

  equipe: {
    slug: 'equipe',
    label: 'Équipe & pointage',
    color: '#6366f1',
    badge: 'Plan Équipe',
    title: 'Votre équipe organisée, vos heures comptées',
    tagline:
      'Jusqu\'à 10 utilisateurs avec des rôles et permissions précis. Pointage des heures, gestion des congés, affectation aux chantiers et suivi des sous-traitants.',
    screenshot: '/screenshots/equipe.png',
    metaDescription:
      'Gestion d\'équipe BTP : jusqu\'à 10 utilisateurs, rôles et permissions, pointage des heures, congés, affectation aux chantiers et sous-traitants.',
    steps: [
      { title: 'Invitez votre équipe', text: 'Chaque membre a son compte avec un rôle : chacun voit uniquement ce qui le concerne (ses chantiers, son planning, son pointage).' },
      { title: 'Affectez et planifiez', text: 'Affectation aux chantiers, planning par personne, taux horaires et coûts chargés pour un calcul de rentabilité juste.' },
      { title: 'Suivez les heures', text: 'Pointage depuis le mobile (y compris depuis la fiche chantier), congés et absences, récapitulatifs par période et par chantier.' },
    ],
    groups: [
      {
        name: 'Organisation',
        items: [
          'Jusqu\'à 10 utilisateurs (plan Équipe)',
          'Rôles et permissions par membre',
          'Affectation aux chantiers et planning par personne',
          'Gestion des congés et absences',
        ],
      },
      {
        name: 'Heures & coûts',
        items: [
          'Pointage des heures depuis le mobile',
          'Taux horaire et coût chargé par membre',
          'Heures intégrées à la rentabilité des chantiers',
          'Suivi des sous-traitants',
        ],
      },
    ],
    faq: [
      { q: 'Mes salariés voient-ils tout ?', a: 'Non : les rôles et permissions limitent l\'accès. Un ouvrier voit ses chantiers et son pointage, pas votre trésorerie.' },
      { q: 'Le pointage fonctionne-t-il sur téléphone ?', a: 'Oui, c\'est même le cas d\'usage principal : chacun pointe depuis son mobile, y compris directement depuis la fiche du chantier.' },
    ],
    related: ['chantiers', 'tresorerie'],
  },
};

export const FEATURE_SLUGS = Object.keys(FEATURES_CONTENT);
