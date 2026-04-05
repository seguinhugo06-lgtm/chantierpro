/**
 * WebhookConfigPage.jsx — Webhook management interface
 *
 * Lists configured webhooks, allows CRUD, shows delivery logs.
 * Accessible from IntegrationsHub when clicking "Configurer" on Webhooks provider.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, X, Check, AlertCircle, CheckCircle2,
  Zap, Copy, ExternalLink, ToggleLeft, ToggleRight, Send,
  Loader2, Clock, ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react';
import {
  loadWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  testWebhook,
  getDeliveryLogs,
  WEBHOOK_EVENTS,
} from '../../services/webhookService';
import { useOrg } from '../../context/OrgContext';
import { useConfirm } from '../../context/AppContext';

export default function WebhookConfigPage({ userId, isDark, couleur, showToast, onClose }) {
  const { orgId } = useOrg();
  const { confirm } = useConfirm();

  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [testing, setTesting] = useState(null);
  const [expandedWebhook, setExpandedWebhook] = useState(null);
  const [deliveryLogs, setDeliveryLogs] = useState({});
  const [showSecret, setShowSecret] = useState({});

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState([]);

  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputBg = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadWebhooks({ userId, orgId });
      setWebhooks(data);
    } catch (err) {
      console.error('Error loading webhooks:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resetForm = () => {
    setFormName('');
    setFormUrl('');
    setFormEvents([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      showToast?.('Nom et URL requis', 'error');
      return;
    }

    // Basic URL validation
    try {
      new URL(formUrl);
    } catch {
      showToast?.('URL invalide', 'error');
      return;
    }

    if (formEvents.length === 0) {
      showToast?.('Sélectionnez au moins un événement', 'error');
      return;
    }

    try {
      if (editingId) {
        await updateWebhook(editingId, { name: formName, url: formUrl, events: formEvents });
        showToast?.('Webhook mis à jour', 'success');
      } else {
        await createWebhook({ name: formName, url: formUrl, events: formEvents, userId, orgId });
        showToast?.('Webhook créé', 'success');
      }
      resetForm();
      await refresh();
    } catch (err) {
      showToast?.(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm({ title: 'Supprimer ce webhook ?', message: 'Les logs seront conservés.', confirmText: 'Supprimer', cancelText: 'Annuler', variant: 'danger' })) return;
    try {
      await deleteWebhook(id);
      showToast?.('Webhook supprimé', 'info');
      await refresh();
    } catch (err) {
      showToast?.(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await toggleWebhook(id, !enabled);
      await refresh();
    } catch (err) {
      showToast?.(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const result = await testWebhook(id);
      if (result.success || result.delivered > 0) {
        showToast?.(`Test envoyé (${result.statusCode || 200})`, 'success');
      } else {
        showToast?.('Test échoué', 'error');
      }
    } catch (err) {
      showToast?.(`Erreur test: ${err.message}`, 'error');
    } finally {
      setTesting(null);
    }
  };

  const handleEdit = (webhook) => {
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormEvents(webhook.events || []);
    setEditingId(webhook.id);
    setShowForm(true);
  };

  const handleExpand = async (id) => {
    if (expandedWebhook === id) {
      setExpandedWebhook(null);
      return;
    }
    setExpandedWebhook(id);
    if (!deliveryLogs[id]) {
      try {
        const logs = await getDeliveryLogs(id);
        setDeliveryLogs(prev => ({ ...prev, [id]: logs }));
      } catch {}
    }
  };

  const handleCopySecret = async (secret) => {
    try {
      await navigator.clipboard.writeText(secret);
      showToast?.('Secret copié', 'success');
    } catch {
      showToast?.('Erreur copie', 'error');
    }
  };

  const toggleEvent = (eventId) => {
    setFormEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId],
    );
  };

  // Group events by category
  const eventsByCategory = WEBHOOK_EVENTS.reduce((acc, evt) => {
    if (!acc[evt.category]) acc[evt.category] = [];
    acc[evt.category].push(evt);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Jamais';
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: '#8b5cf6' }}>
            <Zap size={20} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${textPrimary}`}>Webhooks</h3>
            <p className={`text-xs ${textMuted}`}>{webhooks.length} endpoint{webhooks.length !== 1 ? 's' : ''} configuré{webhooks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium"
          style={{ backgroundColor: couleur }}
        >
          <Plus size={14} />
          Nouveau
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className={`${bgCard} rounded-xl border ${border} p-4 space-y-4`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-semibold ${textPrimary}`}>
              {editingId ? 'Modifier le webhook' : 'Nouveau webhook'}
            </h4>
            <button onClick={resetForm} className={textMuted}><X size={16} /></button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={`text-xs font-medium ${textSecondary} block mb-1`}>Nom</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ex: Zapier — Nouveau devis"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${textSecondary} block mb-1`}>URL</label>
              <input
                type="url"
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="https://hooks.example.com/webhook"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${textSecondary} block mb-2`}>Événements</label>
              <div className="space-y-3">
                {Object.entries(eventsByCategory).map(([category, events]) => (
                  <div key={category}>
                    <p className={`text-xs font-medium ${textMuted} mb-1`}>{category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {events.map(evt => {
                        const selected = formEvents.includes(evt.id);
                        return (
                          <button
                            key={evt.id}
                            onClick={() => toggleEvent(evt.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              selected
                                ? 'text-white'
                                : `border ${border} ${textSecondary} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`
                            }`}
                            style={selected ? { backgroundColor: couleur } : undefined}
                          >
                            {evt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className={`px-3 py-2 rounded-lg text-sm ${textSecondary}`}>
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: couleur }}
            >
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Webhook List */}
      {webhooks.length === 0 && !showForm ? (
        <div className={`text-center py-12 ${bgCard} rounded-xl border ${border}`}>
          <Zap size={32} className={`mx-auto mb-2 ${textMuted}`} />
          <p className={`text-sm font-medium ${textSecondary}`}>Aucun webhook configuré</p>
          <p className={`text-xs ${textMuted} mt-1`}>Créez votre premier webhook pour recevoir des notifications en temps réel</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map(webhook => {
            const isExpanded = expandedWebhook === webhook.id;
            const logs = deliveryLogs[webhook.id] || [];
            const secretVisible = showSecret[webhook.id];

            return (
              <div key={webhook.id} className={`${bgCard} rounded-xl border ${border} overflow-hidden`}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${webhook.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <h4 className={`text-sm font-semibold ${textPrimary} truncate`}>{webhook.name}</h4>
                      </div>
                      <p className={`text-xs font-mono ${textMuted} truncate`}>{webhook.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(webhook.events || []).slice(0, 3).map(evt => (
                          <span key={evt} className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            {WEBHOOK_EVENTS.find(e => e.id === evt)?.label || evt}
                          </span>
                        ))}
                        {(webhook.events || []).length > 3 && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${textMuted}`}>
                            +{webhook.events.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => handleTest(webhook.id)}
                        disabled={testing === webhook.id || !webhook.enabled}
                        className={`p-1.5 rounded-lg text-xs ${textMuted} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} disabled:opacity-50`}
                        title="Tester"
                      >
                        {testing === webhook.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                      <button
                        onClick={() => handleToggle(webhook.id, webhook.enabled)}
                        className={`p-1.5 rounded-lg ${webhook.enabled ? 'text-emerald-500' : textMuted}`}
                        title={webhook.enabled ? 'Désactiver' : 'Activer'}
                      >
                        {webhook.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        onClick={() => handleEdit(webhook)}
                        className={`p-1.5 rounded-lg ${textMuted} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                        title="Modifier"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Status bar */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={textMuted}>
                        <Clock size={10} className="inline mr-1" />
                        {formatDate(webhook.lastTriggeredAt)}
                      </span>
                      {webhook.lastStatus && (
                        <span className={webhook.lastStatus < 400 ? 'text-emerald-500' : 'text-red-500'}>
                          {webhook.lastStatus}
                        </span>
                      )}
                      {webhook.failureCount > 0 && (
                        <span className="text-red-500">{webhook.failureCount} échec{webhook.failureCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleExpand(webhook.id)}
                      className={`flex items-center gap-1 text-xs ${textMuted}`}
                    >
                      {isExpanded ? 'Masquer' : 'Détails'}
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className={`px-4 pb-4 pt-0 border-t ${border}`}>
                    <div className="pt-3 space-y-3">
                      {/* HMAC Secret */}
                      <div>
                        <p className={`text-xs font-medium ${textSecondary} mb-1`}>Secret HMAC</p>
                        <div className="flex items-center gap-2">
                          <code className={`flex-1 text-xs px-2 py-1.5 rounded ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                            {secretVisible ? webhook.hmacSecret : '••••••••••••••••••••'}
                          </code>
                          <button
                            onClick={() => setShowSecret(prev => ({ ...prev, [webhook.id]: !prev[webhook.id] }))}
                            className={`p-1 ${textMuted}`}
                          >
                            {secretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button onClick={() => handleCopySecret(webhook.hmacSecret)} className={`p-1 ${textMuted}`}>
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Delivery logs */}
                      <div>
                        <p className={`text-xs font-medium ${textSecondary} mb-2`}>Dernières livraisons</p>
                        {logs.length === 0 ? (
                          <p className={`text-xs ${textMuted}`}>Aucune livraison enregistrée</p>
                        ) : (
                          <div className="space-y-1">
                            {logs.map(log => (
                              <div key={log.id} className={`flex items-center justify-between text-xs py-1.5 px-2 rounded ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                <div className="flex items-center gap-2">
                                  {log.status === 'success' ? (
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                  ) : (
                                    <AlertCircle size={12} className="text-red-500" />
                                  )}
                                  <span className={textSecondary}>{log.event}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={textMuted}>{log.durationMs}ms</span>
                                  <span className={log.statusCode < 400 ? 'text-emerald-500' : 'text-red-500'}>{log.statusCode}</span>
                                  <span className={textMuted}>{formatDate(log.createdAt)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
