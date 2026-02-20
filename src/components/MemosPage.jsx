import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus, Search, X, ChevronDown, ChevronRight, Calendar, Clock,
  ClipboardList, Trash2, AlertCircle, CheckCircle2, Star,
  Building2, Users, Tag, StickyNote, ChevronLeft, Filter,
  ArrowUpDown, GripVertical, RefreshCw, CheckSquare, Square,
  Mic, MicOff, Send, Share2, Copy, ExternalLink, PartyPopper
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { useConfirm, useToast } from '../context/AppContext';
import EmptyState from './ui/EmptyState';
import MemoCalendarView from './MemoCalendarView';

// ── Catégories disponibles ──
const CATEGORIES = [
  { value: 'rappel', label: 'Rappel', color: '#3b82f6' },
  { value: 'achat', label: 'Achat', color: '#f59e0b' },
  { value: 'rdv', label: 'RDV', color: '#8b5cf6' },
  { value: 'admin', label: 'Admin', color: '#6366f1' },
  { value: 'idee', label: 'Idée', color: '#22c55e' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

const PRIORITIES = [
  { value: 'haute', label: 'Haute', color: '#ef4444', dot: '🔴' },
  { value: 'moyenne', label: 'Moyenne', color: '#f59e0b', dot: '🟡' },
  { value: 'basse', label: 'Basse', color: '#22c55e', dot: '🟢' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récent' },
  { value: 'oldest', label: 'Plus ancien' },
  { value: 'priority', label: 'Priorité' },
  { value: 'alpha', label: 'Alphabétique' },
];

const PRIORITY_ORDER = { haute: 0, moyenne: 1, basse: 2 };

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Aucune' },
  { value: 'daily', label: 'Tous les jours' },
  { value: 'weekly', label: 'Toutes les semaines' },
  { value: 'monthly', label: 'Tous les mois' },
  { value: 'custom', label: 'Personnalisé' },
];

// ── Helpers ──
const today = () => new Date().toISOString().split('T')[0];
const formatDateFR = (d) => {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
const formatTimeFR = (t) => {
  if (!t) return '';
  return t.substring(0, 5); // "09:30:00" → "09:30"
};
const isOverdue = (m) => !m.is_done && m.due_date && m.due_date < today();
const isToday = (m) => m.due_date === today();
const isFuture = (m) => m.due_date && m.due_date > today();
const isUndated = (m) => !m.due_date;

const getNextOccurrence = (currentDate, recurrence) => {
  if (!currentDate || !recurrence) return null;
  const date = new Date(currentDate + 'T00:00:00');
  const type = recurrence.type || recurrence;
  const interval = recurrence.interval || 1;

  switch (type) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 * interval));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
    case 'custom': {
      const unit = recurrence.unit || 'day';
      if (unit === 'day') date.setDate(date.getDate() + interval);
      else if (unit === 'week') date.setDate(date.getDate() + (7 * interval));
      else if (unit === 'month') date.setMonth(date.getMonth() + interval);
      break;
    }
    default: return null;
  }
  return date.toISOString().split('T')[0];
};

