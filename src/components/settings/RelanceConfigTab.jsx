/**
 * RelanceConfigTab - Settings panel for configuring smart follow-up scénarios
 *
 * Allows the user to configure automatic relance (follow-up) scénarios for
 * devis (quotes) and factures (invoices), including per-step delays, channels,
 * message templates with variable interpolation, and preview capabilities.
 *
 * @module RelanceConfigTab
 */

import { useState, useCallback, useMemo } from 'react';
import { FONCTIONS } from '../../lib/fonctions';
import {
  Mail,
  Clock,
  FileText,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Trash2,
  TrendingUp,
  Euro,
  CalendarClock,
  Shield,
  UserX,
  FileX,
  X,
  Zap,
} from 'lucide-react';
import { EXCLUSION_REASONS, DEFAULT_PENALTY_RATE } from '../../lib/relanceUtils';
import { formatMoney } from '../../lib/formatters';
import { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS } from '../../lib/scenariosRelance';
import { cn } from '../../lib/utils';
import Pastille from '../ui/Pastille';

// ============ DEFAULT SCENARIOS ============
// Dans src/lib/scenariosRelance.js (lus aussi par le site public sans charger cet écran) ; réexportés ici.

export { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS };

// Les relances ne partent que par e-mail (moteur et tâche nocturne). Avant (recette du 9 oct. 2026), SMS,
// « Email + SMS » et WhatsApp étaient proposés et enregistrés, mais le client recevait toujours un e-mail.
const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
];

const AVAILABLE_VARIABLES = [
  { key: '{{client_nom}}', description: 'Nom du client' },
  { key: '{{client_prenom}}', description: 'Prénom du client' },
  { key: '{{devis_numero}}', description: 'Numéro du devis' },
  { key: '{{facture_numero}}', description: 'Numéro de la facture' },
  { key: '{{reste_du}}', description: 'Reste à payer (paiements et avoirs déduits)' },
  { key: '{{montant_ttc}}', description: 'Devis : montant TTC ; facture : reste à payer' },
  { key: '{{montant}}', description: 'Devis : montant ; facture : reste à payer' },
  { key: '{{total_facture}}', description: 'Total TTC de la facture' },
  { key: '{{mention_retard}}', description: 'Mention légale de retard (professionnel ou particulier)' },
  { key: '{{penalites}}', description: 'Pénalités de retard (clients professionnels seulement)' },
  { key: '{{date_échéance}}', description: 'Date d\'échéance' },
  { key: '{{entreprise_nom}}', description: 'Nom de l\'entreprise' },
  { key: '{{jours_retard}}', description: 'Jours de retard' },
  // Paiement en ligne masqué en v1 (D-21) : la variable reste lue (vide) dans les anciens modèles
  ...(FONCTIONS.paiementEnLigne ? [{ key: '{{lien_paiement}}', description: 'Lien de paiement en ligne' }] : []),
];

// ============ SUB-COMPONENTS ============

/**
 * Toggle switch component
 */
function Toggle({ enabled, onToggle, size = 'md', libelle }) {
  // Interrupteur aux jetons du thème (avant : la couleur brute de l'entreprise) ; zone de toucher de 44 px
  const piste = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const point = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const decale = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={libelle}
      onClick={onToggle}
      className="flex-shrink-0 h-11 w-14 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden="true" className={cn('relative inline-flex rounded-full transition-colors duration-200', piste, enabled ? 'bg-accent' : 'bg-bord-fort')}>
        <span className={cn('inline-block rounded-full bg-surface shadow-e1 transform transition-transform duration-200', point, enabled ? decale : 'translate-x-0.5', size === 'sm' ? 'mt-[3px]' : 'mt-[4px]')} />
      </span>
    </button>
  );
}

/**
 * Channel badge display
 */
function ChannelBadge({ channel }) {
  // Une étape réglée autrefois sur un autre canal part quand même par e-mail : on l'affiche ainsi
  const option = CHANNEL_OPTIONS.find(o => o.value === channel) || CHANNEL_OPTIONS[0];
  const Icon = option.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        'bg-surface-2 text-encre-2'
      )}
    >
      <Icon className="w-3 h-3" />
      {option.label}
    </span>
  );
}

