import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus, ChevronDown, ChevronRight, Calendar, Clock,
  ClipboardList, AlertCircle, CheckCircle2, StickyNote,
  GripVertical, Mic, MicOff, Archive, X,
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useConfirm, useToast } from '../../context/AppContext';
import TaskItem from './TaskItem';
import TaskDetail from './TaskDetail';
import BulkActionBar from './BulkActionBar';
import { CATEGORIES, PRIORITIES, PRIORITY_ORDER, SORT_OPTIONS } from './constants';
import { today, isOverdue, isToday, isFuture, isUndated, getNextOccurrence } from './helpers';

// ── StatsBar ──
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
    const overdueCount = memos.filter(m => !m.is_done && m.due_date && m.due_date < today()).length;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const createdThisMonth = memos.filter(m => {
      const d = new Date(m.created_at || m.createdAt || m.id?.substring?.(0, 8));
      return !isNaN(d.getTime()) && d >= monthStart;
    });
    const completedThisMonth = createdThisMonth.filter(m => m.is_done).length;
    const totalThisMonth = createdThisMonth.length;
    const completionRate = totalThisMonth > 0 ? Math.round((completedThisMonth / totalThisMonth) * 100) : (total > 0 ? Math.round((completed / total) * 100) : 0);

    return { completedThisWeek, completionRate, overdueCount, completedThisMonth, totalThisMonth, completed, total };
  }, [memos]);

  const completionColor = stats.completionRate <= 30 ? '#EF4444' : stats.completionRate <= 70 ? '#F97316' : '#22C55E';
  const overdueNeutral = stats.overdueCount === 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <div className={`rounded-xl border px-3 py-2.5 text-center transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} style={{ borderLeftWidth: '3px', borderLeftColor: couleur }}>
        <div className="text-lg font-bold" style={{ color: couleur }}>{stats.completedThisWeek}</div>
        <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cette semaine</div>
      </div>
      <div className={`rounded-xl border px-3 py-2.5 text-center transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} style={{ borderLeftWidth: '3px', borderLeftColor: completionColor }}>
        <div className="text-lg font-bold" style={{ color: completionColor }}>{stats.completionRate}%</div>
        <div className={`h-1 rounded-full mt-1 mb-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${stats.completionRate}%`, background: `linear-gradient(90deg, ${completionColor}, ${completionColor}cc)` }} />
        </div>
        <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {stats.completedThisMonth} / {stats.totalThisMonth || stats.total} ce mois
        </div>
      </div>
      <div className={`rounded-xl border px-3 py-2.5 text-center transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} style={{ borderLeftWidth: '3px', borderLeftColor: overdueNeutral ? (isDark ? '#475569' : '#cbd5e1') : '#ef4444' }}>
        <div className={`text-lg font-bold ${overdueNeutral ? (isDark ? 'text-slate-500' : 'text-slate-400') : 'text-red-500'}`}>{stats.overdueCount}</div>
        <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>En retard</div>
      </div>
      <div className={`rounded-xl border px-3 py-2.5 text-center transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} style={{ borderLeftWidth: '3px', borderLeftColor: '#3b82f6' }}>
        <div className="text-lg font-bold text-blue-500 flex items-center justify-center gap-1">
          <CheckCircle2 size={14} className="text-emerald-500" />
          {stats.completedThisMonth}
        </div>
        <div className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Complétées ce mois</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TaskListView — Vue liste des tâches groupées par statut
