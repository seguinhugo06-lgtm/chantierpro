import React, { useState, useMemo } from 'react';
import { Building2, FileText, Shield, Landmark, FileCheck, TrendingUp, Upload, Trash2, AlertTriangle, CheckCircle, Download, Eye, X } from 'lucide-react';

const VILLES_RCS = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Saint-Étienne', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Clermont-Ferrand', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt', 'Metz', 'Besançon', 'Orléans', 'Rouen', 'Mulhouse', 'Caen', 'Nancy', 'Saint-Denis', 'Argenteuil', 'Roubaix', 'Tourcoing', 'Montreuil', 'Avignon', 'Créteil', 'Poitiers', 'Fort-de-France', 'Versailles', 'Courbevoie', 'Vitry-sur-Seine', 'Colombes', 'Pau'];

export default function Settings({ entreprise, setEntreprise, user, devis = [], onExportComptable, isDark }) {
  const [tab, setTab] = useState('identite');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const alertBg = isDark ? 'bg-slate-700/50' : 'bg-slate-50';

  const handleLogoUpload = (e) => { 
    const file = e.target.files?.[0]; 
    if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = () => setEntreprise(p => ({ ...p, logo: reader.result })); 
    reader.readAsDataURL(file); 
  };
  
  const COULEURS = ['#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  const getCompletude = () => {
    const required = ['nom', 'adresse', 'siret', 'tel', 'email'];
    const recommended = ['formeJuridique', 'codeApe', 'rcsVille', 'rcsNumero', 'tvaIntra', 'rcProAssureur', 'rcProNumero', 'decennaleAssureur', 'decennaleNumero'];
    const filled = [...required, ...recommended].filter(k => entreprise[k] && String(entreprise[k]).trim() !== '');
    return Math.round((filled.length / (required.length + recommended.length)) * 100);
  };
  const completude = getCompletude();

  const alertesAssurances = useMemo(() => {
    const alerts = [];
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    if (entreprise.rcProValidite) {
      const dateRC = new Date(entreprise.rcProValidite);
      if (dateRC < now) alerts.push({ type: 'rc', severity: 'critical', message: 'RC Pro EXPIRÉE !', date: dateRC });
      else if (dateRC < in30Days) alerts.push({ type: 'rc', severity: 'warning', message: 'RC Pro expire dans moins de 30 jours', date: dateRC });
      else if (dateRC < in60Days) alerts.push({ type: 'rc', severity: 'info', message: 'RC Pro expire dans moins de 60 jours', date: dateRC });
    }
    if (entreprise.decennaleValidite) {
      const dateDec = new Date(entreprise.decennaleValidite);
      if (dateDec < now) alerts.push({ type: 'decennale', severity: 'critical', message: 'Décennale EXPIRÉE !', date: dateDec });
      else if (dateDec < in30Days) alerts.push({ type: 'decennale', severity: 'warning', message: 'Décennale expire dans moins de 30 jours', date: dateDec });
      else if (dateDec < in60Days) alerts.push({ type: 'decennale', severity: 'info', message: 'Décennale expire dans moins de 60 jours', date: dateDec });
    }
    return alerts;
  }, [entreprise.rcProValidite, entreprise.decennaleValidite]);

  const hasAssuranceAlerts = alertesAssurances.some(a => a.severity === 'critical' || a.severity === 'warning');

  const handleExportComptable = () => {
    const devisYear = devis.filter(d => new Date(d.date).getFullYear() === exportYear);
    const headers = ['N° Document', 'Type', 'Date', 'Client', 'Total HT', 'TVA 5.5%', 'TVA 10%', 'TVA 20%', 'Total TTC', 'Statut'];
    const rows = devisYear.map(d => [d.numero, d.type === 'facture' ? 'Facture' : 'Devis', new Date(d.date).toLocaleDateString('fr-FR'), d.client_nom || '', (d.total_ht || 0).toFixed(2), (d.tvaRate === 5.5 ? d.tva : 0).toFixed(2), (d.tvaRate === 10 ? d.tva : 0).toFixed(2), (d.tvaRate === 20 ? d.tva : 0).toFixed(2), (d.total_ttc || 0).toFixed(2), d.statut]);
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Export_Comptable_${exportYear}.csv`; a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const validateTVA = (value) => /^FR\d{11}$/.test(value.replace(/\s/g, '').toUpperCase());
  const validateSIRET = (value) => /^\d{14}$/.test(value.replace(/\s/g, ''));
  const getRCSComplet = () => (!entreprise.rcsVille || !entreprise.rcsNumero) ? '' : `RCS ${entreprise.rcsVille} ${entreprise.rcsType || 'B'} ${entreprise.rcsNumero}`;

  const tabs = [
    { id: 'identite', label: 'Identité', icon: Building2 },
    { id: 'legal', label: 'Légal', icon: FileText },
    { id: 'assurances', label: 'Assurances', icon: Shield, alert: hasAssuranceAlerts },
    { id: 'banque', label: 'Banque', icon: Landmark },
    { id: 'documents', label: 'Documents', icon: FileCheck },
    { id: 'rentabilite', label: 'Rentabilité', icon: TrendingUp }
  ];

  const InputField = ({ label, required, children }) => (
    <div>
      <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  );

  const Toggle = ({ checked, onChange, label, desc }) => (
    <div className="flex items-center justify-between">
      <div><p className={`font-medium ${textPrimary}`}>{label}</p><p className={`text-sm ${textSecondary}`}>{desc}</p></div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className={`w-11 h-6 ${isDark ? 'bg-slate-600' : 'bg-slate-200'} peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Paramètres</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowExportModal(true)} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-2"><Download size={16} />Export comptable</button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={`text-sm ${textSecondary}`}>Profil complété</p>
              <p className="font-bold" style={{ color: completude >= 80 ? '#22c55e' : completude >= 50 ? '#f59e0b' : '#ef4444' }}>{completude}%</p>
            </div>
            <div className={`w-24 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div className="h-full rounded-full transition-all" style={{ width: `${completude}%`, background: completude >= 80 ? '#22c55e' : completude >= 50 ? '#f59e0b' : '#ef4444' }} />
            </div>
          </div>
        </div>
      </div>

      {alertesAssurances.filter(a => a.severity === 'critical').map((alert, i) => (
        <div key={i} className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="text-red-500" size={24} />
          <div className="flex-1">
            <p className="font-bold text-red-500">{alert.message}</p>
            <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>Expiration: {alert.date.toLocaleDateString('fr-FR')}</p>
          </div>
          <button onClick={() => setTab('assurances')} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm">Renouveler</button>
        </div>
      ))}

      {completude < 80 && (
        <div className={`${isDark ? 'bg-amber-500/20 border-amber-500/50' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4 flex items-start gap-3`}>
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>Profil incomplet</p>
            <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Complétez vos informations pour générer des devis et factures conformes.</p>
          </div>
        </div>
      )}

      <div className={`flex gap-1 border-b ${borderColor} pb-0 flex-wrap overflow-x-auto`}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-3 rounded-t-xl font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${tab === t.id ? `${cardBg} border border-b-0 -mb-px` : `${textSecondary} ${hoverBg}`} ${t.alert ? 'text-red-500' : ''}`} style={tab === t.id ? { color: entreprise.couleur } : {}}>
            <t.icon size={16} />{t.label}{t.alert && <AlertTriangle size={14} className="text-red-500" />}
          </button>
        ))}
      </div>

      {tab === 'identite' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Logo & Couleur</h3>
            <div className="flex gap-6 flex-wrap items-start">
              <div>
                <p className={`text-sm font-medium mb-2 ${textPrimary}`}>Logo entreprise</p>
                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-slate-50'}`}>
                    {entreprise.logo ? <img src={entreprise.logo} className="w-full h-full object-contain" alt="Logo" /> : <Building2 className={textMuted} size={32} />}
                  </div>
                  <div className="space-y-2">
                    <label className="block px-4 py-2 rounded-xl cursor-pointer text-white text-sm" style={{background: entreprise.couleur}}>
                      <Upload size={14} className="inline mr-2" />Choisir une image
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {entreprise.logo && <button onClick={() => setEntreprise(p => ({...p, logo: ''}))} className="flex items-center gap-1 text-sm text-red-500"><Trash2 size={14} />Supprimer</button>}
                  </div>
                </div>
              </div>
              <div>
                <p className={`text-sm font-medium mb-2 ${textPrimary}`}>Couleur principale</p>
                <div className="flex gap-2 flex-wrap">
                  {COULEURS.map(c => <button key={c} onClick={() => setEntreprise(p => ({...p, couleur: c}))} className={`w-10 h-10 rounded-xl transition-transform hover:scale-110 ${entreprise.couleur === c ? 'ring-2 ring-offset-2' : ''}`} style={{background: c, ringColor: c, ringOffsetColor: isDark ? '#1e293b' : '#fff'}} />)}
                </div>
              </div>
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Informations entreprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><InputField label="Nom / Raison sociale" required><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex: Dupont Rénovation" value={entreprise.nom || ''} onChange={e => setEntreprise(p => ({...p, nom: e.target.value}))} /></InputField></div>
              <InputField label="Forme juridique" required>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.formeJuridique || ''} onChange={e => setEntreprise(p => ({...p, formeJuridique: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  <option value="EI">Entreprise Individuelle (EI)</option>
                  <option value="EIRL">EIRL</option>
                  <option value="Micro-entreprise">Micro-entreprise / Auto-entrepreneur</option>
                  <option value="EURL">EURL</option>
                  <option value="SARL">SARL</option>
                  <option value="SAS">SAS</option>
                  <option value="SASU">SASU</option>
                </select>
              </InputField>
              <InputField label="Capital social">
                <div className="flex">
                  <input type="number" className={`flex-1 px-4 py-2.5 border rounded-l-xl ${inputBg}`} placeholder="10000" value={entreprise.capital || ''} onChange={e => setEntreprise(p => ({...p, capital: e.target.value}))} />
                  <span className={`px-4 py-2.5 border-y border-r rounded-r-xl ${isDark ? 'bg-slate-600 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-500'}`}>€</span>
                </div>
              </InputField>
              <div className="md:col-span-2"><InputField label="Adresse siège social" required><textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} placeholder="12 rue des Artisans&#10;75001 Paris" value={entreprise.adresse || ''} onChange={e => setEntreprise(p => ({...p, adresse: e.target.value}))} /></InputField></div>
              <InputField label="Téléphone" required><input type="tel" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="06 12 34 56 78" value={entreprise.tel || ''} onChange={e => setEntreprise(p => ({...p, tel: e.target.value}))} /></InputField>
              <InputField label="Email" required><input type="email" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="contact@monentreprise.fr" value={entreprise.email || ''} onChange={e => setEntreprise(p => ({...p, email: e.target.value}))} /></InputField>
              <InputField label="Site web"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="www.monentreprise.fr" value={entreprise.siteWeb || ''} onChange={e => setEntreprise(p => ({...p, siteWeb: e.target.value}))} /></InputField>
              <InputField label="Slogan"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Votre artisan de confiance" value={entreprise.slogan || ''} onChange={e => setEntreprise(p => ({...p, slogan: e.target.value}))} /></InputField>
            </div>
          </div>
        </div>
      )}

      {tab === 'legal' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Numéros d'identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <InputField label="SIRET (14 chiffres)" required>
                  <input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg} ${entreprise.siret && !validateSIRET(entreprise.siret) ? 'border-red-500 bg-red-500/10' : ''}`} placeholder="123 456 789 00012" maxLength={17} value={entreprise.siret || ''} onChange={e => setEntreprise(p => ({...p, siret: e.target.value}))} />
                </InputField>
                {entreprise.siret && !validateSIRET(entreprise.siret) && <p className="text-xs text-red-500 mt-1">Format invalide</p>}
                {entreprise.siret && validateSIRET(entreprise.siret) && <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><CheckCircle size={12} /> Valide</p>}
              </div>
              <InputField label="Code APE/NAF"><input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="4339Z" maxLength={5} value={entreprise.codeApe || ''} onChange={e => setEntreprise(p => ({...p, codeApe: e.target.value.toUpperCase()}))} /></InputField>
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>RCS - Registre du Commerce</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Ville du greffe">
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.rcsVille || ''} onChange={e => setEntreprise(p => ({...p, rcsVille: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  {VILLES_RCS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </InputField>
              <InputField label="Type">
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.rcsType || 'B'} onChange={e => setEntreprise(p => ({...p, rcsType: e.target.value}))}>
                  <option value="A">A - Commerçant</option>
                  <option value="B">B - Société commerciale</option>
                  <option value="C">C - GIE</option>
                  <option value="D">D - Société civile</option>
                </select>
              </InputField>
              <InputField label="Numéro (9 chiffres)"><input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="123 456 789" maxLength={11} value={entreprise.rcsNumero || ''} onChange={e => setEntreprise(p => ({...p, rcsNumero: e.target.value}))} /></InputField>
            </div>
            {getRCSComplet() && <div className={`mt-4 p-3 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}><p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'} flex items-center gap-2`}><CheckCircle size={16} />Sera affiché: <strong>{getRCSComplet()}</strong></p></div>}
          </div>
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>TVA Intracommunautaire</h3>
            <InputField label="Numéro TVA">
              <input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="FR 12 345678901" value={entreprise.tvaIntra || ''} onChange={e => setEntreprise(p => ({...p, tvaIntra: e.target.value.toUpperCase()}))} />
            </InputField>
            {entreprise.tvaIntra && validateTVA(entreprise.tvaIntra) && <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><CheckCircle size={12} /> Valide</p>}
          </div>
          {entreprise.formeJuridique === 'Micro-entreprise' && (
            <div className={`${isDark ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4`}>
              <p className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>💡 Micro-entreprise</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>La mention "TVA non applicable, article 293 B du CGI" sera automatiquement ajoutée.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'assurances' && (
        <div className="space-y-6">
          {alertesAssurances.map((alert, i) => (
            <div key={i} className={`rounded-xl p-4 flex items-center gap-3 ${alert.severity === 'critical' ? 'bg-red-500/20 border-2 border-red-500' : alert.severity === 'warning' ? (isDark ? 'bg-amber-500/20 border-amber-500' : 'bg-amber-50 border-amber-300') + ' border' : (isDark ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-50 border-blue-200') + ' border'}`}>
              <AlertTriangle className={alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'} size={20} />
              <div className="flex-1">
                <p className={`font-medium ${alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'warning' ? (isDark ? 'text-amber-400' : 'text-amber-800') : (isDark ? 'text-blue-400' : 'text-blue-800')}`}>{alert.message}</p>
                <p className={`text-sm ${textSecondary}`}>Expiration: {alert.date.toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          ))}
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Responsabilité Civile Professionnelle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Assureur"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="AXA, MAAF..." value={entreprise.rcProAssureur || ''} onChange={e => setEntreprise(p => ({...p, rcProAssureur: e.target.value}))} /></InputField>
              <InputField label="N° de police"><input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="RC-123456789" value={entreprise.rcProNumero || ''} onChange={e => setEntreprise(p => ({...p, rcProNumero: e.target.value}))} /></InputField>
              <InputField label="Date de validité"><input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.rcProValidite || ''} onChange={e => setEntreprise(p => ({...p, rcProValidite: e.target.value}))} /></InputField>
              <InputField label="Montant couverture"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="300 000 €" value={entreprise.rcProMontant || ''} onChange={e => setEntreprise(p => ({...p, rcProMontant: e.target.value}))} /></InputField>
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Garantie Décennale</h3>
            <p className={`text-sm mb-4 ${textSecondary}`}>Obligatoire pour les travaux de construction et rénovation</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Assureur"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="SMABTP, AXA..." value={entreprise.decennaleAssureur || ''} onChange={e => setEntreprise(p => ({...p, decennaleAssureur: e.target.value}))} /></InputField>
              <InputField label="N° de police"><input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="DEC-123456789" value={entreprise.decennaleNumero || ''} onChange={e => setEntreprise(p => ({...p, decennaleNumero: e.target.value}))} /></InputField>
              <InputField label="Date de validité"><input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.decennaleValidite || ''} onChange={e => setEntreprise(p => ({...p, decennaleValidite: e.target.value}))} /></InputField>
              <InputField label="Activités couvertes"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Gros œuvre, second œuvre..." value={entreprise.decennaleActivites || ''} onChange={e => setEntreprise(p => ({...p, decennaleActivites: e.target.value}))} /></InputField>
            </div>
          </div>
        </div>
      )}

      {tab === 'banque' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Coordonnées bancaires (RIB)</h3>
            <p className={`text-sm mb-4 ${textSecondary}`}>Ces informations apparaîtront sur vos factures</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Banque"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Crédit Agricole, BNP..." value={entreprise.banque || ''} onChange={e => setEntreprise(p => ({...p, banque: e.target.value}))} /></InputField>
              <InputField label="Titulaire du compte"><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Nom entreprise" value={entreprise.titulaire || ''} onChange={e => setEntreprise(p => ({...p, titulaire: e.target.value}))} /></InputField>
              <div className="md:col-span-2"><InputField label="IBAN"><input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="FR76 1234 5678 9012 3456 7890 123" value={entreprise.iban || ''} onChange={e => setEntreprise(p => ({...p, iban: e.target.value.toUpperCase()}))} /></InputField></div>
              <InputField label="BIC / SWIFT"><input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="BNPAFRPP" value={entreprise.bic || ''} onChange={e => setEntreprise(p => ({...p, bic: e.target.value.toUpperCase()}))} /></InputField>
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Conditions de paiement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Délai de paiement par défaut">
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.delaiPaiement || 30} onChange={e => setEntreprise(p => ({...p, delaiPaiement: parseInt(e.target.value)}))}>
                  <option value={0}>À réception</option>
                  <option value={15}>15 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={45}>45 jours</option>
                  <option value={60}>60 jours</option>
                </select>
              </InputField>
              <InputField label="Acompte par défaut (%)"><input type="number" min="0" max="100" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.acompteDefaut || 30} onChange={e => setEntreprise(p => ({...p, acompteDefaut: parseInt(e.target.value) || 30}))} /></InputField>
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Paramètres devis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Validité devis (jours)"><input type="number" min="1" max="365" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.validiteDevis || 30} onChange={e => setEntreprise(p => ({...p, validiteDevis: parseInt(e.target.value) || 30}))} /></InputField>
              <InputField label="Taux TVA par défaut">
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.tvaDefaut || 10} onChange={e => setEntreprise(p => ({...p, tvaDefaut: parseFloat(e.target.value)}))}>
                  <option value={5.5}>5,5% (Amélioration énergétique)</option>
                  <option value={10}>10% (Rénovation)</option>
                  <option value={20}>20% (Taux normal)</option>
                </select>
              </InputField>
              <InputField label="Préfixe devis"><input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="DEV-" value={entreprise.prefixeDevis || ''} onChange={e => setEntreprise(p => ({...p, prefixeDevis: e.target.value}))} /></InputField>
              <InputField label="Préfixe factures"><input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="FAC-" value={entreprise.prefixeFacture || ''} onChange={e => setEntreprise(p => ({...p, prefixeFacture: e.target.value}))} /></InputField>
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Mentions légales</h3>
            <div className="space-y-4">
              <Toggle checked={entreprise.mentionRetractation !== false} onChange={e => setEntreprise(p => ({...p, mentionRetractation: e.target.checked}))} label="Droit de rétractation" desc="14 jours pour les particuliers" />
              <Toggle checked={entreprise.mentionPenalites !== false} onChange={e => setEntreprise(p => ({...p, mentionPenalites: e.target.checked}))} label="Pénalités de retard" desc="Taux légal + indemnité 40€" />
              <Toggle checked={entreprise.afficherAssurances !== false} onChange={e => setEntreprise(p => ({...p, afficherAssurances: e.target.checked}))} label="Afficher assurances" desc="RC Pro et Décennale sur documents" />
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>Conditions générales</h3>
            <textarea className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} rows={4} placeholder="Vos conditions générales personnalisées..." value={entreprise.cgv || ''} onChange={e => setEntreprise(p => ({...p, cgv: e.target.value}))} />
          </div>
        </div>
      )}

      {tab === 'rentabilite' && (
        <div className={`rounded-2xl border p-6 ${cardBg}`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><TrendingUp size={20} style={{ color: entreprise.couleur }} />Calcul de Rentabilité</h3>
          <div className="space-y-4">
            <InputField label="Taux de frais de structure (%)">
              <input type="number" min="0" max="50" className={`w-32 px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.tauxFraisStructure || 15} onChange={e => setEntreprise(p => ({...p, tauxFraisStructure: parseFloat(e.target.value) || 15}))} />
            </InputField>
            <p className={`text-sm ${textSecondary}`}>Loyer, assurances, carburant, comptable...</p>
            <div className={`${alertBg} rounded-xl p-4 font-mono text-sm ${textSecondary}`}>
              <p className={textPrimary}><strong>Marge Réelle</strong> = CA HT + Ajustements</p>
              <p className="ml-4">- Matériaux (achats)</p>
              <p className="ml-4">- Main d'œuvre (heures × coût chargé)</p>
              <p className="ml-4">- Frais structure ({entreprise.tauxFraisStructure || 15}% du CA)</p>
            </div>
            <div className={`${isDark ? 'bg-blue-500/20' : 'bg-blue-50'} rounded-xl p-4 text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              <p className="font-medium mb-2">Code couleur marge:</p>
              <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span> Rouge: Marge négative</p>
              <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500"></span> Orange: Marge faible (0-15%)</p>
              <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span> Vert: Marge saine (&gt;15%)</p>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><Eye size={20} />Aperçu en-tête document</h3>
        <div className={`border rounded-xl p-6 ${alertBg}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              {entreprise.logo ? <img src={entreprise.logo} className="h-16 object-contain" alt="Logo" /> : <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{background: `${entreprise.couleur}20`}}><Building2 style={{ color: entreprise.couleur }} size={28} /></div>}
              <div>
                <p className={`font-bold text-lg ${textPrimary}`}>{entreprise.nom || 'Nom entreprise'}</p>
                {entreprise.slogan && <p className={`text-xs italic ${textMuted}`}>{entreprise.slogan}</p>}
                {entreprise.formeJuridique && <p className={`text-xs ${textMuted}`}>{entreprise.formeJuridique}{entreprise.capital && ` • Capital: ${entreprise.capital} €`}</p>}
                <p className={`text-sm whitespace-pre-line mt-1 ${textSecondary}`}>{entreprise.adresse || 'Adresse'}</p>
              </div>
            </div>
            <p className="font-bold text-xl" style={{color: entreprise.couleur}}>DEVIS</p>
          </div>
          <div className={`text-xs space-y-0.5 border-t pt-3 mt-3 ${borderColor} ${textMuted}`}>
            {entreprise.siret && <p>SIRET: {entreprise.siret} {entreprise.codeApe && `• APE: ${entreprise.codeApe}`}</p>}
            {getRCSComplet() && <p>{getRCSComplet()}</p>}
            {entreprise.tvaIntra && <p>TVA: {entreprise.tvaIntra}</p>}
            {entreprise.tel && <p>Tél: {entreprise.tel} {entreprise.email && `• ${entreprise.email}`}</p>}
            {(entreprise.rcProAssureur || entreprise.decennaleAssureur) && <p className="pt-1 text-[10px]">{entreprise.rcProAssureur && `RC Pro: ${entreprise.rcProAssureur} N°${entreprise.rcProNumero}`}{entreprise.rcProAssureur && entreprise.decennaleAssureur && ' • '}{entreprise.decennaleAssureur && `Décennale: ${entreprise.decennaleAssureur} N°${entreprise.decennaleNumero}`}</p>}
          </div>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-md ${cardBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg flex items-center gap-2 ${textPrimary}`}><Download size={20} />Export comptable</h3>
              <button onClick={() => setShowExportModal(false)} className={`p-1 rounded-lg ${hoverBg}`}><X size={20} className={textSecondary} /></button>
            </div>
            <p className={`mb-4 ${textSecondary}`}>Exportez vos devis et factures au format CSV pour votre comptable.</p>
            <div className="mb-6">
              <InputField label="Année à exporter">
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={exportYear} onChange={e => setExportYear(parseInt(e.target.value))}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </InputField>
            </div>
            <div className={`${alertBg} rounded-xl p-4 mb-6 text-sm`}>
              <p className={`font-medium mb-2 ${textPrimary}`}>Colonnes exportées:</p>
              <p className={textSecondary}>N° Document, Type, Date, Client, Total HT, TVA 5.5%, TVA 10%, TVA 20%, Total TTC, Statut</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} ${textPrimary}`}>Annuler</button>
              <button onClick={handleExportComptable} className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2"><Download size={16} />Télécharger CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
