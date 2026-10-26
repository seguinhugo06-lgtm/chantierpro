/**
 * RapportChantier - Rapport de Chantier (Site Report) Component
 *
 * Allows creating, editing, viewing, and managing site reports for a given chantier.
 * Reports are stored in localStorage keyed by chantier ID: they live on THIS device only (not synced, not backed up).
 * The messages say so (« enregistré sur cet appareil »), and a write that the device refuses (quota) is reported, never
 * announced as done (Task 6 review, round 1).
 *
 * Features:
 * - List of past reports with type/status badges
 * - Full report editor with 6 sections (informations, personnel, travaux, observations, materiaux, signature)
 * - Read-only view for validated reports
 * - Dark mode support via isDark prop
 * - Brand color theming via couleur prop
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText, Calendar, Cloud, Users, Hammer, AlertTriangle, Package,
  PenTool, Plus, Trash2, ChevronDown, ChevronUp, Eye, Edit3, Save,
  CheckCircle, ArrowLeft, X
} from 'lucide-react';
import { useToast } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import { downloadRapportPDF } from '../../lib/rapportChantierPdf';
import { jourLocal, dateLue } from '../../lib/dates';
import { COULEUR_DOCUMENTS_DEFAUT } from '../../lib/theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPES_RAPPORT = [
  { value: 'journalier', label: 'Journalier', color: 'blue' },
  { value: 'hebdomadaire', label: 'Hebdomadaire', color: 'purple' },
  { value: 'mensuel', label: 'Mensuel', color: 'orange' },
  { value: 'incident', label: 'Incident', color: 'red' },
  { value: 'reception', label: 'Réception', color: 'green' },
];

const METEO_OPTIONS = [
  { value: 'ensoleille', label: 'Ensoleillé', icon: '☀️' },
  { value: 'nuageux', label: 'Nuageux', icon: '☁️' },
  { value: 'pluie', label: 'Pluie', icon: '🌧️' },
  { value: 'orage', label: 'Orage', icon: '⛈️' },
  { value: 'neige', label: 'Neige', icon: '❄️' },
  { value: 'vent_fort', label: 'Vent fort', icon: '💨' },
];

const CORPS_METIER = [
  'Gros oeuvre', 'Second oeuvre', 'Électricité',
  'Plomberie', 'Peinture', 'Menuiserie', 'Autre',
];

const GRAVITE_OPTIONS = [
  { value: 'mineur', label: 'Mineur', classes: 'bg-neutre-fond text-neutre-texte' },
  { value: 'modere', label: 'Modéré', classes: 'bg-alerte-fond text-alerte-texte' },
  { value: 'majeur', label: 'Majeur', classes: 'bg-danger-fond text-danger-texte' },
  { value: 'critique', label: 'Critique', classes: 'bg-danger-fond text-danger-texte font-bold' },
];

/** Return a localStorage key scoped to the given chantier ID. */
const storageKey = (chantierId) => `cp_rapports_chantier_${chantierId}`;

