import React, { useState, useRef, useEffect } from 'react';

export default function DevisPage({ clients, isDark, setClients, devis, setDevis, chantiers, catalogue, entreprise, onSubmit, onUpdate, onDelete, modeDiscret, selectedDevis, setSelectedDevis }) {
  const [mode, setMode] = useState(selectedDevis ? 'preview' : 'list');
  const [selected, setSelected] = useState(selectedDevis || null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAcompteModal, setShowAcompteModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [acomptePct, setAcomptePct] = useState(entreprise?.acompteDefaut || 30);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '' });
  const [snackbar, setSnackbar] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Si selectedDevis change depuis l'extÃ©rieur (ex: depuis Clients), mettre Ã  jour
  useEffect(() => {
    if (selectedDevis) {
      setSelected(selectedDevis);
      setMode('preview');
      // Nettoyer aprÃ¨s utilisation
      if (setSelectedDevis) setSelectedDevis(null);
    }
  }, [selectedDevis, setSelectedDevis]);
  
  const [form, setForm] = useState({ 
    type: 'devis', 
    clientId: '', 
    chantierId: '', 
    date: new Date().toISOString().split('T')[0], 
    validite: entreprise?.validiteDevis || 30, 
    sections: [{ id: '1', titre: '', lignes: [] }], 
    tvaDefaut: entreprise?.tvaDefaut || 10,
    remise: 0, 
    notes: '' 
  });

  const couleur = entreprise?.couleur || '#f97316';

  // Variables thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const isMicro = entreprise?.formeJuridique === 'Micro-entreprise';
  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

  useEffect(() => { if (snackbar) { const t = setTimeout(() => setSnackbar(null), 8000); return () => clearTimeout(t); } }, [snackbar]);

  const filtered = devis.filter(d => {
    if (filter === 'devis' && d.type !== 'devis') return false;
    if (filter === 'factures' && d.type !== 'facture') return false;
    if (filter === 'attente' && !['envoye', 'vu'].includes(d.statut)) return false;
    if (search && !d.numero?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calcul des totaux avec multi-taux TVA
  const calculateTotals = () => {
    let totalHT = 0;
    const tvaParTaux = {}; // { 10: { base: 0, montant: 0 }, 20: {...} }
    
    form.sections.forEach(s => s.lignes.forEach(l => {
      const montant = l.montant || 0;
      const taux = l.tva !== undefined ? l.tva : form.tvaDefaut;
      totalHT += montant;
      
      if (!tvaParTaux[taux]) tvaParTaux[taux] = { base: 0, montant: 0 };
      tvaParTaux[taux].base += montant;
      tvaParTaux[taux].montant += montant * (taux / 100);
    }));
    
    const remiseAmount = totalHT * (form.remise / 100);
    const htApresRemise = totalHT - remiseAmount;
    
    // Recalculer TVA aprÃ¨s remise (proportionnel)
    const ratioRemise = totalHT > 0 ? htApresRemise / totalHT : 1;
    Object.keys(tvaParTaux).forEach(taux => {
      tvaParTaux[taux].base *= ratioRemise;
      tvaParTaux[taux].montant *= ratioRemise;
    });
    
    const totalTVA = Object.values(tvaParTaux).reduce((s, t) => s + t.montant, 0);
    
    return { 
      totalHT, 
      remiseAmount, 
      htApresRemise, 
      tvaParTaux,
      totalTVA: isMicro ? 0 : totalTVA,
      ttc: htApresRemise + (isMicro ? 0 : totalTVA)
    };
  };
  const totals = calculateTotals();

  // Ajouter ligne avec TVA par dÃ©faut
  const addLigne = (item, sectionId) => {
    const ligne = { 
      id: Date.now().toString(), 
      description: item.nom || '', 
      quantite: 1, 
      unite: item.unite || 'unitÃ©', 
      prixUnitaire: item.prix || 0, 
      prixAchat: item.prixAchat || 0, 
      montant: item.prix || 0,
      tva: form.tvaDefaut // TVA par ligne
    };
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

  // GÃ©nÃ©ration numÃ©ro unique garanti
  const generateNumero = (type) => {
    const prefix = type === 'facture' ? 'FAC' : 'DEV';
    const year = new Date().getFullYear();
    // Trouver le dernier numÃ©ro pour ce type et cette annÃ©e
    const existingNumbers = devis
      .filter(d => d.type === type && d.numero?.startsWith(`${prefix}-${year}-`))
      .map(d => parseInt(d.numero.split('-')[2]) || 0);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `${prefix}-${year}-${String(maxNumber + 1).padStart(5, '0')}`;
  };

  const handleCreate = () => {
    if (!form.clientId) return alert('SÃ©lectionnez un client');
    if (form.sections.every(s => s.lignes.length === 0)) return alert('Ajoutez des lignes');
    
    const client = clients.find(c => c.id === form.clientId);
    
    onSubmit({ 
      numero: generateNumero(form.type), 
      type: form.type, 
      client_id: form.clientId, 
      client_nom: client ? `${client.prenom || ''} ${client.nom}`.trim() : '',
      chantier_id: form.chantierId, 
      date: form.date, 
      validite: form.validite, 
      statut: 'brouillon', 
      sections: form.sections, 
      lignes: form.sections.flatMap(s => s.lignes), 
      tvaParTaux: totals.tvaParTaux,
      tvaDetails: totals.tvaParTaux, // Pour affichage PDF
      remise: form.remise, 
      total_ht: totals.htApresRemise, 
      tva: totals.totalTVA, 
      total_ttc: totals.ttc, 
      notes: form.notes 
    });
    
    setMode('list');
    setForm({ 
      type: 'devis', 
      clientId: '', 
      chantierId: '', 
      date: new Date().toISOString().split('T')[0], 
      validite: entreprise?.validiteDevis || 30, 
      sections: [{ id: '1', titre: '', lignes: [] }], 
      tvaDefaut: entreprise?.tvaDefaut || 10, 
      remise: 0, 
      notes: '' 
    });
  };

  // Canvas signature
  useEffect(() => { if (mode === 'sign' && canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; } }, [mode]);
  const startDraw = (e) => { setIsDrawing(true); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); };
  const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const rect = canvasRef.current.getBoundingClientRect(); ctx.lineTo((e.touches ? e.touches[0].clientX : e.clientX) - rect.left, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top); ctx.stroke(); };
  const endDraw = () => setIsDrawing(false);
  const clearCanvas = () => canvasRef.current?.getContext('2d').clearRect(0, 0, 350, 180);
  const saveSignature = () => { if (!selected) return; onUpdate(selected.id, { signature: canvasRef.current?.toDataURL() || 'signed', signatureDate: new Date().toISOString(), statut: 'accepte' }); setMode('list'); setSelected(null); setSnackbar({ type: 'success', message: 'âœ… Devis signÃ© et acceptÃ© !' }); };

  // Workflow facturation
  const getAcompteFacture = (devisId) => devis.find(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'acompte');
  const getSoldeFacture = (devisId) => devis.find(d => d.type === 'facture' && d.devis_source_id === devisId && d.facture_type === 'solde');
  const getFacturesLiees = (devisId) => devis.filter(d => d.type === 'facture' && d.devis_source_id === devisId);

  const createAcompte = () => {
    if (!selected || selected.statut !== 'accepte') return alert('Le devis doit Ãªtre acceptÃ©');
    if (getAcompteFacture(selected.id)) return alert('Un acompte existe dÃ©jÃ ');
    const montantHT = selected.total_ht * (acomptePct / 100);
    const tva = montantHT * (selected.tvaRate / 100);
    const ttc = montantHT + tva;
    const facture = { id: Date.now().toString(), numero: generateNumero('facture'), type: 'facture', facture_type: 'acompte', devis_source_id: selected.id, client_id: selected.client_id, chantier_id: selected.chantier_id, date: new Date().toISOString().split('T')[0], statut: 'envoye', tvaRate: selected.tvaRate, lignes: [{ id: '1', description: `Acompte ${acomptePct}% sur devis ${selected.numero}`, quantite: 1, unite: 'forfait', prixUnitaire: montantHT, montant: montantHT }], total_ht: montantHT, tva, total_ttc: ttc, acompte_pct: acomptePct };
    onSubmit(facture);
    onUpdate(selected.id, { statut: 'acompte_facture', acompte_pct: acomptePct });
    setShowAcompteModal(false);
    setSelected({ ...selected, statut: 'acompte_facture', acompte_pct: acomptePct });
    setSnackbar({ type: 'success', message: `âœ… Facture d'acompte ${facture.numero} crÃ©Ã©e`, action: { label: 'Voir la facture â†’', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  };

  const createSolde = () => {
    if (!selected) return;
    const acompte = getAcompteFacture(selected.id);
    const montantAcompteHT = acompte ? acompte.total_ht : 0;
    const montantSoldeHT = selected.total_ht - montantAcompteHT;
    const tva = montantSoldeHT * (selected.tvaRate / 100);
    const ttc = montantSoldeHT + tva;
    const lignes = [...(selected.lignes || [])];
    if (acompte) lignes.push({ id: 'acompte', description: `Acompte dÃ©jÃ  facturÃ© (${acompte.numero})`, quantite: 1, unite: 'forfait', prixUnitaire: -montantAcompteHT, montant: -montantAcompteHT });
    const facture = { id: Date.now().toString(), numero: generateNumero('facture'), type: 'facture', facture_type: acompte ? 'solde' : 'totale', devis_source_id: selected.id, acompte_facture_id: acompte?.id, client_id: selected.client_id, chantier_id: selected.chantier_id, date: new Date().toISOString().split('T')[0], statut: 'envoye', tvaRate: selected.tvaRate, lignes, total_ht: montantSoldeHT, tva, total_ttc: ttc };
    onSubmit(facture);
    onUpdate(selected.id, { statut: 'facture' });
    setSelected({ ...selected, statut: 'facture' });
    setSnackbar({ type: 'success', message: `âœ… Facture ${acompte ? 'de solde' : ''} ${facture.numero} crÃ©Ã©e`, action: { label: 'Voir la facture â†’', onClick: () => { setSelected(facture); setSnackbar(null); } } });
  };

  // PDF Generation - CONFORME LÃ‰GISLATION FRANÃ‡AISE
  const downloadPDF = (doc) => {
    const client = clients.find(c => c.id === doc.client_id);
    const chantier = chantiers.find(c => c.id === doc.chantier_id);
    const isFacture = doc.type === 'facture';
    const isMicro = entreprise?.formeJuridique === 'Micro-entreprise';
    const dateValidite = new Date(doc.date);
    dateValidite.setDate(dateValidite.getDate() + (doc.validite || entreprise?.validiteDevis || 30));
    
    const lignesHTML = (doc.lignes || []).map(l => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">${l.description}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unite||'unitÃ©'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${(l.prixUnitaire||0).toFixed(2)} €</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${isMicro ? '-' : (doc.tvaRate||10)+'%'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;${l.montant<0?'color:#dc2626;':''}">${(l.montant||0).toFixed(2)} €</td>
      </tr>
    `).join('');

    const content = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${isFacture?'Facture':'Devis'} ${doc.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; padding: 25px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid ${couleur}; }
    .logo-section { max-width: 55%; }
    .logo { font-size: 16pt; font-weight: bold; color: ${couleur}; margin-bottom: 8px; }
    .entreprise-info { font-size: 8pt; color: #64748b; line-height: 1.5; }
    .entreprise-legal { font-size: 7pt; color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .doc-type { text-align: right; }
    .doc-type h1 { font-size: 22pt; color: ${couleur}; margin-bottom: 8px; letter-spacing: 1px; }
    .doc-info { font-size: 9pt; color: #64748b; }
    .doc-info strong { color: #1e293b; }
    .client-section { display: flex; gap: 20px; margin-bottom: 20px; }
    .info-block { flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid ${couleur}; }
    .info-block h3 { font-size: 8pt; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-block .name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    thead { background: ${couleur}; color: white; }
    th { padding: 10px 8px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; }
    th:not(:first-child) { text-align: center; }
    th:last-child { text-align: right; }
    .totals { margin-left: auto; width: 260px; margin-top: 15px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 10pt; }
    .totals .row.sub { background: #f8fafc; border-radius: 4px; margin-bottom: 2px; }
    .totals .total { background: ${couleur}; color: white; padding: 12px; border-radius: 6px; font-size: 13pt; font-weight: bold; margin-top: 8px; }
    .conditions { background: #f1f5f9; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 7.5pt; line-height: 1.6; }
    .conditions h4 { font-size: 8pt; margin-bottom: 8px; color: #475569; }
    .conditions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .garanties { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px; border-radius: 6px; margin-top: 15px; font-size: 7.5pt; }
    .garanties h4 { color: #065f46; margin-bottom: 6px; }
    .retractation { background: #fef3c7; border: 1px solid #fcd34d; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 7.5pt; color: #92400e; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 25px; gap: 20px; }
    .signature-box { width: 48%; border: 1px solid #cbd5e1; padding: 12px; min-height: 90px; border-radius: 6px; }
    .signature-box h4 { font-size: 9pt; margin-bottom: 4px; }
    .signature-box p { font-size: 7pt; color: #64748b; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #64748b; text-align: center; line-height: 1.6; }
    .assurances { font-size: 7pt; color: #64748b; margin-top: 8px; }
    .micro-mention { background: #dbeafe; padding: 8px; border-radius: 4px; font-size: 8pt; color: #1e40af; margin-top: 10px; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo-section">
      <div class="logo">${entreprise?.nom || 'Mon Entreprise'}</div>
      <div class="entreprise-info">
        ${entreprise?.formeJuridique ? `<strong>${entreprise.formeJuridique}</strong>${entreprise?.capital ? ` - Capital: ${entreprise.capital} €` : ''}<br>` : ''}
        ${entreprise?.adresse?.replace(/\n/g, '<br>') || ''}<br>
        ${entreprise?.tel ? `TÃ©l: ${entreprise.tel}` : ''} ${entreprise?.email ? `â€¢ ${entreprise.email}` : ''}
      </div>
      <div class="entreprise-legal">
        ${entreprise?.siret ? `SIRET: ${entreprise.siret}` : ''}
        ${entreprise?.codeApe ? ` â€¢ APE: ${entreprise.codeApe}` : ''}
        ${entreprise?.rcs ? `<br>RCS: ${entreprise.rcs}` : ''}
        ${entreprise?.tvaIntra ? `<br>TVA Intra: ${entreprise.tvaIntra}` : ''}
        ${isMicro ? '<br><em>TVA non applicable, art. 293 B du CGI</em>' : ''}
      </div>
    </div>
    <div class="doc-type">
      <h1>${isFacture ? 'FACTURE' : 'DEVIS'}</h1>
      <div class="doc-info">
        <strong>NÂ° ${doc.numero}</strong><br>
        Date: ${new Date(doc.date).toLocaleDateString('fr-FR')}<br>
        ${!isFacture ? `<strong>Valable jusqu'au: ${dateValidite.toLocaleDateString('fr-FR')}</strong>` : ''}
      </div>
    </div>
  </div>

  <!-- CLIENT & CHANTIER -->
  <div class="client-section">
    <div class="info-block">
      <h3>Client</h3>
      <div class="name">${client?.prenom || ''} ${client?.nom || ''}</div>
      ${client?.entreprise ? `<div style="font-size:9pt;color:#64748b">${client.entreprise}</div>` : ''}
      <div style="font-size:9pt">${client?.adresse || ''}</div>
      <div style="font-size:9pt">${client?.code_postal || ''} ${client?.ville || ''}</div>
      ${client?.telephone ? `<div style="font-size:8pt;color:#64748b;margin-top:4px">TÃ©l: ${client.telephone}</div>` : ''}
      ${client?.email ? `<div style="font-size:8pt;color:#64748b">${client.email}</div>` : ''}
    </div>
    ${chantier ? `
    <div class="info-block">
      <h3>Lieu d'exÃ©cution</h3>
      <div class="name">${chantier.nom}</div>
      <div style="font-size:9pt">${chantier.adresse || client?.adresse || ''}</div>
    </div>
    ` : ''}
  </div>

  <!-- TABLEAU PRESTATIONS -->
  <table>
    <thead>
      <tr>
        <th style="width:40%">Description</th>
        <th style="width:10%">QtÃ©</th>
        <th style="width:10%">UnitÃ©</th>
        <th style="width:15%">PU HT</th>
        <th style="width:10%">TVA</th>
        <th style="width:15%">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHTML}
    </tbody>
  </table>

  <!-- TOTAUX -->
  <div class="totals">
    <div class="row sub"><span>Total HT</span><span>${(doc.total_ht||0).toFixed(2)} €</span></div>
    ${doc.remise ? `<div class="row sub" style="color:#dc2626"><span>Remise ${doc.remise}%</span><span>-${((doc.total_ht||0) * doc.remise / 100).toFixed(2)} €</span></div>` : ''}
    ${!isMicro ? (doc.tvaDetails && Object.keys(doc.tvaDetails).length > 0 
      ? Object.entries(doc.tvaDetails).filter(([_, data]) => data.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([taux, data]) => 
        `<div class="row sub"><span>TVA ${taux}% (base: ${data.base.toFixed(2)} €)</span><span>${data.montant.toFixed(2)} €</span></div>`
      ).join('')
      : `<div class="row sub"><span>TVA ${doc.tvaRate||10}%</span><span>${(doc.tva||0).toFixed(2)} €</span></div>`
    ) : ''}
    <div class="row total"><span>Total TTC</span><span>${(doc.total_ttc||0).toFixed(2)} €</span></div>
    ${doc.acompte_pct ? `
    <div class="row sub" style="margin-top:8px;border-top:1px dashed #ccc;padding-top:8px"><span>Acompte ${doc.acompte_pct}%</span><span>${((doc.total_ttc||0) * doc.acompte_pct / 100).toFixed(2)} €</span></div>
    <div class="row sub"><span>Solde Ã  rÃ©gler</span><span>${((doc.total_ttc||0) * (100-doc.acompte_pct) / 100).toFixed(2)} €</span></div>
    ` : ''}
  </div>

  ${isMicro ? '<div class="micro-mention">TVA non applicable, article 293 B du Code GÃ©nÃ©ral des ImpÃ´ts</div>' : ''}

  <!-- CONDITIONS -->
  <div class="conditions">
    <h4>CONDITIONS GÃ‰NÃ‰RALES</h4>
    <div class="conditions-grid">
      <div>
        <strong>ModalitÃ©s de paiement</strong><br>
        â€¢ Virement bancaire<br>
        â€¢ ChÃ¨que Ã  l'ordre de ${entreprise?.nom || '[Entreprise]'}<br>
        â€¢ EspÃ¨ces (max 1 000 € pour particulier)<br>
        ${entreprise?.iban ? `<br><strong>IBAN:</strong> ${entreprise.iban}` : ''}
        ${entreprise?.bic ? ` â€¢ <strong>BIC:</strong> ${entreprise.bic}` : ''}
      </div>
      <div>
        <strong>DÃ©lai de paiement</strong><br>
        ${entreprise?.delaiPaiement || 30} jours Ã  compter de la date ${isFacture ? 'de facture' : 'de rÃ©ception des travaux'}.<br><br>
        <strong>PÃ©nalitÃ©s de retard</strong><br>
        Taux BCE + 10 points (soit ~13% annuel).<br>
        IndemnitÃ© forfaitaire de recouvrement: 40 €
      </div>
    </div>
  </div>

  ${!isFacture && (entreprise?.mentionGaranties !== false) ? `
  <!-- GARANTIES LÃ‰GALES -->
  <div class="garanties">
    <h4>ðŸ›¡ï¸ GARANTIES LÃ‰GALES (Code civil & Code de la construction)</h4>
    <strong>1. Garantie de parfait achÃ¨vement</strong> - 1 an Ã  compter de la rÃ©ception des travaux<br>
    <strong>2. Garantie de bon fonctionnement</strong> - 2 ans (Ã©quipements dissociables)<br>
    <strong>3. Garantie dÃ©cennale</strong> - 10 ans (soliditÃ© de l'ouvrage)
  </div>
  ` : ''}

  ${!isFacture && (entreprise?.mentionRetractation !== false) ? `
  <!-- DROIT DE RÃ‰TRACTATION -->
  <div class="retractation">
    <strong>âš ï¸ DROIT DE RÃ‰TRACTATION</strong> (Art. L221-18 du Code de la consommation)<br>
    Vous disposez d'un dÃ©lai de <strong>14 jours</strong> pour exercer votre droit de rÃ©tractation sans justification ni pÃ©nalitÃ©.
    Le dÃ©lai court Ã  compter de la signature du prÃ©sent devis.
    Pour l'exercer, envoyez une lettre recommandÃ©e AR Ã : ${entreprise?.adresse?.split('\\n')[0] || '[Adresse]'}
  </div>
  ` : ''}

  ${entreprise?.cgv ? `
  <!-- CGV PERSONNALISÃ‰ES -->
  <div class="conditions" style="margin-top:10px">
    <h4>CONDITIONS PARTICULIÃˆRES</h4>
    ${entreprise.cgv}
  </div>
  ` : ''}

  ${!isFacture ? `
  <!-- SIGNATURES -->
  <div class="signature-section">
    <div class="signature-box">
      <h4>L'Entreprise</h4>
      <p>Bon pour accord<br>Date et signature</p>
    </div>
    <div class="signature-box">
      <h4>Le Client</h4>
      <p>Signature prÃ©cÃ©dÃ©e de la mention manuscrite:<br><strong>"Bon pour accord"</strong> + Date</p>
      ${doc.signature ? '<div style="margin-top:15px;color:#16a34a;font-weight:bold">âœ… SignÃ© Ã©lectroniquement le '+new Date(doc.signatureDate).toLocaleDateString('fr-FR')+'</div>' : ''}
    </div>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <strong>${entreprise?.nom || ''}</strong>
    ${entreprise?.formeJuridique ? ` â€¢ ${entreprise.formeJuridique}` : ''}
    ${entreprise?.capital ? ` â€¢ Capital: ${entreprise.capital} €` : ''}<br>
    ${entreprise?.siret ? `SIRET: ${entreprise.siret}` : ''}
    ${entreprise?.codeApe ? ` â€¢ APE: ${entreprise.codeApe}` : ''}
    ${getRCSComplet() ? ` â€¢ ${getRCSComplet()}` : ''}<br>
    ${entreprise?.tvaIntra ? `TVA Intracommunautaire: ${entreprise.tvaIntra}<br>` : ''}
    <div class="assurances">
      ${entreprise?.rcProAssureur ? `RC Pro: ${entreprise.rcProAssureur} NÂ°${entreprise.rcProNumero}${entreprise.rcProValidite ? ` (Valide: ${new Date(entreprise.rcProValidite).toLocaleDateString('fr-FR')})` : ''}` : ''}
      ${entreprise?.rcProAssureur && entreprise?.decennaleAssureur ? '<br>' : ''}
      ${entreprise?.decennaleAssureur ? `DÃ©cennale: ${entreprise.decennaleAssureur} NÂ°${entreprise.decennaleNumero}${entreprise.decennaleValidite ? ` (Valide: ${new Date(entreprise.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}` : ''}
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(content);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const sendWhatsApp = (doc) => { const client = clients.find(c => c.id === doc.client_id); const phone = (client?.telephone || '').replace(/\s/g, '').replace(/^0/, '33'); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour, voici votre ${doc.type} ${doc.numero}: ${formatMoney(doc.total_ttc)}`)}`, '_blank'); if (doc.statut === 'brouillon') onUpdate(doc.id, { statut: 'envoye' }); };
  const sendEmail = (doc) => { const client = clients.find(c => c.id === doc.client_id); window.location.href = `mailto:${client?.email || ''}?subject=${doc.type === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}&body=Bonjour,%0A%0AVeuillez trouver ci-joint votre ${doc.type} ${doc.numero} d'un montant de ${formatMoney(doc.total_ttc)}.%0A%0ACordialement`; if (doc.statut === 'brouillon') onUpdate(doc.id, { statut: 'envoye' }); };

  const Snackbar = () => snackbar && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-pulse">
      <div className={`flex items-center gap-4 px-5 py-3 rounded-xl shadow-2xl ${snackbar.type === 'success' ? 'bg-emerald-600' : 'bg-slate-800'} text-white`}>
        <span>{snackbar.message}</span>
        {snackbar.action && <button onClick={snackbar.action.onClick} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium">{snackbar.action.label}</button>}
        <button onClick={() => setSnackbar(null)} className="hover:bg-white/20 rounded-full p-1">âœ•</button>
      </div>
    </div>
  );

  // === SIGNATURE VIEW ===
  if (mode === 'sign' && selected) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => setMode('preview')} className="p-2 ${hoverBg} rounded-xl">â†</button><h1 className={`text-2xl font-bold ${textPrimary}`}>Signature Client</h1></div>
      <div className={`rounded-2xl border ${cardBg} p-6 text-center`}>
        <p className="mb-4">Signature pour <strong>{selected.numero}</strong></p>
        <p className="text-3xl font-bold mb-6" style={{color: couleur}}>{formatMoney(selected.total_ttc)}</p>
        <canvas ref={canvasRef} width={350} height={180} className="border-2 border-dashed rounded-xl mx-auto touch-none" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        <p className="text-sm text-slate-500 mt-2">Dessinez votre signature ci-dessus</p>
        <div className="flex justify-center gap-4 mt-4">
          <button onClick={clearCanvas} className="px-6 py-3 bg-slate-100 rounded-xl">Effacer</button>
          <button onClick={saveSignature} className="px-6 py-3 text-white rounded-xl" style={{background: couleur}}>âœ… Valider</button>
        </div>
      </div>
      <Snackbar />
    </div>
  );

  // === PREVIEW VIEW ===
  if (mode === 'preview' && selected) {
    const client = clients.find(c => c.id === selected.client_id);
    const facturesLiees = getFacturesLiees(selected.id);
    const acompteFacture = getAcompteFacture(selected.id);
    const soldeFacture = getSoldeFacture(selected.id);
    const resteAFacturer = selected.total_ttc - facturesLiees.reduce((s, f) => s + (f.total_ttc || 0), 0);
    const isDevis = selected.type === 'devis';
    const canAcompte = isDevis && selected.statut === 'accepte' && !acompteFacture;
    const canFacturer = isDevis && ['accepte', 'acompte_facture'].includes(selected.statut) && !soldeFacture && resteAFacturer > 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => { setMode('list'); setSelected(null); }} className="p-2 ${hoverBg} dark:hover:bg-slate-700 rounded-xl">â†</button>
          <h1 className={`text-xl font-bold ${textPrimary}`}>{selected.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-sm ${selected.statut === 'accepte' ? 'bg-emerald-100 text-emerald-700' : selected.statut === 'payee' ? 'bg-purple-100 text-purple-700' : selected.statut === 'acompte_facture' ? 'bg-blue-100 text-blue-700' : selected.statut === 'facture' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {{ brouillon: 'Brouillon', envoye: 'EnvoyÃ©', accepte: 'AcceptÃ©', acompte_facture: 'Acompte facturÃ©', facture: 'FacturÃ©', payee: 'PayÃ©e', refuse: 'RefusÃ©' }[selected.statut] || selected.statut}
          </span>
          <div className="flex-1" />
          <button onClick={() => { downloadPDF(selected); }} className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center gap-2">ðŸ“¥ <span className="hidden sm:inline">PDF</span></button>
          <button onClick={() => { if(confirm('Supprimer ce document ?')) { onDelete(selected.id); setSelected(null); setMode('list'); }}} className="p-2 hover:bg-red-100 text-red-500 rounded-xl">ðŸ—‘ï¸</button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {isDevis && selected.statut === 'envoye' && <button onClick={() => setMode('sign')} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>âœï¸ Faire signer</button>}
          {canAcompte && <button onClick={() => setShowAcompteModal(true)} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl">ðŸ’° Demander un acompte</button>}
          {canFacturer && (
            <div className="relative group">
              <button onClick={createSolde} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                ðŸ§¾ {acompteFacture ? `Facturer le solde (${formatMoney(resteAFacturer)})` : 'Facturer intÃ©gralement'}
              </button>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs">
                  {acompteFacture ? 'CrÃ©er la facture finale avec dÃ©duction de l\'acompte' : 'CrÃ©er une facture unique pour le montant total sans acompte'}
                </div>
              </div>
            </div>
          )}
          {isDevis && selected.statut === 'facture' && <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl">âœ… EntiÃ¨rement facturÃ©</span>}
          <button onClick={() => sendWhatsApp(selected)} className="px-4 py-2 bg-green-500 text-white rounded-xl">ðŸ“± WhatsApp</button>
          <button onClick={() => sendEmail(selected)} className="px-4 py-2 bg-blue-500 text-white rounded-xl">ðŸ“§ Email</button>
        </div>

        {/* Info workflow */}
        {isDevis && selected.statut === 'accepte' && !acompteFacture && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ðŸ’¡</span>
              <div><p className="font-medium text-amber-800">Prochaine Ã©tape : Facturation</p><p className="text-sm text-amber-700 mt-1">Vous pouvez <strong>demander un acompte</strong> (recommandÃ© pour les gros montants) ou <strong>facturer intÃ©gralement</strong>.</p></div>
            </div>
          </div>
        )}

        {/* Acompte existant */}
        {acompteFacture && isDevis && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">ðŸ’°</span>
                <div><p className="font-medium">Acompte facturÃ©</p><button onClick={() => setSelected(acompteFacture)} className="text-sm text-blue-600 hover:underline">{acompteFacture.numero} â€¢ {formatMoney(acompteFacture.total_ttc)} â†’</button></div>
              </div>
              <div className="text-right"><p className="text-sm text-slate-500">Reste Ã  facturer</p><p className="font-bold text-lg">{formatMoney(resteAFacturer)}</p></div>
            </div>
            <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${selected.acompte_pct}%` }} /></div>
          </div>
        )}

        {/* Document */}
        <div className={`rounded-2xl border ${cardBg} p-6`}>
          <div className="flex justify-between items-start mb-6 pb-6 border-b">
            <div className="flex items-center gap-4">
              {entreprise?.logo ? <img src={entreprise.logo} className="h-14" alt="" /> : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl" style={{background: `${couleur}20`}}>ðŸ¢</div>}
              <div><p className="font-bold">{entreprise?.nom}</p><p className="text-sm text-slate-500">{entreprise?.adresse}</p></div>
            </div>
            <div className="text-right"><p className={`text-xl font-bold ${textPrimary}`} style={{color: couleur}}>{selected.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p><p className="text-slate-500">{selected.numero}</p><p className="text-sm text-slate-400">{new Date(selected.date).toLocaleDateString('fr-FR')}</p></div>
          </div>
          <div className="mb-6 p-4 bg-slate-50 rounded-xl"><p className="text-sm text-slate-500">Client</p><p className="font-semibold">{client?.nom} {client?.prenom}</p>{client?.adresse && <p className="text-sm text-slate-500">{client.adresse}</p>}</div>
          <table className="w-full mb-6 text-sm"><thead><tr className="border-b"><th className="text-left py-2">Description</th><th className="text-right py-2 w-16">QtÃ©</th><th className="text-right py-2 w-20">PU HT</th><th className="text-right py-2 w-24">Total</th></tr></thead><tbody>{(selected.lignes || []).map((l, i) => <tr key={i} className="border-b"><td className="py-2">{l.description}</td><td className="text-right">{l.quantite} {l.unite}</td><td className="text-right">{(l.prixUnitaire || 0).toFixed(2)}€</td><td className={`text-right font-medium ${l.montant < 0 ? 'text-red-500' : ''}`}>{(l.montant || 0).toFixed(2)}€</td></tr>)}</tbody></table>
          <div className="flex justify-end"><div className="w-56"><div className="flex justify-between py-1"><span>HT</span><span>{formatMoney(selected.total_ht)}</span></div><div className="flex justify-between py-1"><span>TVA {selected.tvaRate}%</span><span>{formatMoney(selected.tva)}</span></div><div className="flex justify-between py-2 border-t font-bold" style={{color: couleur}}><span>TTC</span><span>{formatMoney(selected.total_ttc)}</span></div></div></div>
          {selected.signature && <div className="mt-6 pt-6 border-t"><p className="text-sm text-slate-500">SignÃ© le {new Date(selected.signatureDate).toLocaleDateString('fr-FR')}</p><span className="text-emerald-600 font-medium">âœ… AcceptÃ© par le client</span></div>}
        </div>

        {/* Timeline */}
        {isDevis && facturesLiees.length > 0 && (
          <div className={`rounded-2xl border ${cardBg} p-6`}>
            <h3 className="font-semibold mb-4">ðŸ“Š Historique Facturation</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-500" /><div><p className="text-sm">{new Date(selected.date).toLocaleDateString('fr-FR')} - Devis crÃ©Ã©</p></div></div>
              {selected.signatureDate && <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-500" /><div><p className="text-sm">{new Date(selected.signatureDate).toLocaleDateString('fr-FR')} - AcceptÃ© âœ…</p></div></div>}
              {facturesLiees.map(f => (
                <div key={f.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2" onClick={() => setSelected(f)}>
                  <span className={`w-3 h-3 rounded-full ${f.statut === 'payee' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div className="flex-1"><p className="text-sm">{new Date(f.date).toLocaleDateString('fr-FR')} - {f.facture_type === 'acompte' ? 'Acompte' : f.facture_type === 'solde' ? 'Solde' : 'Facture'}</p><p className="text-xs text-slate-500">{f.numero} â€¢ {formatMoney(f.total_ttc)}</p></div>
                  <span className="text-slate-400">â†’</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lien vers devis source */}
        {selected.type === 'facture' && selected.devis_source_id && (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500 mb-1">Devis source</p>
            <button onClick={() => { const src = devis.find(d => d.id === selected.devis_source_id); if (src) setSelected(src); }} className="text-sm font-medium hover:underline" style={{ color: couleur }}>â† Voir le devis</button>
          </div>
        )}

        {/* Statut */}
        <div className={`rounded-2xl border ${cardBg} p-4`}>
          <label className="text-sm font-medium mr-3">Statut:</label>
          <select value={selected.statut} onChange={e => { onUpdate(selected.id, { statut: e.target.value }); setSelected(s => ({...s, statut: e.target.value})); }} className="px-3 py-2 border rounded-xl">
            <option value="brouillon">Brouillon</option>
            <option value="envoye">EnvoyÃ©</option>
            {isDevis && <option value="accepte">AcceptÃ©</option>}
            {isDevis && <option value="refuse">RefusÃ©</option>}
            {selected.type === 'facture' && <option value="payee">PayÃ©e</option>}
          </select>
        </div>

        {/* Modal Acompte */}
        {showAcompteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-2">ðŸ’° Facture d'acompte</h3>
              <p className="text-slate-500 mb-4 text-sm">SÃ©curisez votre engagement avant les travaux</p>
              <div className="space-y-3 mb-4">
                {[20, 30, 40, 50].map(pct => (
                  <button key={pct} onClick={() => setAcomptePct(pct)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${acomptePct === pct ? 'border-purple-500 bg-purple-50' : 'border-slate-200'}`}>
                    <span className="font-medium">Acompte {pct}%</span>
                    <span className="text-lg font-bold" style={{ color: acomptePct === pct ? couleur : '#64748b' }}>{formatMoney(selected.total_ttc * pct / 100)}</span>
                  </button>
                ))}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <input type="number" min="1" max="99" value={acomptePct} onChange={e => setAcomptePct(parseInt(e.target.value) || 30)} className="w-20 px-3 py-2 border rounded-xl text-center" />
                  <span className="text-slate-500">%</span>
                  <span className="ml-auto font-bold">{formatMoney(selected.total_ttc * acomptePct / 100)}</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">ðŸ’¡ Pour travaux > 1500€ chez particulier, acompte max 30%</div>
              <div className="flex gap-3">
                <button onClick={() => setShowAcompteModal(false)} className="flex-1 px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
                <button onClick={createAcompte} className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-xl">CrÃ©er</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Preview */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold">AperÃ§u {selected.type === 'facture' ? 'Facture' : 'Devis'}</h3>
                <div className="flex gap-2">
                  <button onClick={() => downloadPDF(selected)} className="px-4 py-2 bg-blue-500 text-white rounded-xl">ðŸ“¥ TÃ©lÃ©charger</button>
                  <button onClick={() => setShowPreview(false)} className="p-2 ${hoverBg} rounded-xl">âœ•</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-slate-100">
                <div className="bg-white shadow-lg rounded-lg p-8 max-w-2xl mx-auto">
                  <div className="text-center mb-6"><p className={`text-2xl font-bold ${textPrimary}`} style={{color: couleur}}>{selected.type === 'facture' ? 'FACTURE' : 'DEVIS'}</p><p className="text-slate-500">{selected.numero}</p></div>
                  <p className="text-sm text-slate-500">Ceci est un aperÃ§u. Cliquez sur "TÃ©lÃ©charger" pour obtenir le PDF complet.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Snackbar />
      </div>
    );
  }

  // === CREATE VIEW ===
  if (mode === 'create') {
    const favoris = catalogue?.filter(c => c.favori) || [];
    const catalogueFiltered = catalogue?.filter(c => !catalogueSearch || c.nom?.toLowerCase().includes(catalogueSearch.toLowerCase())) || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><button onClick={() => setMode('list')} className="p-2 ${hoverBg} rounded-xl">â†</button><h1 className={`text-2xl font-bold ${textPrimary}`}>Nouveau {form.type}</h1></div>
        <div className={`rounded-2xl border ${cardBg} p-6 space-y-6`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-sm mb-1">Type</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}><option value="devis">Devis</option><option value="facture">Facture</option></select></div>
            <div><label className="block text-sm mb-1">Client *</label><div className="flex gap-2"><select className="flex-1 px-4 py-2.5 border rounded-xl" value={form.clientId} onChange={e => setForm(p => ({...p, clientId: e.target.value}))}><option value="">Choisir...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select><button onClick={() => setShowClientModal(true)} className="px-3 rounded-xl" style={{background: `${couleur}20`, color: couleur}}>+</button></div></div>
            <div><label className="block text-sm mb-1">Chantier</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.chantierId} onChange={e => setForm(p => ({...p, chantierId: e.target.value}))}><option value="">Aucun</option>{chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
            <div><label className="block text-sm mb-1">Date</label><input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
          </div>
          
          {/* TVA par dÃ©faut pour nouvelles lignes */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
            <span className="text-sm text-slate-600">TVA par dÃ©faut pour les nouvelles lignes:</span>
            <select className="px-3 py-1.5 border rounded-lg text-sm" value={form.tvaDefaut} onChange={e => setForm(p => ({...p, tvaDefaut: parseFloat(e.target.value)}))}>
              <option value={20}>20% (normal)</option>
              <option value={10}>10% (rÃ©novation)</option>
              <option value={5.5}>5,5% (Ã©co-rÃ©no)</option>
              <option value={0}>0% (exonÃ©rÃ©)</option>
            </select>
            {isMicro && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">TVA non applicable (micro)</span>}
          </div>
          
          {favoris.length >= 3 && <div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-sm font-medium mb-2">â­ Favoris</p><div className="flex gap-2 flex-wrap">{favoris.map(item => <button key={item.id} onClick={() => addLigne(item, form.sections[0].id)} className="px-3 py-2 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg text-sm">{item.nom} <span className="text-slate-500">{item.prix}€</span></button>)}</div></div>}
          <div><input placeholder="ðŸ” Rechercher dans le catalogue..." value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} />{catalogueSearch && <div className="mt-2 border rounded-xl max-h-40 overflow-y-auto">{catalogueFiltered.map(item => <button key={item.id} onClick={() => { addLigne(item, form.sections[0].id); setCatalogueSearch(''); }} className="w-full flex justify-between px-4 py-2 hover:bg-slate-50 border-b last:border-0 text-left"><span>{item.nom}</span><span className="text-slate-500">{item.prix}€/{item.unite}</span></button>)}</div>}</div>
          
          {/* Table avec TVA par ligne */}
          {form.sections.map(section => (
            <div key={section.id} className="border rounded-xl p-4 overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="w-16 text-center py-2">QtÃ©</th>
                    <th className="w-20 text-center py-2">UnitÃ©</th>
                    <th className="w-24 text-right py-2">PU HT</th>
                    <th className="w-20 text-center py-2">TVA</th>
                    <th className="w-24 text-right py-2">Total HT</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {section.lignes.map(l => (
                    <tr key={l.id} className="border-b">
                      <td className="py-2"><input value={l.description} onChange={e => updateLigne(section.id, l.id, 'description', e.target.value)} className="w-full px-2 py-1 border rounded" /></td>
                      <td><input type="number" value={l.quantite} onChange={e => updateLigne(section.id, l.id, 'quantite', parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded text-center" /></td>
                      <td><input value={l.unite} onChange={e => updateLigne(section.id, l.id, 'unite', e.target.value)} className="w-full px-2 py-1 border rounded text-center" /></td>
                      <td><input type="number" value={l.prixUnitaire} onChange={e => updateLigne(section.id, l.id, 'prixUnitaire', parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded text-right" /></td>
                      <td>
                        <select value={l.tva !== undefined ? l.tva : form.tvaDefaut} onChange={e => updateLigne(section.id, l.id, 'tva', parseFloat(e.target.value))} className="w-full px-1 py-1 border rounded text-center text-xs">
                          <option value={20}>20%</option>
                          <option value={10}>10%</option>
                          <option value={5.5}>5,5%</option>
                          <option value={0}>0%</option>
                        </select>
                      </td>
                      <td className="text-right font-medium">{(l.montant || 0).toFixed(2)}€</td>
                      <td><button onClick={() => removeLigne(section.id, l.id)} className="text-red-400 hover:text-red-600">âœ•</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => addLigne({ nom: '', prix: 0, unite: 'unitÃ©' }, section.id)} className="mt-3 text-sm hover:underline" style={{color: couleur}}>+ Ajouter une ligne</button>
            </div>
          ))}
          
          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm mb-1">Remise globale %</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.remise} onChange={e => setForm(p => ({...p, remise: parseFloat(e.target.value) || 0}))} /></div>
            <div><label className="block text-sm mb-1">ValiditÃ© (jours)</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.validite} onChange={e => setForm(p => ({...p, validite: parseInt(e.target.value) || 30}))} /></div>
          </div>
          
          {/* Totaux avec multi-TVA */}
          <div className="flex justify-end">
            <div className="w-72 bg-slate-50 p-4 rounded-xl">
              <div className="flex justify-between py-1"><span>Total HT</span><span>{formatMoney(totals.totalHT)}</span></div>
              {form.remise > 0 && <div className="flex justify-between py-1 text-red-500"><span>Remise {form.remise}%</span><span>-{formatMoney(totals.remiseAmount)}</span></div>}
              {!isMicro && Object.entries(totals.tvaParTaux).filter(([_, data]) => data.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([taux, data]) => (
                <div key={taux} className="flex justify-between py-1 text-sm text-slate-600">
                  <span>TVA {taux}%</span>
                  <span>{formatMoney(data.montant)}</span>
                </div>
              ))}
              {isMicro && <div className="text-xs text-blue-600 py-1">TVA non applicable (art. 293B CGI)</div>}
              <div className="flex justify-between py-2 border-t font-bold mt-1" style={{color: couleur}}><span>Total TTC</span><span>{formatMoney(totals.ttc)}</span></div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t"><button onClick={() => setMode('list')} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={handleCreate} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>CrÃ©er le {form.type}</button></div>
        </div>
        {showClientModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-md"><h3 className="font-bold mb-4">Nouveau client</h3><div className="space-y-4"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Nom *" value={newClient.nom} onChange={e => setNewClient(p => ({...p, nom: e.target.value}))} /><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="TÃ©lÃ©phone" value={newClient.telephone} onChange={e => setNewClient(p => ({...p, telephone: e.target.value}))} /></div><div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowClientModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button><button onClick={() => { if (newClient.nom) { const c = { id: Date.now().toString(), ...newClient }; setClients(prev => [...prev, c]); setForm(p => ({...p, clientId: c.id})); setShowClientModal(false); setNewClient({ nom: '', telephone: '' }); }}} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>CrÃ©er</button></div></div></div>}
        <Snackbar />
      </div>
    );
  }

  // === LIST VIEW ===
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4"><h1 className={`text-2xl font-bold ${textPrimary}`}>Devis & Factures</h1><button onClick={() => setMode('create')} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">Devis en attente</p><p className="text-2xl font-bold text-amber-500">{devis.filter(d => d.type === 'devis' && d.statut === 'envoye').length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">Devis acceptÃ©s</p><p className="text-2xl font-bold text-emerald-500">{devis.filter(d => d.type === 'devis' && ['accepte', 'acompte_facture', 'facture'].includes(d.statut)).length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">Factures non payÃ©es</p><p className="text-2xl font-bold text-blue-500">{devis.filter(d => d.type === 'facture' && d.statut !== 'payee').length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">Ã€ encaisser</p><p className="text-2xl font-bold text-purple-500">{formatMoney(devis.filter(d => d.type === 'facture' && d.statut !== 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0))}</p></div>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <input placeholder="ðŸ” Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 max-w-xs px-4 py-2 border rounded-xl" />
        {[['all', 'Tous'], ['devis', 'Devis'], ['factures', 'Factures'], ['attente', 'En attente']].map(([k, v]) => <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === k ? 'text-white' : 'bg-slate-100'}`} style={filter === k ? {background: couleur} : {}}>{v}</button>)}
      </div>
      {filtered.length === 0 ? <div className={`rounded-2xl border ${cardBg} p-12 text-center`}><p className="text-5xl mb-4">ðŸ“„</p><p className="text-slate-500">Aucun document</p><button onClick={() => setMode('create')} className="mt-4 px-4 py-2 text-white rounded-xl" style={{ background: couleur }}>CrÃ©er un devis</button></div> : (
        <div className="space-y-3">{filtered.map(d => {
          const client = clients.find(c => c.id === d.client_id);
          const icon = { brouillon: 'âšª', envoye: 'ðŸŸ¡', accepte: 'âœ…', acompte_facture: 'ðŸ’°', facture: 'ðŸ§¾', payee: 'ðŸ’š', refuse: 'âŒ' }[d.statut] || 'ðŸ“„';
          const hasAcompte = d.type === 'devis' && getAcompteFacture(d.id);
          return (
            <div key={d.id} onClick={() => { setSelected(d); setMode('preview'); }} className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{d.type === 'facture' ? 'ðŸ§¾' : 'ðŸ“„'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{d.numero}</p><span>{icon}</span>
                    {hasAcompte && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Acompte</span>}
                    {d.facture_type === 'acompte' && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Acompte</span>}
                    {d.facture_type === 'solde' && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Solde</span>}
                    {d.facture_type === 'totale' && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">ComplÃ¨te</span>}
                  </div>
                  <p className="text-sm text-slate-500">{client?.nom} â€¢ {new Date(d.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); downloadPDF(d); }} className="p-2 ${hoverBg} rounded-lg" title="PDF">ðŸ“¥</button>
                <p className="text-lg font-bold" style={{color: couleur}}>{formatMoney(d.total_ttc)}</p>
              </div>
            </div>
          );
        })}</div>
      )}
      <Snackbar />
    </div>
  );
}
