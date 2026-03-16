/**
 * Stock Alerts System
 * Automatic stock monitoring, predictions, and reorder suggestions
 *
 * @module stockAlerts
 */

import { supabase } from '../supabaseClient';

// ============================================================================
// TYPES (JSDoc)
// ============================================================================

/**
 * @typedef {'urgent' | 'critical' | 'warning'} AlertPriority
 */

/**
 * @typedef {'high' | 'medium' | 'low'} ReorderPriority
 */

/**
 * @typedef {Object} StockAlert
 * @property {string} productId - Product ID
 * @property {string} productName - Product name
 * @property {number} currentQuantity - Current stock quantity
 * @property {number} threshold - Alert threshold
 * @property {AlertPriority} priority - Alert priority level
 * @property {string} message - Human-readable alert message
 * @property {string} unit - Unit of measurement
 * @property {{ label: string, type: string }} action - Suggested action
 */

/**
 * @typedef {Object} StockPrediction
 * @property {string} productId - Product ID
 * @property {string} productName - Product name
 * @property {number} currentStock - Current stock level
 * @property {number} predictedNeed - Predicted quantity needed
 * @property {number} shortfall - Quantity shortage (negative = surplus)
 * @property {string[]} chantiers - List of chantier names needing this product
 * @property {Date} dueDate - When stock will be needed
 */

/**
 * @typedef {Object} ReorderSuggestion
 * @property {string} productId - Product ID
 * @property {string} productName - Product name
 * @property {number} currentStock - Current stock level
 * @property {number} averageConsumption - Average monthly consumption
 * @property {Date} depletionDate - Predicted stock depletion date
 * @property {number} suggestedQuantity - Recommended reorder quantity
 * @property {number} estimatedCost - Estimated cost
 * @property {string} supplier - Preferred supplier
 * @property {ReorderPriority} priority - Reorder urgency
 */

/**
 * @typedef {Object} WasteAlert
 * @property {string} productId - Product ID
 * @property {string} productName - Product name
 * @property {number} quantity - Quantity in stock
 * @property {number} value - Estimated value
 * @property {number} daysDormant - Days since last movement
 * @property {'unused' | 'dormant' | 'excess'} type - Type of waste
 * @property {string} suggestion - Suggested action
 */

/**
 * @typedef {Object} GroupPurchase
 * @property {string} supplier - Supplier name
 * @property {Array<{productId: string, productName: string, quantity: number, unitPrice: number}>} products
 * @property {number} totalWithoutDiscount - Total without group discount
 * @property {number} totalWithDiscount - Total with group discount
 * @property {number} savings - Amount saved
 * @property {number} discountPercent - Discount percentage
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Priority order for sorting alerts */
const PRIORITY_ORDER = {
  urgent: 0,
  critical: 1,
  warning: 2,
};

/** Default thresholds if not set on product */
const DEFAULT_THRESHOLDS = {
  critical: 5,
  reorder: 10,
};

/** Group purchase discount tiers */
const GROUP_DISCOUNTS = [
  { minProducts: 5, discount: 0.05 },
  { minProducts: 10, discount: 0.10 },
  { minProducts: 20, discount: 0.15 },
];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Check stock levels and generate alerts
 *
 * @param {string} userId - User ID to check stock for
 * @returns {Promise<StockAlert[]>} Array of stock alerts sorted by priority
 */
