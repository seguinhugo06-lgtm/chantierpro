/**
 * PostChantierSettings - Configuration de la séquence post-chantier
 *
 * Les modèles de messages de la suite d'un chantier terminé (remerciement, avis Google, rapport, entretien,
 * anniversaire). Gardés dans ce navigateur (cp_post_chantier_sequence) ; aucun envoi n'est branché dessus : l'écran le
 * dit (Task 8, 26 oct. 2026 — avant, il promettait des envois automatiques).
 *
 * @module PostChantierSettings
 */

import { useState, useCallback, useEffect } from 'react';
import Carte from '../ui/Carte';
import Champ from '../ui/Champ';
import ChampChoix from '../ui/ChampChoix';
import Modal from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
import { Interrupteur } from './RamonageTab';
import {
  Mail,
  MessageSquare,
  Star,
  FileText,
  Wrench,
  Cake,
  Pencil,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Construction,
  Info,
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
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'both', label: 'E-mail et SMS', icon: MessageSquare },
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* stockage plein ou privé : séquence non gardée */ }
}

function formatDelay(days) {
  if (days < 7) return `J+${days}`;
  if (days < 30) return days % 7 === 0 ? `${days / 7} sem.` : `J+${days}`;
  if (days < 365) return days % 30 === 0 ? `${days / 30} mois` : `J+${days}`;
  return days === 365 ? '1 an' : `J+${days}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

// isDark et couleur restent acceptés : les jetons du thème suivent le clair, le sombre et l'accent d'eux-mêmes
export default function PostChantierSettings({ isDark: _isDark, couleur: _couleur, showToast }) {
  const [config, setConfig] = useState(loadSéquence);
  const [editingStep, setEditingStep] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showVars, setShowVars] = useState(false);

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
    if (showToast) showToast('Étape mise à jour sur cet appareil', 'success');
    closeEdit();
  }, [editForm, showToast, closeEdit]);

  const resetDefaults = useCallback(() => {
    setConfig({ enabled: true, steps: DEFAULT_SEQUENCE });
    if (showToast) showToast('Séquence réinitialisée sur cet appareil', 'success');
  }, [showToast]);

  const StepIcon = useCallback(({ icon, size = 18 }) => {
    const Icon = ICON_MAP[icon] || Mail;
    return <Icon size={size} />;
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête */}
      <Carte>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
              <Construction size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-encre">Après la fin d’un chantier</h2>
              <p className="text-sm text-encre-2">
                Vos modèles de messages pour la suite d’un chantier terminé : remerciement, avis, entretien.
              </p>
            </div>
          </div>
          <Bouton taille="compacte" variante="discret" icone={RotateCcw} onClick={resetDefaults}>Réinitialiser</Bouton>
        </div>
        {/* Retours relus à la Task 8 (26 oct. 2026) : l'écran promettait que « les étapes actives se déclenchent
            automatiquement au délai configuré » ; aucun envoi n'est branché sur ces étapes (relecture de la Task 6) et la
            séquence n'est gardée que dans ce navigateur. On le dit. */}
        <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-info-fond text-info-texte text-sm">
          <Info size={18} aria-hidden="true" className="flex-shrink-0 mt-0.5" />
          <p>Aucun message ne part tout seul pour l’instant : ces étapes sont des modèles, gardés sur cet appareil.</p>
        </div>
        <div className="mt-4">
          <Interrupteur id="post-chantier-actif" actif={config.enabled} onChange={toggleGlobal}
            libelle="Séquence après chantier" description={config.enabled ? 'Activée sur cet appareil' : 'Désactivée'} />
        </div>
      </Carte>

      {/* Étapes */}
      <Carte className={!config.enabled ? 'opacity-50 pointer-events-none' : ''}>
        <ol className="space-y-0">
          {config.steps.map((step, idx) => {
            const isLast = idx === config.steps.length - 1;
            const TypeIcon = TYPE_OPTIONS.find((t) => t.value === step.type)?.icon || Mail;

            return (
              <li key={step.id} className="flex gap-3 sm:gap-4">
                {/* Frise */}
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${step.active ? 'bg-accent/10 text-accent-texte' : 'bg-surface-2 text-encre-3'}`}>
                    <StepIcon icon={step.icon} size={16} />
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 min-h-[24px] bg-bord" />}
                </div>

                {/* Étape */}
                <div className={`flex-1 min-w-0 pb-4 sm:pb-5 ${isLast ? 'pb-0' : ''}`}>
                  <div className={`rounded-xl border p-3 sm:p-4 transition-colors ${step.active ? 'bg-surface border-bord' : 'bg-fond border-bord'}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                        <span className={`text-sm font-semibold tabular-nums px-2 py-0.5 rounded-md shrink-0 ${step.active ? 'bg-accent/10 text-accent-texte' : 'bg-surface-2 text-encre-3'}`}>
                          {formatDelay(step.delay)}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold break-words ${step.active ? 'text-encre' : 'text-encre-3'}`}>{step.label}</p>
                          <p className="flex items-center gap-1.5 mt-0.5 text-sm text-encre-3">
                            <TypeIcon size={14} aria-hidden="true" />
                            {TYPE_OPTIONS.find((t) => t.value === step.type)?.label}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Interrupteur id={`post-chantier-etape-${step.id}`} actif={step.active} onChange={() => toggleStep(step.id)} libelle={<span className="sr-only">{step.label}</span>} />
                        <Bouton taille="compacte" icone={Pencil} onClick={() => openEdit(step)}>Modifier</Bouton>
                      </div>
                    </div>
                    <p className="text-sm mt-2 line-clamp-2 text-encre-3">{step.template}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Carte>

      {/* Modifier une étape */}
      <Modal isOpen={!!(editingStep && editForm)} onClose={closeEdit} size="md" title={editForm ? `Modifier : ${editForm.label}` : ''}
        footer={(
          <>
            <Bouton variante="discret" onClick={closeEdit}>Annuler</Bouton>
            <Bouton variante="principal" icone={Save} onClick={saveEdit}>Enregistrer sur cet appareil</Bouton>
          </>
        )}>
        {editForm ? (
          <div className="space-y-4">
            <Champ id="post-chantier-nom" libelle="Nom de l’étape" value={editForm.label}
              onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Champ id="post-chantier-delai" libelle="Délai (jours)" type="number" inputMode="numeric" min="1" max="730" value={editForm.delay}
                onChange={(e) => setEditForm((f) => ({ ...f, delay: Math.max(1, parseInt(e.target.value, 10) || 1) }))} />
              <div>
                <label id="post-chantier-canal-libelle" htmlFor="post-chantier-canal" className="block mb-1.5 text-sm font-medium text-encre-2">Canal</label>
                <ChampChoix id="post-chantier-canal" idLibelle="post-chantier-canal-libelle" titre="Canal"
                  options={TYPE_OPTIONS.map((o) => ({ valeur: o.value, libelle: o.label }))}
                  valeur={editForm.type} onChange={(v) => setEditForm((f) => ({ ...f, type: v }))} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="post-chantier-message" className="text-sm font-medium text-encre-2">Message</label>
                <button type="button" aria-expanded={showVars} onClick={() => setShowVars((v) => !v)}
                  className="h-11 -my-2 px-2 rounded-lg text-sm font-semibold flex items-center gap-1 text-encre-2 hover:bg-surface-2">
                  {showVars ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                  Variables
                </button>
              </div>
              {showVars && (
                <div className="mb-2 p-2 rounded-xl border bg-fond border-bord">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button key={v.var} type="button"
                        onClick={() => setEditForm((f) => ({ ...f, template: f.template + ' ' + v.var }))}
                        className="text-left min-h-[44px] px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors">
                        <code className="text-sm text-encre">{v.var}</code>
                        <span className="block text-sm text-encre-3">{v.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <textarea id="post-chantier-message" value={editForm.template}
                onChange={(e) => setEditForm((f) => ({ ...f, template: e.target.value }))}
                rows={4}
                className="w-full px-3.5 py-3 rounded-xl border text-base sm:text-sm resize-none bg-surface border-bord-fort text-encre placeholder:text-encre-3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
                placeholder="Votre message…"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
