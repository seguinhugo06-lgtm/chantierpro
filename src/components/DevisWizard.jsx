import { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Plus, User, FileText, Receipt, Search, Star, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import QuickClientModal from './QuickClientModal';
import CatalogBrowser from './CatalogBrowser';
import { generateId } from '../lib/utils';

/**
 * DevisWizard - 3-step wizard for devis/facture creation
 * Step 1: Client selection
 * Step 2: Add items (visual catalog)
 * Step 3: Review & Create
 */
export default function DevisWizard({
  isOpen,
  onClose,
  onSubmit,
  clients = [],
  addClient,
  catalogue = [],
  chantiers = [],
  entreprise = {},
  isDark = false,
  couleur = '#f97316'
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    type: 'devis',
    clientId: '',
    chantierId: '',
    date: new Date().toISOString().split('T')[0],
    validite: entreprise?.validiteDevis || 30,
    tvaDefaut: entreprise?.tvaDefaut || 10,
    lignes: [],
    remise: 0,
    notes: ''
  });
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.nom?.toLowerCase().includes(q) ||
      c.prenom?.toLowerCase().includes(q) ||
      c.entreprise?.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalHT = 0;
    let tvaTotal = 0;

    form.lignes.forEach(l => {
      const montant = (l.quantite || 1) * (l.prixUnitaire || 0);
      const taux = l.tva !== undefined ? l.tva : form.tvaDefaut;
      totalHT += montant;
      tvaTotal += montant * (taux / 100);
    });

    const remiseAmount = totalHT * (form.remise / 100);
    const htApresRemise = totalHT - remiseAmount;
    const tvaApresRemise = tvaTotal * (1 - form.remise / 100);
    const totalTTC = htApresRemise + tvaApresRemise;

    return { totalHT, tvaTotal, remiseAmount, htApresRemise, tvaApresRemise, totalTTC };
  }, [form.lignes, form.tvaDefaut, form.remise]);

  // Handlers
  const selectClient = (clientId) => {
    setForm(p => ({ ...p, clientId }));
    setStep(2);
  };

  const handleAddClient = (clientData) => {
    const newClient = addClient?.(clientData);
    if (newClient?.id) {
      setForm(p => ({ ...p, clientId: newClient.id }));
      setStep(2);
    }
    setShowQuickClient(false);
  };

  const addLigne = (item) => {
    const newLigne = {
      id: generateId(),
      description: item.nom || '',
      quantite: 1,
      unite: item.unite || 'unite',
      prixUnitaire: item.prix || 0,
      prixAchat: item.prixAchat || 0,
      tva: form.tvaDefaut
    };
    setForm(p => ({ ...p, lignes: [...p.lignes, newLigne] }));
  };

  const updateLigne = (id, field, value) => {
    setForm(p => ({
      ...p,
      lignes: p.lignes.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        return updated;
      })
    }));
  };

  const removeLigne = (id) => {
    setForm(p => ({ ...p, lignes: p.lignes.filter(l => l.id !== id) }));
  };

  const handleSubmit = () => {
    if (!form.clientId || form.lignes.length === 0) return;

    // Transform lignes to expected format
    const lignesFormatted = form.lignes.map(l => ({
      ...l,
      montant: (l.quantite || 1) * (l.prixUnitaire || 0)
    }));

    const devisData = {
      type: form.type,
      client_id: form.clientId,
      chantier_id: form.chantierId || undefined,
      date: form.date,
      validite: form.validite,
      statut: 'brouillon',
      tvaRate: form.tvaDefaut,
      lignes: lignesFormatted,
      remise: form.remise,
      notes: form.notes,
      total_ht: totals.htApresRemise,
      tva: totals.tvaApresRemise,
      total_ttc: totals.totalTTC
    };

    onSubmit?.(devisData);
    onClose?.();
  };

  const selectedClient = clients.find(c => c.id === form.clientId);
  const canProceed = step === 1 ? !!form.clientId : step === 2 ? form.lignes.length > 0 : true;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up overflow-hidden`}>

        {/* Header with gradient and progress */}
        <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {form.type === 'facture' ? <Receipt size={20} className="text-white" /> : <FileText size={20} className="text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {step === 1 ? 'Choisir le client' : step === 2 ? 'Ajouter les articles' : 'Finaliser'}
                </h2>
                <p className="text-white/80 text-sm">
                  {form.type === 'facture' ? 'Nouvelle facture' : 'Nouveau devis'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* STEP 1: Client Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2 mb-4">
                {[
                  { value: 'devis', label: 'Devis', icon: FileText },
                  { value: 'facture', label: 'Facture', icon: Receipt }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(p => ({ ...p, type: opt.value }))}
                    className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                      form.type === opt.value
                        ? 'border-current shadow-lg'
                        : isDark ? 'border-slate-700' : 'border-slate-200'
                    }`}
                    style={form.type === opt.value ? { borderColor: couleur, backgroundColor: `${couleur}10` } : {}}
                  >
                    <opt.icon size={18} style={form.type === opt.value ? { color: couleur } : {}} className={form.type !== opt.value ? textMuted : ''} />
                    <span className={`font-medium ${form.type === opt.value ? textPrimary : textMuted}`}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Rechercher un client..."
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl ${inputBg}`}
                />
              </div>

              {/* Quick add button */}
              <button
                onClick={() => setShowQuickClient(true)}
                className={`w-full p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all hover:shadow-lg ${isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-300 hover:border-slate-400'}`}
              >
                <Plus size={18} style={{ color: couleur }} />
                <span className={textSecondary}>Nouveau client</span>
              </button>

              {/* Clients grid */}
              <div className="grid grid-cols-2 gap-2 animate-stagger">
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => selectClient(client.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                      form.clientId === client.id
                        ? 'border-current shadow-lg'
                        : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={form.clientId === client.id ? { borderColor: couleur, backgroundColor: `${couleur}10` } : {}}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: couleur }}
                      >
                        {client.nom?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${textPrimary}`}>{client.nom} {client.prenom}</p>
                        {client.entreprise && <p className={`text-xs truncate ${textMuted}`}>{client.entreprise}</p>}
                      </div>
                    </div>
                    {client.telephone && <p className={`text-xs ${textMuted}`}>{client.telephone}</p>}
                  </button>
                ))}
              </div>

              {filteredClients.length === 0 && (
                <div className={`text-center py-8 ${textMuted}`}>
                  <User size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Aucun client trouvé</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Add Items */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Selected client summary */}
              {selectedClient && (
                <div className={`p-3 rounded-xl flex items-center gap-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: couleur }}>
                    {selectedClient.nom?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${textPrimary}`}>{selectedClient.nom} {selectedClient.prenom}</p>
                    <p className={`text-xs ${textMuted}`}>{selectedClient.telephone}</p>
                  </div>
                  <button onClick={() => setStep(1)} className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                    Changer
                  </button>
                </div>
              )}

              {/* Add from catalog button */}
              <button
                onClick={() => setShowCatalog(true)}
                className="w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all hover:shadow-lg group"
                style={{ borderColor: `${couleur}50` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: `${couleur}20` }}>
                  <Sparkles size={20} style={{ color: couleur }} />
                </div>
                <div className="text-left">
                  <p className={`font-medium ${textPrimary}`}>Ajouter depuis le catalogue</p>
                  <p className={`text-xs ${textMuted}`}>{catalogue.length} articles disponibles</p>
                </div>
              </button>

              {/* Line items as cards */}
              <div className="space-y-3">
                {form.lignes.map((ligne, index) => (
                  <LigneCard
                    key={ligne.id}
                    ligne={ligne}
                    index={index}
                    onUpdate={(field, value) => updateLigne(ligne.id, field, value)}
                    onRemove={() => removeLigne(ligne.id)}
                    isDark={isDark}
                    couleur={couleur}
                    tvaDefaut={form.tvaDefaut}
                  />
                ))}
              </div>

              {/* Empty state */}
              {form.lignes.length === 0 && (
                <div className={`text-center py-8 ${textMuted}`}>
                  <FileText size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Aucun article ajouté</p>
                  <p className="text-sm">Cliquez sur le bouton ci-dessus</p>
                </div>
              )}

              {/* Running total */}
              {form.lignes.length > 0 && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className={textSecondary}>Total HT</span>
                    <span className={`text-xl font-bold ${textPrimary}`}>{totals.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR</span>
                  </div>
                </div>
              )}

              {/* Manual add button */}
              <button
                onClick={() => addLigne({ nom: 'Nouvelle prestation', prix: 0, unite: 'forfait' })}
                className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <Plus size={16} style={{ color: couleur }} />
                <span className={textSecondary}>Ajouter manuellement</span>
              </button>
            </div>
          )}

          {/* STEP 3: Review & Create */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Client summary */}
              {selectedClient && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <p className={`text-sm ${textMuted} mb-1`}>Client</p>
                  <p className={`font-medium ${textPrimary}`}>{selectedClient.nom} {selectedClient.prenom}</p>
                  {selectedClient.adresse && <p className={`text-sm ${textSecondary}`}>{selectedClient.adresse}</p>}
                </div>
              )}

              {/* Items summary */}
              <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className={`text-sm ${textMuted} mb-2`}>{form.lignes.length} article(s)</p>
                <div className="space-y-2">
                  {form.lignes.slice(0, 3).map(ligne => (
                    <div key={ligne.id} className="flex justify-between">
                      <span className={`text-sm truncate ${textSecondary}`}>{ligne.description}</span>
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        {((ligne.quantite || 1) * (ligne.prixUnitaire || 0)).toLocaleString('fr-FR')} EUR
                      </span>
                    </div>
                  ))}
                  {form.lignes.length > 3 && (
                    <p className={`text-xs ${textMuted}`}>+ {form.lignes.length - 3} autres</p>
                  )}
                </div>
              </div>

              {/* TVA quick buttons */}
              <div>
                <p className={`text-sm ${textMuted} mb-2`}>TVA par défaut</p>
                <div className="flex gap-2">
                  {[20, 10, 5.5, 0].map(taux => (
                    <button
                      key={taux}
                      onClick={() => setForm(p => ({ ...p, tvaDefaut: taux }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.tvaDefaut === taux
                          ? 'text-white'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                      style={form.tvaDefaut === taux ? { backgroundColor: couleur } : {}}
                    >
                      {taux}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Remise */}
              <div>
                <p className={`text-sm ${textMuted} mb-2`}>Remise globale</p>
                <div className="flex gap-2">
                  {[0, 5, 10, 15].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setForm(p => ({ ...p, remise: pct }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.remise === pct
                          ? 'text-white'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                      style={form.remise === pct ? { backgroundColor: couleur } : {}}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced options toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
              >
                <span className={textSecondary}>Options avancees</span>
                {showDetails ? <ChevronUp size={18} className={textMuted} /> : <ChevronDown size={18} className={textMuted} />}
              </button>

              {showDetails && (
                <div className="space-y-3 animate-slide-up">
                  <div>
                    <label className={`block text-sm mb-1 ${textMuted}`}>Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                      className={`w-full px-4 py-2 border rounded-xl ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${textMuted}`}>Validite (jours)</label>
                    <input
                      type="number"
                      value={form.validite}
                      onChange={e => setForm(p => ({ ...p, validite: parseInt(e.target.value) || 30 }))}
                      className={`w-full px-4 py-2 border rounded-xl ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${textMuted}`}>Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      rows={2}
                      placeholder="Conditions particulieres..."
                      className={`w-full px-4 py-2 border rounded-xl resize-none ${inputBg}`}
                    />
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={textSecondary}>Total HT</span>
                    <span className={textPrimary}>{totals.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR</span>
                  </div>
                  {form.remise > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Remise {form.remise}%</span>
                      <span>-{totals.remiseAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={textSecondary}>TVA {form.tvaDefaut}%</span>
                    <span className={textPrimary}>{totals.tvaApresRemise.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR</span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t ${isDark ? 'border-emerald-700' : 'border-emerald-200'}`}>
                    <span className={`font-bold ${textPrimary}`}>Total TTC</span>
                    <span className="text-xl font-bold" style={{ color: couleur }}>
                      {totals.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className={`px-5 py-4 border-t flex gap-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className={`px-4 py-3 rounded-xl flex items-center gap-2 min-h-[48px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
            >
              <ArrowLeft size={18} />
              Retour
            </button>
          )}

          <button
            onClick={step === 3 ? handleSubmit : () => setStep(step + 1)}
            disabled={!canProceed}
            className="flex-1 px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 hover:shadow-lg active:scale-[0.98] transition-all"
            style={{ backgroundColor: couleur }}
          >
            {step === 3 ? (
              <>
                <Check size={18} />
                Créer le {form.type}
              </>
            ) : (
              <>
                Continuer
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={showQuickClient}
        onClose={() => setShowQuickClient(false)}
        onSubmit={handleAddClient}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Catalog Browser */}
      <CatalogBrowser
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        catalogue={catalogue}
        onSelectItem={addLigne}
        isDark={isDark}
        couleur={couleur}
      />

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// Ligne card component
function LigneCard({ ligne, index, onUpdate, onRemove, isDark, couleur, tvaDefaut }) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-slate-200';

  const montant = (ligne.quantite || 1) * (ligne.prixUnitaire || 0);

  return (
    <div className={`p-4 rounded-xl border-2 transition-all hover:shadow-lg ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
      {/* Description */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <input
          type="text"
          value={ligne.description}
          onChange={e => onUpdate('description', e.target.value)}
          placeholder="Ex: Pose carrelage, Peinture murale..."
          className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium ${inputBg}`}
        />
        <button
          onClick={onRemove}
          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Qty, Price, Total */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate('quantite', Math.max(1, (ligne.quantite || 1) - 1))}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-600' : 'bg-slate-100'}`}
          >
            -
          </button>
          <input
            type="number"
            value={ligne.quantite || 1}
            onChange={e => onUpdate('quantite', parseFloat(e.target.value) || 1)}
            className={`w-14 px-2 py-1 border rounded-lg text-center text-sm ${inputBg}`}
          />
          <button
            onClick={() => onUpdate('quantite', (ligne.quantite || 1) + 1)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-600' : 'bg-slate-100'}`}
          >
            +
          </button>
        </div>

        <span className={`text-sm ${textMuted}`}>x</span>

        <div className="relative flex-1">
          <input
            type="number"
            value={ligne.prixUnitaire || ''}
            onChange={e => onUpdate('prixUnitaire', parseFloat(e.target.value) || 0)}
            placeholder="Prix HT"
            className={`w-full px-3 py-1 border rounded-lg text-sm text-right ${inputBg}`}
          />
          <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>EUR</span>
        </div>

        <span className="text-lg font-bold min-w-[80px] text-right" style={{ color: couleur }}>
          {montant.toLocaleString('fr-FR')} EUR
        </span>
      </div>

      {/* TVA quick select */}
      <div className="flex gap-1 mt-2">
        {[20, 10, 5.5, 0].map(taux => (
          <button
            key={taux}
            onClick={() => onUpdate('tva', taux)}
            className={`px-2 py-1 rounded text-xs transition-all ${
              (ligne.tva !== undefined ? ligne.tva : tvaDefaut) === taux
                ? 'text-white'
                : isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-500'
            }`}
            style={(ligne.tva !== undefined ? ligne.tva : tvaDefaut) === taux ? { backgroundColor: couleur } : {}}
          >
            {taux}%
          </button>
        ))}
      </div>
    </div>
  );
}