// ════════════════════════════════════════════════════════
export default function TaskListView({
  memos = [],
  addMemo,
  updateMemo,
  deleteMemo,
  toggleMemo,
  chantiers = [],
  clients = [],
  equipe = [],
  isDark = false,
  couleur = '#f97316',
  filters = {},
  selectedMemoId,
  onSelectMemo,
  setPage,
}) {
  const [newMemoText, setNewMemoText] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({ done: true });
  const [sortBy, setSortBy] = useState('recent');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const debouncedSearch = useDebounce(filters.search || '', 300);

  const tc = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800' : 'bg-white',
    text: isDark ? 'text-white' : 'text-slate-900',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    border: isDark ? 'border-slate-700' : 'border-slate-200',
    input: isDark ? 'bg-slate-700 text-white placeholder-slate-400 border-slate-600' : 'bg-white text-slate-900 placeholder-slate-400 border-slate-300',
  };

  // ── Web Speech API ──
  const hasSpeechAPI = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

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

      clearTimeout(silenceTimerRef.current);
      if (event.results[event.results.length - 1].isFinal) {
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          const trimmed = transcript.trim();
          if (trimmed) {
            addMemo({ text: trimmed });
            setNewMemoText('');
            showToast('Tâche vocale ajoutée', 'success');
          }
        }, 2000);
      }
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        showToast('Accès au microphone refusé. Vérifiez les paramètres de votre navigateur.', 'warning');
      } else if (e.error === 'no-speech') {
        showToast('Aucune voix détectée. Réessayez.', 'info');
      } else {
        showToast('Erreur de reconnaissance vocale', 'error');
      }
    };

    recognition.onend = () => setIsListening(false);

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

  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Handle recurring memo completion ──
  const handleToggle = useCallback((id) => {
    const memo = memos.find(m => m.id === id);
    if (memo && !memo.is_done && memo.recurrence) {
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
    showToast(
      newId ? 'Tâche ajoutée' : 'Tâche ajoutée',
      'success',
      3000
    );
    if (newId) {
      setTimeout(() => onSelectMemo(newId), 300);
    }
    inputRef.current?.focus();
  }, [newMemoText, addMemo, showToast, onSelectMemo]);

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
      title: 'Supprimer cette tâche ?',
      message: `"${memo?.text?.substring(0, 50)}${memo?.text?.length > 50 ? '...' : ''}"`,
      confirmText: 'Supprimer',
      confirmColor: '#ef4444',
    });
    if (ok) {
      deleteMemo(id);
      showToast('Tâche supprimée', 'success');
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
    showToast(`Date mise à jour pour ${selectedIds.size} tâche(s)`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const handleBulkCategory = (cat) => {
    selectedIds.forEach(id => updateMemo(id, { category: cat || null }));
    showToast(`Catégorie mise à jour pour ${selectedIds.size} tâche(s)`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const handleBulkPriority = (p) => {
    selectedIds.forEach(id => updateMemo(id, { priority: p || null }));
    showToast(`Priorité mise à jour pour ${selectedIds.size} tâche(s)`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const handleBulkComplete = () => {
    selectedIds.forEach(id => handleToggle(id));
    showToast(`${selectedIds.size} tâche(s) terminée(s)`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };
  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Supprimer les tâches ?',
      message: `${selectedIds.size} tâche(s) seront supprimées.`,
      confirmText: 'Supprimer',
      confirmColor: '#ef4444',
    });
    if (ok) {
      selectedIds.forEach(id => deleteMemo(id));
      showToast(`${selectedIds.size} tâche(s) supprimée(s)`, 'success');
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  // ── Drag & drop ──
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

    const reordered = [...undated];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    reordered.forEach((m, i) => {
      updateMemo(m.id, { sort_order: i, position: i });
    });
  };

  // ── Filtering ──
  const filteredMemos = useMemo(() => {
    let list = [...memos];

    // Search
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

    // Category
    if (filters.category) {
      list = list.filter(m => m.category === filters.category);
    }

    // Priority
    if (filters.priority) {
      list = list.filter(m => m.priority === filters.priority);
    }

    // Assigned to
    if (filters.assignedTo) {
      list = list.filter(m => m.assigned_to === filters.assignedTo);
    }

    // Status filter
    if (filters.status) {
      if (filters.status === 'termine') {
        list = list.filter(m => m.is_done);
      } else if (filters.status === 'en_cours') {
        list = list.filter(m => !m.is_done && m.status === 'en_cours');
      } else if (filters.status === 'a_faire') {
        list = list.filter(m => !m.is_done && (!m.status || m.status === 'a_faire'));
      }
    }

    // Quick filter (time-based)
    if (quickFilter !== 'all') {
      const todayStr = today();
      if (quickFilter === 'today') {
        list = list.filter(m => m.due_date && m.due_date <= todayStr);
      } else if (quickFilter === 'week') {
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0];
        list = list.filter(m => m.due_date && m.due_date <= endOfWeekStr);
      } else if (quickFilter === 'overdue') {
        list = list.filter(m => !m.is_done && m.due_date && m.due_date < todayStr);
      }
    }

    return list;
  }, [memos, debouncedSearch, filters, chantiers, clients, quickFilter]);

  // ── Sorting ──
  const sortMemos = useCallback((list) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;

      switch (sortBy) {
        case 'oldest':
          return (a.created_at || '').localeCompare(b.created_at || '');
        case 'priority':
          return 0;
        case 'alpha':
          return (a.text || '').localeCompare(b.text || '', 'fr');
        case 'recent':
        default:
          return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });
    return sorted;
  }, [sortBy]);

  // ── Sections grouped by status ──
  const sections = useMemo(() => {
    const active = filteredMemos.filter(m => !m.is_done);
    const done = filteredMemos.filter(m => m.is_done);

    const overdue = sortMemos(active.filter(isOverdue));
    const aFaire = sortMemos(active.filter(m => !isOverdue(m) && (!m.status || m.status === 'a_faire')));
    const enCours = sortMemos(active.filter(m => m.status === 'en_cours'));

    return { overdue, aFaire, enCours, done: sortMemos(done) };
  }, [filteredMemos, sortMemos]);

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedMemo = memos.find(m => m.id === selectedMemoId);

  // Section renderer
  const renderSection = (title, items, key, color, icon, draggable = false) => {
    if (items.length === 0) return null;
    const isCollapsed = collapsedSections[key];
    const Icon = icon;

    const sectionBg = key === 'overdue' ? (isDark ? 'bg-red-900/20 rounded-xl p-2' : 'bg-red-50 rounded-xl p-2') : '';

    return (
      <div key={key} className={`mb-3 ${sectionBg}`}>
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
        </div>
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
                    <TaskItem
                      memo={m}
                      onToggle={handleToggle}
                      onSelect={onSelectMemo}
                      isSelected={selectedMemoId === m.id}
                      chantiers={chantiers}
                      clients={clients}
                      equipe={equipe}
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

  return (
    <div>
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

      {/* Stats bar */}
      <StatsBar memos={memos} isDark={isDark} couleur={couleur} />

      {/* Quick capture */}
      <div className={`${tc.card} rounded-xl border ${tc.border} p-3 mb-4`}>
        <div className="flex items-center gap-2">
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
          <input
            ref={inputRef}
            type="text"
            value={newMemoText}
            onChange={(e) => setNewMemoText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'En écoute...' : 'Nouvelle tâche'}
            className={`flex-1 bg-transparent border-none outline-none text-sm min-w-0 ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            aria-label="Créer une nouvelle tâche"
          />
          <button
            onClick={handleQuickAdd}
            disabled={!newMemoText.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: couleur }}
            aria-label="Ajouter la tâche"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
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

      {/* Quick time filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {[
          { id: 'all', label: 'Tout' },
          { id: 'today', label: "Aujourd'hui" },
          { id: 'week', label: 'Cette semaine' },
          { id: 'overdue', label: 'En retard' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setQuickFilter(f.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              quickFilter === f.id
                ? 'text-white border-transparent'
                : isDark
                  ? 'text-slate-300 border-slate-600 hover:border-slate-500'
                  : 'text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
            style={quickFilter === f.id ? { background: couleur, borderColor: couleur } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort control */}
      <div className="flex items-center justify-end gap-2 mb-3">
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
      </div>

      {/* Sections grouped by status */}
      <div className={`${tc.card} rounded-xl border ${tc.border} p-3 min-h-[300px]`}>
        {renderSection('En retard', sections.overdue, 'overdue', '#ef4444', AlertCircle)}
        {renderSection('À faire', sections.aFaire, 'aFaire', '#3b82f6', StickyNote)}
        {renderSection('En cours', sections.enCours, 'enCours', '#f59e0b', Clock)}
        {renderSection('Terminés', sections.done, 'done', '#10b981', CheckCircle2)}

        {/* Archive completed */}
        {sections.done.length > 2 && (
          <div className="flex justify-center py-2">
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: 'Archiver les terminés',
                  message: `Supprimer définitivement ${sections.done.length} tâche${sections.done.length > 1 ? 's' : ''} terminée${sections.done.length > 1 ? 's' : ''} ?`,
                  confirmText: 'Archiver',
                  variant: 'danger',
                });
                if (ok) {
                  sections.done.forEach(m => deleteMemo(m.id));
                  showToast(`${sections.done.length} tâches archivées`, 'success');
                }
              }}
              className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
            >
              <Archive size={13} />
              Archiver les {sections.done.length} terminés
            </button>
          </div>
        )}

        {filteredMemos.length === 0 && (
          <div className={`text-center py-12 ${tc.muted}`}>
            <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune tâche</p>
            <p className="text-xs mt-1">Tapez ci-dessus pour créer votre première tâche</p>
          </div>
        )}
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
        <TaskDetail
          memo={selectedMemo}
          onUpdate={updateMemo}
          onDelete={deleteMemo}
          onClose={() => onSelectMemo(null)}
          chantiers={chantiers}
          clients={clients}
          equipe={equipe}
          couleur={couleur}
          isDark={isDark}
        />
      )}
    </div>
  );
}