/**
 * Single scenario step in the timeline
 */
function ScenarioStep({
  step,
  isLast,
  onUpdate,
  onToggle,
  onRemove,
  scenarioType,
}) {
  const [expanded, setExpanded] = useState(false);
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const inputBg = 'bg-surface border-bord-fort text-encre';

  const handleFieldChange = useCallback(
    (field, value) => {
      onUpdate({ ...step, [field]: value });
    },
    [step, onUpdate]
  );

  return (
    <div className="relative flex gap-4">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-1.5 z-10',
            step.enabled ? 'bg-accent border-accent' : 'border-bord-fort bg-transparent'
          )}
        />
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-[2rem] bg-bord" />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-6">
        {/* Step header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className={cn(
                'flex items-center gap-2 text-left w-full group',
                !step.enabled && 'opacity-50'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-sm font-semibold tabular-nums', step.enabled ? 'text-accent-texte' : 'text-encre-3')}>
                    J+{step.delay}
                  </span>
                  <span className={cn('text-sm font-medium', textPrimary)}>
                    {step.name}
                  </span>
                  {step.name?.toLowerCase().includes('contentieux') && (
                    <Pastille ton="alerte" icone={AlertTriangle}>Pré-contentieux</Pastille>
                  )}
                  <ChannelBadge channel={step.channel} />
                </div>
              </div>
              {expanded ? (
                <ChevronUp className={cn('w-4 h-4 flex-shrink-0', textMuted)} />
              ) : (
                <ChevronDown className={cn('w-4 h-4 flex-shrink-0', textMuted)} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Toggle
              enabled={step.enabled}
              onToggle={() => onToggle(step.id)}
              size="sm"
              libelle={`Étape ${step.name} (J+${step.delay})`}
            />
          </div>
        </div>

        {/* Expanded edit form */}
        {expanded && (
          <div
            className={cn(
              'mt-3 p-4 rounded-xl border space-y-4',
              'bg-fond border-bord'
            )}
          >
            {/* Name and delay row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={cn('block text-sm font-medium mb-1', textMuted)}>
                  Nom de l'étape
                </label>
                <input
                  type="text"
                  value={step.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  className={cn(
                    'w-full h-11 px-3 rounded-lg border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
                    inputBg
                  )}
                />
              </div>
              <div>
                <label className={cn('block text-sm font-medium mb-1', textMuted)}>
                  Délai (jours)
                </label>
                <div className="flex items-center gap-2">
                  <Clock className={cn('w-4 h-4 flex-shrink-0', textMuted)} />
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={step.delay}
                    onChange={e =>
                      handleFieldChange('delay', Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className={cn(
                      'w-full h-11 px-3 rounded-lg border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
                      inputBg
                    )}
                  />
                </div>
              </div>
              <div>
                <label className={cn('block text-sm font-medium mb-1', textMuted)}>
                  Canal
                </label>
                <p className={cn('w-full px-3 py-2 rounded-lg border text-sm', inputBg)}>E-mail</p>
              </div>
            </div>

            {/* Template textarea */}
            <div>
              <label className={cn('block text-sm font-medium mb-1', textMuted)}>
                Modèle de message
              </label>
              <textarea
                value={step.template}
                onChange={e => handleFieldChange('template', e.target.value)}
                rows={6}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-base sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-y',
                  inputBg
                )}
              />
              {/* Variable hints */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES
                  .filter(v =>
                    scenarioType === 'devis'
                      ? v.key !== '{{facture_numero}}' && v.key !== '{{jours_retard}}'
                      : v.key !== '{{devis_numero}}'
                  )
                  .map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() =>
                        handleFieldChange('template', step.template + v.key)
                      }
                      title={v.description}
                      className="min-h-[36px] px-2 py-1 rounded-lg text-xs font-mono transition-colors bg-surface-2 text-encre-2 hover:bg-bord"
                    >
                      {v.key}
                    </button>
                  ))}
              </div>
            </div>

            {/* Remove step button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onRemove(step.id)}
                className="flex items-center gap-1.5 h-11 px-3 rounded-lg text-sm font-semibold text-danger-texte hover:bg-danger-fond transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer cette étape
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Template preview modal (inline)
 */
function TemplatePreview({ template, onClose }) {
  const sampleData = {
    '{{client_nom}}': 'M. Dupont',
    '{{client_prenom}}': 'Jean',
    '{{devis_numero}}': 'DEV-2025-00042',
    '{{facture_numero}}': 'FAC-2025-00018',
    '{{montant_ttc}}': '3 500,00',
    '{{montant}}': '3 500,00',
    '{{date_échéance}}': '15/01/2025',
    '{{entreprise_nom}}': 'Mon Entreprise',
    '{{jours_retard}}': '12',
  };

  let rendered = template;
  Object.entries(sampleData).forEach(([key, value]) => {
    rendered = rendered.replaceAll(key, value);
  });

  return (
    <div
      className="mt-3 p-4 rounded-xl border bg-surface-2 border-bord"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-encre-2">
          Aperçu avec des données d'exemple
        </span>
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-3 rounded-lg text-sm font-medium text-encre-2 hover:bg-surface transition-colors"
        >
          Fermer
        </button>
      </div>
      <pre
        className={cn(
          'whitespace-pre-wrap text-sm leading-relaxed font-sans',
          'text-encre'
        )}
      >
        {rendered}
      </pre>
    </div>
  );
}

/**
 * Scenario card (Devis or Facture)
 */
function ScenarioCard({
  title,
  icon: Icon,
  steps,
  onStepsChange,
  isDark,
  couleur,
  scenarioType,
}) {
  const [previewStepId, setPreviewStepId] = useState(null);
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';

  const handleUpdateStep = useCallback(
    (updatedStep) => {
      onStepsChange(steps.map(s => (s.id === updatedStep.id ? updatedStep : s)));
    },
    [steps, onStepsChange]
  );

  const handleToggleStep = useCallback(
    (stepId) => {
      onStepsChange(
        steps.map(s => (s.id === stepId ? { ...s, enabled: !s.enabled } : s))
      );
    },
    [steps, onStepsChange]
  );

  const handleRemoveStep = useCallback(
    (stepId) => {
      if (steps.length <= 1) return;
      onStepsChange(steps.filter(s => s.id !== stepId));
    },
    [steps, onStepsChange]
  );

  const handleAddStep = useCallback(() => {
    const lastStep = steps[steps.length - 1];
    const newDelay = lastStep ? lastStep.delay + 15 : 7;
    const newStep = {
      id: `${scenarioType}_step_${Date.now()}`,
      enabled: true,
      delay: newDelay,
      delayLabel: `J+${newDelay}`,
      name: 'Nouvelle étape',
      channel: 'email',
      template: `Bonjour {{client_nom}},\n\n[Votre message ici]\n\nCordialement,\n{{entreprise_nom}}`,
    };
    onStepsChange([...steps, newStep]);
  }, [steps, scenarioType, onStepsChange]);

  const activeCount = steps.filter(s => s.enabled).length;

  return (
    <div className={cn('rounded-2xl border p-5', cardBg, borderColor)}>
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2">
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className={cn('text-base font-semibold', textPrimary)}>{title}</h3>
            <p className={cn('text-sm', textMuted)}>
              {activeCount} étape{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline steps */}
      <div className="ml-1">
        {steps.map((step, index) => (
          <div key={step.id}>
            <ScenarioStep
              step={step}
              index={index}
              isLast={index === steps.length - 1}
              isDark={isDark}
              couleur={couleur}
              onUpdate={handleUpdateStep}
              onToggle={handleToggleStep}
              onRemove={handleRemoveStep}
              scenarioType={scenarioType}
            />
            {/* Preview for this step */}
            {previewStepId === step.id && (
              <div className="ml-7 -mt-4 mb-4">
                <TemplatePreview
                  template={step.template}
                  isDark={isDark}
                  onClose={() => setPreviewStepId(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between mt-2 pt-3 border-t border-dashed border-bord">
        <button
          type="button"
          onClick={handleAddStep}
          className={cn(
            'flex items-center gap-1.5 h-11 px-3 rounded-lg text-sm font-semibold transition-colors',
            'text-encre-2 hover:bg-surface-2'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter une étape
        </button>

        {/* Preview button for the first active step */}
        {steps.some(s => s.enabled) && (
          <button
            type="button"
            onClick={() => {
              const firstActive = steps.find(s => s.enabled);
              if (firstActive) {
                setPreviewStepId(previewStepId === firstActive.id ? null : firstActive.id);
              }
            }}
            className={cn(
              'flex items-center gap-1.5 h-11 px-3 rounded-lg text-sm font-semibold transition-colors',
              'text-encre-2 hover:bg-surface-2'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            Aperçu
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Variables reference card
 */
function VariablesCard() {
  const [expanded, setExpanded] = useState(true);
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';

  return (
    <div className={cn('rounded-2xl border p-5', cardBg, borderColor)}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2">
            <Settings className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="text-left">
            <h3 className={cn('text-base font-semibold', textPrimary)}>Variables disponibles</h3>
            <p className={cn('text-sm', textMuted)}>
              Variables dynamiques pour personnaliser vos modèles
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className={cn('w-5 h-5', textMuted)} />
        ) : (
          <ChevronDown className={cn('w-5 h-5', textMuted)} />
        )}
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AVAILABLE_VARIABLES.map(v => (
            <div
              key={v.key}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg',
                'bg-fond'
              )}
            >
              <code className="text-xs font-mono font-semibold text-encre">
                {v.key}
              </code>
              <span className={cn('text-sm text-right', textMuted)}>{v.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Statistics card (read-only)
 */
function StatsCard({ stats: realStats, modeDiscret }) {
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';

  const hasData = realStats && realStats.totalSent > 0;

  const stats = [
    {
      label: 'Taux de conversion après relance',
      value: hasData && realStats.conversionRate != null ? `${realStats.conversionRate}%` : '--%',
      icon: TrendingUp,
    },
    {
      label: 'Délai moyen de paiement',
      value: hasData && realStats.averagePaymentDelay != null ? `${realStats.averagePaymentDelay} jours` : '-- jours',
      icon: CalendarClock,
    },
    {
      label: 'Montant récupéré grâce aux relances',
      value: hasData ? (modeDiscret ? '***' : formatMoney(realStats.amountRecovered)) : '--\u00A0\u20AC',
      icon: Euro,
    },
  ];

  return (
    <div className={cn('rounded-2xl border p-5', cardBg, borderColor)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2">
          <TrendingUp className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className={cn('text-base font-semibold', textPrimary)}>Statistiques</h3>
          <p className={cn('text-sm', textMuted)}>
            Les données seront calculées à partir de votre historique
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(stat => {
          const StatIcon = stat.icon;
          return (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center justify-center p-4 rounded-xl text-center',
                'bg-fond'
              )}
            >
              <StatIcon className="w-5 h-5 mb-2 text-encre-3" aria-hidden="true" />
              <span className={cn('text-xl font-bold tabular-nums', textPrimary)}>{stat.value}</span>
              <span className={cn('text-sm mt-1', textMuted)}>{stat.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Exclusions management card
 */
function ExclusionsCard({ exclusions = [], onRemove, clients = [], devis = [] }) {
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';

  if (!exclusions.length) return null;

  const getClientName = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    return c ? `${c.prenom || ''} ${c.nom || ''}`.trim() : 'Client inconnu';
  };

  const getDocNumero = (docId) => {
    const d = devis.find(dv => dv.id === docId);
    return d ? d.numero : 'Document';
  };

  return (
    <div className={cn('rounded-2xl border p-5', cardBg, borderColor)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2">
          <Shield className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className={cn('text-base font-semibold', textPrimary)}>
            Exclusions actives ({exclusions.length})
          </h3>
          <p className={cn('text-sm', textMuted)}>
            Documents ou clients exclus des relances automatiques
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {exclusions.map(ex => (
          <div
            key={ex.id}
            className={cn(
              'flex items-center justify-between px-3 py-2.5 rounded-lg',
              'bg-fond'
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {ex.scope === 'client' ? (
                <UserX className={cn('w-4 h-4 flex-shrink-0', textMuted)} />
              ) : (
                <FileX className={cn('w-4 h-4 flex-shrink-0', textMuted)} />
              )}
              <div className="min-w-0">
                <div className={cn('text-sm font-medium truncate', textPrimary)}>
                  {ex.scope === 'client'
                    ? getClientName(ex.client_id)
                    : getDocNumero(ex.document_id)
                  }
                </div>
                <div className={cn('text-sm', textMuted)}>
                  <Pastille className="mr-1">{ex.scope === 'client' ? 'Client' : 'Document'}</Pastille>
                  {EXCLUSION_REASONS[ex.reason] || ex.reason || 'Exclusion manuelle'}
                </div>
              </div>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(ex.id)}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-danger-texte hover:bg-danger-fond transition-colors"
                title="Supprimer l'exclusion"
                aria-label="Supprimer l'exclusion"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

/**
 * RelanceConfigTab - Settings panel for automatic follow-up configuration
 *
 * @param {Object} props
 * @param {Object} props.entreprise - Company settings object
 * @param {Function} props.setEntreprise - Setter for company settings
 * @param {boolean} props.isDark - Dark mode flag
 * @param {string} props.couleur - Accent color hex
 */
export default function RelanceConfigTab({
  entreprise, setEntreprise, isDark, couleur,
  stats, exclusions, onRemoveExclusion,
  clients, devis, modeDiscret,
}) {
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';

  // Initialize relanceConfig from entreprise or use defaults
  const relanceConfig = useMemo(() => {
    return entreprise?.relanceConfig || {
      enabled: false,
      devisSteps: DEFAULT_DEVIS_STEPS,
      factureSteps: DEFAULT_FACTURE_STEPS,
    };
  }, [entreprise?.relanceConfig]);

  const updateConfig = useCallback(
    (updates) => {
      const newConfig = { ...relanceConfig, ...updates };
      // Enregistré dans la colonne relance_config de la fiche active (celle que lit la relance automatique)
      setEntreprise(prev => ({
        ...prev,
        relanceConfig: newConfig,
      }));
    },
    [relanceConfig, setEntreprise]
  );

  const handleGlobalToggle = useCallback(() => {
    updateConfig({ enabled: !relanceConfig.enabled });
  }, [relanceConfig.enabled, updateConfig]);

  const handleAutoSendToggle = useCallback(() => {
    updateConfig({ autoSend: !relanceConfig.autoSend });
  }, [relanceConfig.autoSend, updateConfig]);

  const handleDevisStepsChange = useCallback(
    (newSteps) => {
      updateConfig({ devisSteps: newSteps });
    },
    [updateConfig]
  );

  const handleFactureStepsChange = useCallback(
    (newSteps) => {
      updateConfig({ factureSteps: newSteps });
    },
    [updateConfig]
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={cn('text-xl font-bold', textPrimary)}>
            Relances automatiques
          </h2>
          <p className={cn('text-sm mt-1', textMuted)}>
            Configurez vos scénarios de relance pour ne plus jamais oublier un impayé
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-sm font-medium', textMuted)}>
            {relanceConfig.enabled ? 'Activées' : 'Désactivées'}
          </span>
          <Toggle
            enabled={relanceConfig.enabled}
            onToggle={handleGlobalToggle}
            libelle="Relances automatiques"
          />
        </div>
      </div>

      {/* Global toggle description banner */}
      {!relanceConfig.enabled && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-alerte-fond text-alerte-texte">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm">
            Les relances automatiques sont désactivées. Activez-les pour automatiser le suivi de vos devis et factures.
          </p>
        </div>
      )}

      {relanceConfig.enabled && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-succes-fond text-succes-texte">
          <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm">
            Les relances automatiques sont actives. Vos clients seront relancés selon les scénarios ci-dessous.
          </p>
        </div>
      )}

      {/* Envoi 100% automatique (cron quotidien) */}
      {relanceConfig.enabled && (
        <div
          className={cn(
            'flex items-start justify-between gap-4 p-4 rounded-xl border',
            relanceConfig.autoSend
              ? 'bg-surface border-bord'
              : 'bg-fond border-bord'
          )}
        >
          <div className="flex items-start gap-3 min-w-0">
            <Zap className={cn('w-5 h-5 flex-shrink-0 mt-0.5', relanceConfig.autoSend ? 'text-accent-texte' : 'text-encre-3')} aria-hidden="true" />
            <div className="min-w-0">
              <p className={cn('text-sm font-semibold', textPrimary)}>Envoi 100&nbsp;% automatique</p>
              <p className={cn('text-sm mt-1', textMuted)}>
                {relanceConfig.autoSend
                  ? 'Chaque jour, les relances dues sont envoyées automatiquement par email — vous n\'avez rien à faire.'
                  : 'Activez pour que les relances dues partent seules chaque jour. Sinon, vous les envoyez en un clic depuis le tableau de bord.'}
              </p>
            </div>
          </div>
          <Toggle
            enabled={!!relanceConfig.autoSend}
            onToggle={handleAutoSendToggle}
            libelle="Envoi 100 % automatique"
          />
        </div>
      )}

      {/* Scenario cards — grayed out when relances are disabled */}
      <div className={cn(!relanceConfig.enabled && 'opacity-40 pointer-events-none select-none')}>
        {/* Devis scenario card */}
        <div className="mb-4">
          <ScenarioCard
            title="Relance Devis"
            icon={FileText}
            steps={relanceConfig.devisSteps || DEFAULT_DEVIS_STEPS}
            onStepsChange={handleDevisStepsChange}
            isDark={isDark}
            couleur={couleur}
            scenarioType="devis"
          />
        </div>

        {/* Facture scenario card */}
        <ScenarioCard
          title="Relance Factures impayées"
          icon={Receipt}
          steps={relanceConfig.factureSteps || DEFAULT_FACTURE_STEPS}
          onStepsChange={handleFactureStepsChange}
          isDark={isDark}
          couleur={couleur}
          scenarioType="facture"
        />
      </div>

      {/* Pénalités de retard : le taux réglé dans Paramètres › Documents, sinon celui de la loi (relanceUtils) */}
      <div className="rounded-2xl border p-5 bg-surface border-bord">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-encre">Pénalités de retard</h3>
            <p className="text-sm text-encre-3">Calculées selon la loi française</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl p-3 bg-surface-2">
            <p className="text-sm font-medium mb-1 text-encre-2">Taux des pénalités</p>
            <p className="text-lg font-bold tabular-nums text-encre">{String(Number(entreprise?.tauxPenalites) || DEFAULT_PENALTY_RATE).replace('.', ',')} %</p>
            <p className="text-sm text-encre-3">{Number(entreprise?.tauxPenalites) ? 'Votre taux (Paramètres › Documents)' : 'Art. L441-10 : taux de la BCE + 10 points'}</p>
          </div>
          <div className="rounded-xl p-3 bg-surface-2">
            <p className="text-sm font-medium mb-1 text-encre-2">Indemnité forfaitaire</p>
            <p className="text-lg font-bold tabular-nums text-encre">40 €</p>
            <p className="text-sm text-encre-3">Art. D441-5 : par facture impayée</p>
          </div>
        </div>
        <p className="text-sm mt-3 text-encre-3">
          Pénalités et indemnité de 40 € : clients professionnels seulement (art. L441-10 et D441-5 C. com.) ; zéro pour un
          particulier. Variables : {'{{penalites}}'}, {'{{total_du}}'} et {'{{mention_retard}}'} (texte adapté au client).
        </p>
      </div>

      {/* Variables reference */}
      <VariablesCard isDark={isDark} couleur={couleur} />

      {/* Exclusions */}
      {exclusions && exclusions.length > 0 && (
        <ExclusionsCard
          exclusions={exclusions}
          onRemove={onRemoveExclusion}
          clients={clients || []}
          devis={devis || []}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {/* Statistics */}
      <StatsCard isDark={isDark} couleur={couleur} stats={stats} modeDiscret={modeDiscret} />
    </div>
  );
}
