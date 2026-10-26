import { useState } from 'react';
import { Check, Sparkles, ChevronRight, Building2, Droplets, Zap, Paintbrush, LayoutGrid, Landmark, DoorOpen, Thermometer, Home, Layers, Wrench, CheckSquare, AlertCircle } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import { Bouton } from './ui/Bouton';
import { PHASES, TASKS_BY_METIER, TASKS_BY_PROJECT_TYPE, getAllTasksByPhase, generateSmartTasks } from '../lib/templates/task-templates-v2';
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

const CARTE_CHOIX = 'flex items-center gap-3 p-3 min-h-[56px] rounded-xl text-left transition-colors bg-surface border border-bord hover:bg-surface-2';

/**
 * « Générer les tâches » d'un chantier : on choisit un type de chantier (ou un métier), puis on coche les tâches à garder.
 * Passée sur ui/Modal le 25 oct. 2026 (audit UX du 20 oct. : fenêtre faite main sans rôle « dialogue » ni nom sur la croix) et
 * sur les jetons : l'icône n'est plus à la couleur de l'entreprise, la sélection est à l'accent.
 */
export default function TaskGeneratorModal({
  isOpen,
  onClose,
  onGenerateTasks,
  existingTasks = [],
  entrepriseMetier = null,
  devisLignes = null,
  isDark: _isDark = false,
  couleur: _couleur,
}) {
  const [step, setStep] = useState(1); // 1: Choose type, 2: Select tasks
  const [selectedProjectType, setSelectedProjectType] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [expandedPhase, setExpandedPhase] = useState(null);

  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';

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

  // Reset on close
  const handleClose = () => {
    setStep(1);
    setSelectedProjectType(null);
    setSelectedTasks([]);
    setExpandedPhase(null);
    onClose();
  };

  // Confirm and add selected tasks : la fenêtre ne se ferme qu'une fois les tâches écrites (refus : la sélection reste)
  const [enCours, setEnCours] = useState(false);
  const handleConfirm = async () => {
    if (enCours) return;
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

    setEnCours(true);
    try {
      if ((await onGenerateTasks(tasksToAdd)) !== false) handleClose();
    } finally {
      setEnCours(false);
    }
  };

  const selectedCount = selectedTasks.filter(t => t.selected).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader>
        <ModalTitle>{step === 1 ? 'Générer les tâches' : 'Sélectionner les tâches'}</ModalTitle>
        <ModalDescription>{step === 1 ? 'Choisissez un type de chantier' : `${selectedCount} tâche${selectedCount > 1 ? 's' : ''} sélectionnée${selectedCount > 1 ? 's' : ''}`}</ModalDescription>
      </ModalHeader>

      <ModalBody>
        {step === 1 ? (
          <div className="space-y-6">
            {/* Par type de projet */}
            <div>
              <h3 className="text-base font-semibold mb-3 text-encre">Par type de projet</h3>
              <div className="grid grid-cols-2 gap-2">
                {projectTypes.map(pt => {
                  const Icon = pt.icon;
                  return (
                    <button key={pt.key} type="button" onClick={() => handleSelectProjectType(pt.key)} className={CARTE_CHOIX}>
                      <span className="hidden sm:flex w-10 h-10 rounded-lg items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <span className={`text-sm font-medium min-w-0 ${textPrimary}`}>{pt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Par métier */}
            <div>
              <h3 className="text-base font-semibold mb-3 text-encre">Par métier / activité</h3>
              <div className="grid grid-cols-2 gap-2">
                {metiers.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.key} type="button" onClick={() => handleSelectMetier(m.key)} className={CARTE_CHOIX}>
                      <span className="hidden sm:flex w-10 h-10 rounded-lg items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <span className={`text-sm font-medium ${textPrimary}`}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Génération selon le métier de l'entreprise et le devis lié */}
            {entrepriseMetier && (
              <div className="p-4 rounded-xl border-2 border-dashed border-bord-fort">
                <p className={`text-sm font-semibold mb-1 ${textPrimary}`}>
                  <Sparkles size={14} aria-hidden="true" className="inline mr-1 text-encre-3" />
                  Génération automatique
                </p>
                <p className={`text-sm mb-3 ${textMuted}`}>
                  Basé sur votre métier et le devis associé
                </p>
                <Bouton variante="principal" pleineLargeur onClick={() => handleGenerateSmart(null)}>
                  Générer automatiquement
                </Bouton>
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
                <div key={phase.id} className="rounded-xl border border-bord overflow-hidden">
                  {/* Phase header : le bouton « Tout » est à côté du bouton de dépliage, pas dedans */}
                  <div className="flex items-center gap-2 pr-3 bg-fond">
                    <button
                      type="button"
                      onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                      aria-expanded={isExpanded}
                      className="flex-1 min-w-0 min-h-[56px] flex items-center gap-3 p-3 text-left"
                    >
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-surface-2 text-encre tabular-nums">
                        {selectedInPhase}
                      </span>
                      <span className={`flex-1 text-left font-medium ${textPrimary}`}>{phase.label}</span>
                      <ChevronRight size={16} aria-hidden="true" className={`${textMuted} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePhase(phase.id)}
                      aria-label={`${phase.label} : ${selectedInPhase === phaseTasks.length ? 'tout désélectionner' : 'tout sélectionner'}`}
                      className={`px-3 min-h-[44px] text-sm rounded-lg font-medium ${
                        selectedInPhase === phaseTasks.length
                          ? 'bg-succes-fond text-succes-texte'
                          : 'bg-surface-2 text-encre-2'
                      }`}
                    >
                      {selectedInPhase === phaseTasks.length ? 'Tout' : `${selectedInPhase}/${phaseTasks.length}`}
                    </button>
                  </div>

                  {/* Phase tasks */}
                  {isExpanded && (
                    <div className="p-2 space-y-1">
                      {phaseTasks.map((task, idx) => {
                        const taskIndex = selectedTasks.findIndex(t => t.text === task.text);
                        return (
                          <button
                            key={idx}
                            type="button"
                            role="checkbox"
                            aria-checked={!!task.selected}
                            onClick={() => toggleTask(taskIndex)}
                            className={`w-full flex items-center gap-3 p-2 min-h-[44px] rounded-lg text-left transition-colors ${
                              task.selected ? 'bg-accent/10' : 'bg-surface opacity-60'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              task.selected ? 'bg-accent border-accent text-sur-accent' : 'border-bord-fort'
                            }`}>
                              {task.selected && <Check size={12} aria-hidden="true" />}
                            </span>
                            <span className={`flex-1 text-sm ${task.selected ? textPrimary : textMuted}`}>
                              {task.text}
                            </span>
                            {task.critical && (
                              <AlertCircle size={16} aria-label="Tâche prioritaire" className="text-alerte-texte" />
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
                <CheckSquare size={40} aria-hidden="true" className="mx-auto mb-3 opacity-40" />
                <p>Aucune nouvelle tâche disponible</p>
                <p className="text-sm">Toutes les tâches sont déjà ajoutées</p>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      {step === 2 && selectedTasks.length > 0 && (
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => setStep(1)}>Retour</Bouton>
          <Bouton variante="principal" onClick={handleConfirm} disabled={selectedCount === 0} chargement={enCours}>
            Ajouter {selectedCount} tâche{selectedCount > 1 ? 's' : ''}
          </Bouton>
        </ModalFooter>
      )}
    </Modal>
  );
}
