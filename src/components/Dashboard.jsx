import React from 'react';

export default function Dashboard({ stats, devis, chantiers, depenses, pointages, setPage, couleur, getChantierBilan }) {
  const enCours = chantiers.filter(c => c.statut === 'en_cours');
  
  // Bilan global
  const totalRevenus = devis.filter(d => d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const totalHeures = pointages.reduce((s, p) => s + (p.heures || 0), 0);
  const coutMO = totalHeures * 35;
  const margeGlobale = totalRevenus - totalDepenses - coutMO;

  // Factures par statut
  const facturesPayees = devis.filter(d => d.type === 'facture' && d.statut === 'payee');
  const facturesAttente = devis.filter(d => d.type === 'facture' && d.statut === 'envoyee');
  const facturesRetard = facturesAttente.filter(d => (Date.now() - new Date(d.date)) > 30*86400000);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bonjour 👋</h1>
        <p className="text-slate-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Alertes */}
      {stats.enRetard > 0 && (
        <div onClick={() => setPage('devis')} className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl cursor-pointer">
          <span className="text-3xl">🔴</span>
          <div>
            <p className="font-semibold text-red-800">{facturesRetard.length} facture(s) en retard</p>
            <p className="text-sm text-red-600">{stats.enRetard.toLocaleString('fr-FR')} € à relancer</p>
          </div>
        </div>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 text-white" style={{background: couleur}}>
          <p className="text-sm opacity-80">💰 Encaissé ce mois</p>
          <p className="text-3xl font-bold mt-1">{stats.caMois.toLocaleString('fr-FR')} €</p>
        </div>
        <div onClick={() => setPage('devis')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg">
          <p className="text-sm text-slate-500">🟡 En attente</p>
          <p className="text-3xl font-bold mt-1">{stats.enAttente.toLocaleString('fr-FR')} €</p>
        </div>
        <div onClick={() => setPage('devis')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg">
          <p className="text-sm text-slate-500">📄 Devis à suivre</p>
          <p className="text-3xl font-bold mt-1">{stats.devisAttente}</p>
        </div>
        <div onClick={() => setPage('chantiers')} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-lg">
          <p className="text-sm text-slate-500">🏗️ Chantiers actifs</p>
          <p className="text-3xl font-bold mt-1">{stats.chantiersEnCours}</p>
        </div>
      </div>

      {/* Bilan Flash */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold text-lg mb-4">📊 Bilan Flash</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-sm text-green-600">Revenus</p>
            <p className="text-2xl font-bold text-green-700">{totalRevenus.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-sm text-red-600">Matériaux</p>
            <p className="text-2xl font-bold text-red-700">-{totalDepenses.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-600">Main d'œuvre ({totalHeures}h)</p>
            <p className="text-2xl font-bold text-blue-700">-{coutMO.toLocaleString('fr-FR')} €</p>
          </div>
          <div className={`text-center p-4 rounded-xl ${margeGlobale >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <p className={`text-sm ${margeGlobale >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>= Marge réelle</p>
            <p className={`text-2xl font-bold ${margeGlobale >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{margeGlobale.toLocaleString('fr-FR')} €</p>
          </div>
        </div>
      </div>

      {/* Suivi paiements */}
      <div className="bg-white rounded-2xl border">
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <h3 className="font-semibold">💳 Suivi des paiements</h3>
          <button onClick={() => setPage('devis')} className="text-sm" style={{color: couleur}}>Voir tout →</button>
        </div>
        <div className="p-4 space-y-3">
          {devis.filter(d => d.type === 'facture').slice(0, 5).map(d => {
            const days = Math.floor((Date.now() - new Date(d.date)) / 86400000);
            const status = d.statut === 'payee' ? { label: '✅ Payé', bg: 'bg-green-100 text-green-700' } 
              : days > 30 ? { label: '🔴 Retard', bg: 'bg-red-100 text-red-700' }
              : { label: '🟡 Attente', bg: 'bg-yellow-100 text-yellow-700' };
            return (
              <div key={d.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium">{d.numero}</p>
                  <p className="text-sm text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <p className="font-bold">{(d.total_ttc || 0).toLocaleString('fr-FR')} €</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg}`}>{status.label}</span>
              </div>
            );
          })}
          {devis.filter(d => d.type === 'facture').length === 0 && <p className="text-center text-slate-500 py-4">Aucune facture</p>}
        </div>
      </div>

      {/* Chantiers en cours avec bilan */}
      <div className="bg-white rounded-2xl border">
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <h3 className="font-semibold">🏗️ Rentabilité par chantier</h3>
          <button onClick={() => setPage('chantiers')} className="text-sm" style={{color: couleur}}>Voir tout →</button>
        </div>
        {enCours.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun chantier en cours</div>
        ) : (
          <div className="divide-y">
            {enCours.slice(0, 4).map(c => {
              const bilan = getChantierBilan(c.id);
              return (
                <div key={c.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{c.nom}</p>
                    <span className={`text-lg font-bold ${bilan.marge >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {bilan.marge >= 0 ? '+' : ''}{bilan.marge.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Revenus: {bilan.revenus.toLocaleString('fr-FR')}€</span>
                    <span>Matériaux: {bilan.materiaux.toLocaleString('fr-FR')}€</span>
                    <span>MO: {bilan.mainOeuvre.toLocaleString('fr-FR')}€</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
