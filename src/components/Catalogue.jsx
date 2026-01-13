import React, { useState } from 'react';

const CATEGORIES = ['Tous', 'Plomberie', 'Électricité', 'Maçonnerie', 'Carrelage', 'Peinture', 'Menuiserie', 'Autre'];

export default function Catalogue({ catalogue, setCatalogue, couleur }) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tous');
  const [form, setForm] = useState({ nom: '', description: '', prix: '', unite: 'unité', categorie: 'Autre', favori: false });

  const filtered = catalogue.filter(c => 
    (catFilter === 'Tous' || c.categorie === catFilter) &&
    (!search || c.nom?.toLowerCase().includes(search.toLowerCase()))
  );

  const favoris = catalogue.filter(c => c.favori);

  const submit = () => {
    if (!form.nom || !form.prix) return;
    setCatalogue([...catalogue, { id: Date.now().toString(), ...form, prix: parseFloat(form.prix) }]);
    setShow(false);
    setForm({ nom: '', description: '', prix: '', unite: 'unité', categorie: 'Autre', favori: false });
  };

  const toggleFavori = (id) => {
    setCatalogue(catalogue.map(c => c.id === id ? { ...c, favori: !c.favori } : c));
  };

  const deleteItem = (id) => {
    if (confirm('Supprimer cette prestation ?')) {
      setCatalogue(catalogue.filter(c => c.id !== id));
    }
  };

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">Nouvelle prestation</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom *</label>
            <input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Ex: Pose carrelage au m²" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Détails de la prestation..." />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prix HT *</label>
              <input type="number" step="0.01" className="w-full px-4 py-2.5 border rounded-xl" value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value}))} placeholder="45.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unité</label>
              <select className="w-full px-4 py-2.5 border rounded-xl" value={form.unite} onChange={e => setForm(p => ({...p, unite: e.target.value}))}>
                <option>unité</option>
                <option>heure</option>
                <option>m²</option>
                <option>ml</option>
                <option>forfait</option>
                <option>jour</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select className="w-full px-4 py-2.5 border rounded-xl" value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>
                {CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl cursor-pointer w-full">
                <input type="checkbox" checked={form.favori} onChange={e => setForm(p => ({...p, favori: e.target.checked}))} className="w-5 h-5" />
                <span>⭐ Favori</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Ajouter</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Catalogue ({catalogue.length})</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouvelle prestation</button>
      </div>

      {/* Favoris */}
      {favoris.length > 0 && (
        <div className="bg-orange-50 rounded-2xl p-5">
          <h3 className="font-semibold mb-3">⭐ Accès rapide ({favoris.length})</h3>
          <div className="flex gap-2 flex-wrap">
            {favoris.map(item => (
              <div key={item.id} className="px-4 py-2 bg-white rounded-xl shadow-sm">
                <span className="font-medium">{item.nom}</span>
                <span className="text-slate-500 ml-2">{item.prix}€/{item.unite}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-4 py-2.5 border rounded-xl"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm ${catFilter === cat ? 'text-white' : 'bg-slate-100'}`}
              style={catFilter === cat ? {background: couleur} : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <p className="text-5xl mb-4">📦</p>
          <h3 className="font-semibold mb-2">Catalogue vide</h3>
          <p className="text-slate-500">Ajoutez vos prestations types pour gagner du temps</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4 border-b last:border-0 hover:bg-slate-50">
              <button onClick={() => toggleFavori(item.id)} className="text-xl">
                {item.favori ? '⭐' : '☆'}
              </button>
              <div className="flex-1">
                <p className="font-medium">{item.nom}</p>
                {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
              </div>
              <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm">{item.categorie}</span>
              <p className="font-bold w-24 text-right" style={{color: couleur}}>{item.prix}€<span className="text-slate-400 font-normal">/{item.unite}</span></p>
              <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600 p-2">🗑️</button>
            </div>
          ))}
        </div>
      )}

      {/* Conseil */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
        💡 <strong>Astuce :</strong> Marquez vos 10 prestations les plus utilisées en favoris pour les retrouver rapidement lors de la création de devis.
      </div>
    </div>
  );
}
