import React, { useState, useRef, useEffect } from 'react';

const STATUTS = {
  brouillon: { label: 'Brouillon', icon: '⚪', bg: 'bg-slate-100 text-slate-600' },
  envoye: { label: 'Envoyé', icon: '🟡', bg: 'bg-amber-100 text-amber-700' },
  vu: { label: 'Vu par client', icon: '👁️', bg: 'bg-blue-100 text-blue-700' },
  accepte: { label: 'Accepté', icon: '✅', bg: 'bg-green-100 text-green-700' },
  refuse: { label: 'Refusé', icon: '❌', bg: 'bg-red-100 text-red-700' },
  facture: { label: 'Facturé', icon: '🧾', bg: 'bg-purple-100 text-purple-700' }
};

const TVA_RATES = [
  { value: 20, label: '20% (Standard)' },
  { value: 10, label: '10% (Travaux)' },
  { value: 5.5, label: '5.5% (Rénovation énergétique)' },
  { value: 0, label: '0% (Exonéré)' }
];

export default function DevisPage({ clients, devis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete, setClients, clientsDB }) {
  const [view, setView] = useState(null);
  const [mode, setMode] = useState('list'); // list, create, edit, sign, preview
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '' });
  
  // Form state
  const [form, setForm] = useState({
    type: 'devis',
    clientId: '',
    chantierId: '',
    date: new Date().toISOString().split('T')[0],
    validite: 30,
    sections: [{ id: '1', titre: '', lignes: [] }],
    photos: [],
    tvaRate: 10,
    remise: 0,
    acompte: 0,
    notes: '',
    cgv: true,
    showCertifications: true
  });

  // Signature
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Reset form
  const resetForm = () => {
    setForm({
      type: 'devis',
      clientId: '',
      chantierId: '',
      date: new Date().toISOString().split('T')[0],
      validite: 30,
      sections: [{ id: Date.now().toString(), titre: '', lignes: [] }],
      photos: [],
      tvaRate: 10,
      remise: 0,
      acompte: 0,
      notes: '',
      cgv: true,
      showCertifications: true
    });
  };

  // Calculs
  const calculateTotals = (sections, tvaRate, remise) => {
    const totalHT = sections.reduce((sum, sec) => 
      sum + sec.lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0), 0
    );
    const remiseAmount = totalHT * (remise / 100);
    const htApresRemise = totalHT - remiseAmount;
    const tva = htApresRemise * (tvaRate / 100);
    const ttc = htApresRemise + tva;
    return { totalHT, remiseAmount, htApresRemise, tva, ttc };
  };

  const totals = calculateTotals(form.sections, form.tvaRate, form.remise);

  // Ajouter ligne
  const addLigne = (sectionId, ligne = null) => {
    const newLigne = ligne || {
      id: Date.now().toString(),
      description: '',
      quantite: 1,
      unite: 'unité',
      prixUnitaire: 0,
      montant: 0
    };
    setForm(p => ({
      ...p,
      sections: p.sections.map(s => 
        s.id === sectionId 
          ? { ...s, lignes: [...s.lignes, newLigne] }
          : s
      )
    }));
    setCatalogSearch('');
  };

  // Ajouter depuis catalogue
  const addFromCatalog = (sectionId, item) => {
    addLigne(sectionId, {
      id: Date.now().toString(),
      description: item.nom,
      quantite: 1,
      unite: item.unite || 'unité',
      prixUnitaire: item.prix,
      montant: item.prix
    });
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
  const deleteLigne = (sectionId, ligneId) => {
    setForm(p => ({
      ...p,
      sections: p.sections.map(s => 
        s.id === sectionId 
          ? { ...s, lignes: s.lignes.filter(l => l.id !== ligneId) }
          : s
      )
    }));
  };

  // Ajouter section
  const addSection = () => {
    setForm(p => ({
      ...p,
      sections: [...p.sections, { id: Date.now().toString(), titre: '', lignes: [] }]
    }));
  };

  // Supprimer section
  const deleteSection = (sectionId) => {
    if (form.sections.length <= 1) return;
    setForm(p => ({
      ...p,
      sections: p.sections.filter(s => s.id !== sectionId)
    }));
  };

  // Ajouter photo
  const handlePhotoAdd = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(p => ({
        ...p,
        photos: [...p.photos, { id: Date.now().toString(), src: reader.result, date: new Date().toISOString() }]
      }));
    };
    reader.readAsDataURL(file);
  };

  // Supprimer photo
  const deletePhoto = (photoId) => {
    setForm(p => ({ ...p, photos: p.photos.filter(ph => ph.id !== photoId) }));
  };

  // Dupliquer devis
  const duplicateDevis = (doc) => {
    setForm({
      ...form,
      type: 'devis',
      clientId: doc.client_id || '',
      chantierId: doc.chantier_id || '',
      sections: doc.sections || [{ id: '1', titre: '', lignes: doc.lignes || [] }],
      photos: [],
      tvaRate: doc.tvaRate || 10,
      remise: doc.remise || 0,
      notes: doc.notes || '',
      cgv: true,
      showCertifications: true
    });
    setMode('create');
  };

  // Créer client rapide
  const quickCreateClient = async () => {
    if (!newClient.nom) return;
    if (clientsDB) {
      await clientsDB.create(newClient);
      const r = await clientsDB.getAll();
      if (r.data && setClients) setClients(r.data);
    }
    setShowClientModal(false);
    setNewClient({ nom: '', telephone: '' });
  };

  // Soumettre
  const submitDevis = () => {
    if (!form.clientId) return alert('Sélectionnez un client');
    if (form.sections.every(s => s.lignes.length === 0)) return alert('Ajoutez au moins une ligne');
    
    const allLignes = form.sections.flatMap(s => s.lignes.map(l => ({ ...l, section: s.titre })));
    const data = {
      client_id: form.clientId,
      chantier_id: form.chantierId,
      numero: `${form.type === 'devis' ? 'DEV' : 'FACT'}-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      date: form.date,
      validite: form.validite,
      type: form.type,
      statut: 'brouillon',
      sections: form.sections,
      lignes: allLignes,
      photos: form.photos,
      tvaRate: form.tvaRate,
      remise: form.remise,
      total_ht: totals.totalHT,
      remise_montant: totals.remiseAmount,
      tva: totals.tva,
      total_ttc: totals.ttc,
      notes: form.notes,
      cgv: form.cgv,
      showCertifications: form.showCertifications
    };
    
    onSubmit(data);
    resetForm();
    setMode('list');
  };

  // Signature canvas
  const startDraw = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSignature = (docId) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signature = canvas.toDataURL();
    onUpdate(docId, { 
      signature, 
      statut: 'accepte',
      signatureDate: new Date().toISOString()
    });
    setMode('list');
    setView(null);
  };

  // Transformer en facture
  const convertToFacture = (doc) => {
    const factureData = {
      ...doc,
      numero: `FACT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      type: 'facture',
      statut: 'brouillon',
      dateFacture: new Date().toISOString().split('T')[0],
      devisOrigine: doc.numero
    };
    delete factureData.id;
    delete factureData.created_at;
    onSubmit(factureData);
    onUpdate(doc.id, { statut: 'facture' });
  };

  // Générer acompte
  const genererAcompte = (doc, pourcentage) => {
    const montant = doc.total_ttc * (pourcentage / 100);
    const acompteData = {
      client_id: doc.client_id,
      chantier_id: doc.chantier_id,
      numero: `ACOMPTE-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().split('T')[0],
      type: 'facture',
      statut: 'brouillon',
      lignes: [{ description: `Acompte ${pourcentage}% - ${doc.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montant / (1 + doc.tvaRate/100), montant: montant / (1 + doc.tvaRate/100) }],
      sections: [{ id: '1', titre: '', lignes: [{ description: `Acompte ${pourcentage}% - ${doc.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montant / (1 + doc.tvaRate/100), montant: montant / (1 + doc.tvaRate/100) }] }],
      tvaRate: doc.tvaRate,
      total_ht: montant / (1 + doc.tvaRate/100),
      tva: montant - montant / (1 + doc.tvaRate/100),
      total_ttc: montant,
      devisOrigine: doc.numero
    };
    onSubmit(acompteData);
    alert(`Facture d'acompte ${pourcentage}% créée: ${montant.toFixed(2)}€`);
  };

  // Générer PDF et partage
  const generatePDFContent = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const dateStr = new Date(doc.date).toLocaleDateString('fr-FR');
    return `
DOCUMENT: ${doc.type === 'devis' ? 'DEVIS' : 'FACTURE'} ${doc.numero}
Date: ${dateStr}
${doc.type === 'devis' ? `Validité: ${doc.validite || 30} jours` : ''}

ÉMETTEUR:
${entreprise.nom || 'Entreprise'}
${entreprise.adresse || ''}
${entreprise.tel || ''}
${entreprise.siret ? 'SIRET: ' + entreprise.siret : ''}

CLIENT:
${client?.nom || ''} ${client?.prenom || ''}
${client?.adresse || ''}
${client?.telephone || ''}

PRESTATIONS:
${(doc.lignes || []).map(l => `- ${l.description}: ${l.quantite} ${l.unite} x ${l.prixUnitaire}€ = ${l.montant}€`).join('\n')}

TOTAL HT: ${(doc.total_ht || 0).toFixed(2)}€
${doc.remise_montant ? `Remise: -${doc.remise_montant.toFixed(2)}€` : ''}
TVA (${doc.tvaRate || 10}%): ${(doc.tva || 0).toFixed(2)}€
TOTAL TTC: ${(doc.total_ttc || 0).toFixed(2)}€

${doc.signature ? 'BON POUR ACCORD - Signé le ' + new Date(doc.signatureDate).toLocaleDateString('fr-FR') : ''}
${entreprise.rib && doc.type === 'facture' ? '\nRIB: ' + entreprise.rib : ''}
    `.trim();
  };

  // Partage WhatsApp
  const shareWhatsApp = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const message = `Bonjour${client?.prenom ? ' ' + client.prenom : ''},\n\nVeuillez trouver ci-joint votre ${doc.type === 'devis' ? 'devis' : 'facture'} n°${doc.numero} d'un montant de ${(doc.total_ttc || 0).toFixed(2)}€.\n\nCordialement,\n${entreprise.nom || ''}`;
    const phone = client?.telephone?.replace(/\s/g, '').replace(/^0/, '33') || '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    if (doc.statut === 'brouillon') {
      onUpdate(doc.id, { statut: 'envoye', dateEnvoi: new Date().toISOString() });
    }
  };

  // Partage Email
  const shareEmail = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const subject = `${doc.type === 'devis' ? 'Devis' : 'Facture'} ${doc.numero} - ${entreprise.nom || ''}`;
    const body = generatePDFContent(doc);
    window.open(`mailto:${client?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    if (doc.statut === 'brouillon') {
      onUpdate(doc.id, { statut: 'envoye', dateEnvoi: new Date().toISOString() });
    }
  };

  // Télécharger
  const downloadDoc = (doc) => {
    const content = generatePDFContent(doc);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.numero}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtrage
  const filtered = devis.filter(d => {
    if (filter === 'devis' && d.type !== 'devis') return false;
    if (filter === 'factures' && d.type !== 'facture') return false;
    if (filter === 'attente' && !['envoye', 'vu'].includes(d.statut)) return false;
    if (filter === 'acceptes' && d.statut !== 'accepte') return false;
    if (search) {
      const client = clients.find(c => c.id === d.client_id);
      const searchLower = search.toLowerCase();
      return d.numero?.toLowerCase().includes(searchLower) || client?.nom?.toLowerCase().includes(searchLower);
    }
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Catalogue filtré
  const filteredCatalog = catalogSearch 
    ? catalogue.filter(c => c.nom?.toLowerCase().includes(catalogSearch.toLowerCase()))
    : catalogue.filter(c => c.favori);

  const couleur = entreprise.couleur || '#f97316';

  // ============ RENDU ============

  // Mode signature
  if (mode === 'sign' && view) {
    const doc = devis.find(d => d.id === view);
    if (!doc) { setMode('list'); return null; }
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('preview')} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
          <h1 className="text-2xl font-bold">Signature client</h1>
        </div>
        
        <div className="bg-white rounded-2xl border p-6">
          <p className="text-center text-slate-600 mb-4">Le client signe ci-dessous pour accepter le devis</p>
          
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={350}
              height={200}
              className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          
          <p className="text-center text-xs text-slate-400 mt-2">Dessinez votre signature avec le doigt ou la souris</p>
          
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={clearSignature} className="px-6 py-3 bg-slate-100 rounded-xl font-medium">
              Effacer
            </button>
            <button onClick={() => saveSignature(doc.id)} className="px-6 py-3 text-white rounded-xl font-medium" style={{background: couleur}}>
              ✅ Valider - Bon pour accord
            </button>
          </div>
        </div>
        
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ En signant, le client accepte les conditions du devis {doc.numero} pour un montant de {(doc.total_ttc || 0).toFixed(2)}€ TTC
        </div>
      </div>
    );
  }

  // Mode preview (voir le devis)
  if (mode === 'preview' && view) {
    const doc = devis.find(d => d.id === view);
    if (!doc) { setMode('list'); return null; }
    const client = clients.find(c => c.id === doc.client_id);
    const chantier = chantiers.find(c => c.id === doc.chantier_id);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setMode('list'); setView(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{doc.numero}</h1>
            <p className="text-slate-500">{doc.type === 'devis' ? 'Devis' : 'Facture'}</p>
          </div>
          <span className={`px-4 py-2 rounded-xl text-sm font-medium ${STATUTS[doc.statut]?.bg}`}>
            {STATUTS[doc.statut]?.icon} {STATUTS[doc.statut]?.label}
          </span>
        </div>

        {/* Actions rapides */}
        <div className="flex gap-2 flex-wrap">
          {doc.type === 'devis' && doc.statut !== 'accepte' && doc.statut !== 'facture' && (
            <button onClick={() => setMode('sign')} className="px-4 py-2.5 text-white rounded-xl font-medium flex items-center gap-2" style={{background: couleur}}>
              ✍️ Signer
            </button>
          )}
          <button onClick={() => shareWhatsApp(doc)} className="px-4 py-2.5 bg-green-500 text-white rounded-xl font-medium flex items-center gap-2">
            📱 WhatsApp
          </button>
          <button onClick={() => shareEmail(doc)} className="px-4 py-2.5 bg-blue-500 text-white rounded-xl font-medium flex items-center gap-2">
            📧 Email
          </button>
          <button onClick={() => downloadDoc(doc)} className="px-4 py-2.5 bg-slate-200 rounded-xl font-medium flex items-center gap-2">
            ⬇️ Télécharger
          </button>
          {doc.type === 'devis' && doc.statut === 'accepte' && (
            <button onClick={() => convertToFacture(doc)} className="px-4 py-2.5 bg-purple-500 text-white rounded-xl font-medium">
              🧾 Facturer
            </button>
          )}
        </div>

        {/* Document */}
        <div className="bg-white rounded-2xl border p-6 print:shadow-none" id="devis-content">
          {/* En-tête */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              {entreprise.logo ? (
                <img src={entreprise.logo} className="h-16 object-contain" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{background: `${couleur}20`}}>🏢</div>
              )}
              <div>
                <p className="font-bold text-lg">{entreprise.nom || 'Mon Entreprise'}</p>
                <p className="text-sm text-slate-500 whitespace-pre-line">{entreprise.adresse || ''}</p>
                <p className="text-sm text-slate-500">{entreprise.tel || ''}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{color: couleur}}>{doc.type === 'devis' ? 'DEVIS' : 'FACTURE'}</p>
              <p className="font-mono text-slate-600">{doc.numero}</p>
              <p className="text-slate-500">{new Date(doc.date).toLocaleDateString('fr-FR')}</p>
              {doc.type === 'devis' && <p className="text-xs text-slate-400">Validité: {doc.validite || 30} jours</p>}
            </div>
          </div>

          {/* Client */}
          <div className="mb-8 p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">CLIENT</p>
            <p className="font-bold">{client?.nom || ''} {client?.prenom || ''}</p>
            {client?.entreprise && <p className="text-sm">{client.entreprise}</p>}
            <p className="text-sm text-slate-600">{client?.adresse || ''}</p>
            <p className="text-sm text-slate-600">{client?.telephone || ''} {client?.email ? '• ' + client.email : ''}</p>
          </div>

          {/* Photos */}
          {doc.photos && doc.photos.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">📷 Photos du chantier</p>
              <div className="flex gap-2 flex-wrap">
                {doc.photos.map(p => (
                  <img key={p.id} src={p.src} className="w-24 h-24 object-cover rounded-lg" alt="" />
                ))}
              </div>
            </div>
          )}

          {/* Prestations */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="border-b-2" style={{borderColor: couleur}}>
                <th className="text-left py-3 font-semibold">Description</th>
                <th className="text-center w-20 font-semibold">Qté</th>
                <th className="text-right w-24 font-semibold">P.U. HT</th>
                <th className="text-right w-28 font-semibold">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {(doc.sections || [{ lignes: doc.lignes || [] }]).map((section, si) => (
                <React.Fragment key={si}>
                  {section.titre && (
                    <tr><td colSpan={4} className="pt-4 pb-2 font-bold text-slate-700" style={{color: couleur}}>{section.titre}</td></tr>
                  )}
                  {section.lignes?.map((l, li) => (
                    <tr key={li} className="border-b border-slate-100">
                      <td className="py-2">{l.description}</td>
                      <td className="text-center">{l.quantite} {l.unite}</td>
                      <td className="text-right">{(parseFloat(l.prixUnitaire) || 0).toFixed(2)}€</td>
                      <td className="text-right font-medium">{(parseFloat(l.montant) || 0).toFixed(2)}€</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Totaux */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between py-1"><span>Total HT</span><span>{(doc.total_ht || 0).toFixed(2)}€</span></div>
              {doc.remise_montant > 0 && (
                <div className="flex justify-between py-1 text-green-600"><span>Remise</span><span>-{doc.remise_montant.toFixed(2)}€</span></div>
              )}
              <div className="flex justify-between py-1"><span>TVA ({doc.tvaRate || 10}%)</span><span>{(doc.tva || 0).toFixed(2)}€</span></div>
              <div className="flex justify-between py-2 text-lg font-bold border-t-2" style={{borderColor: couleur, color: couleur}}>
                <span>Total TTC</span><span>{(doc.total_ttc || 0).toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Signature */}
          {doc.signature && (
            <div className="border-t pt-4 mt-6">
              <p className="text-sm font-medium text-green-700 mb-2">✅ BON POUR ACCORD</p>
              <div className="flex items-end gap-4">
                <img src={doc.signature} className="h-20 border rounded" alt="Signature" />
                <p className="text-xs text-slate-500">Signé le {new Date(doc.signatureDate).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          )}

          {/* Mentions légales */}
          <div className="mt-8 pt-4 border-t text-xs text-slate-400 space-y-1">
            {entreprise.siret && <p>SIRET: {entreprise.siret} {entreprise.tvaIntra && `• TVA Intra: ${entreprise.tvaIntra}`}</p>}
            {entreprise.assurance && doc.showCertifications && <p>Assurance décennale: {entreprise.assurance}</p>}
            {entreprise.rib && doc.type === 'facture' && <p>RIB: {entreprise.rib}</p>}
            {doc.cgv && <p className="mt-2">Conditions: Paiement à réception de facture. Pénalités de retard: 3x taux légal.</p>}
          </div>
        </div>

        {/* Actions secondaires */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => duplicateDevis(doc)} className="px-4 py-2 bg-slate-100 rounded-xl text-sm">
            📋 Dupliquer
          </button>
          {doc.type === 'devis' && doc.statut === 'accepte' && (
            <>
              <button onClick={() => genererAcompte(doc, 30)} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm">
                Acompte 30%
              </button>
              <button onClick={() => genererAcompte(doc, 40)} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm">
                Acompte 40%
              </button>
            </>
          )}
          <select 
            value={doc.statut} 
            onChange={e => onUpdate(doc.id, { statut: e.target.value })}
            className="px-4 py-2 border rounded-xl text-sm"
          >
            {Object.entries(STATUTS).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          <button 
            onClick={() => { if (confirm('Supprimer ce document ?')) { onDelete(doc.id); setMode('list'); setView(null); }}}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm"
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
    );
  }

  // Mode création/édition
  if (mode === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setMode('list'); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
          <h1 className="text-2xl font-bold">Nouveau {form.type}</h1>
        </div>

        {/* Type + Client */}
        <div className="bg-white rounded-2xl border p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select 
                className="w-full px-4 py-2.5 border rounded-xl"
                value={form.type}
                onChange={e => setForm(p => ({...p, type: e.target.value}))}
              >
                <option value="devis">Devis</option>
                <option value="facture">Facture</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Client *</label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 px-4 py-2.5 border rounded-xl"
                  value={form.clientId}
                  onChange={e => setForm(p => ({...p, clientId: e.target.value}))}
                >
                  <option value="">Sélectionner...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setShowClientModal(true)}
                  className="px-3 py-2.5 rounded-xl text-white"
                  style={{background: couleur}}
                >+</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chantier</label>
              <select 
                className="w-full px-4 py-2.5 border rounded-xl"
                value={form.chantierId}
                onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}
              >
                <option value="">Aucun</option>
                {chantiers.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input 
                type="date"
                className="w-full px-4 py-2.5 border rounded-xl"
                value={form.date}
                onChange={e => setForm(p => ({...p, date: e.target.value}))}
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">📷 Photos (optionnel)</h3>
            <label className="px-4 py-2 text-white rounded-xl cursor-pointer text-sm" style={{background: couleur}}>
              + Ajouter
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoAdd} className="hidden" />
            </label>
          </div>
          {form.photos.length > 0 ? (
            <div className="flex gap-3 flex-wrap">
              {form.photos.map(p => (
                <div key={p.id} className="relative">
                  <img src={p.src} className="w-24 h-24 object-cover rounded-xl" alt="" />
                  <button 
                    onClick={() => deletePhoto(p.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                  >✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Prenez une photo du problème ou du chantier</p>
          )}
        </div>

        {/* Sections et lignes */}
        {form.sections.map((section, sIndex) => (
          <div key={section.id} className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3 mb-4">
              <input
                placeholder={`Section ${sIndex + 1} (ex: Démolition, Pose...)`}
                value={section.titre}
                onChange={e => setForm(p => ({
                  ...p,
                  sections: p.sections.map(s => s.id === section.id ? {...s, titre: e.target.value} : s)
                }))}
                className="flex-1 px-4 py-2 border rounded-xl font-medium"
              />
              {form.sections.length > 1 && (
                <button onClick={() => deleteSection(section.id)} className="p-2 text-red-500">🗑️</button>
              )}
            </div>

            {/* Recherche catalogue */}
            <div className="mb-4">
              <input
                placeholder="🔍 Rechercher dans le catalogue..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl"
              />
              {filteredCatalog.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {filteredCatalog.slice(0, 8).map(item => (
                    <button
                      key={item.id}
                      onClick={() => addFromCatalog(section.id, item)}
                      className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm"
                    >
                      {item.favori && '⭐'} {item.nom} • {item.prix}€
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lignes */}
            <div className="space-y-2">
              {section.lignes.map(ligne => (
                <div key={ligne.id} className="flex gap-2 items-center flex-wrap bg-slate-50 p-3 rounded-xl">
                  <input
                    placeholder="Description"
                    value={ligne.description}
                    onChange={e => updateLigne(section.id, ligne.id, 'description', e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-2 border rounded-lg bg-white"
                  />
                  <input
                    type="number"
                    value={ligne.quantite}
                    onChange={e => updateLigne(section.id, ligne.id, 'quantite', e.target.value)}
                    className="w-16 px-2 py-2 border rounded-lg bg-white text-center"
                  />
                  <select
                    value={ligne.unite}
                    onChange={e => updateLigne(section.id, ligne.id, 'unite', e.target.value)}
                    className="w-20 px-2 py-2 border rounded-lg bg-white text-sm"
                  >
                    <option>unité</option>
                    <option>h</option>
                    <option>m²</option>
                    <option>ml</option>
                    <option>forfait</option>
                    <option>jour</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Prix"
                    value={ligne.prixUnitaire}
                    onChange={e => updateLigne(section.id, ligne.id, 'prixUnitaire', e.target.value)}
                    className="w-24 px-2 py-2 border rounded-lg bg-white text-right"
                  />
                  <span className="w-24 text-right font-bold">{(parseFloat(ligne.montant) || 0).toFixed(2)}€</span>
                  <button onClick={() => deleteLigne(section.id, ligne.id)} className="text-red-400 px-2">✕</button>
                </div>
              ))}
              <button
                onClick={() => addLigne(section.id)}
                className="w-full py-3 border-2 border-dashed rounded-xl text-slate-400 hover:bg-slate-50"
              >
                + Ajouter une ligne
              </button>
            </div>
          </div>
        ))}

        <button onClick={addSection} className="w-full py-3 bg-slate-100 rounded-xl text-slate-600 font-medium">
          + Ajouter une section
        </button>

        {/* TVA, Remise, Options */}
        <div className="bg-white rounded-2xl border p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">TVA</label>
              <select
                className="w-full px-4 py-2.5 border rounded-xl"
                value={form.tvaRate}
                onChange={e => setForm(p => ({...p, tvaRate: parseFloat(e.target.value)}))}
              >
                {TVA_RATES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Remise (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.remise}
                onChange={e => setForm(p => ({...p, remise: parseFloat(e.target.value) || 0}))}
                className="w-full px-4 py-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Validité (jours)</label>
              <input
                type="number"
                value={form.validite}
                onChange={e => setForm(p => ({...p, validite: parseInt(e.target.value) || 30}))}
                className="w-full px-4 py-2.5 border rounded-xl"
              />
            </div>
          </div>

          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.cgv}
                onChange={e => setForm(p => ({...p, cgv: e.target.checked}))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm">Joindre CGV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showCertifications}
                onChange={e => setForm(p => ({...p, showCertifications: e.target.checked}))}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm">Afficher certifications (RGE, assurance)</span>
            </label>
          </div>
        </div>

        {/* Totaux */}
        <div className="bg-slate-50 rounded-2xl p-5">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between"><span>Total HT</span><span>{totals.totalHT.toFixed(2)}€</span></div>
              {totals.remiseAmount > 0 && (
                <div className="flex justify-between text-green-600"><span>Remise ({form.remise}%)</span><span>-{totals.remiseAmount.toFixed(2)}€</span></div>
              )}
              <div className="flex justify-between"><span>TVA ({form.tvaRate}%)</span><span>{totals.tva.toFixed(2)}€</span></div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t" style={{color: couleur}}>
                <span>Total TTC</span><span>{totals.ttc.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={() => { setMode('list'); resetForm(); }} className="px-6 py-3 bg-slate-100 rounded-xl font-medium">
            Annuler
          </button>
          <button onClick={submitDevis} className="px-8 py-3 text-white rounded-xl font-medium" style={{background: couleur}}>
            Créer le {form.type}
          </button>
        </div>

        {/* Modal nouveau client */}
        {showClientModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Nouveau client rapide</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    className="w-full px-4 py-2.5 border rounded-xl"
                    value={newClient.nom}
                    onChange={e => setNewClient(p => ({...p, nom: e.target.value}))}
                    placeholder="Dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input
                    className="w-full px-4 py-2.5 border rounded-xl"
                    value={newClient.telephone}
                    onChange={e => setNewClient(p => ({...p, telephone: e.target.value}))}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowClientModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
                <button onClick={quickCreateClient} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Liste des devis/factures
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Devis & Factures</h1>
        <div className="flex gap-2">
          {devis.length > 0 && (
            <select
              onChange={e => { if (e.target.value) duplicateDevis(devis.find(d => d.id === e.target.value)); e.target.value = ''; }}
              className="px-4 py-2.5 border rounded-xl text-sm"
            >
              <option value="">📋 Dupliquer...</option>
              {devis.slice(0, 10).map(d => (
                <option key={d.id} value={d.id}>{d.numero}</option>
              ))}
            </select>
          )}
          <button onClick={() => setMode('create')} className="px-4 py-2.5 text-white rounded-xl font-medium" style={{background: couleur}}>
            + Nouveau
          </button>
        </div>
      </div>

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
          {[
            ['all', 'Tous'],
            ['devis', 'Devis'],
            ['factures', 'Factures'],
            ['attente', 'En attente'],
            ['acceptes', 'Acceptés']
          ].map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === k ? 'text-white' : 'bg-slate-100'}`}
              style={filter === k ? {background: couleur} : {}}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold" style={{color: couleur}}>{devis.filter(d => d.type === 'devis' && d.statut === 'envoye').length}</p>
          <p className="text-xs text-slate-500">Devis en attente</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{devis.filter(d => d.statut === 'accepte').length}</p>
          <p className="text-xs text-slate-500">Acceptés</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold">{devis.filter(d => d.type === 'facture' && d.statut !== 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0).toLocaleString('fr-FR')}€</p>
          <p className="text-xs text-slate-500">À encaisser</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{devis.filter(d => new Date(d.date).getMonth() === new Date().getMonth()).reduce((s, d) => s + (d.total_ttc || 0), 0).toLocaleString('fr-FR')}€</p>
          <p className="text-xs text-slate-500">Ce mois</p>
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <p className="text-5xl mb-4">📄</p>
          <h3 className="font-semibold mb-2">Aucun document</h3>
          <p className="text-slate-500 mb-4">Créez votre premier devis en 2 minutes</p>
          <button onClick={() => setMode('create')} className="px-6 py-3 text-white rounded-xl" style={{background: couleur}}>
            + Nouveau devis
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const client = clients.find(c => c.id === doc.client_id);
            return (
              <div
                key={doc.id}
                onClick={() => { setView(doc.id); setMode('preview'); }}
                className="bg-white rounded-xl border p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">{STATUTS[doc.statut]?.icon || '⚪'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{doc.numero}</p>
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUTS[doc.statut]?.bg}`}>
                      {STATUTS[doc.statut]?.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    {client?.nom || 'Client'} • {new Date(doc.date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{(doc.total_ttc || 0).toFixed(2)}€</p>
                  <p className="text-xs text-slate-400">{doc.type === 'devis' ? 'Devis' : 'Facture'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
