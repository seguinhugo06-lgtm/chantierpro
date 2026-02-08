/**
 * Centralized wording constants for consistent terminology across the app
 * Use these instead of hardcoded strings to ensure consistency
 *
 * Benefits:
 * - Easy to update wording in one place
 * - Consistent terminology throughout the app
 * - Preparation for future i18n/localization
 */

// ============================================
// Navigation & Pages
// ============================================
export const NAV = {
  dashboard: 'Tableau de bord',
  clients: 'Clients',
  chantiers: 'Chantiers',
  devis: 'Devis',
  factures: 'Factures',
  planning: 'Planning',
  equipe: 'Équipe',
  catalogue: 'Catalogue',
  marketplace: 'Marketplace',
  settings: 'Paramètres',
  profile: 'Profil'
};

// ============================================
// Common Actions
// ============================================
export const ACTIONS = {
  add: 'Ajouter',
  create: 'Créer',
  edit: 'Modifier',
  delete: 'Supprimer',
  save: 'Enregistrer',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  close: 'Fermer',
  search: 'Rechercher',
  filter: 'Filtrer',
  sort: 'Trier',
  export: 'Exporter',
  import: 'Importer',
  download: 'Télécharger',
  upload: 'Charger',
  print: 'Imprimer',
  share: 'Partager',
  duplicate: 'Dupliquer',
  archive: 'Archiver',
  restore: 'Restaurer',
  refresh: 'Actualiser',
  reset: 'Réinitialiser',
  apply: 'Appliquer',
  validate: 'Valider',
  send: 'Envoyer',
  preview: 'Aperçu',
  generate: 'Générer',
  seeMore: 'Voir plus',
  seeLess: 'Voir moins',
  seeAll: 'Voir tout',
  back: 'Retour',
  next: 'Suivant',
  previous: 'Précédent',
  finish: 'Terminer'
};

// ============================================
// Status Labels
// ============================================
export const STATUS = {
  // General
  all: 'Tous',
  active: 'Actif',
  inactive: 'Inactif',
  pending: 'En attente',
  completed: 'Terminé',
  cancelled: 'Annulé',
  archived: 'Archivé',

  // Devis specific
  devis: {
    draft: 'Brouillon',
    sent: 'Envoyé',
    accepted: 'Accepté',
    refused: 'Refusé',
    expired: 'Expiré',
    converted: 'Converti en facture'
  },

  // Facture specific
  facture: {
    draft: 'Brouillon',
    sent: 'Envoyée',
    paid: 'Payée',
    partiallyPaid: 'Partiellement payée',
    overdue: 'En retard',
    cancelled: 'Annulée'
  },

  // Chantier specific
  chantier: {
    planned: 'Planifié',
    inProgress: 'En cours',
    onHold: 'En pause',
    completed: 'Terminé',
    cancelled: 'Annulé'
  },

  // Task specific
  task: {
    todo: 'À faire',
    inProgress: 'En cours',
    done: 'Fait',
    blocked: 'Bloqué'
  }
};

// ============================================
// Form Labels
// ============================================
export const FORM = {
  // Common fields
  name: 'Nom',
  firstName: 'Prénom',
  lastName: 'Nom de famille',
  email: 'Email',
  phone: 'Téléphone',
  mobile: 'Mobile',
  address: 'Adresse',
  city: 'Ville',
  postalCode: 'Code postal',
  country: 'Pays',
  company: 'Entreprise',
  siret: 'SIRET',
  tva: 'N° TVA',
  notes: 'Notes',
  description: 'Description',
  date: 'Date',
  startDate: 'Date de début',
  endDate: 'Date de fin',
  dueDate: 'Date d\'échéance',
  amount: 'Montant',
  quantity: 'Quantité',
  price: 'Prix',
  unitPrice: 'Prix unitaire',
  total: 'Total',
  subtotal: 'Sous-total',
  discount: 'Remise',
  tax: 'TVA',
  reference: 'Référence',
  status: 'Statut',
  type: 'Type',
  category: 'Catégorie',
  priority: 'Priorité',
  attachments: 'Pièces jointes',

  // Placeholders
  placeholders: {
    search: 'Rechercher...',
    selectClient: 'Sélectionner un client',
    selectChantier: 'Sélectionner un chantier',
    enterAmount: 'Entrez un montant',
    enterDescription: 'Entrez une description',
    enterEmail: 'exemple@email.fr',
    enterPhone: '06 12 34 56 78'
  },

  // Validation messages
  validation: {
    required: 'Ce champ est requis',
    invalidEmail: 'Format email invalide',
    invalidPhone: 'Format téléphone invalide',
    invalidSiret: 'Format SIRET invalide (14 chiffres)',
    minLength: (min) => `Minimum ${min} caractères`,
    maxLength: (max) => `Maximum ${max} caractères`,
    minValue: (min) => `Valeur minimum: ${min}`,
    maxValue: (max) => `Valeur maximum: ${max}`,
    positiveNumber: 'Doit être un nombre positif',
    invalidDate: 'Date invalide',
    dateInPast: 'La date doit être dans le passé',
    dateInFuture: 'La date doit être dans le futur'
  }
};

// ============================================
// Dashboard & Stats
// ============================================
export const STATS = {
  revenue: 'Chiffre d\'affaires',
  profit: 'Bénéfice',
  margin: 'Marge',
  averageMargin: 'Marge moyenne',
  expenses: 'Dépenses',
  pending: 'En attente',
  overdue: 'En retard',
  paid: 'Payé',
  unpaid: 'Impayé',
  total: 'Total',
  count: 'Nombre',
  average: 'Moyenne',
  growth: 'Croissance',
  thisMonth: 'Ce mois',
  thisYear: 'Cette année',
  lastMonth: 'Mois dernier',
  lastYear: 'Année dernière',
  allTime: 'Depuis le début',
  available: 'Disponible',
  unavailable: 'Indisponible'
};

