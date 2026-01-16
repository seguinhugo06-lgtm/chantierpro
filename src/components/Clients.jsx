import React, { useState } from 'react';
import { Phone, MessageCircle, MapPin, Edit2, Trash2, Search, Plus, Users, FileText, Building, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export default function Clients({ clients, setClients, devis, chantiers, onSubmit, couleur, setPage, setSelectedChantier, setSelectedDevis, isDark }) {
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('chantiers');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });

  // Classes conditionnelles pour le thème
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  const filtered = clients.filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()) || c.entreprise?.toLowerCase().includes(search.toLowerCase()));

  const getClientStats = (id) => {
    const cd = devis?.filter(d => d.client_id === id) || [];
    const cc = chantiers?.filter(c => c.client_id === id) || [];
    return { 
      devis: cd.filter(d => d.type === 'devis').length, 
      factures: cd.filter(d => d.type === 'facture').length, 
      ca: cd.filter(d => d.statut === 'payee').reduce((s, d) => s + (d.total_ttc || 0), 0), 
      chantiers: cc.length, 
      chantiersEnCours: cc.filter(c => c.statut === 'en_cours').length 
    };
  };

  const submit = () => {
    if (!form.nom) return;
    if (editId) { setClients(clients.map(c => c.id === editId ? { ...c, ...form } : c)); setEditId(null); }
    else onSubmit(form);
    setShow(false); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' });
  };

  const startEdit = (client) => { 
    setForm({ 
      nom: client.nom || '', 
      prenom: client.prenom || '', 
      entreprise: client.entreprise || '', 
      email: client.email || '', 
      telephone: client.telephone || '', 
      adresse: client.adresse || '', 
      notes: client.notes || '' 
    }); 
    setEditId(client.id); 
    setShow(true); 
  };

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
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setViewId(null)} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100'}`}>
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className={`text-2xl font-bold ${textPrimary}`}>{client.nom} {client.prenom}</h1>
            {client.entreprise && <p className={textSecondary}>{client.entreprise}</p>}
          </div>
          <button onClick={() => startEdit(client)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors" style={{background: `${couleur}20`, color: couleur}}>
            <Edit2 size={16} />
            Modifier
          </button>
        </div>

        {/* Actions rapides */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex gap-3 flex-wrap mb-4">
            {client.telephone && (
              <>
                <button onClick={() => callPhone(client.telephone)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors">
                  <Phone size={16} />
                  Appeler
                </button>
                <button onClick={() => sendWhatsApp(client.telephone, client.prenom)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              </>
            )}
            {client.adresse && (
              <button onClick={() => openGPS(client.adresse)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors">
                <MapPin size={16} />
                Itinéraire
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {client.telephone && (
              <div>
                <p className={textSecondary}>Téléphone</p>
                <p className={`font-medium ${textPrimary}`}>{client.telephone}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className={textSecondary}>Email</p>
                <p className={`font-medium ${textPrimary}`}>{client.email}</p>
              </div>
            )}
            {client.adresse && (
              <div className="col-span-2">
                <p className={textSecondary}>Adresse</p>
                <p className={`font-medium ${textPrimary}`}>{client.adresse}</p>
              </div>
            )}
          </div>
          {client.notes && (
            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <p className={`text-sm mb-2 ${textSecondary}`}>Notes internes</p>
              <p className={`text-sm p-3 rounded-xl ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-800'}`}>{client.notes}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`rounded-xl border p-4 text-center ${cardBg}`}>
            <p className="text-2xl font-bold" style={{color: couleur}}>{stats.chantiers}</p>
            <p className={`text-xs ${textSecondary}`}>Chantiers</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${cardBg}`}>
            <p className="text-2xl font-bold text-blue-500">{stats.devis}</p>
            <p className={`text-xs ${textSecondary}`}>Devis</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${cardBg}`}>
            <p className="text-2xl font-bold text-purple-500">{stats.factures}</p>
            <p className={`text-xs ${textSecondary}`}>Factures</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${cardBg}`}>
            <p className="text-2xl font-bold text-emerald-500">{stats.ca.toLocaleString()}€</p>
            <p className={`text-xs ${textSecondary}`}>CA Total</p>
          </div>
        </div>

        {/* Onglets Historique */}
        <div className={`flex gap-2 border-b pb-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {[['chantiers', '🏗️ Chantiers'], ['documents', '📄 Documents']].map(([k, v]) => (
            <button 
              key={k} 
              onClick={() => setActiveTab(k)} 
              className={`px-4 py-2 rounded-t-xl font-medium transition-colors ${
                activeTab === k 
                  ? (isDark ? 'bg-slate-800 text-white border border-slate-700 border-b-slate-800 -mb-[3px]' : 'bg-white border border-slate-200 border-b-white -mb-[3px]') 
                  : textSecondary
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {activeTab === 'chantiers' && (
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            {clientChantiers.length === 0 ? (
              <p className={`text-center py-8 ${textSecondary}`}>Aucun chantier</p>
            ) : (
              <div className="space-y-2">
                {clientChantiers.map(ch => (
                  <div 
                    key={ch.id} 
                    onClick={() => { if (setSelectedChantier) setSelectedChantier(ch.id); if (setPage) setPage('chantiers'); }} 
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <span className={`w-3 h-3 rounded-full ${ch.statut === 'en_cours' ? 'bg-emerald-500' : ch.statut === 'termine' ? 'bg-slate-400' : 'bg-blue-500'}`}></span>
                    <div className="flex-1">
                      <p className={`font-medium ${textPrimary}`}>{ch.nom}</p>
                      <p className={`text-xs ${textSecondary}`}>{ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : 'Prospect'}</p>
                    </div>
                    <ChevronRight size={18} className={textSecondary} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            {clientDevis.length === 0 ? (
              <p className={`text-center py-8 ${textSecondary}`}>Aucun document</p>
            ) : (
              <div className="space-y-2">
                {clientDevis.map(d => {
                  const statusBg = { 
                    brouillon: isDark ? 'bg-slate-700' : 'bg-slate-100', 
                    envoye: isDark ? 'bg-amber-900/50' : 'bg-amber-100', 
                    accepte: isDark ? 'bg-emerald-900/50' : 'bg-emerald-100', 
                    payee: isDark ? 'bg-emerald-900/50' : 'bg-emerald-100', 
                    refuse: isDark ? 'bg-red-900/50' : 'bg-red-100' 
                  }[d.statut] || (isDark ? 'bg-slate-700' : 'bg-slate-100');
                  const statusText = { 
                    brouillon: isDark ? 'text-slate-300' : 'text-slate-600', 
                    envoye: isDark ? 'text-amber-300' : 'text-amber-700', 
                    accepte: isDark ? 'text-emerald-300' : 'text-emerald-700', 
                    payee: isDark ? 'text-emerald-300' : 'text-emerald-700', 
                    refuse: isDark ? 'text-red-300' : 'text-red-700' 
                  }[d.statut] || (isDark ? 'text-slate-300' : 'text-slate-600');
                  const statusLabel = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', payee: 'Payée', refuse: 'Refusé' }[d.statut] || d.statut;
                  
                  return (
                    <div 
                      key={d.id} 
                      onClick={() => openDocument(d)} 
                      className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'} hover:shadow-sm`}
                    >
                      <span className="text-xl">{d.type === 'facture' ? '🧾' : '📄'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${textPrimary}`}>{d.numero}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBg} ${statusText}`}>{statusLabel}</span>
                        </div>
                        <p className={`text-xs ${textSecondary}`}>{new Date(d.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <p className="font-bold" style={{color: couleur}}>{(d.total_ttc || 0).toLocaleString()}€</p>
                      <ChevronRight size={18} className={textSecondary} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Formulaire
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEditId(null); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' }); }} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100'}`}>
          <ChevronLeft size={20} />
        </button>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouveau'} client</h1>
      </div>
      
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Nom *</label>
            <input className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Dupont" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Prénom</label>
            <input className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} placeholder="Jean" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Entreprise</label>
            <input className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} placeholder="SCI, SARL..." />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Téléphone</label>
            <input className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} placeholder="06 12 34 56 78" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Email</label>
            <input type="email" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="client@email.fr" />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Adresse</label>
            <textarea className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} rows={2} value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} placeholder="12 rue des Lilas, 75001 Paris" />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Notes internes</label>
            <textarea className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Code portail, infos utiles..." />
          </div>
        </div>
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => { setShow(false); setEditId(null); }} className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
            Annuler
          </button>
          <button onClick={submit} className="px-6 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
            {editId ? 'Enregistrer' : 'Créer le client'}
          </button>
        </div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Clients ({clients.length})</h1>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-medium transition-opacity hover:opacity-90" style={{background: couleur}}>
          <Plus size={18} />
          Nouveau
        </button>
      </div>
      
      <div className="relative max-w-md">
        <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
        <input 
          type="text" 
          placeholder="Rechercher..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`}
        />
      </div>
      
      {filtered.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
          <Users size={48} className={`mx-auto mb-4 ${textSecondary}`} />
          <p className={textSecondary}>Aucun client</p>
          <button onClick={() => setShow(true)} className="mt-4 px-4 py-2 text-white rounded-xl text-sm" style={{background: couleur}}>
            Ajouter un client
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const s = getClientStats(c.id);
            return (
              <div key={c.id} className={`rounded-2xl border p-5 transition-all hover:shadow-lg ${cardBg}`}>
                <div className="flex gap-3 mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold cursor-pointer text-lg" 
                    style={{background: couleur}} 
                    onClick={() => setViewId(c.id)}
                  >
                    {c.nom?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewId(c.id)}>
                    <h3 className={`font-semibold truncate ${textPrimary}`}>{c.nom} {c.prenom}</h3>
                    {c.entreprise && <p className={`text-sm truncate ${textSecondary}`}>{c.entreprise}</p>}
                  </div>
                  <button onClick={() => startEdit(c)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                    <Edit2 size={16} />
                  </button>
                </div>
                
                {c.telephone && (
                  <div className="flex gap-2 mb-3">
                    <button 
                      onClick={() => callPhone(c.telephone)} 
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                    >
                      <Phone size={14} />
                      {c.telephone}
                    </button>
                    <button 
                      onClick={() => sendWhatsApp(c.telephone, c.prenom)} 
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${isDark ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                )}
                
                {c.adresse && (
                  <button 
                    onClick={() => openGPS(c.adresse)} 
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium mb-3 transition-colors ${isDark ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                  >
                    <MapPin size={14} />
                    Itinéraire
                  </button>
                )}
                
                <div className={`flex gap-4 pt-3 border-t text-sm ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <span className={textSecondary}>🏗️ {s.chantiers}</span>
                  <span className={textSecondary}>📄 {s.devis}</span>
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
