import React, { useState } from 'react';
import { Plus, Minus, ArrowLeft, Star, Search, Edit3, Trash2, Package, AlertTriangle, Box, ChevronUp, ChevronDown, ArrowUpDown, Sparkles } from 'lucide-react';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import ArticlePicker from './ArticlePicker';

const CATEGORIES = ['Tous', 'Plomberie', 'Électricité', 'Maçonnerie', 'Carrelage', 'Peinture', 'Menuiserie', 'Matériaux', 'Autre'];
const UNITES = [
  { value: 'u', label: 'u (unité)' },
  { value: 'm²', label: 'm² (mètre carré)' },
  { value: 'ml', label: 'ml (mètre linéaire)' },
  { value: 'h', label: 'h (heure)' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'jour', label: 'Jour' },
  { value: 'kg', label: 'kg' },
  { value: 'L', label: 'L (litre)' },
  { value: 'sac', label: 'Sac' },
  { value: 'pot', label: 'Pot' },
  { value: 'rouleau', label: 'Rouleau' },
  { value: 'm³', label: 'm³' },
  { value: 'palette', label: 'Palette' },
];

export default function Catalogue({ catalogue, setCatalogue, couleur, isDark, setPage }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [catFilter, setCatFilter] = useState('Tous');
  const [showStock, setShowStock] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // name, price, stock
  const [form, setForm] = useState({ nom: '', prix: '', prixAchat: '', unite: 'u', categorie: 'Autre', favori: false, stock_actuel: '', stock_seuil_alerte: '' });
  const [showArticlePicker, setShowArticlePicker] = useState(false);

  // Handler for adding article from BTP reference
  const handleAddFromPicker = (item) => {
    const newItem = {
      id: generateId(),
      nom: item.nom,
      prix: item.prixUnitaire,
      prixAchat: item.prixAchat || 0,
      unite: item.unite,
      categorie: item.categorie,
      favori: false,
      stock_actuel: undefined,
      stock_seuil_alerte: undefined,
    };
    setCatalogue([...catalogue, newItem]);
    showToast(`"${item.nom}" ajouté au catalogue`, 'success');
  };

  const filtered = catalogue.filter(c => (catFilter === 'Tous' || c.categorie === catFilter) && (!debouncedSearch || c.nom?.toLowerCase().includes(debouncedSearch.toLowerCase())));

  const getSortedItems = () => {
    const sorted = [...filtered];
    switch (sortBy) {
      case 'price':
        return sorted.sort((a, b) => (b.prix || 0) - (a.prix || 0));
      case 'stock':
        return sorted.sort((a, b) => (a.stock_actuel ?? 999) - (b.stock_actuel ?? 999));
      case 'name':
      default:
        return sorted.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    }
  };
  const favoris = catalogue.filter(c => c.favori);
  const alertesStock = catalogue.filter(c => c.stock_actuel !== undefined && c.stock_seuil_alerte !== undefined && c.stock_actuel < c.stock_seuil_alerte);

  const getMargeBrute = (prix, prixAchat) => {
    const p = parseFloat(prix) || 0;
    const a = parseFloat(prixAchat) || 0;
    if (p === 0 || a === 0) return null; // Pas de marge calculable si prix achat = 0
    return ((p - a) / p) * 100;
  };

  const getMargeColor = (marge) => {
    if (marge === null) return isDark ? 'text-slate-400' : 'text-slate-400';
    if (marge >= 60) return 'text-emerald-600 font-bold';
    if (marge >= 40) return 'text-emerald-500';
    if (marge >= 25) return 'text-orange-500';
    if (marge >= 10) return 'text-yellow-600';
    return 'text-red-500';
  };

  const submit = () => {
    if (!form.nom || !form.prix) return showToast('Nom et prix requis', 'error');
    const data = { id: editId || generateId(), ...form, prix: parseFloat(form.prix), prixAchat: parseFloat(form.prixAchat) || 0, stock_actuel: form.stock_actuel !== '' ? parseInt(form.stock_actuel) : undefined, stock_seuil_alerte: form.stock_seuil_alerte !== '' ? parseInt(form.stock_seuil_alerte) : undefined };
    if (editId) setCatalogue(catalogue.map(c => c.id === editId ? data : c));
    else setCatalogue([...catalogue, data]);
    setShow(false); setEditId(null); setForm({ nom: '', prix: '', prixAchat: '', unite: 'u', categorie: 'Autre', favori: false, stock_actuel: '', stock_seuil_alerte: '' });
  };

  const startEdit = (item) => { setForm({ nom: item.nom || '', prix: item.prix?.toString() || '', prixAchat: item.prixAchat?.toString() || '', unite: item.unite || 'u', categorie: item.categorie || 'Autre', favori: item.favori || false, stock_actuel: item.stock_actuel?.toString() ?? '', stock_seuil_alerte: item.stock_seuil_alerte?.toString() ?? '' }); setEditId(item.id); setShow(true); };
  const toggleFavori = (id) => {
    const item = catalogue.find(c => c.id === id);
    setCatalogue(catalogue.map(c => c.id === id ? { ...c, favori: !c.favori } : c));
    showToast(item?.favori ? 'Retiré des favoris' : 'Ajouté aux favoris', 'success');
  };
  const deleteItem = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cet article du catalogue ?' });
    if (confirmed) setCatalogue(catalogue.filter(c => c.id !== id));
  };
  const updateStock = (id, value) => setCatalogue(catalogue.map(c => c.id === id ? { ...c, stock_actuel: Math.max(0, parseInt(value) || 0) } : c));
  const incrementStock = (id) => setCatalogue(catalogue.map(c => c.id === id ? { ...c, stock_actuel: (c.stock_actuel || 0) + 1 } : c));
  const decrementStock = (id) => setCatalogue(catalogue.map(c => c.id === id ? { ...c, stock_actuel: Math.max(0, (c.stock_actuel || 0) - 1) } : c));

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEditId(null); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h2 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouvel'} article</h2>
      </div>
      <div className={`${cardBg} rounded-2xl border p-6`}>
        <div className="space-y-4">
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prix vente HT *</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value}))} /></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prix achat HT</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prixAchat} onChange={e => setForm(p => ({...p, prixAchat: e.target.value}))} /></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Unité</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.unite} onChange={e => setForm(p => ({...p, unite: e.target.value}))}>{UNITES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Catégorie</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>{CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Stock actuel</label>
              <input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.stock_actuel} onChange={e => setForm(p => ({...p, stock_actuel: e.target.value}))} placeholder="Optionnel" />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Stock minimum</label>
              <input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.stock_seuil_alerte} onChange={e => setForm(p => ({...p, stock_seuil_alerte: e.target.value}))} placeholder="Optionnel" />
              <p className={`text-xs mt-1 ${textMuted}`}>Alerte si stock en dessous</p>
            </div>
          </div>
          <label className={`flex items-center gap-3 cursor-pointer py-2 ${textPrimary}`}>
            <div className="relative">
              <input type="checkbox" checked={form.favori} onChange={e => setForm(p => ({...p, favori: e.target.checked}))} className="sr-only peer" />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors peer-checked:border-amber-500 peer-checked:bg-amber-500 ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'}`}>
                {form.favori && <Star size={12} className="text-white" fill="currentColor" />}
              </div>
            </div>
            <Star size={16} className="text-amber-500" fill={form.favori ? "currentColor" : "none"} />
            <span>Marquer comme favori</span>
          </label>
        </div>
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : ''}`}>
          <button onClick={() => setShow(false)} className={`px-4 py-2.5 rounded-xl min-h-[44px] transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>Annuler</button>
          <button onClick={submit} className="px-6 py-2.5 text-white rounded-xl min-h-[44px] hover:shadow-lg transition-all flex items-center gap-2" style={{background: couleur}}>
            {editId ? <Edit3 size={16} /> : <Plus size={16} />}
            {editId ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Catalogue ({catalogue.length})</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowStock(!showStock)} className={`w-11 h-11 sm:w-auto sm:h-11 sm:px-4 rounded-xl text-sm flex items-center justify-center sm:gap-2 transition-all ${showStock ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`} style={showStock ? {background: couleur} : {}}>
            <Box size={16} />
            <span className="hidden sm:inline">Stock</span>
          </button>
          <button onClick={() => setShowArticlePicker(true)} className={`w-11 h-11 sm:w-auto sm:h-11 sm:px-4 rounded-xl flex items-center justify-center sm:gap-2 transition-all border-2 font-medium ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white hover:bg-slate-50'}`} style={{borderColor: couleur, color: couleur}}>
            <Sparkles size={16} />
            <span className="hidden sm:inline">Référentiel BTP</span>
          </button>
          <button onClick={() => setShow(true)} className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl flex items-center justify-center sm:gap-2 hover:shadow-lg transition-all" style={{background: couleur}}>
            <Plus size={16} />
            <span className="hidden sm:inline">Manuel</span>
          </button>
        </div>
      </div>

      {alertesStock.length > 0 && (
        <div className={`rounded-2xl p-4 flex items-center gap-4 flex-wrap ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50'}`}>
          <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
            <AlertTriangle size={18} />
            Stock bas:
          </span>
          {alertesStock.map(item => (
            <span key={item.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className={textPrimary}>{item.nom}</span>
              <span className={textMuted}>({item.stock_actuel}/{item.stock_seuil_alerte})</span>
            </span>
          ))}
        </div>
      )}

      {favoris.length > 0 && !showStock && (
        <div className={`rounded-2xl p-5 ${isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50'}`}>
          <h3 className={`font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
            <Star size={18} className="text-amber-500" fill="currentColor" />
            Favoris ({favoris.length})
          </h3>
          <div className="flex gap-2 flex-wrap">
            {favoris.map(item => (
              <div key={item.id} className={`group flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm border transition-all hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 hover:border-amber-500' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                <span className={`font-medium ${textPrimary}`}>{item.nom}</span>
                <span className="text-amber-600 font-semibold">{item.prix}€</span>
                <span className={`text-xs ${textMuted}`}>/{item.unite}</span>
                <button
                  onClick={() => toggleFavori(item.id)}
                  className={`ml-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 dark:hover:bg-red-900/30`}
                  title="Retirer des favoris"
                >
                  <Star size={14} className="text-amber-500 fill-amber-500 hover:text-red-500 hover:fill-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className={`relative max-w-sm`}>
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input type="text" placeholder="Rechercher un article..." aria-label="Rechercher un article" value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${catFilter === cat ? 'text-white shadow-sm' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} style={catFilter === cat ? {background: couleur} : {}}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sorting options */}
      {catalogue.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className={`text-sm ${textMuted} flex items-center gap-1`}><ArrowUpDown size={14} /> Trier:</span>
          {[
            { key: 'name', label: 'Nom' },
            { key: 'price', label: 'Prix' },
            { key: 'stock', label: 'Stock' }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${sortBy === opt.key ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              style={sortBy === opt.key ? { background: couleur } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          {/* Header with gradient */}
          <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.3\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }} />

            <div className="relative">
              {/* Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
                <Package size={40} className="text-white" />
              </div>

              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>
                {search || catFilter !== 'Tous' ? 'Aucun article trouvé' : 'Créez votre catalogue'}
              </h2>
              <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
                {search || catFilter !== 'Tous'
                  ? 'Modifiez vos filtres ou ajoutez un nouvel article.'
                  : 'Centralisez vos matériaux, tarifs et gérez vos stocks en un seul endroit.'}
              </p>
            </div>
          </div>

          {/* Features grid */}
          {!search && catFilter === 'Tous' && (
            <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>Fonctionnalités</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <Star size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Articles favoris</p>
                    <p className={`text-xs ${textMuted}`}>Accès rapide à vos essentiels</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <Box size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Gestion des stocks</p>
                    <p className={`text-xs ${textMuted}`}>Alertes automatiques</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <AlertTriangle size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Calcul des marges</p>
                    <p className={`text-xs ${textMuted}`}>Prix achat vs vente</p>
                  </div>
                </div>
              </div>

              <button onClick={() => setShow(true)} className="w-full sm:w-auto px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                <Plus size={18} />
                Ajouter mon premier article
              </button>
            </div>
          )}

          {/* Simple CTA for filtered empty state */}
          {(search || catFilter !== 'Tous') && (
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} text-center`}>
              <button onClick={() => setShow(true)} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                <Plus size={18} />
                Ajouter un article
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Catalogue des articles">
              <thead className={`border-b ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <tr>
                  <th scope="col" className={`text-left px-4 py-3 ${textPrimary}`}>Article</th>
                  <th scope="col" className={`text-right px-4 py-3 w-24 ${textPrimary}`}>Vente</th>
                  <th scope="col" className={`text-right px-4 py-3 w-24 hidden sm:table-cell ${textPrimary}`}>Achat</th>
                  <th scope="col" className={`text-right px-4 py-3 w-20 hidden sm:table-cell ${textPrimary}`}>Marge</th>
                  {showStock && <th scope="col" className={`text-center px-4 py-3 w-28 ${textPrimary}`}>Stock</th>}
                  <th scope="col" className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {getSortedItems().map(item => {
                  const marge = getMargeBrute(item.prix, item.prixAchat);
                  const stockLow = item.stock_actuel !== undefined && item.stock_seuil_alerte !== undefined && item.stock_actuel < item.stock_seuil_alerte;
                  return (
                    <tr key={item.id} className={`border-b last:border-0 transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-700/70' : 'hover:bg-slate-100'}`} onClick={() => startEdit(item)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); toggleFavori(item.id); }} aria-label={item.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'} title={item.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'} className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`}>
                            <Star size={18} className={item.favori ? 'text-amber-500' : textMuted} fill={item.favori ? 'currentColor' : 'none'} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${textPrimary}`}>{item.nom}</p>
                              {stockLow && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                            </div>
                            <p className={`text-xs ${textMuted}`}>{item.categorie} · {item.unite}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${textPrimary}`}>{item.prix}€</td>
                      <td className={`px-4 py-3 text-right hidden sm:table-cell ${textMuted}`}>{item.prixAchat || 0}€</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={getMargeColor(marge)}>{marge !== null ? `${marge.toFixed(0)}%` : '—'}</span>
                      </td>
                      {showStock && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {item.stock_actuel !== undefined ? (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => decrementStock(item.id)} aria-label="Retirer une unité du stock" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`} title="Retirer 1">
                                <Minus size={16} className={textMuted} />
                              </button>
                              <input type="number" value={item.stock_actuel} onChange={e => updateStock(item.id, e.target.value)} aria-label="Quantité en stock" className={`w-14 px-1 py-1 border rounded text-center text-sm ${inputBg}`} />
                              <button onClick={() => incrementStock(item.id)} aria-label="Ajouter une unité au stock" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`} title="Ajouter 1">
                                <Plus size={16} className={textMuted} />
                              </button>
                            </div>
                          ) : (
                            <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                              Non géré
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); startEdit(item); }} title="Modifier cet article" aria-label="Modifier cet article" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg transition-all flex items-center justify-center ${isDark ? 'hover:bg-blue-900/40 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-500 hover:text-blue-600'}`}>
                            <Edit3 size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} title="Supprimer cet article" aria-label="Supprimer cet article" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg transition-all flex items-center justify-center ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/40' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Article Picker Modal */}
      <ArticlePicker
        isOpen={showArticlePicker}
        onClose={() => setShowArticlePicker(false)}
        onSelect={handleAddFromPicker}
        isDark={isDark}
        couleur={couleur}
      />
    </div>
  );
}