export async function checkStockLevels(userId) {
  if (!supabase) {
    console.warn('[StockAlerts] Supabase not available');
    return [];
  }

  try {
    // Fetch all products with stock info
    const { data: products, error } = await supabase
      .from('catalogue')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'materiau')
      .not('stock_quantite', 'is', null);

    if (error) throw error;
    if (!products || products.length === 0) return [];

    const alerts = [];

    for (const product of products) {
      const quantity = product.stock_quantite || 0;
      const criticalThreshold = product.seuil_critique || DEFAULT_THRESHOLDS.critical;
      const reorderThreshold = product.seuil_reorder || DEFAULT_THRESHOLDS.reorder;
      const unit = product.unite || 'unités';

      // Check for alerts
      if (quantity === 0) {
        alerts.push({
          productId: product.id,
          productName: product.nom,
          currentQuantity: quantity,
          threshold: criticalThreshold,
          priority: 'urgent',
          unit,
          message: `Stock epuise ! "${product.nom}" est en rupture de stock.`,
          action: {
            label: 'Commander maintenant',
            type: 'reorder',
          },
        });
      } else if (quantity <= criticalThreshold) {
        alerts.push({
          productId: product.id,
          productName: product.nom,
          currentQuantity: quantity,
          threshold: criticalThreshold,
          priority: 'critical',
          unit,
          message: `Stock critique ! "${product.nom}" : ${quantity} ${unit} (seuil: ${criticalThreshold})`,
          action: {
            label: 'Commander',
            type: 'reorder',
          },
        });
      } else if (quantity <= reorderThreshold) {
        alerts.push({
          productId: product.id,
          productName: product.nom,
          currentQuantity: quantity,
          threshold: reorderThreshold,
          priority: 'warning',
          unit,
          message: `Stock bas : "${product.nom}" - ${quantity} ${unit} restants`,
          action: {
            label: 'Planifier commande',
            type: 'plan_reorder',
          },
        });
      }
    }

    // Sort by priority
    alerts.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    return alerts;
  } catch (error) {
    console.error('[StockAlerts] Error checking stock levels:', error);
    return [];
  }
}

/**
 * Predict stock needs based on upcoming chantiers
 *
 * @param {string} userId - User ID
 * @param {number} [daysAhead=14] - Number of days to look ahead
 * @returns {Promise<StockPrediction[]>} Array of stock predictions
 */
export async function predictStockNeeds(userId, daysAhead = 14) {
  if (!supabase) {
    console.warn('[StockAlerts] Supabase not available');
    return [];
  }

  try {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Fetch upcoming chantiers
    const { data: chantiers, error: chantiersError } = await supabase
      .from('chantiers')
      .select('id, nom, date_debut')
      .eq('user_id', userId)
      .in('statut', ['planifie', 'en_cours'])
      .gte('date_debut', today.toISOString().split('T')[0])
      .lte('date_debut', futureDate.toISOString().split('T')[0]);

    if (chantiersError) throw chantiersError;
    if (!chantiers || chantiers.length === 0) return [];

    // Fetch devis linked to these chantiers
    const chantierIds = chantiers.map((c) => c.id);
    const { data: devisList, error: devisError } = await supabase
      .from('devis')
      .select('id, chantier_id, lignes')
      .eq('user_id', userId)
      .in('chantier_id', chantierIds)
      .eq('statut', 'accepte');

    if (devisError) throw devisError;

    // Aggregate product needs
    const productNeeds = new Map();

    for (const devis of devisList || []) {
      const chantier = chantiers.find((c) => c.id === devis.chantier_id);
      const lignes = devis.lignes || [];

      for (const ligne of lignes) {
        if (ligne.type === 'materiau' && ligne.catalogue_id) {
          const existing = productNeeds.get(ligne.catalogue_id) || {
            quantity: 0,
            chantiers: new Set(),
            dueDate: null,
          };

          existing.quantity += ligne.quantite || 0;
          existing.chantiers.add(chantier?.nom || 'Chantier inconnu');

          const chantierDate = chantier?.date_debut ? new Date(chantier.date_debut) : null;
          if (chantierDate && (!existing.dueDate || chantierDate < existing.dueDate)) {
            existing.dueDate = chantierDate;
          }

          productNeeds.set(ligne.catalogue_id, existing);
        }
      }
    }

    if (productNeeds.size === 0) return [];

    // Fetch current stock for these products
    const productIds = Array.from(productNeeds.keys());
    const { data: products, error: productsError } = await supabase
      .from('catalogue')
      .select('id, nom, stock_quantite, unite')
      .in('id', productIds);

    if (productsError) throw productsError;

    // Generate predictions
    const predictions = [];

    for (const product of products || []) {
      const needs = productNeeds.get(product.id);
      if (!needs) continue;

      const currentStock = product.stock_quantite || 0;
      const shortfall = needs.quantity - currentStock;

      if (shortfall > 0) {
        predictions.push({
          productId: product.id,
          productName: product.nom,
          currentStock,
          predictedNeed: needs.quantity,
          shortfall,
          chantiers: Array.from(needs.chantiers),
          dueDate: needs.dueDate || new Date(),
          unit: product.unite || 'unités',
        });
      }
    }

    // Sort by due date
    predictions.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return predictions;
  } catch (error) {
    console.error('[StockAlerts] Error predicting stock needs:', error);
    return [];
  }
}

