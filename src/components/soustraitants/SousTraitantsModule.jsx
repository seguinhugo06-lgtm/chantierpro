/**
 * SousTraitantsModule.jsx
 *
 * Module de gestion des sous-traitants pour ChantierPro.
 * Permet de creer, modifier, visualiser et suivre les sous-traitants
 * avec gestion de la conformite (RC Pro, URSSAF), notes de qualite,
 * et association aux chantiers.
 *
 * @param {Object} props
 * @param {Array} props.chantiers - Liste des chantiers disponibles
 * @param {boolean} props.isDark - Mode sombre actif
 * @param {string} props.couleur - Couleur de marque
 * @param {Function} props.setPage - Navigation vers d'autres pages
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HardHat, Plus, Search, Edit3, Trash2, Star, X, Save,
  Shield, ShieldCheck, ShieldAlert, ShieldOff, Phone, Mail,
  MapPin, FileCheck, AlertTriangle, Building2, Calendar,
  Clock, ChevronRight, Users, Upload, File, FilePlus
} from 'lucide-react';
import { generateId } from '../../lib/utils';

// ---------- Constants ----------

const STORAGE_KEY = 'cp_sous_traitants';

const CORPS_METIER = [
  { id: 'plomberie', label: 'Plomberie', color: '#3b82f6' },
  { id: 'electricite', label: 'Electricite', color: '#eab308' },
  { id: 'maconnerie', label: 'Maconnerie', color: '#f97316' },
  { id: 'carrelage', label: 'Carrelage', color: '#06b6d4' },
  { id: 'peinture', label: 'Peinture', color: '#ec4899' },
  { id: 'menuiserie', label: 'Menuiserie', color: '#d97706' },
  { id: 'couverture', label: 'Couverture', color: '#84cc16' },
  { id: 'charpente', label: 'Charpente', color: '#a16207' },
  { id: 'platrerie', label: 'Platrerie', color: '#a855f7' },
  { id: 'serrurerie', label: 'Serrurerie', color: '#6366f1' },
  { id: 'terrassement', label: 'Terrassement', color: '#78716c' },
  { id: 'vrd', label: 'VRD', color: '#14b8a6' },
  { id: 'autre', label: 'Autre', color: '#64748b' }
];

const DOCUMENT_TYPES = [
  'RC Pro',
  'Décennale',
  'Attestation URSSAF',
  'Kbis',
  'Attestation TVA',
  'Autre'
];

const EMPTY_FORM = {
  nom: '',
  contact: '',
  email: '',
  telephone: '',
  adresse: '',
  siret: '',
  corpsMetier: 'autre',
  tauxHoraire: '',
  assuranceRcPro: '',
  dateExpirationAssurance: '',
  attestationUrssaf: false,
  dateAttestationUrssaf: '',
  noteQualite: 0,
  chantierIds: [],
  notes: '',
  actif: true,
  documents: []
};

// ---------- Helpers ----------

function getCorpsMetier(id) {
  return CORPS_METIER.find(c => c.id === id) || CORPS_METIER.find(c => c.id === 'autre');
}

function getComplianceStatus(st) {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let worst = 'green';

  // Check RC Pro
  if (!st.assuranceRcPro || !st.dateExpirationAssurance) {
    worst = 'red';
  } else {
    const expDate = new Date(st.dateExpirationAssurance);
    if (expDate < now) {
      worst = 'red';
    } else if (expDate < in30Days) {
      worst = worst === 'red' ? 'red' : 'yellow';
    }
  }

  // Check URSSAF
  if (!st.attestationUrssaf || !st.dateAttestationUrssaf) {
    worst = 'red';
  } else {
    const urssafDate = new Date(st.dateAttestationUrssaf);
    if (urssafDate < now) {
      worst = 'red';
    } else if (urssafDate < in30Days && worst !== 'red') {
      worst = 'yellow';
    }
  }

  // Check documents expiration
  if (st.documents && st.documents.length > 0) {
    for (const doc of st.documents) {
      if (doc.dateExpiration) {
        const docDate = new Date(doc.dateExpiration);
        if (docDate < now) {
          worst = 'red';
        } else if (docDate < in30Days && worst !== 'red') {
          worst = 'yellow';
        }
      }
    }
  }

  return worst;
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleDateString('fr-FR');
  } catch {
    return '-';
  }
}

function daysUntil(isoStr) {
  if (!isoStr) return null;
  const diff = new Date(isoStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ---------- Component ----------

export default function SousTraitantsModule({ chantiers = [], isDark = false, couleur = '#f97316', setPage }) {
  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const pageBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // State
  const [sousTraitants, setSousTraitants] = useState([]);
  const [view, setView] = useState('list'); // list | detail | form
  const [selectedId, setSelectedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const [filterCorps, setFilterCorps] = useState('all');

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSousTraitants(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Erreur chargement sous-traitants:', e);
    }
  }, []);

  // Save to localStorage
  const persist = useCallback((data) => {
    setSousTraitants(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Erreur sauvegarde sous-traitants:', e);
    }
  }, []);

  // Computed data
  const selected = useMemo(() => {
    return sousTraitants.find(st => st.id === selectedId) || null;
  }, [sousTraitants, selectedId]);

  const stats = useMemo(() => {
    const actifs = sousTraitants.filter(st => st.actif);
    const alertes = sousTraitants.filter(st => st.actif && getComplianceStatus(st) === 'red');
    const alertesJaunes = sousTraitants.filter(st => st.actif && getComplianceStatus(st) === 'yellow');
    const notes = actifs.filter(st => st.noteQualite > 0);
    const noteMoyenne = notes.length > 0
      ? (notes.reduce((sum, st) => sum + st.noteQualite, 0) / notes.length).toFixed(1)
      : '-';
    return { actifs: actifs.length, alertes: alertes.length, alertesJaunes: alertesJaunes.length, noteMoyenne };
  }, [sousTraitants]);

  const filtered = useMemo(() => {
    let result = sousTraitants.filter(st => st.actif);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(st =>
        st.nom?.toLowerCase().includes(q) ||
        st.contact?.toLowerCase().includes(q) ||
        st.email?.toLowerCase().includes(q) ||
        st.siret?.includes(q)
      );
    }
    if (filterCorps !== 'all') {
      result = result.filter(st => st.corpsMetier === filterCorps);
    }
    return result.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [sousTraitants, search, filterCorps]);

  // Actions
  const openForm = useCallback((stId = null) => {
    if (stId) {
      const st = sousTraitants.find(s => s.id === stId);
      if (st) {
        setForm({
          nom: st.nom || '',
          contact: st.contact || '',
          email: st.email || '',
          telephone: st.telephone || '',
          adresse: st.adresse || '',
          siret: st.siret || '',
          corpsMetier: st.corpsMetier || 'autre',
          tauxHoraire: st.tauxHoraire || '',
          assuranceRcPro: st.assuranceRcPro || '',
          dateExpirationAssurance: st.dateExpirationAssurance || '',
          attestationUrssaf: st.attestationUrssaf || false,
          dateAttestationUrssaf: st.dateAttestationUrssaf || '',
          noteQualite: st.noteQualite || 0,
          chantierIds: st.chantierIds || [],
          notes: st.notes || '',
          actif: st.actif !== undefined ? st.actif : true,
          documents: st.documents || []
        });
        setEditId(stId);
      }
    } else {
      setForm({ ...EMPTY_FORM });
      setEditId(null);
    }
    setView('form');
  }, [sousTraitants]);

  const handleSave = useCallback(() => {
    const nom = form.nom.trim();
    if (!nom) return;

    const record = {
      nom,
      contact: form.contact.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      adresse: form.adresse.trim(),
      siret: form.siret.trim(),
      corpsMetier: form.corpsMetier,
      tauxHoraire: parseFloat(form.tauxHoraire) || 0,
      assuranceRcPro: form.assuranceRcPro.trim(),
      dateExpirationAssurance: form.dateExpirationAssurance || '',
      attestationUrssaf: form.attestationUrssaf,
      dateAttestationUrssaf: form.dateAttestationUrssaf || '',
      noteQualite: form.noteQualite || 0,
      chantierIds: form.chantierIds || [],
      notes: form.notes.trim(),
      actif: form.actif,
      documents: form.documents || []
    };

    if (editId) {
      const updated = sousTraitants.map(st =>
        st.id === editId ? { ...st, ...record } : st
      );
      persist(updated);
      setSelectedId(editId);
      setView('detail');
    } else {
      const newSt = {
        id: generateId('st'),
        ...record,
        createdAt: new Date().toISOString()
      };
      persist([...sousTraitants, newSt]);
      setSelectedId(newSt.id);
      setView('detail');
    }
    setEditId(null);
  }, [form, editId, sousTraitants, persist]);

  const handleDelete = useCallback((stId) => {
    if (!window.confirm('Supprimer ce sous-traitant ?')) return;
    const updated = sousTraitants.filter(st => st.id !== stId);
    persist(updated);
    if (selectedId === stId) {
      setSelectedId(null);
      setView('list');
    }
  }, [sousTraitants, selectedId, persist]);

  const toggleChantier = useCallback((chantierId) => {
    setForm(prev => {
      const ids = prev.chantierIds || [];
      return {
        ...prev,
        chantierIds: ids.includes(chantierId)
          ? ids.filter(id => id !== chantierId)
          : [...ids, chantierId]
      };
    });
  }, []);

  // ---------- Sub-Components ----------

  // Star rating component
  const StarRating = ({ value, onChange, size = 20, readOnly = false }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange && onChange(i === value ? 0 : i)}
          className={`transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            size={size}
            className={i <= value ? 'text-amber-400' : isDark ? 'text-slate-600' : 'text-slate-300'}
            fill={i <= value ? '#fbbf24' : 'none'}
          />
        </button>
      ))}
    </div>
  );

  // Compliance badge
  const ComplianceBadge = ({ status, small = false }) => {
    const config = {
      green: {
        icon: ShieldCheck,
        label: 'Conforme',
        bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dot: 'bg-emerald-500'
      },
      yellow: {
        icon: ShieldAlert,
        label: 'Expire bientot',
        bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dot: 'bg-amber-500'
      },
      red: {
        icon: ShieldOff,
        label: 'Non conforme',
        bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        dot: 'bg-red-500'
      }
    };
    const c = config[status] || config.red;
    const Icon = c.icon;

    if (small) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          {c.label}
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${c.bg}`}>
        <Icon size={14} />
        {c.label}
      </span>
    );
  };

  // Corps de métier badge
  const CorpsMetierBadge = ({ corpsMetier }) => {
    const cm = getCorpsMetier(corpsMetier);
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: cm.color }}
      >
        {cm.label}
      </span>
    );
  };

  // Document expiration badge
  const DocumentExpirationBadge = ({ dateExpiration }) => {
    if (!dateExpiration) return <span className={`text-xs ${textMuted}`}>Pas de date</span>;
    const days = daysUntil(dateExpiration);
    if (days < 0) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expiré</span>;
    }
    if (days < 30) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Expire bientôt</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Valide</span>;
  };

  // Get documents expiring within 30 days
  const getExpiringDocuments = (st) => {
    if (!st.documents || st.documents.length === 0) return [];
    return st.documents.filter(doc => {
      if (!doc.dateExpiration) return false;
      const days = daysUntil(doc.dateExpiration);
      return days !== null && days >= 0 && days < 30;
    });
  };

  // Add/remove document in form
  const addDocument = useCallback(() => {
    setForm(prev => ({
      ...prev,
      documents: [...(prev.documents || []), {
        id: generateId('doc'),
        nom: '',
        type: 'RC Pro',
        dateAjout: new Date().toISOString().slice(0, 10),
        dateExpiration: '',
        fichier: 'document_simule.pdf'
      }]
    }));
  }, []);

  const removeDocument = useCallback((docId) => {
    setForm(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(d => d.id !== docId)
    }));
  }, []);

  const updateDocument = useCallback((docId, field, value) => {
    setForm(prev => ({
      ...prev,
      documents: (prev.documents || []).map(d =>
        d.id === docId ? { ...d, [field]: value } : d
      )
    }));
  }, []);

  // ---------- RENDER: Form View ----------

  if (view === 'form') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setView(editId && selectedId ? 'detail' : 'list');
                setEditId(null);
              }}
              className={`p-2 rounded-xl ${hoverBg} transition-colors`}
            >
              <X size={20} className={textPrimary} />
            </button>
            <h1 className={`text-xl font-bold ${textPrimary}`}>
              {editId ? 'Modifier le sous-traitant' : 'Nouveau sous-traitant'}
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={!form.nom.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-all disabled:opacity-40"
            style={{ backgroundColor: couleur }}
          >
            <Save size={16} />
            Enregistrer
          </button>
        </div>

        {/* Form sections */}
        <div className="space-y-6">
          {/* Informations générales */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <Building2 size={18} style={{ color: couleur }} />
              Informations générales
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom de l'entreprise *</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  placeholder="Ex: Dupont Plomberie SARL"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Personne de contact</label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  placeholder="contact@dupont-plomberie.fr"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Téléphone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Adresse</label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  placeholder="12 rue des Artisans, 75001 Paris"
                />
              </div>
            </div>
          </div>

          {/* Informations légales */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <FileCheck size={18} style={{ color: couleur }} />
              Informations légales
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>SIRET</label>
                <input
                  type="text"
                  value={form.siret}
                  onChange={e => setForm(p => ({ ...p, siret: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  placeholder="123 456 789 00012"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Corps de métier</label>
                <select
                  value={form.corpsMetier}
                  onChange={e => setForm(p => ({ ...p, corpsMetier: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                >
                  {CORPS_METIER.map(cm => (
                    <option key={cm.id} value={cm.id}>{cm.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tarification */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <Clock size={18} style={{ color: couleur }} />
              Tarification
            </h2>
            <div className="max-w-xs">
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Taux horaire (EUR/h)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.tauxHoraire}
                onChange={e => setForm(p => ({ ...p, tauxHoraire: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                placeholder="45"
              />
            </div>
          </div>

          {/* Conformite */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <Shield size={18} style={{ color: couleur }} />
              Conformite
            </h2>
            <div className="space-y-6">
              {/* RC Pro */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Assurance RC Pro</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm mb-1 ${textSecondary}`}>Numéro de police</label>
                    <input
                      type="text"
                      value={form.assuranceRcPro}
                      onChange={e => setForm(p => ({ ...p, assuranceRcPro: e.target.value }))}
                      className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                      placeholder="RC-2024-001234"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${textSecondary}`}>Date d'expiration</label>
                    <input
                      type="date"
                      value={form.dateExpirationAssurance}
                      onChange={e => setForm(p => ({ ...p, dateExpirationAssurance: e.target.value }))}
                      className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                    />
                    {form.dateExpirationAssurance && daysUntil(form.dateExpirationAssurance) !== null && (
                      <p className={`text-xs mt-1 ${
                        daysUntil(form.dateExpirationAssurance) < 0
                          ? 'text-red-500'
                          : daysUntil(form.dateExpirationAssurance) < 30
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                      }`}>
                        {daysUntil(form.dateExpirationAssurance) < 0
                          ? `Expiree depuis ${Math.abs(daysUntil(form.dateExpirationAssurance))} jours`
                          : `Expire dans ${daysUntil(form.dateExpirationAssurance)} jours`
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* URSSAF */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Attestation URSSAF</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.attestationUrssaf}
                        onChange={e => setForm(p => ({ ...p, attestationUrssaf: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    </label>
                    <span className={`text-sm ${textPrimary}`}>Attestation recue</span>
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${textSecondary}`}>Date de validite</label>
                    <input
                      type="date"
                      value={form.dateAttestationUrssaf}
                      onChange={e => setForm(p => ({ ...p, dateAttestationUrssaf: e.target.value }))}
                      className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                    />
                    {form.dateAttestationUrssaf && daysUntil(form.dateAttestationUrssaf) !== null && (
                      <p className={`text-xs mt-1 ${
                        daysUntil(form.dateAttestationUrssaf) < 0
                          ? 'text-red-500'
                          : daysUntil(form.dateAttestationUrssaf) < 30
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                      }`}>
                        {daysUntil(form.dateAttestationUrssaf) < 0
                          ? `Expiree depuis ${Math.abs(daysUntil(form.dateAttestationUrssaf))} jours`
                          : `Valide encore ${daysUntil(form.dateAttestationUrssaf)} jours`
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Note qualite */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <Star size={18} style={{ color: couleur }} />
              Note de qualite
            </h2>
            <div className="flex items-center gap-4">
              <StarRating
                value={form.noteQualite}
                onChange={val => setForm(p => ({ ...p, noteQualite: val }))}
                size={28}
              />
              <span className={`text-sm ${textMuted}`}>
                {form.noteQualite > 0 ? `${form.noteQualite}/5` : 'Non noté'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Notes</h2>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              className={`w-full px-4 py-2.5 border rounded-xl resize-none ${inputBg}`}
              placeholder="Remarques, historique de collaboration..."
            />
          </div>

          {/* Documents */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${textPrimary}`}>
                <File size={18} style={{ color: couleur }} />
                Documents ({(form.documents || []).length})
              </h2>
              <button
                type="button"
                onClick={addDocument}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: couleur }}
              >
                <FilePlus size={14} />
                Ajouter
              </button>
            </div>
            {(form.documents || []).length === 0 ? (
              <p className={`text-sm italic ${textMuted}`}>Aucun document. Cliquez sur "Ajouter" pour joindre un document.</p>
            ) : (
              <div className="space-y-3">
                {(form.documents || []).map(doc => (
                  <div key={doc.id} className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <File size={16} style={{ color: couleur }} className="flex-shrink-0 mt-2" />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={doc.type}
                        onChange={e => updateDocument(doc.id, 'type', e.target.value)}
                        className={`px-3 py-1.5 border rounded-lg text-sm ${inputBg}`}
                      >
                        {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        type="text"
                        value={doc.nom}
                        onChange={e => updateDocument(doc.id, 'nom', e.target.value)}
                        placeholder="Nom du document"
                        className={`px-3 py-1.5 border rounded-lg text-sm ${inputBg}`}
                      />
                      <input
                        type="date"
                        value={doc.dateExpiration}
                        onChange={e => updateDocument(doc.id, 'dateExpiration', e.target.value)}
                        className={`px-3 py-1.5 border rounded-lg text-sm ${inputBg}`}
                        title="Date d'expiration"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chantiers assignes */}
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <Building2 size={18} style={{ color: couleur }} />
              Chantiers assignes
            </h2>
            {chantiers.length === 0 ? (
              <p className={`text-sm ${textMuted}`}>Aucun chantier disponible.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {chantiers.map(ch => {
                  const isSelected = (form.chantierIds || []).includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChantier(ch.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        isSelected
                          ? 'text-white border-transparent'
                          : `${isDark ? 'border-slate-600 text-slate-300 hover:border-slate-500' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`
                      }`}
                      style={isSelected ? { backgroundColor: couleur } : {}}
                    >
                      <Building2 size={14} />
                      {ch.nom}
                      {isSelected && <X size={12} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom save bar */}
          <div className="flex justify-end gap-3 pb-4">
            <button
              onClick={() => {
                setView(editId && selectedId ? 'detail' : 'list');
                setEditId(null);
              }}
              className={`px-5 py-2.5 rounded-xl border font-medium transition-colors ${cardBg} ${textPrimary}`}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!form.nom.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium transition-all disabled:opacity-40"
              style={{ backgroundColor: couleur }}
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- RENDER: Detail View ----------

  if (view === 'detail' && selected) {
    const compliance = getComplianceStatus(selected);
    const cm = getCorpsMetier(selected.corpsMetier);
    const linkedChantiers = chantiers.filter(ch => (selected.chantierIds || []).includes(ch.id));
    const selectedDocuments = selected.documents || [];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('list'); setSelectedId(null); }}
              className={`p-2 rounded-xl ${hoverBg} transition-colors`}
            >
              <X size={20} className={textPrimary} />
            </button>
            <div>
              <h1 className={`text-xl font-bold ${textPrimary}`}>{selected.nom}</h1>
              <div className="flex items-center gap-2 mt-1">
                <CorpsMetierBadge corpsMetier={selected.corpsMetier} />
                <ComplianceBadge status={compliance} small />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openForm(selected.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium transition-colors ${cardBg} ${textPrimary}`}
            >
              <Edit3 size={16} />
              Modifier
            </button>
            <button
              onClick={() => handleDelete(selected.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Contact */}
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`text-sm font-semibold mb-3 ${textMuted} uppercase tracking-wide`}>Contact</h3>
            <div className="space-y-3">
              {selected.contact && (
                <div className="flex items-center gap-3">
                  <Users size={16} className={textMuted} />
                  <span className={textPrimary}>{selected.contact}</span>
                </div>
              )}
              {selected.telephone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className={textMuted} />
                  <a href={`tel:${selected.telephone}`} className="text-blue-500 hover:underline">{selected.telephone}</a>
                </div>
              )}
              {selected.email && (
                <div className="flex items-center gap-3">
                  <Mail size={16} className={textMuted} />
                  <a href={`mailto:${selected.email}`} className="text-blue-500 hover:underline">{selected.email}</a>
                </div>
              )}
              {selected.adresse && (
                <div className="flex items-center gap-3">
                  <MapPin size={16} className={textMuted} />
                  <span className={textSecondary}>{selected.adresse}</span>
                </div>
              )}
              {!selected.contact && !selected.telephone && !selected.email && !selected.adresse && (
                <p className={`text-sm italic ${textMuted}`}>Aucune information de contact</p>
              )}
            </div>
          </div>

          {/* Legal & tarif */}
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`text-sm font-semibold mb-3 ${textMuted} uppercase tracking-wide`}>Informations légales</h3>
            <div className="space-y-3">
              {selected.siret && (
                <div className="flex items-center gap-3">
                  <FileCheck size={16} className={textMuted} />
                  <span className={textPrimary}>SIRET: {selected.siret}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <HardHat size={16} className={textMuted} />
                <CorpsMetierBadge corpsMetier={selected.corpsMetier} />
              </div>
              {selected.tauxHoraire > 0 && (
                <div className="flex items-center gap-3">
                  <Clock size={16} className={textMuted} />
                  <span className={textPrimary}>{selected.tauxHoraire} EUR/h</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Star size={16} className={textMuted} />
                {selected.noteQualite > 0 ? (
                  <StarRating value={selected.noteQualite} readOnly size={16} />
                ) : (
                  <span className={`text-sm italic ${textMuted}`}>Non noté</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conformite detail card */}
        <div className={`${cardBg} rounded-2xl border p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold ${textMuted} uppercase tracking-wide`}>Conformite</h3>
            <ComplianceBadge status={compliance} />
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* RC Pro */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} style={{ color: couleur }} />
                <span className={`font-medium ${textPrimary}`}>RC Pro</span>
              </div>
              {selected.assuranceRcPro ? (
                <div className="space-y-1">
                  <p className={`text-sm ${textSecondary}`}>Police : {selected.assuranceRcPro}</p>
                  <p className={`text-sm ${textSecondary}`}>Expiration : {formatDate(selected.dateExpirationAssurance)}</p>
                  {selected.dateExpirationAssurance && (
                    <p className={`text-xs font-medium ${
                      daysUntil(selected.dateExpirationAssurance) < 0
                        ? 'text-red-500'
                        : daysUntil(selected.dateExpirationAssurance) < 30
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                    }`}>
                      {daysUntil(selected.dateExpirationAssurance) < 0
                        ? `Expiree depuis ${Math.abs(daysUntil(selected.dateExpirationAssurance))} jours`
                        : `Valide encore ${daysUntil(selected.dateExpirationAssurance)} jours`
                      }
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-500 font-medium">Non renseignée</p>
              )}
            </div>

            {/* URSSAF */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} style={{ color: couleur }} />
                <span className={`font-medium ${textPrimary}`}>URSSAF</span>
              </div>
              {selected.attestationUrssaf ? (
                <div className="space-y-1">
                  <p className={`text-sm ${textSecondary}`}>Attestation : Recue</p>
                  <p className={`text-sm ${textSecondary}`}>Validite : {formatDate(selected.dateAttestationUrssaf)}</p>
                  {selected.dateAttestationUrssaf && (
                    <p className={`text-xs font-medium ${
                      daysUntil(selected.dateAttestationUrssaf) < 0
                        ? 'text-red-500'
                        : daysUntil(selected.dateAttestationUrssaf) < 30
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                    }`}>
                      {daysUntil(selected.dateAttestationUrssaf) < 0
                        ? `Expiree depuis ${Math.abs(daysUntil(selected.dateAttestationUrssaf))} jours`
                        : `Valide encore ${daysUntil(selected.dateAttestationUrssaf)} jours`
                      }
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-500 font-medium">Non reçue</p>
              )}
            </div>
          </div>
        </div>

        {/* Documents detail card */}
        <div className={`${cardBg} rounded-2xl border p-5`}>
          <h3 className={`text-sm font-semibold mb-4 ${textMuted} uppercase tracking-wide flex items-center gap-2`}>
            <File size={14} />
            Documents ({selectedDocuments.length})
          </h3>
          {selectedDocuments.length > 0 ? (
            <div className="space-y-3">
              {selectedDocuments.map(doc => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File size={16} style={{ color: couleur }} className="flex-shrink-0" />
                    <div className="min-w-0">
                      <p className={`font-medium text-sm truncate ${textPrimary}`}>
                        {doc.nom || 'Document sans nom'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${textMuted}`}>{doc.type}</span>
                        {doc.dateExpiration && (
                          <span className={`text-xs ${textMuted}`}>
                            — Expire le {formatDate(doc.dateExpiration)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <DocumentExpirationBadge dateExpiration={doc.dateExpiration} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm italic ${textMuted}`}>Aucun document enregistré.</p>
          )}
        </div>

        {/* Linked chantiers */}
        <div className={`${cardBg} rounded-2xl border p-5`}>
          <h3 className={`text-sm font-semibold mb-3 ${textMuted} uppercase tracking-wide`}>
            Chantiers assignes ({linkedChantiers.length})
          </h3>
          {linkedChantiers.length > 0 ? (
            <div className="space-y-2">
              {linkedChantiers.map(ch => (
                <div
                  key={ch.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'} transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className={textMuted} />
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{ch.nom}</p>
                      {ch.adresse && <p className={`text-xs ${textMuted}`}>{ch.adresse}</p>}
                    </div>
                  </div>
                  {ch.statut && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ch.statut === 'en_cours'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : ch.statut === 'termine'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Termine' : ch.statut}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm italic ${textMuted}`}>Aucun chantier assigné.</p>
          )}
        </div>

        {/* Notes */}
        {selected.notes && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`text-sm font-semibold mb-2 ${textMuted} uppercase tracking-wide`}>Notes</h3>
            <p className={`text-sm whitespace-pre-wrap ${textSecondary}`}>{selected.notes}</p>
          </div>
        )}

        {/* Meta */}
        <div className={`text-xs ${textMuted} flex items-center gap-2`}>
          <Calendar size={12} />
          Créé le {formatDate(selected.createdAt)}
        </div>
      </div>
    );
  }

  // ---------- RENDER: List View (default) ----------

  return (
    <div className="space-y-6">
      {/* Compliance alert banner */}
      {stats.alertes > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {stats.alertes} sous-traitant{stats.alertes > 1 ? 's' : ''} avec documents expirés ou manquants
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
              Vérifiez la conformité de vos sous-traitants pour éviter tout risque juridique.
            </p>
          </div>
        </div>
      )}

      {stats.alertesJaunes > 0 && stats.alertes === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {stats.alertesJaunes} sous-traitant{stats.alertesJaunes > 1 ? 's' : ''} avec documents expirant sous 30 jours
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              Pensez a demander le renouvellement des documents.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${couleur}20` }}>
            <HardHat size={24} style={{ color: couleur }} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>Sous-Traitants</h1>
            <p className={`text-sm ${textMuted}`}>Gestion des sous-traitants et conformité</p>
          </div>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-all hover:shadow-lg"
          style={{ backgroundColor: couleur }}
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Ajouter un sous-traitant</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`${cardBg} rounded-2xl border p-4 text-center`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users size={16} style={{ color: couleur }} />
            <span className={`text-xs font-medium ${textMuted} uppercase tracking-wide`}>Actifs</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{stats.actifs}</p>
        </div>
        <div className={`${cardBg} rounded-2xl border p-4 text-center`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldAlert size={16} className={stats.alertes > 0 ? 'text-red-500' : 'text-emerald-500'} />
            <span className={`text-xs font-medium ${textMuted} uppercase tracking-wide`}>Alertes</span>
          </div>
          <p className={`text-2xl font-bold ${stats.alertes > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {stats.alertes}
          </p>
        </div>
        <div className={`${cardBg} rounded-2xl border p-4 text-center`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Star size={16} className="text-amber-400" />
            <span className={`text-xs font-medium ${textMuted} uppercase tracking-wide`}>Note moy.</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{stats.noteMoyenne}</p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un sous-traitant..."
            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:text-slate-500`}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <select
          value={filterCorps}
          onChange={e => setFilterCorps(e.target.value)}
          className={`px-4 py-2.5 border rounded-xl ${inputBg} min-w-[180px]`}
        >
          <option value="all">Tous les corps de métier</option>
          {CORPS_METIER.map(cm => (
            <option key={cm.id} value={cm.id}>{cm.label}</option>
          ))}
        </select>
      </div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
          <HardHat size={40} className={`mx-auto mb-3 ${textMuted}`} />
          <p className={`font-medium ${textPrimary}`}>
            {sousTraitants.length === 0
              ? 'Aucun sous-traitant enregistre'
              : 'Aucun resultat pour cette recherche'
            }
          </p>
          <p className={`text-sm ${textMuted} mt-1`}>
            {sousTraitants.length === 0
              ? 'Commencez par ajouter votre premier sous-traitant.'
              : 'Essayez de modifier vos filtres.'
            }
          </p>
          {sousTraitants.length === 0 && (
            <button
              onClick={() => openForm()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
              style={{ backgroundColor: couleur }}
            >
              <Plus size={16} />
              Ajouter un sous-traitant
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(st => {
            const compliance = getComplianceStatus(st);
            const cm = getCorpsMetier(st.corpsMetier);
            const chantierCount = (st.chantierIds || []).length;
            const expiringDocs = getExpiringDocuments(st);

            return (
              <button
                key={st.id}
                onClick={() => { setSelectedId(st.id); setView('detail'); }}
                className={`w-full text-left ${cardBg} rounded-2xl border p-4 transition-all hover:shadow-md ${hoverBg} group`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className={`font-semibold truncate ${textPrimary}`}>{st.nom}</h3>
                      <CorpsMetierBadge corpsMetier={st.corpsMetier} />
                      {expiringDocs.length > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-amber-500"
                          title={`Documents expirant bientôt : ${expiringDocs.map(d => d.nom || d.type).join(', ')}`}
                        >
                          <AlertTriangle size={14} />
                          <span className="text-xs font-medium">{expiringDocs.length}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                      {st.contact && (
                        <span className={`text-sm ${textSecondary}`}>{st.contact}</span>
                      )}
                      {st.tauxHoraire > 0 && (
                        <span className={`text-sm ${textMuted}`}>{st.tauxHoraire} EUR/h</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {st.noteQualite > 0 && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              size={12}
                              className={i <= st.noteQualite ? 'text-amber-400' : isDark ? 'text-slate-600' : 'text-slate-300'}
                              fill={i <= st.noteQualite ? '#fbbf24' : 'none'}
                            />
                          ))}
                        </div>
                      )}
                      <ComplianceBadge status={compliance} small />
                      {chantierCount > 0 && (
                        <span className={`inline-flex items-center gap-1 text-xs ${textMuted}`}>
                          <Building2 size={12} />
                          {chantierCount} chantier{chantierCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={18} className={`${textMuted} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1`} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className={`text-xs text-center ${textMuted}`}>
          {filtered.length} sous-traitant{filtered.length > 1 ? 's' : ''} affiche{filtered.length > 1 ? 's' : ''}
          {search || filterCorps !== 'all' ? ` sur ${sousTraitants.filter(s => s.actif).length}` : ''}
        </p>
      )}
    </div>
  );
}
