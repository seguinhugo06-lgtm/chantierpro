import React, { useState, useEffect } from 'react';

const PHOTO_CATS = ['avant', 'pendant', 'après', 'litige'];

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, depenses, setDepenses, pointages, setPointages, equipe, devis, ajustements, addAjustement, deleteAjustement, getChantierBilan, couleur, modeDiscret, entreprise, selectedChantier, setSelectedChantier, catalogue, deductStock, isDark }) {
  const [view, setView] = useState(selectedChantier || null);
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState('finances');
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', date_debut: '', date_fin: '', statut: 'prospect', avancement: 0 });
  const [newTache, setNewTache] = useState('');
  const [newDepense, setNewDepense] = useState({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '' });
  const [showAjustement, setShowAjustement] = useState(null);
  const [showMODetail, setShowMODetail] = useState(false);
  const [showAddMO, setShowAddMO] = useState(false);
  const [showQuickMateriau, setShowQuickMateriau] = useState(false); // Modal ajout rapide matériau
  const [adjForm, setAdjForm] = useState({ libelle: '', montant_ht: '' });
  const [moForm, setMoForm] = useState({ employeId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });

  useEffect(() => { if (selectedChantier) setView(selectedChantier); }, [selectedChantier]);

  const formatMoney = (n) => modeDiscret ? 'â€¢â€¢â€¢â€¢â€¢' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' â‚¬';
  const formatPct = (n) => modeDiscret ? 'â€¢â€¢%' : (n || 0).toFixed(1) + '%';
  const getMargeColor = (t) => t < 0 ? 'text-red-500' : t < 15 ? 'text-amber-500' : 'text-emerald-500';
  const getMargeBg = (t) => t < 0 ? 'bg-red-50' : t < 15 ? 'bg-amber-50' : 'bg-emerald-50';

  // Handlers
  const handlePhotoAdd = (e, cat = 'pendant') => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { photos: [...(ch.photos || []), { id: Date.now().toString(), src: reader.result, categorie: cat, date: new Date().toISOString() }] }); }; reader.readAsDataURL(file); };
  const deletePhoto = (id) => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { photos: ch.photos.filter(p => p.id !== id) }); };
  const addTache = () => { if (!newTache.trim()) return; const ch = chantiers.find(c => c.id === view); if (ch) { updateChantier(view, { taches: [...(ch.taches || []), { id: Date.now().toString(), text: newTache, done: false }] }); setNewTache(''); } };
  const toggleTache = (id) => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { taches: ch.taches.map(t => t.id === id ? { ...t, done: !t.done } : t) }); };
  const addDepenseToChantier = () => { if (!newDepense.description || !newDepense.montant) return; setDepenses([...depenses, { id: Date.now().toString(), chantierId: view, ...newDepense, montant: parseFloat(newDepense.montant), date: new Date().toISOString().split('T')[0] }]); if (newDepense.catalogueId && deductStock) deductStock(newDepense.catalogueId, 1); setNewDepense({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '' }); setShowQuickMateriau(false); };
  const handleAddAjustement = () => { if (!adjForm.libelle || !adjForm.montant_ht) return; addAjustement({ chantierId: view, type: showAjustement, libelle: adjForm.libelle, montant_ht: parseFloat(adjForm.montant_ht) }); setAdjForm({ libelle: '', montant_ht: '' }); setShowAjustement(null); };
  const handleAddMO = () => { if (!moForm.employeId || !moForm.heures) return; setPointages([...pointages, { id: Date.now().toString(), employeId: moForm.employeId, chantierId: view, date: moForm.date, heures: parseFloat(moForm.heures), note: moForm.note, manuel: true, approuve: true }]); setMoForm({ employeId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' }); setShowAddMO(false); };
  const handleEditPointage = (id, field, value) => setPointages(pointages.map(p => p.id === id ? { ...p, [field]: field === 'heures' ? parseFloat(value) || 0 : value } : p));
  const deletePointage = (id) => { if (confirm('Supprimer ?')) setPointages(pointages.filter(p => p.id !== id)); };
  const submit = () => { if (!form.nom) return alert('Nom requis'); addChantier(form); setShow(false); setForm({ nom: '', client_id: '', adresse: '', date_debut: '', date_fin: '', statut: 'prospect', avancement: 0 }); };

  // Vue détail chantier
  if (view) {
    const ch = chantiers.find(c => c.id === view);
    if (!ch) { setView(null); return null; }
    const client = clients.find(c => c.id === ch.client_id);
    const bilan = getChantierBilan(ch.id);
    const chDepenses = depenses.filter(d => d.chantierId === ch.id);
    const chPointages = pointages.filter(p => p.chantierId === ch.id);
    const chAjustements = (ajustements || []).filter(a => a.chantierId === ch.id);
    const adjRevenus = chAjustements.filter(a => a.type === 'REVENU');
    const adjDepenses = chAjustements.filter(a => a.type === 'DEPENSE');
    const tasksDone = ch.taches?.filter(t => t.done).length || 0;
    const tasksTotal = ch.taches?.length || 0;
    
    // Devis lié
    const devisLie = devis?.find(d => d.chantier_id === ch.id && d.type === 'devis');
    const devisHT = devisLie?.total_ht || 0;
    const devisMateriaux = devisLie?.lignes?.filter(l => l.categorie === 'Matériaux').reduce((s, l) => s + (l.montant || 0), 0) || devisHT * 0.4;
    const devisMO = devisLie?.lignes?.filter(l => l.categorie === 'Main d\'Å“uvre').reduce((s, l) => s + (l.montant || 0), 0) || devisHT * 0.3;
    const devisMarge = devisHT - devisMateriaux - devisMO;
    
    // Projections
    const avancement = ch.avancement || (tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 50);
    const depensesFinalesEstimees = avancement > 0 ? (bilan.coutMateriaux + bilan.coutMO) / (avancement / 100) : 0;
    const beneficeProjecte = bilan.caHT - depensesFinalesEstimees;
    const tauxMargeProjecte = bilan.caHT > 0 ? (beneficeProjecte / bilan.caHT) * 100 : 0;
    
    // Alertes
    const depassementBudget = devisHT > 0 && (bilan.coutMateriaux + bilan.coutMO) > (devisMateriaux + devisMO) * 1.2;
    const margeNegative = bilan.tauxMarge < 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => { setView(null); setSelectedChantier?.(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-xl">â†</button>
          <div className="flex-1 min-w-0"><h1 className="text-2xl font-bold truncate">{ch.nom}</h1><p className="text-slate-500">{client?.nom} â€¢ {ch.adresse}</p></div>
          <select value={ch.statut} onChange={e => updateChantier(ch.id, { statut: e.target.value })} className="px-4 py-2 border rounded-xl">
            <option value="prospect">Prospect</option><option value="en_cours">En cours</option><option value="termine">Terminé</option>
          </select>
        </div>

        {/* Alertes */}
        {(depassementBudget || margeNegative) && (
          <div className={`rounded-2xl p-4 ${margeNegative ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{margeNegative ? 'ðŸš¨' : 'âš ï¸'}</span>
              <div>
                <p className="font-semibold">{margeNegative ? 'Marge négative !' : 'Dépassement budget'}</p>
                <p className="text-sm text-slate-600">{margeNegative ? 'Ce chantier est actuellement en perte. Analysez les dépassements.' : 'Les dépenses dépassent le budget prévu de >20%'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Widget Santé Financière */}
        <div className={`${getMargeBg(bilan.tauxMarge)} rounded-2xl border p-5`}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-lg">ðŸ’° Santé Financière</h3>
            <div className={`px-4 py-2 rounded-xl text-xl font-bold ${getMargeColor(bilan.tauxMarge)}`}>
              {formatMoney(bilan.marge)} <span className="text-base">({formatPct(bilan.tauxMarge)})</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md" onClick={() => setShowAjustement('REVENU')}>
              <div className="flex justify-between mb-1"><p className="text-xs text-slate-500">CA HT</p><span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">+ Ajuster</span></div>
              <p className="text-xl font-bold" style={{color: couleur}}>{formatMoney(bilan.caHT)}</p>
              {bilan.adjRevenus > 0 && <p className="text-xs text-emerald-600">+{formatMoney(bilan.adjRevenus)} ajustés</p>}
            </div>
            <div className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-all group" onClick={() => setShowQuickMateriau(true)}>
              <div className="flex justify-between mb-1">
                <p className="text-xs text-slate-500">Matériaux</p>
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">+ Ajouter</span>
              </div>
              <p className="text-xl font-bold text-red-500">{formatMoney(bilan.coutMateriaux)}</p>
              {devisMateriaux > 0 && <p className={`text-xs ${bilan.coutMateriaux > devisMateriaux ? 'text-red-600' : 'text-emerald-600'}`}>{bilan.coutMateriaux > devisMateriaux ? 'â†‘' : 'â†“'} vs devis {formatMoney(devisMateriaux)}</p>}
            </div>
            <div className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md" onClick={() => setShowMODetail(true)}>
              <div className="flex justify-between mb-1"><p className="text-xs text-slate-500">MO ({bilan.heuresTotal}h)</p><span className="text-xs text-slate-400">Détail â†’</span></div>
              <p className="text-xl font-bold text-blue-500">{formatMoney(bilan.coutMO)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md" onClick={() => setShowAjustement('DEPENSE')}>
              <div className="flex justify-between mb-1"><p className="text-xs text-slate-500">Autres</p><span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">+ Ajuster</span></div>
              <p className="text-xl font-bold text-red-500">{formatMoney(bilan.adjDepenses + bilan.fraisFixes)}</p>
            </div>
          </div>

          {/* Avancement */}
          <div className="bg-white rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Avancement estimé</span>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="100" value={avancement} onChange={e => updateChantier(ch.id, { avancement: parseInt(e.target.value) })} className="w-24" />
                <span className="font-bold" style={{ color: couleur }}>{avancement.toFixed(0)}%</span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${avancement}%`, background: couleur }} /></div>
          </div>

          {/* Projection */}
          {avancement > 0 && avancement < 100 && (
            <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-4">
              <h4 className="font-medium mb-3">ðŸ“ˆ Projection Fin de Chantier</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xs text-slate-500">Dépenses finales</p><p className="font-bold text-red-500">{formatMoney(depensesFinalesEstimees)}</p></div>
                <div><p className="text-xs text-slate-500">Bénéfice projeté</p><p className={`font-bold ${getMargeColor(tauxMargeProjecte)}`}>{formatMoney(beneficeProjecte)}</p></div>
                <div><p className="text-xs text-slate-500">Marge projetée</p><p className={`font-bold ${getMargeColor(tauxMargeProjecte)}`}>{formatPct(tauxMargeProjecte)}</p></div>
              </div>
            </div>
          )}

          {/* Comparaison Devis vs Réel */}
          {devisHT > 0 && !modeDiscret && (
            <div className="bg-white rounded-xl p-4 mt-4">
              <h4 className="font-medium mb-3">ðŸ“Š Devis vs Réel</h4>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2">Poste</th><th className="text-right py-2">Devis</th><th className="text-right py-2">Réel</th><th className="text-right py-2">Écart</th></tr></thead>
                <tbody>
                  <tr className="border-b"><td className="py-2">CA HT</td><td className="text-right">{formatMoney(devisHT)}</td><td className="text-right">{formatMoney(bilan.caHT)}</td><td className={`text-right ${bilan.caHT >= devisHT ? 'text-emerald-500' : 'text-red-500'}`}>{bilan.caHT >= devisHT ? '+' : ''}{formatMoney(bilan.caHT - devisHT)}</td></tr>
                  <tr className="border-b"><td className="py-2">Matériaux</td><td className="text-right">{formatMoney(devisMateriaux)}</td><td className="text-right">{formatMoney(bilan.coutMateriaux)}</td><td className={`text-right ${bilan.coutMateriaux <= devisMateriaux ? 'text-emerald-500' : 'text-red-500'}`}>{bilan.coutMateriaux <= devisMateriaux ? '' : '+'}{formatMoney(bilan.coutMateriaux - devisMateriaux)}</td></tr>
                  <tr className="border-b"><td className="py-2">Main d'Å“uvre</td><td className="text-right">{formatMoney(devisMO)}</td><td className="text-right">{formatMoney(bilan.coutMO)}</td><td className={`text-right ${bilan.coutMO <= devisMO ? 'text-emerald-500' : 'text-red-500'}`}>{bilan.coutMO <= devisMO ? '' : '+'}{formatMoney(bilan.coutMO - devisMO)}</td></tr>
                  <tr className="font-bold"><td className="py-2">Marge</td><td className="text-right">{formatMoney(devisMarge)}</td><td className="text-right">{formatMoney(bilan.marge)}</td><td className={`text-right ${bilan.marge >= devisMarge ? 'text-emerald-500' : 'text-red-500'}`}>{bilan.marge >= devisMarge ? '+' : ''}{formatMoney(bilan.marge - devisMarge)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className="flex gap-2 border-b overflow-x-auto pb-2">
          {[['finances', 'ðŸ’° Finances'], ['taches', 'ðŸ“‹ Tâches'], ['photos', 'ðŸ“¸ Photos'], ['notes', 'ðŸ“ Notes']].map(([k, v]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-t-xl whitespace-nowrap font-medium ${activeTab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`}>{v}</button>
          ))}
        </div>

        {activeTab === 'finances' && (
          <div className="space-y-4">
            {adjRevenus.length > 0 && (
              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-semibold mb-3 text-emerald-600">ðŸ“ˆ Ajustements Revenus</h3>
                {adjRevenus.map(a => (<div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0"><span>{a.libelle}</span><div className="flex items-center gap-3"><span className="font-bold text-emerald-600">+{formatMoney(a.montant_ht)}</span><button onClick={() => deleteAjustement(a.id)} className="text-red-400 hover:text-red-600">âœ•</button></div></div>))}
              </div>
            )}
            {adjDepenses.length > 0 && (
              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-semibold mb-3 text-red-600">ðŸ“‰ Ajustements Dépenses</h3>
                {adjDepenses.map(a => (<div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0"><span>{a.libelle}</span><div className="flex items-center gap-3"><span className="font-bold text-red-600">-{formatMoney(a.montant_ht)}</span><button onClick={() => deleteAjustement(a.id)} className="text-red-400 hover:text-red-600">âœ•</button></div></div>))}
              </div>
            )}
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold mb-4">ðŸ§¾ Dépenses Matériaux</h3>
              <div className="space-y-2 mb-4">{chDepenses.map(d => (<div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><span className="text-slate-500 text-sm w-24">{new Date(d.date).toLocaleDateString('fr-FR')}</span><span className="flex-1">{d.description}</span><span className="text-xs bg-slate-200 px-2 py-1 rounded">{d.categorie}</span><span className="font-bold text-red-500">{formatMoney(d.montant)}</span></div>))}{chDepenses.length === 0 && <p className="text-center text-slate-400 py-4">Aucune dépense</p>}</div>
              <div className="flex gap-2 flex-wrap">
                <select value={newDepense.catalogueId} onChange={e => { const item = catalogue?.find(c => c.id === e.target.value); if (item) setNewDepense(p => ({...p, catalogueId: e.target.value, description: item.nom, montant: item.prixAchat?.toString() || '' })); }} className="px-3 py-2.5 border rounded-xl text-sm"><option value="">Catalogue...</option>{catalogue?.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.prixAchat}â‚¬)</option>)}</select>
                <input placeholder="Description" value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} className="flex-1 min-w-[150px] px-4 py-2.5 border rounded-xl" />
                <input type="number" placeholder="Montant" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} className="w-28 px-4 py-2.5 border rounded-xl" />
                <button onClick={addDepenseToChantier} className="px-4 py-2.5 text-white rounded-xl" style={{background: couleur}}>+</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'taches' && (
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold mb-4">ðŸ“‹ Tâches {tasksTotal > 0 && `(${tasksDone}/${tasksTotal})`}</h3>
            {tasksTotal > 0 && <div className="w-full h-2 bg-slate-100 rounded-full mb-4 overflow-hidden"><div className="h-full rounded-full" style={{width: `${(tasksDone/tasksTotal)*100}%`, background: couleur}} /></div>}
            <div className="space-y-2 mb-4">{ch.taches?.map(t => (<div key={t.id} onClick={() => toggleTache(t.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${t.done ? 'bg-emerald-50' : 'bg-slate-50'}`}><span className="text-xl">{t.done ? 'âœ…' : 'â¬œ'}</span><span className={t.done ? 'line-through text-slate-400' : ''}>{t.text}</span></div>))}</div>
            <div className="flex gap-2"><input placeholder="Nouvelle tâche..." value={newTache} onChange={e => setNewTache(e.target.value)} onKeyPress={e => e.key === 'Enter' && addTache()} className="flex-1 px-4 py-2.5 border rounded-xl" /><button onClick={addTache} className="px-4 py-2.5 text-white rounded-xl" style={{background: couleur}}>+</button></div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="font-semibold">ðŸ“¸ Carnet Photos</h3>
              <div className="flex gap-2 flex-wrap">{PHOTO_CATS.map(cat => (<label key={cat} className="px-3 py-1.5 text-white rounded-lg cursor-pointer text-xs" style={{background: cat === 'litige' ? '#ef4444' : cat === 'avant' ? '#3b82f6' : cat === 'après' ? '#22c55e' : couleur}}>+ {cat}<input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoAdd(e, cat)} className="hidden" /></label>))}</div>
            </div>
            {(!ch.photos || ch.photos.length === 0) ? <p className="text-slate-400 text-center py-8">Aucune photo</p> : (
              <div className="space-y-4">{PHOTO_CATS.map(cat => { const catPhotos = (ch.photos || []).filter(p => p.categorie === cat); if (catPhotos.length === 0) return null; return (<div key={cat}><p className="text-sm font-medium mb-2 capitalize">{cat} ({catPhotos.length})</p><div className="flex gap-2 flex-wrap">{catPhotos.map(p => (<div key={p.id} className="relative group"><img src={p.src} className="w-24 h-24 object-cover rounded-xl" alt="" /><button onClick={() => deletePhoto(p.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100">âœ•</button></div>))}</div></div>); })}</div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold mb-4">ðŸ“ Notes</h3>
            <textarea className="w-full px-4 py-3 border rounded-xl" rows={6} value={ch.notes || ''} onChange={e => updateChantier(ch.id, { notes: e.target.value })} placeholder="Notes internes..." />
          </div>
        )}

        {/* Modal Ajustement */}
        {showAjustement && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">{showAjustement === 'REVENU' ? 'ðŸ“ˆ Ajustement Revenu' : 'ðŸ“‰ Ajustement Dépense'}</h3>
              <p className="text-sm text-slate-500 mb-4">{showAjustement === 'REVENU' ? 'Ex: Travaux supplémentaires acceptés' : 'Ex: Achat imprévu, sous-traitance...'}</p>
              <div className="space-y-4">
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Libellé" value={adjForm.libelle} onChange={e => setAdjForm(p => ({...p, libelle: e.target.value}))} />
                <input type="number" className="w-full px-4 py-2.5 border rounded-xl" placeholder="Montant HT" value={adjForm.montant_ht} onChange={e => setAdjForm(p => ({...p, montant_ht: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => { setShowAjustement(null); setAdjForm({ libelle: '', montant_ht: '' }); }} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={handleAddAjustement} className="px-4 py-2 text-white rounded-xl" style={{background: showAjustement === 'REVENU' ? '#22c55e' : '#ef4444'}}>Ajouter</button></div>
            </div>
          </div>
        )}

        {/* Modal Ajout Rapide Matériau */}
        {showQuickMateriau && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowQuickMateriau(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">ðŸ§± Ajouter un matériau</h3>
              <p className="text-sm text-slate-500 mb-4">Ajout rapide de dépense matériau</p>
              
              {/* Sélection depuis catalogue */}
              {catalogue && catalogue.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Depuis le catalogue</label>
                  <select 
                    className="w-full px-4 py-2.5 border rounded-xl" 
                    value={newDepense.catalogueId} 
                    onChange={e => { 
                      const item = catalogue.find(c => c.id === e.target.value); 
                      if (item) setNewDepense(p => ({...p, catalogueId: e.target.value, description: item.nom, montant: (item.prixAchat || item.prix || 0).toString() })); 
                    }}
                  >
                    <option value="">Choisir un article...</option>
                    {catalogue.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.prixAchat || c.prix}â‚¬)</option>)}
                  </select>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Ex: Sac de ciment 35kg" value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Montant TTC *</label>
                  <input type="number" className="w-full px-4 py-2.5 border rounded-xl" placeholder="0.00" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Catégorie</label>
                  <select className="w-full px-4 py-2.5 border rounded-xl" value={newDepense.categorie} onChange={e => setNewDepense(p => ({...p, categorie: e.target.value}))}>
                    <option value="Matériaux">Matériaux</option>
                    <option value="Outillage">Outillage</option>
                    <option value="Location">Location</option>
                    <option value="Sous-traitance">Sous-traitance</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowQuickMateriau(false); setNewDepense({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '' }); }} className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl">Annuler</button>
                <button onClick={addDepenseToChantier} disabled={!newDepense.description || !newDepense.montant} className="flex-1 px-4 py-2.5 text-white rounded-xl disabled:opacity-50" style={{background: couleur}}>Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal MO */}
        {showMODetail && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">â±ï¸ Détail Main d'Å’uvre</h3><button onClick={() => setShowAddMO(true)} className="px-3 py-1.5 text-sm text-white rounded-lg" style={{background: couleur}}>+ Heures</button></div>
              <div className="space-y-2 mb-4">{chPointages.map(p => { const emp = equipe.find(e => e.id === p.employeId); const cout = emp?.coutHoraireCharge || 28; return (
                <div key={p.id} className={`p-3 rounded-xl ${p.manuel ? 'bg-blue-50' : 'bg-slate-50'} ${p.verrouille ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span>{p.approuve ? 'âœ…' : 'â³'}</span>{p.manuel && <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">Manuel</span>}{p.verrouille && <span className="text-xs bg-slate-400 text-white px-2 py-0.5 rounded">ðŸ”’</span>}</div>{!p.verrouille && <button onClick={() => deletePointage(p.id)} className="text-red-400">ðŸ—‘ï¸</button>}</div>
                  <div className="grid grid-cols-4 gap-2 mt-2 text-sm"><div><p className="text-xs text-slate-500">Date</p><input type="date" value={p.date} onChange={e => handleEditPointage(p.id, 'date', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded text-xs" /></div><div><p className="text-xs text-slate-500">Employé</p><p className="font-medium">{emp?.nom}</p></div><div><p className="text-xs text-slate-500">Heures</p><input type="number" step="0.5" value={p.heures} onChange={e => handleEditPointage(p.id, 'heures', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded" /></div><div><p className="text-xs text-slate-500">Coût</p><p className="font-bold text-blue-600">{formatMoney(p.heures * cout)}</p></div></div>
                </div>
              ); })}{chPointages.length === 0 && <p className="text-center text-slate-400 py-4">Aucun pointage</p>}</div>
              <div className="border-t pt-4 flex justify-between items-center"><span className="font-semibold">Total</span><span className="text-xl font-bold text-blue-600">{formatMoney(bilan.coutMO)}</span></div>
              <button onClick={() => setShowMODetail(false)} className="w-full mt-4 py-2 bg-slate-100 rounded-xl">Fermer</button>
            </div>
          </div>
        )}

        {/* Modal Ajout MO */}
        {showAddMO && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">+ Ajouter des heures</h3>
              <div className="space-y-4">
                <select className="w-full px-4 py-2.5 border rounded-xl" value={moForm.employeId} onChange={e => setMoForm(p => ({...p, employeId: e.target.value}))}><option value="">Employé *</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select>
                <div className="grid grid-cols-2 gap-4"><input type="date" className="px-4 py-2.5 border rounded-xl" value={moForm.date} onChange={e => setMoForm(p => ({...p, date: e.target.value}))} /><input type="number" step="0.5" placeholder="Heures *" className="px-4 py-2.5 border rounded-xl" value={moForm.heures} onChange={e => setMoForm(p => ({...p, heures: e.target.value}))} /></div>
                <input placeholder="Note (optionnel)" className="w-full px-4 py-2.5 border rounded-xl" value={moForm.note} onChange={e => setMoForm(p => ({...p, note: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowAddMO(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={handleAddMO} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Ajouter</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Formulaire création
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">â†</button><h1 className="text-2xl font-bold">Nouveau chantier</h1></div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Client</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}</select></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date début</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date fin</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_fin} onChange={e => setForm(p => ({...p, date_fin: e.target.value}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button></div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4"><h1 className="text-2xl font-bold">Chantiers ({chantiers.length})</h1><button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button></div>
      {chantiers.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">ðŸ—ï¸</p><p className="text-slate-500">Aucun chantier</p></div> : (
        <div className="grid gap-4">
          {chantiers.map(ch => {
            const client = clients.find(c => c.id === ch.client_id);
            const bilan = getChantierBilan(ch.id);
            const statusColor = ch.statut === 'en_cours' ? 'bg-emerald-100 text-emerald-700' : ch.statut === 'termine' ? 'bg-slate-100' : 'bg-blue-100 text-blue-700';
            const hasAlert = bilan.tauxMarge < 0;
            return (
              <div key={ch.id} onClick={() => setView(ch.id)} className={`bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition ${hasAlert ? 'border-red-300' : ''}`}>
                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                  <div className="min-w-0"><h3 className="font-semibold text-lg truncate">{ch.nom}</h3><p className="text-sm text-slate-500">{client?.nom} â€¢ {ch.adresse}</p></div>
                  <div className="flex items-center gap-2">
                    {hasAlert && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">âš ï¸ Perte</span>}
                    <span className={`px-3 py-1 rounded-full text-sm ${statusColor}`}>{ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : 'Prospect'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className={`font-bold ${getMargeColor(bilan.tauxMarge)}`}>{formatMoney(bilan.marge)}</span>
                  <span className={`px-2 py-0.5 rounded ${getMargeBg(bilan.tauxMarge)} ${getMargeColor(bilan.tauxMarge)}`}>{formatPct(bilan.tauxMarge)}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">CA: {formatMoney(bilan.caHT)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
