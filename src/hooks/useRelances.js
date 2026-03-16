/**
 * useRelances — React hook for relance system state management
 * Provides executions, exclusions, pending relances, stats, and actions.
 * @module useRelances
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  detectPendingRelances,
  executeRelance as engineExecute,
  bulkExecuteRelances as engineBulkExecute,
  createExclusion as engineCreateExclusion,
  removeExclusion as engineRemoveExclusion,
  loadExecutions,
  loadExclusions,
  saveRelanceConfigToDB,
} from '../lib/relanceEngine';
import {
  buildRelanceSummary,
  getNextStep,
  DEFAULT_RELANCE_CONFIG,
} from '../lib/relanceUtils';

/**
 * @param {Object} params
 * @param {Array} params.devis - All devis/facture documents
 * @param {Array} params.clients - All clients
 * @param {Object} params.entreprise - Company data (includes relanceConfig)
 * @param {string} params.userId - Current user ID
 * @param {string} [params.orgId] - Organization ID
 * @returns {Object} Relance state and actions
 */
export function useRelances({ devis = [], clients = [], entreprise, userId, orgId } = {}) {
  const [executions, setExecutions] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Relance config from entreprise
  const relanceConfig = useMemo(() => {
    return entreprise?.relanceConfig || DEFAULT_RELANCE_CONFIG;
  }, [entreprise?.relanceConfig]);

  // ── Load data from DB ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [execs, excls] = await Promise.all([
        loadExecutions(userId, orgId),
        loadExclusions(userId, orgId),
      ]);
      setExecutions(execs);
      setExclusions(excls);
    } catch (err) {
      console.error('useRelances fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Computed values ────────────────────────────────────────────────────────

  // Pending relances (documents that need attention)
  const pending = useMemo(() => {
    return detectPendingRelances(devis, clients, relanceConfig, executions, exclusions);
  }, [devis, clients, relanceConfig, executions, exclusions]);

  // Only items that are due now
  const dueNow = useMemo(() => pending.filter(p => p.isDue), [pending]);

  // Statistics
  const stats = useMemo(() => {
    return buildRelanceSummary(executions, devis);
  }, [executions, devis]);

  // Count by priority
  const counts = useMemo(() => ({
    total: pending.length,
    due: dueNow.length,
    critical: pending.filter(p => p.priority === 'critical').length,
    high: pending.filter(p => p.priority === 'high').length,
    medium: pending.filter(p => p.priority === 'medium').length,
    low: pending.filter(p => p.priority === 'low').length,
  }), [pending, dueNow]);

  // Total amount at risk
  const totalAtRisk = useMemo(() => {
    return pending.reduce((sum, p) => sum + (p.doc.total_ttc || 0), 0);
  }, [pending]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Send a relance for a specific document/step.
   */
  const sendRelance = useCallback(async (doc, client, step, triggeredBy = 'manual') => {
    const result = await engineExecute(doc, client, step, entreprise, {
      userId, orgId, triggeredBy,
    });

    // Refresh executions after sending
    if (result.success || result.executionId) {
      await fetchData();
    }

    return result;
  }, [entreprise, userId, orgId, fetchData]);

  /**
   * Send all due relances in bulk.
   */
  const sendBulkRelances = useCallback(async () => {
    const result = await engineBulkExecute(pending, entreprise, {
      userId, orgId, maxPerBatch: 10,
    });

    await fetchData();
    return result;
  }, [pending, entreprise, userId, orgId, fetchData]);

  /**
   * Add an exclusion for a document or client.
   */
  const addExclusion = useCallback(async (scope, { documentId, clientId, reason, notes } = {}) => {
    const result = await engineCreateExclusion(scope, {
      documentId, clientId, reason, notes, userId, orgId,
    });

    await fetchData();
    return result;
  }, [userId, orgId, fetchData]);

  /**
   * Remove an exclusion.
   */
  const deleteExclusion = useCallback(async (exclusionId) => {
    await engineRemoveExclusion(exclusionId, userId);
    await fetchData();
  }, [userId, fetchData]);

  /**
   * Skip to the next step for a document (send the next step immediately).
   */
  const skipToNextStep = useCallback(async (doc, client) => {
    const docType = doc.type === 'facture' ? 'facture' : 'devis';
    const steps = docType === 'facture' ? relanceConfig.factureSteps : relanceConfig.devisSteps;
    const docExecutions = executions.filter(e => e.document_id === doc.id);
    const next = getNextStep(doc, docExecutions, steps || []);

    if (!next) return null;

    return sendRelance(doc, client, next.step, 'manual');
  }, [relanceConfig, executions, sendRelance]);

  /**
   * Save relance config to database (debounced externally).
   */
  const saveConfig = useCallback(async (config) => {
    await saveRelanceConfigToDB(config, userId);
  }, [userId]);

  // ── Getters ────────────────────────────────────────────────────────────────

  /**
   * Get all executions for a specific document (for timeline widget).
   */
  const getDocumentTimeline = useCallback((documentId) => {
    return executions
      .filter(e => e.document_id === documentId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [executions]);

  /**
   * Get all executions for a specific client.
   */
  const getClientHistory = useCallback((clientId) => {
    return executions
      .filter(e => e.client_id === clientId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [executions]);

  /**
   * Get the pending relance info for a specific document.
   */
  const getDocumentPending = useCallback((documentId) => {
    return pending.find(p => p.doc.id === documentId) || null;
  }, [pending]);

  /**
   * Check if a document is excluded from relances.
   */
  const isDocumentExcluded = useCallback((documentId) => {
    return exclusions.some(ex =>
      ex.scope === 'document' && ex.document_id === documentId
    );
  }, [exclusions]);

  /**
   * Check if a client is excluded from relances.
   */
  const isClientExcluded = useCallback((clientId) => {
    return exclusions.some(ex =>
      ex.scope === 'client' && ex.client_id === clientId
    );
  }, [exclusions]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    // State
    executions,
    exclusions,
    loading,
    error,

    // Config
    relanceConfig,
    isEnabled: relanceConfig.enabled,

    // Computed
    pending,
    dueNow,
    stats,
    counts,
    totalAtRisk,

    // Actions
    sendRelance,
    sendBulkRelances,
    addExclusion,
    deleteExclusion,
    skipToNextStep,
    saveConfig,
    refresh: fetchData,

    // Getters
    getDocumentTimeline,
    getClientHistory,
    getDocumentPending,
    isDocumentExcluded,
    isClientExcluded,
  };
}

export default useRelances;
