import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, AlertTriangle, TrendingDown, TrendingUp, ArrowLeft, X, Edit2, Trash2, BarChart3, History, MapPin, ShoppingCart, RefreshCw, Filter, CheckCircle, Building2, Calendar } from 'lucide-react';
import { useConfirm } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';

const CATEGORIES = [
  { id: 'plomberie', label: 'Plomberie', color: '#3b82f6' },
  { id: 'electricite', label: 'Electricite', color: '#f59e0b' },
  { id: 'maconnerie', label: 'Maconnerie', color: '#6b7280' },
  { id: 'peinture', label: 'Peinture', color: '#8b5cf6' },
  { id: 'menuiserie', label: 'Menuiserie', color: '#84cc16' },
  { id: 'outillage', label: 'Outillage', color: '#ef4444' },
  { id: 'quincaillerie', label: 'Quincaillerie', color: '#14b8a6' },
  { id: 'isolation', label: 'Isolation', color: '#ec4899' },
  { id: 'autre', label: 'Autre', color: '#6366f1' }
];

const UNITES = ['piece', 'metre', 'm2', 'm3', 'kg', 'litre', 'rouleau', 'sac', 'boite', 'lot'];

/**
 * Composant de gestion des stocks ameliore
 * Avec historique des mouvements et integration chantiers
 */
