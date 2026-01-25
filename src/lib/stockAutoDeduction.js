/**
 * Stock Auto Deduction System
 * Automatically deducts stock when devis is converted to chantier
 *
 * @module stockAutoDeduction
 */

import { supabase } from '../supabaseClient';

// ============================================================================
// TYPES (JSDoc)
// ============================================================================

/**
 * @typedef {'entree' | 'sortie' | 'ajustement' | 'inventaire'} MovementType
 */

/**
 * @typedef {Object} StockMovement
 * @property {string} id - Movement ID
 * @property {string} catalogue_id - Product ID
 * @property {MovementType} type - Type of movement
 * @property {number} quantite - Quantity (positive for entree, negative for sortie)
 * @property {string} motif - Reason/description
 * @property {string} [devis_id] - Related devis ID
 * @property {string} [chantier_id] - Related chantier ID
 * @property {string} user_id - User ID
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} DeductionResult
 * @property {boolean} success - Whether deduction was successful
 * @property {number} totalDeducted - Total quantity deducted
 * @property {number} totalValue - Total value deducted
 * @property {Array<{productId: string, productName: string, quantity: number, success: boolean, error?: string}>} details
 * @property {string[]} alerts - Any alerts generated
 * @property {string[]} errors - Any errors encountered
 */

/**
 * @typedef {Object} RestockResult
 * @property {boolean} success - Whether restock was successful
 * @property {number} totalRestocked - Total quantity restocked
 * @property {Array<{productId: string, productName: string, quantity: number}>} details
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get user settings for stock auto deduction
 *
 * @param {string} userId - User ID
 * @returns {Promise<{enabled: boolean, allowNegative: boolean}>}
 */
export async function getStockSettings(userId) {
  // Default settings
  const defaults = {
    enabled: true,
    allowNegative: false,
  };

  if (!supabase) return defaults;

  try {
    // Try to get user settings from localStorage or database
    const stored = localStorage.getItem(`stock_settings_${userId}`);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
    return defaults;
  } catch {
    return defaults;
  }
}

/**
 * Save user settings for stock auto deduction
 *
 * @param {string} userId - User ID
 * @param {Object} settings - Settings to save
 */
