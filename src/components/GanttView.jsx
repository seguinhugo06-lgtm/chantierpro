import { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Users, Building2 } from 'lucide-react';
import { useConfirm } from '../context/AppContext';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from './ui/Modal';
import Champ from './ui/Champ';
import { Segmente } from './ui/Onglets';
import { Bouton } from './ui/Bouton';
import { generateId } from '../lib/utils';
import { jourLocal } from '../lib/dates';

/**
 * Vue Gantt pour la planification des chantiers
 * Affiche les taches et leur progression dans le temps
 */
export default function GanttView({
  chantiers = [],
  equipe = [],
  taches = [],
  setTaches,
  onUpdateChantier: _onUpdateChantier,
  avancementDe, // (chantier) => avancement affiché, le même que la liste
  isDark: _isDark = false,
  couleur: _couleur,
}) {
  const { confirm } = useConfirm();

  const [viewMode, setViewMode] = useState('week'); // week, month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const containerRef = useRef(null);
  const [form, setForm] = useState({
    nom: '',
    chantierId: '',
    debut: jourLocal(),
    fin: '',
    duree: 1,
    assignes: [],
    statut: 'planifie', // planifie, en_cours, termine
    notes: ''
  });

  // Theme classes
  const cardBg = 'bg-surface border-bord';
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-2';
  const hoverBg = 'hover:bg-surface-2';
  const gridBg = 'bg-fond';
  const todayBg = 'bg-accent/10';

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const dates = [];
    const start = new Date(currentDate);

    if (viewMode === 'week') {
      // Start from Monday
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);

      for (let i = 0; i < 14; i++) { // 2 weeks
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
      }
    } else {
      // Start from first of month
      start.setDate(1);
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

      for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
      }
    }

    return dates;
  }, [currentDate, viewMode]);

  // Group tasks by chantier
  const tasksByChantier = useMemo(() => {
    const grouped = {};

    // Add chantiers with their date ranges
    chantiers.forEach(ch => {
      if (ch.statut === 'en_cours' || ch.statut === 'planifie') {
        grouped[ch.id] = {
          chantier: ch,
          tasks: taches.filter(t => t.chantierId === ch.id)
        };
      }
    });

    return grouped;
  }, [chantiers, taches]);

  // Navigation
  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Date helpers
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatDayName = (date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0).toUpperCase();
  };

  // Calculate task position and width
  const getTaskStyle = (task) => {
    if (!task || !task.debut) return null;
    const startDate = new Date(task.debut);
    if (isNaN(startDate.getTime())) return null;
    const endDate = new Date(task.fin || task.debut);

    const rangeStart = dateRange[0];
    const rangeEnd = dateRange[dateRange.length - 1];

    // Check if task is visible in current range
    if (endDate < rangeStart || startDate > rangeEnd) {
      return null;
    }

    // Calculate position
    const visibleStart = startDate < rangeStart ? rangeStart : startDate;
    const visibleEnd = endDate > rangeEnd ? rangeEnd : endDate;

    const startOffset = Math.floor((visibleStart - rangeStart) / (1000 * 60 * 60 * 24));
    const duration = Math.floor((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1;

    const cellWidth = viewMode === 'week' ? 60 : 30;

    return {
      left: startOffset * cellWidth,
      width: Math.max(duration * cellWidth - 4, 20),
    };
  };

  // Handle task form
  const handleSubmit = () => {
    if (!form.nom || !form.chantierId) return;

    const endDate = new Date(form.debut);
    endDate.setDate(endDate.getDate() + (form.duree - 1));

    const taskData = {
      ...form,
      fin: jourLocal(endDate)
    };

    if (editingTask) {
      setTaches(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
    } else {
      setTaches(prev => [...prev, { id: generateId(), ...taskData }]);
    }

    resetForm();
  };

  const handleDelete = async (taskId) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cette tâche ?' });
    if (confirmed) {
      setTaches(prev => prev.filter(t => t.id !== taskId));
      resetForm();
    }
  };

  const resetForm = () => {
    setForm({
      nom: '',
      chantierId: '',
      debut: jourLocal(),
      fin: '',
      duree: 1,
      assignes: [],
      statut: 'planifie',
      notes: ''
    });
    setShowAddTask(false);
    setEditingTask(null);
  };

  const openEdit = (task) => {
    const debut = new Date(task.debut);
    const fin = new Date(task.fin || task.debut);
    const duree = Math.floor((fin - debut) / (1000 * 60 * 60 * 24)) + 1;

    setForm({
      ...task,
      duree
    });
    setEditingTask(task);
    setShowAddTask(true);
  };

  // Un statut = un ton (src/lib/statuts.js) : la barre d'une tâche et la légende disent la même chose
  const barreStatut = {
    planifie: 'bg-neutre-fond text-neutre-texte border-neutre-point',
    en_cours: 'bg-info-fond text-info-texte border-info-point',
    termine: 'bg-succes-fond text-succes-texte border-succes-point',
  };
  const pointStatut = { planifie: 'bg-neutre-point', en_cours: 'bg-info-point', termine: 'bg-succes-point' };
  const libelleStatut = { planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé' };

  // Render header with dates
  const cellWidth = viewMode === 'week' ? 60 : 30;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={`text-xl font-bold ${textPrimary}`}>Frise du planning</h2>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          {/* Un choix de période n'est pas une action : le composant commun, pas un bouton plein de plus */}
          <Segmente ariaLabel="Période de la frise" valeur={viewMode} onChange={setViewMode} options={[{ valeur: 'week', libelle: 'Semaine' }, { valeur: 'month', libelle: 'Mois' }]} />

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className={`p-2 rounded-lg ${hoverBg}`}>
              <ChevronLeft size={18} className={textSecondary} />
            </button>
            <button
              onClick={goToToday}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg bg-surface-2 text-encre-2`}
            >
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)} className={`p-2 rounded-lg ${hoverBg}`}>
              <ChevronRight size={18} className={textSecondary} />
            </button>
          </div>

          {/* Add task */}
          <Bouton variante="secondaire" icone={Plus} onClick={() => setShowAddTask(true)}>Tâche</Bouton>
        </div>
      </div>

      {/* Current period label */}
      <div className={`text-center ${textPrimary} font-medium`}>
        {viewMode === 'week' ? (
          `${formatDate(dateRange[0])} - ${formatDate(dateRange[dateRange.length - 1])}`
        ) : (
          currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        )}
      </div>

      {/* Gantt chart */}
      <div className={`${cardBg} rounded-xl border overflow-hidden`}>
        <div className="overflow-x-auto" ref={containerRef}>
          <div style={{ minWidth: dateRange.length * cellWidth + 200 }}>
            {/* Date header */}
            <div className={`flex border-b border-bord`}>
              <div className={`w-[200px] flex-shrink-0 px-4 py-3 font-medium ${textPrimary} border-r border-bord`}>
                Chantiers
              </div>
              <div className="flex">
                {dateRange.map((date, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 text-center py-2 border-r border-bord ${
                      isToday(date) ? todayBg : isWeekend(date) ? 'bg-surface-2' : ''
                    }`}
                    style={{ width: cellWidth }}
                  >
                    <p className={`text-xs ${textMuted}`}>{formatDayName(date)}</p>
                    <p className={`text-sm font-medium ${isToday(date) ? 'text-accent-texte' : textPrimary}`}>
                      {date.getDate()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {Object.entries(tasksByChantier).length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Building2 size={48} className={`mx-auto mb-4 ${textMuted}`} />
                <p className={textMuted}>Aucun chantier actif</p>
              </div>
            ) : (
              Object.entries(tasksByChantier).map(([chantierId, { chantier, tasks }]) => (
                <div key={chantierId} className={`border-b border-bord`}>
                  {/* Chantier row */}
                  <div className="flex">
                    <div className={`w-[200px] flex-shrink-0 px-4 py-3 border-r border-bord bg-fond`}>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-accent-texte" />
                        <span className={`font-medium truncate ${textPrimary}`}>{chantier.nom}</span>
                      </div>
                      <p className={`text-xs ${textMuted} mt-1`}>
                        {avancementDe ? avancementDe(chantier) : (chantier.avancement || 0)} % d'avancement
                      </p>
                    </div>
                    <div className={`relative flex-1 h-16 ${gridBg}`}>
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {dateRange.map((date, i) => (
                          <div
                            key={i}
                            className={`flex-shrink-0 h-full border-r border-bord ${
                              isToday(date) ? todayBg : isWeekend(date) ? 'bg-surface-2/50' : ''
                            }`}
                            style={{ width: cellWidth }}
                          />
                        ))}
                      </div>

                      {/* Chantier bar */}
                      {chantier.dateDebut && (() => {
                        const barStyle = getTaskStyle({
                          debut: chantier.dateDebut,
                          fin: chantier.dateFin || chantier.dateDebut
                        });
                        if (!barStyle) return null;
                        return (
                          <div
                            className="absolute top-2 h-4 rounded-full opacity-30 bg-accent"
                            style={barStyle}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Task rows */}
                  {tasks.map(task => {
                    const style = getTaskStyle(task);
                    if (!style) return null;

                    return (
                      <div key={task.id} className="flex">
                        <div className={`w-[200px] flex-shrink-0 px-4 py-2 pl-8 border-r border-bord`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${pointStatut[task.statut] || pointStatut.planifie}`} />
                            <span className={`text-sm truncate ${textSecondary}`}>{task.nom}</span>
                          </div>
                        </div>
                        <div className={`relative flex-1 h-10 ${gridBg}`}>
                          {/* Grid lines */}
                          <div className="absolute inset-0 flex">
                            {dateRange.map((date, i) => (
                              <div
                                key={i}
                                className={`flex-shrink-0 h-full border-r border-bord ${
                                  isWeekend(date) ? 'bg-surface-2/50' : ''
                                }`}
                                style={{ width: cellWidth }}
                              />
                            ))}
                          </div>

                          {/* Task bar */}
                          <div
                            className={`absolute top-1.5 h-7 rounded-md border flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity shadow-sm ${barreStatut[task.statut] || barreStatut.planifie}`}
                            style={style}
                            onClick={() => openEdit(task)}
                          >
                            <span className="text-xs truncate font-medium">
                              {task.nom}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(barreStatut).map(([status, classes]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border ${classes}`} />
            <span className={`text-sm ${textSecondary}`}>{libelleStatut[status]}</span>
          </div>
        ))}
      </div>

      {/* Ajouter / modifier une tâche de la frise : ui/Modal (portail, focus, Échap, feuille du bas au téléphone) */}
      <Modal isOpen={showAddTask} onClose={resetForm} size="md">
        <ModalHeader>
          <ModalTitle>{editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Champ libelle="Nom de la tâche" placeholder="Ex: Pose carrelage salle de bain" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} />
          <Champ as="select" libelle="Chantier" value={form.chantierId} onChange={e => setForm(p => ({ ...p, chantierId: e.target.value }))}>
            <option value="">Sélectionner un chantier</option>
            {chantiers.filter(c => c.statut === 'en_cours' || c.statut === 'planifie').map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </Champ>
          <div className="grid grid-cols-2 gap-3">
            <Champ libelle="Date de début" type="date" value={form.debut} onChange={e => setForm(p => ({ ...p, debut: e.target.value }))} />
            <Champ libelle="Durée (jours)" type="number" min="1" value={form.duree} onChange={e => setForm(p => ({ ...p, duree: parseInt(e.target.value) || 1 }))} />
          </div>
          <Champ as="select" libelle="Statut" value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))}>
            <option value="planifie">Planifié</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
          </Champ>
          {equipe.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-encre-2">Assigner à</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Personnes assignées">
                {equipe.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        assignes: p.assignes.includes(e.id)
                          ? p.assignes.filter(id => id !== e.id)
                          : [...p.assignes, e.id]
                      }));
                    }}
                    aria-pressed={form.assignes.includes(e.id)}
                    className={`px-3 py-1.5 min-h-[44px] rounded-full text-sm flex items-center gap-2 ${
                      form.assignes.includes(e.id)
                        ? 'bg-accent text-sur-accent'
                        : 'bg-surface-2 text-encre-2'
                    }`}
                  >
                    <Users size={14} aria-hidden="true" />
                    {e.prenom}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Champ as="textarea" libelle="Notes" facultatif rows={2} placeholder="Notes supplémentaires..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </ModalBody>
        <ModalFooter className={editingTask ? 'justify-between' : undefined}>
          {editingTask && (
            <Bouton variante="discret" icone={Trash2} className="text-danger-texte" onClick={() => handleDelete(editingTask.id)}>Supprimer</Bouton>
          )}
          <div className="flex gap-2">
            <Bouton variante="secondaire" onClick={resetForm}>Annuler</Bouton>
            <Bouton variante="principal" onClick={handleSubmit} disabled={!form.nom || !form.chantierId}>{editingTask ? 'Enregistrer' : 'Créer'}</Bouton>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  );
}
