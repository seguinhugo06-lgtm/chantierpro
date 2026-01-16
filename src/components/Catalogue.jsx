import { Package, Plus, Search, Edit, Trash2, X, Tag, DollarSign, AlertCircle, ArrowLeft, Star } from 'lucide-react';
import React, { useState } from 'react';

const CATEGORIES = ['Tous', 'Plomberie', 'Électricité', 'Maçonnerie', 'Carrelage', 'Peinture', 'Menuiserie', 'Matériaux', 'Autre'];
const UNITES = ['unité', 'h', 'm²', 'ml', 'forfait', 'jour', 'pot', 'sac', 'rouleau', 'kg', 'm³', 'palette'];

export default function Catalogue({ catalogue, setCatalogue, couleur, isDark }) {
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tous');
  const [showStock, setShowStock] = useState(false);
  const [form, setForm] = useState({ nom: '', prix: '', prixAchat: '', unite: 'unité', categorie: 'Autre', favori: false, stock_actuel: '', stock_seuil_alerte: '' });

  // Variables thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const btnSecondary = isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700';

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

  const startEdit = (item) => { setForm({ nom: item.nom || '', prix: item.prix?.toString() || '', prixAchat: item.prixAchat?.toString() || '', unite: item.unite || 'unité', categorie: item.categorie || 'Autre', favori: item.favori || false, stock_actuel: item.stock_actuel?.toString() ?? '', stock_seuil_alerte: item.stock_seuil_alerte?.toString() ?? '' }); setEditId(item.id); setShow(true); };
  const toggleFavori = (id) => setCatalogue(catalogue.map(c => c.id === id ? { ...c, favori: !c.favori } : c));
  const deleteItem = (id) => { if (confirm('Supprimer ?')) setCatalogue(catalogue.filter(c => c.id !== id)); };
  const updateStock = (id, value) => setCatalogue(catalogue.map(c => c.id === id ? { ...c, stock_actuel: parseInt(value) || 0 } : c));

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEditId(null); }} className={`p-2 ${hoverBg} rounded-xl`}><ArrowLeft size={20} className={textPrimary} /></button>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouvel'} article</h1>
      </div>
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="space-y-4">
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prix vente HT *</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value}))} /></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prix achat HT</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prixAchat} onChange={e => setForm(p => ({...p, prixAchat: e.target.value}))} /></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Unité</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.unite} onChange={e => setForm(p => ({...p, unite: e.target.value}))}>{UNITES.map(u => <option key={u}>{u}</option>)}</select></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Catégorie</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>{CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Stock actuel</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.stock_actuel} onChange={e => setForm(p => ({...p, stock_actuel: e.target.value}))} placeholder="Optionnel" /></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Seuil alerte</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.stock_seuil_alerte} onChange={e => setForm(p => ({...p, stock_seuil_alerte: e.target.value}))} placeholder="Optionnel" /></div>
          </div>
          <label className={`flex items-center gap-2 cursor-pointer ${textPrimary}`}><input type="checkbox" checked={form.favori} onChange={e => setForm(p => ({...p, favori: e.target.checked}))} className="w-5 h-5" /><Star size={16} /> Favori</label>
        </div>
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : ''}`}>
          <button onClick={() => setShow(false)} className={`px-4 py-2 rounded-xl ${btnSecondary}`}>Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>{editId ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Catalogue ({catalogue.length})</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowStock(!showStock)} className={`px-4 py-2 rounded-xl text-sm ${showStock ? 'text-white' : btnSecondary}`} style={showStock ? {background: couleur} : {}}>Stock</button>
          <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl" style={{background: couleur}}><Plus size={18} /> Ajouter</button>
        </div>
      </div>

      {alertesStock.length > 0 && (
        <div className={`rounded-2xl p-4 flex items-center gap-4 flex-wrap ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50'}`}>
          <span className="text-red-500 font-medium flex items-center gap-2"><AlertCircle size={18} /> Stock bas:</span>
          {alertesStock.map(item => (<span key={item.id} className={`flex items-center gap-1 px-3 py-1 rounded-lg shadow-sm ${cardBg}`}><span className="w-2 h-2 rounded-full bg-red-500"></span>{item.nom} ({item.stock_actuel}/{item.stock_seuil_alerte})</span>))}
        </div>
      )}

      {favoris.length > 0 && !showStock && (
        <div className={`rounded-2xl p-5 ${isDark ? 'bg-orange-900/20 border border-orange-800' : 'bg-orange-50'}`}>
          <h3 className={`font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}><Star size={18} className="text-orange-500" /> Favoris</h3>
          <div className="flex gap-2 flex-wrap">{favoris.map(item => (<div key={item.id} className={`px-4 py-2 rounded-xl shadow-sm ${cardBg}`}><span className={`font-medium ${textPrimary}`}>{item.nom}</span><span className={`ml-2 ${textSecondary}`}>{item.prix}€/{item.unite}</span></div>))}</div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary}`} />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-11 pr-4 py-2.5 border rounded-xl ${inputBg}`} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${catFilter === cat ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} style={catFilter === cat ? {background: couleur} : {}}>{cat}</button>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={48} className={`mx-auto mb-4 ${textSecondary}`} />
            <p className={textSecondary}>Aucun article</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
              <tr>
                <th className={`text-left px-4 py-3 text-sm font-medium ${textSecondary}`}>Article</th>
                <th className={`text-right px-4 py-3 text-sm font-medium ${textSecondary}`}>Prix</th>
                <th className={`text-right px-4 py-3 text-sm font-medium ${textSecondary}`}>Marge</th>
                {showStock && <th className={`text-right px-4 py-3 text-sm font-medium ${textSecondary}`}>Stock</th>}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const marge = getMargeBrute(item.prix, item.prixAchat);
                const stockBas = item.stock_actuel !== undefined && item.stock_seuil_alerte !== undefined && item.stock_actuel < item.stock_seuil_alerte;
                return (
                  <tr key={item.id} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} ${hoverBg} cursor-pointer`} onClick={() => startEdit(item)}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {item.favori && <Star size={16} className="text-orange-500 fill-orange-500" />}
                        <div>
                          <p className={`font-medium ${textPrimary}`}>{item.nom}</p>
                          <p className={`text-sm ${textSecondary}`}>{item.categorie} • {item.unite}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`text-right px-4 py-4 font-medium ${textPrimary}`}>{item.prix}€</td>
                    <td className="text-right px-4 py-4"><span className={`font-semibold ${marge >= 50 ? 'text-emerald-500' : marge >= 30 ? 'text-amber-500' : 'text-red-500'}`}>{marge.toFixed(0)}%</span></td>
                    {showStock && (
                      <td className="text-right px-4 py-4">
                        {item.stock_actuel !== undefined ? (
                          <span className={`font-medium ${stockBas ? 'text-red-500' : textPrimary}`}>{item.stock_actuel}</span>
                        ) : <span className={textSecondary}>-</span>}
                      </td>
                    )}
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <button onClick={() => deleteItem(item.id)} className={`p-2 rounded-lg ${hoverBg} text-red-500`}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
