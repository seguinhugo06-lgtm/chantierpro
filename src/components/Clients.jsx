import React, { useState, useEffect } from 'react';

export default function Clients({ clients, setClients, devis, chantiers, onSubmit, couleur, setPage, setSelectedChantier, setSelectedDevis, isDark, createMode, setCreateMode }) {
  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('chantiers');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });

  useEffect(() => { if (createMode) { setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);

  const filtered = clients.filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()) || c.entreprise?.toLowerCase().includes(search.toLowerCase()));

  const getClientStats = (id) => {
    const cd = devis?.filter(d => d.client_id === id) || [];
    const cc = chantiers?.filter(c => c.client_id === id) || [];
    return { devis: cd.filter(d => d.type === 'devis').length, factures: cd.filter(d => d.type === 'facture').length, ca: cd.filter(d => d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0), chantiers: cc.length, chantiersEnCours: cc.filter(c => c.statut === 'en_cours').length };
  };

  const submit = () => {
    if (!form.nom) return;
    if (editId) { setClients(clients.map(c => c.id === editId ? { ...c, ...form } : c)); setEditId(null); }
    else onSubmit(form);
    setShow(false); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });
  };

  const startEdit = (client) => { setForm({ nom: client.nom || '', prenom: client.prenom || '', entreprise: client.entreprise || '', email: client.email || '', telephone: client.telephone || '', adresse: client.adresse || '', notes: client.notes || '' }); setEditId(client.id); setShow(true); };
  const openGPS = (adresse) => { if (!adresse) return; window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`, '_blank'); };
  const callPhone = (tel) => { if (!tel) return; window.location.href = `tel:${tel.replace(/\s/g, '')}`; };
  const sendWhatsApp = (tel, nom) => { if (!tel) return; const phone = tel.replace(/\s/g, '').replace(/^0/, '33'); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour ${nom || ''},`)}`, '_blank'); };
  const deleteClient = (id) => { if (confirm('Supprimer ce client ?')) setClients(clients.filter(c => c.id !== id)); };
  
  // Ouvrir un document (devis/facture)
  const openDocument = (doc) => {
    if (setSelectedDevis && setPage) {
      setSelectedDevis(doc);
      setPage('devis');
    }
  };

  // Vue détail
  if (viewId) {
    const client = clients.find(c => c.id === viewId);
    if (!client) { setViewId(null); return null; }
    const stats = getClientStats(client.id);
    const clientDevis = devis?.filter(d => d.client_id === client.id) || [];
    const clientChantiers = chantiers?.filter(c => c.client_id === client.id) || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setViewId(null)} className="p-2 hover:bg-slate-100 rounded-xl text-xl">←</button>
          <div className="flex-1"><h1 className="text-2xl font-bold">{client.nom} {client.prenom}</h1>{client.entreprise && <p className="text-slate-500">{client.entreprise}</p>}</div>
          <button onClick={() => startEdit(client)} className="px-4 py-2 text-sm rounded-xl" style={{background: `${couleur}20`, color: couleur}}> Modifier</button>
        </div>

        {/* Actions rapides */}
        <div className={`${cardBg} rounded-2xl border p-5`}>
          <div className="flex gap-3 flex-wrap mb-4">
            {client.telephone && (<><button onClick={() => callPhone(client.telephone)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm"> Appeler</button><button onClick={() => sendWhatsApp(client.telephone, client.prenom)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm"> WhatsApp</button></>)}
            {client.adresse && <button onClick={() => openGPS(client.adresse)} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm"> Itinéraire</button>}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {client.telephone && <div><p className="text-slate-500">Téléphone</p><p className="font-medium">{client.telephone}</p></div>}
            {client.email && <div><p className="text-slate-500">Email</p><p className="font-medium">{client.email}</p></div>}
            {client.adresse && <div className="col-span-2"><p className="text-slate-500">Adresse</p><p className="font-medium">{client.adresse}</p></div>}
          </div>
          {client.notes && <div className="mt-4 pt-4 border-t"><p className="text-sm text-slate-500 mb-1">Notes internes</p><p className="text-sm bg-amber-50 p-3 rounded-xl">{client.notes}</p></div>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${cardBg} rounded-xl border p-4 text-center`}><p className="text-2xl font-bold" style={{color: couleur}}>{stats.chantiers}</p><p className={`text-xs ${textMuted}`}>Chantiers</p></div>
          <div className={`${cardBg} rounded-xl border p-4 text-center`}><p className="text-2xl font-bold text-blue-500">{stats.devis}</p><p className={`text-xs ${textMuted}`}>Devis</p></div>
          <div className={`${cardBg} rounded-xl border p-4 text-center`}><p className="text-2xl font-bold text-purple-500">{stats.factures}</p><p className={`text-xs ${textMuted}`}>Factures</p></div>
          <div className={`${cardBg} rounded-xl border p-4 text-center`}><p className="text-2xl font-bold text-emerald-500">{stats.ca.toLocaleString()}€</p><p className={`text-xs ${textMuted}`}>CA Total</p></div>
        </div>

        {/* Onglets Historique */}
        <div className={`flex gap-2 border-b pb-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {[['chantiers', '🏗️ Chantiers'], ['documents', '📄 Documents'], ['photos', '📷 Photos']].map(([k, v]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${activeTab === k ? (isDark ? 'bg-slate-800 border border-b-slate-800 border-slate-700 text-white' : 'bg-white border border-b-white border-slate-200') + ' -mb-[3px]' : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>{v}</button>
          ))}
        </div>

        {activeTab === 'chantiers' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            {clientChantiers.length === 0 ? <p className="text-center text-slate-400 py-8">Aucun chantier</p> : (
              <div className="space-y-2">{clientChantiers.map(ch => (
                <div key={ch.id} onClick={() => { if (setSelectedChantier) setSelectedChantier(ch.id); if (setPage) setPage('chantiers'); }} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <span className={`w-3 h-3 rounded-full ${ch.statut === 'en_cours' ? 'bg-emerald-500' : ch.statut === 'termine' ? 'bg-slate-400' : 'bg-blue-500'}`}></span>
                  <div className="flex-1"><p className="font-medium">{ch.nom}</p><p className="text-xs text-slate-500">{ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : 'Prospect'}</p></div>
                  <span className="text-slate-400">←’</span>
                </div>
              ))}</div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            {clientDevis.length === 0 ? <p className="text-center text-slate-400 py-8">Aucun document</p> : (
              <div className="space-y-2">{clientDevis.map(d => {
                const statusIcon = { brouillon: '⚪', envoye: '📤', accepte: '✅', payee: '💰', refuse: 'âŒ' }[d.statut] || '';
                return (
                  <div key={d.id} onClick={() => openDocument(d)} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:shadow-sm transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    <span className="text-xl">{d.type === 'facture' ? '🧾' : '📄'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{d.numero}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200">{statusIcon}</span>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <p className="font-bold" style={{color: couleur}}>{(d.total_ttc || 0).toLocaleString()}€</p>
                    <span className="text-slate-400">←’</span>
                  </div>
                );
              })}</div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            {(() => {
              const allPhotos = clientChantiers.flatMap(ch => (ch.photos || []).map(p => ({ ...p, chantierNom: ch.nom })));
              if (allPhotos.length === 0) return <p className="text-center text-slate-400 py-8">Aucune photo</p>;
              return (<div className="grid grid-cols-3 md:grid-cols-4 gap-3">{allPhotos.map(p => (<div key={p.id} className="relative"><img src={p.src} className="w-full h-24 object-cover rounded-xl" alt="" /><p className="text-xs text-slate-500 mt-1 truncate">{p.chantierNom}</p></div>))}</div>);
            })()}
          </div>
        )}
      </div>
    );
  }

  // Formulaire
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => { setShow(false); setEditId(null); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' }); }} className="p-2 hover:bg-slate-100 rounded-xl">←</button><h1 className="text-2xl font-bold">{editId ? 'Modifier' : 'Nouveau'} client</h1></div>
      <div className={`${cardBg} rounded-2xl border p-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prénom</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Entreprise</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Téléphone</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email</label><input type="email" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Adresse</label><textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Notes internes</label><textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Code portail, infos utiles..." /></div>
        </div>
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : ''}`}><button onClick={() => { setShow(false); setEditId(null); }} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>{editId ? 'Enregistrer' : 'Créer'}</button></div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Clients ({clients.length})</h1><button onClick={() => setShow(true)} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>+ Nouveau</button></div>
      <input type="text" placeholder=" Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full max-w-md px-4 py-2.5 border rounded-xl ${inputBg}`} />
      {filtered.length === 0 ? <div className={`${cardBg} rounded-2xl border p-12 text-center`}><p className="text-5xl mb-4">👥</p><p className={textMuted}>Aucun client</p></div> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const s = getClientStats(c.id);
            return (
              <div key={c.id} className={`${cardBg} rounded-2xl border p-5 hover:shadow-lg transition-all cursor-pointer group`} onClick={() => setViewId(c.id)}>
                {/* Header avec avatar et infos */}
                <div className="flex gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`}}>
                    {c.nom?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-lg truncate ${textPrimary} group-hover:underline`}>{c.nom} {c.prenom}</h3>
                    {c.entreprise && <p className={`text-sm ${textMuted} truncate flex items-center gap-1`}>🏢 {c.entreprise}</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); startEdit(c); }} className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                    ✏️
                  </button>
                </div>

                {/* Contact info avec icônes */}
                <div className={`space-y-2 mb-4 pb-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  {c.telephone && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <span className={`text-sm ${textSecondary} flex-1`}>{c.telephone}</span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => callPhone(c.telephone)} className={`p-1.5 rounded-lg text-blue-500 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-blue-50'}`} title="Appeler">📞</button>
                        <button onClick={() => sendWhatsApp(c.telephone, c.prenom)} className={`p-1.5 rounded-lg text-green-500 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-green-50'}`} title="WhatsApp">💬</button>
                      </div>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✉️</span>
                      <span className={`text-sm ${textSecondary} truncate`}>{c.email}</span>
                    </div>
                  )}
                  {c.adresse && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-lg">📍</span>
                      <span className={`text-sm ${textSecondary} flex-1 truncate`}>{c.adresse}</span>
                      <button onClick={() => openGPS(c.adresse)} className={`p-1.5 rounded-lg text-purple-500 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-purple-50'}`} title="Itinéraire">🗺️</button>
                    </div>
                  )}
                  {!c.telephone && !c.email && !c.adresse && (
                    <p className={`text-sm ${textMuted} italic`}>Aucune info de contact</p>
                  )}
                </div>

                {/* Stats avec icônes */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-3">
                    <span className={`flex items-center gap-1 ${textSecondary}`} title="Chantiers">
                      🏗️ <span className="font-medium">{s.chantiers}</span>
                    </span>
                    <span className={`flex items-center gap-1 ${textSecondary}`} title="Devis">
                      📄 <span className="font-medium">{s.devis}</span>
                    </span>
                    <span className={`flex items-center gap-1 ${textSecondary}`} title="Factures">
                      🧾 <span className="font-medium">{s.factures}</span>
                    </span>
                  </div>
                  <span className="font-bold text-base" style={{color: couleur}}>{s.ca.toLocaleString()}€</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
