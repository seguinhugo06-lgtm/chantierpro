/**
 * Smart Suggestions System
 * Simple rule-based suggestions (IF/THEN logic, no ML)
 *
 * @module lib/suggestions
 */

import supabase, { isDemo } from '../supabaseClient';
import { DEVIS_STATUS, CHANTIER_STATUS } from './constants';

// ============ TYPES ============

/**
 * @typedef {'reminder_devis' | 'low_margin' | 'stock_alert' | 'weather_alert' | 'payment_late'} SuggestionType
 */

/**
 * @typedef {'high' | 'medium' | 'low'} Priority
 */

/**
 * @typedef {Object} SuggestionAction
 * @property {string} label - Action button label
 * @property {string} [route] - Navigation route
 * @property {string} [modalId] - Modal to open
 * @property {Object} [params] - Action parameters
 */

/**
 * @typedef {Object} Suggestion
 * @property {string} id - Unique suggestion ID
 * @property {SuggestionType} type - Suggestion type
 * @property {Priority} priority - Priority level
 * @property {string} title - Suggestion title
 * @property {string} description - Detailed description
 * @property {string} [value] - Monetary value concerned
 * @property {SuggestionAction} action - Primary action
 * @property {boolean} dismissible - Can be dismissed
 * @property {Object} metadata - Additional data
 * @property {Date} createdAt - Creation timestamp
 */

// ============ CONSTANTS ============

/** Suggestion type configurations */
const SUGGESTION_CONFIG = {
  reminder_devis: {
    icon: 'FileText',
    color: '#f97316',
    defaultPriority: 'medium',
  },
  low_margin: {
    icon: 'TrendingDown',
    color: '#ef4444',
    defaultPriority: 'medium',
  },
  stock_alert: {
    icon: 'Package',
    color: '#f59e0b',
    defaultPriority: 'medium',
  },
  weather_alert: {
    icon: 'CloudRain',
    color: '#3b82f6',
    defaultPriority: 'medium',
  },
  payment_late: {
    icon: 'AlertCircle',
    color: '#dc2626',
    defaultPriority: 'high',
  },
};

/** Thresholds for rules */
const THRESHOLDS = {
  DEVIS_AGE_DAYS: 7,
  DEVIS_HIGH_VALUE: 10000,
  DEVIS_MIN_VALUE: 5000,
  MARGIN_LOW_PERCENT: 20,
  MARGIN_CRITICAL_PERCENT: 15,
  MARGIN_COMPARISON_RATIO: 0.7,
  PAYMENT_LATE_DAYS: 60,
  WEATHER_RAIN_THRESHOLD: 70,
  STOCK_CRITICAL_MULTIPLIER: 1.5,
};

// ============ UTILITY FUNCTIONS ============

/**
 * Generate unique ID for suggestion
 * @returns {string}
 */
