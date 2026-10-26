import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Plus, ChevronDown, ChevronRight, Clock,
  ClipboardList, AlertCircle, CheckCircle2, StickyNote,
  GripVertical, Mic, MicOff, Trash2, ArrowUpDown, SearchX,
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useConfirm, useToast } from '../../context/AppContext';
import TaskItem from './TaskItem';
import TaskDetail from './TaskDetail';
import TuileChiffre from '../ui/TuileChiffre';
import EtatVide from '../ui/EtatVide';
import { Bouton } from '../ui/Bouton';
import { BoutonVolet, Volet, ListeChoix, SegmentDefilant } from '../ui/Filtres';
import { PRIORITY_ORDER, SORT_OPTIONS, classesTon } from './constants';
import { today, isOverdue, getNextOccurrence } from './helpers';
import { jourLocal } from '../../lib/dates';

// ── Les chiffres : seulement quand il y a des tâches, et ils filtrent la liste (audit UX du 20 oct. 2026 : quatre tuiles
// à zéro, « 0% » en rouge pour 0 sur 0, libellés de 10 px, et un chiffre dit deux fois) ──
// Trois tuiles de front au téléphone : une marge intérieure resserrée pour que « Faites cette semaine » tienne sur deux lignes
const SERRE = '!p-3 sm:!p-4';

