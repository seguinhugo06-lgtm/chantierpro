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
import {
  Mail,
  MessageSquare,
  Phone,
  Clock,
  Send,
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
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Euro,
  CalendarClock,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ============ DEFAULT SCENARIOS ============

const DEFAULT_DEVIS_STEPS = [
  {
    id: 'devis_step_1',
    enabled: true,
    delay: 7,
    delayLabel: 'J+7 après envoi',
    name: 'Rappel de consultation',
    channel: 'email',
    template: `Bonjour {{client_nom}},

Je reviens vers vous concernant le devis n{{devis_numero}} d'un montant de {{montant}} EUR que je vous ai adressé récemment.

Avez-vous pu en prendre connaissance ? Je reste à votre disposition pour toute question ou pour organiser un rendez-vous.

Cordialement,
{{entreprise_nom}}`,
  },
  {
    id: 'devis_step_2',
    enabled: true,
    delay: 15,
    delayLabel: 'J+15 après envoi',
    name: 'Relance douce',
    channel: 'email_sms',
    template: `Bonjour {{client_nom}},

Je me permets de revenir vers vous une nouvelle fois au sujet du devis n{{devis_numero}} ({{montant}} EUR).

Si vous avez des questions ou souhaitez discuter de certains points, je suis disponible pour en échanger.

N'hésitez pas à me contacter.

Cordialement,
{{entreprise_nom}}`,
  },
  {
    id: 'devis_step_3',
    enabled: true,
    delay: 30,
    delayLabel: 'J+30 après envoi',
    name: 'Dernière relance',
    channel: 'email',
    template: `Bonjour {{client_nom}},

Je vous contacte une dernière fois concernant le devis n{{devis_numero}} d'un montant de {{montant}} EUR.

Si ce projet ne correspond plus à vos attentes, je comprendrai tout à fait. Dans le cas contraire, je reste disponible pour finaliser les details.

Bien cordialement,
{{entreprise_nom}}`,
  },
];

const DEFAULT_FACTURE_STEPS = [
  {
    id: 'facture_step_1',
    enabled: true,
    delay: 3,
    delayLabel: 'J+3 après échéance',
    name: 'Rappel de paiement',
    channel: 'email',
    template: `Bonjour {{client_nom}},

Je me permets de vous rappeler que la facture n{{facture_numero}} d'un montant de {{montant_ttc}} EUR TTC est arrivée à échéance le {{date_échéance}}.

Merci de procéder au règlement dans les meilleurs délais.

Cordialement,
{{entreprise_nom}}`,
  },
  {
    id: 'facture_step_2',
    enabled: true,
    delay: 15,
    delayLabel: 'J+15 après échéance',
    name: '2ème relance',
    channel: 'email_sms',
    template: `Bonjour {{client_nom}},

Sauf erreur de notre part, la facture n{{facture_numero}} de {{montant_ttc}} EUR TTC, échue depuis {{jours_retard}} jours, reste impayée.

Nous vous remercions de bien vouloir procéder au règlement sous 8 jours.

En cas de difficulté, n'hésitez pas à nous contacter.

Cordialement,
{{entreprise_nom}}`,
  },
  {
    id: 'facture_step_3',
    enabled: true,
    delay: 30,
    delayLabel: 'J+30 après échéance',
    name: 'Mise en demeure',
    channel: 'email',
    template: `{{client_nom}},

Par la présente, nous vous mettons en demeure de régler sous 8 jours la facture n{{facture_numero}} d'un montant de {{montant_ttc}} EUR TTC, impayée depuis {{jours_retard}} jours.

Passé ce délai, nous transmettrons le dossier à notre service contentieux, ce qui entrainera des frais supplémentaires à votre charge.

{{entreprise_nom}}`,
  },
  {
    id: 'facture_step_4',
    enabled: true,
    delay: 45,
    delayLabel: 'J+45 après échéance',
    name: 'Pré-contentieux',
    channel: 'email',
    template: `{{client_nom}},

Dernier avis avant transmission au contentieux.

La facture n{{facture_numero}} de {{montant_ttc}} EUR TTC reste impayée malgré nos multiples relances ({{jours_retard}} jours de retard).

Sans règlement sous 48h, le dossier sera transmis a notre cabinet de recouvrement.

{{entreprise_nom}}`,
  },
];

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'email_sms', label: 'Email + SMS', icon: Send },
  { value: 'whatsapp', label: 'WhatsApp', icon: Phone },
];

const AVAILABLE_VARIABLES = [
  { key: '{{client_nom}}', description: 'Nom du client' },
  { key: '{{client_prenom}}', description: 'Prénom du client' },
  { key: '{{devis_numero}}', description: 'Numéro du devis' },
  { key: '{{facture_numero}}', description: 'Numéro de la facture' },
  { key: '{{montant_ttc}}', description: 'Montant TTC' },
  { key: '{{montant}}', description: 'Montant' },
  { key: '{{date_échéance}}', description: 'Date d\'échéance' },
  { key: '{{entreprise_nom}}', description: 'Nom de l\'entreprise' },
  { key: '{{jours_retard}}', description: 'Jours de retard' },
];