// ============================================
// Time & Date
// ============================================
export const TIME = {
  today: 'Aujourd\'hui',
  yesterday: 'Hier',
  tomorrow: 'Demain',
  thisWeek: 'Cette semaine',
  lastWeek: 'Semaine dernière',
  nextWeek: 'Semaine prochaine',
  thisMonth: 'Ce mois-ci',
  lastMonth: 'Mois dernier',
  nextMonth: 'Mois prochain',
  thisYear: 'Cette année',
  days: 'jours',
  hours: 'heures',
  minutes: 'minutes',
  ago: 'il y a',
  in: 'dans',
  from: 'du',
  to: 'au',
  at: 'à'
};

// ============================================
// Messages & Notifications
// ============================================
export const MESSAGES = {
  // Success
  success: {
    saved: 'Enregistré avec succès',
    created: 'Créé avec succès',
    updated: 'Mis à jour avec succès',
    deleted: 'Supprimé avec succès',
    sent: 'Envoyé avec succès',
    copied: 'Copié dans le presse-papier',
    exported: 'Export réussi',
    imported: 'Import réussi'
  },

  // Errors
  error: {
    general: 'Une erreur est survenue',
    network: 'Erreur de connexion',
    notFound: 'Élément non trouvé',
    unauthorized: 'Accès non autorisé',
    validation: 'Veuillez corriger les erreurs',
    save: 'Erreur lors de l\'enregistrement',
    delete: 'Erreur lors de la suppression',
    load: 'Erreur lors du chargement'
  },

  // Confirmations
  confirm: {
    delete: 'Êtes-vous sûr de vouloir supprimer cet élément ?',
    deleteMultiple: (count) => `Êtes-vous sûr de vouloir supprimer ${count} éléments ?`,
    archive: 'Êtes-vous sûr de vouloir archiver cet élément ?',
    cancel: 'Êtes-vous sûr de vouloir annuler ?',
    unsavedChanges: 'Vous avez des modifications non enregistrées. Voulez-vous continuer ?',
    irreversible: 'Cette action est irréversible.'
  },

  // Empty states
  empty: {
    noResults: 'Aucun résultat',
    noData: 'Aucune donnée',
    noClients: 'Aucun client',
    noChantiers: 'Aucun chantier',
    noDevis: 'Aucun devis',
    noFactures: 'Aucune facture',
    noTasks: 'Aucune tâche',
    noAttachments: 'Aucune pièce jointe'
  },

  // Loading
  loading: {
    default: 'Chargement...',
    saving: 'Enregistrement...',
    deleting: 'Suppression...',
    sending: 'Envoi...',
    generating: 'Génération...',
    exporting: 'Export en cours...',
    importing: 'Import en cours...'
  }
};

// ============================================
// Units & Formats
// ============================================
export const UNITS = {
  currency: '€',
  currencyFormat: (amount) => `${amount.toLocaleString('fr-FR')} €`,
  percentage: '%',
  percentageFormat: (value) => `${value}%`,
  hours: 'h',
  hoursFormat: (value) => `${value}h`,
  days: 'j',
  daysFormat: (value) => `${value}j`,
  pieces: 'pcs',
  meters: 'm',
  squareMeters: 'm²',
  cubicMeters: 'm³',
  kilograms: 'kg',
  liters: 'L'
};

// ============================================
// Priority Levels
// ============================================
export const PRIORITY = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
  critical: 'Critique'
};

// ============================================
// Document Types
// ============================================
export const DOCUMENTS = {
  devis: 'Devis',
  facture: 'Facture',
  avoir: 'Avoir',
  acompte: 'Acompte',
  bon_commande: 'Bon de commande',
  bon_livraison: 'Bon de livraison',
  contrat: 'Contrat',
  attestation: 'Attestation'
};

// ============================================
// Payment Methods
// ============================================
export const PAYMENT_METHODS = {
  cash: 'Espèces',
  check: 'Chèque',
  card: 'Carte bancaire',
  transfer: 'Virement',
  direct_debit: 'Prélèvement',
  other: 'Autre'
};

// ============================================
// PWA & App
// ============================================
export const APP = {
  name: 'ChantierPro',
  tagline: 'Gestion simplifiée pour artisans',
  installPrompt: 'Installer l\'application',
  installInstructions: {
    ios: 'Appuyez sur "Partager" puis "Sur l\'écran d\'accueil"',
    android: 'Appuyez sur "Ajouter à l\'écran d\'accueil"'
  },
  offline: 'Mode hors-ligne',
  online: 'Connecté',
  syncing: 'Synchronisation...',
  syncComplete: 'Synchronisé'
};

// ============================================
// Accessibility
// ============================================
export const A11Y = {
  closeModal: 'Fermer la fenêtre',
  openMenu: 'Ouvrir le menu',
  closeMenu: 'Fermer le menu',
  toggleDarkMode: 'Basculer le mode sombre',
  expandSection: 'Développer la section',
  collapseSection: 'Réduire la section',
  sortAscending: 'Trier par ordre croissant',
  sortDescending: 'Trier par ordre décroissant',
  required: 'Requis',
  optional: 'Optionnel',
  loading: 'Chargement en cours',
  error: 'Erreur'
};

export default {
  NAV,
  ACTIONS,
  STATUS,
  FORM,
  STATS,
  TIME,
  MESSAGES,
  UNITS,
  PRIORITY,
  DOCUMENTS,
  PAYMENT_METHODS,
  APP,
  A11Y
};
