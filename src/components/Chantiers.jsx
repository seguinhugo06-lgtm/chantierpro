import React, { useState, useEffect } from 'react';

const STATUTS = { prospect: '🎯 Prospect', en_cours: '🔨 En cours', termine: '✅ Terminé' };

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, depenses, setDepenses, getChantierBilan, couleur }) {
  const [view, setView] = useState(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', date_debut: '', statut: 'prospect' });
  const [newTache, setNewTache] = useState('');
  const [newDepense, setNewDepense] = useState({ description: '', montant: '', photo: '' });

  useEffect(() => {
    if (!show && !view) setForm({ nom: '', client_id: '', adresse: '', date_debut: new Date().toISOString().split('T')[0], statut: 'prospect' });
  }, [show, view]);

  const submit = () => {
    if (!form.nom) return;
    addChantier(form);
    setShow(false);
  };

  // Ajouter une tâche
  const addTache = () => {
    if (!newTache || !view) return;
    const ch = chantiers.find(c => c.id === view);
    const taches = [...(ch.taches || []), { id: Date.now().toString(), text: newTache, done: false }];
    updateChantier(view, { taches });
    setNewTache('');
  };

  // Toggle tâche
  const toggleTache = (tacheId) => {
    const ch = chantiers.find(c => c.id === view);
    const taches = ch.taches.map(t => t.id === tacheId ? { ...t, done: !t.done } : t);
    updateChantier(view, { taches });
  };

  // Ajouter photo
  const addPhoto = (e) => {
    const file = e.target.files[0];
    if (!file || !view) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ch = chantiers.find(c => c.id === view);
      const photos = [...(ch.photos || []), { id: Date.now().toString(), src: reader.result, date: new Date().toISOString() }];
      updateChantier(view, { photos });
    };
    reader.readAsDataURL(file);
  };

  // Ajouter dépense
  const addDepenseToChantier = () => {
    if (!newDepense.description || !newDepense.montant || !view) return;
    const dep = { id: Date.now().toString(), chantierId: view, ...newDepense, montant: parseFloat(newDepense.montant), date: new Date().toISOString() };
    setDepenses([...depenses, dep]);
    setNewDepense({ description: '', montant: '', photo: '' });
  };

  // Photo pour dépense
  const handleDepensePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewDepense(p => ({ ...p, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  // Vue détail chantier
  if (view) {
    const ch = chantiers.find(c => c.id === view);
    if (!ch) { setView(null); return null; }
    const bilan = getChantierBilan(view);
    const chDepenses = depenses.filter(d => d.chantierId === view);
    const client = clients.find(c => c.id === ch.client_id);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView(null)} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{ch.nom}</h1>
            <p className="text-slate-500">{client?.nom || 'Sans client'} • {ch.adresse || 'Pas d\'adresse'}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm" style={{background: `${couleur}20`, color: couleur}}>{STATUTS[ch.statut]}</span>
        </div>

        {/* Bilan rentabilité */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4">📊 Rentabilité</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-green-50 rounded-xl"><p className="text-xs text-green-600">Revenus</p><p className="font-bold text-green-700">{bilan.revenus.toLocaleString('fr-FR')}€</p></div>
            <div className="p-3 bg-red-50 rounded-xl"><p className="text-xs text-red-600">Matériaux</p><p className="font-bold text-red-700">{bilan.materiaux.toLocaleString('fr-FR')}€</p></div>
            <div className="p-3 bg-blue-50 rounded-xl"><p className="text-xs text-blue-600">MO</p><p className="font-bold text-blue-700">{bilan.mainOeuvre.toLocaleString('fr-FR')}€</p></div>
            <div className={`p-3 rounded-xl ${bilan.marge >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}><p className={`text-xs ${bilan.marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Marge</p><p className={`font-bold ${bilan.marge >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{bilan.marge.toLocaleString('fr-FR')}€</p></div>
          </div>
        </div>

        {/* Checklist tâches */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4">📋 Liste de tâches</h3>
          <div className="flex gap-2 mb-4">
            <input placeholder="Nouvelle tâche..." value={newTache} onChange={e => setNewTache(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTache()} className="flex-1 px-4 py-2.5 border rounded-xl" />
            <button onClick={addTache} className="px-4 py-2.5 text-white rounded-xl" style={{background: couleur}}>+</button>
          </div>
          <div className="space-y-2">
            {(ch.taches || []).map(t => (
              <div key={t.id} onClick={() => toggleTache(t.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${t.done ? 'bg-green-50' : 'bg-slate-50'}`}>
                <span className="text-xl">{t.done ? '✅' : '⬜'}</span>
                <span className={t.done ? 'line-through text-slate-400' : ''}>{t.text}</span>
              </div>
            ))}
            {(ch.taches || []).length === 0 && <p className="text-center text-slate-400 py-4">Ajoutez vos tâches</p>}
          </div>
        </div>

        {/* Dépenses matériaux */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4">🧾 Dépenses matériaux</h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            <input placeholder="Description" value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} className="flex-1 min-w-[150px] px-4 py-2.5 border rounded-xl" />
            <input type="number" placeholder="Montant €" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} className="w-28 px-4 py-2.5 border rounded-xl" />
            <label className="px-4 py-2.5 bg-slate-100 rounded-xl cursor-pointer">📷<input type="file" accept="image/*" onChange={handleDepensePhoto} className="hidden" /></label>
            <button onClick={addDepenseToChantier} className="px-4 py-2.5 text-white rounded-xl" style={{background: couleur}}>+</button>
          </div>
          {newDepense.photo && <img src={newDepense.photo} className="w-20 h-20 object-cover rounded-xl mb-4" alt="" />}
          <div className="space-y-2">
            {chDepenses.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                {d.photo && <img src={d.photo} className="w-12 h-12 object-cover rounded-lg" alt="" />}
                <div className="flex-1"><p className="font-medium">{d.description}</p><p className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</p></div>
                <p className="font-bold text-red-600">-{d.montant.toLocaleString('fr-FR')}€</p>
              </div>
            ))}
            {chDepenses.length === 0 && <p className="text-center text-slate-400 py-4">Aucune dépense</p>}
          </div>
        </div>

        {/* Carnet photos */}
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">📸 Carnet photos</h3>
            <label className="px-4 py-2 text-white rounded-xl cursor-pointer text-sm" style={{background: couleur}}>+ Photo<input type="file" accept="image/*" onChange={addPhoto} className="hidden" /></label>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(ch.photos || []).map(p => (
              <div key={p.id} className="relative aspect-square">
                <img src={p.src} className="w-full h-full object-cover rounded-xl" alt="" />
                <span className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-2 py-0.5 rounded">{new Date(p.date).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
            {(ch.photos || []).length === 0 && <p className="col-span-full text-center text-slate-400 py-8">Prenez des photos avant/après</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4">📝 Notes</h3>
          <textarea value={ch.notes || ''} onChange={e => updateChantier(view, { notes: e.target.value })} placeholder="Notes libres..." className="w-full h-32 px-4 py-3 border rounded-xl resize-none" />
        </div>
      </div>
    );
  }

  // Formulaire nouveau chantier
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">Nouveau chantier</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Nom du chantier *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Ex: Rénovation salle de bain Dupont" /></div>
          <div><label className="block text-sm font-medium mb-1">Client</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Date début</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button>
        </div>
      </div>
    </div>
  );

  // Liste chantiers
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chantiers</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button>
      </div>
      {chantiers.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <p className="text-5xl mb-4">🏗️</p>
          <h3 className="font-semibold mb-2">Aucun chantier</h3>
          <p className="text-slate-500">Créez votre premier chantier</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chantiers.map(c => {
            const bilan = getChantierBilan(c.id);
            const client = clients.find(cl => cl.id === c.client_id);
            const tachesDone = (c.taches || []).filter(t => t.done).length;
            const tachesTotal = (c.taches || []).length;
            return (
              <div key={c.id} onClick={() => setView(c.id)} className="bg-white rounded-2xl border p-5 hover:shadow-lg cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{c.nom}</h3>
                      <span className="px-2 py-0.5 rounded text-xs" style={{background: `${couleur}20`, color: couleur}}>{STATUTS[c.statut]}</span>
                    </div>
                    <p className="text-sm text-slate-500">{client?.nom || 'Sans client'} • {c.adresse || '-'}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      {tachesTotal > 0 && <span>📋 {tachesDone}/{tachesTotal}</span>}
                      {(c.photos || []).length > 0 && <span>📸 {c.photos.length}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${bilan.marge >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {bilan.marge >= 0 ? '+' : ''}{bilan.marge.toLocaleString('fr-FR')}€
                    </p>
                    <p className="text-xs text-slate-400">marge</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
