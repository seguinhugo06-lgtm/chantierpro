import React, { useState } from 'react';

export default function Settings({ entreprise, setEntreprise, user }) {
  const [tab, setTab] = useState('identite');

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEntreprise(p => ({ ...p, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const COULEURS = ['#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {[['identite', '🏢 Identité'], ['legal', '📋 Mentions'], ['banque', '🏦 Banque'], ['rentabilite', '💰 Rentabilité']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${tab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`} style={tab === k ? {color: entreprise.couleur} : {}}>
            {v}
          </button>
        ))}
      </div>

      {tab === 'identite' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Logo et Couleur</h3>
            <div className="flex gap-6 items-start flex-wrap">
              <div>
                <p className="text-sm font-medium mb-2">Logo</p>
                <div className="flex items-center gap-4">
                  {entreprise.logo ? (
                    <img src={entreprise.logo} className="w-20 h-20 object-contain rounded-xl border" alt="Logo" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center text-3xl">🏢</div>
                  )}
                  <div>
                    <label className="px-4 py-2 rounded-xl cursor-pointer text-sm text-white inline-block" style={{background: entreprise.couleur}}>
                      Choisir
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {entreprise.logo && <button onClick={() => setEntreprise(p => ({...p, logo: ''}))} className="block mt-2 text-sm text-red-500">Supprimer</button>}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Couleur</p>
                <div className="flex gap-2 flex-wrap">
                  {COULEURS.map(c => (
                    <button key={c} onClick={() => setEntreprise(p => ({...p, couleur: c}))} className={`w-10 h-10 rounded-xl ${entreprise.couleur === c ? 'ring-2 ring-offset-2' : ''}`} style={{background: c}} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Coordonnées</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Nom entreprise</label><input className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.nom || ''} onChange={e => setEntreprise(p => ({...p, nom: e.target.value}))} placeholder="SARL Martin" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} value={entreprise.adresse || ''} onChange={e => setEntreprise(p => ({...p, adresse: e.target.value}))} /></div>
              <div><label className="block text-sm font-medium mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.tel || ''} onChange={e => setEntreprise(p => ({...p, tel: e.target.value}))} /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.email || ''} onChange={e => setEntreprise(p => ({...p, email: e.target.value}))} /></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'legal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Informations légales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">SIRET</label><input className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.siret || ''} onChange={e => setEntreprise(p => ({...p, siret: e.target.value}))} placeholder="123 456 789 00012" /></div>
              <div><label className="block text-sm font-medium mb-1">TVA Intra</label><input className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.tvaIntra || ''} onChange={e => setEntreprise(p => ({...p, tvaIntra: e.target.value}))} placeholder="FR12345678901" /></div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Assurance décennale *</label>
                <input className="w-full px-4 py-2.5 border rounded-xl" value={entreprise.assurance || ''} onChange={e => setEntreprise(p => ({...p, assurance: e.target.value}))} placeholder="AXA - Police N°123456 - Valide jusqu'au 31/12/2025" />
                <p className="text-xs text-slate-500 mt-1">Apparaîtra automatiquement sur tous les devis et factures</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
            ⚠️ <strong>Obligatoire :</strong> L'assurance décennale doit figurer sur vos devis pour les travaux de construction/rénovation.
          </div>
        </div>
      )}

      {tab === 'banque' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">Coordonnées bancaires</h3>
            <div>
              <label className="block text-sm font-medium mb-1">RIB / IBAN</label>
              <input className="w-full px-4 py-2.5 border rounded-xl font-mono" value={entreprise.rib || ''} onChange={e => setEntreprise(p => ({...p, rib: e.target.value}))} placeholder="FR76 1234 5678 9012 3456 7890 123" />
              <p className="text-xs text-slate-500 mt-1">Affiché automatiquement sur les factures</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'rentabilite' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">💰 Paramètres de Rentabilité</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Taux de frais de structure (%)</label>
                <input type="number" min="0" max="50" className="w-32 px-4 py-2.5 border rounded-xl" value={entreprise.tauxFraisStructure || 15} onChange={e => setEntreprise(p => ({...p, tauxFraisStructure: parseFloat(e.target.value) || 15}))} />
                <p className="text-sm text-slate-500 mt-2">
                  Ce pourcentage est appliqué sur le CA HT pour couvrir vos frais fixes :
                </p>
                <ul className="text-sm text-slate-500 mt-1 ml-4 list-disc">
                  <li>Loyer / garage / atelier</li>
                  <li>Assurances (véhicule, RC pro...)</li>
                  <li>Carburant / déplacements</li>
                  <li>Comptable / administratif</li>
                  <li>Téléphone / internet</li>
                </ul>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Conseil :</strong> Un taux entre 10% et 20% est courant pour les artisans. 
                  Calculez vos frais fixes annuels ÷ CA annuel pour obtenir votre taux réel.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">📊 Formule de calcul de marge</h3>
            <div className="bg-slate-50 rounded-xl p-4 font-mono text-sm">
              <p><strong>Marge Nette</strong> = CA HT</p>
              <p className="ml-8">- Coût Matériaux (dépenses)</p>
              <p className="ml-8">- Coût MO (heures × coût chargé)</p>
              <p className="ml-8">- Frais Structure (CA × {entreprise.tauxFraisStructure || 15}%)</p>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Les heures comptabilisées sont uniquement celles validées par le patron dans l'onglet Équipe.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4">👤 Compte</h3>
        <div className="flex justify-between py-2 border-b">
          <span className="text-slate-500">Email</span>
          <span>{user?.email || '-'}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4">👁️ Aperçu en-tête</h3>
        <div className="border rounded-xl p-6 bg-slate-50">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {entreprise.logo ? <img src={entreprise.logo} className="h-16 object-contain" alt="" /> : <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{background: `${entreprise.couleur}20`}}>🏢</div>}
              <div>
                <p className="font-bold text-lg">{entreprise.nom || 'Nom entreprise'}</p>
                <p className="text-sm text-slate-500">{entreprise.adresse || 'Adresse'}</p>
                <p className="text-sm text-slate-500">{entreprise.tel || ''}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl" style={{color: entreprise.couleur}}>DEVIS</p>
              <p className="text-slate-500">DEV-2024-00001</p>
            </div>
          </div>
          {entreprise.siret && <p className="text-xs text-slate-400 mt-4">SIRET: {entreprise.siret} {entreprise.tvaIntra && ` • TVA: ${entreprise.tvaIntra}`}</p>}
          {entreprise.assurance && <p className="text-xs text-slate-400">Assurance décennale: {entreprise.assurance}</p>}
        </div>
      </div>
    </div>
  );
}
