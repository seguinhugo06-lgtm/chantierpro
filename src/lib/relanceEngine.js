/**
 * relanceEngine.js — Client-side detection and execution engine for relances
 * Interfaces with Supabase directly. Used as fallback when Edge Function is unavailable.
 * @module relanceEngine
 */

import { supabase, isDemo } from '../supabaseClient';
import { sendEmail, sendSMS } from '../services/CommunicationsService';
import {
  isDocumentEligible,
  getNextStep,
  resolveVariables,
  buildRelanceEmailHtml,
  CHANNEL_LABELS,
} from './relanceUtils';
import { scopeToOrg, withOrgScope } from './queryHelper';

// ============ DETECTION ============

/**
 * Detects all documents that need a relance action.
 * Returns a priority-sorted list of pending relances.
 *
 * @param {Array} devis - All devis/facture documents
 * @param {Array} clients - All clients
 * @param {Object} relanceConfig - The entreprise.relanceConfig
 * @param {Array} executions - All relance_executions
 * @param {Array} exclusions - All relance_exclusions
 * @returns {Array} Sorted list of { doc, client, nextStep, daysOverdue, priority }
 */
export function detectPendingRelances(devis = [], clients = [], relanceConfig = {}, executions = [], exclusions = []) {
  if (!relanceConfig.enabled) return [];

  const clientMap = new Map(clients.map(c => [c.id, c]));
  const pending = [];

  for (const doc of devis) {
    if (!isDocumentEligible(doc, exclusions, relanceConfig)) continue;

    const docType = doc.type === 'facture' ? 'facture' : 'devis';
    const steps = docType === 'facture' ? relanceConfig.factureSteps : relanceConfig.devisSteps;
    if (!steps?.length) continue;

    const docExecutions = executions.filter(e => e.document_id === doc.id);
    const next = getNextStep(doc, docExecutions, steps);

    if (!next) continue; // All steps done

    const client = clientMap.get(doc.client_id);
    if (!client) continue;

    // Priority: higher delay steps = higher priority
    let priority = 'low';
    if (next.step.delay >= 45) priority = 'critical';
    else if (next.step.delay >= 30) priority = 'high';
    else if (next.step.delay >= 15) priority = 'medium';

    pending.push({
      doc,
      client,
      nextStep: next,
      daysOverdue: next.daysOverdue,
      daysUntilDue: next.daysUntilDue,
      isDue: next.isDue,
      priority,
      sequenceType: docType,
    });
  }

  // Sort: due first, then by priority, then by days overdue
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  pending.sort((a, b) => {
    // Due items first
    if (a.isDue && !b.isDue) return -1;
    if (!a.isDue && b.isDue) return 1;
    // Then by priority
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    // Then by days overdue (most overdue first)
    return b.daysOverdue - a.daysOverdue;
  });

  return pending;
}

// ============ EXECUTION ============

/**
 * Executes a single relance: sends the communication and records it.
 *
 * @param {Object} doc - The document (devis/facture)
 * @param {Object} client - The client
 * @param {Object} step - The step configuration from relanceConfig
 * @param {Object} entreprise - Company data
 * @param {Object} [options] - { userId, orgId, triggeredBy, supabaseUrl }
 * @returns {Object} { success, executionId, emailResult, smsResult, error }
 */
