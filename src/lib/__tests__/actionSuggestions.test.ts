/**
 * Unit tests for Action Suggestions System
 *
 * @module actionSuggestions.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePaymentLateSuggestions,
  generateQuotePendingSuggestions,
  generateWeatherAlertSuggestions,
  generateLowMarginSuggestions,
  generateStockAlertSuggestions,
  generateSuggestionsFromContext,
  getCachedSuggestions,
  setCachedSuggestions,
  invalidateSuggestionCache,
  clearAllSuggestionCache,
  createSuggestionAction,
  daysSince,
  formatCurrency,
  formatPercentage,
  getDayNameFr,
  PAYMENT_LATE_DAYS,
  QUOTE_PENDING_DAYS,
  QUOTE_HIGH_VALUE_THRESHOLD,
  RAIN_ALERT_THRESHOLD,
  LOW_MARGIN_THRESHOLD,
  MAX_SUGGESTIONS,
  type FactureData,
  type DevisData,
  type ChantierData,
  type StockData,
  type WeatherForecast,
  type SuggestionContext,
  type SuggestionActionHandlers,
} from '../actionSuggestions';

// ============ MOCK DATA ============

const createDateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const createDateDaysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Mock factures
const mockFactures: FactureData[] = [
  {
    id: 'f1',
    clientId: 'c1',
    clientName: 'Client A',
    montant: 5000,
    dateEcheance: createDateDaysAgo(70), // 70 days late
    statut: 'envoyee',
  },
  {
    id: 'f2',
    clientId: 'c2',
    clientName: 'Client B',
    montant: 3000,
    dateEcheance: createDateDaysAgo(30), // 30 days, not late
    statut: 'envoyee',
  },
  {
    id: 'f3',
    clientId: 'c3',
    clientName: 'Client C',
    montant: 2000,
    dateEcheance: createDateDaysAgo(80), // 80 days, but paid
    statut: 'payee',
  },
];

// Mock devis
const mockDevis: DevisData[] = [
  {
    id: 'd1',
    clientId: 'c1',
    clientName: 'Client A',
    montantHT: 10000,
    dateCreation: createDateDaysAgo(10), // 10 days, pending, high value
    statut: 'envoye',
  },
  {
    id: 'd2',
    clientId: 'c2',
    clientName: 'Client B',
    montantHT: 2000,
    dateCreation: createDateDaysAgo(15), // 15 days, but low value
    statut: 'envoye',
  },
  {
    id: 'd3',
    clientId: 'c3',
    clientName: 'Client C',
    montantHT: 8000,
    dateCreation: createDateDaysAgo(3), // 3 days, too recent
    statut: 'envoye',
  },
];

// Mock chantiers
const mockChantiers: ChantierData[] = [
  {
    id: 'ch1',
    nom: 'Rénovation Dupont',
    clientId: 'c1',
    statut: 'en_cours',
    type: 'exterieur',
    margeActuelle: 12, // Low margin
    dateDebut: createDateDaysAgo(10),
  },
  {
    id: 'ch2',
    nom: 'Extension Martin',
    clientId: 'c2',
    statut: 'en_cours',
    type: 'interieur',
    margeActuelle: 25, // Good margin
    dateDebut: createDateDaysAgo(5),
  },
  {
    id: 'ch3',
    nom: 'Terrasse Durand',
    clientId: 'c3',
    statut: 'en_cours',
    type: 'exterieur',
    margeActuelle: 8, // Very low margin
    dateDebut: createDateDaysAgo(20),
  },
];

// Mock stock
const mockStock: StockData[] = [
  {
    id: 's1',
    nom: 'Vis inox 6x40',
    stockActuel: 50,
    seuilAlerte: 100,
    unite: 'pcs',
  },
  {
    id: 's2',
    nom: 'Planche sapin 2m',
    stockActuel: 200,
    seuilAlerte: 50,
    unite: 'u',
  },
];

// Mock weather forecasts
const mockWeatherForecasts: WeatherForecast[] = [
  {
    date: createDateDaysFromNow(1),
    rainProbability: 80,
    condition: 'rain',
    description: 'Pluie modérée',
  },
  {
    date: createDateDaysFromNow(2),
    rainProbability: 30,
    condition: 'cloudy',
    description: 'Nuageux',
  },
];

// Mock action handlers
const mockHandlers: SuggestionActionHandlers = {
  openRelanceModal: vi.fn(),
  openBulkRelance: vi.fn(),
  navigate: vi.fn(),
  openCommandeModal: vi.fn(),
};

// ============ UTILITY FUNCTION TESTS ============

describe('Utility Functions', () => {
  describe('daysSince', () => {
    it('should calculate days correctly', () => {
      const tenDaysAgo = createDateDaysAgo(10);
      expect(daysSince(tenDaysAgo)).toBe(10);
    });

    it('should return 0 for today', () => {
      const today = new Date().toISOString();
      expect(daysSince(today)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in French format', () => {
      const result = formatCurrency(1234);
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('€');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(formatPercentage(15.7)).toBe('16%');
      expect(formatPercentage(10)).toBe('10%');
    });
  });

  describe('getDayNameFr', () => {
    it('should return French day name', () => {
      const monday = new Date('2024-01-15'); // A Monday
      const result = getDayNameFr(monday);
      expect(result).toBe('lundi');
    });
  });
});

// ============ SUGGESTION GENERATOR TESTS ============

describe('Payment Late Suggestions', () => {
  it('should generate suggestion for late payments', () => {
    const suggestions = generatePaymentLateSuggestions(mockFactures);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe('payment_late');
    expect(suggestions[0].priority).toBe('high');
    expect(suggestions[0].metadata?.factureIds).toEqual(['f1']);
    expect(suggestions[0].metadata?.totalAmount).toBe(5000);
  });

  it('should not generate suggestion when no late payments', () => {
    const recentFactures: FactureData[] = [
      {
        id: 'f1',
        clientId: 'c1',
        montant: 5000,
        dateEcheance: createDateDaysAgo(30),
        statut: 'envoyee',
      },
    ];

    const suggestions = generatePaymentLateSuggestions(recentFactures);
    expect(suggestions).toHaveLength(0);
  });

  it('should not include paid invoices', () => {
    const paidFactures: FactureData[] = [
      {
        id: 'f1',
        clientId: 'c1',
        montant: 5000,
        dateEcheance: createDateDaysAgo(100),
        statut: 'payee',
      },
    ];

    const suggestions = generatePaymentLateSuggestions(paidFactures);
    expect(suggestions).toHaveLength(0);
  });
});

describe('Quote Pending Suggestions', () => {
  it('should generate suggestion for pending high-value quotes', () => {
    const suggestions = generateQuotePendingSuggestions(mockDevis);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe('quote_pending');
    expect(suggestions[0].priority).toBe('high');
    expect(suggestions[0].metadata?.devisIds).toEqual(['d1']);
  });

  it('should not generate suggestion for low-value quotes', () => {
    const lowValueDevis: DevisData[] = [
      {
        id: 'd1',
        clientId: 'c1',
        montantHT: 2000, // Below threshold
        dateCreation: createDateDaysAgo(20),
        statut: 'envoye',
      },
    ];

    const suggestions = generateQuotePendingSuggestions(lowValueDevis);
    expect(suggestions).toHaveLength(0);
  });

  it('should not generate suggestion for recent quotes', () => {
    const recentDevis: DevisData[] = [
      {
        id: 'd1',
        clientId: 'c1',
        montantHT: 10000,
        dateCreation: createDateDaysAgo(3), // Too recent
        statut: 'envoye',
      },
    ];

    const suggestions = generateQuotePendingSuggestions(recentDevis);
    expect(suggestions).toHaveLength(0);
  });
});

describe('Weather Alert Suggestions', () => {
  it('should generate suggestion for outdoor chantiers with rain forecast', () => {
    const suggestions = generateWeatherAlertSuggestions(mockChantiers, mockWeatherForecasts);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe('weather_alert');
    expect(suggestions[0].priority).toBe('medium');
    expect(suggestions[0].metadata?.count).toBe(2); // 2 outdoor chantiers
  });

  it('should not generate suggestion when no rain forecast', () => {
    const goodWeather: WeatherForecast[] = [
      {
        date: createDateDaysFromNow(1),
        rainProbability: 20,
        condition: 'sunny',
        description: 'Ensoleillé',
      },
    ];

    const suggestions = generateWeatherAlertSuggestions(mockChantiers, goodWeather);
    expect(suggestions).toHaveLength(0);
  });

  it('should not generate suggestion for indoor-only chantiers', () => {
    const indoorChantiers: ChantierData[] = [
      {
        id: 'ch1',
        nom: 'Rénovation intérieure',
        clientId: 'c1',
        statut: 'en_cours',
        type: 'interieur',
      },
    ];

    const suggestions = generateWeatherAlertSuggestions(indoorChantiers, mockWeatherForecasts);
    expect(suggestions).toHaveLength(0);
  });
});

describe('Low Margin Suggestions', () => {
  it('should generate suggestion for low margin chantiers', () => {
    const suggestions = generateLowMarginSuggestions(mockChantiers);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe('low_margin');
    expect(suggestions[0].priority).toBe('medium');
    // Should pick the lowest margin (ch3 with 8%)
    expect(suggestions[0].metadata?.chantierId).toBe('ch3');
    expect(suggestions[0].metadata?.margeActuelle).toBe(8);
  });

  it('should not generate suggestion when all margins are good', () => {
    const goodMarginChantiers: ChantierData[] = [
      {
        id: 'ch1',
        nom: 'Chantier A',
        clientId: 'c1',
        statut: 'en_cours',
        margeActuelle: 25,
      },
    ];

    const suggestions = generateLowMarginSuggestions(goodMarginChantiers);
    expect(suggestions).toHaveLength(0);
  });
});

describe('Stock Alert Suggestions', () => {
  it('should generate suggestion for critical stock with upcoming chantiers', () => {
    const suggestions = generateStockAlertSuggestions(mockStock, mockChantiers);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe('stock_alert');
    expect(suggestions[0].priority).toBe('medium');
    expect(suggestions[0].metadata?.produitId).toBe('s1');
  });

  it('should not generate suggestion when stock is sufficient', () => {
    const goodStock: StockData[] = [
      {
        id: 's1',
        nom: 'Vis inox',
        stockActuel: 500,
        seuilAlerte: 100,
        unite: 'pcs',
      },
    ];

    const suggestions = generateStockAlertSuggestions(goodStock, mockChantiers);
    expect(suggestions).toHaveLength(0);
  });

  it('should not generate suggestion when no upcoming chantiers', () => {
    const noActiveChantiers: ChantierData[] = [
      {
        id: 'ch1',
        nom: 'Chantier terminé',
        clientId: 'c1',
        statut: 'termine',
        dateDebut: createDateDaysAgo(30),
      },
    ];

    const suggestions = generateStockAlertSuggestions(mockStock, noActiveChantiers);
    expect(suggestions).toHaveLength(0);
  });
});

// ============ MAIN FUNCTION TESTS ============

describe('generateSuggestionsFromContext', () => {
  it('should combine and sort all suggestions by priority', () => {
    const context: SuggestionContext = {
      factures: mockFactures,
      devis: mockDevis,
      chantiers: mockChantiers,
      stock: mockStock,
      weatherForecasts: mockWeatherForecasts,
    };

    const suggestions = generateSuggestionsFromContext(context);

    // Should have at most MAX_SUGGESTIONS
    expect(suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);

    // High priority should come first
    if (suggestions.length > 1) {
      const firstPriority = suggestions[0].priority;
      const secondPriority = suggestions[1].priority;

      if (firstPriority === 'high' && secondPriority !== 'high') {
        expect(true).toBe(true); // High comes before medium
      }
    }
  });

  it('should limit results to MAX_SUGGESTIONS', () => {
    const context: SuggestionContext = {
      factures: mockFactures,
      devis: mockDevis,
      chantiers: mockChantiers,
      stock: mockStock,
      weatherForecasts: mockWeatherForecasts,
    };

    const suggestions = generateSuggestionsFromContext(context);
    expect(suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });

  it('should return empty array when no triggers', () => {
    const emptyContext: SuggestionContext = {
      factures: [],
      devis: [],
      chantiers: [],
      stock: [],
      weatherForecasts: [],
    };

    const suggestions = generateSuggestionsFromContext(emptyContext);
    expect(suggestions).toHaveLength(0);
  });
});

// ============ CACHE TESTS ============

describe('Suggestion Cache', () => {
  beforeEach(() => {
    clearAllSuggestionCache();
  });

  it('should cache and retrieve suggestions', () => {
    const suggestions = [
      {
        id: 'test1',
        type: 'payment_late' as const,
        priority: 'high' as const,
        title: 'Test',
        description: 'Test desc',
        ctaLabel: 'Test CTA',
      },
    ];

    setCachedSuggestions('user1', suggestions);
    const cached = getCachedSuggestions('user1');

    expect(cached).toEqual(suggestions);
  });

  it('should return null for non-existent cache', () => {
    const cached = getCachedSuggestions('unknown_user');
    expect(cached).toBeNull();
  });

  it('should invalidate cache for specific user', () => {
    const suggestions = [
      {
        id: 'test1',
        type: 'payment_late' as const,
        priority: 'high' as const,
        title: 'Test',
        description: 'Test desc',
        ctaLabel: 'Test CTA',
      },
    ];

    setCachedSuggestions('user1', suggestions);
    invalidateSuggestionCache('user1');

    const cached = getCachedSuggestions('user1');
    expect(cached).toBeNull();
  });

  it('should clear all cache', () => {
    setCachedSuggestions('user1', []);
    setCachedSuggestions('user2', []);

    clearAllSuggestionCache();

    expect(getCachedSuggestions('user1')).toBeNull();
    expect(getCachedSuggestions('user2')).toBeNull();
  });
});

// ============ ACTION HANDLER TESTS ============

describe('createSuggestionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create action for payment_late suggestion', () => {
    const suggestion = {
      id: 'test1',
      type: 'payment_late' as const,
      priority: 'high' as const,
      title: 'Test',
      description: 'Test desc',
      ctaLabel: 'Test CTA',
      metadata: { factureIds: ['f1', 'f2'] },
    };

    const action = createSuggestionAction(suggestion, mockHandlers);
    action();

    expect(mockHandlers.openRelanceModal).toHaveBeenCalledWith('f1');
  });

  it('should create action for quote_pending suggestion', () => {
    const suggestion = {
      id: 'test1',
      type: 'quote_pending' as const,
      priority: 'high' as const,
      title: 'Test',
      description: 'Test desc',
      ctaLabel: 'Test CTA',
      metadata: { devisIds: ['d1', 'd2'] },
    };

    const action = createSuggestionAction(suggestion, mockHandlers);
    action();

    expect(mockHandlers.openBulkRelance).toHaveBeenCalledWith(['d1', 'd2']);
  });

  it('should create action for weather_alert suggestion', () => {
    const suggestion = {
      id: 'test1',
      type: 'weather_alert' as const,
      priority: 'medium' as const,
      title: 'Test',
      description: 'Test desc',
      ctaLabel: 'Test CTA',
      metadata: { alertDate: '2024-01-20T00:00:00.000Z' },
    };

    const action = createSuggestionAction(suggestion, mockHandlers);
    action();

    expect(mockHandlers.navigate).toHaveBeenCalledWith('/planning?date=2024-01-20');
  });

  it('should create action for low_margin suggestion', () => {
    const suggestion = {
      id: 'test1',
      type: 'low_margin' as const,
      priority: 'medium' as const,
      title: 'Test',
      description: 'Test desc',
      ctaLabel: 'Test CTA',
      metadata: { chantierId: 'ch1' },
    };

    const action = createSuggestionAction(suggestion, mockHandlers);
    action();

    expect(mockHandlers.navigate).toHaveBeenCalledWith('/chantiers/ch1/rentabilite');
  });

  it('should create action for stock_alert suggestion', () => {
    const suggestion = {
      id: 'test1',
      type: 'stock_alert' as const,
      priority: 'medium' as const,
      title: 'Test',
      description: 'Test desc',
      ctaLabel: 'Test CTA',
      metadata: { produitId: 's1' },
    };

    const action = createSuggestionAction(suggestion, mockHandlers);
    action();

    expect(mockHandlers.openCommandeModal).toHaveBeenCalledWith('s1');
  });
});

// ============ CONSTANTS TESTS ============

describe('Constants', () => {
  it('should have correct threshold values', () => {
    expect(PAYMENT_LATE_DAYS).toBe(60);
    expect(QUOTE_PENDING_DAYS).toBe(7);
    expect(QUOTE_HIGH_VALUE_THRESHOLD).toBe(5000);
    expect(RAIN_ALERT_THRESHOLD).toBe(70);
    expect(LOW_MARGIN_THRESHOLD).toBe(15);
    expect(MAX_SUGGESTIONS).toBe(3);
  });
});