export default function Stocks({
  stocks = [],
  setStocks,
  chantiers = [],
  mouvements = [],
  setMouvements,
  isDark = false,
  couleur = '#f97316'
}) {
  const { confirm } = useConfirm();

  const [view, setView] = useState('list'); // list, add, edit, detail
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showMovement, setShowMovement] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    reference: '',
    categorie: 'autre',
    quantite: 0,
    unite: 'piece',
    seuil: 5,
    prix: 0,
    emplacement: '',
    fournisseur: '',
    notes: ''
  });
  const [movementForm, setMovementForm] = useState({
    type: 'sortie', // entree, sortie
    quantite: 1,
    chantierId: '',
    motif: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  // Stats
  const stats = useMemo(() => {
    const lowStock = stocks.filter(s => s.quantite <= (s.seuil || 5));
    const outOfStock = stocks.filter(s => s.quantite === 0);
    const totalValue = stocks.reduce((sum, s) => sum + (s.quantite || 0) * (s.prix || 0), 0);
    const totalItems = stocks.reduce((sum, s) => sum + (s.quantite || 0), 0);

    // Recent movements
    const recentMovements = (mouvements || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    return { lowStock, outOfStock, totalValue, totalItems, recentMovements };
  }, [stocks, mouvements]);

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    let result = [...stocks];

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(s =>
        s.nom?.toLowerCase().includes(searchLower) ||
        s.reference?.toLowerCase().includes(searchLower) ||
        s.fournisseur?.toLowerCase().includes(searchLower)
      );
    }

    if (filterCategory !== 'all') {
      result = result.filter(s => s.categorie === filterCategory);
    }

    if (filterLowStock) {
      result = result.filter(s => s.quantite <= (s.seuil || 5));
    }

    return result.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [stocks, debouncedSearch, filterCategory, filterLowStock]);

  // Get category info
  const getCategory = (catId) => CATEGORIES.find(c => c.id === catId) || CATEGORIES.find(c => c.id === 'autre');

  // Handle stock submission
  const handleSubmit = () => {
    if (!form.nom) return;

    const stockData = {
      ...form,
      quantite: parseFloat(form.quantite) || 0,
      seuil: parseInt(form.seuil) || 5,
      prix: parseFloat(form.prix) || 0
    };

    if (view === 'edit' && selectedStock) {
      setStocks(stocks.map(s => s.id === selectedStock.id ? { ...s, ...stockData } : s));
    } else {
      setStocks([...stocks, { id: generateId(), ...stockData, createdAt: new Date().toISOString() }]);
    }

    setView('list');
    resetForm();
  };

  // Handle movement
  const handleMovement = () => {
    if (!selectedStock || !movementForm.quantite) return;

    const qty = parseInt(movementForm.quantite) || 0;
    const newQty = movementForm.type === 'entree'
      ? selectedStock.quantite + qty
      : Math.max(0, selectedStock.quantite - qty);

    // Update stock
    setStocks(stocks.map(s => s.id === selectedStock.id ? { ...s, quantite: newQty } : s));

    // Add movement record
    if (setMouvements) {
      const movement = {
        id: generateId(),
        stockId: selectedStock.id,
        stockNom: selectedStock.nom,
        type: movementForm.type,
        quantite: qty,
        quantiteApres: newQty,
        chantierId: movementForm.chantierId || null,
        motif: movementForm.motif,
        date: movementForm.date,
        createdAt: new Date().toISOString()
      };
      setMouvements([...(mouvements || []), movement]);
    }

    setShowMovement(false);
    setSelectedStock({ ...selectedStock, quantite: newQty });
    setMovementForm({ type: 'sortie', quantite: 1, chantierId: '', motif: '', date: new Date().toISOString().split('T')[0] });
  };

  // Quick quantity update
  const quickUpdate = (stockId, delta) => {
    setStocks(stocks.map(s => s.id === stockId ? { ...s, quantite: Math.max(0, (s.quantite || 0) + delta) } : s));
  };

  // Delete stock
  const handleDelete = async (stockId) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer ce matériau du stock ?' });
    if (confirmed) {
      setStocks(stocks.filter(s => s.id !== stockId));
      if (selectedStock?.id === stockId) {
        setSelectedStock(null);
        setView('list');
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setForm({ nom: '', reference: '', categorie: 'autre', quantite: 0, unite: 'piece', seuil: 5, prix: 0, emplacement: '', fournisseur: '', notes: '' });
    setSelectedStock(null);
  };

  // Open edit
  const openEdit = (stock) => {
    setSelectedStock(stock);
    setForm({ ...stock });
    setView('edit');
  };

  // Open detail
  const openDetail = (stock) => {
    setSelectedStock(stock);
    setView('detail');
  };

  // Stock movements for current item
  const stockMovements = useMemo(() => {
    if (!selectedStock || !mouvements) return [];
    return mouvements
      .filter(m => m.stockId === selectedStock.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedStock, mouvements]);

  // Form view
  if (view === 'add' || view === 'edit') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('list'); resetForm(); }} className={`p-2 rounded-xl ${hoverBg}`}>
            <ArrowLeft size={20} className={textPrimary} />
          </button>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>
            {view === 'edit' ? 'Modifier le materiau' : 'Nouveau materiau'}
          </h1>
        </div>

        {/* Form */}
        <div className={`${cardBg} rounded-2xl border p-6`}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label>
              <input
                type="text"
                value={form.nom}
                onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                placeholder="Ex: Tube PER 16mm"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Reference</label>
              <input
                type="text"
                value={form.reference}
                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                placeholder="REF-001"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Categorie</label>
              <select
                value={form.categorie}
                onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Quantite</label>
              <input
                type="number"
                value={form.quantite}
                onChange={e => setForm(p => ({ ...p, quantite: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                min="0"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Unite</label>
              <select
                value={form.unite}
                onChange={e => setForm(p => ({ ...p, unite: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
              >
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Seuil d'alerte</label>
              <input
                type="number"
                value={form.seuil}
                onChange={e => setForm(p => ({ ...p, seuil: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                min="0"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prix unitaire (EUR)</label>
              <input
                type="number"
                step="0.01"
                value={form.prix}
                onChange={e => setForm(p => ({ ...p, prix: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                min="0"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Fournisseur</label>
              <input
                type="text"
                value={form.fournisseur}
                onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                placeholder="Point P, Cedeo..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Emplacement</label>
              <input
                type="text"
                value={form.emplacement}
                onChange={e => setForm(p => ({ ...p, emplacement: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                placeholder="Etagere A3, Camion..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                rows={2}
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>

          <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <button onClick={() => { setView('list'); resetForm(); }} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              Annuler
            </button>
            <button onClick={handleSubmit} className="px-6 py-2 text-white rounded-xl font-medium" style={{ background: couleur }}>
              {view === 'edit' ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Detail view
  if (view === 'detail' && selectedStock) {
    const cat = getCategory(selectedStock.categorie);
    const isLow = selectedStock.quantite <= (selectedStock.seuil || 5);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { setView('list'); setSelectedStock(null); }} className={`p-2 rounded-xl ${hoverBg}`}>
              <ArrowLeft size={20} className={textPrimary} />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${textPrimary}`}>{selectedStock.nom}</h1>
              {selectedStock.reference && <p className={textMuted}>Ref: {selectedStock.reference}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openEdit(selectedStock)} className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <Edit2 size={18} className={textSecondary} />
            </button>
            <button onClick={() => handleDelete(selectedStock.id)} className={`p-2 rounded-xl ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <Trash2 size={18} className="text-red-500" />
            </button>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className={`${cardBg} rounded-xl border p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={textMuted}>Quantite</span>
              {isLow && <AlertTriangle size={16} className="text-amber-500" />}
            </div>
            <p className={`text-2xl font-bold ${isLow ? 'text-amber-500' : textPrimary}`}>
              {selectedStock.quantite} <span className={`text-sm font-normal ${textMuted}`}>{selectedStock.unite}</span>
            </p>
            <p className={`text-xs ${textMuted}`}>Seuil: {selectedStock.seuil || 5}</p>
          </div>

          <div className={`${cardBg} rounded-xl border p-4`}>
            <p className={`text-sm ${textMuted} mb-2`}>Prix unitaire</p>
            <p className={`text-2xl font-bold ${textPrimary}`}>{(selectedStock.prix || 0).toFixed(2)} EUR</p>
          </div>

          <div className={`${cardBg} rounded-xl border p-4`}>
            <p className={`text-sm ${textMuted} mb-2`}>Valeur en stock</p>
            <p className={`text-2xl font-bold`} style={{ color: couleur }}>
              {((selectedStock.quantite || 0) * (selectedStock.prix || 0)).toFixed(2)} EUR
            </p>
          </div>
        </div>

        {/* Details */}
        <div className={`${cardBg} rounded-xl border p-5`}>
          <h3 className={`font-semibold mb-4 ${textPrimary}`}>Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className={`text-sm ${textMuted}`}>Categorie</span>
              <p className={`font-medium ${textPrimary}`}>
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: cat.color }} />
                {cat.label}
              </p>
            </div>
            {selectedStock.fournisseur && (
              <div>
                <span className={`text-sm ${textMuted}`}>Fournisseur</span>
                <p className={`font-medium ${textPrimary}`}>{selectedStock.fournisseur}</p>
              </div>
            )}
            {selectedStock.emplacement && (
              <div>
                <span className={`text-sm ${textMuted}`}>Emplacement</span>
                <p className={`font-medium ${textPrimary}`}>
                  <MapPin size={14} className="inline mr-1" />{selectedStock.emplacement}
                </p>
              </div>
            )}
            {selectedStock.notes && (
              <div className="sm:col-span-2">
                <span className={`text-sm ${textMuted}`}>Notes</span>
                <p className={textSecondary}>{selectedStock.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className={`${cardBg} rounded-xl border p-5`}>
          <h3 className={`font-semibold mb-4 ${textPrimary}`}>Mouvement de stock</h3>
          <div className="flex gap-3">
            <button
              onClick={() => { setMovementForm(p => ({ ...p, type: 'sortie' })); setShowMovement(true); }}
              className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}
            >
              <TrendingDown size={18} />
              Sortie
            </button>
            <button
              onClick={() => { setMovementForm(p => ({ ...p, type: 'entree' })); setShowMovement(true); }}
              className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}
            >
              <TrendingUp size={18} />
              Entree
            </button>
          </div>
        </div>

        {/* Movement history */}
        {stockMovements.length > 0 && (
          <div className={`${cardBg} rounded-xl border overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <h3 className={`font-semibold flex items-center gap-2 ${textPrimary}`}>
                <History size={18} />
                Historique des mouvements
              </h3>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {stockMovements.map(m => {
                const chantier = chantiers.find(c => c.id === m.chantierId);
                return (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${m.type === 'entree' ? (isDark ? 'bg-emerald-900/30' : 'bg-emerald-100') : (isDark ? 'bg-red-900/30' : 'bg-red-100')}`}>
                        {m.type === 'entree' ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-red-500" />}
                      </div>
                      <div>
                        <p className={`font-medium ${textPrimary}`}>
                          {m.type === 'entree' ? '+' : '-'}{m.quantite} {selectedStock.unite}
                        </p>
                        <p className={`text-xs ${textMuted}`}>
                          {chantier ? chantier.nom : m.motif || 'Sans motif'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={textSecondary}>{new Date(m.date).toLocaleDateString('fr-FR')}</p>
                      <p className={`text-xs ${textMuted}`}>Stock: {m.quantiteApres}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Movement modal */}
        {showMovement && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-md p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-bold ${textPrimary}`}>
                  {movementForm.type === 'entree' ? 'Entree de stock' : 'Sortie de stock'}
                </h2>
                <button onClick={() => setShowMovement(false)} className={`p-2 rounded-lg ${hoverBg}`}>
                  <X size={20} className={textSecondary} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Quantite</label>
                  <input
                    type="number"
                    value={movementForm.quantite}
                    onChange={e => setMovementForm(p => ({ ...p, quantite: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                    min="1"
                  />
                </div>

                {movementForm.type === 'sortie' && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Chantier (optionnel)</label>
                    <select
                      value={movementForm.chantierId}
                      onChange={e => setMovementForm(p => ({ ...p, chantierId: e.target.value }))}
                      className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                    >
                      <option value="">Aucun</option>
                      {chantiers.filter(c => c.statut === 'en_cours').map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Motif</label>
                  <input
                    type="text"
                    value={movementForm.motif}
                    onChange={e => setMovementForm(p => ({ ...p, motif: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                    placeholder="Raison du mouvement..."
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date</label>
                  <input
                    type="date"
                    value={movementForm.date}
                    onChange={e => setMovementForm(p => ({ ...p, date: e.target.value }))}
                    className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowMovement(false)} className={`flex-1 py-2.5 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  Annuler
                </button>
                <button
                  onClick={handleMovement}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-white ${movementForm.type === 'entree' ? 'bg-emerald-500' : 'bg-red-500'}`}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>
          Stocks <span className={textMuted}>({stocks.length})</span>
        </h1>
        <button onClick={() => setView('add')} className="px-4 py-2 text-white rounded-xl font-medium flex items-center gap-2" style={{ background: couleur }}>
          <Plus size={18} />
          Nouveau
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardBg} rounded-xl border p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ background: `${couleur}20` }}>
              <Package size={18} style={{ color: couleur }} />
            </div>
            <span className={textMuted}>References</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{stocks.length}</p>
        </div>

        <div className={`${cardBg} rounded-xl border p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <BarChart3 size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className={textMuted}>Valeur totale</span>
          </div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{stats.totalValue.toLocaleString('fr-FR')} EUR</p>
        </div>

        <div className={`${cardBg} rounded-xl border p-4 ${stats.lowStock.length > 0 ? (isDark ? 'border-amber-800' : 'border-amber-200') : ''}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className={textMuted}>Stock bas</span>
          </div>
          <p className={`text-2xl font-bold ${stats.lowStock.length > 0 ? 'text-amber-500' : textPrimary}`}>{stats.lowStock.length}</p>
        </div>

        <div className={`${cardBg} rounded-xl border p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <ShoppingCart size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <span className={textMuted}>Rupture</span>
          </div>
          <p className={`text-2xl font-bold ${stats.outOfStock.length > 0 ? 'text-red-500' : textPrimary}`}>{stats.outOfStock.length}</p>
        </div>
      </div>

      {/* Low stock alert */}
      {stats.lowStock.length > 0 && (
        <div className={`${isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4`}>
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-amber-500" />
            <h3 className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              Stocks a reapprovisionner ({stats.lowStock.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.lowStock.slice(0, 6).map(s => (
              <button
                key={s.id}
                onClick={() => openDetail(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-800'}`}
              >
                {s.nom}: {s.quantite} {s.unite}
              </button>
            ))}
            {stats.lowStock.length > 6 && (
              <span className={`px-3 py-1.5 text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                +{stats.lowStock.length - 6} autres
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            placeholder="Rechercher..."
            aria-label="Rechercher"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`}
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className={`px-4 py-2.5 border rounded-xl ${inputBg}`}
        >
          <option value="all">Toutes categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${
            filterLowStock
              ? 'text-white'
              : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}
          style={filterLowStock ? { background: couleur } : {}}
        >
          <Filter size={16} />
          Stock bas
        </button>
      </div>

      {/* Stock list */}
      {filteredStocks.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
          <Package size={48} className={`mx-auto mb-4 ${textMuted}`} />
          <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
            {stocks.length === 0 ? 'Aucun materiau en stock' : 'Aucun resultat'}
          </h3>
          <p className={textMuted}>
            {stocks.length === 0 ? 'Ajoutez votre premier materiau' : 'Modifiez vos filtres de recherche'}
          </p>
        </div>
      ) : (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          {/* Desktop header */}
          <div className={`hidden sm:flex px-5 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
            <span className={`flex-1 text-sm font-medium ${textMuted}`}>Article</span>
            <span className={`w-28 text-sm font-medium ${textMuted}`}>Categorie</span>
            <span className={`w-32 text-sm font-medium text-center ${textMuted}`}>Quantite</span>
            <span className={`w-24 text-sm font-medium text-right ${textMuted}`}>P.U.</span>
            <span className={`w-28 text-sm font-medium text-right ${textMuted}`}>Valeur</span>
            <span className="w-10"></span>
          </div>

          {/* Stock items */}
          <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
            {filteredStocks.map(s => {
              const cat = getCategory(s.categorie);
              const isLow = s.quantite <= (s.seuil || 5);
              const value = (s.quantite || 0) * (s.prix || 0);

              return (
                <div
                  key={s.id}
                  className={`flex flex-col sm:flex-row sm:items-center px-5 py-4 gap-3 ${hoverBg} cursor-pointer ${isLow ? (isDark ? 'bg-amber-900/10' : 'bg-amber-50/50') : ''}`}
                  onClick={() => openDetail(s)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium truncate ${textPrimary}`}>{s.nom}</p>
                      {isLow && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />}
                    </div>
                    {s.reference && <p className={`text-xs ${textMuted}`}>Ref: {s.reference}</p>}
                  </div>

                  <div className="w-28 hidden sm:flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className={`text-sm truncate ${textSecondary}`}>{cat.label}</span>
                  </div>

                  <div className="flex items-center gap-2 sm:w-32 sm:justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); quickUpdate(s.id, -1); }}
                      className={`w-8 h-8 rounded-lg font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} ${textPrimary}`}
                    >
                      -
                    </button>
                    <span className={`w-16 text-center font-semibold ${isLow ? 'text-amber-500' : textPrimary}`}>
                      {s.quantite} <span className={`text-xs font-normal ${textMuted}`}>{s.unite}</span>
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); quickUpdate(s.id, 1); }}
                      className={`w-8 h-8 rounded-lg font-bold ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} ${textPrimary}`}
                    >
                      +
                    </button>
                  </div>

                  <span className={`w-24 text-right hidden sm:block ${textSecondary}`}>
                    {(s.prix || 0).toFixed(2)} EUR
                  </span>

                  <span className={`w-28 text-right font-semibold hidden sm:block`} style={{ color: couleur }}>
                    {value.toFixed(2)} EUR
                  </span>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className={`w-10 hidden sm:flex items-center justify-center p-2 rounded-lg ${hoverBg}`}
                  >
                    <Trash2 size={16} className={textMuted} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className={`px-5 py-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} flex justify-between items-center`}>
            <span className={`font-semibold ${textPrimary}`}>Valeur totale du stock</span>
            <span className="text-xl font-bold" style={{ color: couleur }}>
              {filteredStocks.reduce((sum, s) => sum + (s.quantite || 0) * (s.prix || 0), 0).toLocaleString('fr-FR')} EUR
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