// ════════════════════════════════════════════════════════
// MemoItem — Single memo row with quick actions
// ════════════════════════════════════════════════════════
function MemoItem({
  memo, onToggle, onSelect, isSelected, chantiers, clients, couleur, isDark,
  onQuickDate, onQuickPriority, onQuickDelete, setPage,
  selectionMode, isMultiSelected, onMultiSelect
}) {
  const chantier = memo.chantier_id ? chantiers.find(c => c.id === memo.chantier_id) : null;
  const client = memo.client_id ? clients.find(c => c.id === memo.client_id) : null;
  const priority = PRIORITIES.find(p => p.value === memo.priority);
  const category = CATEGORIES.find(c => c.value === memo.category);
  const subtasks = memo.subtasks || [];
  const stDone = subtasks.filter(s => s.done).length;
  const stTotal = subtasks.length;

  const dateColor = isOverdue(memo)
    ? 'text-red-500'
    : isToday(memo)
      ? 'text-amber-500'
      : isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? isDark ? 'bg-slate-700 ring-1 ring-slate-600' : 'bg-slate-100 ring-1 ring-slate-200'
          : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
      } ${memo.is_done ? 'opacity-60' : ''}`}
      onClick={() => selectionMode ? onMultiSelect(memo.id) : onSelect(memo.id)}
    >
      {/* Checkbox or selection checkbox */}
      {selectionMode ? (
        <button
          onClick={(e) => { e.stopPropagation(); onMultiSelect(memo.id); }}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isMultiSelected
              ? 'border-blue-500 bg-blue-500 text-white'
              : isDark ? 'border-slate-500' : 'border-slate-300'
          }`}
        >
          {isMultiSelected && <CheckCircle2 size={12} />}
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(memo.id); }}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            memo.is_done
              ? 'border-green-500 bg-green-500 text-white'
              : isDark ? 'border-slate-500 hover:border-slate-400' : 'border-slate-300 hover:border-slate-400'
          }`}
          aria-label={memo.is_done ? 'Marquer comme non fait' : 'Marquer comme fait'}
        >
          {memo.is_done && <CheckCircle2 size={12} />}
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${memo.is_done ? 'line-through' : ''} ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {priority && <span className="mr-1.5" title={`Priorité ${priority.label}`}>{priority.dot}</span>}
          {memo.recurrence && <span className="mr-1" title="Récurrent">🔄</span>}
          {memo.text}
        </p>
        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {memo.due_date && (
            <span className={`inline-flex items-center gap-1 text-xs ${dateColor}`}>
              <Calendar size={10} />
              {formatDateFR(memo.due_date)}
              {memo.due_time && <span>à {formatTimeFR(memo.due_time)}</span>}
            </span>
          )}
          {category && (
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: category.color + '18', color: category.color }}
            >
              <Tag size={9} />
              {category.label}
            </span>
          )}
          {chantier && (
            <span
              className={`inline-flex items-center gap-1 text-xs hover:underline cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              onClick={(e) => { e.stopPropagation(); setPage?.('chantiers'); }}
              title={chantier.nom}
            >
              <Building2 size={10} />
              {chantier.nom}
            </span>
          )}
          {client && (
            <span
              className={`inline-flex items-center gap-1 text-xs hover:underline cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              onClick={(e) => { e.stopPropagation(); setPage?.('clients'); }}
              title={client.nom}
            >
              <Users size={10} />
              {client.nom || ''}
            </span>
          )}
          {stTotal > 0 && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${
                stDone === stTotal
                  ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {stDone === stTotal ? '☑' : '◻'} {stDone}/{stTotal}
            </span>
          )}
        </div>
      </div>

      {/* Quick actions (hover) */}
      {!selectionMode && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onQuickDate(memo.id); }}
            className={`p-1 rounded text-xs ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            title="Mettre à aujourd'hui"
          >📅</button>
          <button
            onClick={(e) => { e.stopPropagation(); onQuickPriority(memo.id); }}
            className={`p-1 rounded text-xs ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            title="Priorité haute"
          >🔴</button>
          <button
            onClick={(e) => { e.stopPropagation(); onQuickDelete(memo.id); }}
            className={`p-1 rounded text-xs ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            title="Supprimer"
          >🗑️</button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SubtaskList — Subtasks within detail panel
// ════════════════════════════════════════════════════════
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

  // Sort: unchecked first, then checked
  const sorted = [...subtasks].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-xs font-medium ${tc.muted}`}>
          Sous-tâches {total > 0 && <span className="font-normal">({done}/{total})</span>}
        </label>
      </div>

      {/* Mini progress bar */}
      {total > 0 && (
        <div className={`h-1 rounded-full mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: done === total ? '#22c55e' : couleur }}
          />
        </div>
      )}

      {/* Subtask list */}
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
              className={`opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:text-red-500 transition-opacity`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add subtask input */}
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
// MemoDetail — Slide-in detail panel
// ════════════════════════════════════════════════════════
function MemoDetail({ memo, onUpdate, onDelete, onClose, chantiers, clients, couleur, isDark, addMemo }) {
  const [text, setText] = useState(memo.text || '');
  const [notes, setNotes] = useState(memo.notes || '');
  const debouncedText = useDebounce(text, 800);
  const debouncedNotes = useDebounce(notes, 800);
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const isFirstRender = useRef(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
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

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Supprimer ce mémo ?',
      message: `"${memo.text?.substring(0, 50)}${memo.text?.length > 50 ? '...' : ''}"`,
      confirmText: 'Supprimer',
      confirmColor: '#ef4444',
    });
    if (ok) {
      onDelete(memo.id);
      onClose();
      showToast('Mémo supprimé', 'success');
    }
  };

  // ── Share menu ──
  const [showShareMenu, setShowShareMenu] = useState(false);
  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const getShareMessage = () => {
    const chantier = memo.chantier_id ? chantiers.find(c => c.id === memo.chantier_id) : null;
    const client = memo.client_id ? clients.find(c => c.id === memo.client_id) : null;
    const parts = ['[Mémo ChantierPro]', memo.text];
    if (memo.due_date) parts.push(`📅 ${formatDateFR(memo.due_date)}${memo.due_time ? ' à ' + formatTimeFR(memo.due_time) : ''}`);
    if (chantier) parts.push(`🏗️ ${chantier.nom}`);
    if (client) parts.push(`👤 ${client.nom || ''} ${client.prenom || ''}`);
    return parts.join('\n');
  };

  const handleCopyShare = () => {
    const message = getShareMessage();
    navigator.clipboard.writeText(message).then(() => {
      showToast('Lien copié', 'success');
    }).catch(() => {
      showToast('Erreur de copie', 'error');
    });
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: 'Mémo ChantierPro', text: getShareMessage() });
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Partage annulé', 'info');
    }
    setShowShareMenu(false);
  };

  const recType = memo.recurrence?.type || memo.recurrence || '';
  const recInterval = memo.recurrence?.interval || 1;
  const recUnit = memo.recurrence?.unit || 'day';

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
        aria-label="Détail du mémo"
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
                <CheckCircle2 size={11} /> ✓ Sauvegardé
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs flex items-center gap-1 text-orange-500">
                <AlertCircle size={11} /> Erreur
                <button onClick={retrySave} className="underline hover:text-orange-600 ml-0.5">Réessayer</button>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className={`font-semibold text-sm ${tc.text}`}>Détail du mémo</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className={`p-1.5 rounded-lg ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                aria-label="Partager le mémo"
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
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              aria-label="Supprimer ce mémo définitivement"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mémo */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${tc.muted}`}>Mémo</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
              placeholder="Contenu du mémo..."
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

