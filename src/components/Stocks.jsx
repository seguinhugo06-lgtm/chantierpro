import React, { useState } from 'react';

const CATS = ['Plomberie', 'Électricité', 'Maçonnerie', 'Peinture', 'Outillage', 'Autre'];

export default function Stocks({ stocks, setStocks }) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nom: '', reference: '', categorie: 'Autre', quantite: 0, seuil: 5, prix: 0, emplacement: '' });

  const lowStocks = stocks.filter(s => s.quantite <= (s.seuil || 5));
  const filtered = stocks.filter(s => !search || s.nom?.toLowerCase().includes(search.toLowerCase()));
  const totalVal = stocks.reduce((s, st) => s + (st.quantite || 0) * (st.prix || 0), 0);

  const submit = () => {
    if (!form.nom) return;
    setStocks([...stocks, { id: Date.now().toString(), ...form, quantite: parseFloat(form.quantite) || 0, seuil: parseInt(form.seuil) || 5, prix: parseFloat(form.prix) || 0 }]);
    setShow(false);
    setForm({ nom: '', reference: '', categorie: 'Autre', quantite: 0, seuil: 5, prix: 0, emplacement: '' });
  };

  const updateQty = (id, d) => setStocks(stocks.map(s => s.id === id ? { ...s, quantite: Math.max(0, (s.quantite || 0) + d) } : s));

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">â†</button>
        <h1 className="text-2xl font-bold">Nouveau matériau</h1>
      </div>
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Référence</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.reference} onChange={e => setForm(p => ({...p, reference: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Catégorie</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Quantité</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.quantite} onChange={e => setForm(p => ({...p, quantite: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Seuil alerte</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.seuil} onChange={e => setForm(p => ({...p, seuil: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prix (€)</label><input type="number" step="0.01" className="w-full px-4 py-2.5 border rounded-xl" value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value}))} /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Emplacement</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.emplacement} onChange={e => setForm(p => ({...p, emplacement: e.target.value}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">Ajouter</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stocks ({stocks.length})</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button>
      </div>
      {lowStocks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2"><span className="text-2xl">âš ï¸</span><h3 className="font-semibold text-amber-800">Stocks bas ({lowStocks.length})</h3></div>
          <div className="flex flex-wrap gap-2">{lowStocks.map(s => <span key={s.id} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">{s.nom}: {s.quantite}</span>)}</div>
        </div>
      )}
      <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2.5 border rounded-xl" />
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4"></p><h3>Aucun matériau</h3></div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          {filtered.map(s => (
            <div key={s.id} className={`flex items-center px-5 py-4 border-b gap-4 ${s.quantite <= (s.seuil || 5) ? 'bg-red-50' : ''}`}>
              <div className="flex-1">
                <p className="font-medium">{s.nom}</p>
                {s.reference && <p className="text-xs text-slate-500">Réf: {s.reference}</p>}
              </div>
              <span className="w-24 text-sm">{s.categorie}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(s.id, -1)} className="w-8 h-8 bg-slate-100 rounded-lg font-bold">-</button>
                <span className={`w-12 text-center font-semibold ${s.quantite <= (s.seuil || 5) ? 'text-red-600' : ''}`}>{s.quantite}</span>
                <button onClick={() => updateQty(s.id, 1)} className="w-8 h-8 bg-slate-100 rounded-lg font-bold">+</button>
              </div>
              <span className="w-20 text-right">{(s.prix || 0).toFixed(2)} €</span>
              <span className="w-24 text-right font-semibold">{((s.quantite || 0) * (s.prix || 0)).toFixed(2)} €</span>
            </div>
          ))}
          <div className="px-5 py-4 bg-slate-50 flex justify-between">
            <span className="font-semibold">Valeur totale</span>
            <span className="font-bold text-orange-500">{totalVal.toFixed(2)} €</span>
          </div>
        </div>
      )}
    </div>
  );
}
