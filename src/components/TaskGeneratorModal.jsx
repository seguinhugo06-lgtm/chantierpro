import { useState } from 'react';
import { X, Check, Sparkles, ChevronRight, Building2, Droplets, Zap, Paintbrush, LayoutGrid, Landmark, DoorOpen, Thermometer, Home, Layers, Wrench, CheckSquare, AlertCircle } from 'lucide-react';
import { PHASES, TASKS_BY_METIER, TASKS_BY_PROJECT_TYPE, COMMON_TASKS, getAllTasksByPhase, generateSmartTasks } from '../lib/templates/task-templates-v2';
import { generateId } from '../lib/utils';

// Icons mapping
const METIER_ICONS = {
  plombier: Droplets,
  electricien: Zap,
  peintre: Paintbrush,
  carreleur: LayoutGrid,
  macon: Landmark,
  menuisier: DoorOpen,
  chauffagiste: Thermometer,
  couvreur: Home,
  platrier: Layers
};

// Project type icons
const PROJECT_ICONS = {
  'renovation-complete': Building2,
  'salle-de-bain': Droplets,
  'cuisine': Wrench,
  'extension': Building2,
  'peinture': Paintbrush,
  'electricite': Zap,
  'plomberie': Droplets
};

export default function TaskGeneratorModal({
  isOpen,
  onClose,
  onGenerateTasks,
  existingTasks = [],
  entrepriseMetier = null,
  devisLignes = null,
  isDark = false,
  couleur = '#f97316'
}) {
  const [step, setStep] = useState(1); // 1: Choose type, 2: Select tasks
  const [selectedProjectType, setSelectedProjectType] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [expandedPhase, setExpandedPhase] = useState(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  const existingTexts = existingTasks.map(t => t.text.toLowerCase());

  // Get all available project types
  const projectTypes = Object.entries(TASKS_BY_PROJECT_TYPE).map(([key, value]) => ({
    key,
    ...value,
    icon: PROJECT_ICONS[key] || Building2
  }));

  // Get all available métiers
  const metiers = Object.entries(TASKS_BY_METIER).map(([key, value]) => ({
    key,
    ...value,
    icon: METIER_ICONS[key] || Wrench
  }));

  // Generate tasks based on selection (with optional projectType override for immediate use)
  const handleGenerateSmart = (projectTypeOverride = null) => {
    const typeToUse = projectTypeOverride || selectedProjectType;
    const tasks = generateSmartTasks(entrepriseMetier, typeToUse, devisLignes);
    const filteredTasks = tasks.filter(t => !existingTexts.includes(t.text.toLowerCase()));
    setSelectedTasks(filteredTasks.map(t => ({ ...t, selected: true })));
    setStep(2);
  };

  // Generate tasks for a specific métier
  const handleSelectMetier = (metierKey) => {
    const allTasks = getAllTasksByPhase(metierKey);
    const flatTasks = [];

    PHASES.forEach(phase => {
      if (allTasks[phase.id]) {
        allTasks[phase.id].forEach(task => {
          if (!existingTexts.includes(task.text.toLowerCase())) {
            flatTasks.push({
              ...task,
              phase: phase.id,
              selected: true
            });
          }
        });
      }
    });

    setSelectedTasks(flatTasks);
    setStep(2);
  };

  // Generate tasks for a project type
  const handleSelectProjectType = (projectKey) => {
    setSelectedProjectType(projectKey);
    // Pass projectKey directly to avoid async state issue
    handleGenerateSmart(projectKey);
  };

  // Toggle task selection
  const toggleTask = (index) => {
    setSelectedTasks(prev =>
      prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t)
    );
  };

  // Toggle all tasks in a phase
  const togglePhase = (phaseId) => {
    const allSelected = selectedTasks
      .filter(t => t.phase === phaseId)
      .every(t => t.selected);

    setSelectedTasks(prev =>
      prev.map(t => t.phase === phaseId ? { ...t, selected: !allSelected } : t)
    );
  };

  // Confirm and add selected tasks
  const handleConfirm = () => {
    const tasksToAdd = selectedTasks
      .filter(t => t.selected)
      .map(t => ({
        id: generateId(),
        text: t.text,
        done: false,
        critical: t.critical || false,
        phase: t.phase || 'second-oeuvre',
        source: 'generated'
      }));

    onGenerateTasks(tasksToAdd);
    onClose();
  };

  // Reset on close
  const handleClose = () => {
    setStep(1);
    setSelectedProjectType(null);
    setSelectedTasks([]);
    setExpandedPhase(null);
    onClose();
  };

  if (!isOpen) return null;

  const selectedCount = selectedTasks.filter(t => t.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className={`relative w-full sm:max-w-lg max-h-[85vh] ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col`}>
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b ${borderColor} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${couleur}20` }}
            >
              <Sparkles size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>
                {step === 1 ? 'Générer les tâches' : 'Sélectionner les tâches'}
              </h2>
              <p className={`text-sm ${textMuted}`}>
                {step === 1 ? 'Choisissez un type de chantier' : `${selectedCount} tâches sélectionnées`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-3 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X size={20} className={textMuted} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Par type de projet */}
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>
                  Par type de projet
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {projectTypes.map(pt => {
                    const Icon = pt.icon;
                    return (
                      <button
                        key={pt.key}
                        onClick={() => handleSelectProjectType(pt.key)}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100 border'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${couleur}20` }}
                        >
                          <Icon size={20} style={{ color: couleur }} />
                        </div>
                        <span className={`text-sm font-medium ${textPrimary}`}>{pt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Par métier */}
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>
                  Par métier / activité
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {metiers.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleSelectMetier(m.key)}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100 border'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${couleur}20` }}
                        >
                          <Icon size={20} style={{ color: couleur }} />
                        </div>
                        <span className={`text-sm font-medium ${textPrimary}`}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Génération intelligente */}
              {entrepriseMetier && (
                <div className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                  <p className={`text-sm font-medium mb-2 ${textPrimary}`}>
                    <Sparkles size={14} className="inline mr-1" style={{ color: couleur }} />
                    Génération automatique
                  </p>
                  <p className={`text-xs mb-3 ${textMuted}`}>
                    Basé sur votre métier et le devis associé
                  </p>
                  <button
                    onClick={() => handleGenerateSmart(null)}
                    className="w-full py-3 text-white rounded-xl font-medium transition-all hover:opacity-90"
                    style={{ background: couleur }}
                  >
                    Générer automatiquement
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Tasks grouped by phase */}
              {PHASES.map(phase => {
                const phaseTasks = selectedTasks.filter(t => t.phase === phase.id);
                if (phaseTasks.length === 0) return null;

                const selectedInPhase = phaseTasks.filter(t => t.selected).length;
                const isExpanded = expandedPhase === phase.id;

                return (
                  <div key={phase.id} className={`rounded-xl border ${borderColor} overflow-hidden`}>
                    {/* Phase header */}
                    <button
                      onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                      className={`w-full flex items-center gap-3 p-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: phase.color }}
                      >
                        {selectedInPhase}
                      </div>
                      <span className={`flex-1 text-left font-medium ${textPrimary}`}>{phase.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePhase(phase.id); }}
                        className={`px-2 py-1 text-xs rounded-lg ${
                          selectedInPhase === phaseTasks.length
                            ? 'bg-emerald-100 text-emerald-700'
                            : isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {selectedInPhase === phaseTasks.length ? 'Tout' : `${selectedInPhase}/${phaseTasks.length}`}
                      </button>
                      <ChevronRight
                        size={16}
                        className={`${textMuted} transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {/* Phase tasks */}
                    {isExpanded && (
                      <div className="p-2 space-y-1">
                        {phaseTasks.map((task, idx) => {
                          const taskIndex = selectedTasks.findIndex(t => t.text === task.text);
                          return (
                            <button
                              key={idx}
                              onClick={() => toggleTask(taskIndex)}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${
                                task.selected
                                  ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50')
                                  : (isDark ? 'bg-slate-800 opacity-50' : 'bg-white opacity-50')
                              }`}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                task.selected
                                  ? 'bg-blue-500 border-blue-500'
                                  : isDark ? 'border-slate-600' : 'border-slate-300'
                              }`}>
                                {task.selected && <Check size={12} className="text-white" />}
                              </div>
                              <span className={`flex-1 text-sm ${task.selected ? textPrimary : textMuted}`}>
                                {task.text}
                              </span>
                              {task.critical && (
                                <AlertCircle size={14} className="text-red-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {selectedTasks.length === 0 && (
                <div className={`text-center py-8 ${textMuted}`}>
                  <CheckSquare size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Aucune nouvelle tâche disponible</p>
                  <p className="text-sm">Toutes les tâches sont déjà ajoutées</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && selectedTasks.length > 0 && (
          <div className={`px-5 py-4 border-t ${borderColor} flex gap-3 flex-shrink-0`}>
            <button
              onClick={() => setStep(1)}
              className={`flex-1 py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
            >
              Retour
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="flex-1 py-3 text-white rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: couleur }}
            >
              Ajouter {selectedCount} tâche{selectedCount > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
