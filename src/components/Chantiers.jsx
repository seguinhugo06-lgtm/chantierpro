import React, { useState } from 'react';

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, depenses, setDepenses, pointages, setPointages, equipe, devis, getChantierBilan, couleur, modeDiscret, entreprise, selectedChantier, setSelectedChantier }) {
  const [view, setView] = useState(selectedChantier || null);
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState('finances');
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', date_debut: '', date_fin: '', statut: 'prospect', margePrevisionnelle: 25 });
  const [newTache, setNewTache] = useState('');
  const [newDepense, setNewDepense] = useState({ description: '', montant: '', categorie: 'Matériaux' });
  const [showAjustCA, setShowAjustCA] = useState(false);
  const [showAjustMO, setShowAjustMO] = useState(false);
  const [showMateriauxDetail, setShowMateriauxDetail] = useState(false);
  const [ajustForm, setAjustForm] = useState({ montant: '', raison: '' });
  const [moForm, setMoForm] = useState({ employeId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });

  React.useEffect(() => { if (selectedChantier) setView(selectedChantier); }, [selectedChantier]);

  const formatMoney = (n) => modeDiscret ? '•••••' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  const formatPct = (n) => modeDiscret ? '••%' : (n || 0).toFixed(1) + '%';
  const getMargeColor = (taux) => taux >= 20 ? 'text-emerald-500' : taux >= 5 ? 'text-amber-500' : 'text-red-500';
  const getMargeBgLight = (taux) => taux >= 20 ? 'bg-emerald-50' : taux >= 5 ? 'bg-amber-50' : 'bg-red-50';

  const PHOTO_CATEGORIES = ['avant', 'pendant', 'après', 'litige'];

  const handlePhotoAdd = (e, categorie = 'pendant') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ch = chantiers.find(c => c.id === view);
      if (ch) updateChantier(view, { photos: [...(ch.photos || []), { id: Date.now().toString(), src: reader.result, categorie, date: new Date().toISOString() }] });
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
    setDepenses([...depenses, { id: Date.now().toString(), chantierId: view, ...newDepense, montant: parseFloat(newDepense.montant), date: new Date().toISOString().split('T')[0] }]);
    setNewDepense({ description: '', montant: '', categorie: 'Matériaux' });
  };

  // Ajustement CA
  const handleAjustCA = () => {
    if (!ajustForm.montant) return;
    const ch = chantiers.find(c => c.id === view);
    const ajustements = ch.ajustementsCA || [];
    ajustements.push({ id: Date.now().toString(), montant: parseFloat(ajustForm.montant), raison: ajustForm.raison, date: new Date().toISOString() });
    updateChantier(view, { ajustementsCA: ajustements });
    setAjustForm({ montant: '', raison: '' });
    setShowAjustCA(false);
  };

  // Ajout MO manuel
  const handleAddMO = () => {
    if (!moForm.employeId || !moForm.heures) return;
    const newPointage = {
      id: Date.now().toString(),
      employeId: moForm.employeId,
      chantierId: view,
      date: moForm.date,
      heures: parseFloat(moForm.heures),
      note: moForm.note,
      manuel: true,
      approuve: true
    };
    setPointages([...pointages, newPointage]);
    setMoForm({ employeId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
    setShowAjustMO(false);
  };

  const submit = () => {
    if (!form.nom) return alert('Nom requis');
    addChantier(form);
    setShow(false);
    setForm({ nom: '', client_id: '', adresse: '', date_debut: '', date_fin: '', statut: 'prospect', margePrevisionnelle: 25 });
  };

  // Vue détail
  if (view) {
    const ch = chantiers.find(c => c.id === view);
    if (!ch) { setView(null); return null; }
    const client = clients.find(c => c.id === ch.client_id);
    const bilan = getChantierBilan(ch.id);
    const chDepenses = depenses.filter(d => d.chantierId === ch.id);
    const chPointages = pointages.filter(p => p.chantierId === ch.id);
    const chDevis = devis?.filter(d => d.chantier_id === ch.id) || [];
    const margePrevueDevis = chDevis.filter(d => d.statut === 'accepte').reduce((s, d) => s + (d.total_ht * (d.margePrevue || 25) / 100), 0);
    const ajustementsCA = ch.ajustementsCA || [];
    const totalAjustCA = ajustementsCA.reduce((s, a) => s + a.montant, 0);
    const caTotal = bilan.caHT + totalAjustCA;
    const margeAjustee = caTotal - bilan.coutMateriaux - bilan.coutMO - (caTotal * (ch.fraisFixes || 15) / 100);
    const tauxMargeAjuste = caTotal > 0 ? (margeAjustee / caTotal) * 100 : 0;
    const tasksDone = ch.taches?.filter(t => t.done).length || 0;
    const tasksTotal = ch.taches?.length || 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView(null); if (setSelectedChantier) setSelectedChantier(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
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

        {/* Widget Santé Financière Amélioré */}
        <div className={`${getMargeBgLight(tauxMargeAjuste)} rounded-2xl border p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">💰 Santé Financière</h3>
            <div className={`px-4 py-2 rounded-xl text-xl font-bold ${getMargeColor(tauxMargeAjuste)}`}>
              {formatPct(tauxMargeAjuste)}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* CA - Cliquable */}
            <div className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md" onClick={() => setShowAjustCA(true)}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">CA HT</p>
                <span className="text-xs px-2 py-0.5 rounded" style={{background: `${couleur}20`, color: couleur}}>+ Ajuster</span>
              </div>
              <p className="text-xl font-bold" style={{color: couleur}}>{formatMoney(caTotal)}</p>
              {totalAjustCA !== 0 && <p className="text-xs text-slate-400">dont {formatMoney(totalAjustCA)} ajusté</p>}
            </div>

            {/* Matériaux - Cliquable */}
            <div className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md" onClick={() => setShowMateriauxDetail(true)}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">Matériaux</p>
                <span className="text-xs text-slate-400">Détail →</span>
              </div>
              <p className="text-xl font-bold text-red-500">{formatMoney(bilan.coutMateriaux)}</p>
            </div>

            {/* MO - Cliquable */}
            <div className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md" onClick={() => setShowAjustMO(true)}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">MO ({bilan.heuresTotal}h)</p>
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">+ Heures</span>
              </div>
              <p className="text-xl font-bold text-blue-500">{formatMoney(bilan.coutMO)}</p>
            </div>

            {/* Marge */}
            <div className="bg-white rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Marge Nette</p>
              <p className={`text-xl font-bold ${getMargeColor(tauxMargeAjuste)}`}>{formatMoney(margeAjustee)}</p>
            </div>
          </div>

          {/* Budget vs Réel */}
          {margePrevueDevis > 0 && !modeDiscret && (
            <div className="bg-white rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500">Marge prévue au devis</p>
                  <p className="font-bold text-lg">{formatMoney(margePrevueDevis)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Écart</p>
                  <p className={`font-bold text-lg ${margeAjustee >= margePrevueDevis ? 'text-emerald-500' : margeAjustee < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                    {margeAjustee >= margePrevueDevis ? '↑' : '↓'} {formatMoney(Math.abs(margeAjustee - margePrevueDevis))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Marge actuelle</p>
                  <p className={`font-bold text-lg ${getMargeColor(tauxMargeAjuste)}`}>{formatMoney(margeAjustee)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className="flex gap-2 border-b overflow-x-auto pb-2">
          {[['finances', '💰 Finances'], ['taches', '📋 Tâches'], ['photos', '📸 Photos'], ['notes', '📝 Notes']].map(([k, v]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-t-xl whitespace-nowrap font-medium ${activeTab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`}>{v}</button>
          ))}
        </div>

        {/* Contenu onglets */}
        {activeTab === 'finances' && (
          <div className="space-y-4">
            {/* Dépenses */}
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold mb-4">🧾 Dépenses Matériaux</h3>
              <div className="space-y-2 mb-4">
                {chDepenses.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 text-sm w-24">{new Date(d.date).toLocaleDateString('fr-FR')}</span>
                    <span className="flex-1">{d.description}</span>
                    <span className="text-xs bg-slate-200 px-2 py-1 rounded">{d.categorie}</span>
                    <span className="font-bold text-red-500">{formatMoney(d.montant)}</span>
                  </div>
                ))}
                {chDepenses.length === 0 && <p className="text-center text-slate-400 py-4">Aucune dépense</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <input placeholder="Description" value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} className="flex-1 min-w-[150px] px-4 py-2.5 border rounded-xl" />
                <input type="number" placeholder="Montant" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} className="w-28 px-4 py-2.5 border rounded-xl" />
                <select value={newDepense.categorie} onChange={e => setNewDepense(p => ({...p, categorie: e.target.value}))} className="px-3 py-2.5 border rounded-xl">
                  <option>Matériaux</option><option>Location</option><option>Sous-traitance</option><option>Autre</option>
                </select>
                <button onClick={addDepenseToChantier} className="px-4 py-2.5 text-white rounded-xl" style={{background: couleur}}>+</button>
              </div>
            </div>

            {/* Pointages */}
            <div className="bg-white rounded-2xl border p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">⏱️ Heures pointées</h3>
                <button onClick={() => setShowAjustMO(true)} className="text-sm px-3 py-1 rounded-lg" style={{background: `${couleur}20`, color: couleur}}>+ Ajouter</button>
              </div>
              <div className="space-y-2">
                {chPointages.map(p => {
                  const emp = equipe.find(e => e.id === p.employeId);
                  return (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${p.manuel ? 'bg-blue-50' : 'bg-slate-50'}`}>
                      <span>{p.approuve ? '✅' : '⏳'}</span>
                      <span className="text-sm w-24">{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                      <span className="flex-1">{emp?.nom} {emp?.prenom}</span>
                      {p.manuel && <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">Manuel</span>}
                      <span className="font-bold">{p.heures}h</span>
                    </div>
                  );
                })}
                {chPointages.length === 0 && <p className="text-center text-slate-400 py-4">Aucun pointage</p>}
              </div>
            </div>

            {/* Ajustements CA */}
            {ajustementsCA.length > 0 && (
              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-semibold mb-4">📊 Ajustements CA</h3>
                <div className="space-y-2">
                  {ajustementsCA.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                      <span className="text-sm w-24">{new Date(a.date).toLocaleDateString('fr-FR')}</span>
                      <span className="flex-1">{a.raison || 'Ajustement'}</span>
                      <span className={`font-bold ${a.montant >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{a.montant >= 0 ? '+' : ''}{formatMoney(a.montant)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'taches' && (
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
        )}

        {activeTab === 'photos' && (
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">📸 Carnet Photos</h3>
              <div className="flex gap-2 flex-wrap">
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
                  const catPhotos = (ch.photos || []).filter(p => p.categorie === cat);
                  if (catPhotos.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-sm font-medium mb-2 capitalize">{cat} ({catPhotos.length})</p>
                      <div className="flex gap-2 flex-wrap">
                        {catPhotos.map(p => (
                          <div key={p.id} className="relative group">
                            <img src={p.src} className="w-24 h-24 object-cover rounded-xl" alt="" />
                            <button onClick={() => deletePhoto(p.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold mb-4">📝 Notes</h3>
            <textarea className="w-full px-4 py-3 border rounded-xl" rows={6} value={ch.notes || ''} onChange={e => updateChantier(ch.id, { notes: e.target.value })} placeholder="Notes internes... Utilisez @nom pour mentionner un employé" />
            {equipe && equipe.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                <span className="text-xs text-slate-500">Mentionner:</span>
                {equipe.map(e => (
                  <button key={e.id} onClick={() => updateChantier(ch.id, { notes: (ch.notes || '') + ` @${e.nom}` })} className="text-xs px-2 py-1 bg-slate-100 rounded">@{e.nom}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Ajust CA */}
        {showAjustCA && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Ajuster le CA</h3>
              <div className="space-y-4">
                <div><label className="block text-sm mb-1">Montant (+ ou -)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={ajustForm.montant} onChange={e => setAjustForm(p => ({...p, montant: e.target.value}))} placeholder="Ex: 150 ou -50" /></div>
                <div><label className="block text-sm mb-1">Raison</label><input className="w-full px-4 py-2.5 border rounded-xl" value={ajustForm.raison} onChange={e => setAjustForm(p => ({...p, raison: e.target.value}))} placeholder="Ex: Supplément peinture plafond" /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAjustCA(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
                <button onClick={handleAjustCA} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Valider</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajout MO */}
        {showAjustMO && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Ajouter des heures</h3>
              <div className="space-y-4">
                <div><label className="block text-sm mb-1">Employé *</label><select className="w-full px-4 py-2.5 border rounded-xl" value={moForm.employeId} onChange={e => setMoForm(p => ({...p, employeId: e.target.value}))}><option value="">Sélectionner...</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm mb-1">Date</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={moForm.date} onChange={e => setMoForm(p => ({...p, date: e.target.value}))} /></div>
                  <div><label className="block text-sm mb-1">Heures *</label><input type="number" step="0.5" className="w-full px-4 py-2.5 border rounded-xl" value={moForm.heures} onChange={e => setMoForm(p => ({...p, heures: e.target.value}))} placeholder="8" /></div>
                </div>
                <div><label className="block text-sm mb-1">Note</label><input className="w-full px-4 py-2.5 border rounded-xl" value={moForm.note} onChange={e => setMoForm(p => ({...p, note: e.target.value}))} placeholder="Ex: Journée de finition" /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAjustMO(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
                <button onClick={handleAddMO} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Détail Matériaux */}
        {showMateriauxDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Détail Matériaux</h3>
              <div className="space-y-2 mb-4">
                {chDepenses.map(d => (
                  <div key={d.id} className="flex justify-between p-3 bg-slate-50 rounded-xl">
                    <span>{d.description}</span>
                    <span className="font-bold text-red-500">{formatMoney(d.montant)}</span>
                  </div>
                ))}
                {chDepenses.length === 0 && <p className="text-center text-slate-400 py-4">Aucune dépense</p>}
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-red-500">{formatMoney(bilan.coutMateriaux)}</span>
              </div>
              <button onClick={() => setShowMateriauxDetail(false)} className="w-full mt-4 py-2 bg-slate-100 rounded-xl">Fermer</button>
            </div>
          </div>
        )}
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
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Client</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date début</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date fin prévue</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_fin} onChange={e => setForm(p => ({...p, date_fin: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Statut</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.statut} onChange={e => setForm(p => ({...p, statut: e.target.value}))}><option value="prospect">Prospect</option><option value="en_cours">En cours</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Marge prévue (%)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.margePrevisionnelle} onChange={e => setForm(p => ({...p, margePrevisionnelle: parseFloat(e.target.value) || 25}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button>
        </div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chantiers ({chantiers.length})</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button>
      </div>

      {chantiers.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">🏗️</p><p className="text-slate-500">Aucun chantier</p></div>
      ) : (
        <div className="grid gap-4">
          {chantiers.map(ch => {
            const client = clients.find(c => c.id === ch.client_id);
            const bilan = getChantierBilan(ch.id);
            const tasksDone = ch.taches?.filter(t => t.done).length || 0;
            const tasksTotal = ch.taches?.length || 0;
            const statusColor = ch.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' : ch.statut === 'termine' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100';
            return (
              <div key={ch.id} onClick={() => setView(ch.id)} className="bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{ch.nom}</h3>
                    <p className="text-sm text-slate-500">{client?.nom} • {ch.adresse}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${statusColor}`}>
                    {ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : 'Prospect'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`font-bold ${getMargeColor(bilan.tauxMarge)}`}>{formatPct(bilan.tauxMarge)}</span>
                  <span className="text-slate-400">|</span>
                  <span style={{color: couleur}}>{formatMoney(bilan.marge)}</span>
                  {tasksTotal > 0 && <><span className="text-slate-400">|</span><span>📋 {tasksDone}/{tasksTotal}</span></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
