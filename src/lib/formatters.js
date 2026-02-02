/**
 * Formatters - Utility functions for consistent formatting
 * Numbers, dates, trends, and text formatting
 * @module formatters
 */

// ============ MONEY FORMATTING ============

/**
 * Formate un montant monétaire en euros
 * @param {number} amount - Montant en euros
 * @param {number} [decimals=0] - Nombre de décimales
 * @returns {string} Montant formaté (ex: "57 060 €")
 */
export function formatMoney(amount, decimals = 0) {
  if (amount == null || isNaN(amount)) return '0 €';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

/**
 * Formate un montant monétaire de manière compacte (K, M)
 * @param {number} amount - Montant en euros
 * @returns {string} Montant formaté (ex: "57K €", "1,2M €")
 */
export function formatMoneyCompact(amount) {
  if (amount == null || isNaN(amount)) return '0 €';

  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1).replace('.', ',')}M €`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${Math.round(amount / 1000)}K €`;
  }
  return formatMoney(amount);
}

// ============ TREND FORMATTING ============

/**
 * Formate un pourcentage de tendance
 * @param {number} value - Valeur du trend (peut être décimal)
 * @param {boolean} [showSign=true] - Afficher le signe +
 * @returns {string} Trend formaté (ex: "+74%")
 */