/**
 * Suggest optimal reorder quantity for a product
 *
 * @param {string} productId - Product ID
 * @param {string} userId - User ID
 * @returns {Promise<ReorderSuggestion | null>} Reorder suggestion or null
 */
export async function suggestReorder(productId, userId) {
  if (!supabase) {
    console.warn('[StockAlerts] Supabase not available');
    return null;
  }

  try {
    // Fetch product info
    const { data: product, error: productError } = await supabase
      .from('catalogue')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError) throw productError;
    if (!product) return null;

    // Fetch consumption history (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('quantite, type, created_at')
      .eq('catalogue_id', productId)
      .eq('type', 'sortie')
      .gte('created_at', threeMonthsAgo.toISOString());

    if (movementsError) {
      // Table might not exist, estimate from devis
      console.warn('[StockAlerts] stock_movements table not found, estimating from devis');
    }

    // Calculate average monthly consumption
    let totalConsumption = 0;
    const monthsAnalyzed = 3;

    if (movements && movements.length > 0) {
      totalConsumption = movements.reduce((sum, m) => sum + Math.abs(m.quantite || 0), 0);
    } else {
      // Estimate from devis lignes
      const { data: devisLignes } = await supabase
        .from('devis')
        .select('lignes, created_at')
        .eq('user_id', userId)
        .gte('created_at', threeMonthsAgo.toISOString())
        .in('statut', ['accepte', 'facture', 'payee']);

      for (const devis of devisLignes || []) {
        const lignes = devis.lignes || [];
        for (const ligne of lignes) {
          if (ligne.catalogue_id === productId) {
            totalConsumption += ligne.quantite || 0;
          }
        }
      }
    }

    const averageConsumption = totalConsumption / monthsAnalyzed;
    const currentStock = product.stock_quantite || 0;

    // Calculate depletion date
    let depletionDate = new Date();
    if (averageConsumption > 0) {
      const monthsUntilDepletion = currentStock / averageConsumption;
      depletionDate.setMonth(depletionDate.getMonth() + monthsUntilDepletion);
    } else {
      // No consumption, set far future
      depletionDate.setFullYear(depletionDate.getFullYear() + 1);
    }

    // Calculate suggested quantity (2 months supply + 20% buffer)
    const suggestedQuantity = Math.ceil(averageConsumption * 2 * 1.2);

    // Estimate cost
    const unitPrice = product.prix_achat || product.prix_unitaire || 0;
    const estimatedCost = suggestedQuantity * unitPrice;

    // Determine priority based on depletion date
    const daysUntilDepletion = Math.floor(
      (depletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let priority = 'low';
    if (daysUntilDepletion <= 7) {
      priority = 'high';
    } else if (daysUntilDepletion <= 30) {
      priority = 'medium';
    }

    return {
      productId: product.id,
      productName: product.nom,
      currentStock,
      averageConsumption: Math.round(averageConsumption * 10) / 10,
      depletionDate,
      suggestedQuantity,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      supplier: product.fournisseur || 'Non defini',
      priority,
      unit: product.unite || 'unités',
    };
  } catch (error) {
    console.error('[StockAlerts] Error suggesting reorder:', error);
    return null;
  }
}

/**
 * Detect waste and dormant stock
 *
 * @param {string} userId - User ID
 * @returns {Promise<WasteAlert[]>} Array of waste alerts
 */
export async function detectWaste(userId) {
  if (!supabase) {
    console.warn('[StockAlerts] Supabase not available');
    return [];
  }

  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Fetch all products with stock
    const { data: products, error } = await supabase
      .from('catalogue')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'materiau')
      .gt('stock_quantite', 0);

    if (error) throw error;
    if (!products || products.length === 0) return [];

    const wasteAlerts = [];

    for (const product of products) {
      const quantity = product.stock_quantite || 0;
      const unitPrice = product.prix_achat || product.prix_unitaire || 0;
      const value = quantity * unitPrice;
      const updatedAt = product.updated_at ? new Date(product.updated_at) : new Date();
      const daysDormant = Math.floor(
        (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check for dormant stock (no movement in 6 months)
      if (daysDormant > 180) {
        wasteAlerts.push({
          productId: product.id,
          productName: product.nom,
          quantity,
          value: Math.round(value * 100) / 100,
          daysDormant,
          type: 'dormant',
          suggestion: `Stock dormant depuis ${daysDormant} jours. Considerez: utiliser sur un chantier, vendre, ou retourner au fournisseur.`,
        });
      }

      // Check for excess stock (more than 6 months of typical consumption)
      // This would need consumption data, simplified here
      const criticalThreshold = product.seuil_critique || DEFAULT_THRESHOLDS.critical;
      if (quantity > criticalThreshold * 20) {
        wasteAlerts.push({
          productId: product.id,
          productName: product.nom,
          quantity,
          value: Math.round(value * 100) / 100,
          daysDormant,
          type: 'excess',
          suggestion: `Stock excessif (${quantity} unites). Envisagez de reduire les commandes futures.`,
        });
      }
    }

    // Sort by value (highest first)
    wasteAlerts.sort((a, b) => b.value - a.value);

    return wasteAlerts;
  } catch (error) {
    console.error('[StockAlerts] Error detecting waste:', error);
    return [];
  }
}

/**
 * Find group purchase opportunities
 *
 * @param {string} userId - User ID
 * @returns {Promise<GroupPurchase[]>} Array of group purchase opportunities
 */
export async function groupPurchaseOpportunity(userId) {
  if (!supabase) {
    console.warn('[StockAlerts] Supabase not available');
    return [];
  }

  try {
    // Get all products that need reordering
    const alerts = await checkStockLevels(userId);
    if (alerts.length === 0) return [];

    const productIds = alerts.map((a) => a.productId);

    // Fetch product details with supplier
    const { data: products, error } = await supabase
      .from('catalogue')
      .select('*')
      .in('id', productIds);

    if (error) throw error;
    if (!products || products.length === 0) return [];

    // Group by supplier
    const supplierGroups = new Map();

    for (const product of products) {
      const supplier = product.fournisseur || 'Fournisseur inconnu';
      const existing = supplierGroups.get(supplier) || [];

      // Get reorder suggestion for quantity
      const suggestion = await suggestReorder(product.id, userId);
      const quantity = suggestion?.suggestedQuantity || 10;
      const unitPrice = product.prix_achat || product.prix_unitaire || 0;

      existing.push({
        productId: product.id,
        productName: product.nom,
        quantity,
        unitPrice,
      });

      supplierGroups.set(supplier, existing);
    }

    // Generate group purchase opportunities
    const opportunities = [];

    for (const [supplier, items] of supplierGroups) {
      if (items.length < 2) continue; // Need at least 2 products for group purchase

      const totalWithoutDiscount = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      // Find applicable discount
      let discountPercent = 0;
      for (const tier of GROUP_DISCOUNTS) {
        if (items.length >= tier.minProducts) {
          discountPercent = tier.discount;
        }
      }

      if (discountPercent === 0) continue;

      const totalWithDiscount = totalWithoutDiscount * (1 - discountPercent);
      const savings = totalWithoutDiscount - totalWithDiscount;

      opportunities.push({
        supplier,
        products: items,
        totalWithoutDiscount: Math.round(totalWithoutDiscount * 100) / 100,
        totalWithDiscount: Math.round(totalWithDiscount * 100) / 100,
        savings: Math.round(savings * 100) / 100,
        discountPercent: discountPercent * 100,
      });
    }

    // Sort by savings (highest first)
    opportunities.sort((a, b) => b.savings - a.savings);

    return opportunities;
  } catch (error) {
    console.error('[StockAlerts] Error finding group purchase opportunities:', error);
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get summary of all stock alerts and predictions
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Summary object
 */
export async function getStockSummary(userId) {
  const [alerts, predictions, waste] = await Promise.all([
    checkStockLevels(userId),
    predictStockNeeds(userId),
    detectWaste(userId),
  ]);

  const urgentCount = alerts.filter((a) => a.priority === 'urgent').length;
  const criticalCount = alerts.filter((a) => a.priority === 'critical').length;
  const warningCount = alerts.filter((a) => a.priority === 'warning').length;

  const totalShortfall = predictions.reduce((sum, p) => sum + p.shortfall, 0);
  const dormantValue = waste.reduce((sum, w) => sum + w.value, 0);

  return {
    alerts: {
      total: alerts.length,
      urgent: urgentCount,
      critical: criticalCount,
      warning: warningCount,
      items: alerts.slice(0, 5), // Top 5
    },
    predictions: {
      total: predictions.length,
      totalShortfall,
      items: predictions.slice(0, 5), // Top 5
    },
    waste: {
      total: waste.length,
      dormantValue: Math.round(dormantValue * 100) / 100,
      items: waste.slice(0, 3), // Top 3
    },
    hasIssues: alerts.length > 0 || predictions.length > 0 || waste.length > 0,
  };
}

/**
 * Format currency for display
 *
 * @param {number} amount - Amount in euros
 * @returns {string} Formatted amount
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
}

/**
 * Format date for display
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Get priority color class
 *
 * @param {string} priority - Priority level
 * @returns {string} Tailwind color class
 */
export function getPriorityColor(priority) {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-100';
    case 'critical':
      return 'text-orange-600 bg-orange-100';
    case 'warning':
      return 'text-yellow-600 bg-yellow-100';
    case 'high':
      return 'text-red-600 bg-red-100';
    case 'medium':
      return 'text-orange-600 bg-orange-100';
    case 'low':
      return 'text-green-600 bg-green-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

// ============================================================================
// CRON / SCHEDULED FUNCTIONS
// ============================================================================

/**
 * Daily stock check - to be called by cron job or Edge Function
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Check results
 */
export async function dailyStockCheck(userId) {
  console.log(`[StockAlerts] Running daily check for user ${userId}`);

  const summary = await getStockSummary(userId);

  // Create AI suggestions for urgent/critical alerts
  if (supabase && (summary.alerts.urgent > 0 || summary.alerts.critical > 0)) {
    const urgentAlerts = summary.alerts.items.filter(
      (a) => a.priority === 'urgent' || a.priority === 'critical'
    );

    for (const alert of urgentAlerts) {
      try {
        await supabase.from('ai_suggestions').insert([
          {
            user_id: userId,
            type: 'stock_alert',
            title: `Stock ${alert.priority}: ${alert.productName}`,
            description: alert.message,
            priority: alert.priority === 'urgent' ? 'high' : 'medium',
            data: {
              product_id: alert.productId,
              current_quantity: alert.currentQuantity,
              threshold: alert.threshold,
            },
          },
        ]);
      } catch (err) {
        console.error('[StockAlerts] Error creating suggestion:', err);
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    userId,
    summary,
    suggestionsCreated: summary.alerts.urgent + summary.alerts.critical,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  checkStockLevels,
  predictStockNeeds,
  suggestReorder,
  detectWaste,
  groupPurchaseOpportunity,
  getStockSummary,
  dailyStockCheck,
  formatCurrency,
  formatDate,
  getPriorityColor,
};
