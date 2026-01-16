import React, { useState } from 'react';
import { Users, Phone, MessageCircle, MapPin, Edit, Trash2, ArrowLeft, Plus, Search, FileText, Building2, ChevronRight } from 'lucide-react';

export default function Clients({ clients, setClients, devis, chantiers, onSubmit, couleur, setPage, setSelectedChantier, setSelectedDevis, isDark }) {
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('chantiers');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });

  // Variables thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

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
          <button onClick={() => setViewId(null)} className={`p-2 ${hoverBg} rounded-xl`}><ArrowLeft size={20} /></button>
          <div className="flex-1"><h1 className={`text-2xl font-bold ${textPrimary}`}>{client.nom} {client.prenom}</h1>{client.entreprise && <p className={textSecondary}>{client.entreprise}</p>}</div>
          <button onClick={() => startEdit(client)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl" style={{background: `${couleur}20`, color: couleur}}><Edit size={16} /> Modifier</button>
        </div>

        {/* Actions rapides */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex gap-3 flex-wrap mb-4">
            {client.telephone && (
              <>
                <button onClick={() => callPhone(client.telephone)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm"><Phone size={16} /> Appeler</button>
                <button onClick={() => sendWhatsApp(client.telephone, client.prenom)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm"><MessageCircle size={16} /> WhatsApp</button>
              </>
            )}
            {client.adresse && <button onClick={() => openGPS(client.adresse)} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm"><MapPin size={16} /> Itinéraire</button>}
          </div>
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4 border-t ${isDark ? 'border-slate-700' : ''}`}>
            <div><p className={`text-2xl font-bold ${textPrimary}`}>{stats.chantiers}</p><p className={`text-xs ${textSecondary}`}>Chantiers</p></div>
            <div><p className={`text-2xl font-bold ${textPrimary}`}>{stats.devis}</p><p className={`text-xs ${textSecondary}`}>Devis</p></div>
            <div><p className={`text-2xl font-bold ${textPrimary}`}>{stats.factures}</p><p className={`text-xs ${textSecondary}`}>Factures</p></div>
            <div><p className="text-2xl font-bold" style={{color: couleur}}>{stats.ca.toLocaleString()} €</p><p className={`text-xs ${textSecondary}`}>CA Total</p></div>
          </div>
        </div>

        {/* Onglets Historique */}
        <div className={`flex gap-2 border-b ${isDark ? 'border-slate-700' : ''} pb-2`}>
          {[['chantiers', 'Chantiers'], ['documents', 'Documents'], ['photos', 'Photos']].map(([k, v]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${activeTab === k ? (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border') + ' -mb-[3px]' : textSecondary}`}>{v}</button>
          ))}
        </div>

        {activeTab === 'chantiers' && (
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            {clientChantiers.length === 0 ? <p className={`text-center py-8 ${textSecondary}`}>Aucun chantier</p> : (
              <div className="space-y-2">{clientChantiers.map(ch => (
                <div key={ch.id} onClick={() => { if (setSelectedChantier) setSelectedChantier(ch.id); if (setPage) setPage('chantiers'); }} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer ${hoverBg}`}>
                  <Building2 size={20} style={{color: couleur}} />
                  <div className="flex-1"><p className={`font-medium ${textPrimary}`}>{ch.nom}</p><p className={`text-sm ${textSecondary}`}>{ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : 'Planifié'}</p></div>
                  <ChevronRight size={16} className={textSecondary} />
                </div>
              ))}</div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            {clientDevis.length === 0 ? <p className={`text-center py-8 ${textSecondary}`}>Aucun document</p> : (
              <div className="space-y-2">{clientDevis.map(d => (
                <div key={d.id} onClick={() => openDocument(d)} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer ${hoverBg}`}>
                  <FileText size={20} className={d.type === 'facture' ? 'text-blue-500' : 'text-amber-500'} />
                  <div className="flex-1"><p className={`font-medium ${textPrimary}`}>{d.numero}</p><p className={`text-sm ${textSecondary}`}>{new Date(d.date).toLocaleDateString('fr-FR')}</p></div>
                  <span className="font-bold" style={{color: couleur}}>{(d.total_ttc || 0).toLocaleString()} €</span>
                </div>
              ))}</div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <p className={`text-center py-8 ${textSecondary}`}>Aucune photo</p>
          </div>
        )}
      </div>
    );
  }

  // Formulaire
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEditId(null); setForm({ nom:'', prenom:'', entreprise:'', email:'', telephone:'', adresse:'', notes:'' }); }} className={`p-2 ${hoverBg} rounded-xl`}><ArrowLeft size={20} /></button>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouveau'} client</h1>
      </div>
      <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
        <div className="grid md:grid-cols-2 gap-4">
          <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Nom *" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} />
          <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Prénom" value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} />
        </div>
        <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Entreprise" value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} />
        <div className="grid md:grid-cols-2 gap-4">
          <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Téléphone" value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} />
          <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
        </div>
        <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Adresse" value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} />
        <textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Notes" rows={3} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
        <div className="flex justify-end gap-3">
          <button onClick={() => { setShow(false); setEditId(null); }} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>Annuler</button>
          <button onClick={submit} className="px-6 py-2 text-white rounded-xl" style={{background: couleur}}>{editId ? 'Modifier' : 'Créer'}</button>
        </div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Clients ({clients.length})</h1>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl" style={{background: couleur}}><Plus size={18} /> Nouveau</button>
      </div>
      
      <div className="relative">
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary}`} />
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full max-w-md pl-11 pr-4 py-2.5 border rounded-xl ${inputBg}`} />
      </div>
      
      {filtered.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
          <Users size={48} className={`mx-auto mb-4 ${textSecondary}`} />
          <p className={textSecondary}>Aucun client</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const s = getClientStats(c.id);
            return (
              <div key={c.id} className={`rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition ${cardBg}`} onClick={() => setViewId(c.id)}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{background: couleur}}>{(c.nom?.[0] || '?').toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${textPrimary}`}>{c.nom} {c.prenom}</p>
                    {c.entreprise && <p className={`text-sm truncate ${textSecondary}`}>{c.entreprise}</p>}
                  </div>
                </div>
                {c.telephone && (
                  <button onClick={e => { e.stopPropagation(); callPhone(c.telephone); }} className={`w-full flex items-center justify-between px-4 py-2 rounded-xl mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <span className="flex items-center gap-2" style={{color: couleur}}><Phone size={16} /> {c.telephone}</span>
                    <ChevronRight size={16} className={textSecondary} />
                  </button>
                )}
                {c.adresse && (
                  <button onClick={e => { e.stopPropagation(); openGPS(c.adresse); }} className={`w-full flex items-center justify-between px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <span className={`flex items-center gap-2 ${textSecondary}`}><MapPin size={16} /> Itinéraire</span>
                  </button>
                )}
                <div className={`flex justify-between mt-4 pt-3 border-t ${isDark ? 'border-slate-700' : ''} text-sm`}>
                  <span className={textSecondary}>{s.chantiers} chantier{s.chantiers > 1 ? 's' : ''}</span>
                  <span className="font-semibold" style={{color: couleur}}>{s.ca.toLocaleString()} €</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