function Chiffres({ memos, quickFilter, onQuickFilter }) {
  const stats = useMemo(() => {
    const now = new Date();
    const debutSemaine = new Date(now);
    debutSemaine.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    debutSemaine.setHours(0, 0, 0, 0);
    const faitesCetteSemaine = memos.filter((m) => m.is_done && m.done_at && new Date(m.done_at) >= debutSemaine).length;
    const enRetardListe = memos.filter((m) => !m.is_done && m.due_date && m.due_date < today());
    const enRetard = enRetardListe.length;
    // Depuis combien de jours la plus ancienne est en retard : un mot court (« Depuis 26 j »), qui tient dans une tuile de 110 px
    const joursDeRetard = enRetardListe.reduce((plus, m) => Math.max(plus, Math.ceil((new Date(`${today()}T00:00:00`) - new Date(`${m.due_date}T00:00:00`)) / 86400000)), 0);

    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const creeesCeMois = memos.filter((m) => {
      const d = new Date(m.created_at || m.createdAt || m.id?.substring?.(0, 8));
      return !Number.isNaN(d.getTime()) && d >= debutMois;
    });
    const faitesCeMois = creeesCeMois.filter((m) => m.is_done).length;
    return { faitesCetteSemaine, enRetard, joursDeRetard, faitesCeMois, creeesCeMois: creeesCeMois.length };
  }, [memos]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
      <TuileChiffre
        libelle="En retard" valeur={stats.enRetard}
        alerte={stats.enRetard > 0 ? `Depuis ${stats.joursDeRetard} j` : undefined} contexte={stats.enRetard === 0 ? 'Rien en retard' : undefined}
        onClick={() => onQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')} actif={quickFilter === 'overdue'}
        className={SERRE}
      />
      <TuileChiffre libelle="Faites cette semaine" valeur={stats.faitesCetteSemaine} contexte="depuis lundi" className={SERRE} />
      <TuileChiffre
        libelle="Ce mois" valeur={stats.faitesCeMois}
        contexte={stats.creeesCeMois > 0 ? `faites sur ${stats.creeesCeMois} créée${stats.creeesCeMois > 1 ? 's' : ''}` : undefined}
        className={SERRE}
      />
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
  couleur: _couleur,
  filters = {},
  selectedMemoId,
  onSelectMemo,
  setPage,
  peutCreer = true,
  peutModifier = true,
  peutSupprimer = true,
}) {
  const [newMemoText, setNewMemoText] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({ done: true });
  const [sortBy, setSortBy] = useState('recent');
  const [quickFilter, setQuickFilter] = useState('all');
  const [triOuvert, setTriOuvert] = useState(false);
  const boutonTriRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const debouncedSearch = useDebounce(filters.search || '', 300);

  // ── Web Speech API ──
  const hasSpeechAPI = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

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
        silenceTimerRef.current = setTimeout(async () => {
          stopListening();
          const trimmed = transcript.trim();
          if (trimmed) {
            const cree = await addMemo({ text: trimmed });
            if (!cree) return; // refus : le texte dicté reste dans le champ
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
  }, [hasSpeechAPI, isListening, addMemo, showToast, stopListening]);

  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Focus input on mount — à la souris seulement : sur téléphone, le clavier surgissait à
  // l'ouverture de la page et masquait la moitié de l'écran (recette du 9 oct. 2026).
  useEffect(() => {
    if (window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus();
  }, []);

  // ── Handle recurring memo completion ──
  const handleToggle = useCallback(async (id) => {
    const memo = memos.find(m => m.id === id);
    const etaitFaite = memo?.is_done;
    if (!(await toggleMemo(id))) return; // refus : DataContext a dit pourquoi, rien n'est annoncé
    if (memo && !etaitFaite && memo.recurrence) {
      const nextDate = getNextOccurrence(memo.due_date || today(), memo.recurrence);
      if (nextDate) {
        const suivante = await addMemo({
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
        if (suivante) showToast('Prochaine occurrence créée', 'info');
        else showToast('La tâche est cochée, mais la prochaine occurrence n’a pas pu être créée', 'warning');
      }
    }
  }, [memos, toggleMemo, addMemo, showToast]);

  // ── Quick capture : « Tâche ajoutée » seulement si la base l'a prise ──
  const handleQuickAdd = useCallback(async () => {
    const trimmed = newMemoText.trim();
    if (!trimmed) return;
    const result = await addMemo({ text: trimmed });
    if (!result) return; // refus : le texte reste dans le champ, DataContext a dit pourquoi
    setNewMemoText('');
    showToast('Tâche ajoutée', 'success', 3000);
    if (result.id) setTimeout(() => onSelectMemo(result.id), 300);
    inputRef.current?.focus();
  }, [newMemoText, addMemo, showToast, onSelectMemo]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  // ── Quick actions ──
  const handleQuickDate = async (id) => {
    if (await updateMemo(id, { due_date: today() })) showToast('Date mise à aujourd\'hui', 'success');
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
      variant: 'danger',
    });
    if (ok && (await deleteMemo(id))) showToast('Tâche supprimée', 'success');
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
    if (!peutModifier) return;
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

    if (filters.category) list = list.filter(m => m.category === filters.category);
    if (filters.priority) list = list.filter(m => m.priority === filters.priority);
    if (filters.assignedTo) list = list.filter(m => m.assigned_to === filters.assignedTo);

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
        const endOfWeekStr = jourLocal(endOfWeek);
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

  // Pastille « En retard » : compte global, indépendant du raccourci choisi.
  const nbEnRetard = useMemo(() => memos.filter(m => !m.is_done && m.due_date && m.due_date < today()).length, [memos]);

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

  // Section renderer : un titre, un ton (le rouge est pour « en retard »)
  const renderSection = (title, items, key, ton, icon, glissable = false) => {
    if (items.length === 0) return null;
    const draggable = glissable && peutModifier;
    const isCollapsed = collapsedSections[key];
    const Icon = icon;

    return (
      <div key={key} className={`mb-3 ${key === 'overdue' ? 'bg-danger-fond/40 rounded-xl p-2' : ''}`}>
        <button
          type="button"
          onClick={() => toggleSection(key)}
          aria-expanded={!isCollapsed}
          className="w-full flex items-center gap-2 text-left px-2 min-h-[44px] rounded-md text-sm font-semibold hover:bg-surface-2"
        >
          {isCollapsed ? <ChevronRight size={16} aria-hidden="true" className="text-encre-3" /> : <ChevronDown size={16} aria-hidden="true" className="text-encre-3" />}
          {Icon && <Icon size={16} aria-hidden="true" className={classesTon(ton).texte} />}
          <span className={ton === 'neutre' ? 'text-encre' : classesTon(ton).texte}>{title}</span>
          <span className="ml-auto text-sm font-normal text-encre-3 tabular-nums">{items.length}</span>
        </button>
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
                  <div className="h-0.5 bg-accent rounded-full mx-3 my-0.5" />
                )}
                <div className={`flex items-start ${draggable ? 'gap-1' : ''}`}>
                  {draggable && (
                    <div className="mt-3 cursor-grab flex-shrink-0 text-encre-3 hidden sm:block">
                      <GripVertical size={14} aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex-1">
                    <TaskItem
                      memo={m}
                      onToggle={peutModifier ? handleToggle : undefined}
                      onSelect={onSelectMemo}
                      isSelected={selectedMemoId === m.id}
                      chantiers={chantiers}
                      clients={clients}
                      equipe={equipe}
                      isDark={isDark}
                      onQuickDate={peutModifier ? handleQuickDate : undefined}
                      onQuickPriority={peutModifier ? handleQuickPriority : undefined}
                      onQuickDelete={peutSupprimer ? handleQuickDelete : undefined}
                      setPage={setPage}
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
      {/* Les chiffres : seulement quand il y a des tâches */}
      {memos.length > 0 && <Chiffres memos={memos} quickFilter={quickFilter} onQuickFilter={setQuickFilter} />}

      {/* Saisie rapide : une tâche, une dictée — réservée à qui peut créer des tâches */}
      {peutCreer && (
      <div className="bg-surface rounded-2xl border border-bord shadow-e1 p-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
              isListening ? 'bg-accent text-sur-accent animate-pulse' : 'bg-surface-2 text-encre-2 hover:bg-bord'
            }`}
            aria-label={isListening ? 'Arrêter la dictée vocale' : 'Démarrer la dictée vocale'}
            aria-pressed={isListening}
            title={isListening ? 'Arrêter la dictée' : 'Dictée vocale'}
          >
            {isListening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMemoText}
            onChange={(e) => setNewMemoText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'En écoute...' : 'Nouvelle tâche'}
            className="flex-1 bg-transparent border-none outline-none text-base min-w-0 text-encre placeholder:text-encre-3"
            aria-label="Créer une nouvelle tâche"
          />
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!newMemoText.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 bg-accent text-sur-accent"
            aria-label="Ajouter la tâche"
          >
            <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        {isListening && (
          <div className="flex items-center gap-2 mt-2 px-1" role="status">
            <div className="flex gap-1" aria-hidden="true">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-accent-texte">
              En écoute... (envoi automatique après 2s de silence)
            </span>
          </div>
        )}
      </div>
      )}

      {/* Échéance (raccourcis) + tri sur une seule rangée — boîte à outils commune (ui/Filtres.jsx) */}
      {memos.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <SegmentDefilant
                ariaLabel="Échéance des tâches" isDark={isDark}
                options={[
                  { valeur: 'all', libelle: 'Tout' },
                  { valeur: 'today', libelle: "Aujourd'hui" },
                  { valeur: 'week', libelle: 'Cette semaine' },
                  { valeur: 'overdue', libelle: 'En retard', compte: nbEnRetard },
                ]}
                valeur={quickFilter} onChange={setQuickFilter}
              />
            </div>
            <BoutonVolet
              ref={boutonTriRef} icone={ArrowUpDown} libelle="Trier" valeur={SORT_OPTIONS.find(o => o.value === sortBy)?.label}
              ouvert={triOuvert} onClick={() => setTriOuvert(o => !o)} isDark={isDark} libelleCacheTelephone
            />
          </div>
          <Volet ouvert={triOuvert} onFermer={() => setTriOuvert(false)} titre="Trier les tâches" ancreRef={boutonTriRef} largeur={300} isDark={isDark}>
            <ListeChoix
              titre="Trier par" rechercheAuDela={99} isDark={isDark}
              options={SORT_OPTIONS.map(o => ({ valeur: o.value, libelle: o.label }))}
              valeur={sortBy} onChange={(v) => { setSortBy(v); setTriOuvert(false); }}
            />
          </Volet>
        </>
      )}

      {/* Sections grouped by status */}
      <div className="bg-surface rounded-2xl border border-bord shadow-e1 p-3">
        {renderSection('En retard', sections.overdue, 'overdue', 'danger', AlertCircle)}
        {renderSection('À faire', sections.aFaire, 'aFaire', 'neutre', StickyNote)}
        {renderSection('En cours', sections.enCours, 'enCours', 'info', Clock)}
        {renderSection('Terminées', sections.done, 'done', 'succes', CheckCircle2)}

        {/* Supprimer les terminées : la tâche est effacée, pas rangée (avant : « Archiver » qui supprimait) */}
        {peutSupprimer && sections.done.length > 2 && (
          <div className="flex justify-center py-2">
            <Bouton
              variante="discret"
              taille="compacte"
              icone={Trash2}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Supprimer les tâches terminées',
                  message: `Supprimer définitivement ${sections.done.length} tâche${sections.done.length > 1 ? 's' : ''} terminée${sections.done.length > 1 ? 's' : ''} ?`,
                  confirmText: 'Supprimer',
                  variant: 'danger',
                });
                if (!ok) return;
                const aSupprimer = sections.done;
                const resultats = await Promise.all(aSupprimer.map(m => deleteMemo(m.id)));
                const faites = resultats.filter(Boolean).length;
                if (faites === aSupprimer.length) showToast(`${faites} tâche${faites > 1 ? 's' : ''} supprimée${faites > 1 ? 's' : ''}`, 'success');
                else if (faites > 0) showToast(`${faites} tâche${faites > 1 ? 's' : ''} supprimée${faites > 1 ? 's' : ''} sur ${aSupprimer.length}`, 'warning');
              }}
            >
              Supprimer les {sections.done.length} terminées
            </Bouton>
          </div>
        )}

        {filteredMemos.length === 0 && (
          memos.length === 0 ? (
            <EtatVide icone={ClipboardList} titre="Aucune tâche" texte={peutCreer ? 'Tapez dans le champ ci-dessus pour ajouter votre première tâche.' : 'Aucune tâche pour le moment.'} />
          ) : (
            <EtatVide icone={SearchX} titre="Aucune tâche ne correspond" texte="Changez les filtres ou la recherche pour les voir." />
          )
        )}
      </div>

      {/* Detail panel */}
      {selectedMemo && (
        <TaskDetail
          memo={selectedMemo}
          onUpdate={updateMemo}
          onDelete={deleteMemo}
          peutModifier={peutModifier}
          peutSupprimer={peutSupprimer}
          onClose={() => onSelectMemo(null)}
          chantiers={chantiers}
          clients={clients}
          equipe={equipe}
          isDark={isDark}
        />
      )}
    </div>
  );
}
