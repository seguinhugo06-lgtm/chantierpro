import React, { useState } from 'react';

const CATEGORIES = ['Tous', 'Plomberie', 'Électricité', 'Maçonnerie', 'Carrelage', 'Peinture', 'Menuiserie', 'Matériaux', 'Autre'];
const UNITES = ['unité', 'h', 'm²', 'ml', 'forfait', 'jour', 'pot', 'sac', 'rouleau', 'kg', 'm³', 'palette'];

export default function Catalogue({ catalogue, setCatalogue, couleur, isDark }) {
  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";

  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tous');
  const [showStock, setShowStock] = useState(false);
  const [form, setForm] = useState({ nom: '', prix: '', prixAchat: '', unite: 'unité', categorie: 'Autre', favori: false, stock_actuel: '', stock_seuil_alerte: '' });

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
      <div className="flex items-center gap-4"><button onClick={() => { setShow(false); setEditId(null); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">{editId ? 'Modifier' : 'Nouvel'} article</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-sm font-medium mb-1">Prix vente HT *</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value}))} /></div>
            <div><label className="block text-sm font-medium mb-1">Prix achat HT</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.prixAchat} onChange={e => setForm(p => ({...p, prixAchat: e.target.value}))} /></div>
            <div><label className="block text-sm font-medium mb-1">Unité</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.unite} onChange={e => setForm(p => ({...p, unite: e.target.value}))}>{UNITES.map(u => <option key={u}>{u}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Catégorie</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>{CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Stock actuel</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.stock_actuel} onChange={e => setForm(p => ({...p, stock_actuel: e.target.value}))} placeholder="Optionnel" /></div>
            <div><label className="block text-sm font-medium mb-1">Seuil alerte</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.stock_seuil_alerte} onChange={e => setForm(p => ({...p, stock_seuil_alerte: e.target.value}))} placeholder="Optionnel" /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.favori} onChange={e => setForm(p => ({...p, favori: e.target.checked}))} className="w-5 h-5" /><span>â­ Favori</span></label>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>{editId ? 'Enregistrer' : 'Ajouter'}</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Catalogue ({catalogue.length})</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowStock(!showStock)} className={`px-4 py-2 rounded-xl text-sm ${showStock ? 'text-white' : 'bg-slate-100'}`} style={showStock ? {background: couleur} : {}}> Stock</button>
          <button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Ajouter</button>
        </div>
      </div>

      {alertesStock.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
          <span className="text-red-600 font-medium">âš  Stock bas:</span>
          {alertesStock.map(item => (<span key={item.id} className="flex items-center gap-1 px-3 py-1 bg-white rounded-lg shadow-sm"><span className="w-2 h-2 rounded-full bg-red-500"></span>{item.nom} ({item.stock_actuel}/{item.stock_seuil_alerte})</span>))}
        </div>
      )}

      {favoris.length > 0 && !showStock && (
        <div className="bg-orange-50 rounded-2xl p-5">
          <h3 className="font-semibold mb-3">â­ Favoris</h3>
          <div className="flex gap-2 flex-wrap">{favoris.map(item => (<div key={item.id} className="px-4 py-2 bg-white rounded-xl shadow-sm"><span className="font-medium">{item.nom}</span><span className="text-slate-500 ml-2">{item.prix}€/{item.unite}</span></div>))}</div>
        </div>
      )}

      <div className="flex gap-4 flex-wrap items-center">
        <input type="text" placeholder=" Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 max-w-xs px-4 py-2.5 border rounded-xl" />
        <div className="flex gap-2 flex-wrap">{CATEGORIES.map(cat => (<button key={cat} onClick={() => setCatFilter(cat)} className={`px-3 py-1.5 rounded-lg text-sm ${catFilter === cat ? 'text-white' : 'bg-slate-100'}`} style={catFilter === cat ? {background: couleur} : {}}>{cat}</button>))}</div>
      </div>

      {filtered.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4"></p><p className="text-slate-500">Catalogue vide</p></div> : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3">Article</th><th className="text-right px-4 py-3 w-24">Vente</th><th className="text-right px-4 py-3 w-24">Achat</th><th className="text-right px-4 py-3 w-20">Marge</th>{showStock && <th className="text-center px-4 py-3 w-28">Stock</th>}<th className="w-20"></th></tr></thead>
            <tbody>
              {filtered.map(item => {
                const marge = getMargeBrute(item.prix, item.prixAchat);
                const stockLow = item.stock_actuel !== undefined && item.stock_seuil_alerte !== undefined && item.stock_actuel < item.stock_seuil_alerte;
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleFavori(item.id)} className="text-lg">{item.favori ? 'â­' : 'â˜†'}</button>
                        <div><div className="flex items-center gap-2"><p className="font-medium">{item.nom}</p>{stockLow && <span className="w-2 h-2 rounded-full bg-red-500"></span>}</div><p className="text-xs text-slate-500">{item.categorie} "¢ {item.unite}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{item.prix}€</td>
                    <td className="px-4 py-3 text-right text-slate-500">{item.prixAchat || 0}€</td>
                    <td className="px-4 py-3 text-right"><span className={`font-bold ${marge >= 30 ? 'text-emerald-600' : marge >= 15 ? 'text-amber-500' : 'text-red-500'}`}>{marge.toFixed(0)}%</span></td>
                    {showStock && (<td className="px-4 py-3 text-center">{item.stock_actuel !== undefined ? (<input type="number" value={item.stock_actuel} onChange={e => updateStock(item.id, e.target.value)} className="w-16 px-2 py-1 border rounded text-center" />) : <span className="text-slate-400">-</span>}</td>)}
                    <td className="px-4 py-3 text-center"><button onClick={() => startEdit(item)} className="text-slate-400 hover:text-slate-600 mr-2"></button><button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600"></button></td>
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
