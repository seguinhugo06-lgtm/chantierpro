/**
 * French locale strings — BatiGesti i18n preparation.
 *
 * Usage: import { t } from '../lib/i18n/fr';
 *        <span>{t.nav.dashboard}</span>
 *
 * For now this is a static object. Later, this can be swapped
 * for a dynamic i18n system (react-intl, i18next, etc.).
 */

export const t = {
  // Navigation
  nav: {
    dashboard: 'Tableau de bord',
    devis: 'Devis & Factures',
    chantiers: 'Chantiers',
    planning: 'Planning',
    clients: 'Clients',
    catalogue: 'Catalogue',
    equipe: 'Équipe',
    admin: 'Administratif',
    settings: 'Paramètres',
    profile: 'Mon profil',
  },

  // Actions
  actions: {
    create: 'Créer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    duplicate: 'Dupliquer',
    send: 'Envoyer',
    download: 'Télécharger',
    search: 'Rechercher',
    filter: 'Filtrer',
    close: 'Fermer',
    confirm: 'Confirmer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
  },

  // Devis
  devis: {
    title: 'Devis & Factures',
    newDevis: 'Nouveau devis',
    newFacture: 'Nouvelle facture',
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    signe: 'Signé',
    refuse: 'Refusé',
    facture: 'Facturé',
    payee: 'Payée',
    totalHt: 'Total HT',
    totalTtc: 'Total TTC',
    tva: 'TVA',
    ligne: 'Ligne',
    designation: 'Désignation',
    quantite: 'Quantité',
    prixUnitaire: 'Prix unitaire',
    unite: 'Unité',
  },

  // Clients
  clients: {
    title: 'Clients',
    newClient: 'Nouveau client',
    nom: 'Nom',
    prenom: 'Prénom',
    email: 'Email',
    telephone: 'Téléphone',
    entreprise: 'Entreprise',
    adresse: 'Adresse',
    duplicateWarning: 'Doublon potentiel détecté',
  },

  // Chantiers
  chantiers: {
    title: 'Chantiers',
    newChantier: 'Nouveau chantier',
    enCours: 'En cours',
    termine: 'Terminé',
    planifie: 'Planifié',
    depenses: 'Dépenses',
    rentabilite: 'Rentabilité',
  },

  // Common
  common: {
    loading: 'Chargement…',
    noResults: 'Aucun résultat',
    error: 'Une erreur est survenue',
    success: 'Opération réussie',
    required: 'Ce champ est requis',
    invalidEmail: 'Format email invalide',
    invalidPhone: 'Format téléphone invalide',
    date: 'Date',
    montant: 'Montant',
    statut: 'Statut',
    notes: 'Notes',
  },

  // Toasts
  toast: {
    devisCreated: 'Devis créé avec succès',
    clientAdded: 'Client ajouté !',
    saved: 'Modifications enregistrées',
    deleted: 'Élément supprimé',
    sent: 'Envoyé avec succès',
    error: 'Erreur lors de l\'opération',
    copied: 'Copié dans le presse-papier',
  },

  // Plans
  plans: {
    gratuit: 'Gratuit',
    artisan: 'Artisan',
    equipe: 'Équipe',
    perMonth: '/mois',
    perYear: '/an',
    tryFree: 'Essayer gratuitement',
    upgrade: 'Passer au plan supérieur',
  },
};

export default t;
