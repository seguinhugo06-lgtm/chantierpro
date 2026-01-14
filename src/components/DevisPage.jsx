import React, { useState, useRef, useEffect } from 'react';

export default function DevisPage({ clients, setClients, clientsDB, devis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete, modeDiscret }) {
  const [mode, setMode] = useState('list');
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '' });
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [form, setForm] = useState({
    type: 'devis', clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0],
    validite: 30, sections: [{ id: '1', titre: '', lignes: [] }], photos: [],
    tvaRate: 10, remise: 0, notes: '', cgv: true, showCertifications: true
  });

  const couleur = entreprise.couleur || '#f97316';
  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

  // Filtrage
  const filtered = devis.filter(d => {
    if (filter === 'devis' && d.type !== 'devis') return false;
    if (filter === 'factures' && d.type !== 'facture') return false;
    if (filter === 'attente' && !['envoye', 'vu'].includes(d.statut)) return false;
    if (filter === 'acceptes' && d.statut !== 'accepte') return false;
    if (search && !d.numero?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Stats
  const stats = {
    devisAttente: devis.filter(d => d.type === 'devis' && d.statut === 'envoye').length,
    acceptes: devis.filter(d => d.statut === 'accepte').length,
    aEncaisser: devis.filter(d => d.type === 'facture' && d.statut !== 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0),
    mois: devis.filter(d => new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.total_ttc || 0), 0)
  };

  // Calculs
  const calculateTotals = () => {
    let totalHT = 0;
    let totalAchat = 0;
    form.sections.forEach(s => s.lignes.forEach(l => {
      totalHT += l.montant || 0;
      totalAchat += (l.prixAchat || 0) * (l.quantite || 0);
    }));
    const remiseAmount = totalHT * (form.remise / 100);
    const htApresRemise = totalHT - remiseAmount;
    const tva = htApresRemise * (form.tvaRate / 100);
    const ttc = htApresRemise + tva;
    const margeBrute = totalHT - totalAchat;
    const tauxMarge = totalHT > 0 ? (margeBrute / totalHT) * 100 : 0;
    return { totalHT, remiseAmount, htApresRemise, tva, ttc, margeBrute, tauxMarge };
  };

  const totals = calculateTotals();

  // Ajout ligne depuis catalogue
  const addLigneFromCatalogue = (item, sectionId) => {
    const ligne = {
      id: Date.now().toString(),
      description: item.nom,
      quantite: 1,
      unite: item.unite,
      prixUnitaire: item.prix,
      prixAchat: item.prixAchat || 0, // Figer le prix d'achat au moment du devis
      montant: item.prix
    };
    setForm(p => ({
      ...p,
      sections: p.sections.map(s => s.id === sectionId ? { ...s, lignes: [...s.lignes, ligne] } : s)
    }));
    setCatalogueSearch('');
  };

  // Mise à jour ligne
  const updateLigne = (sectionId, ligneId, field, value) => {
    setForm(p => ({
      ...p,
      sections: p.sections.map(s => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lignes: s.lignes.map(l => {
            if (l.id !== ligneId) return l;
            const updated = { ...l, [field]: value };
            if (field === 'quantite' || field === 'prixUnitaire') {
              updated.montant = (parseFloat(updated.quantite) || 0) * (parseFloat(updated.prixUnitaire) || 0);
            }
            return updated;
          })
        };
      })
    }));
  };

  // Supprimer ligne
  const removeLigne = (sectionId, ligneId) => {
    setForm(p => ({
      ...p,
      sections: p.sections.map(s => s.id === sectionId ? { ...s, lignes: s.lignes.filter(l => l.id !== ligneId) } : s)
    }));
  };

  // Ajouter section
  const addSection = () => {
    setForm(p => ({ ...p, sections: [...p.sections, { id: Date.now().toString(), titre: '', lignes: [] }] }));
  };

  // Générer numéro
  const generateNumero = (type) => {
    const prefix = type === 'facture' ? 'FACT' : 'DEV';
    const year = new Date().getFullYear();
    const count = devis.filter(d => d.type === type && d.numero?.includes(year.toString())).length + 1;
    return `${prefix}-${year}-${String(count).padStart(5, '0')}`;
  };

  // Créer devis
  const handleCreate = () => {
    const client = clients.find(c => c.id === form.clientId);
    if (!client) return alert('Sélectionnez un client');
    if (form.sections.every(s => s.lignes.length === 0)) return alert('Ajoutez des lignes');

    const data = {
      numero: generateNumero(form.type),
      type: form.type,
      client_id: form.clientId,
      chantier_id: form.chantierId,
      date: form.date,
      validite: form.validite,
      statut: 'brouillon',
      sections: form.sections,
      lignes: form.sections.flatMap(s => s.lignes),
      tvaRate: form.tvaRate,
      remise: form.remise,
      total_ht: totals.htApresRemise,
      tva: totals.tva,
      total_ttc: totals.ttc,
      margePrevue: totals.tauxMarge,
      notes: form.notes,
      cgv: form.cgv,
      showCertifications: form.showCertifications
    };

    onSubmit(data);
    setMode('list');
    setForm({ type: 'devis', clientId: '', chantierId: '', date: new Date().toISOString().split('T')[0], validite: 30, sections: [{ id: '1', titre: '', lignes: [] }], photos: [], tvaRate: 10, remise: 0, notes: '', cgv: true, showCertifications: true });
  };

  // Signature canvas
  useEffect(() => {
    if (mode === 'sign' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [mode]);

  const startDraw = (e) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const saveSignature = () => {
    if (!canvasRef.current || !selected) return;
    const signature = canvasRef.current.toDataURL();
    onUpdate(selected.id, { signature, signatureDate: new Date().toISOString(), statut: 'accepte' });
    setMode('list');
    setSelected(null);
    alert('✅ Devis signé et accepté !');
  };

  // WhatsApp
  const sendWhatsApp = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const phone = (client?.telephone || '').replace(/\s/g, '').replace(/^0/, '33');
    const msg = `Bonjour${client?.prenom ? ' ' + client.prenom : ''},\n\nVoici votre ${doc.type} ${doc.numero} d'un montant de ${formatMoney(doc.total_ttc)}.\n\nCordialement,\n${entreprise.nom}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    if (doc.statut === 'brouillon') onUpdate(doc.id, { statut: 'envoye' });
  };

  // Acompte auto 30%
  const createAcompte = (doc, pct = 30) => {
    if (!confirm(`Créer une facture d'acompte de ${pct}% (${formatMoney(doc.total_ttc * pct / 100)}) ?`)) return;
    const montantTTC = doc.total_ttc * pct / 100;
    const montantHT = montantTTC / (1 + doc.tvaRate / 100);
    const data = {
      numero: generateNumero('facture'),
      type: 'facture',
      client_id: doc.client_id,
      chantier_id: doc.chantier_id,
      date: new Date().toISOString().split('T')[0],
      statut: 'envoye',
      devisOrigine: doc.numero,
      sections: [{ id: '1', titre: '', lignes: [{ id: '1', description: `Acompte ${pct}% - ${doc.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montantHT, montant: montantHT }] }],
      lignes: [{ description: `Acompte ${pct}% - ${doc.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montantHT, montant: montantHT }],
      tvaRate: doc.tvaRate,
      remise: 0,
      total_ht: montantHT,
      tva: montantTTC - montantHT,
      total_ttc: montantTTC
    };
    onSubmit(data);
    alert('✅ Facture d\'acompte créée !');
  };

  // Convertir en facture
  const convertToFacture = (doc) => {
    if (!confirm('Convertir ce devis en facture ?')) return;
    const data = {
      ...doc,
      id: undefined,
      numero: generateNumero('facture'),
      type: 'facture',
      date: new Date().toISOString().split('T')[0],
      statut: 'envoye',
      devisOrigine: doc.numero
    };
    onSubmit(data);
    onUpdate(doc.id, { statut: 'facture' });
    alert('✅ Facture créée !');
  };

  // Créer client rapide
  const quickCreateClient = () => {
    if (!newClient.nom) return;
    const client = { id: Date.now().toString(), ...newClient };
    setClients(prev => [...prev, client]);
    setForm(p => ({ ...p, clientId: client.id }));
    setShowClientModal(false);
    setNewClient({ nom: '', telephone: '' });
  };

  // Vue signature
  if (mode === 'sign' && selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setMode('preview'); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
          <h1 className="text-2xl font-bold">Signature client</h1>
        </div>
        <div className="bg-white rounded-2xl border p-6 text-center">
          <p className="mb-4">Le client signe ci-dessous pour accepter le {selected.type} <strong>{selected.numero}</strong></p>
          <p className="text-3xl font-bold mb-6" style={{color: couleur}}>{formatMoney(selected.total_ttc)}</p>
          <div className="flex justify-center mb-4">
            <canvas ref={canvasRef} width={350} height={180} className="border-2 border-dashed rounded-xl bg-slate-50" style={{touchAction: 'none'}} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
          </div>
          <div className="flex justify-center gap-4">
            <button onClick={clearCanvas} className="px-6 py-3 bg-slate-100 rounded-xl">Effacer</button>
            <button onClick={saveSignature} className="px-6 py-3 text-white rounded-xl" style={{background: couleur}}>✅ Valider</button>
          </div>
          <p className="text-xs text-slate-500 mt-4">Bon pour accord - {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
    );
  }

  // Vue preview
  if (mode === 'preview' && selected) {
    const client = clients.find(c => c.id === selected.client_id);
    const statusColors = { brouillon: 'bg-slate-100', envoye: 'bg-amber-100 text-amber-700', vu: 'bg-blue-100 text-blue-700', accepte: 'bg-emerald-100 text-emerald-700', refuse: 'bg-red-100 text-red-700', payee: 'bg-purple-100 text-purple-700' };
    const statusLabels = { brouillon: 'Brouillon', envoye: 'Envoyé', vu: 'Vu', accepte: 'Accepté', refuse: 'Refusé', payee: 'Payée' };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setMode('list'); setSelected(null); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
          <h1 className="text-xl font-bold">{selected.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-sm ${statusColors[selected.statut]}`}>{statusLabels[selected.statut]}</span>
          <div className="flex-1" />
          <button onClick={() => onDelete(selected.id)} className="px-3 py-2 text-red-500">🗑️</button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {selected.type === 'devis' && selected.statut !== 'accepte' && (
            <button onClick={() => setMode('sign')} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>✍️ Signer</button>
          )}
          <button onClick={() => sendWhatsApp(selected)} className="px-4 py-2 bg-green-500 text-white rounded-xl">📱 WhatsApp</button>
          {selected.type === 'devis' && selected.statut === 'accepte' && (
            <>
              <button onClick={() => createAcompte(selected, 30)} className="px-4 py-2 bg-purple-500 text-white rounded-xl">💰 Acompte 30%</button>
              <button onClick={() => convertToFacture(selected)} className="px-4 py-2 bg-blue-500 text-white rounded-xl">🧾 Facturer</button>
            </>
          )}
        </div>

        {/* Document */}
        <div className="bg-white rounded-2xl border p-6">
          {/* En-tête */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b">
            <div className="flex items-center gap-4">
              {entreprise.logo ? <img src={entreprise.logo} className="h-16 object-contain" alt="" /> : <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{background: `${couleur}20`}}>🏢</div>}
              <div>
                <p className="font-bold text-lg">{entreprise.nom}</p>
                <p className="text-sm text-slate-500 whitespace-pre-line">{entreprise.adresse}</p>
                <p className="text-sm text-slate-500">{entreprise.tel}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{color: couleur}}>{selected.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p>
              <p className="text-slate-500">{selected.numero}</p>
              <p className="text-sm text-slate-500">{new Date(selected.date).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Client */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-500 mb-1">Client</p>
            <p className="font-semibold">{client?.nom} {client?.prenom}</p>
            {client?.adresse && <p className="text-sm text-slate-500">{client.adresse}</p>}
          </div>

          {/* Lignes */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2 w-20">Qté</th>
                <th className="text-right py-2 w-20">Unité</th>
                <th className="text-right py-2 w-24">PU HT</th>
                <th className="text-right py-2 w-28">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {(selected.lignes || []).map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="py-3">{l.description}</td>
                  <td className="text-right">{l.quantite}</td>
                  <td className="text-right">{l.unite}</td>
                  <td className="text-right">{(l.prixUnitaire || 0).toFixed(2)}€</td>
                  <td className="text-right font-medium">{(l.montant || 0).toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2"><span>Total HT</span><span>{formatMoney(selected.total_ht)}</span></div>
              <div className="flex justify-between py-2"><span>TVA {selected.tvaRate}%</span><span>{formatMoney(selected.tva)}</span></div>
              <div className="flex justify-between py-3 border-t font-bold text-lg" style={{color: couleur}}><span>Total TTC</span><span>{formatMoney(selected.total_ttc)}</span></div>
            </div>
          </div>

          {/* Signature */}
          {selected.signature && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-slate-500 mb-2">Signature client - {new Date(selected.signatureDate).toLocaleDateString('fr-FR')}</p>
              <div className="inline-block border rounded-xl p-2 bg-slate-50">
                {selected.signature !== 'signed' && <img src={selected.signature} className="h-16" alt="Signature" />}
                {selected.signature === 'signed' && <span className="text-emerald-600 font-medium">✅ Signé électroniquement</span>}
              </div>
            </div>
          )}

          {/* Mentions légales */}
          <div className="mt-8 pt-6 border-t text-xs text-slate-400 space-y-1">
            {entreprise.siret && <p>SIRET: {entreprise.siret} {entreprise.tvaIntra && `• TVA: ${entreprise.tvaIntra}`}</p>}
            {entreprise.assurance && <p>Assurance décennale: {entreprise.assurance}</p>}
            {entreprise.rib && selected.type === 'facture' && <p>RIB: {entreprise.rib}</p>}
            {selected.type === 'devis' && <p>Devis valable {selected.validite || 30} jours</p>}
          </div>
        </div>

        {/* Statut */}
        <div className="bg-white rounded-2xl border p-4">
          <label className="text-sm font-medium mr-3">Statut:</label>
          <select value={selected.statut} onChange={e => { onUpdate(selected.id, { statut: e.target.value }); setSelected(s => ({...s, statut: e.target.value})); }} className="px-3 py-2 border rounded-xl">
            <option value="brouillon">Brouillon</option>
            <option value="envoye">Envoyé</option>
            <option value="vu">Vu par client</option>
            <option value="accepte">Accepté</option>
            <option value="refuse">Refusé</option>
            {selected.type === 'facture' && <option value="payee">Payée</option>}
          </select>
        </div>
      </div>
    );
  }

  // Vue création
  if (mode === 'create') {
    const catalogueFiltered = catalogue.filter(c => !catalogueSearch || c.nom.toLowerCase().includes(catalogueSearch.toLowerCase()));
    const favoris = catalogue.filter(c => c.favori);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('list')} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
          <h1 className="text-2xl font-bold">Nouveau {form.type}</h1>
        </div>

        <div className="bg-white rounded-2xl border p-6 space-y-6">
          {/* Type et client */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select className="w-full px-4 py-2.5 border rounded-xl" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                <option value="devis">Devis</option>
                <option value="facture">Facture</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Client *</label>
              <div className="flex gap-2">
                <select className="flex-1 px-4 py-2.5 border rounded-xl" value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
                </select>
                <button onClick={() => setShowClientModal(true)} className="px-3 py-2 rounded-xl" style={{background: `${couleur}20`, color: couleur}}>+</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chantier</label>
              <select className="w-full px-4 py-2.5 border rounded-xl" value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}>
                <option value="">Aucun</option>
                {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
            </div>
          </div>

          {/* Catalogue rapide */}
          {favoris.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">⭐ Favoris</p>
              <div className="flex gap-2 flex-wrap">
                {favoris.map(item => (
                  <button key={item.id} onClick={() => addLigneFromCatalogue(item, form.sections[0].id)} className="px-3 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm">
                    {item.nom} <span className="text-slate-500">{item.prix}€</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recherche catalogue */}
          <div>
            <input placeholder="🔍 Rechercher dans le catalogue..." value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl" />
            {catalogueSearch && (
              <div className="mt-2 border rounded-xl max-h-40 overflow-y-auto">
                {catalogueFiltered.map(item => (
                  <button key={item.id} onClick={() => addLigneFromCatalogue(item, form.sections[0].id)} className="w-full flex justify-between px-4 py-2 hover:bg-slate-50 text-left border-b last:border-0">
                    <span>{item.nom}</span>
                    <span className="text-slate-500">{item.prix}€/{item.unite}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sections et lignes */}
          {form.sections.map((section, si) => (
            <div key={section.id} className="border rounded-xl p-4">
              {form.sections.length > 1 && (
                <input placeholder="Titre section (ex: Démolition)" value={section.titre} onChange={e => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === si ? {...s, titre: e.target.value} : s) }))} className="w-full px-3 py-2 border rounded-lg mb-3 font-medium" />
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="w-20 text-right py-2">Qté</th>
                    <th className="w-20 text-right py-2">Unité</th>
                    <th className="w-24 text-right py-2">PU HT</th>
                    <th className="w-28 text-right py-2">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {section.lignes.map(l => (
                    <tr key={l.id} className="border-b">
                      <td className="py-2"><input value={l.description} onChange={e => updateLigne(section.id, l.id, 'description', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                      <td><input type="number" value={l.quantite} onChange={e => updateLigne(section.id, l.id, 'quantite', parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded text-right" /></td>
                      <td><input value={l.unite} onChange={e => updateLigne(section.id, l.id, 'unite', e.target.value)} className="w-full px-2 py-1 border rounded text-right" /></td>
                      <td><input type="number" value={l.prixUnitaire} onChange={e => updateLigne(section.id, l.id, 'prixUnitaire', parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded text-right" /></td>
                      <td className="text-right font-medium">{(l.montant || 0).toFixed(2)}€</td>
                      <td><button onClick={() => removeLigne(section.id, l.id)} className="text-red-400">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => addLigneFromCatalogue({ nom: '', prix: 0, unite: 'unité', prixAchat: 0 }, section.id)} className="mt-2 text-sm" style={{color: couleur}}>+ Ligne libre</button>
            </div>
          ))}
          <button onClick={addSection} className="text-sm" style={{color: couleur}}>+ Ajouter une section</button>

          {/* TVA et remise */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">TVA</label>
              <select className="w-full px-4 py-2.5 border rounded-xl" value={form.tvaRate} onChange={e => setForm(p => ({...p, tvaRate: parseFloat(e.target.value)}))}>
                <option value={20}>20% Standard</option>
                <option value={10}>10% Travaux</option>
                <option value={5.5}>5.5% Rénovation énergétique</option>
                <option value={0}>0% Exonéré</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Remise %</label>
              <input type="number" min="0" max="100" className="w-full px-4 py-2.5 border rounded-xl" value={form.remise} onChange={e => setForm(p => ({...p, remise: parseFloat(e.target.value) || 0}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Validité (jours)</label>
              <input type="number" className="w-full px-4 py-2.5 border rounded-xl" value={form.validite} onChange={e => setForm(p => ({...p, validite: parseInt(e.target.value) || 30}))} />
            </div>
          </div>

          {/* Totaux */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-xl">
              <div className="flex justify-between"><span>Total HT</span><span>{formatMoney(totals.totalHT)}</span></div>
              {form.remise > 0 && <div className="flex justify-between text-red-500"><span>Remise {form.remise}%</span><span>-{formatMoney(totals.remiseAmount)}</span></div>}
              <div className="flex justify-between"><span>TVA {form.tvaRate}%</span><span>{formatMoney(totals.tva)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{color: couleur}}><span>Total TTC</span><span>{formatMoney(totals.ttc)}</span></div>
              {!modeDiscret && <div className="flex justify-between text-xs text-emerald-600 pt-2"><span>Marge brute estimée</span><span>{totals.tauxMarge.toFixed(0)}%</span></div>}
            </div>
          </div>

          {/* Options */}
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.cgv} onChange={e => setForm(p => ({...p, cgv: e.target.checked}))} className="w-4 h-4" /><span className="text-sm">CGV</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.showCertifications} onChange={e => setForm(p => ({...p, showCertifications: e.target.checked}))} className="w-4 h-4" /><span className="text-sm">Mentions légales & assurance</span></label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button onClick={() => setMode('list')} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
            <button onClick={handleCreate} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button>
          </div>
        </div>

        {/* Modal client rapide */}
        {showClientModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Client rapide</h3>
              <div className="space-y-4">
                <div><label className="block text-sm mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={newClient.nom} onChange={e => setNewClient(p => ({...p, nom: e.target.value}))} /></div>
                <div><label className="block text-sm mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={newClient.telephone} onChange={e => setNewClient(p => ({...p, telephone: e.target.value}))} /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowClientModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
                <button onClick={quickCreateClient} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Devis & Factures</h1>
        <button onClick={() => setMode('create')} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">Devis en attente</p><p className="text-2xl font-bold text-amber-500">{stats.devisAttente}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">Acceptés</p><p className="text-2xl font-bold text-emerald-500">{stats.acceptes}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">À encaisser</p><p className="text-2xl font-bold text-purple-500">{formatMoney(stats.aEncaisser)}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">Ce mois</p><p className="text-2xl font-bold" style={{color: couleur}}>{formatMoney(stats.mois)}</p></div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center">
        <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 max-w-xs px-4 py-2 border rounded-xl" />
        {[['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['attente', 'En attente'], ['acceptes', 'Acceptés']].map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === k ? 'text-white' : 'bg-slate-100'}`} style={filter === k ? {background: couleur} : {}}>{v}</button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">📄</p><p className="text-slate-500">Aucun document</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const client = clients.find(c => c.id === d.client_id);
            const statusIcon = { brouillon: '⚪', envoye: '🟡', vu: '👁️', accepte: '✅', refuse: '❌', payee: '💰', facture: '🧾' }[d.statut] || '📄';
            return (
              <div key={d.id} onClick={() => { setSelected(d); setMode('preview'); }} className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{d.type === 'facture' ? '🧾' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{d.numero}</p>
                      <span className="text-sm">{statusIcon}</span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{client?.nom} • {new Date(d.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <p className="text-lg font-bold" style={{color: couleur}}>{formatMoney(d.total_ttc)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
