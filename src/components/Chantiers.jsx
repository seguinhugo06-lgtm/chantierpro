import React, { useState, useEffect } from 'react';

const STATUTS = { prospect: '🎯 Prospect', devis: '📄 Devis', en_cours: '🔨 En cours', pause: '⏸️ Pause', termine: '✅ Terminé' };

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, stocks }) {
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', date_debut: '', date_fin_prevue: '', budget_prevu: '', statut: 'prospect', progression: 0, materiaux: [] });
  const [showMat, setShowMat] = useState(false);

  useEffect(() => {
    if (edit) setForm({ ...edit, materiaux: edit.materiaux || [] });
    else setForm({ nom: '', client_id: '', adresse: '', date_debut: new Date().toISOString().split('T')[0], date_fin_prevue: '', budget_prevu: '', statut: 'prospect', progression: 0, materiaux: [] });
  }, [edit, show]);

  const submit = () => {
    if (!form.nom) return;
    const data = { ...form, budget_prevu: parseFloat(form.budget_prevu) || 0, progression: parseInt(form.progression) || 0 };
    if (edit) updateChantier(edit.id, data);
    else addChantier(data);
    setShow(false);
    setEdit(null);
  };

  const addMat = (stockId) => {
    const s = stocks.find(x => x.id === stockId);
    if (!s) return;
    const ex = form.materiaux.find(m => m.stockId === stockId);
    if (ex) setForm(p => ({ ...p, materiaux: p.materiaux.map(m => m.stockId === stockId ? { ...m, qte: m.qte + 1 } : m) }));
    else setForm(p => ({ ...p, materiaux: [...p.materiaux, { stockId, nom: s.nom, qte: 1, prix: s.prix || 0 }] }));
  };

  const totalMat = form.materiaux.reduce((s, m) => s + (m.qte * m.prix), 0);

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEdit(null); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">{edit ? 'Modifier' : 'Nouveau'} chantier</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Client</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.client_id} onChange={e => setForm(p => ({...p, client_id: e.target.value}))}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date début</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Date fin</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date_fin_prevue} onChange={e => setForm(p => ({...p, date_fin_prevue: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Budget (€)</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.budget_prevu} onChange={e => setForm(p => ({...p, budget_prevu: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Statut</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.statut} onChange={e => setForm(p => ({...p, statut: e.target.value}))}>{Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Progression (%)</label><input type="number" min="0" max="100" className="w-full px-4 py-2.5 border rounded-xl" value={form.progression} onChange={e => setForm(p => ({...p, progression: e.target.value}))} /></div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">📦 Matériaux</h3>
            <button onClick={() => setShowMat(!showMat)} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm">+ Ajouter</button>
          </div>
          {showMat && (
            <div className="mb-4 p-4 bg-slate-50 rounded-xl grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {stocks.map(s => (
                <button key={s.id} onClick={() => addMat(s.id)} className="p-2 bg-white hover:bg-orange-50 rounded-lg text-left text-sm border">
                  <p className="font-medium truncate">{s.nom}</p>
                  <p className="text-xs text-slate-500">{(s.prix || 0).toFixed(2)}€</p>
                </button>
              ))}
            </div>
          )}
          {form.materiaux.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              {form.materiaux.map((m, i) => (
                <div key={i} className="flex items-center px-4 py-2 border-b last:border-0 gap-3">
                  <span className="flex-1">{m.nom}</span>
                  <input type="number" min="1" value={m.qte} onChange={e => setForm(p => ({ ...p, materiaux: p.materiaux.map((x, j) => j === i ? { ...x, qte: parseInt(e.target.value) || 1 } : x) }))} className="w-20 px-2 py-1 border rounded text-center" />
                  <span className="w-24 text-right">{(m.qte * m.prix).toFixed(2)} €</span>
                  <button onClick={() => setForm(p => ({ ...p, materiaux: p.materiaux.filter((_, j) => j !== i) }))} className="text-red-500">✕</button>
                </div>
              ))}
              <div className="px-4 py-3 bg-slate-50 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-orange-500">{totalMat.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => { setShow(false); setEdit(null); }} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">{edit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chantiers ({chantiers.length})</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button>
      </div>
      {chantiers.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <p className="text-5xl mb-4">🏗️</p>
          <h3>Aucun chantier</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {chantiers.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg cursor-pointer" onClick={() => { setEdit(c); setShow(true); }}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{c.nom}</h3>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs">{STATUTS[c.statut]}</span>
                    {c.materiaux?.length > 0 && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">📦 {c.materiaux.length}</span>}
                  </div>
                  <p className="text-sm text-slate-500">📍 {c.adresse || '-'}</p>
                </div>
                <div className="w-32">
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className="h-full bg-orange-500 rounded-full" style={{width: `${c.progression}%`}} />
                  </div>
                </div>
                <span className="text-sm">{c.progression}%</span>
                <p className="text-xl font-bold">{(c.budget_prevu || 0).toLocaleString('fr-FR')} €</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
