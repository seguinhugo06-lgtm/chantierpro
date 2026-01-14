import React, { useState, useRef, useEffect } from 'react';

export default function DevisPage({ clients, setClients, devis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete, modeDiscret }) {
  const [mode, setMode] = useState('list');
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '' });
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [form, setForm] = useState({ type: 'devis', clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], validite: 30, sections: [{ id: '1', titre: '', lignes: [] }], tvaRate: 10, remise: 0, notes: '' });

  const couleur = entreprise.couleur || '#f97316';
  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

  const filtered = devis.filter(d => {
    if (filter === 'devis' && d.type !== 'devis') return false;
    if (filter === 'factures' && d.type !== 'facture') return false;
    if (filter === 'attente' && !['envoye', 'vu'].includes(d.statut)) return false;
    if (search && !d.numero?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const calculateTotals = () => {
    let totalHT = 0;
    form.sections.forEach(s => s.lignes.forEach(l => { totalHT += l.montant || 0; }));
    const remiseAmount = totalHT * (form.remise / 100);
    const htApresRemise = totalHT - remiseAmount;
    const tva = htApresRemise * (form.tvaRate / 100);
    return { totalHT, remiseAmount, htApresRemise, tva, ttc: htApresRemise + tva };
  };
  const totals = calculateTotals();

  const addLigne = (item, sectionId) => {
    const ligne = { id: Date.now().toString(), description: item.nom || '', quantite: 1, unite: item.unite || 'unité', prixUnitaire: item.prix || 0, prixAchat: item.prixAchat || 0, montant: item.prix || 0 };
    setForm(p => ({ ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, lignes: [...s.lignes, ligne] } : s) }));
  };

  const updateLigne = (sectionId, ligneId, field, value) => {
    setForm(p => ({ ...p, sections: p.sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, lignes: s.lignes.map(l => {
        if (l.id !== ligneId) return l;
        const updated = { ...l, [field]: value };
        if (field === 'quantite' || field === 'prixUnitaire') updated.montant = (parseFloat(updated.quantite) || 0) * (parseFloat(updated.prixUnitaire) || 0);
        return updated;
      })};
    })}));
  };

  const removeLigne = (sectionId, ligneId) => setForm(p => ({ ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, lignes: s.lignes.filter(l => l.id !== ligneId) } : s) }));

  const generateNumero = (type) => {
    const prefix = type === 'facture' ? 'FACT' : 'DEV';
    const year = new Date().getFullYear();
    const count = devis.filter(d => d.type === type && d.numero?.includes(year.toString())).length + 1;
    return `${prefix}-${year}-${String(count).padStart(5, '0')}`;
  };

  const handleCreate = () => {
    if (!form.clientId) return alert('Sélectionnez un client');
    if (form.sections.every(s => s.lignes.length === 0)) return alert('Ajoutez des lignes');
    onSubmit({
      numero: generateNumero(form.type), type: form.type, client_id: form.clientId, chantier_id: form.chantierId,
      date: form.date, validite: form.validite, statut: 'brouillon', sections: form.sections,
      lignes: form.sections.flatMap(s => s.lignes), tvaRate: form.tvaRate, remise: form.remise,
      total_ht: totals.htApresRemise, tva: totals.tva, total_ttc: totals.ttc, notes: form.notes
    });
    setMode('list');
    setForm({ type: 'devis', clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], validite: 30, sections: [{ id: '1', titre: '', lignes: [] }], tvaRate: 10, remise: 0, notes: '' });
  };

  useEffect(() => { if (mode === 'sign' && canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; } }, [mode]);
  const startDraw = (e) => { setIsDrawing(true); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); };
  const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); ctx.lineTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); ctx.stroke(); };
  const endDraw = () => setIsDrawing(false);
  const clearCanvas = () => canvasRef.current?.getContext('2d').clearRect(0, 0, 350, 180);
  const saveSignature = () => { if (!selected) return; onUpdate(selected.id, { signature: canvasRef.current?.toDataURL() || 'signed', signatureDate: new Date().toISOString(), statut: 'accepte' }); setMode('list'); setSelected(null); alert('✅ Signé !'); };

  const sendWhatsApp = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const phone = (client?.telephone || '').replace(/\s/g, '').replace(/^0/, '33');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour, voici votre ${doc.type} ${doc.numero}: ${formatMoney(doc.total_ttc)}`)}`, '_blank');
    if (doc.statut === 'brouillon') onUpdate(doc.id, { statut: 'envoye' });
  };

  const sendEmail = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    window.location.href = `mailto:${client?.email || ''}?subject=${doc.type} ${doc.numero}&body=Bonjour, veuillez trouver votre ${doc.type} ${doc.numero} de ${formatMoney(doc.total_ttc)}.`;
    if (doc.statut === 'brouillon') onUpdate(doc.id, { statut: 'envoye' });
  };

  const downloadPDF = (doc) => {
    const text = `${doc.type.toUpperCase()} ${doc.numero}\n${entreprise.nom}\n\nTotal TTC: ${formatMoney(doc.total_ttc)}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${doc.numero}.txt`; a.click();
  };

  const createAcompte = (doc, pct = 30) => {
    if (!confirm(`Acompte ${pct}% ?`)) return;
    const montant = doc.total_ht * pct / 100;
    onSubmit({ numero: generateNumero('facture'), type: 'facture', client_id: doc.client_id, chantier_id: doc.chantier_id, date: new Date().toISOString().split('T')[0], statut: 'envoye', lignes: [{ description: `Acompte ${pct}% - ${doc.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montant, montant }], tvaRate: doc.tvaRate, total_ht: montant, tva: montant * doc.tvaRate / 100, total_ttc: montant * (1 + doc.tvaRate / 100) });
  };

  const convertToFacture = (doc) => {
    if (!confirm('Convertir en facture ?')) return;
    onSubmit({ ...doc, id: undefined, numero: generateNumero('facture'), type: 'facture', date: new Date().toISOString().split('T')[0], statut: 'envoye' });
    onUpdate(doc.id, { statut: 'facture' });
  };

  // Signature
  if (mode === 'sign' && selected) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setMode('preview')} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Signature</h1></div>
      <div className="bg-white rounded-2xl border p-6 text-center">
        <p className="mb-4">Signature pour <strong>{selected.numero}</strong></p>
        <p className="text-3xl font-bold mb-6" style={{color: couleur}}>{formatMoney(selected.total_ttc)}</p>
        <canvas ref={canvasRef} width={350} height={180} className="border-2 border-dashed rounded-xl mx-auto" style={{touchAction: 'none'}} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        <div className="flex justify-center gap-4 mt-4">
          <button onClick={clearCanvas} className="px-6 py-3 bg-slate-100 rounded-xl">Effacer</button>
          <button onClick={saveSignature} className="px-6 py-3 text-white rounded-xl" style={{background: couleur}}>✅ Valider</button>
        </div>
      </div>
    </div>
  );

  // Preview
  if (mode === 'preview' && selected) {
    const client = clients.find(c => c.id === selected.client_id);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setMode('list'); setSelected(null); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
          <h1 className="text-xl font-bold">{selected.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-sm ${selected.statut === 'accepte' ? 'bg-emerald-100 text-emerald-700' : selected.statut === 'payee' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{selected.statut}</span>
          <div className="flex-1" />
          <button onClick={() => onDelete(selected.id)} className="text-red-500">🗑️</button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {selected.type === 'devis' && selected.statut !== 'accepte' && <button onClick={() => setMode('sign')} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>✍️ Signer</button>}
          <button onClick={() => sendWhatsApp(selected)} className="px-4 py-2 bg-green-500 text-white rounded-xl">📱 WhatsApp</button>
          <button onClick={() => sendEmail(selected)} className="px-4 py-2 bg-blue-500 text-white rounded-xl">📧 Email</button>
          <button onClick={() => downloadPDF(selected)} className="px-4 py-2 bg-slate-500 text-white rounded-xl">📥 Télécharger</button>
          {selected.type === 'devis' && selected.statut === 'accepte' && (
            <>
              <button onClick={() => createAcompte(selected, 30)} className="px-4 py-2 bg-purple-500 text-white rounded-xl">💰 Acompte 30%</button>
              <button onClick={() => convertToFacture(selected)} className="px-4 py-2 bg-indigo-500 text-white rounded-xl">🧾 Facturer</button>
            </>
          )}
        </div>

        {/* Document */}
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between items-start mb-6 pb-6 border-b">
            <div className="flex items-center gap-4">
              {entreprise.logo ? <img src={entreprise.logo} className="h-14" alt="" /> : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl" style={{background: `${couleur}20`}}>🏢</div>}
              <div><p className="font-bold">{entreprise.nom}</p><p className="text-sm text-slate-500 whitespace-pre-line">{entreprise.adresse}</p></div>
            </div>
            <div className="text-right"><p className="text-xl font-bold" style={{color: couleur}}>{selected.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p><p className="text-slate-500">{selected.numero}</p></div>
          </div>
          <div className="mb-6 p-4 bg-slate-50 rounded-xl"><p className="text-sm text-slate-500">Client</p><p className="font-semibold">{client?.nom} {client?.prenom}</p>{client?.adresse && <p className="text-sm text-slate-500">{client.adresse}</p>}</div>
          <table className="w-full mb-6 text-sm">
            <thead><tr className="border-b"><th className="text-left py-2">Description</th><th className="text-right py-2 w-16">Qté</th><th className="text-right py-2 w-20">PU HT</th><th className="text-right py-2 w-24">Total</th></tr></thead>
            <tbody>{(selected.lignes || []).map((l, i) => <tr key={i} className="border-b"><td className="py-2">{l.description}</td><td className="text-right">{l.quantite} {l.unite}</td><td className="text-right">{(l.prixUnitaire || 0).toFixed(2)}€</td><td className="text-right font-medium">{(l.montant || 0).toFixed(2)}€</td></tr>)}</tbody>
          </table>
          <div className="flex justify-end"><div className="w-56"><div className="flex justify-between py-1"><span>HT</span><span>{formatMoney(selected.total_ht)}</span></div><div className="flex justify-between py-1"><span>TVA {selected.tvaRate}%</span><span>{formatMoney(selected.tva)}</span></div><div className="flex justify-between py-2 border-t font-bold" style={{color: couleur}}><span>TTC</span><span>{formatMoney(selected.total_ttc)}</span></div></div></div>
          {selected.signature && <div className="mt-6 pt-6 border-t"><p className="text-sm text-slate-500">Signé le {new Date(selected.signatureDate).toLocaleDateString('fr-FR')}</p><span className="text-emerald-600">✅ Accepté</span></div>}
          <div className="mt-6 pt-4 border-t text-xs text-slate-400">{entreprise.siret && <p>SIRET: {entreprise.siret}</p>}{entreprise.assurance && <p>Assurance: {entreprise.assurance}</p>}{entreprise.rib && selected.type === 'facture' && <p>RIB: {entreprise.rib}</p>}</div>
        </div>
        <div className="bg-white rounded-2xl border p-4"><label className="text-sm font-medium mr-3">Statut:</label><select value={selected.statut} onChange={e => { onUpdate(selected.id, { statut: e.target.value }); setSelected(s => ({...s, statut: e.target.value})); }} className="px-3 py-2 border rounded-xl"><option value="brouillon">Brouillon</option><option value="envoye">Envoyé</option><option value="accepte">Accepté</option><option value="refuse">Refusé</option>{selected.type === 'facture' && <option value="payee">Payée</option>}</select></div>
      </div>
    );
  }

  // Création
  if (mode === 'create') {
    const favoris = catalogue.filter(c => c.favori);
    const catalogueFiltered = catalogue.filter(c => !catalogueSearch || c.nom?.toLowerCase().includes(catalogueSearch.toLowerCase()));
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><button onClick={() => setMode('list')} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">Nouveau {form.type}</h1></div>
        <div className="bg-white rounded-2xl border p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-sm mb-1">Type</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="devis">Devis</option><option value="facture">Facture</option></select></div>
            <div><label className="block text-sm mb-1">Client *</label><div className="flex gap-2"><select className="flex-1 px-4 py-2.5 border rounded-xl" value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Choisir...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select><button onClick={() => setShowClientModal(true)} className="px-3 rounded-xl" style={{background: `${couleur}20`, color: couleur}}>+</button></div></div>
            <div><label className="block text-sm mb-1">Chantier</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
            <div><label className="block text-sm mb-1">Date</label><input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
          </div>
          {favoris.length > 0 && <div><p className="text-sm font-medium mb-2">⭐ Favoris</p><div className="flex gap-2 flex-wrap">{favoris.map(item => <button key={item.id} onClick={() => addLigne(item, form.sections[0].id)} className="px-3 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm">{item.nom} <span className="text-slate-500">{item.prix}€</span></button>)}</div></div>}
          <div><input placeholder="🔍 Catalogue..." value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl" />{catalogueSearch && <div className="mt-2 border rounded-xl max-h-40 overflow-y-auto">{catalogueFiltered.map(item => <button key={item.id} onClick={() => { addLigne(item, form.sections[0].id); setCatalogueSearch(''); }} className="w-full flex justify-between px-4 py-2 hover:bg-slate-50 border-b last:border-0 text-left"><span>{item.nom}</span><span className="text-slate-500">{item.prix}€/{item.unite}</span></button>)}</div>}</div>
          {form.sections.map(section => (
            <div key={section.id} className="border rounded-xl p-4">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2">Description</th><th className="w-20 text-right py-2">Qté</th><th className="w-20 text-right py-2">Unité</th><th className="w-24 text-right py-2">PU HT</th><th className="w-24 text-right py-2">Total</th><th className="w-10"></th></tr></thead>
                <tbody>{section.lignes.map(l => <tr key={l.id} className="border-b"><td className="py-2"><input value={l.description} onChange={e => updateLigne(section.id, l.id, 'description', e.target.value)} className="w-full px-2 py-1 border rounded" /></td><td><input type="number" value={l.quantite} onChange={e => updateLigne(section.id, l.id, 'quantite', parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded text-right" /></td><td><input value={l.unite} onChange={e => updateLigne(section.id, l.id, 'unite', e.target.value)} className="w-full px-2 py-1 border rounded" /></td><td><input type="number" value={l.prixUnitaire} onChange={e => updateLigne(section.id, l.id, 'prixUnitaire', parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded text-right" /></td><td className="text-right font-medium">{(l.montant || 0).toFixed(2)}€</td><td><button onClick={() => removeLigne(section.id, l.id)} className="text-red-400">✕</button></td></tr>)}</tbody>
              </table>
              <button onClick={() => addLigne({ nom: '', prix: 0, unite: 'unité' }, section.id)} className="mt-2 text-sm" style={{color: couleur}}>+ Ligne</button>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm mb-1">TVA</label><select className="w-full px-4 py-2.5 border rounded-xl" value={form.tvaRate} onChange={e => setForm(p => ({...p, tvaRate: parseFloat(e.target.value)}))}><option value={20}>20%</option><option value={10}>10%</option><option value={5.5}>5.5%</option><option value={0}>0%</option></select></div>
            <div><label className="block text-sm mb-1">Remise %</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.remise} onChange={e => setForm(p => ({...p, remise: parseFloat(e.target.value) || 0}))} /></div>
            <div><label className="block text-sm mb-1">Validité</label><input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.validite} onChange={e => setForm(p => ({...p, validite: parseInt(e.target.value) || 30}))} /></div>
          </div>
          <div className="flex justify-end"><div className="w-64 bg-slate-50 p-4 rounded-xl"><div className="flex justify-between py-1"><span>HT</span><span>{formatMoney(totals.totalHT)}</span></div>{form.remise > 0 && <div className="flex justify-between py-1 text-red-500"><span>Remise</span><span>-{formatMoney(totals.remiseAmount)}</span></div>}<div className="flex justify-between py-1"><span>TVA {form.tvaRate}%</span><span>{formatMoney(totals.tva)}</span></div><div className="flex justify-between py-2 border-t font-bold" style={{color: couleur}}><span>TTC</span><span>{formatMoney(totals.ttc)}</span></div></div></div>
          <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setMode('list')} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={handleCreate} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button></div>
        </div>
        {showClientModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-md"><h3 className="font-bold mb-4">Client rapide</h3><div className="space-y-4"><input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Nom *" value={newClient.nom} onChange={e => setNewClient(p => ({...p, nom: e.target.value}))} /><input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Téléphone" value={newClient.telephone} onChange={e => setNewClient(p => ({...p, telephone: e.target.value}))} /></div><div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowClientModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={() => { if (newClient.nom) { const c = { id: Date.now().toString(), ...newClient }; setClients(prev => [...prev, c]); setForm(p => ({...p, clientId: c.id})); setShowClientModal(false); setNewClient({ nom: '', telephone: '' }); }}} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button></div></div></div>}
      </div>
    );
  }

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Devis & Factures</h1><button onClick={() => setMode('create')} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">En attente</p><p className="text-2xl font-bold text-amber-500">{devis.filter(d => d.statut === 'envoye').length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">Acceptés</p><p className="text-2xl font-bold text-emerald-500">{devis.filter(d => d.statut === 'accepte').length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">À encaisser</p><p className="text-2xl font-bold text-purple-500">{formatMoney(devis.filter(d => d.type === 'facture' && d.statut !== 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0))}</p></div>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 max-w-xs px-4 py-2 border rounded-xl" />
        {[['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['attente', 'En attente']].map(([k, v]) => <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === k ? 'text-white' : 'bg-slate-100'}`} style={filter === k ? {background: couleur} : {}}>{v}</button>)}
      </div>
      {filtered.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📄</p><p className="text-slate-500">Aucun document</p></div> : (
        <div className="space-y-3">{filtered.map(d => {
          const client = clients.find(c => c.id === d.client_id);
          const icon = { brouillon: '⚪', envoye: '🟡', accepte: '✅', payee: '💰', refuse: '❌' }[d.statut] || '📄';
          return <div key={d.id} onClick={() => { setSelected(d); setMode('preview'); }} className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md"><div className="flex items-center gap-4"><span className="text-2xl">{d.type === 'facture' ? '🧾' : '📄'}</span><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-medium">{d.numero}</p><span>{icon}</span></div><p className="text-sm text-slate-500">{client?.nom} • {new Date(d.date).toLocaleDateString('fr-FR')}</p></div><p className="text-lg font-bold" style={{color: couleur}}>{formatMoney(d.total_ttc)}</p></div></div>;
        })}</div>
      )}
    </div>
  );
}
