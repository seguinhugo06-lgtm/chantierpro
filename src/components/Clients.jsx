import React, { useState } from 'react';

export default function Clients({ clients, devis, onSubmit, couleur }) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });

  const filtered = clients.filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()) || c.entreprise?.toLowerCase().includes(search.toLowerCase()));

  const getStats = (id) => ({
    devis: devis.filter(d => d.client_id === id && d.type === 'devis').length,
    factures: devis.filter(d => d.client_id === id && d.type === 'facture').length,
    ca: devis.filter(d => d.client_id === id && d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0)
  });

  const submit = () => {
    if (!form.nom) return;
    onSubmit(form);
    setShow(false);
    setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '' });
  };

  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShow(false)} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">Nouveau client</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prénom</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Entreprise</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full px-4 py-2.5 border rounded-xl" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => setShow(false)} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>Créer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clients ({clients.length})</h1>
        <button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button>
      </div>
      <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md px-4 py-2.5 border rounded-xl" />
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center"><p className="text-5xl mb-4">👥</p><p className="text-slate-500">Aucun client</p></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const s = getStats(c.id);
            return (
              <div key={c.id} className="bg-white rounded-2xl border p-5">
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{background: couleur}}>{c.nom?.[0]}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{c.nom} {c.prenom}</h3>
                    {c.entreprise && <p className="text-sm text-slate-500 truncate">{c.entreprise}</p>}
                  </div>
                </div>
                {c.telephone && <p className="text-sm mb-1">📞 {c.telephone}</p>}
                {c.email && <p className="text-sm text-slate-500 truncate">📧 {c.email}</p>}
                <div className="flex gap-4 mt-4 pt-4 border-t text-sm">
                  <span>📄 {s.devis} devis</span>
                  <span>🧾 {s.factures} fact.</span>
                  <span className="font-bold" style={{color: couleur}}>{s.ca.toLocaleString()}€</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