function generateId() {
  return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate days between two dates
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {number}
 */
function daysBetween(date1, date2 = new Date()) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * Format currency for display
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Get start of week (Monday)
 * @returns {Date}
 */
function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get end of week (Sunday)
 * @returns {Date}
 */
function getEndOfWeek() {
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// ============ RULE FUNCTIONS ============

/**
 * Rule: Reminder for devis waiting too long
 *
 * IF devis.status = 'envoye' OR 'vu'
 * AND age > 7 days
 * AND montant > 5000€
 * THEN suggest relancer
 *
 * @param {Object} data - User data
 * @param {Array} data.devis - All devis
 * @param {Array} data.clients - All clients
 * @returns {Suggestion[]}
 */
function ruleReminderDevis({ devis = [], clients = [] }) {
  const suggestions = [];
  const now = new Date();

  const waitingDevis = devis.filter(d =>
    [DEVIS_STATUS.ENVOYE, DEVIS_STATUS.VU].includes(d.statut) &&
    d.type === 'devis'
  );

  for (const d of waitingDevis) {
    const age = daysBetween(d.date || d.createdAt, now);
    const montant = d.total_ttc || 0;

    if (age > THRESHOLDS.DEVIS_AGE_DAYS && montant >= THRESHOLDS.DEVIS_MIN_VALUE) {
      const client = clients.find(c => c.id === d.client_id);
      const isHighValue = montant >= THRESHOLDS.DEVIS_HIGH_VALUE;

      suggestions.push({
        id: generateId(),
        type: 'reminder_devis',
        priority: isHighValue ? 'high' : 'medium',
        title: 'Relancer le devis',
        description: `Le devis ${d.numero || '#' + d.id?.slice(-6)} pour ${client?.nom || 'client'} attend depuis ${age} jours`,
        value: formatCurrency(montant),
        action: {
          label: 'Relancer',
          route: `/devis/${d.id}`,
          modalId: 'relance-devis',
          params: { devisId: d.id },
        },
        dismissible: true,
        metadata: {
          devisId: d.id,
          clientId: d.client_id,
          clientNom: client?.nom,
          montant,
          age,
          numero: d.numero,
        },
        createdAt: new Date(),
      });
    }
  }

  return suggestions;
}

/**
 * Rule: Low margin detection
 *
 * Calculate margin per chantier type over last 30 days
 * IF type_margin < global_margin * 0.7
 * THEN suggest analyze
 *
 * @param {Object} data - User data
 * @param {Array} data.chantiers - All chantiers
 * @param {Array} data.devis - All devis (for revenue)
 * @param {Array} data.depenses - All expenses
 * @returns {Suggestion[]}
 */
function ruleLowMargin({ chantiers = [], devis = [], depenses = [] }) {
  const suggestions = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Calculate margins per chantier
  const chantierMargins = {};
  let totalRevenue = 0;
  let totalCost = 0;

  for (const chantier of chantiers) {
    if (chantier.statut === CHANTIER_STATUS.ABANDONNE) continue;

    // Revenue from accepted/billed devis
    const chantierDevis = devis.filter(d =>
      d.chantier_id === chantier.id &&
      [DEVIS_STATUS.ACCEPTE, DEVIS_STATUS.FACTURE, DEVIS_STATUS.PAYEE].includes(d.statut)
    );
    const revenue = chantierDevis.reduce((sum, d) => sum + (d.total_ht || 0), 0);

    // Costs from expenses
    const chantierDepenses = depenses.filter(dep => dep.chantierId === chantier.id);
    const cost = chantierDepenses.reduce((sum, dep) => sum + (dep.montant || 0), 0);

    if (revenue > 0) {
      const margin = ((revenue - cost) / revenue) * 100;
      chantierMargins[chantier.id] = {
        chantier,
        revenue,
        cost,
        margin,
        type: chantier.type || 'general',
      };

      totalRevenue += revenue;
      totalCost += cost;
    }
  }

  // Global margin
  const globalMargin = totalRevenue > 0
    ? ((totalRevenue - totalCost) / totalRevenue) * 100
    : 0;

  // Check each chantier
  for (const [chantierId, data] of Object.entries(chantierMargins)) {
    const { chantier, margin, revenue } = data;

    // Skip small chantiers
    if (revenue < 1000) continue;

    // Check if margin is significantly below average
    const isCritical = margin < THRESHOLDS.MARGIN_CRITICAL_PERCENT;
    const isLow = margin < THRESHOLDS.MARGIN_LOW_PERCENT;
    const isBelowAverage = margin < globalMargin * THRESHOLDS.MARGIN_COMPARISON_RATIO;

    if ((isLow || isBelowAverage) && margin < globalMargin) {
      suggestions.push({
        id: generateId(),
        type: 'low_margin',
        priority: isCritical ? 'high' : 'medium',
        title: 'Marge faible détectée',
        description: `Le chantier "${chantier.nom}" a une marge de ${margin.toFixed(1)}% (moyenne: ${globalMargin.toFixed(1)}%)`,
        value: `${margin.toFixed(1)}%`,
        action: {
          label: 'Analyser',
          route: `/chantiers/${chantierId}`,
          params: { chantierId, tab: 'rentabilite' },
        },
        dismissible: true,
        metadata: {
          chantierId,
          chantierNom: chantier.nom,
          margin,
          globalMargin,
          revenue: data.revenue,
          cost: data.cost,
        },
        createdAt: new Date(),
      });
    }
  }

  return suggestions;
}

/**
 * Rule: Stock alert for planned chantiers
 *
 * IF stock.quantite < stock.seuil_critique
 * AND chantier planned this week needs this stock
 * THEN suggest reorder
 *
 * @param {Object} data - User data
 * @param {Array} data.catalogue - Stock items
 * @param {Array} data.chantiers - All chantiers
 * @returns {Suggestion[]}
 */
function ruleStockAlert({ catalogue = [], chantiers = [] }) {
  const suggestions = [];
  const startOfWeek = getStartOfWeek();
  const endOfWeek = getEndOfWeek();

  // Get chantiers planned this week
  const weekChantiers = chantiers.filter(c => {
    if (c.statut !== CHANTIER_STATUS.EN_COURS && c.statut !== CHANTIER_STATUS.PROSPECT) {
      return false;
    }
    const startDate = new Date(c.date_debut);
    return startDate <= endOfWeek && (!c.date_fin || new Date(c.date_fin) >= startOfWeek);
  });

  // Check stock levels
  for (const item of catalogue) {
    const stock = item.stock || item.quantite || 0;
    const seuil = item.seuil_critique || item.seuilAlerte || 5;

    if (stock < seuil) {
      const isZero = stock === 0;

      // Check if any planned chantier might need this
      const affectedChantiers = weekChantiers.filter(c =>
        c.type?.toLowerCase().includes(item.categorie?.toLowerCase()) ||
        item.categorie?.toLowerCase().includes('general')
      );

      suggestions.push({
        id: generateId(),
        type: 'stock_alert',
        priority: isZero ? 'high' : 'medium',
        title: isZero ? 'Stock épuisé' : 'Stock critique',
        description: `${item.nom} : ${stock} unité${stock !== 1 ? 's' : ''} restante${stock !== 1 ? 's' : ''} (seuil: ${seuil})`,
        value: `${stock}/${seuil}`,
        action: {
          label: 'Commander',
          route: '/catalogue',
          modalId: 'commande-stock',
          params: { itemId: item.id },
        },
        dismissible: true,
        metadata: {
          itemId: item.id,
          itemNom: item.nom,
          stock,
          seuil,
          categorie: item.categorie,
          affectedChantiers: affectedChantiers.map(c => c.id),
        },
        createdAt: new Date(),
      });
    }
  }

  return suggestions;
}

/**
 * Rule: Weather alert for outdoor chantiers
 *
 * IF rain probability > 70%
 * AND outdoor chantier planned
 * THEN suggest postpone or prepare
 *
 * @param {Object} data - User data
 * @param {Array} data.chantiers - All chantiers
 * @param {Array} [data.weather] - Weather forecast (7 days)
 * @returns {Suggestion[]}
 */
function ruleWeatherAlert({ chantiers = [], weather = [] }) {
  const suggestions = [];

  // If no weather data, skip this rule
  if (!weather || weather.length === 0) {
    return suggestions;
  }

  const startOfWeek = getStartOfWeek();
  const endOfWeek = getEndOfWeek();

  // Get outdoor chantiers planned this week
  const outdoorChantiers = chantiers.filter(c => {
    if (c.statut !== CHANTIER_STATUS.EN_COURS) return false;

    const startDate = new Date(c.date_debut);
    const isThisWeek = startDate <= endOfWeek && (!c.date_fin || new Date(c.date_fin) >= startOfWeek);

    // Consider outdoor if type contains certain keywords
    const outdoorTypes = ['terrasse', 'jardin', 'facade', 'toiture', 'exterieur', 'outdoor'];
    const isOutdoor = outdoorTypes.some(t =>
      c.type?.toLowerCase().includes(t) ||
      c.nom?.toLowerCase().includes(t) ||
      c.notes?.toLowerCase().includes(t)
    );

    return isThisWeek && isOutdoor;
  });

  // Check weather for bad days
  for (const day of weather) {
    const rainProb = day.precipitation_probability || day.rain || 0;

    if (rainProb >= THRESHOLDS.WEATHER_RAIN_THRESHOLD) {
      for (const chantier of outdoorChantiers) {
        const dateStr = new Date(day.date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });

        suggestions.push({
          id: generateId(),
          type: 'weather_alert',
          priority: 'medium',
          title: 'Météo défavorable',
          description: `Pluie prévue ${dateStr} (${rainProb}%) - Chantier "${chantier.nom}"`,
          action: {
            label: 'Voir planning',
            route: '/planning',
            params: { date: day.date, chantierId: chantier.id },
          },
          dismissible: true,
          metadata: {
            chantierId: chantier.id,
            chantierNom: chantier.nom,
            date: day.date,
            rainProbability: rainProb,
            temperature: day.temperature,
          },
          createdAt: new Date(),
        });
      }
    }
  }

  return suggestions;
}

/**
 * Rule: Payment late detection
 *
 * IF facture.echeance < now() - 60 days
 * THEN suggest urgent relance
 *
 * @param {Object} data - User data
 * @param {Array} data.devis - All devis/factures
 * @param {Array} data.clients - All clients
 * @returns {Suggestion[]}
 */
function rulePaymentLate({ devis = [], clients = [] }) {
  const suggestions = [];
  const now = new Date();

  const unpaidFactures = devis.filter(d =>
    d.type === 'facture' &&
    ![DEVIS_STATUS.PAYEE, DEVIS_STATUS.BROUILLON].includes(d.statut)
  );

  for (const facture of unpaidFactures) {
    // Calculate due date (default 30 days from invoice date)
    let echeance;
    if (facture.date_echeance) {
      echeance = new Date(facture.date_echeance);
    } else if (facture.date) {
      echeance = new Date(facture.date);
      echeance.setDate(echeance.getDate() + 30);
    } else {
      continue;
    }

    const daysLate = daysBetween(echeance, now);

    if (daysLate >= THRESHOLDS.PAYMENT_LATE_DAYS) {
      const client = clients.find(c => c.id === facture.client_id);
      const montant = (facture.total_ttc || 0) - (facture.montant_paye || 0);

      if (montant <= 0) continue;

      suggestions.push({
        id: generateId(),
        type: 'payment_late',
        priority: 'high',
        title: 'Facture en retard critique',
        description: `Facture ${facture.numero || '#' + facture.id?.slice(-6)} impayée depuis ${daysLate} jours`,
        value: formatCurrency(montant),
        action: {
          label: 'Relancer',
          route: `/devis/${facture.id}`,
          modalId: 'relance-facture',
          params: { factureId: facture.id, urgent: true },
        },
        dismissible: false, // Critical alerts not dismissible
        metadata: {
          factureId: facture.id,
          clientId: facture.client_id,
          clientNom: client?.nom,
          montant,
          daysLate,
          echeance: echeance.toISOString(),
          numero: facture.numero,
        },
        createdAt: new Date(),
      });
    }
  }

  return suggestions;
}

// ============ MAIN FUNCTIONS ============

/**
 * Generate all suggestions for a user
 *
 * @param {string} userId - User ID
 * @param {Object} data - User data (clients, devis, chantiers, etc.)
 * @returns {Promise<Suggestion[]>} Sorted suggestions
 *
 * @example
 * const suggestions = await generateSuggestions('user123', {
 *   clients: [...],
 *   devis: [...],
 *   chantiers: [...],
 *   depenses: [...],
 *   catalogue: [...],
 *   weather: [...], // optional
 * });
 */
export async function generateSuggestions(userId, data = {}) {
  const allSuggestions = [];

  // Apply all rules
  try {
    allSuggestions.push(...ruleReminderDevis(data));
  } catch (e) {
    console.warn('Rule reminder_devis failed:', e);
  }

  try {
    allSuggestions.push(...ruleLowMargin(data));
  } catch (e) {
    console.warn('Rule low_margin failed:', e);
  }

  try {
    allSuggestions.push(...ruleStockAlert(data));
  } catch (e) {
    console.warn('Rule stock_alert failed:', e);
  }

  try {
    allSuggestions.push(...ruleWeatherAlert(data));
  } catch (e) {
    console.warn('Rule weather_alert failed:', e);
  }

  try {
    allSuggestions.push(...rulePaymentLate(data));
  } catch (e) {
    console.warn('Rule payment_late failed:', e);
  }

  // Sort by priority (high > medium > low) then by creation date
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  allSuggestions.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return allSuggestions;
}

/**
 * Get suggestion configuration
 * @param {SuggestionType} type
 * @returns {Object}
 */
export function getSuggestionConfig(type) {
  return SUGGESTION_CONFIG[type] || SUGGESTION_CONFIG.reminder_devis;
}

/**
 * Get all suggestion types
 * @returns {string[]}
 */
export function getSuggestionTypes() {
  return Object.keys(SUGGESTION_CONFIG);
}

// ============ STORAGE FUNCTIONS ============

/**
 * Save suggestions to database
 *
 * @param {string} userId
 * @param {Suggestion[]} suggestions
 * @returns {Promise<void>}
 */
export async function saveSuggestions(userId, suggestions) {
  if (isDemo || !supabase) return;

  const records = suggestions.map(s => ({
    user_id: userId,
    type: s.type,
    priority: s.priority,
    title: s.title,
    description: s.description,
    value: s.value,
    action_route: s.action?.route,
    action_modal: s.action?.modalId,
    action_params: s.action?.params,
    metadata: s.metadata,
    dismissible: s.dismissible,
    dismissed: false,
    created_at: s.createdAt.toISOString(),
  }));

  const { error } = await supabase
    .from('ai_suggestions')
    .upsert(records, { onConflict: 'id' });

  if (error) {
    console.error('Error saving suggestions:', error);
  }
}

/**
 * Get saved suggestions from database
 *
 * @param {string} userId
 * @param {Object} [options]
 * @param {boolean} [options.includeDismissed=false]
 * @returns {Promise<Suggestion[]>}
 */
export async function getSavedSuggestions(userId, { includeDismissed = false } = {}) {
  if (isDemo || !supabase) return [];

  let query = supabase
    .from('ai_suggestions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!includeDismissed) {
    query = query.eq('dismissed', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    type: row.type,
    priority: row.priority,
    title: row.title,
    description: row.description,
    value: row.value,
    action: {
      route: row.action_route,
      modalId: row.action_modal,
      params: row.action_params,
    },
    dismissible: row.dismissible,
    dismissed: row.dismissed,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Dismiss a suggestion
 *
 * @param {string} suggestionId
 * @returns {Promise<boolean>}
 */
export async function dismissSuggestion(suggestionId) {
  if (isDemo || !supabase) return true;

  const { error } = await supabase
    .from('ai_suggestions')
    .update({ dismissed: true, dismissed_at: new Date().toISOString() })
    .eq('id', suggestionId);

  return !error;
}

/**
 * Clean up old dismissed suggestions (> 7 days)
 *
 * @param {string} userId
 * @returns {Promise<number>} Number of deleted records
 */
export async function cleanupOldSuggestions(userId) {
  if (isDemo || !supabase) return 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('ai_suggestions')
    .delete()
    .eq('user_id', userId)
    .eq('dismissed', true)
    .lt('dismissed_at', sevenDaysAgo.toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up suggestions:', error);
    return 0;
  }

  return data?.length || 0;
}

// ============ HOOK FOR REACT ============

/**
 * Custom hook to use suggestions in React components
 *
 * @example
 * // In a React component:
 * import { useSuggestions } from '../lib/suggestions';
 *
 * function Dashboard() {
 *   const { suggestions, loading, refresh, dismiss } = useSuggestions(userId, data);
 *   ...
 * }
 *
 * Note: This is a factory function, not a hook itself.
 * Use it to create suggestion state management.
 */
export function createSuggestionsManager(userId, data) {
  let suggestions = [];
  let loading = false;
  let listeners = [];

  const notify = () => listeners.forEach(fn => fn(suggestions, loading));

  return {
    subscribe: (fn) => {
      listeners.push(fn);
      return () => {
        listeners = listeners.filter(l => l !== fn);
      };
    },

    getSuggestions: () => suggestions,

    isLoading: () => loading,

    refresh: async () => {
      loading = true;
      notify();

      try {
        suggestions = await generateSuggestions(userId, data);
        await saveSuggestions(userId, suggestions);
      } catch (e) {
        console.error('Error refreshing suggestions:', e);
      }

      loading = false;
      notify();
      return suggestions;
    },

    dismiss: async (suggestionId) => {
      const success = await dismissSuggestion(suggestionId);
      if (success) {
        suggestions = suggestions.filter(s => s.id !== suggestionId);
        notify();
      }
      return success;
    },

    cleanup: async () => {
      return await cleanupOldSuggestions(userId);
    },
  };
}

// ============ EXPORTS ============

export default {
  generateSuggestions,
  getSuggestionConfig,
  getSuggestionTypes,
  saveSuggestions,
  getSavedSuggestions,
  dismissSuggestion,
  cleanupOldSuggestions,
  createSuggestionsManager,
  SUGGESTION_CONFIG,
  THRESHOLDS,
};
