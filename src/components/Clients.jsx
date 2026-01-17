import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Phone, MessageCircle, MapPin, Mail, Building2, User, Edit3, Trash2, ChevronRight, Search, X, Check, Briefcase, FileText, Camera, Home, Users, Euro, Calendar, ExternalLink, Smartphone, ArrowUpDown, Send, MessageSquare } from 'lucide-react';

export default function Clients({ clients, setClients, devis, chantiers, echanges = [], onSubmit, couleur, setPage, setSelectedChantier, setSelectedDevis, isDark, createMode, setCreateMode }) {
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
  const [sortBy, setSortBy] = useState('recent'); // recent, name, ca

  useEffect(() => { if (createMode) { setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);

  const filtered = clients.filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()) || c.entreprise?.toLowerCase().includes(search.toLowerCase()));

  const getSortedClients = () => {
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      case 'ca':
        return sorted.sort((a, b) => getClientStats(b.id).ca - getClientStats(a.id).ca);
      case 'recent':
      default:
        return sorted.sort((a, b) => parseInt(b.id) - parseInt(a.id));
    }
  };

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
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setViewId(null)} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ArrowLeft size={20} className={textPrimary} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg sm:text-2xl font-bold truncate ${textPrimary}`}>{client.nom} {client.prenom}</h1>
            {client.entreprise && <p className={`${textMuted} flex items-center gap-1`}><Building2 size={14} />{client.entreprise}</p>}
          </div>
          <button onClick={() => startEdit(client)} className="px-3 sm:px-4 py-2 text-sm rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 hover:shadow-md transition-all" style={{background: `${couleur}20`, color: couleur}}>
            <Edit3 size={14} /><span>Modifier</span>
          </button>
        </div>

        {/* Actions rapides */}
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
          <div className="flex gap-2 sm:gap-3 flex-wrap mb-4">
            {client.telephone && (
              <>
                <button onClick={() => callPhone(client.telephone)} className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs sm:text-sm min-h-[44px] transition-colors shadow-md hover:shadow-lg">
                  <Phone size={16} /><span>Appeler</span>
                </button>
                <button onClick={() => sendWhatsApp(client.telephone, client.prenom)} className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs sm:text-sm min-h-[44px] transition-colors shadow-md hover:shadow-lg">
                  <MessageCircle size={16} /><span>WhatsApp</span>
                </button>
              </>
            )}
            {client.adresse && (
              <button onClick={() => openGPS(client.adresse)} className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs sm:text-sm min-h-[44px] transition-colors shadow-md hover:shadow-lg">
                <MapPin size={16} /><span>Itinéraire</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {client.telephone && (
              <div>
                <p className={`${textMuted} flex items-center gap-1.5 mb-1`}><Phone size={14} /> Téléphone</p>
                <p className={`font-medium ${textPrimary}`}>{client.telephone}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className={`${textMuted} flex items-center gap-1.5 mb-1`}><Mail size={14} /> Email</p>
                <p className={`font-medium ${textPrimary}`}>{client.email}</p>
              </div>
            )}
            {client.adresse && (
              <div className="col-span-2">
                <p className={`${textMuted} flex items-center gap-1.5 mb-1`}><MapPin size={14} /> Adresse</p>
                <p className={`font-medium ${textPrimary}`}>{client.adresse}</p>
              </div>
            )}
          </div>
          {client.notes && (
            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : ''}`}>
              <p className={`text-sm ${textMuted} mb-2`}>Notes internes</p>
              <p className={`text-sm p-3 rounded-xl ${isDark ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>{client.notes}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div className={`${cardBg} rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center`}>
            <p className="text-lg sm:text-2xl font-bold" style={{color: couleur}}>{stats.chantiers}</p>
            <p className={`text-xs ${textMuted} flex items-center justify-center gap-1`}><Home size={12} /> Chantiers</p>
          </div>
          <div className={`${cardBg} rounded-xl border p-4 text-center`}>
            <p className="text-2xl font-bold text-blue-500">{stats.devis}</p>
            <p className={`text-xs ${textMuted} flex items-center justify-center gap-1`}><FileText size={12} /> Devis</p>
          </div>
          <div className={`${cardBg} rounded-xl border p-4 text-center`}>
            <p className="text-2xl font-bold text-purple-500">{stats.factures}</p>
            <p className={`text-xs ${textMuted} flex items-center justify-center gap-1`}><FileText size={12} /> Factures</p>
          </div>
          <div className={`${cardBg} rounded-xl border p-4 text-center`}>
            <p className="text-2xl font-bold text-emerald-500">{stats.ca.toLocaleString()}€</p>
            <p className={`text-xs ${textMuted} flex items-center justify-center gap-1`}><Euro size={12} /> CA Total</p>
          </div>
        </div>

        {/* Onglets Historique */}
        <div className={`flex gap-1 sm:gap-2 border-b pb-2 overflow-x-auto ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {[
            ['chantiers', <Home size={14} />, 'Chantiers'],
            ['documents', <FileText size={14} />, 'Documents'],
            ['echanges', <MessageSquare size={14} />, 'Échanges'],
            ['photos', <Camera size={14} />, 'Photos']
          ].map(([k, icon, label]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-3 sm:px-4 py-2 rounded-t-lg sm:rounded-t-xl text-sm font-medium whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${activeTab === k ? (isDark ? 'bg-slate-800 border border-b-slate-800 border-slate-700 text-white' : 'bg-white border border-b-white border-slate-200') + ' -mb-[3px]' : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {activeTab === 'chantiers' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {clientChantiers.length === 0 ? (
              <p className={`text-center ${textMuted} py-8`}>Aucun chantier</p>
            ) : (
              <div className="space-y-2">
                {clientChantiers.map(ch => (
                  <div key={ch.id} onClick={() => { if (setSelectedChantier) setSelectedChantier(ch.id); if (setPage) setPage('chantiers'); }} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    <span className={`w-3 h-3 rounded-full ${ch.statut === 'en_cours' ? 'bg-emerald-500' : ch.statut === 'termine' ? 'bg-slate-400' : 'bg-blue-500'}`}></span>
                    <div className="flex-1">
                      <p className={`font-medium ${textPrimary}`}>{ch.nom}</p>
                      <p className={`text-xs ${textMuted}`}>{ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : 'Prospect'}</p>
                    </div>
                    <ChevronRight size={18} className={textMuted} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {clientDevis.length === 0 ? (
              <p className={`text-center ${textMuted} py-8`}>Aucun document</p>
            ) : (
              <div className="space-y-2">
                {clientDevis.map(d => {
                  const StatusIcon = { brouillon: 'text-slate-400', envoye: 'text-blue-500', accepte: 'text-emerald-500', payee: 'text-emerald-600', refuse: 'text-red-500' }[d.statut] || 'text-slate-400';
                  return (
                    <div key={d.id} onClick={() => openDocument(d)} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <FileText size={20} className={d.type === 'facture' ? 'text-purple-500' : 'text-blue-500'} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${textPrimary}`}>{d.numero}</p>
                          <span className={`w-2 h-2 rounded-full ${StatusIcon.replace('text-', 'bg-')}`}></span>
                        </div>
                        <p className={`text-xs ${textMuted}`}>{new Date(d.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <p className="font-bold" style={{color: couleur}}>{(d.total_ttc || 0).toLocaleString()}€</p>
                      <ChevronRight size={18} className={textMuted} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'echanges' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {(() => {
              const clientEchanges = echanges.filter(e => e.client_id === cl.id).sort((a, b) => new Date(b.date) - new Date(a.date));
              if (clientEchanges.length === 0) return (
                <div className="text-center py-8">
                  <p className={`${textMuted} mb-4`}>Aucun échange enregistré</p>
                  <div className="flex justify-center gap-3">
                    <a href={`mailto:${cl.email || ''}`} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                      <Mail size={16} /> Envoyer un email
                    </a>
                    <a href={`sms:${cl.telephone?.replace(/\s/g, '')}`} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
                      <MessageCircle size={16} /> Envoyer un SMS
                    </a>
                  </div>
                </div>
              );
              return (
                <div className="space-y-3">
                  <div className="flex justify-end gap-2 mb-4">
                    <a href={`mailto:${cl.email || ''}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                      <Mail size={14} /> Email
                    </a>
                    <a href={`sms:${cl.telephone?.replace(/\s/g, '')}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      <MessageCircle size={14} /> SMS
                    </a>
                  </div>
                  {clientEchanges.map(e => (
                    <div key={e.id} className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        e.type === 'email' ? (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600') :
                        e.type === 'sms' ? (isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600') :
                        e.type === 'whatsapp' ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600') :
                        (isDark ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-500')
                      }`}>
                        {e.type === 'email' ? <Mail size={18} /> : e.type === 'whatsapp' ? <MessageCircle size={18} /> : <MessageCircle size={18} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium ${textPrimary}`}>
                            {e.type === 'email' ? 'Email' : e.type === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                            {e.document && <span className={`text-sm ${textMuted} ml-2`}>· {e.document}</span>}
                          </p>
                          <span className={`text-xs ${textMuted}`}>{new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {e.objet && <p className={`text-sm ${textSecondary} mt-1`}>{e.objet}</p>}
                        {e.montant && <p className="text-sm font-medium mt-1" style={{color: couleur}}>{e.montant.toLocaleString()}€</p>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {(() => {
              const allPhotos = clientChantiers.flatMap(ch => (ch.photos || []).map(p => ({ ...p, chantierNom: ch.nom })));
              if (allPhotos.length === 0) return <p className={`text-center ${textMuted} py-8`}>Aucune photo</p>;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {allPhotos.map(p => (
                    <div key={p.id} className="relative group">
                      <img src={p.src} className="w-full h-24 object-cover rounded-xl" alt="" />
                      <p className={`text-xs ${textMuted} mt-1 truncate`}>{p.chantierNom}</p>
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
      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => { setShow(false); setEditId(null); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '' }); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouveau'} client</h1>
      </div>
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prénom</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Entreprise</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Téléphone</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /></div>
          <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email</label><input type="email" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Adresse</label><textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div className="md:col-span-2"><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Notes internes</label><textarea className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Code portail, infos utiles..." /></div>
        </div>
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : ''}`}>
          <button onClick={() => { setShow(false); setEditId(null); }} className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
            <X size={16} />Annuler
          </button>
          <button onClick={submit} className="px-6 py-2.5 text-white rounded-xl flex items-center gap-1.5 min-h-[44px] hover:shadow-lg transition-all" style={{background: couleur}}>
            <Check size={16} />{editId ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );

  // Liste
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Clients ({clients.length})</h1>
        <button onClick={() => setShow(true)} className="px-3 sm:px-4 py-2.5 text-white rounded-xl text-sm min-h-[44px] flex items-center gap-1.5 hover:shadow-lg transition-all" style={{background: couleur}}>
          <Plus size={16} /><span className="hidden sm:inline">Nouveau</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input type="text" placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm ${inputBg}`} />
        </div>
        {clients.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className={`text-sm ${textMuted} flex items-center gap-1 whitespace-nowrap`}><ArrowUpDown size={14} /> Trier:</span>
            {[
              { key: 'recent', label: 'Recent' },
              { key: 'name', label: 'Nom' },
              { key: 'ca', label: 'CA' }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${sortBy === opt.key ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={sortBy === opt.key ? { background: couleur } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          {/* Header with gradient */}
          <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.3\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }} />

            <div className="relative">
              {/* Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
                <Users size={40} className="text-white" />
              </div>

              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>
                {search ? 'Aucun client trouvé' : 'Ajoutez votre premier client'}
              </h2>
              <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
                {search
                  ? 'Modifiez votre recherche ou ajoutez un nouveau client.'
                  : 'Gérez vos contacts clients, leur historique et facilitez vos échanges.'}
              </p>
            </div>
          </div>

          {/* Features grid */}
          {!search && (
            <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>Ce que vous pouvez faire</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <Phone size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Contact rapide</p>
                    <p className={`text-xs ${textMuted}`}>Appel, SMS, WhatsApp</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <FileText size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Historique complet</p>
                    <p className={`text-xs ${textMuted}`}>Devis, factures, chantiers</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <MapPin size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Itinéraire GPS</p>
                    <p className={`text-xs ${textMuted}`}>Navigation directe</p>
                  </div>
                </div>
              </div>

              <button onClick={() => setShow(true)} className="w-full sm:w-auto px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                <Plus size={18} />
                Ajouter mon premier client
              </button>
            </div>
          )}

          {/* Simple CTA for search empty state */}
          {search && (
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} text-center`}>
              <button onClick={() => setShow(true)} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                <Plus size={18} />
                Ajouter un client
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {getSortedClients().map(c => {
            const s = getClientStats(c.id);
            return (
              <div key={c.id} className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer group`} onClick={() => setViewId(c.id)}>
                {/* Header with gradient */}
                <div className="p-4 sm:p-5 relative" style={{background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)`}}>
                  <div className="flex gap-3 sm:gap-4">
                    <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-lg sm:text-xl font-bold shadow-lg flex-shrink-0" style={{background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`}}>
                      {c.nom?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base sm:text-lg truncate ${textPrimary}`}>{c.nom} {c.prenom}</h3>
                      {c.entreprise && (
                        <p className={`text-sm ${textMuted} truncate flex items-center gap-1`}>
                          <Building2 size={12} /> {c.entreprise}
                        </p>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(c); }} className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all absolute top-3 right-3 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white/80 text-slate-500'}`}>
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className={`px-4 sm:px-5 py-3 space-y-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  {c.telephone && (
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} className={textMuted} />
                      <span className={`text-sm ${textSecondary} flex-1`}>{c.telephone}</span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => callPhone(c.telephone)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-blue-50'}`} title="Appeler">
                          <Phone size={14} className="text-blue-500" />
                        </button>
                        <button onClick={() => sendWhatsApp(c.telephone, c.prenom)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-green-50'}`} title="WhatsApp">
                          <MessageCircle size={14} className="text-green-500" />
                        </button>
                      </div>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className={textMuted} />
                      <span className={`text-sm ${textSecondary} truncate`}>{c.email}</span>
                    </div>
                  )}
                  {c.adresse && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <MapPin size={14} className={textMuted} />
                      <span className={`text-sm ${textSecondary} flex-1 truncate`}>{c.adresse}</span>
                      <button onClick={() => openGPS(c.adresse)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-purple-50'}`} title="Itinéraire">
                        <ExternalLink size={14} className="text-purple-500" />
                      </button>
                    </div>
                  )}
                  {!c.telephone && !c.email && !c.adresse && (
                    <p className={`text-sm ${textMuted} italic`}>Aucune info de contact</p>
                  )}
                </div>

                {/* Stats footer */}
                <div className={`px-4 sm:px-5 py-3 border-t flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex gap-3">
                    <span className={`flex items-center gap-1 text-xs ${textSecondary}`} title="Chantiers">
                      <Home size={12} /> <span className="font-medium">{s.chantiers}</span>
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${textSecondary}`} title="Devis">
                      <FileText size={12} /> <span className="font-medium">{s.devis}</span>
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${textSecondary}`} title="Factures">
                      <FileText size={12} /> <span className="font-medium">{s.factures}</span>
                    </span>
                  </div>
                  <span className="font-bold text-sm" style={{color: couleur}}>{s.ca.toLocaleString()}€</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
