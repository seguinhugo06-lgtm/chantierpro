import { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown, ChevronUp, Building2, MapPin, User, Calendar, Euro, FileText, Zap, Clock, Package } from 'lucide-react';
import { validateForm, hasErrors, chantierSchema } from '../lib/validation';
import FormError from './ui/FormError';

/**
 * QuickChantierModal - Quick add/edit chantier with minimal fields
 * Pattern: 2 required fields (nom + client) with expandable details
 */
export default function QuickChantierModal({
  isOpen,
  onClose,
  onSubmit,
  clients = [],
  devis = [],
  isDark = false,
  couleur = '#f97316',
  editChantier = null // Pass a chantier object to edit instead of create
}) {
  const isEditMode = !!editChantier;

  const [form, setForm] = useState({
    nom: '',
    client_id: '',
    adresse: '',
    ville: '',
    codePostal: '',
    date_debut: '',
    date_fin: '',
    budget_estime: '',      // Prix de vente prevu (revenue)
    budget_materiaux: '',   // Budget couts materiaux
    heures_estimees: '',    // Heures de travail prevues
    notes: '',
    description: ''
  });
  const [showDetails, setShowDetails] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [errors, setErrors] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Auto-focus on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset form on close OR populate with editChantier data
  useEffect(() => {
    if (!isOpen) {
      setForm({ nom: '', client_id: '', adresse: '', ville: '', codePostal: '', date_debut: '', date_fin: '', budget_estime: '', budget_materiaux: '', heures_estimees: '', notes: '', description: '' });
      setShowDetails(false);
      setClientSearch('');
      setErrors({});
    } else if (editChantier) {
      // Populate form with existing chantier data for editing
      setForm({
        nom: editChantier.nom || '',
        client_id: editChantier.client_id || editChantier.clientId || '',
        adresse: editChantier.adresse || '',
        ville: editChantier.ville || '',
        codePostal: editChantier.codePostal || '',
        date_debut: editChantier.dateDebut || editChantier.date_debut || '',
        date_fin: editChantier.dateFin || editChantier.date_fin || '',
        budget_estime: (editChantier.budget_estime || editChantier.budgetPrevu) ? (editChantier.budget_estime || editChantier.budgetPrevu).toString() : '',
        budget_materiaux: editChantier.budget_materiaux ? editChantier.budget_materiaux.toString() : '',
        heures_estimees: editChantier.heures_estimees ? editChantier.heures_estimees.toString() : '',
        notes: editChantier.notes || '',
        description: editChantier.description || ''
      });
      setShowDetails(true); // Show all details in edit mode
    }
  }, [isOpen, editChantier]);

  // MRU (Most Recently Used) clients from localStorage
  const MRU_KEY = 'chantierpro_recent_clients';
  const MAX_RECENT = 5;

  const getRecentClientIds = () => {
    try {
      return JSON.parse(localStorage.getItem(MRU_KEY) || '[]');
    } catch { return []; }
  };

  const addToRecentClients = (clientId) => {
    try {
      const recent = getRecentClientIds().filter(id => id !== clientId);
      recent.unshift(clientId);
      localStorage.setItem(MRU_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
    } catch { /* ignore */ }
  };

  // Get recent clients
  const recentClientIds = getRecentClientIds();
  const recentClients = recentClientIds
    .map(id => clients.find(c => c.id === id))
    .filter(Boolean);

  // Filter clients based on search
  const filteredClients = clients.filter(c =>
    c.nom?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.prenom?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.entreprise?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Get selected client
  const selectedClient = clients.find(c => c.id === form.client_id);

  // Get devis for selected client (for budget suggestion)
  const clientDevis = devis.filter(d => d.client_id === form.client_id && d.statut === 'accepte');

  const handleSubmit = (e) => {
    e?.preventDefault();

    // Trim all string fields
    const trimmedForm = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    setForm(trimmedForm);

    // Validate using shared schema
    const newErrors = validateForm(trimmedForm, chantierSchema);

    // If errors, show them and focus first error field
    if (hasErrors(newErrors)) {
      setErrors(newErrors);
      if (newErrors.nom) {
        inputRef.current?.focus();
      }
      return;
    }

    setErrors({});
    const formData = {
      ...trimmedForm,
      budget_estime: trimmedForm.budget_estime ? parseFloat(trimmedForm.budget_estime) : 0,
      budget_materiaux: trimmedForm.budget_materiaux ? parseFloat(trimmedForm.budget_materiaux) : 0,
      heures_estimees: trimmedForm.heures_estimees ? parseFloat(trimmedForm.heures_estimees) : 0
    };

    // Include ID if editing
    if (isEditMode && editChantier?.id) {
      formData.id = editChantier.id;
    }

    onSubmit(formData);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && form.nom.trim()) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const selectClient = (client) => {
    setForm(prev => {
      const update = {
        ...prev,
        client_id: client.id,
        adresse: client.adresse || prev.adresse
      };
      // Auto-parse code postal + ville from client address
      if (client.adresse && !prev.codePostal && !prev.ville) {
        const cpMatch = client.adresse.match(/(\d{5})\s+(.+)$/);
        if (cpMatch) {
          update.codePostal = cpMatch[1];
          update.ville = cpMatch[2].replace(/,\s*$/, '').trim();
        }
      }
      return update;
    });
    addToRecentClients(client.id);
    setClientSearch('');
    setShowClientDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full sm:max-w-md max-h-[92vh] ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up flex flex-col`}
        onKeyDown={handleKeyDown}
      >
        {/* Header — sticky */}
        <div className={`px-5 pt-5 pb-4 border-b ${borderColor} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${couleur}20` }}
            >
              <Building2 size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>{isEditMode ? 'Modifier le chantier' : 'Nouveau chantier'}</h2>
              <p className={`text-sm ${textMuted}`}>{isEditMode ? 'Modifier les informations' : 'Ajout rapide'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-3 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            aria-label="Fermer"
          >
            <X size={20} className={textMuted} />
          </button>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Nom du chantier - Required */}
          <div>
            <label htmlFor="chantier-nom" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Nom du chantier <span className="text-red-500">*</span>
            </label>
            <input
              id="chantier-nom"
              ref={inputRef}
              type="text"
              value={form.nom}
              onChange={e => {
                setForm(p => ({ ...p, nom: e.target.value }));
                if (errors.nom) setErrors(p => ({ ...p, nom: null }));
              }}
              placeholder="Ex: Rénovation cuisine, Extension garage..."
              aria-required="true"
              aria-invalid={!!errors.nom}
              aria-describedby={errors.nom ? 'chantier-nom-error' : undefined}
              className={`w-full px-4 py-3 border rounded-xl text-sm ${inputBg} focus:ring-2 focus:ring-offset-0 ${errors.nom ? 'border-red-500 ring-red-500/20 ring-2' : ''}`}
              style={{ '--tw-ring-color': errors.nom ? '#ef4444' : `${couleur}40` }}
            />
            <FormError id="chantier-nom-error" message={errors.nom} />
          </div>

          {/* Client Selection */}
          <div ref={dropdownRef} className="relative">
            <label htmlFor="chantier-client" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Client
            </label>
            <button
              id="chantier-client"
              type="button"
              onClick={() => setShowClientDropdown(!showClientDropdown)}
              className={`w-full px-4 py-3 border rounded-xl text-sm text-left flex items-center justify-between ${inputBg}`}
            >
              {selectedClient ? (
                <span className="flex items-center gap-2">
                  <User size={16} className={textMuted} />
                  <span>{selectedClient.nom} {selectedClient.prenom}</span>
                  {selectedClient.entreprise && (
                    <span className={textMuted}>({selectedClient.entreprise})</span>
                  )}
                </span>
              ) : (
                <span className={textMuted}>Sélectionner un client (optionnel)</span>
              )}
              <ChevronDown size={16} className={textMuted} />
            </button>

            {/* Client Dropdown */}
            {showClientDropdown && (
              <div className={`absolute z-10 w-full mt-1 ${cardBg} border ${borderColor} rounded-xl shadow-lg max-h-60 overflow-y-auto`}>
                <div className="p-2">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Rechercher un client..."
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {/* Recent clients section */}
                  {!clientSearch && recentClients.length > 0 && (
                    <>
                      <p className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wide ${textMuted}`}>Récents</p>
                      {recentClients.map(c => (
                        <button
                          key={`recent-${c.id}`}
                          type="button"
                          onClick={() => selectClient(c)}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                            form.client_id === c.id
                              ? isDark ? 'bg-slate-700' : 'bg-slate-100'
                              : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: couleur }}>
                            {c.nom?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className={textPrimary}>{c.nom} {c.prenom}</p>
                            {c.entreprise && <p className={`text-xs ${textMuted}`}>{c.entreprise}</p>}
                          </div>
                          <Clock size={12} className={`ml-auto ${textMuted}`} />
                        </button>
                      ))}
                      <div className={`my-1 border-t ${borderColor}`} />
                      <p className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wide ${textMuted}`}>Tous</p>
                    </>
                  )}
                  {/* All clients */}
                  {filteredClients.length > 0 ? (
                    filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectClient(c)}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                          form.client_id === c.id
                            ? isDark ? 'bg-slate-700' : 'bg-slate-100'
                            : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: couleur }}>
                          {c.nom?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className={textPrimary}>{c.nom} {c.prenom}</p>
                          {c.entreprise && <p className={`text-xs ${textMuted}`}>{c.entreprise}</p>}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className={`px-4 py-3 text-sm ${textMuted}`}>Aucun client trouvé</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Budget - Always visible */}
          <div className={`p-4 rounded-xl border-2 ${isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-emerald-50/50 border-emerald-200'}`}>
            <label htmlFor="chantier-budget" className={`block text-sm font-bold mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              <Euro size={16} className="inline mr-1.5" />
              Budget du chantier (€ HT)
            </label>
            <div className="relative">
              <input
                id="chantier-budget"
                type="number"
                value={form.budget_estime}
                onChange={e => setForm(p => ({ ...p, budget_estime: e.target.value }))}
                placeholder="15000"
                className={`w-full px-4 py-3 border-2 rounded-xl text-lg font-semibold ${inputBg} focus:ring-2`}
                style={{ borderColor: form.budget_estime && form.budget_estime !== '0' ? couleur : undefined }}
              />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium ${textMuted}`}>€</span>
            </div>

            {/* Quick fill from devis */}
            {clientDevis.length > 0 && (
              <div className="mt-3">
                <p className={`text-xs font-medium mb-2 ${textMuted}`}>
                  <FileText size={12} className="inline mr-1" />
                  Remplir depuis un devis accepté
                </p>
                <div className="flex flex-wrap gap-2">
                  {clientDevis.slice(0, 3).map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, budget_estime: d.total_ht?.toString() || '' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.budget_estime === d.total_ht?.toString()
                          ? 'text-white shadow-md'
                          : isDark ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                      style={form.budget_estime === d.total_ht?.toString() ? { backgroundColor: couleur } : {}}
                    >
                      {d.total_ht?.toLocaleString('fr-FR')} €
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!form.budget_estime && (
              <p className={`text-xs mt-2 ${textMuted}`}>
                Montant que vous allez facturer au client
              </p>
            )}
          </div>

          {/* Expandable Details */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className={`w-full py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${textMuted} hover:${textPrimary}`}
          >
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showDetails ? 'Moins de détails' : 'Plus de détails'}
          </button>

          {/* Additional Fields */}
          {showDetails && (
            <div className="space-y-4 pt-2 animate-fade-in">
              {/* Description */}
              <div>
                <label htmlFor="chantier-description" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                  Description
                </label>
                <textarea
                  id="chantier-description"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description du chantier..."
                  rows={2}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg} resize-none`}
                />
              </div>

              {/* Address */}
              <div>
                <label htmlFor="chantier-adresse" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                  <MapPin size={14} className="inline mr-1" />
                  Adresse du chantier
                </label>
                <input
                  id="chantier-adresse"
                  type="text"
                  value={form.adresse}
                  onChange={e => {
                    const addr = e.target.value;
                    setForm(p => {
                      const update = { ...p, adresse: addr };
                      // Auto-parse code postal + ville from address
                      const cpMatch = addr.match(/(\d{5})\s+(.+)$/);
                      if (cpMatch && !p.codePostal && !p.ville) {
                        update.codePostal = cpMatch[1];
                        update.ville = cpMatch[2].replace(/,\s*$/, '').trim();
                      }
                      return update;
                    });
                  }}
                  placeholder="12 rue des Lilas, 75011 Paris"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                />
              </div>

              {/* Ville et Code Postal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="chantier-codepostal" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    Code postal
                  </label>
                  <input
                    id="chantier-codepostal"
                    type="text"
                    value={form.codePostal}
                    onChange={e => setForm(p => ({ ...p, codePostal: e.target.value }))}
                    placeholder="75011"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                  />
                </div>
                <div>
                  <label htmlFor="chantier-ville" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    Ville
                  </label>
                  <input
                    id="chantier-ville"
                    type="text"
                    value={form.ville}
                    onChange={e => setForm(p => ({ ...p, ville: e.target.value }))}
                    placeholder="Paris"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="chantier-date-debut" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    <Calendar size={14} className="inline mr-1" />
                    Début
                  </label>
                  <input
                    id="chantier-date-debut"
                    type="date"
                    value={form.date_debut}
                    onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`}
                  />
                </div>
                <div>
                  <label htmlFor="chantier-date-fin" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    Fin prévue
                  </label>
                  <input
                    id="chantier-date-fin"
                    type="date"
                    value={form.date_fin}
                    onChange={e => setForm(p => ({ ...p, date_fin: e.target.value }))}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`}
                  />
                </div>
              </div>

              {/* Budget Coûts */}
              <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'}`}>
                <p className={`text-xs font-medium mb-3 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  Objectif de coûts (optionnel)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="chantier-budget-materiaux" className={`block text-xs mb-1 ${textMuted}`}>
                      <Package size={12} className="inline mr-1" />
                      Matériaux
                    </label>
                    <div className="relative">
                      <input
                        id="chantier-budget-materiaux"
                        type="number"
                        value={form.budget_materiaux}
                        onChange={e => setForm(p => ({ ...p, budget_materiaux: e.target.value }))}
                        placeholder="5000"
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>€</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="chantier-heures" className={`block text-xs mb-1 ${textMuted}`}>
                      <Clock size={12} className="inline mr-1" />
                      Heures prevues
                    </label>
                    <div className="relative">
                      <input
                        id="chantier-heures"
                        type="number"
                        value={form.heures_estimees}
                        onChange={e => setForm(p => ({ ...p, heures_estimees: e.target.value }))}
                        placeholder="40"
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="chantier-notes" className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                  Notes
                </label>
                <textarea
                  id="chantier-notes"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Détails importants, contraintes d'accès, matériaux spécifiques..."
                  rows={2}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg} resize-none`}
                />
              </div>
            </div>
          )}

        </form>

        {/* Footer — sticky at bottom */}
        <div className={`px-5 py-4 border-t ${borderColor} flex-shrink-0 space-y-2`}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!form.nom.trim()}
            className="w-full py-3.5 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: couleur }}
          >
            {isEditMode ? <Check size={18} /> : <Zap size={18} />}
            {isEditMode ? 'Enregistrer les modifications' : 'Créer le chantier'}
          </button>
          <p className={`text-center text-xs ${textMuted}`}>
            Appuyez sur <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>Entrée</kbd> pour {isEditMode ? 'enregistrer' : 'créer rapidement'}
          </p>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
