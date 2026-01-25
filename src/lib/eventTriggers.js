/**
 * Event Triggers System
 * Handles automatic notifications based on database events
 *
 * Two modes:
 * 1. Real-time: Supabase Database Webhooks → Edge Functions (recommended)
 * 2. Polling: Cron job checking for changes (fallback)
 *
 * @module eventTriggers
 */

import { supabase } from '../supabaseClient';
import CommunicationsService from '../services/CommunicationsService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Polling interval in milliseconds (fallback mode)
  pollingInterval: 5 * 60 * 1000, // 5 minutes
  // Photo recap threshold
  photoRecapThreshold: 5,
  // Enable/disable specific triggers
  triggers: {
    devisCreated: true,
    devisStatusChanged: true,
    chantierStarted: true,
    chantierCompleted: true,
    factureCreated: true,
    paymentReceived: true,
    photoUploaded: true,
  },
};

// ============================================================================
// TYPES (JSDoc)
// ============================================================================

/**
 * @typedef {'devis_created' | 'devis_status_changed' | 'chantier_started' | 'chantier_completed' | 'facture_created' | 'payment_received' | 'photo_uploaded'} EventType
 */

/**
 * @typedef {Object} EventLog
 * @property {string} id
 * @property {EventType} event_type
 * @property {string} entity_type
 * @property {string} entity_id
 * @property {Object} [old_data]
 * @property {Object} [new_data]
 * @property {boolean} success
 * @property {string} [error_message]
 * @property {string} triggered_at
 */

/**
 * @typedef {Object} TriggerResult
 * @property {boolean} success
 * @property {string} [error]
 * @property {Object} [data]
 */

// ============================================================================
// EVENT LOGGING
// ============================================================================

/**
 * Log an event to the events_log table
 * @param {EventType} eventType - Type of event
 * @param {string} entityType - Entity type (devis, chantier, etc.)
 * @param {string} entityId - Entity ID
 * @param {boolean} success - Whether the event was processed successfully
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<string|null>} Log ID
 */
