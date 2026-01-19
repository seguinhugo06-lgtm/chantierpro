import { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown, ChevronUp, Building2, MapPin, User, Calendar, Euro, FileText, Zap } from 'lucide-react';

/**
 * QuickChantierModal - Quick add chantier with minimal fields
 * Pattern: 2 required fields (nom + client) with expandable details
 */
export default function QuickChantierModal({
  isOpen,
  onClose,
  onSubmit,
  clients = [],
  devis = [],
  isDark = false,
  couleur = '#f97316'
}) {
  const [form, setForm] = useState({
    nom: '',
    client_id: '',
    adresse: '',
    date_debut: '',
    date_fin: '',
    budget_estime: '',
    notes: ''
  });
  const [showDetails, setShowDetails] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
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

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setForm({ nom: '', client_id: '', adresse: '', date_debut: '', date_fin: '', budget_estime: '', notes: '' });
      setShowDetails(false);
      setClientSearch('');
    }
  }, [isOpen]);

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
    if (!form.nom.trim()) return;

    onSubmit({
      ...form,
      budget_estime: form.budget_estime ? parseFloat(form.budget_estime) : 0
    });
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
    setForm(prev => ({
      ...prev,
      client_id: client.id,
      adresse: client.adresse || prev.adresse
    }));
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
        className={`relative w-full sm:max-w-md ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up`}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${couleur}20` }}
            >
              <Building2 size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>Nouveau chantier</h2>
              <p className={`text-sm ${textMuted}`}>Ajout rapide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            aria-label="Fermer"
          >
            <X size={20} className={textMuted} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nom du chantier - Required */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Nom du chantier <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={form.nom}
              onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
              placeholder="Ex: Rénovation cuisine, Extension garage..."
              className={`w-full px-4 py-3 border rounded-xl text-sm ${inputBg} focus:ring-2 focus:ring-offset-0`}
              style={{ '--tw-ring-color': `${couleur}40` }}
              required
            />
          </div>

          {/* Client Selection */}
          <div ref={dropdownRef} className="relative">
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Client
            </label>
            <button
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
                <div className="max-h-40 overflow-y-auto">
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

          {/* Budget quick fill from devis */}
          {clientDevis.length > 0 && (
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-xs font-medium mb-2 ${textMuted}`}>
                <FileText size={12} className="inline mr-1" />
                Devis acceptés pour ce client
              </p>
              <div className="flex flex-wrap gap-2">
                {clientDevis.slice(0, 3).map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, budget_estime: d.total_ht?.toString() || '' }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.budget_estime === d.total_ht?.toString()
                        ? 'text-white'
                        : isDark ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                    style={form.budget_estime === d.total_ht?.toString() ? { backgroundColor: couleur } : {}}
                  >
                    {d.total_ht?.toLocaleString()} €
                  </button>
                ))}
              </div>
            </div>
          )}

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
              {/* Address */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                  <MapPin size={14} className="inline mr-1" />
                  Adresse du chantier
                </label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))}
                  placeholder="12 rue des Lilas, 75011 Paris"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    <Calendar size={14} className="inline mr-1" />
                    Début
                  </label>
                  <input
                    type="date"
                    value={form.date_debut}
                    onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    Fin prévue
                  </label>
                  <input
                    type="date"
                    value={form.date_fin}
                    onChange={e => setForm(p => ({ ...p, date_fin: e.target.value }))}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`}
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                  <Euro size={14} className="inline mr-1" />
                  Budget estimé (€ HT)
                </label>
                <input
                  type="number"
                  value={form.budget_estime}
                  onChange={e => setForm(p => ({ ...p, budget_estime: e.target.value }))}
                  placeholder="15000"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Détails importants, contraintes d'accès, matériaux spécifiques..."
                  rows={2}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg} resize-none`}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!form.nom.trim()}
            className="w-full py-3.5 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: couleur }}
          >
            <Zap size={18} />
            Créer le chantier
          </button>

          {/* Keyboard hint */}
          <p className={`text-center text-xs ${textMuted}`}>
            Appuyez sur <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>Entrée</kbd> pour créer rapidement
          </p>
        </form>
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
