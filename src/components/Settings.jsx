import React, { useState, useMemo } from 'react';

// Villes RCS principales France
const VILLES_RCS = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Saint-Étienne', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Clermont-Ferrand', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt', 'Metz', 'Besançon', 'Orléans', 'Rouen', 'Mulhouse', 'Caen', 'Nancy', 'Saint-Denis', 'Argenteuil', 'Roubaix', 'Tourcoing', 'Montreuil', 'Avignon', 'Créteil', 'Poitiers', 'Fort-de-France', 'Versailles', 'Courbevoie', 'Vitry-sur-Seine', 'Colombes', 'Pau'];

export default function Settings({ entreprise, setEntreprise, user, devis = [], onExportComptable, isDark, couleur }) {
  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const hoverBg = isDark ? "hover:bg-slate-700" : "hover:bg-slate-50";
  const [tab, setTab] = useState('identite');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  
  const handleLogoUpload = (e) => { 
    const file = e.target.files?.[0]; 
    if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = () => setEntreprise(p => ({ ...p, logo: reader.result })); 
    reader.readAsDataURL(file); 
  };
  
  const COULEURS = ['#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  // Calcul score complétude
  const getCompletude = () => {
    const required = ['nom', 'adresse', 'siret', 'tel', 'email'];
    const recommended = ['formeJuridique', 'codeApe', 'rcsVille', 'rcsNumero', 'tvaIntra', 'rcProAssureur', 'rcProNumero', 'decennaleAssureur', 'decennaleNumero'];
    const filled = [...required, ...recommended].filter(k => entreprise[k] && String(entreprise[k]).trim() !== '');
    return Math.round((filled.length / (required.length + recommended.length)) * 100);
  };
  const completude = getCompletude();

  // Alertes assurances
  const alertesAssurances = useMemo(() => {
    const alerts = [];
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    if (entreprise.rcProValidite) {
      const dateRC = new Date(entreprise.rcProValidite);
      if (dateRC < now) {
        alerts.push({ type: 'rc', severity: 'critical', message: 'RC Pro EXPIRÉE !', date: dateRC });
      } else if (dateRC < in30Days) {
        alerts.push({ type: 'rc', severity: 'warning', message: 'RC Pro expire dans moins de 30 jours', date: dateRC });
      } else if (dateRC < in60Days) {
        alerts.push({ type: 'rc', severity: 'info', message: 'RC Pro expire dans moins de 60 jours', date: dateRC });
      }
    }

    if (entreprise.decennaleValidite) {
      const dateDec = new Date(entreprise.decennaleValidite);
      if (dateDec < now) {
        alerts.push({ type: 'decennale', severity: 'critical', message: 'Décennale EXPIRÉE !', date: dateDec });
      } else if (dateDec < in30Days) {
        alerts.push({ type: 'decennale', severity: 'warning', message: 'Décennale expire dans moins de 30 jours', date: dateDec });
      } else if (dateDec < in60Days) {
        alerts.push({ type: 'decennale', severity: 'info', message: 'Décennale expire dans moins de 60 jours', date: dateDec });
      }
    }

    return alerts;
  }, [entreprise.rcProValidite, entreprise.decennaleValidite]);

  const hasAssuranceAlerts = alertesAssurances.some(a => a.severity === 'critical' || a.severity === 'warning');

  // Export comptable Excel
  const handleExportComptable = () => {
    const devisYear = devis.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === exportYear;
    });

    // Créer CSV (compatible Excel)
    const headers = ['N° Document', 'Type', 'Date', 'Client', 'Total HT', 'TVA 5.5%', 'TVA 10%', 'TVA 20%', 'Total TTC', 'Statut'];
    const rows = devisYear.map(d => {
      const tva55 = d.tvaRate === 5.5 ? d.tva : 0;
      const tva10 = d.tvaRate === 10 ? d.tva : 0;
      const tva20 = d.tvaRate === 20 ? d.tva : 0;
      return [
        d.numero,
        d.type === 'facture' ? 'Facture' : 'Devis',
        new Date(d.date).toLocaleDateString('fr-FR'),
        d.client_nom || '',
        (d.total_ht || 0).toFixed(2),
        tva55.toFixed(2),
        tva10.toFixed(2),
        tva20.toFixed(2),
        (d.total_ttc || 0).toFixed(2),
        d.statut
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Export_Comptable_${exportYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  // Validation format TVA
  const validateTVA = (value) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    return /^FR\d{11}$/.test(cleaned);
  };

  // Validation SIRET
  const validateSIRET = (value) => {
    const cleaned = value.replace(/\s/g, '');
    return /^\d{14}$/.test(cleaned);
  };

  // Formater RCS complet
  const getRCSComplet = () => {
    if (!entreprise.rcsVille || !entreprise.rcsNumero) return '';
    return `RCS ${entreprise.rcsVille} ${entreprise.rcsType || 'B'} ${entreprise.rcsNumero}`;
  };

  return (
    <div className="space-y-6">
      {/* Header avec score */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowExportModal(true)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-2">
             Export comptable
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-slate-500">Profil complété</p>
              <p className="font-bold" style={{ color: completude >= 80 ? '#22c55e' : completude >= 50 ? '#f59e0b' : '#ef4444' }}>{completude}%</p>
            </div>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${completude}%`, background: completude >= 80 ? '#22c55e' : completude >= 50 ? '#f59e0b' : '#ef4444' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Alertes assurances critiques */}
      {alertesAssurances.filter(a => a.severity === 'critical').map((alert, i) => (
        <div key={i} className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <span className="text-2xl"></span>
          <div className="flex-1">
            <p className="font-bold text-red-800">{alert.message}</p>
            <p className="text-sm text-red-600">Date d'expiration: {alert.date.toLocaleDateString('fr-FR')}</p>
          </div>
          <button onClick={() => setTab('assurances')} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm">Renouveler</button>
        </div>
      ))}

      {completude < 80 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">âš ï¸</span>
          <div>
            <p className="font-medium text-amber-800">Profil incomplet</p>
            <p className="text-sm text-amber-700">Complétez vos informations pour générer des devis et factures conformes Ã  la loi française.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 flex-wrap overflow-x-auto">
        {[
          ['identite', ' Identité'],
          ['legal', ' Légal'],
          ['assurances', ` Assurances${hasAssuranceAlerts ? ' âš ï¸' : ''}`],
          ['banque', ' Banque'],
          ['documents', ' Documents'],
          ['rentabilite', ' Rentabilité']
        ].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium whitespace-nowrap ${tab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'} ${k === 'assurances' && hasAssuranceAlerts ? 'text-red-500' : ''}`} style={tab === k ? {color: entreprise.couleur} : {}}>{v}</button>
        ))}
      </div>

      {/* IDENTITÉ */}
      {tab === 'identite' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">Logo & Couleur</h3>
            <div className="flex gap-6 flex-wrap items-start">
              <div>
                <p className="text-sm font-medium mb-2">Logo entreprise</p>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50">
                    {entreprise.logo ? (
                      <img src={entreprise.logo} className="w-full h-full object-contain" alt="Logo" />
                    ) : (
                      <span className="text-3xl text-slate-300"></span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block px-4 py-2 rounded-xl cursor-pointer text-white text-sm" style={{background: entreprise.couleur}}>
                       Choisir une image
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {entreprise.logo && (
                      <button onClick={() => setEntreprise(p => ({...p, logo: ''}))} className="block text-sm text-red-500 hover:underline">
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Format: PNG, JPG. Taille max: 500KB</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Couleur principale</p>
                <div className="flex gap-2 flex-wrap">
                  {COULEURS.map(c => (
                    <button key={c} onClick={() => setEntreprise(p => ({...p, couleur: c}))} className={`w-10 h-10 rounded-xl transition-transform hover:scale-110 ${entreprise.couleur === c ? 'ring-2 ring-offset-2' : ''}`} style={{background: c, ringColor: c}} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">Informations entreprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom / Raison sociale <span className="text-red-500">*</span></label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Ex: Dupont Rénovation" value={entreprise.nom || ''} onChange={e => setEntreprise(p => ({...p, nom: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Forme juridique <span className="text-red-500">*</span></label>
                <select className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.formeJuridique || ''} onChange={e => setEntreprise(p => ({...p, formeJuridique: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  <option value="EI">Entreprise Individuelle (EI)</option>
                  <option value="EIRL">EIRL</option>
                  <option value="Micro-entreprise">Micro-entreprise / Auto-entrepreneur</option>
                  <option value="EURL">EURL</option>
                  <option value="SARL">SARL</option>
                  <option value="SAS">SAS</option>
                  <option value="SASU">SASU</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Capital social {['SARL', 'SAS', 'SASU', 'EURL'].includes(entreprise.formeJuridique) && <span className="text-red-500">*</span>}
                </label>
                <div className="flex">
                  <input type="number" className="flex-1 px-4 py-2.5 border rounded-l-xl" placeholder="10000" value={entreprise.capital || ''} onChange={e => setEntreprise(p => ({...p, capital: e.target.value}))} />
                  <span className="px-4 py-2.5 bg-slate-100 border-y border-r rounded-r-xl text-slate-500">€</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Adresse siège social <span className="text-red-500">*</span></label>
                <textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} placeholder="12 rue des Artisans&#10;75001 Paris&#10;FRANCE" value={entreprise.adresse || ''} onChange={e => setEntreprise(p => ({...p, adresse: e.target.value}))} />
                <p className="text-xs text-slate-500 mt-1">Inclure "FRANCE" pour les documents internationaux</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone <span className="text-red-500">*</span></label>
                <input type="tel" className="w-full px-4 py-2.5 border rounded-xl" placeholder="06 12 34 56 78" value={entreprise.tel || ''} onChange={e => setEntreprise(p => ({...p, tel: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" className="w-full px-4 py-2.5 border rounded-xl" placeholder="contact@monentreprise.fr" value={entreprise.email || ''} onChange={e => setEntreprise(p => ({...p, email: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site web</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="www.monentreprise.fr" value={entreprise.siteWeb || ''} onChange={e => setEntreprise(p => ({...p, siteWeb: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slogan (optionnel)</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Votre artisan de confiance" value={entreprise.slogan || ''} onChange={e => setEntreprise(p => ({...p, slogan: e.target.value}))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LÉGAL */}
      {tab === 'legal' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">Numéros d'identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SIRET (14 chiffres) <span className="text-red-500">*</span></label>
                <input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${entreprise.siret && !validateSIRET(entreprise.siret) ? 'border-red-300 bg-red-50' : ''}`} placeholder="123 456 789 00012" maxLength={17} value={entreprise.siret || ''} onChange={e => setEntreprise(p => ({...p, siret: e.target.value}))} />
                {entreprise.siret && !validateSIRET(entreprise.siret) && (
                  <p className="text-xs text-red-500 mt-1">Format invalide. Attendu: 14 chiffres</p>
                )}
                {entreprise.siret && validateSIRET(entreprise.siret) && (
                  <p className="text-xs text-green-600 mt-1">âœ“ Format valide</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code APE/NAF</label>
                <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="4339Z" maxLength={5} value={entreprise.codeApe || ''} onChange={e => setEntreprise(p => ({...p, codeApe: e.target.value.toUpperCase()}))} />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">RCS - Registre du Commerce</h3>
            <p className="text-sm text-slate-500 mb-4">Format légal: RCS [Ville] [Type] [Numéro]</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ville du greffe</label>
                <select className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.rcsVille || ''} onChange={e => setEntreprise(p => ({...p, rcsVille: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  {VILLES_RCS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.rcsType || 'B'} onChange={e => setEntreprise(p => ({...p, rcsType: e.target.value}))}>
                  <option value="A">A - Commerçant</option>
                  <option value="B">B - Société commerciale</option>
                  <option value="C">C - GIE</option>
                  <option value="D">D - Société civile</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro (9 chiffres)</label>
                <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="123 456 789" maxLength={11} value={entreprise.rcsNumero || ''} onChange={e => setEntreprise(p => ({...p, rcsNumero: e.target.value}))} />
              </div>
            </div>
            {getRCSComplet() && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl">
                <p className="text-sm text-green-700">âœ“ Sera affiché: <strong>{getRCSComplet()}</strong></p>
              </div>
            )}
          </div>

          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">TVA Intracommunautaire</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Numéro TVA</label>
              <input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${entreprise.tvaIntra && !validateTVA(entreprise.tvaIntra) ? 'border-amber-300 bg-amber-50' : ''}`} placeholder="FR 12 345678901" value={entreprise.tvaIntra || ''} onChange={e => setEntreprise(p => ({...p, tvaIntra: e.target.value.toUpperCase()}))} />
              <p className="text-xs text-slate-500 mt-1">Format: FR + 11 chiffres (ex: FR12345678901)</p>
              {entreprise.tvaIntra && validateTVA(entreprise.tvaIntra) && (
                <p className="text-xs text-green-600 mt-1">âœ“ Format valide</p>
              )}
            </div>
          </div>

          {entreprise.formeJuridique === 'Micro-entreprise' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-medium text-blue-800"> Micro-entreprise</p>
              <p className="text-sm text-blue-700 mt-1">La mention "TVA non applicable, article 293 B du CGI" sera automatiquement ajoutée sur vos devis et factures.</p>
            </div>
          )}

          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">Qualifications professionnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Numéro RGE</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="E-12345" value={entreprise.rge || ''} onChange={e => setEntreprise(p => ({...p, rge: e.target.value}))} />
                <p className="text-xs text-slate-500 mt-1">Reconnu Garant de l'Environnement</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Organisme RGE</label>
                <select className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.rgeOrganisme || ''} onChange={e => setEntreprise(p => ({...p, rgeOrganisme: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  <option value="Qualibat">Qualibat</option>
                  <option value="Qualifelec">Qualifelec</option>
                  <option value="Qualit'EnR">Qualit'EnR</option>
                  <option value="Qualiopi">Qualiopi</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSURANCES */}
      {tab === 'assurances' && (
        <div className="space-y-6">
          {alertesAssurances.length > 0 && (
            <div className="space-y-3">
              {alertesAssurances.map((alert, i) => (
                <div key={i} className={`rounded-xl p-4 flex items-center gap-3 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-2 border-red-300' :
                  alert.severity === 'warning' ? 'bg-amber-50 border border-amber-300' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  <span className="text-xl">{alert.severity === 'critical' ? '' : alert.severity === 'warning' ? 'âš ï¸' : 'â„¹ï¸'}</span>
                  <div className="flex-1">
                    <p className={`font-medium ${alert.severity === 'critical' ? 'text-red-800' : alert.severity === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>
                      {alert.message}
                    </p>
                    <p className={`text-sm ${alert.severity === 'critical' ? 'text-red-600' : alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>
                      Expiration: {alert.date.toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-medium text-amber-800">âš ï¸ Obligatoire pour les artisans du BTP</p>
            <p className="text-sm text-amber-700 mt-1">L'assurance RC Pro et la garantie décennale doivent figurer sur tous vos devis et factures (Article L243-1 du Code des assurances).</p>
          </div>

          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold"> Assurance RC Professionnelle</h3>
              {entreprise.rcProAssureur && entreprise.rcProNumero && entreprise.rcProValidite && new Date(entreprise.rcProValidite) > new Date() && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">âœ“ Valide</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Compagnie d'assurance <span className="text-red-500">*</span></label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="AXA, MAAF, MMA..." value={entreprise.rcProAssureur || ''} onChange={e => setEntreprise(p => ({...p, rcProAssureur: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de contrat <span className="text-red-500">*</span></label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="RC-123456789" value={entreprise.rcProNumero || ''} onChange={e => setEntreprise(p => ({...p, rcProNumero: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de validité <span className="text-red-500">*</span></label>
                <input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.rcProValidite || ''} onChange={e => setEntreprise(p => ({...p, rcProValidite: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zone géographique</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="France entière" value={entreprise.rcProZone || 'France entière'} onChange={e => setEntreprise(p => ({...p, rcProZone: e.target.value}))} />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold"> Garantie Décennale</h3>
              {entreprise.decennaleAssureur && entreprise.decennaleNumero && entreprise.decennaleValidite && new Date(entreprise.decennaleValidite) > new Date() && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">âœ“ Valide</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Compagnie d'assurance <span className="text-red-500">*</span></label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="SMABTP, AXA..." value={entreprise.decennaleAssureur || ''} onChange={e => setEntreprise(p => ({...p, decennaleAssureur: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de contrat <span className="text-red-500">*</span></label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="DEC-987654321" value={entreprise.decennaleNumero || ''} onChange={e => setEntreprise(p => ({...p, decennaleNumero: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de validité <span className="text-red-500">*</span></label>
                <input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.decennaleValidite || ''} onChange={e => setEntreprise(p => ({...p, decennaleValidite: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Activités couvertes</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Tous corps d'état" value={entreprise.decennaleActivites || ''} onChange={e => setEntreprise(p => ({...p, decennaleActivites: e.target.value}))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BANQUE */}
      {tab === 'banque' && (
        <div className={`rounded-2xl border ${cardBg}`} p-6">
          <h3 className="font-semibold mb-4">Coordonnées bancaires</h3>
          <p className="text-sm text-slate-500 mb-4">Ces informations apparaîtront sur vos factures pour faciliter le paiement par virement.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Banque</label>
              <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Crédit Agricole, BNP..." value={entreprise.banque || ''} onChange={e => setEntreprise(p => ({...p, banque: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Titulaire du compte</label>
              <input className="w-full px-4 py-2.5 border rounded-xl" placeholder={entreprise.nom || 'Nom du titulaire'} value={entreprise.titulaireBanque || ''} onChange={e => setEntreprise(p => ({...p, titulaireBanque: e.target.value}))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">IBAN</label>
              <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="FR76 1234 5678 9012 3456 7890 123" value={entreprise.iban || ''} onChange={e => setEntreprise(p => ({...p, iban: e.target.value.toUpperCase()}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">BIC/SWIFT</label>
              <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="AGRIFRPP" value={entreprise.bic || ''} onChange={e => setEntreprise(p => ({...p, bic: e.target.value.toUpperCase()}))} />
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {tab === 'documents' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">Paramètres par défaut des devis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Validité devis par défaut</label>
                <select className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.validiteDevis || 30} onChange={e => setEntreprise(p => ({...p, validiteDevis: parseInt(e.target.value)}))}>
                  <option value={15}>15 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={60}>2 mois</option>
                  <option value={90}>3 mois</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TVA par défaut</label>
                <select className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.tvaDefaut || 10} onChange={e => setEntreprise(p => ({...p, tvaDefaut: parseFloat(e.target.value)}))}>
                  <option value={20}>20% (taux normal)</option>
                  <option value={10}>10% (rénovation &gt;2 ans)</option>
                  <option value={5.5}>5,5% (réno. énergétique)</option>
                  <option value={0}>0% (franchise TVA)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Délai de paiement</label>
                <select className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.delaiPaiement || 30} onChange={e => setEntreprise(p => ({...p, delaiPaiement: parseInt(e.target.value)}))}>
                  <option value={0}>Comptant</option>
                  <option value={14}>14 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={45}>45 jours</option>
                  <option value={60}>60 jours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Acompte par défaut</label>
                <select className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.acompteDefaut || 30} onChange={e => setEntreprise(p => ({...p, acompteDefaut: parseInt(e.target.value)}))}>
                  <option value={0}>Pas d'acompte</option>
                  <option value={20}>20%</option>
                  <option value={30}>30% (max légal si &gt;1500€)</option>
                  <option value={40}>40%</option>
                  <option value={50}>50%</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">Mentions légales sur les documents</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium">Droit de rétractation (14 jours)</p>
                  <p className="text-sm text-slate-500">Article L221-18 du Code de la consommation</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={entreprise.mentionRetractation !== false} onChange={e => setEntreprise(p => ({...p, mentionRetractation: e.target.checked}))} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium">Garanties légales BTP</p>
                  <p className="text-sm text-slate-500">Parfait achèvement, biennale, décennale</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={entreprise.mentionGaranties !== false} onChange={e => setEntreprise(p => ({...p, mentionGaranties: e.target.checked}))} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border ${cardBg}`} p-6">
            <h3 className="font-semibold mb-4">Conditions générales personnalisées</h3>
            <textarea className="w-full px-4 py-3 border rounded-xl" rows={4} placeholder="Ajoutez ici vos conditions générales personnalisées qui apparaîtront sur tous vos devis et factures..." value={entreprise.cgv || ''} onChange={e => setEntreprise(p => ({...p, cgv: e.target.value}))} />
            <p className="text-xs text-slate-500 mt-2">Ce texte sera ajouté après les mentions légales obligatoires.</p>
          </div>
        </div>
      )}

      {/* RENTABILITÉ */}
      {tab === 'rentabilite' && (
        <div className={`rounded-2xl border ${cardBg}`} p-6">
          <h3 className="font-semibold mb-4"> Calcul de Rentabilité</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Taux de frais de structure (%)</label>
              <input type="number" min="0" max="50" className="w-32 px-4 py-2.5 border rounded-xl" value={entreprise.tauxFraisStructure || 15} onChange={e => setEntreprise(p => ({...p, tauxFraisStructure: parseFloat(e.target.value) || 15}))} />
              <p className="text-sm text-slate-500 mt-2">Loyer, assurances, carburant, comptable, téléphone...</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 font-mono text-sm">
              <p><strong>Marge Réelle</strong> = CA HT + Ajustements Revenus</p>
              <p className="ml-4">- Matériaux (achats)</p>
              <p className="ml-4">- Main d'Å“uvre (heures Ã— coût chargé)</p>
              <p className="ml-4">- Frais structure ({entreprise.tauxFraisStructure || 15}% du CA)</p>
              <p className="ml-4">- Ajustements Dépenses</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              <p><strong>Code couleur marge:</strong></p>
              <p className="flex items-center gap-2 mt-1"><span className="w-3 h-3 rounded bg-red-500"></span> Rouge: Marge négative (&lt;0%)</p>
              <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500"></span> Orange: Marge faible (0-15%)</p>
              <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span> Vert: Marge saine (&gt;15%)</p>
            </div>
          </div>
        </div>
      )}

      {/* APERÇU DOCUMENT */}
      <div className={`rounded-2xl border ${cardBg}`} p-6">
        <h3 className="font-semibold mb-4"> Aperçu en-tête document</h3>
        <div className="border rounded-xl p-6 bg-slate-50">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              {entreprise.logo ? (
                <img src={entreprise.logo} className="h-16 object-contain" alt="Logo" />
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{background: `${entreprise.couleur}20`}}></div>
              )}
              <div>
                <p className="font-bold text-lg">{entreprise.nom || 'Nom entreprise'}</p>
                {entreprise.slogan && <p className="text-xs text-slate-500 italic">{entreprise.slogan}</p>}
                {entreprise.formeJuridique && (
                  <p className="text-xs text-slate-500">{entreprise.formeJuridique}{entreprise.capital && ` â€¢ Capital: ${entreprise.capital} €`}</p>
                )}
                <p className="text-sm text-slate-500 whitespace-pre-line mt-1">{entreprise.adresse || 'Adresse'}</p>
              </div>
            </div>
            <p className="font-bold text-xl" style={{color: entreprise.couleur}}>DEVIS</p>
          </div>
          <div className="text-xs text-slate-500 space-y-0.5 border-t pt-3 mt-3">
            {entreprise.siret && <p>SIRET: {entreprise.siret} {entreprise.codeApe && `â€¢ APE: ${entreprise.codeApe}`}</p>}
            {getRCSComplet() && <p>{getRCSComplet()}</p>}
            {entreprise.tvaIntra && <p>TVA Intracommunautaire: {entreprise.tvaIntra}</p>}
            {entreprise.tel && <p>Tél: {entreprise.tel} {entreprise.email && `â€¢ ${entreprise.email}`}</p>}
            {(entreprise.rcProAssureur || entreprise.decennaleAssureur) && (
              <p className="pt-1 text-[10px]">
                {entreprise.rcProAssureur && `RC Pro: ${entreprise.rcProAssureur} N°${entreprise.rcProNumero}`}
                {entreprise.rcProAssureur && entreprise.decennaleAssureur && ' â€¢ '}
                {entreprise.decennaleAssureur && `Décennale: ${entreprise.decennaleAssureur} N°${entreprise.decennaleNumero}${entreprise.decennaleValidite ? ` (Valide: ${new Date(entreprise.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Export Comptable */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4"> Export pour comptable</h3>
            <p className="text-slate-500 mb-4">Exportez vos devis et factures au format Excel/CSV pour votre comptable.</p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Année Ã  exporter</label>
              <select className="w-full px-4 py-2.5 border rounded-xl" value={exportYear} onChange={e => setExportYear(parseInt(e.target.value))}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm">
              <p className="font-medium mb-2">Colonnes exportées:</p>
              <p className="text-slate-600">N° Document, Type, Date, Client, Total HT, TVA 5.5%, TVA 10%, TVA 20%, Total TTC, Statut</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)} className="flex-1 px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
              <button onClick={handleExportComptable} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl"> Télécharger CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