/** Load reports from localStorage for a given chantier. */
const loadRapports = (chantierId) => {
  try {
    const raw = localStorage.getItem(storageKey(chantierId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Persist reports to localStorage for a given chantier. Returns false when the device refuses the write (quota, private mode). */
const saveRapports = (chantierId, rapports) => {
  try {
    localStorage.setItem(storageKey(chantierId), JSON.stringify(rapports));
    return true;
  } catch {
    return false;
  }
};

/** Create an empty report template with sensible defaults. */
const createEmptyRapport = (numero) => ({
  id: generateId('rap'),
  numero,
  date: jourLocal(),
  type: 'journalier',
  meteo: 'ensoleille',
  temperature: '',
  statut: 'brouillon', // brouillon | valide
  // Personnel
  personnelPresent: [],
  intervenantsExternes: [],
  // Travaux
  travaux: [],
  // Observations
  observations: '',
  incidents: [],
  // Materiaux
  materiaux: [],
  // Signature
  signePar: '',
  dateSignature: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Badge displaying the report type with appropriate color. */
function TypeBadge({ type, isDark: _isDark }) {
  const cfg = TYPES_RAPPORT.find((t) => t.value === type) || TYPES_RAPPORT[0];
  // Un type de rapport = un ton (l'incident est le seul en rouge, la réception en vert)
  const colorMap = {
    blue: 'bg-info-fond text-info-texte',
    purple: 'bg-neutre-fond text-neutre-texte',
    orange: 'bg-alerte-fond text-alerte-texte',
    red: 'bg-danger-fond text-danger-texte',
    green: 'bg-succes-fond text-succes-texte',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[cfg.color]}`}>
      {cfg.label}
    </span>
  );
}

/** Badge showing report status (brouillon / validé). */
function StatutBadge({ statut, isDark: _isDark }) {
  if (statut === 'valide') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-succes-fond text-succes-texte">
        <CheckCircle size={12} /> Validé
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-2 text-encre-2`}>
      <Edit3 size={12} /> Brouillon
    </span>
  );
}

/** Collapsible card section wrapper. */
function Section({ title, icon: Icon, isDark: _isDark, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const cardBg = 'bg-surface border-bord';

  return (
    <div className={`rounded-lg border ${cardBg} overflow-hidden`}>
      <button
        type="button"
        className={`w-full flex items-center justify-between px-4 py-3 text-encre font-semibold text-sm`}
        onClick={() => collapsible && setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          <Icon size={16} aria-hidden="true" className="text-encre-3" />
          {title}
        </span>
        {collapsible && (open ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RapportChantier({ chantier, equipe = [], isDark = false, couleur = COULEUR_DOCUMENTS_DEFAUT, onClose }) {
  // Theme helpers
  const cardBg = 'bg-surface border-bord';
  const inputCls = 'bg-surface border-bord-fort text-encre placeholder:text-encre-3';
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [rapports, setRapports] = useState(() => loadRapports(chantier?.id));
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('list'); // list | edit | view
  const { showToast } = useToast();

  // Current report being edited / viewed
  const [draft, setDraft] = useState(null);

  /** Persist rapports and update state; false (and a message) when the device refused the write. */
  const persist = useCallback((updated) => {
    const ok = saveRapports(chantier?.id, updated);
    if (!ok) {
      showToast('Rapport non enregistré : la mémoire de cet appareil est pleine', 'error');
      return false;
    }
    setRapports(updated);
    return true;
  }, [chantier?.id, showToast]);

  // Next report number (auto-increment)
  const nextNumero = useMemo(() => {
    if (!rapports.length) return 1;
    return Math.max(...rapports.map((r) => r.numero ?? 0)) + 1;
  }, [rapports]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Start creating a new report. */
  const handleNew = useCallback(() => {
    const newRapport = createEmptyRapport(nextNumero);
    setDraft(newRapport);
    setSelectedId(newRapport.id);
    setMode('edit');
  }, [nextNumero]);

  /** Open an existing report for editing. */
  const handleEdit = useCallback((rapport) => {
    setDraft({ ...rapport });
    setSelectedId(rapport.id);
    setMode('edit');
  }, []);

  /** Open a validated report in read-only view mode. */
  const handleView = useCallback((rapport) => {
    setDraft({ ...rapport });
    setSelectedId(rapport.id);
    setMode('view');
  }, []);

  /** Save the draft as brouillon. */
  const handleSaveDraft = useCallback(() => {
    if (!draft) return;
    const updated = { ...draft, statut: 'brouillon', updatedAt: new Date().toISOString() };
    const exists = rapports.find((r) => r.id === updated.id);
    const next = exists ? rapports.map((r) => (r.id === updated.id ? updated : r)) : [...rapports, updated];
    if (!persist(next)) return;
    setDraft(updated);
    showToast('Brouillon enregistré sur cet appareil', 'success');
  }, [draft, rapports, persist, showToast]);

  /** Validate the report (mark as validated). */
  const handleValidate = useCallback(() => {
    if (!draft) return;
    if (!draft.signePar.trim()) {
      showToast('Veuillez renseigner le signataire', 'error');
      return;
    }
    const updated = {
      ...draft,
      statut: 'valide',
      dateSignature: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const exists = rapports.find((r) => r.id === updated.id);
    const next = exists ? rapports.map((r) => (r.id === updated.id ? updated : r)) : [...rapports, updated];
    if (!persist(next)) return;
    setDraft(updated);
    setMode('view');
    showToast('Rapport validé et enregistré sur cet appareil', 'success');
  }, [draft, rapports, persist, showToast]);

  /** Delete a report. */
  const handleDelete = useCallback((id) => {
    const next = rapports.filter((r) => r.id !== id);
    if (!persist(next)) return;
    if (selectedId === id) {
      setMode('list');
      setDraft(null);
      setSelectedId(null);
    }
    showToast('Rapport supprimé de cet appareil', 'info');
  }, [rapports, persist, selectedId, showToast]);

  /** Return to report list. */
  const handleBack = useCallback(() => {
    setMode('list');
    setDraft(null);
    setSelectedId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Draft field updaters
  // ---------------------------------------------------------------------------

  const updateDraft = useCallback((field, value) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  /** Toggle a team member's presence in the report. */
  const togglePersonnel = useCallback((membreId) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const exists = prev.personnelPresent.find((p) => p.id === membreId);
      if (exists) {
        return { ...prev, personnelPresent: prev.personnelPresent.filter((p) => p.id !== membreId) };
      }
      const membre = equipe.find((m) => m.id === membreId);
      if (!membre) return prev;
      return {
        ...prev,
        personnelPresent: [...prev.personnelPresent, { id: membre.id, nom: membre.nom, prenom: membre.prenom, role: membre.role, heures: '8' }],
      };
    });
  }, [equipe]);

  /** Update hours for a present team member. */
  const updatePersonnelHeures = useCallback((membreId, heures) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        personnelPresent: prev.personnelPresent.map((p) => (p.id === membreId ? { ...p, heures } : p)),
      };
    });
  }, []);

  /** Add an external worker entry. */
  const addExterne = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, intervenantsExternes: [...prev.intervenantsExternes, { id: generateId('ext'), nom: '' }] };
    });
  }, []);

  const removeExterne = useCallback((id) => {
    setDraft((prev) => prev ? { ...prev, intervenantsExternes: prev.intervenantsExternes.filter((e) => e.id !== id) } : prev);
  }, []);

  const updateExterne = useCallback((id, nom) => {
    setDraft((prev) => prev ? { ...prev, intervenantsExternes: prev.intervenantsExternes.map((e) => (e.id === id ? { ...e, nom } : e)) } : prev);
  }, []);

  /** Add a new work item. */
  const addTravail = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        travaux: [...prev.travaux, { id: generateId('trv'), description: '', zone: '', avancement: 0, corpsMetier: 'Gros oeuvre' }],
      };
    });
  }, []);

  const removeTravail = useCallback((id) => {
    setDraft((prev) => prev ? { ...prev, travaux: prev.travaux.filter((t) => t.id !== id) } : prev);
  }, []);

  const updateTravail = useCallback((id, field, value) => {
    setDraft((prev) => prev ? { ...prev, travaux: prev.travaux.map((t) => (t.id === id ? { ...t, [field]: value } : t)) } : prev);
  }, []);

  /** Add a new incident. */
  const addIncident = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        incidents: [...prev.incidents, { id: generateId('inc'), description: '', gravite: 'mineur', actionCorrective: '' }],
      };
    });
  }, []);

  const removeIncident = useCallback((id) => {
    setDraft((prev) => prev ? { ...prev, incidents: prev.incidents.filter((i) => i.id !== id) } : prev);
  }, []);

  const updateIncident = useCallback((id, field, value) => {
    setDraft((prev) => prev ? { ...prev, incidents: prev.incidents.map((i) => (i.id === id ? { ...i, [field]: value } : i)) } : prev);
  }, []);

  /** Add a material delivery entry. */
  const addMateriau = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        materiaux: [...prev.materiaux, { id: generateId('mat'), description: '', quantite: '', fournisseur: '' }],
      };
    });
  }, []);

  const removeMateriau = useCallback((id) => {
    setDraft((prev) => prev ? { ...prev, materiaux: prev.materiaux.filter((m) => m.id !== id) } : prev);
  }, []);

  const updateMateriau = useCallback((id, field, value) => {
    setDraft((prev) => prev ? { ...prev, materiaux: prev.materiaux.map((m) => (m.id === id ? { ...m, [field]: value } : m)) } : prev);
  }, []);

  // ---------------------------------------------------------------------------
  // Sorted reports for the sidebar list
  // ---------------------------------------------------------------------------
  const sortedRapports = useMemo(
    () => [...rapports].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [rapports],
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  /** Render the reports list view (main listing). */
  const renderList = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-semibold ${textPrimary}`}>
            Rapports de chantier
          </h2>
          <p className={`text-sm ${textSecondary}`}>{rapports.length} rapport{rapports.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-full text-sm font-semibold transition-colors bg-surface text-encre border border-bord-fort hover:bg-surface-2"
          >
            <Plus size={16} aria-hidden="true" /> Nouveau rapport
          </button>
          {onClose && (
            <button onClick={onClose} className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-surface-2 text-encre-2 hover:bg-bord transition-colors`}>
              <ArrowLeft size={16} /> Retour
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {sortedRapports.length === 0 && (
        <div className={`rounded-lg border ${cardBg} p-8 text-center`}>
          <FileText size={40} className={`mx-auto mb-3 ${textSecondary}`} />
          <p className={`font-medium ${textPrimary}`}>Aucun rapport pour ce chantier</p>
          <p className={`text-sm mt-1 ${textSecondary}`}>Créez votre premier rapport de chantier</p>
        </div>
      )}

      {/* Report cards */}
      <div className="grid gap-3">
        {sortedRapports.map((rapport) => (
          <div
            key={rapport.id}
            className={`rounded-lg border ${cardBg} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow cursor-pointer`}
            onClick={() => rapport.statut === 'valide' ? handleView(rapport) : handleEdit(rapport)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-accent text-sur-accent"
              >
                #{rapport.numero}
              </div>
              <div className="min-w-0">
                <p className={`font-medium truncate ${textPrimary}`}>
                  Rapport #{rapport.numero} — {dateLue(rapport.date).toLocaleDateString('fr-FR')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <TypeBadge type={rapport.type} isDark={isDark} />
                  <StatutBadge statut={rapport.statut} isDark={isDark} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {rapport.statut === 'valide' ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleView(rapport); }}
                  className={`p-2 rounded-lg hover:bg-surface-2 transition-colors`}
                  title="Voir le rapport"
                >
                  <Eye size={16} className={textSecondary} />
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(rapport); }}
                  className={`p-2 rounded-lg hover:bg-surface-2 transition-colors`}
                  title="Modifier"
                >
                  <Edit3 size={16} className={textSecondary} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(rapport.id); }}
                className="p-2 rounded-lg hover:bg-danger-fond transition-colors"
                title="Supprimer"
              >
                <Trash2 size={16} className="text-danger-texte" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /** Render the report editor form. */
  const renderEditor = () => {
    if (!draft) return null;

    return (
      <div className="space-y-4">
        {/* Editor header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className={`p-2 rounded-lg hover:bg-surface-2 transition-colors`}>
              <ArrowLeft size={18} className={textPrimary} />
            </button>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>
                {draft.numero ? `Rapport #${draft.numero}` : 'Nouveau rapport'}
              </h2>
              <StatutBadge statut={draft.statut} isDark={isDark} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSaveDraft}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-surface-2 text-encre-2 hover:bg-bord`}
            >
              <Save size={14} /> Enregistrer brouillon
            </button>
            <button
              onClick={handleValidate}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-accent text-sur-accent"
            >
              <CheckCircle size={14} /> Valider le rapport
            </button>
            <button
              onClick={() => { try { downloadRapportPDF(draft, chantier, { couleur }); showToast('PDF téléchargé', 'success'); } catch (e) { showToast('Erreur export PDF', 'error'); } }}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-surface-2 text-encre-2 hover:bg-bord`}
            >
              <FileText size={14} /> Exporter PDF
            </button>
          </div>
        </div>

        {/* Form sections in a responsive two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Section 1 — Informations générales */}
          <Section title="Informations générales" icon={Calendar} isDark={isDark}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className={`text-xs font-medium ${textSecondary}`}>Date du rapport</span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => updateDraft('date', e.target.value)}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${inputCls}`}
                />
              </label>
              <label className="block">
                <span className={`text-xs font-medium ${textSecondary}`}>Type</span>
                <select
                  value={draft.type}
                  onChange={(e) => updateDraft('type', e.target.value)}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${inputCls}`}
                >
                  {TYPES_RAPPORT.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={`text-xs font-medium ${textSecondary}`}>Météo</span>
                <select
                  value={draft.meteo}
                  onChange={(e) => updateDraft('meteo', e.target.value)}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${inputCls}`}
                >
                  {METEO_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={`text-xs font-medium ${textSecondary}`}>Température</span>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={draft.temperature}
                    onChange={(e) => updateDraft('temperature', e.target.value)}
                    placeholder="—"
                    className={`block w-full rounded-md border px-3 py-2 pr-10 text-sm ${inputCls}`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${textSecondary}`}>°C</span>
                </div>
              </label>
            </div>
          </Section>

          {/* Section 2 — Personnel présent */}
          <Section title="Personnel présent" icon={Users} isDark={isDark}>
            {equipe.length === 0 ? (
              <p className={`text-sm ${textSecondary}`}>Aucun membre dans l'équipe.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {equipe.map((membre) => {
                  const present = draft.personnelPresent.find((p) => p.id === membre.id);
                  return (
                    <div key={membre.id} className={`flex items-center gap-3 p-2 rounded-md ${present ? 'bg-surface-2' : ''}`}>
                      <input
                        type="checkbox"
                        checked={!!present}
                        onChange={() => togglePersonnel(membre.id)}
                        className="h-4 w-4 rounded border-bord-fort accent-[rgb(var(--accent))]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${textPrimary}`}>{membre.prenom} {membre.nom}</span>
                        {membre.role && <span className={`ml-2 text-xs ${textSecondary}`}>({membre.role})</span>}
                      </div>
                      {present && (
                        <label className="flex items-center gap-1 flex-shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={present.heures}
                            onChange={(e) => updatePersonnelHeures(membre.id, e.target.value)}
                            className={`w-16 rounded border px-2 py-1 text-xs text-center ${inputCls}`}
                          />
                          <span className={`text-xs ${textSecondary}`}>h</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* External workers */}
            <div className="pt-2 border-t border-bord">
              <p className={`text-xs font-medium ${textSecondary} mb-2`}>Intervenants externes</p>
              {draft.intervenantsExternes.map((ext) => (
                <div key={ext.id} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={ext.nom}
                    onChange={(e) => updateExterne(ext.id, e.target.value)}
                    placeholder="Nom de l'intervenant"
                    className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${inputCls}`}
                  />
                  <button onClick={() => removeExterne(ext.id)} className="p-1 text-danger-texte hover:bg-danger-fond rounded">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addExterne} className="text-xs font-medium flex items-center gap-1 text-accent-texte hover:underline">
                <Plus size={12} /> Ajouter intervenant externe
              </button>
            </div>
          </Section>

          {/* Section 3 — Travaux réalisés (full width) */}
          <div className="lg:col-span-2">
            <Section title="Travaux réalisés" icon={Hammer} isDark={isDark}>
              {draft.travaux.length === 0 && (
                <p className={`text-sm ${textSecondary}`}>Aucun travail renseigné.</p>
              )}
              <div className="space-y-4">
                {draft.travaux.map((travail) => (
                  <div key={travail.id} className={`rounded-lg border p-3 space-y-3 border-bord bg-fond`}>
                    <div className="flex justify-between items-start gap-2">
                      <textarea
                        value={travail.description}
                        onChange={(e) => updateTravail(travail.id, 'description', e.target.value)}
                        placeholder="Description des travaux"
                        rows={2}
                        className={`flex-1 rounded-md border px-3 py-2 text-sm resize-none ${inputCls}`}
                      />
                      <button onClick={() => removeTravail(travail.id)} className="p-1 text-danger-texte hover:bg-danger-fond rounded flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="block">
                        <span className={`text-xs ${textSecondary}`}>Zone / emplacement</span>
                        <input
                          type="text"
                          value={travail.zone}
                          onChange={(e) => updateTravail(travail.id, 'zone', e.target.value)}
                          placeholder="Ex: RDC, étage 2..."
                          className={`mt-1 block w-full rounded-md border px-3 py-1.5 text-sm ${inputCls}`}
                        />
                      </label>
                      <label className="block">
                        <span className={`text-xs ${textSecondary}`}>Corps de métier</span>
                        <select
                          value={travail.corpsMetier}
                          onChange={(e) => updateTravail(travail.id, 'corpsMetier', e.target.value)}
                          className={`mt-1 block w-full rounded-md border px-3 py-1.5 text-sm ${inputCls}`}
                        >
                          {CORPS_METIER.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className={`text-xs ${textSecondary}`}>Avancement: {travail.avancement}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={travail.avancement}
                          onChange={(e) => updateTravail(travail.id, 'avancement', parseInt(e.target.value, 10))}
                          className="mt-2 block w-full accent-[rgb(var(--accent))]"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addTravail} className="mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline text-accent-texte">
                <Plus size={14} /> Ajouter travaux
              </button>
            </Section>
          </div>

          {/* Section 4 — Observations et incidents */}
          <div className="lg:col-span-2">
            <Section title="Observations et incidents" icon={AlertTriangle} isDark={isDark}>
              <label className="block">
                <span className={`text-xs font-medium ${textSecondary}`}>Observations</span>
                <textarea
                  value={draft.observations}
                  onChange={(e) => updateDraft('observations', e.target.value)}
                  rows={3}
                  placeholder="Observations générales sur le déroulement du chantier..."
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm resize-none ${inputCls}`}
                />
              </label>

              <div className="pt-2">
                <p className={`text-xs font-medium ${textSecondary} mb-2`}>Incidents</p>
                {draft.incidents.length === 0 && (
                  <p className={`text-xs ${textSecondary}`}>Aucun incident signalé.</p>
                )}
                <div className="space-y-3">
                  {draft.incidents.map((incident) => (
                    <div key={incident.id} className={`rounded-lg border p-3 space-y-2 border-bord bg-danger-fond/30`}>
                      <div className="flex justify-between items-start gap-2">
                        <input
                          type="text"
                          value={incident.description}
                          onChange={(e) => updateIncident(incident.id, 'description', e.target.value)}
                          placeholder="Description de l'incident"
                          className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${inputCls}`}
                        />
                        <button onClick={() => removeIncident(incident.id)} className="p-1 text-danger-texte hover:bg-danger-fond rounded flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className={`text-xs ${textSecondary}`}>Gravité</span>
                          <select
                            value={incident.gravite}
                            onChange={(e) => updateIncident(incident.id, 'gravite', e.target.value)}
                            className={`mt-1 block w-full rounded-md border px-3 py-1.5 text-sm ${inputCls}`}
                          >
                            {GRAVITE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                          </select>
                          {/* Gravity color badge */}
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${GRAVITE_OPTIONS.find((g) => g.value === incident.gravite)?.classes || ''}`}>
                            {GRAVITE_OPTIONS.find((g) => g.value === incident.gravite)?.label}
                          </span>
                        </label>
                        <label className="block">
                          <span className={`text-xs ${textSecondary}`}>Action corrective</span>
                          <textarea
                            value={incident.actionCorrective}
                            onChange={(e) => updateIncident(incident.id, 'actionCorrective', e.target.value)}
                            rows={2}
                            placeholder="Mesures prises ou à prendre..."
                            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm resize-none ${inputCls}`}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addIncident} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-danger-texte hover:underline">
                  <Plus size={14} /> Ajouter incident
                </button>
              </div>
            </Section>
          </div>

          {/* Section 5 — Matériaux reçus (collapsible) */}
          <div className="lg:col-span-2">
            <Section title="Matériaux reçus" icon={Package} isDark={isDark} collapsible defaultOpen={draft.materiaux.length > 0}>
              {draft.materiaux.length === 0 && (
                <p className={`text-sm ${textSecondary}`}>Aucune livraison enregistrée.</p>
              )}
              <div className="space-y-3">
                {draft.materiaux.map((mat) => (
                  <div key={mat.id} className={`flex flex-col sm:flex-row gap-2 p-2 rounded-lg bg-surface-2`}>
                    <input
                      type="text"
                      value={mat.description}
                      onChange={(e) => updateMateriau(mat.id, 'description', e.target.value)}
                      placeholder="Description"
                      className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${inputCls}`}
                    />
                    <input
                      type="text"
                      value={mat.quantite}
                      onChange={(e) => updateMateriau(mat.id, 'quantite', e.target.value)}
                      placeholder="Quantité"
                      className={`w-full sm:w-28 rounded-md border px-3 py-1.5 text-sm ${inputCls}`}
                    />
                    <input
                      type="text"
                      value={mat.fournisseur}
                      onChange={(e) => updateMateriau(mat.id, 'fournisseur', e.target.value)}
                      placeholder="Fournisseur"
                      className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${inputCls}`}
                    />
                    <button onClick={() => removeMateriau(mat.id)} className="p-1.5 text-danger-texte hover:bg-danger-fond rounded self-center flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addMateriau} className="mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline text-accent-texte">
                <Plus size={14} /> Ajouter livraison
              </button>
            </Section>
          </div>

          {/* Section 6 — Signature */}
          <div className="lg:col-span-2">
            <Section title="Signature" icon={PenTool} isDark={isDark}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className={`text-xs font-medium ${textSecondary}`}>Signé par</span>
                  <input
                    type="text"
                    value={draft.signePar}
                    onChange={(e) => updateDraft('signePar', e.target.value)}
                    placeholder="Nom du signataire"
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${inputCls}`}
                  />
                </label>
                <label className="block">
                  <span className={`text-xs font-medium ${textSecondary}`}>Date de signature</span>
                  <input
                    type="text"
                    readOnly
                    value={draft.dateSignature ? dateLue(draft.dateSignature).toLocaleDateString('fr-FR') : 'Remplie automatiquement lors de la validation'}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${inputCls} opacity-60 cursor-not-allowed`}
                  />
                </label>
              </div>
            </Section>
          </div>
        </div>
      </div>
    );
  };

  /** Render a validated report in read-only view. */
  const renderView = () => {
    if (!draft) return null;

    const meteo = METEO_OPTIONS.find((m) => m.value === draft.meteo);

    return (
      <div className="space-y-4">
        {/* View header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className={`p-2 rounded-lg hover:bg-surface-2 transition-colors`}>
              <ArrowLeft size={18} className={textPrimary} />
            </button>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>Rapport #{draft.numero}</h2>
              <div className="flex items-center gap-2 mt-1">
                <TypeBadge type={draft.type} isDark={isDark} />
                <StatutBadge statut={draft.statut} isDark={isDark} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {draft.statut !== 'valide' && (
              <button
                onClick={() => { setMode('edit'); }}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-surface-2 text-encre-2 hover:bg-bord transition-colors`}
              >
                <Edit3 size={14} /> Modifier
              </button>
            )}
            <button
              onClick={() => { try { downloadRapportPDF(draft, chantier, { couleur }); showToast('PDF téléchargé', 'success'); } catch (e) { showToast('Erreur export PDF', 'error'); } }}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-surface-2 text-encre-2 hover:bg-bord transition-colors`}
            >
              <FileText size={14} /> Exporter PDF
            </button>
          </div>
        </div>

        {/* Read-only formatted view */}
        <div className={`rounded-lg border ${cardBg} p-6 space-y-6 print:shadow-none`}>
          {/* General info block */}
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${textSecondary}`}>Informations générales</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className={`block text-xs ${textSecondary}`}>Date</span>
                <span className={`font-medium ${textPrimary}`}>{dateLue(draft.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div>
                <span className={`block text-xs ${textSecondary}`}>Type</span>
                <TypeBadge type={draft.type} isDark={isDark} />
              </div>
              <div>
                <span className={`block text-xs ${textSecondary}`}>Météo</span>
                <span className={`font-medium ${textPrimary}`}>{meteo?.icon} {meteo?.label}</span>
              </div>
              <div>
                <span className={`block text-xs ${textSecondary}`}>Température</span>
                <span className={`font-medium ${textPrimary}`}>{draft.temperature ? `${draft.temperature} °C` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Personnel */}
          {draft.personnelPresent.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${textSecondary}`}>Personnel présent</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {draft.personnelPresent.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-md bg-surface-2`}>
                    <span className={`text-sm ${textPrimary}`}>{p.prenom} {p.nom} <span className={`text-xs ${textSecondary}`}>({p.role})</span></span>
                    <span className={`text-sm font-medium ${textPrimary}`}>{p.heures}h</span>
                  </div>
                ))}
              </div>
              {draft.intervenantsExternes.filter((e) => e.nom.trim()).length > 0 && (
                <div className="mt-2">
                  <span className={`text-xs font-medium ${textSecondary}`}>Intervenants externes:</span>
                  <span className={`text-sm ml-1 ${textPrimary}`}>
                    {draft.intervenantsExternes.filter((e) => e.nom.trim()).map((e) => e.nom).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Travaux */}
          {draft.travaux.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${textSecondary}`}>Travaux réalisés</h3>
              <div className="space-y-3">
                {draft.travaux.map((t) => (
                  <div key={t.id} className={`rounded-lg border p-3 border-bord bg-alerte-fond/30`}>
                    <p className={`text-sm font-medium ${textPrimary}`}>{t.description || 'Sans description'}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs">
                      {t.zone && <span className={textSecondary}>Zone: <strong className={textPrimary}>{t.zone}</strong></span>}
                      <span className={textSecondary}>Métier: <strong className={textPrimary}>{t.corpsMetier}</strong></span>
                      <span className={textSecondary}>Avancement: <strong className={textPrimary}>{t.avancement}%</strong></span>
                    </div>
                    {/* Progress bar */}
                    <div className={`mt-2 h-2 rounded-full bg-bord`}>
                      <div className="h-full rounded-full transition-all bg-accent" style={{ width: `${t.avancement}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observations */}
          {(draft.observations || draft.incidents.length > 0) && (
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${textSecondary}`}>Observations et incidents</h3>
              {draft.observations && (
                <p className={`text-sm ${textPrimary} whitespace-pre-wrap mb-3`}>{draft.observations}</p>
              )}
              {draft.incidents.length > 0 && (
                <div className="space-y-2">
                  {draft.incidents.map((inc) => {
                    const grav = GRAVITE_OPTIONS.find((g) => g.value === inc.gravite);
                    return (
                      <div key={inc.id} className={`rounded-lg border p-3 border-bord bg-danger-fond/30`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${textPrimary}`}>{inc.description || 'Sans description'}</p>
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${grav?.classes || ''}`}>
                            {grav?.label}
                          </span>
                        </div>
                        {inc.actionCorrective && (
                          <p className={`text-xs mt-1 ${textSecondary}`}>Action corrective: {inc.actionCorrective}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Materiaux */}
          {draft.materiaux.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${textSecondary}`}>Matériaux reçus</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Matériaux reçus sur le chantier">
                  <thead>
                    <tr className={`text-left ${textSecondary}`}>
                      <th scope="col" className="pb-2 font-medium text-xs">Description</th>
                      <th scope="col" className="pb-2 font-medium text-xs">Quantité</th>
                      <th scope="col" className="pb-2 font-medium text-xs">Fournisseur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.materiaux.map((m) => (
                      <tr key={m.id} className={`border-t border-bord`}>
                        <td className={`py-2 ${textPrimary}`}>{m.description || '—'}</td>
                        <td className={`py-2 ${textPrimary}`}>{m.quantite || '—'}</td>
                        <td className={`py-2 ${textPrimary}`}>{m.fournisseur || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signature block */}
          <div className={`pt-4 border-t border-bord`}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className={`block text-xs ${textSecondary}`}>Signé par</span>
                <span className={`font-medium ${textPrimary}`}>{draft.signePar || '—'}</span>
              </div>
              <div>
                <span className={`block text-xs ${textSecondary}`}>Date de signature</span>
                <span className={`font-medium ${textPrimary}`}>
                  {draft.dateSignature ? dateLue(draft.dateSignature).toLocaleDateString('fr-FR') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <div className={`min-h-0 text-encre`}>
      {/* Route between list, editor, and view */}
      {mode === 'list' && renderList()}
      {mode === 'edit' && renderEditor()}
      {mode === 'view' && renderView()}
    </div>
  );
}