async function logEvent(eventType, entityType, entityId, success, metadata = {}) {
  try {
    if (!supabase) {
      console.log(`[DEMO] Event logged: ${eventType} for ${entityType}:${entityId}`);
      return 'demo-log-id';
    }

    const { data, error } = await supabase
      .from('events_log')
      .insert([{
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        success,
        metadata,
        error_message: metadata.error || null,
        triggered_at: new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Failed to log event:', error);
    return null;
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle devis created event
 * @param {Object} record - The created devis record
 * @returns {Promise<TriggerResult>}
 */
export async function onDevisCreated(record) {
  if (!CONFIG.triggers.devisCreated) {
    return { success: true, data: { skipped: true } };
  }

  console.log(`[EVENT] Devis created: ${record.id}, status: ${record.statut}`);

  try {
    // Only notify if already sent
    if (record.statut === 'envoye') {
      const result = await CommunicationsService.notifyDevisEnvoye(record.id);
      await logEvent('devis_created', 'devis', record.id, true, {
        notified: true,
        sms: result.sms.success,
        email: result.email.success
      });
      return { success: true, data: result };
    }

    await logEvent('devis_created', 'devis', record.id, true, { notified: false });
    return { success: true, data: { notified: false } };

  } catch (error) {
    console.error('Error in onDevisCreated:', error);
    await logEvent('devis_created', 'devis', record.id, false, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Handle devis status changed event
 * @param {Object} oldRecord - Previous record state
 * @param {Object} newRecord - New record state
 * @returns {Promise<TriggerResult>}
 */
export async function onDevisStatusChanged(oldRecord, newRecord) {
  if (!CONFIG.triggers.devisStatusChanged) {
    return { success: true, data: { skipped: true } };
  }

  const oldStatus = oldRecord?.statut;
  const newStatus = newRecord.statut;

  console.log(`[EVENT] Devis status changed: ${newRecord.id}, ${oldStatus} → ${newStatus}`);

  try {
    const results = {};

    // Status: envoye → Send notification
    if (oldStatus !== 'envoye' && newStatus === 'envoye') {
      results.notification = await CommunicationsService.notifyDevisEnvoye(newRecord.id);
    }

    // Status: accepte → Send confirmation + create suggestion
    if (oldStatus !== 'accepte' && newStatus === 'accepte') {
      results.notification = await CommunicationsService.notifyDevisAccepte(newRecord.id);

      // Create suggestion to convert to invoice
      if (supabase) {
        await supabase.from('ai_suggestions').insert([{
          user_id: newRecord.user_id,
          type: 'convert_to_invoice',
          title: 'Convertir le devis en facture',
          description: `Le devis #${newRecord.numero} a été accepté. Créez la facture pour démarrer les travaux.`,
          priority: 'high',
          data: { devis_id: newRecord.id, devis_numero: newRecord.numero },
        }]);
        results.suggestionCreated = true;
      }
    }

    await logEvent('devis_status_changed', 'devis', newRecord.id, true, {
      old_status: oldStatus,
      new_status: newStatus,
      ...results,
    });

    return { success: true, data: results };

  } catch (error) {
    console.error('Error in onDevisStatusChanged:', error);
    await logEvent('devis_status_changed', 'devis', newRecord.id, false, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Handle chantier started event
 * @param {Object} oldRecord - Previous record state
 * @param {Object} newRecord - New record state
 * @returns {Promise<TriggerResult>}
 */
export async function onChantierStarted(oldRecord, newRecord) {
  if (!CONFIG.triggers.chantierStarted) {
    return { success: true, data: { skipped: true } };
  }

  // Only trigger if status changed to 'en_cours'
  if (oldRecord?.statut === 'en_cours' || newRecord.statut !== 'en_cours') {
    return { success: true, data: { skipped: true, reason: 'not_started' } };
  }

  console.log(`[EVENT] Chantier started: ${newRecord.id}`);

  try {
    const result = await CommunicationsService.notifyChantierDemarre(newRecord.id);

    await logEvent('chantier_started', 'chantier', newRecord.id, true, {
      sms: result.sms.success,
      email: result.email.success,
    });

    return { success: true, data: result };

  } catch (error) {
    console.error('Error in onChantierStarted:', error);
    await logEvent('chantier_started', 'chantier', newRecord.id, false, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Handle chantier completed event
 * @param {Object} oldRecord - Previous record state
 * @param {Object} newRecord - New record state
 * @returns {Promise<TriggerResult>}
 */
export async function onChantierCompleted(oldRecord, newRecord) {
  if (!CONFIG.triggers.chantierCompleted) {
    return { success: true, data: { skipped: true } };
  }

  // Only trigger if status changed to 'termine'
  if (oldRecord?.statut === 'termine' || newRecord.statut !== 'termine') {
    return { success: true, data: { skipped: true, reason: 'not_completed' } };
  }

  console.log(`[EVENT] Chantier completed: ${newRecord.id}`);

  try {
    const results = {};

    // Send notification
    results.notification = await CommunicationsService.notifyChantierTermine(newRecord.id);

    // Create suggestion for final invoice
    if (supabase) {
      await supabase.from('ai_suggestions').insert([{
        user_id: newRecord.user_id,
        type: 'create_final_invoice',
        title: 'Créer la facture finale',
        description: `Le chantier "${newRecord.nom}" est terminé. N'oubliez pas de facturer le solde.`,
        priority: 'high',
        data: { chantier_id: newRecord.id, chantier_nom: newRecord.nom },
      }]);
      results.suggestionCreated = true;
    }

    await logEvent('chantier_completed', 'chantier', newRecord.id, true, results);

    return { success: true, data: results };

  } catch (error) {
    console.error('Error in onChantierCompleted:', error);
    await logEvent('chantier_completed', 'chantier', newRecord.id, false, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Handle facture created event
 * @param {Object} record - The created facture record
 * @returns {Promise<TriggerResult>}
 */
export async function onFactureCreated(record) {
  if (!CONFIG.triggers.factureCreated) {
    return { success: true, data: { skipped: true } };
  }

  // Only process factures (not devis)
  if (record.type !== 'facture') {
    return { success: true, data: { skipped: true, reason: 'not_facture' } };
  }

  console.log(`[EVENT] Facture created: ${record.id}, status: ${record.statut}`);

  try {
    // Notify if sent
    if (record.statut === 'envoye' || record.statut === 'en_attente') {
      const result = await CommunicationsService.notifyFactureEnvoyee(record.id);
      await logEvent('facture_created', 'facture', record.id, true, {
        notified: true,
        sms: result.sms.success,
        email: result.email.success,
      });
      return { success: true, data: result };
    }

    await logEvent('facture_created', 'facture', record.id, true, { notified: false });
    return { success: true, data: { notified: false } };

  } catch (error) {
    console.error('Error in onFactureCreated:', error);
    await logEvent('facture_created', 'facture', record.id, false, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Handle payment received event
 * @param {Object} oldRecord - Previous record state
 * @param {Object} newRecord - New record state
 * @returns {Promise<TriggerResult>}
 */
export async function onPaymentReceived(oldRecord, newRecord) {
  if (!CONFIG.triggers.paymentReceived) {
    return { success: true, data: { skipped: true } };
  }

  // Only trigger if status changed to 'payee'
  if (oldRecord?.statut === 'payee' || newRecord.statut !== 'payee') {
    return { success: true, data: { skipped: true, reason: 'not_paid' } };
  }

  console.log(`[EVENT] Payment received: ${newRecord.id}`);

  try {
    const result = await CommunicationsService.notifyPaiementRecu(newRecord.id);

    await logEvent('payment_received', 'facture', newRecord.id, true, {
      sms: result.sms.success,
      email: result.email.success,
    });

    return { success: true, data: result };

  } catch (error) {
    console.error('Error in onPaymentReceived:', error);
    await logEvent('payment_received', 'facture', newRecord.id, false, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Handle photo uploaded event
 * @param {Object} record - The uploaded photo record
 * @returns {Promise<TriggerResult>}
 */
export async function onPhotoUploaded(record) {
  if (!CONFIG.triggers.photoUploaded) {
    return { success: true, data: { skipped: true } };
  }

  console.log(`[EVENT] Photo uploaded: ${record.id} for chantier ${record.chantier_id}`);

  try {
    const results = {};

    // Update chantier last_photo_at
    if (supabase) {
      await supabase
        .from('chantiers')
        .update({ last_photo_at: new Date().toISOString() })
        .eq('id', record.chantier_id);
      results.chantierUpdated = true;
    }

    // Check if we should send a photo recap
    if (supabase) {
      const { count } = await supabase
        .from('chantier_photos')
        .select('id', { count: 'exact', head: true })
        .eq('chantier_id', record.chantier_id);

      if (count && count % CONFIG.photoRecapThreshold === 0) {
        // Get chantier with client
        const { data: chantier } = await supabase
          .from('chantiers')
          .select('*, client:clients(*)')
          .eq('id', record.chantier_id)
          .single();

        if (chantier?.client?.email) {
          const portalLink = `${import.meta.env.VITE_APP_URL || 'https://app.chantierpro.fr'}/portal/chantier/${record.chantier_id}/photos`;

          await CommunicationsService.sendEmail(
            chantier.client.email,
            `${count} photos de votre chantier "${chantier.nom}"`,
            `
              <h2>Bonjour ${chantier.client.nom || ''} !</h2>
              <p>Nous avons ajouté de nouvelles photos de l'avancement de votre chantier.</p>
              <div class="highlight">
                <p><strong>${chantier.nom}</strong></p>
                <p>${count} photos disponibles</p>
              </div>
              <center>
                <a href="${portalLink}" class="btn">Voir les photos</a>
              </center>
            `,
            { userId: chantier.user_id, clientId: chantier.client.id }
          );
          results.recapSent = true;
          results.photoCount = count;
        }
      }
    }

    await logEvent('photo_uploaded', 'chantier_photo', record.id, true, results);

    return { success: true, data: results };

  } catch (error) {
    console.error('Error in onPhotoUploaded:', error);
    await logEvent('photo_uploaded', 'chantier_photo', record.id, false, { error: error.message });
    return { success: false, error: error.message };
  }
}

// ============================================================================
// WEBHOOK HANDLER (for Edge Functions)
// ============================================================================

/**
 * Handle incoming webhook from Supabase
 * @param {Object} payload - Webhook payload
 * @param {string} payload.type - Event type (INSERT, UPDATE, DELETE)
 * @param {string} payload.table - Table name
 * @param {Object} payload.record - New record
 * @param {Object} [payload.old_record] - Old record (for UPDATE)
 * @returns {Promise<TriggerResult>}
 */
export async function handleWebhook(payload) {
  const { type, table, record, old_record } = payload;

  console.log(`[WEBHOOK] ${type} on ${table}`, record?.id);

  try {
    switch (table) {
      case 'devis':
        if (type === 'INSERT') {
          return await onDevisCreated(record);
        } else if (type === 'UPDATE') {
          // Check if it's a facture payment
          if (record.type === 'facture' && old_record?.statut !== 'payee' && record.statut === 'payee') {
            return await onPaymentReceived(old_record, record);
          }
          // Check if facture created (type changed)
          if (old_record?.type !== 'facture' && record.type === 'facture') {
            return await onFactureCreated(record);
          }
          // Status change
          if (old_record?.statut !== record.statut) {
            return await onDevisStatusChanged(old_record, record);
          }
        }
        break;

      case 'chantiers':
        if (type === 'UPDATE') {
          if (record.statut === 'en_cours' && old_record?.statut !== 'en_cours') {
            return await onChantierStarted(old_record, record);
          }
          if (record.statut === 'termine' && old_record?.statut !== 'termine') {
            return await onChantierCompleted(old_record, record);
          }
        }
        break;

      case 'chantier_photos':
        if (type === 'INSERT') {
          return await onPhotoUploaded(record);
        }
        break;

      default:
        console.log(`[WEBHOOK] Unhandled table: ${table}`);
    }

    return { success: true, data: { handled: false } };

  } catch (error) {
    console.error('[WEBHOOK] Error handling webhook:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// POLLING SYSTEM (Fallback)
// ============================================================================

let pollingInterval = null;
let lastPollTime = new Date().toISOString();

/**
 * Start the polling system (fallback when webhooks unavailable)
 */
export function startPolling() {
  if (pollingInterval) {
    console.log('[POLLING] Already running');
    return;
  }

  console.log('[POLLING] Starting polling system...');

  pollingInterval = setInterval(async () => {
    await pollForChanges();
  }, CONFIG.pollingInterval);

  // Initial poll
  pollForChanges();
}

/**
 * Stop the polling system
 */
export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[POLLING] Stopped');
  }
}

/**
 * Poll for database changes
 */
async function pollForChanges() {
  if (!supabase) {
    console.log('[POLLING] Demo mode - skipping');
    return;
  }

  const now = new Date().toISOString();
  console.log(`[POLLING] Checking for changes since ${lastPollTime}`);

  try {
    // Check for devis changes
    const { data: changedDevis } = await supabase
      .from('devis')
      .select('*')
      .gt('updated_at', lastPollTime)
      .order('updated_at', { ascending: true });

    for (const devis of changedDevis || []) {
      // Check if notification needed
      if (devis.statut === 'envoye' && !devis.notification_sent) {
        await onDevisCreated(devis);
      }
    }

    // Check for chantier changes
    const { data: changedChantiers } = await supabase
      .from('chantiers')
      .select('*')
      .gt('updated_at', lastPollTime)
      .order('updated_at', { ascending: true });

    for (const chantier of changedChantiers || []) {
      // We don't have old_record in polling, so we check for unprocessed events
      // This is less accurate than webhooks
      if (chantier.statut === 'en_cours') {
        const { count } = await supabase
          .from('events_log')
          .select('id', { count: 'exact', head: true })
          .eq('entity_id', chantier.id)
          .eq('event_type', 'chantier_started');

        if (count === 0) {
          await onChantierStarted(null, chantier);
        }
      }
    }

    lastPollTime = now;

  } catch (error) {
    console.error('[POLLING] Error:', error);
  }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS (Alternative to webhooks)
// ============================================================================

let subscriptions = [];

/**
 * Setup real-time subscriptions for events
 */
export function setupRealtimeSubscriptions() {
  if (!supabase) {
    console.log('[REALTIME] Demo mode - skipping');
    return;
  }

  console.log('[REALTIME] Setting up subscriptions...');

  // Devis changes
  const devisSubscription = supabase
    .channel('devis-events')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'devis',
    }, async (payload) => {
      await handleWebhook({
        type: payload.eventType.toUpperCase(),
        table: 'devis',
        record: payload.new,
        old_record: payload.old,
      });
    })
    .subscribe();

  // Chantiers changes
  const chantiersSubscription = supabase
    .channel('chantiers-events')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chantiers',
    }, async (payload) => {
      await handleWebhook({
        type: 'UPDATE',
        table: 'chantiers',
        record: payload.new,
        old_record: payload.old,
      });
    })
    .subscribe();

  // Photos changes
  const photosSubscription = supabase
    .channel('photos-events')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chantier_photos',
    }, async (payload) => {
      await handleWebhook({
        type: 'INSERT',
        table: 'chantier_photos',
        record: payload.new,
      });
    })
    .subscribe();

  subscriptions = [devisSubscription, chantiersSubscription, photosSubscription];

  console.log('[REALTIME] Subscriptions active');
}

/**
 * Cleanup real-time subscriptions
 */
export function cleanupRealtimeSubscriptions() {
  subscriptions.forEach(sub => {
    supabase?.removeChannel(sub);
  });
  subscriptions = [];
  console.log('[REALTIME] Subscriptions cleaned up');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Event handlers
  onDevisCreated,
  onDevisStatusChanged,
  onChantierStarted,
  onChantierCompleted,
  onFactureCreated,
  onPaymentReceived,
  onPhotoUploaded,
  // Webhook handler
  handleWebhook,
  // Polling
  startPolling,
  stopPolling,
  // Realtime
  setupRealtimeSubscriptions,
  cleanupRealtimeSubscriptions,
  // Config
  CONFIG,
};
