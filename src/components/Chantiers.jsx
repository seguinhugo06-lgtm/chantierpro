import React, { useState } from 'react';

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, depenses, setDepenses, getChantierBilan, couleur, modeDiscret, entreprise, equipe }) {
  const [view, setView] = useState(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', date_debut: '', statut: 'prospect', margePrevisionnelle: 25 });
  const [newTache, setNewTache] = useState('');
  const [newDepense, setNewDepense] = useState({ description: '', montant: '', categorie: 'Matériaux' });
  const [noteText, setNoteText] = useState('');

  const formatMoney = (n) => modeDiscret ? '•••••' : (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + '€';
  const formatPct = (n) => modeDiscret ? '••%' : (n || 0).toFixed(1) + '%';

  const getMargeColor = (taux) => taux >= 20 ? 'text-emerald-600' : taux >= 5 ? 'text-amber-500' : 'text-red-600';
  const getMargeBg = (taux) => taux >= 20 ? 'bg-emerald-100' : taux >= 5 ? 'bg-amber-100' : 'bg-red-100';

  const PHOTO_CATEGORIES = ['avant', 'pendant', 'après', 'litige'];

  const handlePhotoAdd = (e, categorie = 'pendant') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ch = chantiers.find(c => c.id === view);
      if (ch) {
        const photos = [...(ch.photos || []), { id: Date.now().toString(), src: reader.result, categorie, date: new Date().toISOString() }];
        updateChantier(view, { photos });
      }
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = (photoId) => {
    const ch = chantiers.find(c => c.id === view);
    if (ch) updateChantier(view, { photos: ch.photos.filter(p => p.id !== photoId) });
  };

  const addTache = () => {
    if (!newTache.trim()) return;
    const ch = chantiers.find(c => c.id === view);
    if (ch) {
      updateChantier(view, { taches: [...(ch.taches || []), { id: Date.now().toString(), text: newTache, done: false }] });
      setNewTache('');
    }
  };

  const toggleTache = (tacheId) => {
    const ch = chantiers.find(c => c.id === view);
    if (ch) updateChantier(view, { taches: ch.taches.map(t => t.id === tacheId ? { ...t, done: !t.done } : t) });
  };

  const addDepenseToChantier = () => {
    if (!newDepense.description || !newDepense.montant) return;
    const dep = { id: Date.now().toString(), chantierId: view, ...newDepense, montant: parseFloat(newDepense.montant), date: new Date().toISOString().split('T')[0] };
    setDepenses([...depenses, dep]);
    setNewDepense({ description: '', montant: '', categorie: 'Matériaux' });
  };

  const saveNotes = () => {
    updateChantier(view, { notes: noteText });
  };

  const submit = () => {
    if (!form.nom) return alert('Nom requis');
    addChantier(form);
    setShow(false);
    setForm({ nom: '', client_id: '', adresse: '', date_debut: '', statut: 'prospect', margePrevisionnelle: 25 });
  };

  // Vue détail
  if (view) {
    const ch = chantiers.find(c => c.id === view);
    if (!ch) { setView(null); return null; }
    const client = clients.find(c => c.id === ch.client_id);
    const bilan = getChantierBilan(ch.id);
    const chDepenses = depenses.filter(d => d.chantierId === ch.id);
    const tasksDone = ch.taches?.filter(t => t.done).length || 0;
    const tasksTotal = ch.taches?.length || 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView(null)} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{ch.nom}</h1>
            <p className="text-slate-500">{client?.nom} • {ch.adresse}</p>
          </div>
          <select value={ch.statut} onChange={e => updateChantier(ch.id, { statut: e.target.value })} className="px-4 py-2 border rounded-xl">
            <option value="prospect">Prospect</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
          </select>
        </div>

        {/* Widget Santé Financière */}
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">💰 Santé Financière</h3>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getMargeBg(bilan.tauxMarge)} ${getMargeColor(bilan.tauxMarge)}`}>
                {formatPct(bilan.tauxMarge)} marge
              </span>
              {!modeDiscret && bilan.ecartMarge !== 0 && (
                <span className={`text-xs ${bilan.ecartMarge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {bilan.ecartMarge >= 0 ? '↑' : '↓'} {Math.abs(bilan.ecartMarge).toFixed(1)}% vs prévu ({ch.margePrevisionnelle || 25}%)
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">CA HT</p>
              <p className="text-lg font-bold" style={{color: couleur}}>{formatMoney(bilan.caHT)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">Matériaux</p>
              <p className="text-lg font-bold text-red-500">{formatMoney(bilan.coutMateriaux)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">MO ({bilan.heuresTotal}h)</p>
              <p className="text-lg font-bold text-blue-500">{formatMoney(bilan.coutMO)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">Frais ({ch.fraisFixes || entreprise.tauxFraisStructure}%)</p>
              <p className="text-lg font-bold text-purple-500">{formatMoney(bilan.fraisFixes)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">Marge nette</p>
              <p className={`text-lg font-bold ${getMargeColor(bilan.tauxMarge)}`}>{formatMoney(bilan.marge)}</p>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-slate-500">Marge prévisionnelle (%)</label>
            <input type="number" value={ch.margePrevisionnelle || 25} onChange={e => updateChantier(ch.id, { margePrevisionnelle: parseFloat(e.target.value) || 25 })} className="w-20 ml-2 px-2 py-1 border rounded text-sm" />
          </div>
        </div>

        {/* Tâches */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4">📋 Tâches {tasksTotal > 0 && `(${tasksDone}/${tasksTotal})`}</h3>
          {tasksTotal > 0 && (
            <div className="w-full h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
              <div className="h-full rounded-full" style={{width: `${(tasksDone/tasksTotal)*100}%`, background: couleur}}></div>
            </div>
          )}
          <div className="space-y-2 mb-4">
            {ch.taches?.map(t => (
              <div key={t.id} onClick={() => toggleTache(t.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${t.done ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                <span className="text-xl">{t.done ? '✅' : '⬜'}</span>
                <span className={t.done ? 'line-through text-slate-400' : ''}>{t.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input placeholder="Nouvelle tâche..." value={newTache} onChange={e => setNewTache(e.target.value)} onKeyPress={e => e.key === 'Enter' && addTache()} className="flex-1 px-4 py-2.5 border rounded-xl" />
            <button onClick={addTache} className="px-4 py-2.5 text-white rounded-xl" style={{background: couleur}}>+</button>
          </div>
        </div>

        {/* Photos avec catégories */}
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">📸 Carnet Photos</h3>
            <div className="flex gap-2">
              {PHOTO_CATEGORIES.map(cat => (
                <label key={cat} className="px-3 py-1.5 text-white rounded-lg cursor-pointer text-xs" style={{background: cat === 'litige' ? '#ef4444' : cat === 'avant' ? '#3b82f6' : cat === 'après' ? '#22c55e' : couleur}}>
                  + {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  <input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoAdd(e, cat)} className="hidden" />
                </label>
              ))}
            </div>
          </div>
          {(!ch.photos || ch.photos.length === 0) ? (
            <p className="text-slate-400 text-center py-8">Aucune photo</p>
          ) : (
            <div className="space-y-4">
              {PHOTO_CATEGORIES.map(cat => {
                const catPhotos = ch.photos.filter(p => p.categorie === cat);
                if (catPhotos.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="text-sm font-medium mb-2 capitalize">{cat} ({catPhotos.length})</p>
                    <div className="flex gap-2 flex-wrap">
                      {catPhotos.map(p => (
                        <div key={p.id} className="relative group">
                          <img src={p.src} className="w-24 h-24 object-cover rounded-xl" alt="" />
                          <button onClick={() => deletePhoto(p.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100">✕</button>
                          <p className="text-xs text-slate-400 text-center">{new Date(p.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dépenses */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4">🧾 Dépenses Matériaux</h3>
          <div className="space-y-2 mb-4">
            {chDepenses.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 text-sm w-24">{new Date(d.date).toLocaleDateString('fr-FR')}</span>
                <span className="flex-1">{d.description}</span>
                <span className="text-xs text-slate-400">{d.categorie}</span>
                <span className="font-bold text-red-500">{formatMoney(d.montant)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <input placeholder="Description" value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} className="flex-1 min-w-[150px] px-4 py-2.5 border rounded-xl" />
            <input type="number" placeholder="Montant" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} className="w-28 px-4 py-2.5 border rounded-xl" />
            <select value={newDepense.categorie} onChange={e => setNewDepense(p => ({...p, categorie: e.target.value}))} className="px-3 py-2.5 border rounded-xl">
              <option>Matériaux</option>
              <option>Location</option>
              <option>Sous-traitance</option>
              <option>Autre</option>
            </select>
            <button onClick={addDepenseToChantier} className="px-4 py-2.5 text-white rounded-xl" style={{background: couleur}}>+</button>
          </div>
        </div>

        {/* Notes avec mention */}
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold mb-4">📝 Notes</h3>
          <textarea 
            className="w-full px-4 py-3 border rounded-xl" 
            rows={4} 
            value={noteText || ch.notes || ''} 
            onChange={e => setNoteText(e.target.value)}
            onBlur={saveNotes}
            placeholder="Notes internes... Utilisez @nom pour mentionner un employé"
          />
          {equipe && equipe.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Mentionner:</span>
              {equipe.map(e => (
                <button key={e.id} onClick={() => setNoteText((noteText || ch.notes || '') + ` @${e.nom}`)} className="text-xs px-2 py-1 bg-slate-100 rounded">@{e.nom}</button>
              ))}
            </div>
          )}
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
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Rénovation SDB Dupont" /></div>
          <div><label className="block text-sm font-medium mb-1">Client</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Adresse</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date début</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Statut</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.statut} onChange={e => setForm(p => ({...p, statut: e.target.value}))}><option value="prospect">Prospect</option><option value="en_cours">En cours</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Marge prévisionnelle (%)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.margePrevisionnelle} onChange={e => setForm(p => ({...p, margePrevisionnelle: parseFloat(e.target.value) || 25}))} /></div>
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
        <h1 className="text-2xl font-bold">Chantiers ({chantiers.length})</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button>
      </div>

      {chantiers.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <p className="text-5xl mb-4">🏗️</p>
          <p className="text-slate-500">Aucun chantier</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {chantiers.map(ch => {
            const client = clients.find(c => c.id === ch.client_id);
            const bilan = getChantierBilan(ch.id);
            const tasksDone = ch.taches?.filter(t => t.done).length || 0;
            const tasksTotal = ch.taches?.length || 0;
            return (
              <div key={ch.id} onClick={() => setView(ch.id)} className="bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{ch.nom}</h3>
                    <p className="text-sm text-slate-500">{client?.nom} • {ch.adresse}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm ${ch.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' : ch.statut === 'termine' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                      {ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : 'Prospect'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`font-bold ${getMargeColor(bilan.tauxMarge)}`}>{formatPct(bilan.tauxMarge)} marge</span>
                  <span className="text-slate-400">|</span>
                  <span style={{color: couleur}}>{formatMoney(bilan.marge)}</span>
                  {tasksTotal > 0 && <><span className="text-slate-400">|</span><span>📋 {tasksDone}/{tasksTotal}</span></>}
                  {ch.photos?.length > 0 && <><span className="text-slate-400">|</span><span>📸 {ch.photos.length}</span></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
