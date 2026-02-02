/**
 * Action Suggestions System
 * Generates intelligent action suggestions based on business rules
 *
 * @module actionSuggestions
 */

import type { ReactNode } from 'react';

// ============ TYPES & INTERFACES ============

/**
 * Suggestion types matching business triggers
 */
export type SuggestionType =
  | 'payment_late'
  | 'quote_pending'
  | 'weather_alert'
  | 'low_margin'
  | 'stock_alert';

/**
 * Priority levels for suggestions
 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/**
 * Suggestion interface
 */
export interface Suggestion {
  /** Unique identifier */
  id: string;
  /** Type of suggestion */
  type: SuggestionType;
  /** Priority level */
  priority: SuggestionPriority;
  /** Icon component or element */
  icon: ReactNode;
  /** Main title */
  title: string;
  /** Description text */
  description: string;
  /** Optional value to highlight (e.g., amount) */
  value?: string;
  /** CTA button label */
  ctaLabel: string;
  /** CTA action callback */
  ctaAction: () => void;
  /** Additional metadata for tracking/analytics */
  metadata?: Record<string, unknown>;
}

/**
 * Raw suggestion data (before icon/action injection)
 */
export interface SuggestionData {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  value?: string;
  ctaLabel: string;
  metadata?: Record<string, unknown>;
}

// ============ THRESHOLDS & CONSTANTS ============

/** Days before a payment is considered late */
export const PAYMENT_LATE_DAYS = 60;

/** Days before a quote is considered stale */
export const QUOTE_PENDING_DAYS = 7;

/** Minimum quote amount for high priority */
export const QUOTE_HIGH_VALUE_THRESHOLD = 5000;

/** Rain probability threshold for weather alerts */
export const RAIN_ALERT_THRESHOLD = 70;

/** Weather forecast window in hours */
export const WEATHER_FORECAST_HOURS = 48;

/** Margin threshold for low margin alerts */
export const LOW_MARGIN_THRESHOLD = 15;

/** Target margin for comparison */
export const TARGET_MARGIN = 20;

/** Maximum suggestions to return */
export const MAX_SUGGESTIONS = 3;

/** Cache duration in milliseconds (5 minutes) */
export const CACHE_DURATION_MS = 5 * 60 * 1000;

// ============ DATA INTERFACES ============

/**
 * Invoice/Facture data for suggestion generation
 */
export interface FactureData {
  id: string;
  clientId: string;
  clientName?: string;
  montant: number;
  dateEcheance: string;
  statut: 'brouillon' | 'envoyee' | 'payee' | 'en_retard';
}

/**
 * Devis data for suggestion generation
 */
export interface DevisData {
  id: string;
  clientId: string;
  clientName?: string;
  montantHT: number;
  dateCreation: string;
  statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';
}

/**
 * Chantier data for suggestion generation
 */
export interface ChantierData {
  id: string;
  nom: string;
  clientId: string;
  statut: 'prospect' | 'en_cours' | 'termine' | 'annule';
  type?: 'interieur' | 'exterieur' | 'mixte';
  margeActuelle?: number;
  dateDebut?: string;
  dateFin?: string;
  adresse?: string;
}

/**
 * Stock/Catalogue item data
 */
export interface StockData {
  id: string;
  nom: string;
  stockActuel: number;
  seuilAlerte: number;
  unite: string;
}

/**
 * Weather forecast data
 */
export interface WeatherForecast {
  date: Date;
  rainProbability: number;
  condition: string;
  description: string;
}

/**
 * All data needed for suggestion generation
 */
export interface SuggestionContext {
  factures: FactureData[];
  devis: DevisData[];
  chantiers: ChantierData[];
  stock: StockData[];
  weatherForecasts?: WeatherForecast[];
}

// ============ UTILITY FUNCTIONS ============

/**
 * Calculate days since a date
 * @param dateString - ISO date string
 * @returns Number of days since the date
 */
export function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format currency amount
 * @param amount - Amount in euros
 * @returns Formatted string (e.g., "1 234 €")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 * @param value - Percentage value
 * @returns Formatted string (e.g., "15%")
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Get day name in French
 * @param date - Date object
 * @returns Day name (e.g., "mercredi")
 */
export function getDayNameFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'long' });
}

/**
 * Generate unique ID for suggestion
 * @param type - Suggestion type
 * @param suffix - Optional suffix
 * @returns Unique ID string
 */
export function generateSuggestionId(type: SuggestionType, suffix?: string): string {
  const timestamp = Date.now();
  return suffix ? `${type}_${suffix}_${timestamp}` : `${type}_${timestamp}`;
}

