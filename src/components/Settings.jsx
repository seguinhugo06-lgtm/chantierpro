import React, { useState } from 'react';

export default function Settings({ entreprise, setEntreprise, user }) {
  const [tab, setTab] = useState('identite');
  const handleLogoUpload = (e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setEntreprise(p => ({ ...p, logo: reader.result })); reader.readAsDataURL(file); };
  const COULEURS = ['#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  // Calcul du score de complétude
  const getCompletude = () => {
    const required = ['nom', 'adresse', 'siret', 'tel', 'email'];
    const recommended = ['formeJuridique', 'codeApe', 'rcs', 'tvaIntra', 'capital', 'assuranceRCPro', 'assuranceDecennale', 'rib'];
    const filled = [...required, ...recommended].filter(k => entreprise[k] && entreprise[k].trim && entreprise[k].trim() !== '');
    return Math.round((filled.length / (required.length + recommended.length)) * 100);
  };

  const completude = getCompletude();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Paramètres</h1>
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

      {completude < 80 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-medium text-amber-800">Profil incomplet</p>
            <p className="text-sm text-amber-700">Complétez vos informations pour générer des devis et factures conformes à la loi française.</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b pb-2 flex-wrap overflow-x-auto">
        {[['identite', '🏢 Identité'], ['legal', '📋 Légal'], ['assurances', '🛡️ Assurances'], ['banque', '🏦 Banque'], ['documents', '📄 Documents'], ['rentabilite', '💰 Rentabilité']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium whitespace-nowrap ${tab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`} style={tab === k ? {color: entreprise.couleur} : {}}>{v}</button>
        ))}
      </div>

      {/* IDENTITÉ */}
      {tab === 'identite' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Logo & Couleur</h3>
            <div className="flex gap-6 flex-wrap">
              <div>
                <p className="text-sm font-medium mb-2">Logo</p>
                <div className="flex items-center gap-4">
                  {entreprise.logo ? <img src={entreprise.logo} className="w-20 h-20 object-contain rounded-xl border" alt="" /> : <div className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center text-3xl">🏢</div>}
                  <label className="px-4 py-2 rounded-xl cursor-pointer text-white" style={{background: entreprise.couleur}}>Choisir<input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" /></label>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Couleur principale</p>
                <div className="flex gap-2 flex-wrap">{COULEURS.map(c => <button key={c} onClick={() => setEntreprise(p => ({...p, couleur: c}))} className={`w-10 h-10 rounded-xl ${entreprise.couleur === c ? 'ring-2 ring-offset-2' : ''}`} style={{background: c, ringColor: c}} />)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Informations entreprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom / Raison sociale *</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Ex: Dupont Rénovation" value={entreprise.nom || ''} onChange={e => setEntreprise(p => ({...p, nom: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Forme juridique *</label>
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
                <label className="block text-sm font-medium mb-1">Capital social {['SARL', 'SAS', 'SASU', 'EURL'].includes(entreprise.formeJuridique) && '*'}</label>
                <div className="flex">
                  <input type="number" className="flex-1 px-4 py-2.5 border rounded-l-xl" placeholder="10000" value={entreprise.capital || ''} onChange={e => setEntreprise(p => ({...p, capital: e.target.value}))} />
                  <span className="px-4 py-2.5 bg-slate-100 border-y border-r rounded-r-xl">€</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Adresse siège social *</label>
                <textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} placeholder="12 rue des Artisans&#10;75001 Paris" value={entreprise.adresse || ''} onChange={e => setEntreprise(p => ({...p, adresse: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone *</label>
                <input type="tel" className="w-full px-4 py-2.5 border rounded-xl" placeholder="06 12 34 56 78" value={entreprise.tel || ''} onChange={e => setEntreprise(p => ({...p, tel: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" className="w-full px-4 py-2.5 border rounded-xl" placeholder="contact@monentreprise.fr" value={entreprise.email || ''} onChange={e => setEntreprise(p => ({...p, email: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site web</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="www.monentreprise.fr" value={entreprise.siteWeb || ''} onChange={e => setEntreprise(p => ({...p, siteWeb: e.target.value}))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LÉGAL */}
      {tab === 'legal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Numéros d'identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SIRET (14 chiffres) *</label>
                <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="123 456 789 00012" maxLength={17} value={entreprise.siret || ''} onChange={e => setEntreprise(p => ({...p, siret: e.target.value}))} />
                <p className="text-xs text-slate-500 mt-1">Obligatoire sur tous les documents commerciaux</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code APE/NAF</label>
                <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="4339Z" maxLength={5} value={entreprise.codeApe || ''} onChange={e => setEntreprise(p => ({...p, codeApe: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">RCS (ville + numéro)</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Paris B 123 456 789" value={entreprise.rcs || ''} onChange={e => setEntreprise(p => ({...p, rcs: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TVA Intracommunautaire</label>
                <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="FR 12 345678901" value={entreprise.tvaIntra || ''} onChange={e => setEntreprise(p => ({...p, tvaIntra: e.target.value}))} />
              </div>
            </div>
          </div>

          {entreprise.formeJuridique === 'Micro-entreprise' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-medium text-blue-800">💡 Micro-entreprise</p>
              <p className="text-sm text-blue-700 mt-1">En tant que micro-entrepreneur, la mention "TVA non applicable, article 293 B du CGI" sera automatiquement ajoutée sur vos devis et factures.</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Qualifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Numéro RGE (si applicable)</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="E-12345" value={entreprise.rge || ''} onChange={e => setEntreprise(p => ({...p, rge: e.target.value}))} />
                <p className="text-xs text-slate-500 mt-1">Pour travaux éligibles aux aides énergétiques</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Organisme certificateur RGE</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Qualibat, Qualifelec..." value={entreprise.rgeOrganisme || ''} onChange={e => setEntreprise(p => ({...p, rgeOrganisme: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Carte professionnelle BTP</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Numéro de carte" value={entreprise.cartePro || ''} onChange={e => setEntreprise(p => ({...p, cartePro: e.target.value}))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSURANCES */}
      {tab === 'assurances' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-medium text-amber-800">⚠️ Obligatoire pour les artisans du BTP</p>
            <p className="text-sm text-amber-700 mt-1">L'assurance RC Pro et la garantie décennale doivent figurer sur tous vos devis et factures (Article L243-1 du Code des assurances).</p>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">🛡️ Assurance RC Professionnelle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Compagnie d'assurance *</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="AXA, MAAF, MMA..." value={entreprise.rcProAssureur || ''} onChange={e => setEntreprise(p => ({...p, rcProAssureur: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de contrat *</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="RC-123456789" value={entreprise.rcProNumero || ''} onChange={e => setEntreprise(p => ({...p, rcProNumero: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Zone géographique couverte</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="France entière" value={entreprise.rcProZone || 'France entière'} onChange={e => setEntreprise(p => ({...p, rcProZone: e.target.value}))} />
              </div>
            </div>
            {entreprise.rcProAssureur && entreprise.rcProNumero && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl text-sm text-green-700">
                ✅ RC Pro: {entreprise.rcProAssureur} - N°{entreprise.rcProNumero}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">🏗️ Garantie Décennale</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Compagnie d'assurance *</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="SMABTP, AXA..." value={entreprise.decennaleAssureur || ''} onChange={e => setEntreprise(p => ({...p, decennaleAssureur: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de contrat *</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="DEC-987654321" value={entreprise.decennaleNumero || ''} onChange={e => setEntreprise(p => ({...p, decennaleNumero: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de validité</label>
                <input type="date" className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.decennaleValidite || ''} onChange={e => setEntreprise(p => ({...p, decennaleValidite: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Activités couvertes</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" placeholder="Tous corps d'état" value={entreprise.decennaleActivites || ''} onChange={e => setEntreprise(p => ({...p, decennaleActivites: e.target.value}))} />
              </div>
            </div>
            {entreprise.decennaleAssureur && entreprise.decennaleNumero && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl text-sm text-green-700">
                ✅ Décennale: {entreprise.decennaleAssureur} - N°{entreprise.decennaleNumero}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BANQUE */}
      {tab === 'banque' && (
        <div className="bg-white rounded-2xl border p-6">
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
              <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="FR76 1234 5678 9012 3456 7890 123" value={entreprise.iban || ''} onChange={e => setEntreprise(p => ({...p, iban: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">BIC/SWIFT</label>
              <input className="w-full px-4 py-2.5 border rounded-xl font-mono" placeholder="AGRIFRPP" value={entreprise.bic || ''} onChange={e => setEntreprise(p => ({...p, bic: e.target.value}))} />
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {tab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6">
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
                  <option value={10}>10% (rénovation)</option>
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

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Conditions générales</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notes par défaut (bas de devis)</label>
                <textarea className="w-full px-4 py-2.5 border rounded-xl" rows={3} placeholder="Ex: Devis établi à titre indicatif..." value={entreprise.notesDefaut || ''} onChange={e => setEntreprise(p => ({...p, notesDefaut: e.target.value}))} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="mentionRetractation" checked={entreprise.mentionRetractation !== false} onChange={e => setEntreprise(p => ({...p, mentionRetractation: e.target.checked}))} className="w-5 h-5 rounded" />
                <label htmlFor="mentionRetractation" className="text-sm">Afficher le droit de rétractation (14 jours)</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="mentionGaranties" checked={entreprise.mentionGaranties !== false} onChange={e => setEntreprise(p => ({...p, mentionGaranties: e.target.checked}))} className="w-5 h-5 rounded" />
                <label htmlFor="mentionGaranties" className="text-sm">Afficher les garanties légales (parfait achèvement, biennale, décennale)</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENTABILITÉ */}
      {tab === 'rentabilite' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">💰 Calcul de Rentabilité</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Taux de frais de structure (%)</label>
              <input type="number" min="0" max="50" className="w-32 px-4 py-2.5 border rounded-xl" value={entreprise.tauxFraisStructure || 15} onChange={e => setEntreprise(p => ({...p, tauxFraisStructure: parseFloat(e.target.value) || 15}))} />
              <p className="text-sm text-slate-500 mt-2">Loyer, assurances, carburant, comptable...</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 font-mono text-sm">
              <p><strong>Marge Réelle</strong> = CA HT + Ajustements Revenus</p>
              <p className="ml-4">- Matériaux</p>
              <p className="ml-4">- MO (heures × coût chargé)</p>
              <p className="ml-4">- Frais ({entreprise.tauxFraisStructure || 15}% du CA)</p>
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
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4">👁️ Aperçu en-tête document</h3>
        <div className="border rounded-xl p-6 bg-slate-50">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              {entreprise.logo ? <img src={entreprise.logo} className="h-14 object-contain" alt="" /> : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl" style={{background: `${entreprise.couleur}20`}}>🏢</div>}
              <div>
                <p className="font-bold">{entreprise.nom || 'Nom entreprise'}</p>
                {entreprise.formeJuridique && <p className="text-xs text-slate-500">{entreprise.formeJuridique}{entreprise.capital && ` - Capital: ${entreprise.capital}€`}</p>}
                <p className="text-sm text-slate-500 whitespace-pre-line">{entreprise.adresse || 'Adresse'}</p>
              </div>
            </div>
            <p className="font-bold text-xl" style={{color: entreprise.couleur}}>DEVIS</p>
          </div>
          <div className="text-xs text-slate-500 space-y-0.5 border-t pt-3">
            {entreprise.siret && <p>SIRET: {entreprise.siret} {entreprise.codeApe && `• APE: ${entreprise.codeApe}`} {entreprise.rcs && `• RCS: ${entreprise.rcs}`}</p>}
            {entreprise.tvaIntra && <p>TVA Intracommunautaire: {entreprise.tvaIntra}</p>}
            {entreprise.tel && <p>Tél: {entreprise.tel} {entreprise.email && `• ${entreprise.email}`}</p>}
            {(entreprise.rcProAssureur || entreprise.decennaleAssureur) && (
              <p className="pt-1">
                {entreprise.rcProAssureur && `RC Pro: ${entreprise.rcProAssureur} N°${entreprise.rcProNumero}`}
                {entreprise.rcProAssureur && entreprise.decennaleAssureur && ' • '}
                {entreprise.decennaleAssureur && `Décennale: ${entreprise.decennaleAssureur} N°${entreprise.decennaleNumero}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
