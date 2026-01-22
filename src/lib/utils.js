/**
 * Utility functions for ChantierPro
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() if available, fallback for older browsers
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a short unique ID (for display purposes)
 */
export function generateShortId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
}

// ============================================
// CONSTANTS
// ============================================

export const CONSTANTS = {
  // Timeouts & Delays
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  AUTO_SAVE_DELAY: 5000,

  // Business Rules
  DEVIS_VALIDITY_DAYS: 30,
  FACTURE_OVERDUE_DAYS: 30,
  FACTURE_WARNING_DAYS: 15,
  INSURANCE_WARNING_DAYS: 30,
  INSURANCE_ALERT_DAYS: 60,

  // TVA Rates (France BTP)
  TVA_NORMAL: 20,
  TVA_INTERMEDIATE: 10,
  TVA_REDUCED: 5.5,
  TVA_SUPER_REDUCED: 2.1,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // File limits
  MAX_FILE_SIZE_MB: 10,
  MAX_IMAGE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],

  // Date formats
  DATE_FORMAT: 'dd/MM/yyyy',
  DATE_TIME_FORMAT: 'dd/MM/yyyy HH:mm',

  // Locale
  LOCALE: 'fr-FR',
  CURRENCY: 'EUR',
};

// ============================================
// DATE HELPERS
// ============================================

/**
 * Format a date to French locale
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const defaultOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return d.toLocaleDateString(CONSTANTS.LOCALE, { ...defaultOptions, ...options });
}

/**
 * Format a date with time
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString(CONSTANTS.LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get days between two dates
 */
export function daysBetween(date1, date2 = new Date()) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

  const diffTime = d2 - d1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is in the past
 */
export function isPastDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  return d < new Date();
}

// ============================================
// CURRENCY HELPERS
// ============================================

/**
 * Format a number as currency
 */
export function formatCurrency(amount, showSymbol = true) {
  if (amount == null || isNaN(amount)) return showSymbol ? '0,00 €' : '0,00';

  const formatted = new Intl.NumberFormat(CONSTANTS.LOCALE, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: CONSTANTS.CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return formatted;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  // Remove currency symbol and spaces, replace comma with dot
  const cleaned = value.toString()
    .replace(/[€\s]/g, '')
    .replace(',', '.');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safe currency calculation (avoid floating-point errors)
 */
export function calcMoney(amount, operation, value) {
  const a = Math.round(amount * 100);
  const v = Math.round(value * 100);

  switch (operation) {
    case 'add':
      return (a + v) / 100;
    case 'subtract':
      return (a - v) / 100;
    case 'multiply':
      return (a * value) / 100;
    case 'divide':
      return value !== 0 ? (a / value) / 100 : 0;
    default:
      return amount;
  }
}

// ============================================
// STRING HELPERS
// ============================================

/**
 * Truncate text with ellipsis
 */
export function truncate(str, length = 50) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length).trim() + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Slugify a string
 */
export function slugify(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate French phone number
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s.-]/g, '');
  return /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/.test(cleaned);
}

/**
 * Validate SIRET (14 digits)
 */
export function isValidSiret(siret) {
  if (!siret) return false;
  const cleaned = siret.replace(/\s/g, '');
  return /^[0-9]{14}$/.test(cleaned);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s.-]/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
}

// ============================================
// DEBOUNCE / THROTTLE
// ============================================

/**
 * Debounce a function
 */
export function debounce(func, wait = CONSTANTS.DEBOUNCE_DELAY) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ============================================
// ARRAY HELPERS
// ============================================

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Sort array by key
 */
export function sortBy(array, key, order = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Remove duplicates from array
 */
export function unique(array, key) {
  if (!key) return [...new Set(array)];

  const seen = new Set();
  return array.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

/**
 * Safe localStorage get with JSON parsing
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safe localStorage set with JSON stringify
 */
export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Error writing localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Remove localStorage item
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Error removing localStorage key "${key}":`, error);
    return false;
  }
}

// ============================================
// CLASSNAMES HELPER
// ============================================

/**
 * Merge class names with Tailwind CSS deduplication
 * Uses clsx for conditional classes + tailwind-merge for deduplication
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============================================
// LOGGER (Production-safe)
// ============================================

const isDev = import.meta.env?.DEV || process.env?.NODE_ENV === 'development';

/**
 * Production-safe logger
 * Logs are only output in development mode
 */
export const logger = {
  log: (...args) => isDev && console.log('[ChantierPro]', ...args),
  warn: (...args) => isDev && console.warn('[ChantierPro]', ...args),
  error: (...args) => console.error('[ChantierPro]', ...args), // Always log errors
  debug: (...args) => isDev && console.log('[DEBUG]', ...args),
  analytics: (...args) => isDev && console.log('[Analytics]', ...args),
};

export default {
  generateId,
  generateShortId,
  CONSTANTS,
  formatDate,
  formatDateTime,
  daysBetween,
  isPastDate,
  formatCurrency,
  parseCurrency,
  calcMoney,
  truncate,
  capitalize,
  slugify,
  isValidEmail,
  isValidPhone,
  isValidSiret,
  formatPhone,
  debounce,
  throttle,
  groupBy,
  sortBy,
  unique,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  cn,
  logger
};