// ============ SUGGESTION GENERATORS ============

/**
 * Generate late payment suggestions
 * Trigger: Invoice unpaid > 60 days
 *
 * @param factures - Invoice data
 * @returns Array of suggestion data
 */
export function generatePaymentLateSuggestions(factures: FactureData[]): SuggestionData[] {
  const lateFactures = factures.filter((f) => {
    if (f.statut === 'payee') return false;
    const days = daysSince(f.dateEcheance);
    return days > PAYMENT_LATE_DAYS;
  });

  if (lateFactures.length === 0) return [];

  const totalAmount = lateFactures.reduce((sum, f) => sum + f.montant, 0);
  const factureIds = lateFactures.map((f) => f.id);

  return [
    {
      id: generateSuggestionId('payment_late', factureIds[0]),
      type: 'payment_late',
      priority: 'high',
      title: 'Action urgente',
      description: `${formatCurrency(totalAmount)} en retard de paiement (${lateFactures.length} facture${lateFactures.length > 1 ? 's' : ''})`,
      value: formatCurrency(totalAmount),
      ctaLabel: 'Relancer maintenant',
      metadata: {
        factureIds,
        totalAmount,
        count: lateFactures.length,
      },
    },
  ];
}

/**
 * Generate pending quote suggestions
 * Trigger: Quote pending > 7 days AND amount > 5000€
 *
 * @param devis - Quote data
 * @returns Array of suggestion data
 */
export function generateQuotePendingSuggestions(devis: DevisData[]): SuggestionData[] {
  const pendingDevis = devis.filter((d) => {
    if (d.statut !== 'envoye') return false;
    const days = daysSince(d.dateCreation);
    return days > QUOTE_PENDING_DAYS && d.montantHT > QUOTE_HIGH_VALUE_THRESHOLD;
  });

  if (pendingDevis.length === 0) return [];

  const totalValue = pendingDevis.reduce((sum, d) => sum + d.montantHT, 0);
  const devisIds = pendingDevis.map((d) => d.id);

  return [
    {
      id: generateSuggestionId('quote_pending', devisIds[0]),
      type: 'quote_pending',
      priority: 'high',
      title: `Relancer ${pendingDevis.length} devis en attente`,
      description: `Valeur potentielle : ${formatCurrency(totalValue)}`,
      value: formatCurrency(totalValue),
      ctaLabel: 'Relancer les devis',
      metadata: {
        devisIds,
        totalValue,
        count: pendingDevis.length,
      },
    },
  ];
}

/**
 * Generate weather alert suggestions
 * Trigger: Rain > 70% in 48h AND outdoor chantiers
 *
 * @param chantiers - Chantier data
 * @param forecasts - Weather forecast data
 * @returns Array of suggestion data
 */
