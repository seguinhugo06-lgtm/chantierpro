import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, Trash2, AlertCircle, CheckCircle2, RefreshCw,
  Share2, Copy, ExternalLink, Plus, X, Circle, Clock,
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useConfirm, useToast } from '../../context/AppContext';
import { CATEGORIES, PRIORITIES, RECURRENCE_OPTIONS, TASK_STATUSES } from './constants';
import { formatDateFR, formatTimeFR } from './helpers';

// ── SubtaskList ──
function SubtaskList({ subtasks = [], onUpdate, couleur, isDark }) {
  const [newText, setNewText] = useState('');
  const tc = {
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300',
  };

  const done = subtasks.filter(s => s.done).length;
  const total = subtasks.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  const addSubtask = () => {
    if (!newText.trim()) return;
    const newSt = { id: `st_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, text: newText.trim(), done: false };
    onUpdate([...subtasks, newSt]);
    setNewText('');
  };

  const toggleSubtask = (id) => {
    onUpdate(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s));
  };

  const deleteSubtask = (id) => {
    onUpdate(subtasks.filter(s => s.id !== id));
  };

  const sorted = [...subtasks].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-xs font-medium ${tc.muted}`}>
          Sous-tâches {total > 0 && <span className="font-normal">({done}/{total})</span>}
        </label>
      </div>

      {total > 0 && (
        <div className={`h-1 rounded-full mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: done === total ? '#22c55e' : couleur }}
          />
        </div>
      )}

      <div className="space-y-1 mb-2">
        {sorted.map(st => (
          <div key={st.id} className="group flex items-center gap-2 py-1">
            <button
              onClick={() => toggleSubtask(st.id)}
              className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                st.done
                  ? 'border-green-500 bg-green-500 text-white'
                  : isDark ? 'border-slate-500' : 'border-slate-300'
              }`}
            >
              {st.done && <CheckCircle2 size={10} />}
            </button>
            <span className={`text-sm flex-1 ${st.done ? 'line-through opacity-50' : ''} ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {st.text}
            </span>
            <button
              onClick={() => deleteSubtask(st.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:text-red-500 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
          placeholder="Ajouter une sous-tâche..."
          className={`flex-1 px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 ${tc.input}`}
          style={{ '--tw-ring-color': couleur }}
          aria-label="Ajouter une sous-tâche"
        />
        <span className={`text-[10px] flex-shrink-0 ${tc.muted}`}>↵ pour ajouter</span>
        <button
          onClick={addSubtask}
          disabled={!newText.trim()}
          className="px-2 py-1.5 rounded-lg text-xs text-white disabled:opacity-40"
          style={{ backgroundColor: couleur }}
          aria-label="Ajouter la sous-tâche"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TaskDetail — Slide-in detail panel
// ════════════════════════════════════════════════════════
export default function TaskDetail({ memo, onUpdate, onDelete, onClose, chantiers, clients, equipe, couleur, isDark }) {
  const [text, setText] = useState(memo.text || '');
  const [notes, setNotes] = useState(memo.notes || '');
  const debouncedText = useDebounce(text, 800);
  const debouncedNotes = useDebounce(notes, 800);
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const isFirstRender = useRef(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const saveTimerRef = useRef(null);
  const panelRef = useRef(null);

  // Focus trap + Escape to close
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) focusable[0].focus();

    const trap = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    panel.addEventListener('keydown', trap);
    return () => panel.removeEventListener('keydown', trap);
  }, [memo.id, onClose]);

  // Sync local state when memo changes
  useEffect(() => {
    setText(memo.text || '');
    setNotes(memo.notes || '');
    isFirstRender.current = true;
    setSaveStatus('idle');
  }, [memo.id]);

  // Show "saving..." when typing
  useEffect(() => {
    if (isFirstRender.current) return;
    if (text !== memo.text || notes !== (memo.notes || '')) {
      setSaveStatus('saving');
    }
  }, [text, notes]);

  // Auto-save text
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debouncedText !== memo.text) {
      try {
        onUpdate(memo.id, { text: debouncedText });
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }
  }, [debouncedText]);

  // Auto-save notes
  useEffect(() => {
    if (debouncedNotes !== (memo.notes || '')) {
      try {
        onUpdate(memo.id, { notes: debouncedNotes });
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }
  }, [debouncedNotes]);

  // Retry save on error
  const retrySave = () => {
    setSaveStatus('saving');
    try {
      if (text !== memo.text) onUpdate(memo.id, { text });
      if (notes !== (memo.notes || '')) onUpdate(memo.id, { notes });
      setSaveStatus('saved');
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  // Cleanup timer
  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const handleImmediateUpdate = (field, value) => {
    onUpdate(memo.id, { [field]: value || null });
  };

  const handleSubtasksUpdate = (newSubtasks) => {
    onUpdate(memo.id, { subtasks: newSubtasks });
  };

  const handleRecurrenceChange = (type) => {
    if (!type) {
      onUpdate(memo.id, { recurrence: null });
    } else if (type === 'custom') {
      onUpdate(memo.id, { recurrence: { type: 'custom', interval: 1, unit: 'day' } });
    } else {
      onUpdate(memo.id, { recurrence: { type } });
    }
  };

  // Status change handler — sync is_done
  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'termine') {
      updates.is_done = true;
      updates.done_at = new Date().toISOString();
    } else {
      updates.is_done = false;
      updates.done_at = null;
    }
    onUpdate(memo.id, updates);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Supprimer cette tâche ?',
      message: `"${memo.text?.substring(0, 50)}${memo.text?.length > 50 ? '...' : ''}"`,
      confirmText: 'Supprimer',
      confirmColor: '#ef4444',
    });
    if (ok) {
      onDelete(memo.id);
      onClose();
      showToast('Tâche supprimée', 'success');
    }
  };

  // Share menu
  const [showShareMenu, setShowShareMenu] = useState(false);
  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const getShareMessage = () => {
    const ch = memo.chantier_id ? chantiers.find(c => c.id === memo.chantier_id) : null;
    const cl = memo.client_id ? clients.find(c => c.id === memo.client_id) : null;
    const parts = ['[Tâche BatiGesti]', memo.text];
    if (memo.due_date) parts.push(`📅 ${formatDateFR(memo.due_date)}${memo.due_time ? ' à ' + formatTimeFR(memo.due_time) : ''}`);
    if (ch) parts.push(`🏗️ ${ch.nom}`);
    if (cl) parts.push(`👤 ${cl.nom || ''} ${cl.prenom || ''}`);
    return parts.join('\n');
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(getShareMessage()).then(() => {
      showToast('Lien copié', 'success');
    }).catch(() => {
      showToast('Erreur de copie', 'error');
    });
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: 'Tâche BatiGesti', text: getShareMessage() });
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Partage annulé', 'info');
    }
    setShowShareMenu(false);
  };

  const recType = memo.recurrence?.type || memo.recurrence || '';
  const recInterval = memo.recurrence?.interval || 1;
  const recUnit = memo.recurrence?.unit || 'day';

  // Current status value
  const currentStatus = memo.is_done ? 'termine' : (memo.status || 'a_faire');
  const currentStatusObj = TASK_STATUSES.find(s => s.value === currentStatus);
  const StatusIcon = currentStatus === 'termine' ? CheckCircle2 : currentStatus === 'en_cours' ? Clock : Circle;

  const tc = {
    bg: isDark ? 'bg-slate-800' : 'bg-white',
    text: isDark ? 'text-white' : 'text-slate-900',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    border: isDark ? 'border-slate-700' : 'border-slate-200',
    input: isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Détail de la tâche"
        className={`fixed top-0 right-0 h-full w-full md:max-w-md ${tc.bg} shadow-2xl z-50 flex flex-col animate-slide-in-right`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${tc.border}`}>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} aria-label="Fermer le panneau de détail">
            <ChevronLeft size={20} className={tc.muted} />
          </button>
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5" role="status" aria-live="polite">
            {saveStatus === 'saving' && (
              <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-500'}`}>
                <RefreshCw size={11} className="animate-spin" /> Sauvegarde...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                <CheckCircle2 size={11} /> Sauvegardé
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs flex items-center gap-1 text-orange-500">
                <AlertCircle size={11} /> Erreur
                <button onClick={retrySave} className="underline hover:text-orange-600 ml-0.5">Réessayer</button>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className={`font-semibold text-sm ${tc.text}`}>Détail de la tâche</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className={`p-1.5 rounded-lg ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                aria-label="Partager la tâche"
                title="Partager"
              >
                <Share2 size={18} />
              </button>
              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setShowShareMenu(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-50 rounded-lg shadow-xl border min-w-[200px] py-1 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <button
                      onClick={handleCopyShare}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${isDark ? 'text-white hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Copy size={14} /> Copier le contenu
                    </button>
                    <button
                      onClick={hasNativeShare ? handleNativeShare : undefined}
                      disabled={!hasNativeShare}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                        hasNativeShare
                          ? isDark ? 'text-white hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-50'
                          : 'opacity-40 cursor-not-allowed'
                      } ${isDark ? 'text-white' : 'text-slate-700'}`}
                    >
                      <ExternalLink size={14} /> Partager par SMS/Email
                      {!hasNativeShare && <span className={`text-[10px] ml-auto ${tc.muted}`}>Non disponible</span>}
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleDelete}
              className={`p-1.5 rounded-lg text-red-500 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
              aria-label="Supprimer cette tâche définitivement"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status dropdown — prominent at top */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Statut</label>
            <div className="flex gap-1.5">
              {TASK_STATUSES.map(st => {
                const isActive = currentStatus === st.value;
                const Icon = st.value === 'termine' ? CheckCircle2 : st.value === 'en_cours' ? Clock : Circle;
                return (
                  <button
                    key={st.value}
                    onClick={() => handleStatusChange(st.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      isActive
                        ? 'text-white border-transparent'
                        : isDark
                          ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    style={isActive ? { backgroundColor: st.color } : {}}
                  >
                    <Icon size={14} />
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tâche */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Tâche</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
              placeholder="Contenu de la tâche..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
              placeholder="Détails, liens, références..."
            />
          </div>

          {/* Subtasks */}
          <SubtaskList
            subtasks={memo.subtasks || []}
            onUpdate={handleSubtasksUpdate}
            couleur={couleur}
            isDark={isDark}
          />

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Date</label>
              <input
                type="date"
                value={memo.due_date || ''}
                onChange={(e) => handleImmediateUpdate('due_date', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
                style={{ '--tw-ring-color': couleur }}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Heure</label>
              <input
                type="time"
                value={memo.due_time || ''}
                onChange={(e) => handleImmediateUpdate('due_time', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
                style={{ '--tw-ring-color': couleur }}
              />
            </div>
          </div>

          {/* Date de fin (multi-jours) */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Date de fin (optionnel)</label>
            <input
              type="date"
              value={memo.due_date_end || ''}
              onChange={(e) => handleImmediateUpdate('due_date_end', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            />
            {memo.due_date && memo.due_date_end && memo.due_date_end < memo.due_date && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                La date de fin est antérieure à la date de début
              </p>
            )}
            {memo.due_date && memo.due_date_end && memo.due_date_end >= memo.due_date && (() => {
              const diffMs = new Date(memo.due_date_end + 'T00:00:00') - new Date(memo.due_date + 'T00:00:00');
              const diffDays = Math.round(diffMs / 86400000) + 1;
              return (
                <p className={`text-xs mt-1 ${tc.muted}`}>
                  Durée : {diffDays} jour{diffDays > 1 ? 's' : ''}
                </p>
              );
            })()}
          </div>

          {/* Recurrence */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Récurrence</label>
            <select
              value={recType}
              onChange={(e) => handleRecurrenceChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            >
              {RECURRENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {recType === 'custom' && (
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  min={1}
                  value={recInterval}
                  onChange={(e) => onUpdate(memo.id, { recurrence: { ...memo.recurrence, type: 'custom', interval: parseInt(e.target.value) || 1 } })}
                  className={`w-20 px-2 py-1.5 rounded-lg border text-xs ${tc.input}`}
                />
                <select
                  value={recUnit}
                  onChange={(e) => onUpdate(memo.id, { recurrence: { ...memo.recurrence, type: 'custom', unit: e.target.value } })}
                  className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${tc.input}`}
                >
                  <option value="day">jour(s)</option>
                  <option value="week">semaine(s)</option>
                  <option value="month">mois</option>
                </select>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Priorité</label>
            <select
              value={memo.priority || ''}
              onChange={(e) => handleImmediateUpdate('priority', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            >
              <option value="">Aucune</option>
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.dot} {p.label}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Catégorie</label>
            <select
              value={memo.category || ''}
              onChange={(e) => handleImmediateUpdate('category', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            >
              <option value="">Aucune</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Chantier link */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Chantier</label>
            <select
              value={memo.chantier_id || ''}
              onChange={(e) => handleImmediateUpdate('chantier_id', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            >
              <option value="">Aucun</option>
              {chantiers.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.nom}</option>
              ))}
            </select>
          </div>

          {/* Client link */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Client</label>
            <select
              value={memo.client_id || ''}
              onChange={(e) => handleImmediateUpdate('client_id', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            >
              <option value="">Aucun</option>
              {clients.map(cl => (
                <option key={cl.id} value={cl.id}>{cl.nom} {cl.prenom || ''}</option>
              ))}
            </select>
          </div>

          {/* Assigné à */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Assigné à</label>
            <select
              value={memo.assigned_to || ''}
              onChange={(e) => handleImmediateUpdate('assigned_to', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            >
              <option value="">Non assigné</option>
              {(equipe || []).map(m => (
                <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
              ))}
            </select>
          </div>

          {/* Meta info */}
          <div className={`text-xs ${tc.muted} pt-2 border-t ${tc.border}`}>
            <p>Créé le {memo.created_at ? new Date(memo.created_at).toLocaleDateString('fr-FR') : '—'}</p>
            {memo.done_at && <p>Terminé le {new Date(memo.done_at).toLocaleDateString('fr-FR')}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
