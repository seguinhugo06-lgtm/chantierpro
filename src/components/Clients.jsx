import React, { useState } from 'react';

export default function Clients({ clients, setClients, devis, chantiers, onSubmit, couleur, setPage, setSelectedChantier }) {
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('infos');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });

  const filtered = clients.filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()) || c.entreprise?.toLowerCase().includes(search.toLowerCase()));

  const getClientStats = (id) => {
    const clientDevis = devis?.filter(d => d.client_id === id) || [];
    const clientChantiers = chantiers?.filter(c => c.client_id === id) || [];
    return {
      devis: clientDevis.filter(d => d.type === 'devis').length,
      factures: clientDevis.filter(d => d.type === 'facture').length,
      ca: clientDevis.filter(d => d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0),
      chantiers: clientChantiers.length,
      chantiersEnCours: clientChantiers.filter(c => c.statut === 'en_cours').length
    };
  };

  const submit = () => {
    if (!form.nom) return;
    if (editId) {
      setClients(clients.map(c => c.id === editId ? { ...c, ...form } : c));
      setEditId(null);
    } else {
      onSubmit(form);
    }
    setShow(false);
    setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });
  };

  const startEdit = (client) => {
    setForm({ nom: client.nom || '', prenom: client.prenom || '', entreprise: client.entreprise || '', email: client.email || '', telephone: client.telephone || '', adresse: client.adresse || '', notes: client.notes || '' });
    setEditId(client.id);
    setShow(true);
  };

  const openGPS = (adresse) => {
    if (!adresse) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
    window.open(url, '_blank');
  };

  const callPhone = (tel) => {
    if (!tel) return;
    window.location.href = `tel:${tel.replace(/\s/g, '')}`;
  };

  const sendWhatsApp = (tel, nom) => {
    if (!tel) return;
    const phone = tel.replace(/\s/g, '').replace(/^0/, '33');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour ${nom || ''},`)}`, '_blank');
  };

  const deleteClient = (id) => {
    if (confirm('Supprimer ce client ?')) {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  // Vue détail client
  if (viewId) {
    const client = clients.find(c => c.id === viewId);
    if (!client) { setViewId(null); return null; }
    const stats = getClientStats(client.id);
    const clientDevis = devis?.filter(d => d.client_id === client.id) || [];
    const clientChantiers = chantiers?.filter(c => c.client_id === client.id) || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setViewId(null)} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{client.nom} {client.prenom}</h1>
            {client.entreprise && <p className="text-slate-500">{client.entreprise}</p>}
          </div>
          <button onClick={() => startEdit(client)} className="px-4 py-2 text-sm rounded-xl" style={{background: `${couleur}20`, color: couleur}}>✏️ Modifier</button>
        </div>

        {/* Infos + Actions */}
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex gap-4 flex-wrap mb-4">
            {client.telephone && (
              <>
                <button onClick={() => callPhone(client.telephone)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm">📞 Appeler</button>
                <button onClick={() => sendWhatsApp(client.telephone, client.prenom)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm">💬 WhatsApp</button>
              </>
            )}
            {client.adresse && (
              <button onClick={() => openGPS(client.adresse)} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm">🗺️ Itinéraire</button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {client.telephone && <div><p className="text-slate-500">Téléphone</p><p className="font-medium">{client.telephone}</p></div>}
            {client.email && <div><p className="text-slate-500">Email</p><p className="font-medium">{client.email}</p></div>}
            {client.adresse && <div className="col-span-2"><p className="text-slate-500">Adresse</p><p className="font-medium">{client.adresse}</p></div>}
          </div>

          {client.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-slate-500 mb-1">Notes internes</p>
              <p className="text-sm bg-amber-50 p-3 rounded-xl">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold" style={{color: couleur}}>{stats.chantiers}</p>
            <p className="text-xs text-slate-500">Chantiers</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.devis}</p>
            <p className="text-xs text-slate-500">Devis</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{stats.factures}</p>
            <p className="text-xs text-slate-500">Factures</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{stats.ca.toLocaleString()}€</p>
            <p className="text-xs text-slate-500">CA Total</p>
          </div>
        </div>

        {/* Onglets Historique */}
        <div className="flex gap-2 border-b pb-2">
          {[['chantiers', '🏗️ Chantiers'], ['documents', '📄 Documents'], ['photos', '📸 Photos']].map(([k, v]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${activeTab === k ? 'bg-white border border-b-white -mb-[3px]' : 'text-slate-500'}`}>{v}</button>
          ))}
        </div>

        {activeTab === 'chantiers' && (
          <div className="bg-white rounded-2xl border p-5">
            {clientChantiers.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Aucun chantier</p>
            ) : (
              <div className="space-y-2">
                {clientChantiers.map(ch => (
                  <div key={ch.id} onClick={() => { if (setSelectedChantier) setSelectedChantier(ch.id); if (setPage) setPage('chantiers'); }} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
                    <span className={`w-3 h-3 rounded-full ${ch.statut === 'en_cours' ? 'bg-emerald-500' : ch.statut === 'termine' ? 'bg-slate-400' : 'bg-blue-500'}`}></span>
                    <div className="flex-1"><p className="font-medium">{ch.nom}</p><p className="text-xs text-slate-500">{ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : 'Prospect'}</p></div>
                    <span className="text-slate-400">→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border p-5">
            {clientDevis.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Aucun document</p>
            ) : (
              <div className="space-y-2">
                {clientDevis.map(d => {
                  const statusIcon = { brouillon: '⚪', envoye: '🟡', accepte: '✅', payee: '💰', refuse: '❌' }[d.statut] || '📄';
                  return (
                    <div key={d.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <span>{statusIcon}</span>
                      <div className="flex-1"><p className="font-medium">{d.numero}</p><p className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</p></div>
                      <p className="font-bold" style={{color: couleur}}>{(d.total_ttc || 0).toLocaleString()}€</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="bg-white rounded-2xl border p-5">
            {(() => {
              const allPhotos = clientChantiers.flatMap(ch => (ch.photos || []).map(p => ({ ...p, chantierNom: ch.nom })));
              if (allPhotos.length === 0) return <p className="text-center text-slate-400 py-8">Aucune photo</p>;
              return (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {allPhotos.map(p => (
                    <div key={p.id} className="relative group">
                      <img src={p.src} className="w-full h-24 object-cover rounded-xl" alt="" />
                      <p className="text-xs text-slate-500 mt-1 truncate">{p.chantierNom}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // Formulaire
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEditId(null); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' }); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button>
        <h1 className="text-2xl font-bold">{editId ? 'Modifier' : 'Nouveau'} client</h1>
      </div>
      <div className="bg-white rounded-2xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom *</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Prénom</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Entreprise</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Téléphone</label><input className="w-full px-4 py-2.5 border rounded-xl" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full px-4 py-2.5 border rounded-xl" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresse</label><textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Notes internes</label><textarea className="w-full px-4 py-2.5 border rounded-xl" rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Code portail, infos utiles..." /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={() => { setShow(false); setEditId(null); }} className="px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>{editId ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </div>
    </div>
  );

  // Liste
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
            const s = getClientStats(c.id);
            return (
              <div key={c.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-all">
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold cursor-pointer" style={{background: couleur}} onClick={() => setViewId(c.id)}>{c.nom?.[0]}</div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewId(c.id)}>
                    <h3 className="font-semibold truncate">{c.nom} {c.prenom}</h3>
                    {c.entreprise && <p className="text-sm text-slate-500 truncate">{c.entreprise}</p>}
                  </div>
                  <button onClick={() => startEdit(c)} className="text-slate-400 hover:text-slate-600 p-1">✏️</button>
                </div>
                {c.telephone && (
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => callPhone(c.telephone)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm">📞 {c.telephone}</button>
                    <button onClick={() => sendWhatsApp(c.telephone, c.prenom)} className="py-2 px-3 bg-green-50 text-green-600 rounded-lg text-sm">💬</button>
                  </div>
                )}
                {c.adresse && <button onClick={() => openGPS(c.adresse)} className="w-full py-2 bg-purple-50 text-purple-600 rounded-lg text-sm mb-3">🗺️ Itinéraire</button>}
                <div className="flex gap-4 pt-3 border-t text-sm">
                  <span>🏗️ {s.chantiers}</span>
                  <span>📄 {s.devis}</span>
                  <span className="font-bold ml-auto" style={{color: couleur}}>{s.ca.toLocaleString()}€</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