// ============ SUB-COMPONENTS ============

/**
 * Toggle switch component
 */
function Toggle({ enabled, onToggle, size = 'md', couleur }) {
  const sizeClasses = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const dotSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const dotTranslate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2',
        sizeClasses
      )}
      style={{
        backgroundColor: enabled ? couleur : '#94a3b8',
      }}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out',
          dotSize,
          enabled ? dotTranslate : 'translate-x-0.5',
          size === 'sm' ? 'mt-[3px]' : 'mt-[4px]'
        )}
      />
    </button>
  );
}

/**
 * Channel badge display
 */
function ChannelBadge({ channel, isDark }) {
  const option = CHANNEL_OPTIONS.find(o => o.value === channel);
  if (!option) return null;
  const Icon = option.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
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
  index,
  isLast,
  isDark,
  couleur,
  onUpdate,
  onToggle,
  onRemove,
  scenarioType,
}) {
  const [expanded, setExpanded] = useState(false);
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900';

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
            step.enabled ? 'border-transparent' : 'border-slate-400 bg-transparent'
          )}
          style={step.enabled ? { backgroundColor: couleur, borderColor: couleur } : undefined}
        />
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[2rem]',
              isDark ? 'bg-slate-700' : 'bg-slate-200'
            )}
          />
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
                  <span
                    className={cn('text-xs font-semibold uppercase tracking-wide')}
                    style={{ color: step.enabled ? couleur : undefined }}
                  >
                    J+{step.delay}
                  </span>
                  <span className={cn('text-sm font-medium', textPrimary)}>
                    {step.name}
                  </span>
                  {step.name?.toLowerCase().includes('contentieux') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      <AlertTriangle className="w-3 h-3" />
                      Pré-contentieux
                    </span>
                  )}
                  <ChannelBadge channel={step.channel} isDark={isDark} />
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
              couleur={couleur}
            />
          </div>
        </div>

        {/* Expanded edit form */}
        {expanded && (
          <div
            className={cn(
              'mt-3 p-4 rounded-xl border space-y-4',
              isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
            )}
          >
            {/* Name and delay row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={cn('block text-xs font-medium mb-1', textMuted)}>
                  Nom de l'étape
                </label>
                <input
                  type="text"
                  value={step.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2',
                    inputBg
                  )}
                  style={{ '--tw-ring-color': couleur }}
                />
              </div>
              <div>
                <label className={cn('block text-xs font-medium mb-1', textMuted)}>
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
                      'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2',
                      inputBg
                    )}
                    style={{ '--tw-ring-color': couleur }}
                  />
                </div>
              </div>
              <div>
                <label className={cn('block text-xs font-medium mb-1', textMuted)}>
                  Canal
                </label>
                <select
                  value={step.channel}
                  onChange={e => handleFieldChange('channel', e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 appearance-none',
                    inputBg
                  )}
                  style={{ '--tw-ring-color': couleur }}
                >
                  {CHANNEL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template textarea */}
            <div>
              <label className={cn('block text-xs font-medium mb-1', textMuted)}>
                Modèle de message
              </label>
              <textarea
                value={step.template}
                onChange={e => handleFieldChange('template', e.target.value)}
                rows={6}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 resize-y',
                  inputBg
                )}
                style={{ '--tw-ring-color': couleur }}
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
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-mono transition-colors',
                        isDark
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      )}
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
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
function TemplatePreview({ template, isDark, onClose }) {
  const sampleData = {
    '{{client_nom}}': 'M. Dupont',
    '{{client_prenom}}': 'Jean',
    '{{devis_numero}}': 'DEV-2025-042',
    '{{facture_numero}}': 'FAC-2025-018',
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
      className={cn(
        'mt-3 p-4 rounded-xl border',
        isDark ? 'bg-slate-900 border-slate-600' : 'bg-amber-50 border-amber-200'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-amber-400' : 'text-amber-700')}>
          Aperçu avec données d'exemple
        </span>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'text-xs px-2 py-1 rounded hover:bg-black/10 transition-colors',
            isDark ? 'text-slate-400' : 'text-slate-500'
          )}
        >
          Fermer
        </button>
      </div>
      <pre
        className={cn(
          'whitespace-pre-wrap text-sm leading-relaxed font-sans',
          isDark ? 'text-slate-200' : 'text-slate-800'
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
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

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
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${couleur}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: couleur }} />
          </div>
          <div>
            <h3 className={cn('text-base font-semibold', textPrimary)}>{title}</h3>
            <p className={cn('text-xs', textMuted)}>
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
      <div className="flex items-center justify-between mt-2 pt-3 border-t border-dashed" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        <button
          type="button"
          onClick={handleAddStep}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isDark
              ? 'text-slate-300 hover:bg-slate-700'
              : 'text-slate-600 hover:bg-slate-100'
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
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isDark
                ? 'text-slate-300 hover:bg-slate-700'
                : 'text-slate-600 hover:bg-slate-100'
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
function VariablesCard({ isDark, couleur }) {
  const [expanded, setExpanded] = useState(true);
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className={cn('rounded-2xl border p-5', cardBg, borderColor)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${couleur}20` }}
          >
            <Settings className="w-5 h-5" style={{ color: couleur }} />
          </div>
          <div className="text-left">
            <h3 className={cn('text-base font-semibold', textPrimary)}>Variables disponibles</h3>
            <p className={cn('text-xs', textMuted)}>
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
                isDark ? 'bg-slate-700/50' : 'bg-slate-50'
              )}
            >
              <code
                className={cn(
                  'text-xs font-mono font-medium',
                  isDark ? 'text-amber-400' : 'text-amber-700'
                )}
              >
                {v.key}
              </code>
              <span className={cn('text-xs', textMuted)}>{v.description}</span>
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
function StatsCard({ isDark, couleur }) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  const stats = [
    {
      label: 'Taux de conversion après relance',
      value: '--%',
      icon: TrendingUp,
      color: '#22c55e',
    },
    {
      label: 'Délai moyen de paiement',
      value: '-- jours',
      icon: CalendarClock,
      color: '#3b82f6',
    },
    {
      label: 'Montant récupéré grâce aux relances',
      value: '--\u00A0\u20AC',
      icon: Euro,
      color: '#f59e0b',
    },
  ];

  return (
    <div className={cn('rounded-2xl border p-5', cardBg, borderColor)}>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${couleur}20` }}
        >
          <TrendingUp className="w-5 h-5" style={{ color: couleur }} />
        </div>
        <div>
          <h3 className={cn('text-base font-semibold', textPrimary)}>Statistiques</h3>
          <p className={cn('text-xs', textMuted)}>
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
                isDark ? 'bg-slate-700/50' : 'bg-slate-50'
              )}
            >
              <StatIcon className="w-5 h-5 mb-2" style={{ color: stat.color }} />
              <span className={cn('text-xl font-bold', textPrimary)}>{stat.value}</span>
              <span className={cn('text-xs mt-1', textMuted)}>{stat.label}</span>
            </div>
          );
        })}
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
export default function RelanceConfigTab({ entreprise, setEntreprise, isDark, couleur = '#f97316' }) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

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
      setEntreprise(prev => ({
        ...prev,
        relanceConfig: {
          ...relanceConfig,
          ...updates,
        },
      }));
    },
    [relanceConfig, setEntreprise]
  );

  const handleGlobalToggle = useCallback(() => {
    updateConfig({ enabled: !relanceConfig.enabled });
  }, [relanceConfig.enabled, updateConfig]);

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
            Configurez vos scénarios de relance pour ne plus jamais oublier un impaye
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-sm font-medium', textMuted)}>
            {relanceConfig.enabled ? 'Active' : 'Désactivé'}
          </span>
          <Toggle
            enabled={relanceConfig.enabled}
            onToggle={handleGlobalToggle}
            couleur={couleur}
          />
        </div>
      </div>

      {/* Global toggle description banner */}
      {!relanceConfig.enabled && (
        <div
          className={cn(
            'flex items-center gap-3 p-4 rounded-xl border',
            isDark ? 'bg-amber-900/20 border-amber-800/50' : 'bg-amber-50 border-amber-200'
          )}
        >
          <AlertTriangle
            className="w-5 h-5 flex-shrink-0"
            style={{ color: '#f59e0b' }}
          />
          <p className={cn('text-sm', isDark ? 'text-amber-300' : 'text-amber-800')}>
            Les relances automatiques sont désactivées. Activez-les pour automatiser le suivi de vos devis et factures.
          </p>
        </div>
      )}

      {relanceConfig.enabled && (
        <div
          className={cn(
            'flex items-center gap-3 p-4 rounded-xl border',
            isDark ? 'bg-green-900/20 border-green-800/50' : 'bg-green-50 border-green-200'
          )}
        >
          <CheckCircle
            className="w-5 h-5 flex-shrink-0"
            style={{ color: '#22c55e' }}
          />
          <p className={cn('text-sm', isDark ? 'text-green-300' : 'text-green-800')}>
            Les relances automatiques sont actives. Vos clients seront relancés selon les scénarios ci-dessous.
          </p>
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

      {/* Variables reference */}
      <VariablesCard isDark={isDark} couleur={couleur} />

      {/* Statistics */}
      <StatsCard isDark={isDark} couleur={couleur} />
    </div>
  );
}
