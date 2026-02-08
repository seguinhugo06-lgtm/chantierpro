import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Edit3,
  Check,
  ChevronRight,
  AlertTriangle,
  Star,
  Palette,
  Mail,
  Phone,
  MapPin,
  Hash,
  Globe,
  FileText,
  Image,
  Save,
  ArrowLeft
} from 'lucide-react';

const LS_KEY_ENTREPRISES = 'cp_entreprises';
const LS_KEY_ACTIVE = 'cp_entreprise_active';
const MAX_ENTREPRISES = 5;

const COULEURS_PRESET = [
  '#f97316', '#ef4444', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'
];

function generateId() {
  return 'ent_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function loadEntreprises() {
  try {
    const raw = localStorage.getItem(LS_KEY_ENTREPRISES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveEntreprises(list) {
  localStorage.setItem(LS_KEY_ENTREPRISES, JSON.stringify(list));
}

function loadActiveId() {
  return localStorage.getItem(LS_KEY_ACTIVE) || '';
}

function saveActiveId(id) {
  localStorage.setItem(LS_KEY_ACTIVE, id);
}

function formatSiret(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + ' ' + digits.slice(3);
  if (digits.length <= 9) return digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6);
  return digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6, 9) + ' ' + digits.slice(9);
}

function cleanSiret(value) {
  return value.replace(/\D/g, '').slice(0, 14);
}

function createEntrepriseFromProp(prop) {
  return {
    id: generateId(),
    nom: prop.nom || '',
    siret: prop.siret || '',
    adresse: prop.adresse || '',
    codePostal: prop.codePostal || '',
    ville: prop.ville || '',
    telephone: prop.telephone || prop.tel || '',
    email: prop.email || '',
    tva_intra: prop.tva_intra || prop.tvaIntra || '',
    code_ape: prop.code_ape || prop.codeApe || '',
    rcs: prop.rcs || '',
    couleur: prop.couleur || '#f97316',
    logo: prop.logo || '',
    created_at: new Date().toISOString()
  };
}

function emptyForm() {
  return {
    nom: '',
    siret: '',
    adresse: '',
    codePostal: '',
    ville: '',
    telephone: '',
    email: '',
    tva_intra: '',
    code_ape: '',
    rcs: '',
    couleur: '#f97316',
    logo: ''
  };
}

export default function MultiEntreprise({ entreprise = {}, setEntreprise, isDark = false, couleur = '#f97316' }) {
  // -- Theme classes --
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  // -- State --
  const [entreprises, setEntreprises] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toastTimeout = useRef(null);

  // -- Init: load from localStorage or seed from prop --
  useEffect(() => {
    let list = loadEntreprises();
    let currentActiveId = loadActiveId();

    if (list.length === 0 && entreprise && (entreprise.nom || entreprise.siret)) {
      const seeded = createEntrepriseFromProp(entreprise);
      list = [seeded];
      currentActiveId = seeded.id;
      saveEntreprises(list);
      saveActiveId(currentActiveId);
    }

    if (list.length > 0 && !list.find(e => e.id === currentActiveId)) {
      currentActiveId = list[0].id;
      saveActiveId(currentActiveId);
    }

    setEntreprises(list);
    setActiveId(currentActiveId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Toast helper --
  const showToast = useCallback((message, type = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // -- Persist helpers --
  const persistAndSet = useCallback((list, newActiveId) => {
    setEntreprises(list);
    saveEntreprises(list);
    if (newActiveId !== undefined) {
      setActiveId(newActiveId);
      saveActiveId(newActiveId);
    }
  }, []);

  // -- Validate form --
  const validateForm = useCallback(() => {
    const errs = {};
    if (!form.nom.trim()) errs.nom = 'Le nom est requis';
    if (form.siret && cleanSiret(form.siret).length !== 14 && cleanSiret(form.siret).length !== 0) {
      errs.siret = 'Le SIRET doit contenir 14 chiffres';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email invalide';
    }
    if (form.codePostal && !/^\d{5}$/.test(form.codePostal.trim())) {
      errs.codePostal = 'Code postal invalide (5 chiffres)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  // -- Handle switch --
  const handleSwitch = useCallback((ent) => {
    if (ent.id === activeId) return;
    persistAndSet(entreprises, ent.id);
    if (setEntreprise) {
      setEntreprise(prev => ({
        ...prev,
        nom: ent.nom,
        siret: ent.siret,
        adresse: ent.adresse,
        codePostal: ent.codePostal,
        ville: ent.ville,
        telephone: ent.telephone,
        tel: ent.telephone,
        email: ent.email,
        tva_intra: ent.tva_intra,
        tvaIntra: ent.tva_intra,
        code_ape: ent.code_ape,
        codeApe: ent.code_ape,
        rcs: ent.rcs,
        couleur: ent.couleur,
        logo: ent.logo
      }));
    }
    showToast(`Entreprise "${ent.nom}" activee`);
  }, [activeId, entreprises, persistAndSet, setEntreprise, showToast]);

  // -- Open add form --
  const handleAdd = useCallback(() => {
    if (entreprises.length >= MAX_ENTREPRISES) {
      showToast(`Maximum ${MAX_ENTREPRISES} entreprises atteint`, 'error');
      return;
    }
    setForm(emptyForm());
    setEditingId(null);
    setErrors({});
    setView('form');
  }, [entreprises.length, showToast]);

  // -- Open edit form --
  const handleEdit = useCallback((ent) => {
    setForm({
      nom: ent.nom || '',
      siret: ent.siret || '',
      adresse: ent.adresse || '',
      codePostal: ent.codePostal || '',
      ville: ent.ville || '',
      telephone: ent.telephone || '',
      email: ent.email || '',
      tva_intra: ent.tva_intra || '',
      code_ape: ent.code_ape || '',
      rcs: ent.rcs || '',
      couleur: ent.couleur || '#f97316',
      logo: ent.logo || ''
    });
    setEditingId(ent.id);
    setErrors({});
    setView('form');
  }, []);

  // -- Save form --
  const handleSave = useCallback(() => {
    if (!validateForm()) return;

    const now = new Date().toISOString();
    const cleanedSiret = cleanSiret(form.siret);

    if (editingId) {
      // Update
      const updated = entreprises.map(e =>
        e.id === editingId
          ? { ...e, ...form, siret: cleanedSiret, updated_at: now }
          : e
      );
      persistAndSet(updated);
      // If editing active entreprise, sync to parent
      if (editingId === activeId && setEntreprise) {
        setEntreprise(prev => ({
          ...prev,
          nom: form.nom.trim(),
          siret: cleanedSiret,
          adresse: form.adresse.trim(),
          codePostal: form.codePostal.trim(),
          ville: form.ville.trim(),
          telephone: form.telephone.trim(),
          tel: form.telephone.trim(),
          email: form.email.trim(),
          tva_intra: form.tva_intra.trim(),
          tvaIntra: form.tva_intra.trim(),
          code_ape: form.code_ape.trim(),
          codeApe: form.code_ape.trim(),
          rcs: form.rcs.trim(),
          couleur: form.couleur,
          logo: form.logo
        }));
      }
      showToast('Entreprise modifiee');
    } else {
      // Create
      const newEnt = {
        id: generateId(),
        nom: form.nom.trim(),
        siret: cleanedSiret,
        adresse: form.adresse.trim(),
        codePostal: form.codePostal.trim(),
        ville: form.ville.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim(),
        tva_intra: form.tva_intra.trim(),
        code_ape: form.code_ape.trim(),
        rcs: form.rcs.trim(),
        couleur: form.couleur,
        logo: form.logo,
        created_at: now
      };
      const updated = [...entreprises, newEnt];
      persistAndSet(updated);
      showToast('Entreprise ajoutee');
    }

    setView('list');
    setEditingId(null);
  }, [form, editingId, entreprises, activeId, persistAndSet, setEntreprise, showToast, validateForm]);

  // -- Delete --
  const handleDelete = useCallback((ent) => {
    if (ent.id === activeId) {
      showToast('Impossible de supprimer l\'entreprise active', 'error');
      return;
    }
    if (entreprises.length <= 1) {
      showToast('Impossible de supprimer la derniere entreprise', 'error');
      return;
    }
    setConfirmDelete(ent);
  }, [activeId, entreprises.length, showToast]);

  const confirmDeleteAction = useCallback(() => {
    if (!confirmDelete) return;
    const updated = entreprises.filter(e => e.id !== confirmDelete.id);
    persistAndSet(updated);
    setConfirmDelete(null);
    showToast(`"${confirmDelete.nom}" supprimee`);
  }, [confirmDelete, entreprises, persistAndSet, showToast]);

  // -- Form field updater --
  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  // -- Initials for avatar --
  const getInitials = (nom) => {
    if (!nom) return '??';
    return nom.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
  };

  // ==================== RENDER ====================

  // -- Toast overlay --
  const renderToast = () => {
    if (!toast) return null;
    const bg = toast.type === 'error'
      ? 'bg-red-500'
      : toast.type === 'warning'
        ? 'bg-amber-500'
        : 'bg-emerald-500';
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${bg} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-in`}>
        {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
        {toast.message}
      </div>
    );
  };

  // -- Delete confirmation dialog --
  const renderConfirmDialog = () => {
    if (!confirmDelete) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className={`${cardBg} border rounded-2xl p-6 max-w-md w-full shadow-2xl`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>Supprimer l'entreprise</h3>
              <p className={`text-sm ${textMuted}`}>Cette action est irreversible</p>
            </div>
          </div>
          <p className={`text-sm mb-6 ${textMuted}`}>
            Voulez-vous vraiment supprimer <strong className={textPrimary}>"{confirmDelete.nom}"</strong> ?
            Les donnees associees ne seront pas supprimees.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmDelete(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              Annuler
            </button>
            <button
              onClick={confirmDeleteAction}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -- Form view --
  const renderForm = () => {
    const isEditing = !!editingId;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setView('list'); setEditingId(null); }}
            className={`p-2 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}
          >
            <ArrowLeft size={18} className={textMuted} />
          </button>
          <div>
            <h3 className={`font-semibold ${textPrimary}`}>
              {isEditing ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
            </h3>
            <p className={`text-xs ${textMuted}`}>
              {isEditing ? 'Modifiez les informations ci-dessous' : 'Remplissez les informations de la nouvelle entreprise'}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className={`${cardBg} border rounded-2xl p-5 space-y-5`}>
          {/* Nom */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Nom de l'entreprise <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input
                type="text"
                value={form.nom}
                onChange={e => updateField('nom', e.target.value)}
                placeholder="Ex: BTP Solutions SARL"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg} ${errors.nom ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              />
            </div>
            {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
          </div>

          {/* SIRET */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              SIRET
            </label>
            <div className="relative">
              <Hash size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input
                type="text"
                value={formatSiret(form.siret)}
                onChange={e => updateField('siret', cleanSiret(e.target.value))}
                placeholder="XXX XXX XXX XXXXX"
                maxLength={17}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono ${inputBg} ${errors.siret ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              />
            </div>
            {errors.siret && <p className="text-xs text-red-500 mt-1">{errors.siret}</p>}
            <p className={`text-xs mt-1 ${textMuted}`}>14 chiffres, formate automatiquement</p>
          </div>

          {/* Adresse row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Adresse</label>
              <div className="relative">
                <MapPin size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={form.adresse}
                  onChange={e => updateField('adresse', e.target.value)}
                  placeholder="12 rue des Artisans"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Code Postal</label>
              <input
                type="text"
                value={form.codePostal}
                onChange={e => updateField('codePostal', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="75001"
                maxLength={5}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg} ${errors.codePostal ? 'border-red-400 ring-1 ring-red-400' : ''}`}
              />
              {errors.codePostal && <p className="text-xs text-red-500 mt-1">{errors.codePostal}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Ville</label>
              <input
                type="text"
                value={form.ville}
                onChange={e => updateField('ville', e.target.value)}
                placeholder="Paris"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
              />
            </div>
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Téléphone</label>
              <div className="relative">
                <Phone size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={e => updateField('telephone', e.target.value)}
                  placeholder="01 23 45 67 89"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Email</label>
              <div className="relative">
                <Mail size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="contact@entreprise.fr"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg} ${errors.email ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Legal row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>TVA intracommunautaire</label>
              <div className="relative">
                <Globe size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={form.tva_intra}
                  onChange={e => updateField('tva_intra', e.target.value.toUpperCase())}
                  placeholder="FR12345678901"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Code APE / NAF</label>
              <div className="relative">
                <FileText size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={form.code_ape}
                  onChange={e => updateField('code_ape', e.target.value.toUpperCase())}
                  placeholder="4399C"
                  maxLength={6}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>RCS</label>
              <div className="relative">
                <FileText size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={form.rcs}
                  onChange={e => updateField('rcs', e.target.value)}
                  placeholder="Paris B 123 456 789"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Logo (URL)</label>
            <div className="relative">
              <Image size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input
                type="text"
                value={form.logo}
                onChange={e => updateField('logo', e.target.value)}
                placeholder="https://exemple.com/logo.png"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
              />
            </div>
            {form.logo && (
              <div className={`mt-2 w-16 h-16 rounded-lg border overflow-hidden ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-slate-50'}`}>
                <img
                  src={form.logo}
                  alt="Aperçu logo"
                  className="w-full h-full object-contain"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Color picker */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
              <Palette size={14} className="inline mr-1.5 -mt-0.5" />
              Couleur de theme
            </label>
            <div className="flex flex-wrap gap-2">
              {COULEURS_PRESET.map(c => (
                <button
                  key={c}
                  onClick={() => updateField('couleur', c)}
                  className={`w-9 h-9 rounded-xl border-2 transition-all ${form.couleur === c ? 'scale-110 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    backgroundColor: c,
                    borderColor: form.couleur === c ? (isDark ? '#e2e8f0' : '#1e293b') : 'transparent'
                  }}
                  title={c}
                >
                  {form.couleur === c && <Check size={16} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => { setView('list'); setEditingId(null); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2"
            style={{ backgroundColor: couleur }}
          >
            <Save size={16} />
            {isEditing ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    );
  };

  // -- List view --
  const renderList = () => {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className={`font-semibold text-lg ${textPrimary}`}>Mes entreprises</h3>
            <p className={`text-sm ${textMuted}`}>
              {entreprises.length} entreprise{entreprises.length > 1 ? 's' : ''} enregistree{entreprises.length > 1 ? 's' : ''}
              {' '}&middot; Maximum {MAX_ENTREPRISES}
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={entreprises.length >= MAX_ENTREPRISES}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: entreprises.length >= MAX_ENTREPRISES ? '#94a3b8' : couleur }}
          >
            <Plus size={16} />
            Ajouter une entreprise
          </button>
        </div>

        {/* Entreprises cards */}
        {entreprises.length === 0 ? (
          <div className={`${cardBg} border rounded-2xl p-8 text-center`}>
            <Building2 size={40} className={`mx-auto mb-3 ${textMuted}`} />
            <p className={`font-medium ${textPrimary}`}>Aucune entreprise</p>
            <p className={`text-sm ${textMuted} mt-1`}>Ajoutez votre première entreprise pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entreprises.map(ent => {
              const isActive = ent.id === activeId;

              return (
                <div
                  key={ent.id}
                  onClick={() => handleSwitch(ent)}
                  className={`${cardBg} border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md ${isActive ? 'ring-2' : ''}`}
                  style={isActive ? { borderColor: ent.couleur || couleur, ringColor: ent.couleur || couleur, boxShadow: `0 0 0 2px ${ent.couleur || couleur}33` } : {}}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar / Logo */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                      style={{ backgroundColor: ent.couleur || '#64748b' }}
                    >
                      {ent.logo ? (
                        <img src={ent.logo} alt="" className="w-full h-full object-contain rounded-xl" onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = getInitials(ent.nom); }} />
                      ) : (
                        getInitials(ent.nom)
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-semibold truncate ${textPrimary}`}>{ent.nom || 'Sans nom'}</h4>
                        {isActive && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: ent.couleur || couleur }}
                          >
                            <Star size={10} />
                            Active
                          </span>
                        )}
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ent.couleur || '#64748b' }}
                          title={`Couleur: ${ent.couleur}`}
                        />
                      </div>
                      {ent.siret && (
                        <p className={`text-xs font-mono ${textMuted} mt-0.5`}>
                          SIRET: {formatSiret(ent.siret)}
                        </p>
                      )}
                      {(ent.adresse || ent.ville) && (
                        <p className={`text-xs ${textMuted} mt-0.5 truncate`}>
                          {[ent.adresse, ent.codePostal, ent.ville].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleEdit(ent); }}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                        title="Modifier"
                      >
                        <Edit3 size={15} className={textMuted} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(ent); }}
                        disabled={isActive || entreprises.length <= 1}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}
                        title={isActive ? 'Impossible de supprimer l\'entreprise active' : entreprises.length <= 1 ? 'Au moins une entreprise requise' : 'Supprimer'}
                      >
                        <Trash2 size={15} className={isActive || entreprises.length <= 1 ? textMuted : 'text-red-500'} />
                      </button>
                      {!isActive && (
                        <ChevronRight size={16} className={textMuted} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info box */}
        <div className={`rounded-xl p-3 border text-xs ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
          <p>
            <strong>Astuce :</strong> Cliquez sur une entreprise pour la rendre active. L'entreprise active est utilisee pour generer vos devis, factures et documents.
          </p>
        </div>
      </div>
    );
  };

  // -- Main render --
  return (
    <div className="relative">
      {view === 'form' ? renderForm() : renderList()}
      {renderToast()}
      {renderConfirmDialog()}

      {/* Fade-in animation */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