export function generateWeatherAlertSuggestions(
  chantiers: ChantierData[],
  forecasts: WeatherForecast[] = []
): SuggestionData[] {
  // Find forecasts with high rain probability in next 48h
  const alertForecasts = forecasts.filter((f) => {
    const hoursFromNow = (f.date.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursFromNow <= WEATHER_FORECAST_HOURS && f.rainProbability >= RAIN_ALERT_THRESHOLD;
  });

  if (alertForecasts.length === 0) return [];

  // Find outdoor chantiers that are active
  const outdoorChantiers = chantiers.filter(
    (c) => c.statut === 'en_cours' && (c.type === 'exterieur' || c.type === 'mixte')
  );

  if (outdoorChantiers.length === 0) return [];

  // Get the first alert day
  const alertDate = alertForecasts[0].date;
  const dayName = getDayNameFr(alertDate);
  const chantierIds = outdoorChantiers.map((c) => c.id);

  return [
    {
      id: generateSuggestionId('weather_alert', alertDate.toISOString().split('T')[0]),
      type: 'weather_alert',
      priority: 'medium',
      title: `Météo défavorable ${dayName}`,
      description: `${outdoorChantiers.length} chantier${outdoorChantiers.length > 1 ? 's' : ''} extérieur${outdoorChantiers.length > 1 ? 's' : ''} concerné${outdoorChantiers.length > 1 ? 's' : ''}`,
      ctaLabel: 'Voir chantiers',
      metadata: {
        chantierIds,
        alertDate: alertDate.toISOString(),
        rainProbability: alertForecasts[0].rainProbability,
        count: outdoorChantiers.length,
      },
    },
  ];
}

/**
 * Generate low margin suggestions
 * Trigger: Margin < 15% on active chantier
 *
 * @param chantiers - Chantier data
 * @returns Array of suggestion data
 */
export function generateLowMarginSuggestions(chantiers: ChantierData[]): SuggestionData[] {
  const lowMarginChantiers = chantiers.filter(
    (c) =>
      c.statut === 'en_cours' &&
      c.margeActuelle !== undefined &&
      c.margeActuelle < LOW_MARGIN_THRESHOLD
  );

  if (lowMarginChantiers.length === 0) return [];

  // Sort by margin (lowest first) and take the worst one
  const sorted = [...lowMarginChantiers].sort(
    (a, b) => (a.margeActuelle ?? 0) - (b.margeActuelle ?? 0)
  );
  const worst = sorted[0];

  return [
    {
      id: generateSuggestionId('low_margin', worst.id),
      type: 'low_margin',
      priority: 'medium',
      title: `Marge faible sur chantier ${worst.nom}`,
      description: `Marge actuelle : ${formatPercentage(worst.margeActuelle ?? 0)} (objectif ${TARGET_MARGIN}%)`,
      value: formatPercentage(worst.margeActuelle ?? 0),
      ctaLabel: 'Analyser',
      metadata: {
        chantierId: worst.id,
        chantierNom: worst.nom,
        margeActuelle: worst.margeActuelle,
        targetMargin: TARGET_MARGIN,
      },
    },
  ];
}

/**
 * Generate stock alert suggestions
 * Trigger: Stock < threshold AND chantier planned this week
 *
 * @param stock - Stock data
 * @param chantiers - Chantier data
 * @returns Array of suggestion data
 */
export function generateStockAlertSuggestions(
  stock: StockData[],
  chantiers: ChantierData[]
): SuggestionData[] {
  // Find items with critical stock
  const criticalStock = stock.filter((s) => s.stockActuel < s.seuilAlerte);

  if (criticalStock.length === 0) return [];

  // Check if there are active chantiers this week
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const chantiersThisWeek = chantiers.filter((c) => {
    if (c.statut !== 'en_cours' && c.statut !== 'prospect') return false;
    if (!c.dateDebut) return false;

    const startDate = new Date(c.dateDebut);
    return startDate <= weekFromNow;
  });

  if (chantiersThisWeek.length === 0) return [];

  // Take the most critical item (lowest stock relative to threshold)
  const sorted = [...criticalStock].sort(
    (a, b) => a.stockActuel / a.seuilAlerte - b.stockActuel / b.seuilAlerte
  );
  const mostCritical = sorted[0];

  // Estimate needed quantity (simple heuristic)
  const needed = mostCritical.seuilAlerte * 2;

  return [
    {
      id: generateSuggestionId('stock_alert', mostCritical.id),
      type: 'stock_alert',
      priority: 'medium',
      title: `Stock critique : ${mostCritical.nom}`,
      description: `Stock actuel : ${mostCritical.stockActuel} ${mostCritical.unite} (besoin : ${needed} ${mostCritical.unite})`,
      value: `${mostCritical.stockActuel} ${mostCritical.unite}`,
      ctaLabel: 'Commander',
      metadata: {
        produitId: mostCritical.id,
        produitNom: mostCritical.nom,
        stockActuel: mostCritical.stockActuel,
        seuilAlerte: mostCritical.seuilAlerte,
        needed,
        unite: mostCritical.unite,
      },
    },
  ];
}

// ============ MAIN FUNCTION ============

/**
 * Priority weight for sorting
 */
const PRIORITY_WEIGHT: Record<SuggestionPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Generate all suggestions based on context data
 *
 * @param context - All data needed for suggestion generation
 * @returns Array of suggestion data sorted by priority
 */
export function generateSuggestionsFromContext(context: SuggestionContext): SuggestionData[] {
  const { factures, devis, chantiers, stock, weatherForecasts } = context;

  // Generate all suggestions
  const allSuggestions: SuggestionData[] = [
    ...generatePaymentLateSuggestions(factures),
    ...generateQuotePendingSuggestions(devis),
    ...generateWeatherAlertSuggestions(chantiers, weatherForecasts),
    ...generateLowMarginSuggestions(chantiers),
    ...generateStockAlertSuggestions(stock, chantiers),
  ];

  // Sort by priority (high > medium > low)
  const sorted = allSuggestions.sort(
    (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
  );

  // Limit to top 3
  return sorted.slice(0, MAX_SUGGESTIONS);
}

// ============ CACHE MANAGEMENT ============

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: SuggestionData[];
  timestamp: number;
}

/**
 * In-memory cache for suggestions
 */
const suggestionCache = new Map<string, CacheEntry>();

/**
 * Get cached suggestions if valid
 *
 * @param userId - User ID for cache key
 * @returns Cached suggestions or null if expired/missing
 */
export function getCachedSuggestions(userId: string): SuggestionData[] | null {
  const entry = suggestionCache.get(userId);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_DURATION_MS;
  if (isExpired) {
    suggestionCache.delete(userId);
    return null;
  }

  return entry.data;
}

/**
 * Set cached suggestions
 *
 * @param userId - User ID for cache key
 * @param suggestions - Suggestions to cache
 */
export function setCachedSuggestions(userId: string, suggestions: SuggestionData[]): void {
  suggestionCache.set(userId, {
    data: suggestions,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate cache for a user
 *
 * @param userId - User ID to invalidate
 */
export function invalidateSuggestionCache(userId: string): void {
  suggestionCache.delete(userId);
}

/**
 * Clear all cached suggestions
 */
export function clearAllSuggestionCache(): void {
  suggestionCache.clear();
}

// ============ REACT QUERY HELPERS ============

/**
 * Query key factory for suggestions
 */
export const suggestionQueryKeys = {
  all: ['suggestions'] as const,
  user: (userId: string) => ['suggestions', userId] as const,
};

/**
 * Stale time for React Query (matches cache duration)
 */
export const SUGGESTION_STALE_TIME = CACHE_DURATION_MS;

/**
 * Query options for useSuggestions hook
 */
export const suggestionQueryOptions = {
  staleTime: SUGGESTION_STALE_TIME,
  cacheTime: SUGGESTION_STALE_TIME * 2,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
};

// ============ ACTION HANDLERS ============

/**
 * Action handler types for suggestions
 */
export interface SuggestionActionHandlers {
  /** Open relance modal for late payments */
  openRelanceModal: (factureId: string) => void;
  /** Open bulk relance for multiple devis */
  openBulkRelance: (devisIds: string[]) => void;
  /** Navigate to a page/route */
  navigate: (path: string) => void;
  /** Open commande modal for stock */
  openCommandeModal: (produitId: string) => void;
}

/**
 * Create action callback for a suggestion
 *
 * @param suggestion - Suggestion data
 * @param handlers - Action handlers
 * @returns Action callback function
 */
export function createSuggestionAction(
  suggestion: SuggestionData,
  handlers: SuggestionActionHandlers
): () => void {
  const { type, metadata } = suggestion;

  switch (type) {
    case 'payment_late': {
      const factureIds = (metadata?.factureIds as string[]) || [];
      return () => handlers.openRelanceModal(factureIds[0] || '');
    }

    case 'quote_pending': {
      const devisIds = (metadata?.devisIds as string[]) || [];
      return () => handlers.openBulkRelance(devisIds);
    }

    case 'weather_alert': {
      const alertDate = metadata?.alertDate as string;
      const dateParam = alertDate ? `?date=${alertDate.split('T')[0]}` : '';
      return () => handlers.navigate(`/planning${dateParam}`);
    }

    case 'low_margin': {
      const chantierId = metadata?.chantierId as string;
      return () => handlers.navigate(`/chantiers/${chantierId}/rentabilite`);
    }

    case 'stock_alert': {
      const produitId = metadata?.produitId as string;
      return () => handlers.openCommandeModal(produitId || '');
    }

    default:
      return () => {
        console.warn(`Unknown suggestion type: ${type}`);
      };
  }
}

/**
 * Transform suggestion data to full suggestions with icons and actions
 *
 * @param suggestions - Raw suggestion data
 * @param handlers - Action handlers
 * @param iconMap - Map of suggestion types to icon components
 * @returns Full suggestion objects ready for rendering
 */
export function transformSuggestions(
  suggestions: SuggestionData[],
  handlers: SuggestionActionHandlers,
  iconMap: Partial<Record<SuggestionType, ReactNode>>
): Suggestion[] {
  return suggestions.map((s) => ({
    ...s,
    icon: iconMap[s.type] || null,
    ctaAction: createSuggestionAction(s, handlers),
  }));
}

// ============ EXPORTS ============

export default {
  generateSuggestionsFromContext,
  generatePaymentLateSuggestions,
  generateQuotePendingSuggestions,
  generateWeatherAlertSuggestions,
  generateLowMarginSuggestions,
  generateStockAlertSuggestions,
  getCachedSuggestions,
  setCachedSuggestions,
  invalidateSuggestionCache,
  clearAllSuggestionCache,
  createSuggestionAction,
  transformSuggestions,
  suggestionQueryKeys,
  suggestionQueryOptions,
};