export function formatTrend(value, showSign = true) {
  if (value == null || isNaN(value)) return '0%';

  const rounded = Math.round(value);
  const sign = showSign && rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

/**
 * Détermine la couleur d'un trend
 * @param {number} value - Valeur du trend
 * @param {boolean} [inverted=false] - Inverser logique (ex: pour dépenses, moins = mieux)
 * @returns {string} Classe Tailwind de couleur
 */
export function getTrendColor(value, inverted = false) {
  if (value == null || value === 0) return 'text-slate-500 dark:text-slate-400';

  const isPositive = inverted ? value < 0 : value > 0;
  return isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';
}

/**
 * Détermine la couleur de fond d'un trend badge
 * @param {number} value - Valeur du trend
 * @param {boolean} [inverted=false] - Inverser logique
 * @returns {string} Classes Tailwind de couleur pour badge
 */
export function getTrendBgColor(value, inverted = false) {
  if (value == null || value === 0) return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

  const isPositive = inverted ? value < 0 : value > 0;
  return isPositive
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

// ============ NUMBER FORMATTING ============

/**
 * Formate un nombre avec espaces de milliers
 * @param {number} value - Nombre à formater
 * @param {number} [decimals=0] - Nombre de décimales
 * @returns {string} Nombre formaté (ex: "1 234")
 */
export function formatNumber(value, decimals = 0) {
  if (value == null || isNaN(value)) return '0';

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Formate un pourcentage
 * @param {number} value - Valeur décimale (0.74 pour 74%) ou valeur entière
 * @param {number} [decimals=0] - Nombre de décimales
 * @param {boolean} [isDecimal=true] - Si true, value est décimale (0.74), sinon entière (74)
 * @returns {string} Pourcentage formaté (ex: "74%")
 */
export function formatPercent(value, decimals = 0, isDecimal = true) {
  if (value == null || isNaN(value)) return '0%';

  if (isDecimal) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  return `${formatNumber(value, decimals)}%`;
}

// ============ DATE FORMATTING ============

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const DAYS_FR = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

/**
 * Formate une date en format lisible
 * @param {Date|string} date - Date à formater
 * @param {string} [format='long'] - Format: 'long' (25 janvier 2026), 'short' (25/01/2026), 'full' (Samedi 25 janvier 2026)
 * @returns {string} Date formatée
 */
export function formatDate(date, format = 'long') {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  const day = dateObj.getDate();
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  const dayOfWeek = dateObj.getDay();

  switch (format) {
    case 'short':
      return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    case 'full':
      return `${DAYS_FR[dayOfWeek]} ${day} ${MONTHS_FR[month]} ${year}`;
    case 'day-month':
      return `${day} ${MONTHS_FR[month]}`;
    case 'weekday':
      return `${DAYS_FR[dayOfWeek]} ${day} ${MONTHS_FR[month]}`;
    case 'long':
    default:
      return `${day} ${MONTHS_FR[month]} ${year}`;
  }
}

/**
 * Formate une date en relatif ("Il y a X jours")
 * @param {Date|string} date - Date à formater
 * @param {boolean} [addSuffix=true] - Ajouter "Il y a"
 * @returns {string} Date relative (ex: "Il y a 7 jours")
 */
export function formatRelativeDate(date, addSuffix = true) {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  let relative;

  if (diffMinutes < 1) {
    relative = "à l'instant";
    return relative;
  } else if (diffMinutes < 60) {
    relative = diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`;
  } else if (diffHours < 24) {
    relative = diffHours === 1 ? '1 heure' : `${diffHours} heures`;
  } else if (diffDays === 0) {
    relative = "aujourd'hui";
    return relative;
  } else if (diffDays === 1) {
    relative = 'hier';
    return relative;
  } else if (diffDays < 7) {
    relative = `${diffDays} jours`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    relative = weeks === 1 ? '1 semaine' : `${weeks} semaines`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    relative = months === 1 ? '1 mois' : `${months} mois`;
  } else {
    const years = Math.floor(diffDays / 365);
    relative = years === 1 ? '1 an' : `${years} ans`;
  }

  return addSuffix ? `Il y a ${relative}` : relative;
}

/**
 * Formate une durée en jours
 * @param {number} days - Nombre de jours
 * @returns {string} Durée formatée (ex: "7 jours", "2 semaines")
 */
export function formatDuration(days) {
  if (days == null || days < 0) return '';

  if (days === 0) return "Aujourd'hui";
  if (days === 1) return '1 jour';
  if (days < 7) return `${days} jours`;
  if (days < 14) return '1 semaine';
  if (days < 30) return `${Math.floor(days / 7)} semaines`;
  if (days < 60) return '1 mois';
  return `${Math.floor(days / 30)} mois`;
}

// ============ GREETING ============

/**
 * Génère une salutation selon l'heure
 * @returns {string} Salutation (ex: "Bonsoir")
 */
export function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  if (hour >= 18 && hour < 23) return 'Bonsoir';
  return 'Bonne nuit';
}

// ============ TEXT FORMATTING ============

/**
 * Tronque un texte avec ellipsis
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Texte tronqué
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Capitalise la première lettre d'un texte
 * @param {string} text - Texte à capitaliser
 * @returns {string} Texte capitalisé
 */
export function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Formate un nom de fichier sécurisé
 * @param {string} name - Nom à formater
 * @returns {string} Nom de fichier sécurisé
 */
export function formatFileName(name) {
  if (!name) return 'document';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============ STATUS FORMATTING ============

const STATUS_LABELS = {
  // Devis
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
  // Factures
  emise: 'Émise',
  payee: 'Payée',
  partiel: 'Partiel',
  impayee: 'Impayée',
  // Chantiers
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
  suspendu: 'Suspendu'
};

const STATUS_COLORS = {
  // Devis
  brouillon: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  envoye: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accepte: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  refuse: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expire: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  // Factures
  emise: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  payee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  partiel: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  impayee: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  // Chantiers
  planifie: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  en_cours: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  termine: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  suspendu: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
};

/**
 * Obtient le label d'un statut
 * @param {string} status - Code du statut
 * @returns {string} Label du statut
 */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] || capitalize(status?.replace(/_/g, ' ') || '');
}

/**
 * Obtient les classes de couleur d'un statut
 * @param {string} status - Code du statut
 * @returns {string} Classes Tailwind
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
}

// ============ PHONE FORMATTING ============

/**
 * Formate un numéro de téléphone français
 * @param {string} phone - Numéro de téléphone
 * @returns {string} Numéro formaté (ex: "06 12 34 56 78")
 */
export function formatPhone(phone) {
  if (!phone) return '';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // French mobile/landline (10 digits)
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  // International format starting with 33
  if (digits.length === 11 && digits.startsWith('33')) {
    return '+33 ' + digits.slice(2).replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  return phone;
}