// ════════════════════════════════════════════════════════
// StatsBar — Mini statistics widget
// ════════════════════════════════════════════════════════
function StatsBar({ memos, isDark, couleur }) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);

    const completedThisWeek = memos.filter(m =>
      m.is_done && m.done_at && new Date(m.done_at) >= weekStart
    ).length;

    const total = memos.length;
    const completed = memos.filter(m => m.is_done).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const overdueCount = memos.filter(m => !m.is_done && m.due_date && m.due_date < today()).length;

    // Completed this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const completedThisMonth = memos.filter(m =>
      m.is_done && m.done_at && new Date(m.done_at) >= monthStart
    ).length;

    return { completedThisWeek, completionRate, overdueCount, completedThisMonth, completed, total };
  }, [memos]);

  // #2: Completion color progressive
  const completionColor = stats.completionRate <= 30 ? '#EF4444' : stats.completionRate <= 70 ? '#F97316' : '#22C55E';

  // #1: Overdue conditional styling
  const overdueNeutral = stats.overdueCount === 0;

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {/* Cette semaine */}
      <div className={`${isDark ? 'bg-orange-900/30' : 'bg-orange-50'} rounded-lg px-3 py-2 text-center`}>
        <div className="text-lg font-bold text-orange-600">{stats.completedThisWeek}</div>
        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cette semaine</div>
      </div>

      {/* #2: Complétion — color + subline + progress bar */}
      <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg px-3 py-2 text-center`}>
        <div className="text-lg font-bold" style={{ color: completionColor }}>{stats.completionRate}%</div>
        <div className={`h-1 rounded-full mt-1 mb-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${stats.completionRate}%`, backgroundColor: completionColor }} />
        </div>
        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {stats.completed} / {stats.total} ce mois
        </div>
      </div>

      {/* #1: En retard — conditional color */}
      <div className={`${overdueNeutral ? (isDark ? 'bg-slate-800' : 'bg-slate-50') : (isDark ? 'bg-red-900/30' : 'bg-red-50')} rounded-lg px-3 py-2 text-center`}>
        <div className={`text-lg font-bold ${overdueNeutral ? (isDark ? 'text-slate-500' : 'text-slate-400') : 'text-red-600'}`}>{stats.overdueCount}</div>
        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>En retard</div>
      </div>

      {/* #3: Ce mois — Lucide CheckCircle2 icon */}
      <div className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg px-3 py-2 text-center`}>
        <div className="text-lg font-bold text-blue-600 flex items-center justify-center gap-1">
          <CheckCircle2 size={16} className="text-green-500" />
          {stats.completedThisMonth}
        </div>
        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ce mois</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// BulkActionBar — Floating bar for multi-selection
