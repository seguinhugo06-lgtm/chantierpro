import React, { useState } from 'react';
import { Package, Star, Search, Plus, Edit2, Trash2, AlertTriangle, TrendingUp, Box } from 'lucide-react';

const CATEGORIES = ['Tous', 'Plomberie', 'Électricité', 'Maçonnerie', 'Carrelage', 'Peinture', 'Menuiserie', 'Matériaux', 'Autre'];
const UNITES = ['unité', 'h', 'm²', 'ml', 'forfait', 'jour', 'pot', 'sac', 'rouleau', 'kg', 'm³', 'palette'];

export default function Catalogue({ catalogue, setCatalogue, couleur, isDark }) {
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tous');
  const [showStock, setShowStock] = useState(false);
  const [form, setForm] = useState({ nom: '', prix: '', prixAchat: '', unite: 'unité', categorie: 'Autre', favori: false, stock_actuel: '', stock_seuil_alerte: '' });

  // Classes conditionnelles pour le thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const tableBg = isDark ? 'bg-slate-700' : 'bg-slate-50';

  const filtered = catalogue.filter(c => (catFilter === 'Tous' || c.categorie === catFilter) && (!search || c.nom?.toLowerCase().includes(search.toLowerCase())));
  const favoris = catalogue.filter(c => c.favori);
  const alertesStock = catalogue.filter(c => c.stock_actuel !== undefined && c.stock_seuil_alerte !== undefined && c.stock_actuel < c.stock_seuil_alerte);

  const getMargeBrute = (prix, prixAchat) => { const p = parseFloat(prix) || 0, a = parseFloat(prixAchat) || 0; return p === 0 ? 0 : ((p - a) / p) * 100; };

  const submit = () => {
    if (!form.nom || !form.prix) return alert('Nom et prix requis');
    const data = { id: editId || Date.now().toString(), ...form, prix: parseFloat(form.prix), prixAchat: parseFloat(form.prixAchat) || 0, stock_actuel: form.stock_actuel !== '' ? parseInt(form.stock_actuel) : undefined, stock_seuil_alerte: form.stock_seuil_alerte !== '' ? parseInt(form.stock_seuil_alerte) : undefined };
    if (editId) setCatalogue(catalogue.map(c => c.id === editId ? data : c));
    else setCatalogue([...catalogue, data]);
    setShow(false); setEditId(null); setForm({ nom: '', prix: '', prixAchat: '', unite: 'unité', categorie: 'Autre', favori: false, stock_actuel: '', stock_seuil_alerte: '' });
  };

  const startEdit = (item) => { 
    setForm({ 
      nom: item.nom || '', 
      prix: item.prix?.toString() || '', 
      prixAchat: item.prixAchat?.toString() || '', 
      unite: item.unite || 'unité', 
      categorie: item.categorie || 'Autre', 
      favori: item.favori || false, 
      stock_actuel: item.stock_actuel?.toString() ?? '', 
      stock_seuil_alerte: item.stock_seuil_alerte?.toString() ?? '' 
    }); 
    setEditId(item.id); 
    setShow(true); 
  };
  
  const toggleFavori = (id) => setCatalogue(catalogue.map(c => c.id === id ? { ...c, favori: !c.favori } : c));
  const deleteItem = (id) => { if (confirm('Supprimer cet article ?')) setCatalogue(catalogue.filter(c => c.id !== id)); };
  const updateStock = (id, value) => setCatalogue(catalogue.map(c => c.id === id ? { ...c, stock_actuel: parseInt(value) || 0 } : c));

  // Formulaire d'ajout/modification
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEditId(null); }} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouvel'} article</h1>
      </div>
      
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Nom de l'article *</label>
            <input 
              className={`w-full px-4 py-3 border rounded-xl transition-colors focus:ring-2 focus:ring-offset-0 ${inputBg}`}
              style={{ '--tw-ring-color': couleur }}
              value={form.nom} 
              onChange={e => setForm(p => ({...p, nom: e.target.value}))} 
              placeholder="Ex: Pose carrelage sol"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Prix vente HT *</label>
              <div className="relative">
                <input 
                  type="number" 
                  className={`w-full px-4 py-3 pr-8 border rounded-xl ${inputBg}`} 
                  value={form.prix} 
                  onChange={e => setForm(p => ({...p, prix: e.target.value}))} 
                  placeholder="0"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary}`}>€</span>
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Prix d'achat HT</label>
              <div className="relative">
                <input 
                  type="number" 
                  className={`w-full px-4 py-3 pr-8 border rounded-xl ${inputBg}`} 
                  value={form.prixAchat} 
                  onChange={e => setForm(p => ({...p, prixAchat: e.target.value}))} 
                  placeholder="0"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary}`}>€</span>
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Unité</label>
              <select className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.unite} onChange={e => setForm(p => ({...p, unite: e.target.value}))}>
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Catégorie</label>
              <select className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>
                {CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <h4 className={`font-medium mb-3 flex items-center gap-2 ${textPrimary}`}>
              <Box size={18} style={{ color: couleur }} />
              Gestion du stock (optionnel)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm mb-2 ${textSecondary}`}>Stock actuel</label>
                <input 
                  type="number" 
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} 
                  value={form.stock_actuel} 
                  onChange={e => setForm(p => ({...p, stock_actuel: e.target.value}))} 
                  placeholder="Quantité en stock"
                />
              </div>
              <div>
                <label className={`block text-sm mb-2 ${textSecondary}`}>Seuil d'alerte</label>
                <input 
                  type="number" 
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} 
                  value={form.stock_seuil_alerte} 
                  onChange={e => setForm(p => ({...p, stock_seuil_alerte: e.target.value}))} 
                  placeholder="Alerte si stock <"
                />
              </div>
            </div>
          </div>
          
          <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
            <input 
              type="checkbox" 
              checked={form.favori} 
              onChange={e => setForm(p => ({...p, favori: e.target.checked}))} 
              className="w-5 h-5 rounded"
              style={{ accentColor: couleur }}
            />
            <Star size={18} className={form.favori ? 'text-amber-400 fill-amber-400' : textSecondary} />
            <span className={textPrimary}>Marquer comme favori</span>
          </label>
          
          {form.prix && form.prixAchat && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200'} border`}>
              <div className="flex items-center justify-between">
                <span className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>Marge brute estimée</span>
                <span className={`text-xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {getMargeBrute(form.prix, form.prixAchat).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => setShow(false)} className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            Annuler
          </button>
          <button onClick={submit} className="px-6 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
            {editId ? 'Enregistrer' : 'Ajouter au catalogue'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Catalogue ({catalogue.length})</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowStock(!showStock)} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showStock ? 'text-white shadow-lg' : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200')}`} 
            style={showStock ? {background: couleur} : {}}
          >
            <Package size={18} />
            Stock
          </button>
          <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
            <Plus size={18} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Alertes stock */}
      {alertesStock.length > 0 && (
        <div className={`rounded-2xl p-4 flex items-center gap-4 flex-wrap ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
          <AlertTriangle className={isDark ? 'text-red-400' : 'text-red-600'} size={20} />
          <span className={`font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Stock bas:</span>
          {alertesStock.map(item => (
            <span key={item.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-800 text-red-300' : 'bg-white text-red-700'} shadow-sm`}>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {item.nom} ({item.stock_actuel}/{item.stock_seuil_alerte})
            </span>
          ))}
        </div>
      )}

      {/* Favoris */}
      {favoris.length > 0 && !showStock && (
        <div className={`rounded-2xl p-5 ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
          <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
            <Star size={18} className="fill-amber-400 text-amber-400" />
            Favoris
          </h3>
          <div className="flex gap-2 flex-wrap">
            {favoris.map(item => (
              <div key={item.id} className={`px-4 py-2.5 rounded-xl shadow-sm ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-amber-200'}`}>
                <span className={`font-medium ${textPrimary}`}>{item.nom}</span>
                <span className={`ml-2 ${textSecondary}`}>{item.prix}€/{item.unite}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recherche et filtres */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCatFilter(cat)} 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${catFilter === cat ? 'text-white shadow-md' : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200')}`} 
              style={catFilter === cat ? {background: couleur} : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
          <Package size={48} className={`mx-auto mb-4 ${textSecondary}`} />
          <p className={textSecondary}>Catalogue vide</p>
          <button onClick={() => setShow(true)} className="mt-4 px-4 py-2 text-white rounded-xl text-sm" style={{background: couleur}}>
            Ajouter un article
          </button>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <table className="w-full text-sm">
            <thead className={`border-b ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <tr>
                <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Article</th>
                <th className={`text-right px-4 py-3 w-24 font-semibold ${textPrimary}`}>Vente</th>
                <th className={`text-right px-4 py-3 w-24 font-semibold ${textPrimary}`}>Achat</th>
                <th className={`text-right px-4 py-3 w-20 font-semibold ${textPrimary}`}>Marge</th>
                {showStock && <th className={`text-center px-4 py-3 w-28 font-semibold ${textPrimary}`}>Stock</th>}
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const marge = getMargeBrute(item.prix, item.prixAchat);
                const stockLow = item.stock_actuel !== undefined && item.stock_seuil_alerte !== undefined && item.stock_actuel < item.stock_seuil_alerte;
                return (
                  <tr key={item.id} className={`border-b last:border-0 transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleFavori(item.id)} className="text-lg transition-transform hover:scale-110">
                          {item.favori ? <Star size={18} className="text-amber-400 fill-amber-400" /> : <Star size={18} className={textSecondary} />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${textPrimary}`}>{item.nom}</p>
                            {stockLow && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                          </div>
                          <p className={`text-xs ${textSecondary}`}>{item.categorie} • {item.unite}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${textPrimary}`}>{item.prix}€</td>
                    <td className={`px-4 py-3 text-right ${textSecondary}`}>{item.prixAchat || 0}€</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${marge >= 50 ? 'text-emerald-500' : marge >= 30 ? 'text-amber-500' : 'text-red-500'}`}>
                        {marge.toFixed(0)}%
                      </span>
                    </td>
                    {showStock && (
                      <td className="px-4 py-3 text-center">
                        {item.stock_actuel !== undefined ? (
                          <input 
                            type="number" 
                            value={item.stock_actuel} 
                            onChange={e => updateStock(item.id, e.target.value)} 
                            className={`w-16 px-2 py-1 border rounded-lg text-center ${inputBg}`}
                          />
                        ) : (
                          <span className={textSecondary}>-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => startEdit(item)} className={`p-1.5 rounded-lg transition-colors mr-1 ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