export async function executeRelance(doc, client, step, entreprise, options = {}) {
  const { userId, orgId, triggeredBy = 'manual' } = options;

  // Resolve template variables
  const resolvedBody = resolveVariables(step.template || '', doc, client, entreprise);
  const resolvedSubject = resolveVariables(
    step.objet_email || `Relance : ${doc.type === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}`,
    doc, client, entreprise
  );

  // Build HTML email
  const trackingToken = crypto.randomUUID();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const trackingPixelUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/track-relance/open/${trackingToken}`
    : '';
  const unsubscribeUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/track-relance/unsubscribe/${trackingToken}`
    : '';

  const htmlEmail = buildRelanceEmailHtml(resolvedBody, entreprise, {
    trackingPixelUrl,
    unsubscribeUrl,
    ctaUrl: '',
    ctaLabel: doc.type === 'facture' ? 'Voir la facture' : 'Consulter le devis',
  });

  // Resolve SMS body
  const smsBody = step.smsTemplate
    ? resolveVariables(step.smsTemplate, doc, client, entreprise)
    : resolvedBody.substring(0, 160);

  let emailResult = null;
  let smsResult = null;
  let success = false;
  let errorMessage = null;

  try {
    const channel = step.channel || 'email';

    // Send Email
    if ((channel === 'email' || channel === 'email_sms') && client.email) {
      try {
        emailResult = await sendEmail(client.email, resolvedSubject, htmlEmail, {
          clientId: client.id,
          documentId: doc.id,
          documentType: doc.type,
        });
        if (emailResult?.success) success = true;
      } catch (err) {
        console.warn('Email send failed:', err.message);
        errorMessage = `Email: ${err.message}`;
      }
    }

    // Send SMS
    if ((channel === 'sms' || channel === 'email_sms') && client.telephone) {
      try {
        smsResult = await sendSMS(client.telephone, smsBody, {
          clientId: client.id,
        });
        if (smsResult?.success) success = true;
      } catch (err) {
        console.warn('SMS send failed:', err.message);
        errorMessage = errorMessage
          ? `${errorMessage} | SMS: ${err.message}`
          : `SMS: ${err.message}`;
      }
    }

    // WhatsApp: generate link but don't auto-send
    if (channel === 'whatsapp' && client.telephone) {
      const phone = client.telephone.replace(/\s/g, '').replace(/^0/, '33');
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(resolvedBody)}`;
      // Open in new tab for user to send manually
      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank');
      }
      success = true;
    }

    // Record execution in DB
    const executionData = {
      document_id: doc.id,
      document_type: doc.type === 'facture' ? 'facture' : 'devis',
      document_numero: doc.numero,
      client_id: client.id,
      step_id: step.id,
      step_name: step.name,
      step_delay: step.delay,
      sequence_type: doc.type === 'facture' ? 'facture' : 'devis',
      channel: step.channel || 'email',
      status: success ? 'sent' : 'failed',
      subject: resolvedSubject,
      body: resolvedBody,
      sms_body: (step.channel === 'sms' || step.channel === 'email_sms') ? smsBody : null,
      tracking_token: trackingToken,
      triggered_by: triggeredBy,
      error_message: errorMessage,
      metadata: {
        email_provider_id: emailResult?.messageId || null,
        sms_provider_id: smsResult?.sid || null,
      },
    };

    let executionId = null;

    if (!isDemo && userId) {
      const scopedData = withOrgScope(executionData, userId, orgId);
      try {
        const { data, error } = await supabase
          .from('relance_executions')
          .insert(scopedData)
          .select('id')
          .single();

        if (error) {
          console.warn('[relanceEngine] relance_executions table not available, skipping save:', error.message);
        } else {
          executionId = data?.id;
        }
      } catch (e) {
        console.warn('[relanceEngine] relance_executions insert failed, skipping:', e.message);
      }

      // Update last_reminder_sent_at on the document
      await supabase
        .from('devis')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', doc.id);
    } else {
      // Demo mode: save to localStorage
      executionId = `demo-exec-${Date.now()}`;
      const demoHistory = JSON.parse(localStorage.getItem('cp_relance_executions') || '[]');
      demoHistory.push({
        id: executionId,
        ...executionData,
        user_id: 'demo-user-id',
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('cp_relance_executions', JSON.stringify(demoHistory));
    }

    return { success, executionId, emailResult, smsResult, error: errorMessage };
  } catch (err) {
    console.error('executeRelance failed:', err);
    return { success: false, executionId: null, emailResult, smsResult, error: err.message };
  }
}

// ============ BULK EXECUTION ============

/**
 * Processes multiple pending relances with rate limiting.
 * Only sends relances that are due (isDue === true).
 *
 * @param {Array} pendingList - From detectPendingRelances()
 * @param {Object} entreprise - Company data
 * @param {Object} [options] - { userId, orgId, maxPerBatch }
 * @returns {Object} { sent, failed, skipped, results }
 */
export async function bulkExecuteRelances(pendingList, entreprise, options = {}) {
  const { userId, orgId, maxPerBatch = 10 } = options;

  const dueItems = pendingList.filter(p => p.isDue).slice(0, maxPerBatch);
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const item of dueItems) {
    // 200ms delay between sends for rate limiting
    if (results.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const result = await executeRelance(
      item.doc, item.client, item.nextStep.step, entreprise,
      { userId, orgId, triggeredBy: 'auto' }
    );

    results.push({ ...item, result });
    if (result.success) sent++;
    else failed++;
  }

  return {
    sent,
    failed,
    skipped: pendingList.length - dueItems.length,
    results,
  };
}

// ============ CANCELLATION ============

/**
 * Cancels all pending relance executions for a document.
 * Called when a document is paid or signed.
 *
 * @param {string} documentId - The document UUID
 * @param {string} userId - User UUID
 * @param {string} [orgId] - Organization UUID
 */
export async function cancelDocumentRelances(documentId, userId, orgId) {
  if (isDemo || !userId) {
    // Demo mode: update localStorage
    const demoHistory = JSON.parse(localStorage.getItem('cp_relance_executions') || '[]');
    const updated = demoHistory.map(e =>
      e.document_id === documentId && e.status === 'sent'
        ? { ...e, status: 'cancelled' }
        : e
    );
    localStorage.setItem('cp_relance_executions', JSON.stringify(updated));
    return;
  }

  // Note: We don't cancel already-sent relances (legal proof).
  // This function is a no-op for sent relances.
  // It's here for future use if we implement scheduled (not-yet-sent) relances.
  console.log(`Document ${documentId} paid/signed — no future relances will be sent.`);
}

// ============ EXCLUSION MANAGEMENT ============

/**
 * Creates an exclusion for a document or client.
 */
export async function createExclusion(scope, { documentId, clientId, reason, notes, userId, orgId }) {
  const data = {
    scope,
    document_id: scope === 'document' ? documentId : null,
    client_id: clientId,
    reason: reason || 'manual',
    notes: notes || null,
    created_by: 'user',
  };

  if (isDemo || !userId) {
    const id = `demo-excl-${Date.now()}`;
    const demoExclusions = JSON.parse(localStorage.getItem('cp_relance_exclusions') || '[]');
    demoExclusions.push({ id, ...data, user_id: 'demo-user-id', created_at: new Date().toISOString() });
    localStorage.setItem('cp_relance_exclusions', JSON.stringify(demoExclusions));
    return { id, ...data };
  }

  try {
    const scopedData = withOrgScope(data, userId, orgId);
    const { data: result, error } = await supabase
      .from('relance_exclusions')
      .insert(scopedData)
      .select()
      .single();

    if (error) {
      console.warn('[relanceEngine] relance_exclusions table not available, skipping:', error.message);
      return { id: `local-excl-${Date.now()}`, ...data };
    }
    return result;
  } catch (e) {
    console.warn('[relanceEngine] createExclusion failed, returning local fallback:', e.message);
    return { id: `local-excl-${Date.now()}`, ...data };
  }
}

/**
 * Removes an exclusion.
 */
export async function removeExclusion(exclusionId, userId) {
  if (isDemo || !userId) {
    const demoExclusions = JSON.parse(localStorage.getItem('cp_relance_exclusions') || '[]');
    localStorage.setItem(
      'cp_relance_exclusions',
      JSON.stringify(demoExclusions.filter(e => e.id !== exclusionId))
    );
    return;
  }

  try {
    const { error } = await supabase
      .from('relance_exclusions')
      .delete()
      .eq('id', exclusionId);

    if (error) {
      console.warn('[relanceEngine] relance_exclusions delete not available, skipping:', error.message);
    }
  } catch (e) {
    console.warn('[relanceEngine] removeExclusion failed, skipping:', e.message);
  }
}

// ============ DATA LOADING ============

/**
 * Loads all relance executions for the current user/org.
 */
export async function loadExecutions(userId, orgId) {
  if (isDemo || !userId) {
    return JSON.parse(localStorage.getItem('cp_relance_executions') || '[]');
  }

  try {
    let query = supabase
      .from('relance_executions')
      .select('*')
      .order('created_at', { ascending: false });

    query = scopeToOrg(query, orgId, userId);
    const { data, error } = await query;

    if (error) {
      console.warn('[relanceEngine] relance_executions table not available, skipping:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('[relanceEngine] loadExecutions failed, returning empty:', e.message);
    return [];
  }
}

/**
 * Loads all relance exclusions for the current user/org.
 */
export async function loadExclusions(userId, orgId) {
  if (isDemo || !userId) {
    return JSON.parse(localStorage.getItem('cp_relance_exclusions') || '[]');
  }

  try {
    let query = supabase
      .from('relance_exclusions')
      .select('*')
      .order('created_at', { ascending: false });

    query = scopeToOrg(query, orgId, userId);
    const { data, error } = await query;

    if (error) {
      console.warn('[relanceEngine] relance_exclusions table not available, skipping:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('[relanceEngine] loadExclusions failed, returning empty:', e.message);
    return [];
  }
}

/**
 * Saves the relance config to the entreprise table in Supabase.
 */
export async function saveRelanceConfigToDB(config, userId) {
  if (isDemo || !userId) return;

  const { error } = await supabase
    .from('entreprise')
    .update({ relance_config: config })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to save relance config:', error);
  }
}