// ════════════════════════════════════════════════════════
function BulkActionBar({ count, onDate, onCategory, onPriority, onComplete, onDelete, onCancel, isDark, couleur }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-full px-6 py-3 flex items-center gap-3 shadow-xl z-40">
      <span className="text-sm font-medium">{count} sélectionné{count > 1 ? 's' : ''}</span>
      <div className="w-px h-5 bg-gray-600" />

      {/* Date */}
      <div className="relative">
        <button onClick={() => setShowDatePicker(!showDatePicker)} className="text-sm hover:text-amber-300 transition-colors" title="Date">📅</button>
        {showDatePicker && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 rounded-lg p-2 shadow-lg min-w-[120px]">
            <button onClick={() => { onDate(today()); setShowDatePicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700">Aujourd'hui</button>
            <button onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); onDate(d.toISOString().split('T')[0]); setShowDatePicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700">Demain</button>
            <button onClick={() => { onDate(''); setShowDatePicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700 text-red-400">Retirer date</button>
          </div>
        )}
      </div>

      {/* Category */}
      <div className="relative">
        <button onClick={() => setShowCategoryPicker(!showCategoryPicker)} className="text-sm hover:text-purple-300 transition-colors" title="Catégorie">🏷️</button>
        {showCategoryPicker && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 rounded-lg p-2 shadow-lg min-w-[120px]">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => { onCategory(c.value); setShowCategoryPicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700">{c.label}</button>
            ))}
            <button onClick={() => { onCategory(''); setShowCategoryPicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700 text-red-400">Aucune</button>
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="relative">
        <button onClick={() => setShowPriorityPicker(!showPriorityPicker)} className="text-sm hover:text-yellow-300 transition-colors" title="Priorité">⚡</button>
        {showPriorityPicker && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 rounded-lg p-2 shadow-lg min-w-[120px]">
            {PRIORITIES.map(p => (
              <button key={p.value} onClick={() => { onPriority(p.value); setShowPriorityPicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700">{p.dot} {p.label}</button>
            ))}
            <button onClick={() => { onPriority(''); setShowPriorityPicker(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-700 text-red-400">Aucune</button>
          </div>
        )}
      </div>

      <button onClick={onComplete} className="text-sm hover:text-green-300 transition-colors" title="Terminer">✅</button>
      <button onClick={onDelete} className="text-sm text-red-400 hover:text-red-300 transition-colors" title="Supprimer">🗑️</button>
      <div className="w-px h-5 bg-gray-600" />
      <button onClick={onCancel} className="text-sm hover:text-gray-300 transition-colors"><X size={14} /></button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MemosPage — Main page component
// ════════════════════════════════════════════════════════
export default function MemosPage({
  memos = [],
  addMemo,
  updateMemo,
  deleteMemo,
  toggleMemo,
  chantiers = [],
  clients = [],
  setPage,
  couleur = '#f97316',
  isDark = false,
}) {
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selectedMemoId, setSelectedMemoId] = useState(null);
  const [newMemoText, setNewMemoText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({ done: true });
  const [sortBy, setSortBy] = useState('recent');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [filterCategoryChip, setFilterCategoryChip] = useState('');
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try {
      const ts = localStorage.getItem('cp_memos_nudge_dismissed');
      return ts && (Date.now() - parseInt(ts)) < 86400000; // 24h
    } catch { return false; }
  });
  const [focusSortIndex, setFocusSortIndex] = useState(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // ── Web Speech API availability ──
  const hasSpeechAPI = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // ── Voice dictation ──
  const startListening = useCallback(() => {
    if (!hasSpeechAPI) {
      showToast("La saisie vocale n'est pas disponible sur ce navigateur", 'warning');
      return;
    }
    if (isListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setNewMemoText(transcript);

      // Auto-submit after 2s silence
      clearTimeout(silenceTimerRef.current);
      if (event.results[event.results.length - 1].isFinal) {
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          // Submit if there's text
          const trimmed = transcript.trim();
          if (trimmed) {
            addMemo({ text: trimmed });
            setNewMemoText('');
            showToast('Mémo vocal ajouté', 'success');
          }
        }, 2000);
      }
    };

    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e.error);
      setIsListening(false);
      if (e.error === 'not-allowed') {
        showToast('Accès au microphone refusé. Vérifiez les paramètres de votre navigateur.', 'warning');
      } else if (e.error === 'no-speech') {
        showToast('Aucune voix détectée. Réessayez.', 'info');
      } else {
        showToast('Erreur de reconnaissance vocale', 'error');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [hasSpeechAPI, isListening, addMemo, showToast]);

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Theme
  const tc = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800' : 'bg-white',
    text: isDark ? 'text-white' : 'text-slate-900',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    border: isDark ? 'border-slate-700' : 'border-slate-200',
    input: isDark ? 'bg-slate-700 text-white placeholder-slate-400 border-slate-600' : 'bg-white text-slate-900 placeholder-slate-400 border-slate-300',
  };

  // ── Handle recurring memo completion ──
  const handleToggle = useCallback((id) => {
    const memo = memos.find(m => m.id === id);
    if (memo && !memo.is_done && memo.recurrence) {
      // Completing a recurring memo → create next occurrence
      const nextDate = getNextOccurrence(memo.due_date || today(), memo.recurrence);
      if (nextDate) {
        addMemo({
          text: memo.text,
          notes: memo.notes,
          priority: memo.priority,
          due_date: nextDate,
          due_time: memo.due_time,
          category: memo.category,
          chantier_id: memo.chantier_id,
          client_id: memo.client_id,
          recurrence: memo.recurrence,
          subtasks: (memo.subtasks || []).map(s => ({ ...s, done: false })),
        });
        showToast('Prochaine occurrence créée', 'info');
      }
    }
    toggleMemo(id);
  }, [memos, toggleMemo, addMemo, showToast]);

  // ── Quick capture ──
  const handleQuickAdd = useCallback(async () => {
    const trimmed = newMemoText.trim();
    if (!trimmed) return;
    const result = await addMemo({ text: trimmed });
    const newId = result?.id;
    setNewMemoText('');
    // #9: Toast with link to open detail for setting a date
    showToast(
      newId ? 'Mémo ajouté · Cliquez ici pour définir une date' : 'Mémo ajouté',
      'success',
      newId ? 4000 : 3000
    );
    if (newId) {
      // Auto-open detail panel after a short delay so user sees the toast
      setTimeout(() => setSelectedMemoId(newId), 300);
    }
    inputRef.current?.focus();
  }, [newMemoText, addMemo, showToast]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  // ── Quick actions ──
  const handleQuickDate = (id) => {
    updateMemo(id, { due_date: today() });
    showToast('Date mise à aujourd\'hui', 'success');
  };

  const handleQuickPriority = (id) => {
    const memo = memos.find(m => m.id === id);
    const newPriority = memo?.priority === 'haute' ? null : 'haute';
    updateMemo(id, { priority: newPriority });
  };

  const handleQuickDelete = async (id) => {
    const memo = memos.find(m => m.id === id);
    const ok = await confirm({
      title: 'Supprimer ce mémo ?',
      message: `"${memo?.text?.substring(0, 50)}${memo?.text?.length > 50 ? '...' : ''}"`,
      confirmText: 'Supprimer',
      confirmColor: '#ef4444',
    });
    if (ok) {
      deleteMemo(id);
      showToast('Mémo supprimé', 'success');
    }
  };

  // ── Multi-select ──
  const toggleMultiSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDate = (date) => {
    selectedIds.forEach(id => updateMemo(id, { due_date: date || null }));
    showToast(`Date mise à jour pour ${selectedIds.size} mémo(s)`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const handleBulkCategory = (cat) => {
    selectedIds.forEach(id => updateMemo(id, { category: cat || null }));
    showToast(`Catégorie mise à jour pour ${selectedIds.size} mémo(s)`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const handleBulkPriority = (p) => {
    selectedIds.forEach(id => updateMemo(id, { priority: p || null }));
    showToast(`Priorité mise à jour pour ${selectedIds.size} mémo(s)`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const handleBulkComplete = () => {
    selectedIds.forEach(id => handleToggle(id));
    showToast(`${selectedIds.size} mémo(s) terminé(s)`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Supprimer les mémos ?',
      message: `${selectedIds.size} mémo(s) seront supprimés.`,
      confirmText: 'Supprimer',
      confirmColor: '#ef4444',
    });
    if (ok) {
      selectedIds.forEach(id => deleteMemo(id));
      showToast(`${selectedIds.size} mémo(s) supprimé(s)`, 'success');
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  // ── Drag & drop for "Non triés" section ──
  const handleDragStart = (e, memoId) => {
    e.dataTransfer.setData('memoId', memoId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (e, targetMemoId) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceMemoId = e.dataTransfer.getData('memoId');
    if (sourceMemoId === targetMemoId) return;

    const undated = memos.filter(m => !m.is_done && !m.due_date);
    const sourceIdx = undated.findIndex(m => m.id === sourceMemoId);
    const targetIdx = undated.findIndex(m => m.id === targetMemoId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    // Reorder
    const reordered = [...undated];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    // Update sort_order
    reordered.forEach((m, i) => {
      updateMemo(m.id, { sort_order: i, position: i });
    });
  };

  // ── Filtering + search (enhanced: text, notes, client, chantier) ──
  const filteredMemos = useMemo(() => {
    let list = [...memos];

    // Search filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(m => {
        const chantierName = m.chantier_id ? (chantiers.find(c => c.id === m.chantier_id)?.nom || '').toLowerCase() : '';
        const clientName = m.client_id ? (clients.find(c => c.id === m.client_id)?.nom || '').toLowerCase() : '';
        return (
          (m.text || '').toLowerCase().includes(q) ||
          (m.notes || '').toLowerCase().includes(q) ||
          (m.category || '').toLowerCase().includes(q) ||
          chantierName.includes(q) ||
          clientName.includes(q)
        );
      });
    }

    // Category filter (from dropdown or chips)
    const activeCatFilter = filterCategory || filterCategoryChip;
    if (activeCatFilter) {
      list = list.filter(m => m.category === activeCatFilter);
    }

    // Priority filter
    if (filterPriority) {
      list = list.filter(m => m.priority === filterPriority);
    }

    return list;
  }, [memos, debouncedSearch, filterCategory, filterCategoryChip, filterPriority, chantiers, clients]);

  // ── Sorting ──
  // #11: Priority always applied as primary sort within each section,
  // then secondary sort by user-selected criteria
  const sortMemos = useCallback((list) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      // Primary: priority (haute first)
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;

      // Secondary: user-selected sort
      switch (sortBy) {
        case 'oldest':
          return (a.created_at || '').localeCompare(b.created_at || '');
        case 'priority':
          return 0; // already sorted by priority
        case 'alpha':
          return (a.text || '').localeCompare(b.text || '', 'fr');
        case 'recent':
        default:
          return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });
    return sorted;
  }, [sortBy]);

  // ── Tab-specific views ──
  const inboxSections = useMemo(() => {
    const active = filteredMemos.filter(m => !m.is_done);
    const done = filteredMemos.filter(m => m.is_done);

    const overdue = sortMemos(active.filter(isOverdue));
    const todayMemos = sortMemos(active.filter(isToday));
    const future = sortMemos(active.filter(isFuture));
    const undated = active.filter(isUndated).sort((a, b) => (a.sort_order || a.position || 0) - (b.sort_order || b.position || 0));

    return { overdue, today: todayMemos, future, undated, done: sortMemos(done) };
  }, [filteredMemos, sortMemos]);

  const todayViewMemos = useMemo(() => {
    return sortMemos(
      filteredMemos.filter(m => !m.is_done && m.due_date && m.due_date <= today())
    );
  }, [filteredMemos, sortMemos]);

  // Toggle section collapse
  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedMemo = memos.find(m => m.id === selectedMemoId);

  // Stats
  const activeCount = memos.filter(m => !m.is_done).length;
  const overdueCount = memos.filter(isOverdue).length;

  const tabs = [
    { id: 'inbox', label: 'Inbox', count: activeCount },
    { id: 'today', label: "Aujourd'hui" },
    { id: 'calendar', label: 'Calendrier' },
  ];

  // Section renderer
  const renderSection = (title, items, key, color, icon, draggable = false) => {
    if (items.length === 0) return null;
    const isCollapsed = collapsedSections[key];
    const Icon = icon;

    return (
      <div key={key} className="mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleSection(key)}
            className={`flex items-center gap-2 flex-1 text-left px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide ${
              isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {Icon && <Icon size={13} style={{ color }} />}
            <span style={{ color }}>{title}</span>
            <span className={`ml-auto text-xs font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {items.length}
            </span>
          </button>
          {/* #12: "Tout planifier" CTA for unsorted section */}
          {key === 'undated' && items.length > 0 && (
            <button
              onClick={() => { setFocusSortIndex(0); setActiveTab('inbox'); }}
              className={`text-[10px] px-2 py-1 rounded-md font-medium whitespace-nowrap ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              Tout planifier →
            </button>
          )}
        </div>
        {/* #12: Info line for unsorted section */}
        {key === 'undated' && !isCollapsed && (
          <p className={`text-[10px] px-2 mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            💡 Ces mémos n'ont pas de date. Cliquez pour les planifier.
          </p>
        )}
        {!isCollapsed && (
          <div className="space-y-0.5 mt-1">
            {items.map((m, idx) => (
              <div
                key={m.id}
                draggable={draggable}
                onDragStart={draggable ? (e) => handleDragStart(e, m.id) : undefined}
                onDragOver={draggable ? (e) => handleDragOver(e, idx) : undefined}
                onDragLeave={draggable ? handleDragLeave : undefined}
                onDrop={draggable ? (e) => handleDrop(e, m.id) : undefined}
              >
                {draggable && dragOverIndex === idx && (
                  <div className="h-0.5 bg-blue-500 rounded-full mx-3 my-0.5" />
                )}
                <div className={`flex items-start ${draggable ? 'gap-1' : ''}`}>
                  {draggable && (
                    <div className={`mt-3 cursor-grab flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                      <GripVertical size={14} />
                    </div>
                  )}
                  <div className="flex-1">
                    <MemoItem
                      memo={m}
                      onToggle={handleToggle}
                      onSelect={setSelectedMemoId}
                      isSelected={selectedMemoId === m.id}
                      chantiers={chantiers}
                      clients={clients}
                      couleur={couleur}
                      isDark={isDark}
                      onQuickDate={handleQuickDate}
                      onQuickPriority={handleQuickPriority}
                      onQuickDelete={handleQuickDelete}
                      setPage={setPage}
                      selectionMode={selectionMode}
                      isMultiSelected={selectedIds.has(m.id)}
                      onMultiSelect={toggleMultiSelect}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const hasActiveFilters = filterCategory || filterCategoryChip || filterPriority;

  return (
    <div className="max-w-4xl mx-auto">
      {/* CSS for slide-in animation */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${tc.text}`}>Mémos</h1>
        <p className={`text-sm mt-1 ${tc.muted}`}>
          {activeCount > 0
            ? `${activeCount} mémo${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}${overdueCount > 0 ? ` · ${overdueCount} en retard` : ''}`
            : 'Aucun mémo actif'}
        </p>
      </div>

      {/* Stats bar */}
      <StatsBar memos={memos} isDark={isDark} couleur={couleur} />

      {/* Quick capture — with voice + always-visible add button */}
      <div className={`${tc.card} rounded-xl border ${tc.border} p-3 mb-4`}>
        <div className="flex items-center gap-2">
          {/* Voice dictation button — shows always, error toast if unsupported */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              isListening
                ? 'text-white'
                : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            style={isListening ? { backgroundColor: couleur, animation: 'pulse 1.5s infinite' } : {}}
            aria-label={isListening ? 'Arrêter la dictée vocale' : 'Démarrer la dictée vocale'}
            title={isListening ? 'Arrêter la dictée' : 'Dictée vocale'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={newMemoText}
            onChange={(e) => setNewMemoText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'En écoute... parlez maintenant' : 'Nouveau mémo...'}
            className={`flex-1 bg-transparent border-none outline-none text-sm min-w-0 ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            aria-label="Créer un nouveau mémo"
            aria-describedby="memo-input-hint"
          />
          <span id="memo-input-hint" className="sr-only">Appuyez sur Entrée pour créer le mémo, ou utilisez le bouton microphone pour la dictée vocale</span>
          {/* Always-visible add button (44px touch target) */}
          <button
            onClick={handleQuickAdd}
            disabled={!newMemoText.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: couleur }}
            aria-label="Ajouter le mémo"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
        {/* Listening indicator */}
        {isListening && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>
              En écoute... (envoi automatique après 2s de silence)
            </span>
          </div>
        )}
      </div>

      {/* Nudge: unsorted memos */}
      {(() => {
        const undatedActive = memos.filter(m => !m.is_done && !m.due_date);
        if (undatedActive.length >= 3 && !nudgeDismissed && focusSortIndex === null) {
          return (
            <div className={`${isDark ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'} border rounded-xl p-3 mb-4 flex items-center gap-3`}>
              <span className="text-lg flex-shrink-0">📂</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                  {undatedActive.length} mémo{undatedActive.length > 1 ? 's' : ''} sans date
                </p>
                <p className={`text-xs ${isDark ? 'text-amber-300/70' : 'text-amber-600'}`}>Les planifier maintenant ?</p>
              </div>
              <button
                onClick={() => { setFocusSortIndex(0); setActiveTab('inbox'); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                style={{ backgroundColor: couleur }}
              >
                Trier
              </button>
              <button
                onClick={() => {
                  setNudgeDismissed(true);
                  try { localStorage.setItem('cp_memos_nudge_dismissed', String(Date.now())); } catch {}
                }}
                className={`flex-shrink-0 p-1 rounded ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X size={14} />
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Focus sort mode overlay */}
      {focusSortIndex !== null && (() => {
        const undatedActive = memos.filter(m => !m.is_done && !m.due_date);
        if (undatedActive.length === 0 || focusSortIndex >= undatedActive.length) {
          return (
            <div className={`${tc.card} rounded-xl border ${tc.border} p-6 mb-4 text-center`}>
              <span className="text-4xl block mb-3">🎉</span>
              <p className={`font-medium ${tc.text}`}>Tous les mémos sont triés !</p>
              <button
                onClick={() => setFocusSortIndex(null)}
                className="mt-3 px-4 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: couleur }}
              >
                Terminé
              </button>
            </div>
          );
        }
        const memo = undatedActive[focusSortIndex];
        return (
          <div className={`${tc.card} rounded-xl border ${tc.border} p-4 mb-4`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium ${tc.muted}`}>
                Tri rapide — {focusSortIndex + 1}/{undatedActive.length}
              </span>
              <button
                onClick={() => setFocusSortIndex(null)}
                className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <X size={14} className={tc.muted} />
              </button>
            </div>
            {/* Progress bar */}
            <div className={`h-1 rounded-full mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="h-full rounded-full transition-all" style={{ width: `${((focusSortIndex) / undatedActive.length) * 100}%`, backgroundColor: couleur }} />
            </div>
            <p className={`text-sm font-medium mb-3 ${tc.text}`}>{memo.text}</p>
            {memo.notes && <p className={`text-xs mb-3 ${tc.muted}`}>{memo.notes}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { updateMemo(memo.id, { due_date: today() }); showToast('Planifié aujourd\'hui', 'success'); setFocusSortIndex(prev => prev + 1); }}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-500 text-white min-h-[44px]"
              >
                📅 Aujourd'hui
              </button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); updateMemo(memo.id, { due_date: d.toISOString().split('T')[0] }); showToast('Planifié demain', 'success'); setFocusSortIndex(prev => prev + 1); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium min-h-[44px] ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Demain
              </button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); updateMemo(memo.id, { due_date: d.toISOString().split('T')[0] }); showToast('Planifié la semaine prochaine', 'success'); setFocusSortIndex(prev => prev + 1); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium min-h-[44px] ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Semaine pro
              </button>
              <button
                onClick={() => { setFocusSortIndex(prev => prev + 1); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium min-h-[44px] ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Passer →
              </button>
            </div>
          </div>
        );
      })()}

      {/* Tabs + search + filters */}
      <div className={`${tc.card} rounded-xl border ${tc.border} overflow-hidden`}>
        {/* Tab bar */}
        <div className={`flex items-center gap-1 px-3 pt-3 pb-2 border-b ${tc.border}`}>
          <div className="flex gap-1 flex-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-white'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                style={activeTab === tab.id ? { backgroundColor: couleur } : {}}
              >
                {tab.label}
                {tab.count > 0 && activeTab !== tab.id && (
                  <span className={`ml-1.5 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Selection mode toggle */}
            <button
              onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
              className={`p-1.5 rounded-lg transition-colors ${
                selectionMode
                  ? 'text-white'
                  : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
              style={selectionMode ? { backgroundColor: couleur } : {}}
              title="Mode sélection"
            >
              <CheckSquare size={15} />
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border ${tc.input} cursor-pointer`}
              title="Trier par"
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${
                hasActiveFilters
                  ? 'text-white'
                  : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
              style={hasActiveFilters ? { backgroundColor: couleur } : {}}
              title="Filtres"
            >
              <Filter size={15} />
            </button>
          </div>
        </div>

        {/* Category filter chips */}
        <div className={`flex items-center gap-1.5 px-3 py-2 border-b ${tc.border} overflow-x-auto scrollbar-hide`}>
          <button
            onClick={() => setFilterCategoryChip('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
              !filterCategoryChip
                ? 'text-white'
                : isDark ? 'text-slate-400 bg-slate-700/50 hover:bg-slate-700' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
            style={!filterCategoryChip ? { backgroundColor: couleur } : {}}
          >
            Tous
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilterCategoryChip(filterCategoryChip === cat.value ? '' : cat.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
                filterCategoryChip === cat.value
                  ? 'text-white'
                  : isDark ? 'text-slate-400 bg-slate-700/50 hover:bg-slate-700' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
              style={filterCategoryChip === cat.value ? { backgroundColor: cat.color } : {}}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        {showFilters && (
          <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b ${tc.border}`}>
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${tc.muted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (texte, notes, client, chantier)..."
                className={`w-full pl-8 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 ${tc.input}`}
                style={{ '--tw-ring-color': couleur }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${tc.muted}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            >
              <option value="">Catégorie</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 ${tc.input}`}
              style={{ '--tw-ring-color': couleur }}
            >
              <option value="">Priorité</option>
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.dot} {p.label}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { setFilterCategory(''); setFilterPriority(''); setSearchQuery(''); }}
                className="text-xs px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-3 min-h-[300px]">
          {activeTab === 'inbox' && (
            <>
              {renderSection('En retard', inboxSections.overdue, 'overdue', '#ef4444', AlertCircle)}
              {renderSection("Aujourd'hui", inboxSections.today, 'today', '#f59e0b', Clock)}
              {renderSection('Prochainement', inboxSections.future, 'future', '#3b82f6', Calendar)}
              {renderSection('Non triés', inboxSections.undated, 'undated', isDark ? '#94a3b8' : '#64748b', StickyNote, true)}
              {renderSection('Terminés', inboxSections.done, 'done', '#22c55e', CheckCircle2)}

              {filteredMemos.length === 0 && (
                <div className={`text-center py-12 ${tc.muted}`}>
                  <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Aucun mémo</p>
                  <p className="text-xs mt-1">Tapez ci-dessus pour créer votre premier mémo</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'today' && (
            <>
              {todayViewMemos.length > 0 ? (
                <div className="space-y-0.5">
                  {todayViewMemos.map(m => (
                    <MemoItem
                      key={m.id}
                      memo={m}
                      onToggle={handleToggle}
                      onSelect={setSelectedMemoId}
                      isSelected={selectedMemoId === m.id}
                      chantiers={chantiers}
                      clients={clients}
                      couleur={couleur}
                      isDark={isDark}
                      onQuickDate={handleQuickDate}
                      onQuickPriority={handleQuickPriority}
                      onQuickDelete={handleQuickDelete}
                      setPage={setPage}
                      selectionMode={selectionMode}
                      isMultiSelected={selectedIds.has(m.id)}
                      onMultiSelect={toggleMultiSelect}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={PartyPopper}
                  title="Tout est à jour pour aujourd'hui !"
                  description="Ajoutez une tâche ou consultez votre inbox."
                  actionLabel="+ Nouveau mémo"
                  onAction={() => inputRef.current?.focus()}
                  isDark={isDark}
                />
              )}
            </>
          )}

          {activeTab === 'calendar' && (
            <MemoCalendarView
              memos={filteredMemos}
              onSelectMemo={setSelectedMemoId}
              selectedMemoId={selectedMemoId}
              toggleMemo={handleToggle}
              addMemo={addMemo}
              chantiers={chantiers}
              clients={clients}
              couleur={couleur}
              isDark={isDark}
            />
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onDate={handleBulkDate}
          onCategory={handleBulkCategory}
          onPriority={handleBulkPriority}
          onComplete={handleBulkComplete}
          onDelete={handleBulkDelete}
          onCancel={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {/* Detail panel */}
      {selectedMemo && !selectionMode && (
        <MemoDetail
          memo={selectedMemo}
          onUpdate={updateMemo}
          onDelete={deleteMemo}
          onClose={() => setSelectedMemoId(null)}
          chantiers={chantiers}
          clients={clients}
          couleur={couleur}
          isDark={isDark}
          addMemo={addMemo}
        />
      )}
    </div>
  );
}
