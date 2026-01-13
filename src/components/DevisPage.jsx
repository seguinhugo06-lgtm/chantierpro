import React, { useState, useRef } from 'react';

const STATUTS = {
  brouillon: { label: 'Brouillon', bg: 'bg-slate-200' },
  envoye: { label: 'Envoyé', bg: 'bg-blue-100 text-blue-700' },
  accepte: { label: 'Accepté', bg: 'bg-green-100 text-green-700' },
  refuse: { label: 'Refusé', bg: 'bg-red-100 text-red-700' },
  envoyee: { label: 'Envoyée', bg: 'bg-blue-100 text-blue-700' },
  payee: { label: 'Payée', bg: 'bg-emerald-100 text-emerald-700' }
};

export default function DevisPage({ clients, devis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete }) {
  const [show, setShow] = useState(false);
  const [view, setView] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showSign, setShowSign] = useState(false);
  const [form, setForm] = useState({ clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], notes: '' });
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const filtered = devis.filter(d => filter === 'all' || (filter === 'devis' && d.type === 'devis') || (filter === 'factures' && d.type === 'facture') || (filter === 'attente' && d.statut === 'envoyee'));

  const addFromCatalogue = (item) => {
    setForm(p => ({ ...p, lignes: [...p.lignes, { id: Date.now(), description: item.nom, quantite: 1, unite: item.unite, prixUnitaire: item.prix, montant: item.prix }] }));
  };

  const addLigne = () => {
    setForm(p => ({ ...p, lignes: [...p.lignes, { id: Date.now(), description: '', quantite: 1, unite: 'unité', prixUnitaire: 0, montant: 0 }] }));
  };

  const updateLigne = (id, field, value) => {
    setForm(p => ({
      ...p,
      lignes: p.lignes.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === 'quantite' || field === 'prixUnitaire') updated.montant = (updated.quantite || 0) * (updated.prixUnitaire || 0);
        return updated;
      })
    }));
  };

  const totalHT = form.lignes.reduce((s, l) => s + (l.montant || 0), 0);
  const totalTVA = totalHT * 0.2;
  const totalTTC = totalHT + totalTVA;

  const submit = () => {
    if (!form.clientId || form.lignes.length === 0) return alert('Client et lignes requis');
    onSubmit({
      client_id: form.clientId, chantier_id: form.chantierId,
      numero: `${form.type === 'devis' ? 'DEV' : 'FACT'}-${Date.now().toString().slice(-6)}`,
      date: form.date, type: form.type, statut: 'brouillon',
      lignes: form.lignes, total_ht: totalHT, tva: totalTVA, total_ttc: totalTTC, notes: form.notes
    });
    setShow(false);
    setForm({ clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], type: 'devis', lignes: [], notes: '' });
  };

  const genererAcompte = (docId, pct) => {
    const doc = devis.find(d => d.id === docId);
    if (!doc) return;
    const montant = doc.total_ttc * (pct / 100);
    onSubmit({
      client_id: doc.client_id, chantier_id: doc.chantier_id,
      numero: `ACOMPTE-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0], type: 'facture', statut: 'brouillon',
      lignes: [{ description: `Acompte ${pct}% sur ${doc.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montant / 1.2, montant: montant / 1.2 }],
      total_ht: montant / 1.2, tva: montant - montant / 1.2, total_ttc: montant
    });
    alert(`Acompte ${pct}% créé: ${montant.toFixed(2)}€`);
  };

  const startDraw = (e) => { const c = canvasRef.current, r = c.getBoundingClientRect(), ctx = c.getContext('2d'); ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); setIsDrawing(true); };
  const draw = (e) => { if (!isDrawing) return; const c = canvasRef.current, r = c.getBoundingClientRect(), ctx = c.getContext('2d'); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); };
  const stopDraw = () => setIsDrawing(false);
  const saveSign = () => { onUpdate(view, { signature: canvasRef.current.toDataURL(), statut: 'accepte' }); setShowSign(false); };

  if (view) {
    const d = devis.find(x => x.id === view);
    if (!d) { setView(null); return null; }
    const client = clients.find(c => c.id === d.client_id);

    if (showSign) return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><button onClick={() => setShowSign(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Signature</h1></div>
        <div className="bg-white rounded-2xl border p-6">
          <p className="mb-4">Faites signer le client :</p>
          <canvas ref={canvasRef} width={350} height={150} className="border-2 border-dashed rounded-xl w-full max-w-sm" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={e => startDraw(e.touches[0])} onTouchMove={e => draw(e.touches[0])} onTouchEnd={stopDraw} />
          <div className="flex gap-3 mt-4">
            <button onClick={() => canvasRef.current.getContext('2d').clearRect(0,0,350,150)} className="px-4 py-2 bg-slate-100 rounded-xl">Effacer</button>
            <button onClick={saveSign} className="px-4 py-2 text-white rounded-xl" style={{background: entreprise.couleur}}>Valider</button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><button onClick={() => setView(null)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold flex-1">{d.numero}</h1><span className={`px-3 py-1 rounded-full text-sm ${STATUTS[d.statut]?.bg}`}>{STATUTS[d.statut]?.label}</span></div>
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between mb-6 pb-6 border-b">
            <div>{entreprise.logo && <img src={entreprise.logo} className="h-12 mb-2" alt="" />}<p className="font-bold">{entreprise.nom}</p><p className="text-sm text-slate-500">{entreprise.adresse}</p></div>
            <div className="text-right"><p className="font-bold">{d.type === 'devis' ? 'DEVIS' : 'FACTURE'}</p><p className="text-slate-500">{d.numero}</p><p className="text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</p></div>
          </div>
          <div className="mb-6"><p className="text-sm text-slate-500">Client</p><p className="font-bold">{client?.nom}</p></div>
          <table className="w-full mb-6 text-sm"><thead><tr className="border-b"><th className="text-left py-2">Description</th><th className="w-16 text-center">Qté</th><th className="w-20 text-right">PU</th><th className="w-24 text-right">Total</th></tr></thead><tbody>{d.lignes?.map((l,i) => <tr key={i} className="border-b"><td className="py-2">{l.description}</td><td className="text-center">{l.quantite}</td><td className="text-right">{(l.prixUnitaire||0).toFixed(2)}€</td><td className="text-right font-medium">{(l.montant||0).toFixed(2)}€</td></tr>)}</tbody></table>
          <div className="flex justify-end"><div className="w-48 space-y-1 text-sm"><div className="flex justify-between"><span>HT</span><span>{(d.total_ht||0).toFixed(2)}€</span></div><div className="flex justify-between"><span>TVA 20%</span><span>{(d.tva||0).toFixed(2)}€</span></div><div className="flex justify-between font-bold text-lg pt-2 border-t" style={{color: entreprise.couleur}}><span>TTC</span><span>{(d.total_ttc||0).toFixed(2)}€</span></div></div></div>
          {entreprise.siret && <p className="text-xs text-slate-400 mt-4">SIRET: {entreprise.siret}</p>}
          {entreprise.rib && d.type === 'facture' && <p className="text-xs text-slate-400">RIB: {entreprise.rib}</p>}
          {d.signature && <div className="mt-4 pt-4 border-t"><p className="text-xs text-slate-500">Signature</p><img src={d.signature} className="h-16" alt="" /></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {d.type === 'devis' && d.statut !== 'accepte' && <button onClick={() => setShowSign(true)} className="px-4 py-2 text-white rounded-xl" style={{background: entreprise.couleur}}>✍️ Signer</button>}
          {d.type === 'devis' && <><button onClick={() => genererAcompte(d.id, 30)} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm">Acompte 30%</button><button onClick={() => genererAcompte(d.id, 40)} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm">Acompte 40%</button></>}
          <select value={d.statut} onChange={e => onUpdate(d.id, { statut: e.target.value })} className="px-3 py-2 border rounded-xl text-sm">{Object.entries(STATUTS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <button onClick={() => { if(confirm('Supprimer?')) { onDelete(d.id); setView(null); }}} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm">🗑️</button>
        </div>
      </div>
    );
  }

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau {form.type}</h1></div>
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="px-3 py-2.5 border rounded-xl" value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Client *</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
          <select className="px-3 py-2.5 border rounded-xl" value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Chantier</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
          <select className="px-3 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="devis">Devis</option><option value="facture">Facture</option></select>
          <input type="date" className="px-3 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
        </div>
        {catalogue.filter(c => c.favori).length > 0 && <div><p className="text-sm font-medium mb-2">⭐ Favoris</p><div className="flex gap-2 flex-wrap">{catalogue.filter(c => c.favori).map(item => <button key={item.id} onClick={() => addFromCatalogue(item)} className="px-3 py-1.5 bg-orange-50 rounded-lg text-sm">{item.nom} • {item.prix}€</button>)}</div></div>}
        <div className="space-y-2">
          {form.lignes.map(l => <div key={l.id} className="flex gap-2 items-center flex-wrap bg-slate-50 p-3 rounded-xl"><input placeholder="Description" value={l.description} onChange={e => updateLigne(l.id, 'description', e.target.value)} className="flex-1 min-w-[150px] px-3 py-2 border rounded-lg" /><input type="number" value={l.quantite} onChange={e => updateLigne(l.id, 'quantite', parseFloat(e.target.value)||0)} className="w-16 px-2 py-2 border rounded-lg text-center" /><select value={l.unite} onChange={e => updateLigne(l.id, 'unite', e.target.value)} className="w-16 px-1 py-2 border rounded-lg text-sm"><option>unité</option><option>h</option><option>m²</option><option>ml</option><option>forfait</option></select><input type="number" value={l.prixUnitaire} onChange={e => updateLigne(l.id, 'prixUnitaire', parseFloat(e.target.value)||0)} className="w-20 px-2 py-2 border rounded-lg text-right" /><span className="w-20 text-right font-medium">{(l.montant||0).toFixed(2)}€</span><button onClick={() => setForm(p => ({...p, lignes: p.lignes.filter(x => x.id !== l.id)}))} className="text-red-500">✕</button></div>)}
          <button onClick={addLigne} className="w-full py-3 border-2 border-dashed rounded-xl text-slate-400">+ Ligne</button>
        </div>
        {form.lignes.length > 0 && <div className="flex justify-end"><div className="w-48 space-y-1 text-sm bg-slate-50 p-4 rounded-xl"><div className="flex justify-between"><span>HT</span><span>{totalHT.toFixed(2)}€</span></div><div className="flex justify-between"><span>TVA</span><span>{totalTVA.toFixed(2)}€</span></div><div className="flex justify-between font-bold text-lg pt-2 border-t"><span>TTC</span><span>{totalTTC.toFixed(2)}€</span></div></div></div>}
        <div className="flex justify-end gap-3 pt-4"><button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: entreprise.couleur}}>Créer</button></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Devis & Factures</h1><button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: entreprise.couleur}}>+ Nouveau</button></div>
      <div className="flex gap-2 flex-wrap">{[['all','Tous'],['devis','Devis'],['factures','Factures'],['attente','En attente']].map(([k,v]) => <button key={k} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-xl text-sm ${filter === k ? 'text-white' : 'bg-slate-100'}`} style={filter === k ? {background: entreprise.couleur} : {}}>{v}</button>)}</div>
      {filtered.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-4xl mb-4">📄</p><p className="text-slate-500">Aucun document</p></div> : <div className="space-y-2">{filtered.map(d => {
        const client = clients.find(c => c.id === d.client_id);
        const days = Math.floor((Date.now() - new Date(d.date)) / 86400000);
        const status = d.statut === 'payee' ? '✅' : d.statut === 'accepte' ? '✅' : days > 30 && d.type === 'facture' ? '🔴' : d.statut === 'envoyee' || d.statut === 'envoye' ? '🟡' : '⚪';
        return <div key={d.id} onClick={() => setView(d.id)} className="bg-white rounded-xl border p-4 flex items-center gap-4 cursor-pointer hover:shadow-md"><span className="text-xl">{status}</span><div className="flex-1"><p className="font-medium">{d.numero}</p><p className="text-sm text-slate-500">{client?.nom} • {new Date(d.date).toLocaleDateString('fr-FR')}</p></div><p className="font-bold">{(d.total_ttc||0).toFixed(2)}€</p></div>;
      })}</div>}
    </div>
  );
}