export function saveStockSettings(userId, settings) {
  try {
    localStorage.setItem(`stock_settings_${userId}`, JSON.stringify(settings));
  } catch (err) {
    console.error('[StockAutoDeduction] Error saving settings:', err);
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Deduct stock based on devis lines
 * Called when devis status changes to 'en_cours' or 'accepte'
 *
 * @param {string} devisId - Devis ID
 * @param {string} userId - User ID
 * @param {Object} [options] - Options
 * @param {boolean} [options.dryRun=false] - If true, don't actually deduct, just calculate
 * @param {boolean} [options.allowNegative=false] - If true, allow negative stock
 * @returns {Promise<DeductionResult>}
 */
export async function deductStockFromDevis(devisId, userId, options = {}) {
  const { dryRun = false, allowNegative = false } = options;

  console.log(`[StockAutoDeduction] ${dryRun ? 'Calculating' : 'Deducting'} stock for devis ${devisId}`);

  const result = {
    success: true,
    totalDeducted: 0,
    totalValue: 0,
    details: [],
    alerts: [],
    errors: [],
  };

  if (!supabase) {
    result.success = false;
    result.errors.push('Database not available');
    return result;
  }

  try {
    // Check if auto deduction is enabled
    const settings = await getStockSettings(userId);
    if (!settings.enabled && !dryRun) {
      console.log('[StockAutoDeduction] Auto deduction disabled for user');
      result.alerts.push('Deduction automatique desactivee dans les parametres');
      return result;
    }

    // Fetch devis with lines
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .select('*, chantier:chantiers(id, nom)')
      .eq('id', devisId)
      .single();

    if (devisError) throw devisError;
    if (!devis) throw new Error('Devis not found');

    const lignes = devis.lignes || [];
    const chantierName = devis.chantier?.nom || `Devis #${devis.numero}`;

    // Check if already deducted
    const { count: existingMovements } = await supabase
      .from('stock_mouvements')
      .select('id', { count: 'exact', head: true })
      .eq('devis_id', devisId)
      .eq('type', 'sortie');

    if (existingMovements && existingMovements > 0 && !dryRun) {
      console.log('[StockAutoDeduction] Stock already deducted for this devis');
      result.alerts.push('Stock deja deduit pour ce devis');
      return result;
    }

    // Filter product lines (not services)
    const productLines = lignes.filter(
      (ligne) =>
        ligne.type === 'materiau' ||
        ligne.type === 'produit' ||
        (ligne.catalogue_id && ligne.type !== 'main_oeuvre' && ligne.type !== 'service')
    );

    if (productLines.length === 0) {
      console.log('[StockAutoDeduction] No product lines to deduct');
      return result;
    }

    // Get all product IDs
    const productIds = productLines
      .map((l) => l.catalogue_id)
      .filter((id) => id);

    if (productIds.length === 0) {
      return result;
    }

    // Fetch current stock for all products
    const { data: products, error: productsError } = await supabase
      .from('catalogue')
      .select('*')
      .in('id', productIds);

    if (productsError) throw productsError;

    const productMap = new Map(products?.map((p) => [p.id, p]) || []);

    // Process each product line
    const movementsToInsert = [];

    for (const ligne of productLines) {
      if (!ligne.catalogue_id) continue;

      const product = productMap.get(ligne.catalogue_id);
      const quantityToDeduct = ligne.quantite || 0;

      if (!product) {
        // Product was deleted
        result.details.push({
          productId: ligne.catalogue_id,
          productName: ligne.designation || 'Produit supprime',
          quantity: quantityToDeduct,
          success: false,
          error: 'Produit non trouve (peut-etre supprime)',
        });
        result.alerts.push(`Produit "${ligne.designation || 'inconnu'}" non trouve dans le catalogue`);
        continue;
      }

      const currentStock = product.stock_quantite || 0;
      const newStock = currentStock - quantityToDeduct;
      const unitPrice = product.prix_achat || product.prix_unitaire || 0;
      const deductionValue = quantityToDeduct * unitPrice;

      // Check if stock is sufficient
      if (newStock < 0 && !allowNegative && !settings.allowNegative) {
        result.details.push({
          productId: product.id,
          productName: product.nom,
          quantity: quantityToDeduct,
          currentStock,
          success: false,
          error: `Stock insuffisant (disponible: ${currentStock}, requis: ${quantityToDeduct})`,
        });
        result.errors.push(
          `Stock insuffisant pour "${product.nom}": ${currentStock} disponibles, ${quantityToDeduct} requis`
        );
        result.success = false;
        continue;
      }

      // Prepare movement record
      movementsToInsert.push({
        produit_id: product.id,
        type: 'sortie',
        quantite: -Math.abs(quantityToDeduct),
        motif: `Chantier: ${chantierName}`,
        devis_id: devisId,
        chantier_id: devis.chantier_id,
        user_id: userId,
        quantite_avant: currentStock,
        quantite_apres: newStock,
      });

      result.details.push({
        productId: product.id,
        productName: product.nom,
        quantity: quantityToDeduct,
        currentStock,
        newStock,
        value: deductionValue,
        success: true,
      });

      result.totalDeducted += quantityToDeduct;
      result.totalValue += deductionValue;

      // Check for critical threshold
      const criticalThreshold = product.seuil_critique || 5;
      if (newStock <= criticalThreshold && newStock > 0) {
        result.alerts.push(
          `Stock bas apres deduction: "${product.nom}" - ${newStock} ${product.unite || 'unites'} restantes`
        );
      } else if (newStock <= 0) {
        result.alerts.push(
          `Rupture de stock: "${product.nom}" sera epuise apres cette deduction`
        );
      }
    }

    // If dry run, don't actually update
    if (dryRun) {
      console.log('[StockAutoDeduction] Dry run complete', result);
      return result;
    }

    // If we have errors and success is false, abort
    if (!result.success && result.errors.length > 0) {
      console.error('[StockAutoDeduction] Aborting due to errors:', result.errors);
      return result;
    }

    // Perform actual deductions
    for (const movement of movementsToInsert) {
      // Update stock quantity
      const { error: updateError } = await supabase
        .from('catalogue')
        .update({
          stock_quantite: movement.stock_apres,
          updated_at: new Date().toISOString(),
        })
        .eq('id', movement.catalogue_id);

      if (updateError) {
        console.error('[StockAutoDeduction] Error updating stock:', updateError);
        result.errors.push(`Erreur mise a jour stock: ${updateError.message}`);
        continue;
      }

      // Insert movement record
      const { error: insertError } = await supabase
        .from('stock_mouvements')
        .insert([{
          produit_id: movement.produit_id,
          type: movement.type,
          quantite: movement.quantite,
          quantite_avant: movement.quantite_avant,
          quantite_apres: movement.quantite_apres,
          motif: movement.motif,
          devis_id: movement.devis_id,
          chantier_id: movement.chantier_id,
          user_id: movement.user_id,
        }]);

      if (insertError) {
        console.error('[StockAutoDeduction] Error inserting movement:', insertError);
        // Don't fail entirely, just log
      }
    }

    // Create alerts for critical stock
    if (result.alerts.length > 0) {
      for (const alertMsg of result.alerts) {
        try {
          await supabase.from('ai_suggestions').insert([{
            user_id: userId,
            type: 'stock_alert',
            title: 'Alerte Stock',
            description: alertMsg,
            priority: alertMsg.includes('Rupture') ? 'high' : 'medium',
            data: { devis_id: devisId },
          }]);
        } catch (err) {
          console.error('[StockAutoDeduction] Error creating alert:', err);
        }
      }
    }

    // Mark devis as stock deducted
    await supabase
      .from('devis')
      .update({ stock_deduit: true, stock_deduit_at: new Date().toISOString() })
      .eq('id', devisId);

    console.log('[StockAutoDeduction] Deduction complete:', {
      totalDeducted: result.totalDeducted,
      totalValue: result.totalValue,
      alertsCount: result.alerts.length,
    });

    return result;
  } catch (error) {
    console.error('[StockAutoDeduction] Error:', error);
    result.success = false;
    result.errors.push(error.message || 'Erreur inconnue');
    return result;
  }
}

/**
 * Restock products when devis is cancelled or reversed
 *
 * @param {string} devisId - Devis ID
 * @param {string} userId - User ID
 * @returns {Promise<RestockResult>}
 */
export async function restockFromDevis(devisId, userId) {
  console.log(`[StockAutoDeduction] Restocking for cancelled devis ${devisId}`);

  const result = {
    success: true,
    totalRestocked: 0,
    details: [],
    errors: [],
  };

  if (!supabase) {
    result.success = false;
    result.errors.push('Database not available');
    return result;
  }

  try {
    // Get all sortie movements for this devis
    const { data: movements, error: movementsError } = await supabase
      .from('stock_mouvements')
      .select('*, catalogue:catalogue!produit_id(*)')
      .eq('devis_id', devisId)
      .eq('type', 'sortie');

    if (movementsError) throw movementsError;
    if (!movements || movements.length === 0) {
      console.log('[StockAutoDeduction] No movements to reverse');
      return result;
    }

    // Fetch devis for motif
    const { data: devis } = await supabase
      .from('devis')
      .select('numero, chantier:chantiers(nom)')
      .eq('id', devisId)
      .single();

    const motif = `Annulation: ${devis?.chantier?.nom || `Devis #${devis?.numero}`}`;

    // Reverse each movement
    for (const movement of movements) {
      const quantityToRestore = Math.abs(movement.quantite);
      const product = movement.catalogue;

      if (!product) continue;

      const currentStock = product.stock_quantite || 0;
      const newStock = currentStock + quantityToRestore;

      // Update stock
      const { error: updateError } = await supabase
        .from('catalogue')
        .update({
          stock_quantite: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (updateError) {
        result.errors.push(`Erreur restock ${product.nom}: ${updateError.message}`);
        continue;
      }

      // Insert reverse movement
      await supabase.from('stock_mouvements').insert([{
        produit_id: product.id,
        type: 'entree',
        quantite: quantityToRestore,
        quantite_avant: currentStock,
        quantite_apres: newStock,
        motif,
        devis_id: devisId,
        user_id: userId,
      }]);

      result.details.push({
        productId: product.id,
        productName: product.nom,
        quantity: quantityToRestore,
      });

      result.totalRestocked += quantityToRestore;
    }

    // Mark devis as not deducted
    await supabase
      .from('devis')
      .update({ stock_deduit: false, stock_deduit_at: null })
      .eq('id', devisId);

    console.log('[StockAutoDeduction] Restock complete:', result);
    return result;
  } catch (error) {
    console.error('[StockAutoDeduction] Restock error:', error);
    result.success = false;
    result.errors.push(error.message || 'Erreur inconnue');
    return result;
  }
}

/**
 * Manual stock adjustment
 *
 * @param {string} catalogueId - Product ID
 * @param {number} quantity - Quantity to adjust (positive or negative)
 * @param {string} motif - Reason for adjustment
 * @param {string} userId - User ID
 * @param {MovementType} [type='ajustement'] - Movement type
 * @returns {Promise<{success: boolean, newStock: number, error?: string}>}
 */
export async function adjustStock(catalogueId, quantity, motif, userId, type = 'ajustement') {
  if (!supabase) {
    return { success: false, newStock: 0, error: 'Database not available' };
  }

  try {
    // Get current stock
    const { data: product, error: productError } = await supabase
      .from('catalogue')
      .select('stock_quantite, nom')
      .eq('id', catalogueId)
      .single();

    if (productError) throw productError;

    const currentStock = product?.stock_quantite || 0;
    const newStock = currentStock + quantity;

    if (newStock < 0) {
      return {
        success: false,
        newStock: currentStock,
        error: `Stock insuffisant (actuel: ${currentStock}, ajustement: ${quantity})`,
      };
    }

    // Update stock
    const { error: updateError } = await supabase
      .from('catalogue')
      .update({
        stock_quantite: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', catalogueId);

    if (updateError) throw updateError;

    // Record movement
    await supabase.from('stock_mouvements').insert([{
      produit_id: catalogueId,
      type,
      quantite: quantity,
      quantite_avant: currentStock,
      quantite_apres: newStock,
      motif,
      user_id: userId,
    }]);

    console.log(`[StockAutoDeduction] Manual adjustment: ${product?.nom} ${quantity > 0 ? '+' : ''}${quantity}`);

    return { success: true, newStock };
  } catch (error) {
    console.error('[StockAutoDeduction] Adjustment error:', error);
    return { success: false, newStock: 0, error: error.message };
  }
}

/**
 * Get stock movements history
 *
 * @param {string} userId - User ID
 * @param {Object} [filters] - Filters
 * @param {string} [filters.catalogueId] - Filter by product
 * @param {string} [filters.chantierId] - Filter by chantier
 * @param {string} [filters.devisId] - Filter by devis
 * @param {MovementType} [filters.type] - Filter by type
 * @param {string} [filters.startDate] - Start date
 * @param {string} [filters.endDate] - End date
 * @param {number} [filters.limit=50] - Max results
 * @param {number} [filters.offset=0] - Offset for pagination
 * @returns {Promise<{data: StockMovement[], count: number}>}
 */
export async function getStockMovements(userId, filters = {}) {
  if (!supabase) {
    return { data: [], count: 0 };
  }

  try {
    let query = supabase
      .from('stock_mouvements')
      .select('*, catalogue:catalogue!produit_id(nom, unite), chantier:chantiers(nom), devis:devis(numero)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.catalogueId) {
      query = query.eq('produit_id', filters.catalogueId);
    }
    if (filters.chantierId) {
      query = query.eq('chantier_id', filters.chantierId);
    }
    if (filters.devisId) {
      query = query.eq('devis_id', filters.devisId);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('[StockAutoDeduction] Error fetching movements:', error);
    return { data: [], count: 0 };
  }
}

/**
 * Export stock movements to CSV
 *
 * @param {string} userId - User ID
 * @param {Object} [filters] - Same filters as getStockMovements
 * @returns {Promise<string>} CSV content
 */
export async function exportMovementsToCSV(userId, filters = {}) {
  const { data } = await getStockMovements(userId, { ...filters, limit: 10000 });

  const headers = ['Date', 'Produit', 'Type', 'Quantite', 'Motif', 'Chantier', 'Devis'];
  const rows = data.map((m) => [
    new Date(m.created_at).toLocaleDateString('fr-FR'),
    m.catalogue?.nom || '',
    m.type,
    m.quantite,
    m.motif || '',
    m.chantier?.nom || '',
    m.devis?.numero || '',
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 *
 * @param {string} csvContent - CSV content
 * @param {string} [filename='stock_mouvements.csv'] - Filename
 */
export function downloadCSV(csvContent, filename = 'stock_mouvements.csv') {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// HOOKS FOR DEVIS STATUS CHANGE
// ============================================================================

/**
 * Handle devis status change
 * Call this when devis.statut changes
 *
 * @param {string} devisId - Devis ID
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} userId - User ID
 * @returns {Promise<DeductionResult | RestockResult | null>}
 */
export async function handleDevisStatusChange(devisId, oldStatus, newStatus, userId) {
  console.log(`[StockAutoDeduction] Devis ${devisId} status: ${oldStatus} -> ${newStatus}`);

  // Deduct when starting work
  if (
    (newStatus === 'accepte' || newStatus === 'en_cours') &&
    !['accepte', 'en_cours', 'facture', 'payee'].includes(oldStatus)
  ) {
    return await deductStockFromDevis(devisId, userId);
  }

  // Restock when cancelled
  if (
    (newStatus === 'annule' || newStatus === 'refuse') &&
    ['accepte', 'en_cours'].includes(oldStatus)
  ) {
    return await restockFromDevis(devisId, userId);
  }

  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  deductStockFromDevis,
  restockFromDevis,
  adjustStock,
  getStockMovements,
  exportMovementsToCSV,
  downloadCSV,
  handleDevisStatusChange,
  getStockSettings,
  saveStockSettings,
};
