/**
 * PostChantierSettings - Configuration de la séquence post-chantier
 *
 * Permet de configurer les actions automatiques déclenchées après
 * la fin d'un chantier (remerciement, avis Google, rapport, entretien, anniversaire).
 *
 * @module PostChantierSettings
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Star,
  FileText,
  Wrench,
  Cake,
  ToggleLeft,
  ToggleRight,
  Pencil,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

// ── Default sequence ──────────────────────────────────────────────────────────
const DEFAULT_SEQUENCE = [
  {
    id: 1,
    delay: 1,
    label: 'Remerciement + satisfaction',
    type: 'email',
    active: true,
    icon: 'mail',
    template: 'Bonjour {prenom_client}, merci pour votre confiance pour votre {type_chantier}. Comment évaluez-vous notre travail ? (1-5 étoiles)',
  },
  {
    id: 2,
    delay: 3,
    label: 'Demande avis Google',
    type: 'email',
    active: true,
    icon: 'star',
    template: 'Votre avis compte ! Laissez-nous un avis Google : {lien_avis}',
  },
  {
    id: 3,
    delay: 7,
    label: 'Rapport de chantier final',
    type: 'email',
    active: true,
    icon: 'file',
    template: 'Voici le rapport final de votre chantier "{nom_chantier}" avec les photos avant/apres.',
  },
  {
    id: 4,
    delay: 30,
    label: 'Proposition entretien',
    type: 'email',
    active: false,
    icon: 'wrench',
    template: "Il est temps de planifier l'entretien de votre {type_chantier}. Contactez-nous !",
  },
  {
    id: 5,
    delay: 365,
    label: 'Rappel anniversaire',
    type: 'sms',
    active: false,
    icon: 'cake',
    template: "Cela fait 1 an que nous avons terminé votre {type_chantier}. Tout va bien ? Besoin d'un entretien ?",
  },
];

const STORAGE_KEY = 'cp_post_chantier_sequence';

const ICON_MAP = {
  mail: Mail,
  star: Star,
  file: FileText,
  wrench: Wrench,
  cake: Cake,
};

const TYPE_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'both', label: 'Email + SMS', icon: Sparkles },
];

const TEMPLATE_VARIABLES = [
  { var: '{prenom_client}', desc: 'Prénom du client' },
  { var: '{nom_client}', desc: 'Nom du client' },
  { var: '{nom_chantier}', desc: 'Nom du chantier' },
  { var: '{type_chantier}', desc: 'Type de chantier' },
  { var: '{adresse_chantier}', desc: 'Adresse du chantier' },
  { var: '{nom_entreprise}', desc: 'Nom de votre entreprise' },
  { var: '{lien_avis}', desc: 'Lien vers votre page Google' },
  { var: '{date_fin}', desc: 'Date de fin du chantier' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadSéquence() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { enabled: true, steps: DEFAULT_SEQUENCE };
}

function saveSéquence(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatDelay(days) {
  if (days < 7) return `J+${days}`;
  if (days < 30) return days % 7 === 0 ? `${days / 7} sem.` : `J+${days}`;
  if (days < 365) return days % 30 === 0 ? `${days / 30} mois` : `J+${days}`;
  return days === 365 ? '1 an' : `J+${days}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PostChantierSettings({ isDark, couleur, showToast }) {
  const [config, setConfig] = useState(loadSéquence);
  const [editingStep, setEditingStep] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showVars, setShowVars] = useState(false);

  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';
  const modalBg = isDark ? 'bg-slate-800' : 'bg-white';
  const overlayBg = 'bg-black/50';

  // Persist on change
  useEffect(() => {
    saveSéquence(config);
  }, [config]);

  const toggleGlobal = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const toggleStep = useCallback((stepId) => {
    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, active: !s.active } : s
      ),
    }));
  }, []);

  const openEdit = useCallback((step) => {
    setEditingStep(step.id);
    setEditForm({ ...step });
  }, []);

  const closeEdit = useCallback(() => {
    setEditingStep(null);
    setEditForm(null);
    setShowVars(false);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editForm) return;
    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === editForm.id ? { ...editForm } : s
      ),
    }));
    if (showToast) showToast('Étape mise à jour', 'success');
    closeEdit();
  }, [editForm, showToast, closeEdit]);

  const resetDefaults = useCallback(() => {
    setConfig({ enabled: true, steps: DEFAULT_SEQUENCE });
    if (showToast) showToast('Séquence réinitialisée', 'success');
  }, [showToast]);

  const StepIcon = useCallback(({ icon, size = 18 }) => {
    const Icon = ICON_MAP[icon] || Mail;
    return <Icon size={size} />;
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${couleur}15` }}
            >
              <Sparkles size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h3 className={`font-semibold text-base sm:text-lg ${textPrimary}`}>
                Séquence post-chantier
              </h3>
              <p className={`text-xs sm:text-sm ${textSecondary}`}>
                Actions automatiques après la fin d'un chantier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetDefaults}
              className={`text-xs px-3 py-1.5 rounded-lg border ${cardBg} ${textMuted} ${hoverBg} transition-colors`}
              title="Réinitialiser les valeurs par défaut"
            >
              <RotateCcw size={14} className="inline mr-1" />
              Réinitialiser
            </button>
            <button
              onClick={toggleGlobal}
              className="flex items-center gap-2 transition-colors"
              title={config.enabled ? 'Désactiver la séquence' : 'Activer la séquence'}
            >
              {config.enabled ? (
                <ToggleRight size={28} style={{ color: couleur }} />
              ) : (
                <ToggleLeft size={28} className={textMuted} />
              )}
              <span className={`text-sm font-medium ${config.enabled ? textPrimary : textMuted}`}>
                {config.enabled ? 'Active' : 'Inactive'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Steps timeline */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="space-y-0">
          {config.steps.map((step, idx) => {
            const isLast = idx === config.steps.length - 1;
            const TypeIcon = TYPE_OPTIONS.find((t) => t.value === step.type)?.icon || Mail;

            return (
              <div key={step.id} className="flex gap-3 sm:gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: step.active ? `${couleur}20` : isDark ? '#334155' : '#f1f5f9',
                      color: step.active ? couleur : isDark ? '#64748b' : '#94a3b8',
                    }}
                  >
                    <StepIcon icon={step.icon} size={16} />
                  </div>
                  {!isLast && (
                    <div
                      className="w-0.5 flex-1 min-h-[24px]"
                      style={{
                        background: isDark ? '#334155' : '#e2e8f0',
                      }}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className={`flex-1 pb-4 sm:pb-5 ${isLast ? 'pb-0' : ''}`}>
                  <div
                    className={`rounded-xl border p-3 sm:p-4 transition-colors ${
                      step.active
                        ? cardBg
                        : isDark
                          ? 'bg-slate-800/50 border-slate-700/50'
                          : 'bg-slate-50 border-slate-200/50'
                    } ${hoverBg}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Delay badge */}
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-md shrink-0"
                          style={{
                            background: step.active ? `${couleur}15` : isDark ? '#1e293b' : '#f1f5f9',
                            color: step.active ? couleur : isDark ? '#64748b' : '#94a3b8',
                          }}
                        >
                          {formatDelay(step.delay)}
                        </span>

                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${step.active ? textPrimary : textMuted}`}>
                            {step.label}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <TypeIcon size={12} className={textMuted} />
                            <span className={`text-xs ${textMuted}`}>
                              {TYPE_OPTIONS.find((t) => t.value === step.type)?.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleStep(step.id)}
                          className="transition-colors"
                          title={step.active ? 'Désactiver' : 'Activer'}
                        >
                          {step.active ? (
                            <ToggleRight size={22} style={{ color: couleur }} />
                          ) : (
                            <ToggleLeft size={22} className={textMuted} />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(step)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${cardBg} ${textSecondary} ${hoverBg}`}
                        >
                          <Pencil size={13} className="inline mr-1" />
                          Modifier
                        </button>
                      </div>
                    </div>

                    {/* Preview template */}
                    <p className={`text-xs mt-2 line-clamp-2 ${textMuted}`}>
                      {step.template}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      <div
        className="rounded-xl border p-3 sm:p-4 text-xs sm:text-sm"
        style={{
          background: `${couleur}08`,
          borderColor: `${couleur}25`,
          color: isDark ? '#cbd5e1' : '#475569',
        }}
      >
        <div className="flex items-start gap-2">
          <Clock size={16} className="shrink-0 mt-0.5" style={{ color: couleur }} />
          <div>
            <p className="font-medium" style={{ color: couleur }}>
              Comment ça marche ?
            </p>
            <p className="mt-1">
              Quand vous marquez un chantier comme "Terminé", les étapes actives se déclenchent
              automatiquement au délai configuré. Les messages utilisent les variables du chantier
              et du client.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStep && editForm && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayBg}`} onClick={closeEdit}>
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl ${modalBg} ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className={`flex items-center justify-between p-4 sm:p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${couleur}15` }}
                >
                  <StepIcon icon={editForm.icon} size={16} />
                </div>
                <h4 className={`font-semibold ${textPrimary}`}>
                  Modifier : {editForm.label}
                </h4>
              </div>
              <button
                onClick={closeEdit}
                className={`p-1.5 rounded-lg transition-colors ${hoverBg} ${textMuted}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Label */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                  Nom de l'étape
                </label>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
                />
              </div>

              {/* Delay + Type row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    Délai (jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="730"
                    value={editForm.delay}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        delay: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
                  />
                </div>
                <div className="flex-1">
                  <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    Canal
                  </label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-sm font-medium ${textPrimary}`}>
                    Message template
                  </label>
                  <button
                    onClick={() => setShowVars((v) => !v)}
                    className={`text-xs flex items-center gap-1 ${textMuted} ${hoverBg} px-2 py-1 rounded-lg`}
                  >
                    {showVars ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Variables
                  </button>
                </div>

                {showVars && (
                  <div
                    className={`mb-2 p-3 rounded-xl border text-xs ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="grid grid-cols-2 gap-1.5">
                      {TEMPLATE_VARIABLES.map((v) => (
                        <button
                          key={v.var}
                          type="button"
                          onClick={() =>
                            setEditForm((f) => ({
                              ...f,
                              template: f.template + ' ' + v.var,
                            }))
                          }
                          className={`text-left px-2 py-1 rounded-lg ${hoverBg} transition-colors`}
                        >
                          <code style={{ color: couleur }}>{v.var}</code>
                          <span className={`block text-xs ${textMuted}`}>{v.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  value={editForm.template}
                  onChange={(e) => setEditForm((f) => ({ ...f, template: e.target.value }))}
                  rows={4}
                  className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${inputBg}`}
                  placeholder="Entrez le message template..."
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className={`flex items-center justify-end gap-2 p-4 sm:p-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                onClick={closeEdit}
                className={`px-4 py-2 rounded-xl text-sm border transition-colors ${cardBg} ${textSecondary} ${hoverBg}`}
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-xl text-sm text-white transition-colors"
                style={{ background: couleur }}
              >
                <Save size={14} className="inline mr-1.5" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
