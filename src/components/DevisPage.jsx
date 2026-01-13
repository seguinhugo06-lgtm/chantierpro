import React, { useState, useEffect } from 'react';

const STATUTS = { brouillon: 'bg-slate-200', envoye: 'bg-blue-100 text-blue-700', accepte: 'bg-green-100 text-green-700', refuse: 'bg-red-100 text-red-700', payee: 'bg-emerald-100 text-emerald-700' };

export default function DevisPage({ clients, devis, chantiers, settings, onSubmit, onUpdate, onDelete }) {
  const [show, setShow] = useState(false);
  const [view, setView] = useState(null);
  const [edit, setEdit] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], tvaRate: settings.tvaDefault, notes: '' });
  const [ligne, setLigne] = useState({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité' });

  useEffect(() => {
    if (edit) {
      const d = devis.find(x => x.id === edit);
      if (d) setForm({ clientId: d.client_id, chantierId: d.chantier_id || '', date: d.date, type: d.type, lignes: d.lignes || [], tvaRate: d.tvaRate || 20, notes: d.notes || '' });
    }
  }, [edit, devis]);

  const filtered = devis.filter(d => filter === 'all' || (filter === 'devis' && d.type === 'devis') || (filter === 'factures' && d.type === 'facture') || (filter === 'impayees' && d.type === 'facture' && d.statut !== 'payee'));
  
  const addLigne = () => {
    if (!ligne.description) return;
    setForm(p => ({ ...p, lignes: [...p.lignes, { ...ligne, montant: ligne.quantite * ligne.prixUnitaire }] }));
    setLigne({ description: '', quantite: 1, prixUnitaire: 0, unite: 'unité' });
  };

  const totalHT = form.lignes.reduce((s, l) => s + (l.montant || 0), 0);
  const totalTVA = totalHT * (form.tvaRate / 100);
  const totalTTC = totalHT + totalTVA;

  const submit = () => {
    if (!form.clientId || form.lignes.length === 0) return alert('Client et lignes requis');
    const data = {
      client_id: form.clientId, chantier_id: form.chantierId,
      numero: edit ? devis.find(d => d.id === edit)?.numero : `${form.type === 'devis' ? 'DEV' : 'FACT'}-${Date.now()}`,
      date: form.date, type: form.type,
      statut: edit ? devis.find(d => d.id === edit)?.statut : 'brouillon',
      lignes: form.lignes, total_ht: totalHT, tva: totalTVA, tvaRate: form.tvaRate, total_ttc: totalTTC, notes: form.notes
    };
    if (edit) { onUpdate(edit, data); setEdit(null); } else { onSubmit(data); }
    setShow(false);
    setForm({ clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], tvaRate: settings.tvaDefault, notes: '' });
  };

  // View document
  if (view) {
    const d = devis.find(x => x.id === view);
    if (!d) { setView(null); return null; }
    const cl = clients.find(c => c.id === d.client_id);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView(null)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
          <h1 className="text-2xl font-bold flex-1">{d.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUTS[d.statut]}`}>{d.statut}</span>
        </div>
        <div className="bg-white rounded-2xl border p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 pb-6 border-b">
            <div><p className="text-sm text-slate-500">Type</p><p className="font-semibold capitalize">{d.type}</p></div>
            <div><p className="text-sm text-slate-500">Date</p><p className="font-semibold">{new Date(d.date).toLocaleDateString('fr-FR')}</p></div>
            <div><p className="text-sm text-slate-500">Client</p><p className="font-semibold">{cl?.nom || '-'}</p></div>
          </div>
          <h3 className="font-semibold mb-3">Lignes</h3>
          <div className="border rounded-xl overflow-hidden mb-6">
            {d.lignes?.map((l, i) => (
              <div key={i} className="flex items-center px-4 py-3 border-b last:border-0">
                <span className="flex-1">{l.description}</span>
                <span className="w-20 text-center">{l.quantite} {l.unite}</span>
                <span className="w-28 text-right font-medium">{(l.montant || 0).toFixed(2)} €</span>
              </div>
            ))}
            <div className="p-4 bg-slate-50 space-y-2">
              <div className="flex justify-end gap-8"><span>Total HT</span><span className="font-medium">{(d.total_ht || 0).toFixed(2)} €</span></div>
              <div className="flex justify-end gap-8"><span>TVA ({d.tvaRate || 20}%)</span><span>{(d.tva || 0).toFixed(2)} €</span></div>
              <div className="flex justify-end gap-8 text-lg font-bold text-orange-500 pt-2 border-t"><span>Total TTC</span><span>{(d.total_ttc || 0).toFixed(2)} €</span></div>
            </div>
          </div>
          {d.notes && <div className="mb-6"><p className="text-sm text-slate-500 mb-1">Notes</p><p>{d.notes}</p></div>}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setEdit(d.id); setView(null); setShow(true); }} className="px-4 py-2 bg-slate-100 rounded-xl">✏️ Modifier</button>
            <select value={d.statut} onChange={e => onUpdate(d.id, { statut: e.target.value })} className="px-4 py-2 border rounded-xl">{Object.keys(STATUTS).map(s => <option key={s} value={s}>{s}</option>)}</select>
            <button onClick={() => { if(confirm('Supprimer ?')) { onDelete(d.id); setView(null); }}} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl">🗑️ Supprimer</button>
          </div>
        </div>
      </div>
    );
  }

  // Form
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEdit(null); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">{edit ? 'Modifier' : 'Nouveau'} {form.type}</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <select className="px-4 py-2.5 border rounded-xl" value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Client...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
          <select className="px-4 py-2.5 border rounded-xl" value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Chantier...</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
          <select className="px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="devis">Devis</option><option value="facture">Facture</option></select>
          <input type="date" className="px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <input placeholder="Description" className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg" value={ligne.description} onChange={e => setLigne(p => ({...p, description: e.target.value}))} />
          <input type="number" placeholder="Qté" className="w-20 px-3 py-2 border rounded-lg" value={ligne.quantite} onChange={e => setLigne(p => ({...p, quantite: parseFloat(e.target.value) || 1}))} />
          <select className="w-24 px-2 py-2 border rounded-lg" value={ligne.unite} onChange={e => setLigne(p => ({...p, unite: e.target.value}))}><option>unité</option><option>heure</option><option>m²</option><option>forfait</option></select>
          <input type="number" placeholder="Prix HT" className="w-28 px-3 py-2 border rounded-lg" value={ligne.prixUnitaire || ''} onChange={e => setLigne(p => ({...p, prixUnitaire: parseFloat(e.target.value) || 0}))} />
          <button onClick={addLigne} className="px-4 py-2 bg-orange-500 text-white rounded-lg">+</button>
        </div>
        {form.lignes.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            {form.lignes.map((l, i) => (
              <div key={i} className="flex px-4 py-2 border-b">
                <span className="flex-1">{l.description}</span>
                <span className="w-20 text-center">{l.quantite} {l.unite}</span>
                <span className="w-28 text-right">{l.montant?.toFixed(2)} €</span>
                <button onClick={() => setForm(p => ({...p, lignes: p.lignes.filter((_,j) => j !== i)}))} className="w-10 text-red-500">✕</button>
              </div>
            ))}
            <div className="bg-slate-50 p-4">
              <div className="flex justify-between items-center mb-2"><span>TVA</span><select value={form.tvaRate} onChange={e => setForm(p => ({...p, tvaRate: parseFloat(e.target.value)}))} className="px-2 py-1 border rounded">{settings.tvaRates.map(r => <option key={r} value={r}>{r}%</option>)}</select></div>
              <div className="flex justify-end gap-8"><span>HT</span><span>{totalHT.toFixed(2)} €</span></div>
              <div className="flex justify-end gap-8"><span>TVA</span><span>{totalTVA.toFixed(2)} €</span></div>
              <div className="flex justify-end gap-8 text-lg font-bold text-orange-500 pt-2 border-t mt-2"><span>TTC</span><span>{totalTTC.toFixed(2)} €</span></div>
            </div>
          </div>
        )}
        <div><label className="block text-sm font-medium mb-1">Notes</label><textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} /></div>
        <div className="flex justify-end gap-3">
          <button onClick={() => { setShow(false); setEdit(null); }} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 bg-orange-500 text-white rounded-xl">{edit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </div>
    </div>
  );

  // List
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Devis & Factures</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 bg-orange-500 text-white rounded-xl">+ Nouveau</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['impayees', '⚠️ Impayées']].map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === k ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>{v}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📄</p><h3>Aucun document</h3></div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          {filtered.map(d => {
            const cl = clients.find(c => c.id === d.client_id);
            return (
              <div key={d.id} onClick={() => setView(d.id)} className="flex items-center px-5 py-4 border-b gap-4 cursor-pointer hover:bg-slate-50">
                <span className="w-24"><span className={`text-xs px-2 py-1 rounded ${d.type === 'devis' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{d.type}</span></span>
                <span className="flex-1 font-semibold">{d.numero}</span>
                <span className="w-32 text-slate-600">{cl?.nom || '-'}</span>
                <span className="w-28 text-right font-bold">{(d.total_ttc || 0).toFixed(2)} €</span>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${STATUTS[d.statut]}`}>{d.statut}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
