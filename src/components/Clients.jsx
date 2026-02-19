import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowLeft, Phone, MessageCircle, MapPin, Mail, Building2, User, Edit3, Trash2, ChevronRight, Search, X, Check, Briefcase, FileText, Camera, Home, Users, Euro, Calendar, ExternalLink, Smartphone, ArrowUpDown, Send, MessageSquare, Zap, Tag, History, Receipt, ClipboardList, CheckCircle2, Upload } from 'lucide-react';
import QuickClientModal from './QuickClientModal';
import { useConfirm, useToast } from '../context/AppContext';
import { useDebounce } from '../hooks/useDebounce';
import { useFormValidation, clientSchema } from '../lib/validation';
import FormError from './ui/FormError';
import { CLIENT_TYPE_COLORS, CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS, CLIENT_TYPES, DEVIS_EN_ATTENTE } from '../lib/constants';

export default function Clients({ clients, setClients, updateClient, deleteClient: deleteClientProp, devis, chantiers, echanges = [], onSubmit, couleur, setPage, setSelectedChantier, setSelectedDevis, isDark, createMode, setCreateMode, modeDiscret, memos = [], addMemo, updateMemo, deleteMemo, toggleMemo, onImportClients }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { errors, validateAll, clearErrors } = useFormValidation(clientSchema);

  // Format money with modeDiscret support
  const formatMoney = (n) => modeDiscret ? '·····' : (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' €';

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  const [show, setShow] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [activeTab, setActiveTab] = useState('historique');
  const [form, setForm] = useState({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '' });
  const [sortBy, setSortBy] = useState('recent'); // recent, name, ca
  const [filterCategorie, setFilterCategorie] = useState('');

  useEffect(() => { if (createMode) { setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);

  // Escape key to close modals/views
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (show) { setShow(false); setEditId(null); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '' }); clearErrors(); }
        else if (viewId) { setViewId(null); }
        else if (showQuickModal) { setShowQuickModal(false); }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, viewId, showQuickModal]);

  const filtered = clients.filter(c => {
    const matchSearch = !debouncedSearch || c.nom?.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.entreprise?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchCat = !filterCategorie || c.categorie === filterCategorie;
    return matchSearch && matchCat;
  });

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

  const clientStatsMap = useMemo(() => {
    const map = new Map();
    const empty = { devis: 0, factures: 0, ca: 0, chantiers: 0, chantiersEnCours: 0, chantiersActifs: 0, devisActifs: 0 };
    (devis || []).forEach(d => {
      const cid = d.client_id;
      if (!cid) return;
      if (!map.has(cid)) map.set(cid, { ...empty });
      const s = map.get(cid);
      if (d.type === 'devis') s.devis++;
      if (d.type === 'facture') s.factures++;
      // CA = devis signés (accepte) + factures — reflète le CA engagé
      // Pour les devis, ne compter que accepte (pas facture/acompte_facture car la facture les couvre)
      if (d.type === 'devis' && d.statut === 'accepte') {
        s.ca += d.total_ttc || 0;
      }
      // Pour les factures, compter toujours (elles remplacent le devis dans le CA)
      if (d.type === 'facture') {
        s.ca += d.total_ttc || 0;
      }
      // Devis actifs = envoyés ou acceptés (pas encore facturés/refusés)
      if (d.type === 'devis' && ['envoye', 'accepte', 'acompte_facture'].includes(d.statut)) s.devisActifs++;
    });
    (chantiers || []).forEach(ch => {
      const cid = ch.client_id || ch.clientId;
      if (!cid) return;
      if (!map.has(cid)) map.set(cid, { ...empty });
      const s = map.get(cid);
      s.chantiers++;
      if (ch.statut === 'en_cours') s.chantiersEnCours++;
      // Chantiers actifs = tout sauf archivé/abandonné/terminé
      if (ch.statut !== 'archive' && ch.statut !== 'abandonne' && ch.statut !== 'termine') s.chantiersActifs++;
    });
    return map;
  }, [devis, chantiers]);

  const getClientStats = (id) => {
    return clientStatsMap.get(id) || { devis: 0, factures: 0, ca: 0, chantiers: 0, chantiersEnCours: 0, chantiersActifs: 0, devisActifs: 0 };
  };

  // Dynamic client status based on activity
  const getClientStatus = (clientId) => {
    const s = getClientStats(clientId);
    if (s.chantiersEnCours > 0) return 'actif';
    if (s.devisActifs > 0) return 'en_devis';
    // Check if client was created recently (< 90 days)
    const client = clients.find(c => c.id === clientId);
    if (client?.created_at) {
      const daysSinceCreation = (Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 90 && s.chantiers === 0 && s.devis === 0) return 'prospect';
    }
    if (s.chantiersActifs > 0 || s.devisActifs > 0) return 'actif';
    return 'inactif';
  };

  const submit = async () => {
    // Trim all string fields before validation and save
    const trimmedForm = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    setForm(trimmedForm);

    if (!validateAll(trimmedForm)) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }
    const wasEditing = editId;
    try {
      if (editId) {
        // Use updateClient which syncs to Supabase
        if (updateClient) {
          await updateClient(editId, trimmedForm);
        } else {
          // Fallback to direct state update if updateClient not provided
          setClients(clients.map(c => c.id === editId ? { ...c, ...trimmedForm } : c));
        }
      } else {
        onSubmit(trimmedForm);
      }
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Erreur lors de la sauvegarde du client', 'error');
      return; // Don't close form on error so user can retry
    }
    setShow(false);
    setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '' });
    clearErrors();
    showToast(wasEditing ? 'Client modifié avec succès' : 'Client créé avec succès', 'success');
    // Return to detail view if we were editing
    if (wasEditing) {
      setViewId(wasEditing);
    }
    setEditId(null);
  };

  const startEdit = (client) => {
    setForm({ nom: client.nom || '', prenom: client.prenom || '', entreprise: client.entreprise || '', email: client.email || '', telephone: client.telephone || '', adresse: client.adresse || '', notes: client.notes || '', categorie: client.categorie || '' });
    clearErrors();
    setEditId(client.id);
    setViewId(null); // Close detail view to show edit form
    setShow(true);
  };
  const openGPS = (adresse) => { if (!adresse) return; window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`, '_blank'); };
  const callPhone = (tel) => { if (!tel) return; window.location.href = `tel:${tel.replace(/\s/g, '')}`; };
  const sendWhatsApp = (tel, nom) => { if (!tel) return; const phone = tel.replace(/\s/g, '').replace(/^0/, '33'); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour ${nom || ''},`)}`, '_blank'); };
  const handleDeleteClient = async (id) => {
    const client = clients.find(c => c.id === id);
    const stats = getClientStats(id);
    const hasData = stats.chantiers > 0 || stats.devis > 0 || stats.factures > 0;
    const message = hasData
      ? `Supprimer ${client?.nom || 'ce client'} ? Ce client a ${stats.chantiers} chantier(s) et ${stats.devis + stats.factures} document(s) associés. Cette action est irréversible.`
      : `Supprimer ${client?.nom || 'ce client'} ? Cette action est irréversible.`;
    const confirmed = await confirm({ title: 'Supprimer le client', message });
    if (confirmed) {
      if (deleteClientProp) {
        await deleteClientProp(id);
      } else {
        setClients(clients.filter(c => c.id !== id));
      }
      setViewId(null);
      showToast('Client supprimé', 'success');
    }
  };

  // Quick client creation handler
  const handleQuickSubmit = (data) => {
    onSubmit(data);
    setShowQuickModal(false);
  };

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
            <h2 className={`text-lg sm:text-2xl font-bold ${textPrimary}`}>{client.nom} {client.prenom}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {client.entreprise && <span className={`${textMuted} flex items-center gap-1 text-sm`}><Building2 size={14} />{client.entreprise}</span>}
              {client.categorie && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}><Tag size={10} />{client.categorie}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => startEdit(client)} className="px-3 sm:px-4 py-2 text-sm rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 hover:shadow-md transition-all" style={{background: `${couleur}20`, color: couleur}}>
              <Edit3 size={14} /><span>Modifier</span>
            </button>
            <button onClick={() => handleDeleteClient(client.id)} className={`p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-all ${isDark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`} title="Supprimer ce client">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Actions rapides */}
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
          {/* Boutons d'action - affichés uniquement si téléphone ou adresse */}
          {(client.telephone || client.adresse) && (
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
          )}

          {/* Informations client avec placeholders */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className={`${textMuted} flex items-center gap-1.5 mb-1`}><Phone size={14} /> Téléphone</p>
              {client.telephone ? (
                <p className={`font-medium ${textPrimary}`}>{client.telephone}</p>
              ) : (
                <button onClick={() => startEdit(client)} className={`text-sm italic ${isDark ? 'text-slate-500 hover:text-slate-400' : 'text-slate-500 hover:text-slate-600'} hover:underline`}>
                  + Ajouter un téléphone
                </button>
              )}
            </div>
            <div>
              <p className={`${textMuted} flex items-center gap-1.5 mb-1`}><Mail size={14} /> Email</p>
              {client.email ? (
                <p className={`font-medium ${textPrimary}`}>{client.email}</p>
              ) : (
                <button onClick={() => startEdit(client)} className={`text-sm italic ${isDark ? 'text-slate-500 hover:text-slate-400' : 'text-slate-500 hover:text-slate-600'} hover:underline`}>
                  + Ajouter un email
                </button>
              )}
            </div>
            <div className="col-span-2">
              <p className={`${textMuted} flex items-center gap-1.5 mb-1`}><MapPin size={14} /> Adresse</p>
              {client.adresse ? (
                <p className={`font-medium ${textPrimary} whitespace-pre-line`}>{client.adresse}</p>
              ) : (
                <button onClick={() => startEdit(client)} className={`text-sm italic ${isDark ? 'text-slate-500 hover:text-slate-400' : 'text-slate-500 hover:text-slate-600'} hover:underline`}>
                  + Ajouter une adresse
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <p className={`text-sm ${textMuted} mb-2`}>Notes internes</p>
            {client.notes ? (
              <p className={`text-sm p-3 rounded-xl ${isDark ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>{client.notes}</p>
            ) : (
              <button onClick={() => startEdit(client)} className={`text-sm italic ${isDark ? 'text-slate-500 hover:text-slate-400' : 'text-slate-500 hover:text-slate-600'} hover:underline`}>
                + Ajouter des notes
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div className={`${cardBg} rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center shadow-sm`}>
            <p className={`text-lg sm:text-2xl font-bold ${stats.chantiers === 0 ? (isDark ? 'text-slate-400' : 'text-slate-500') : ''}`} style={stats.chantiers > 0 ? {color: couleur} : {}}>{stats.chantiers}</p>
            <p className={`text-xs ${textMuted} flex items-center justify-center gap-1`}><Home size={12} /> Chantiers</p>
          </div>
          <div className={`${cardBg} rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center shadow-sm`}>
            <p className={`text-lg sm:text-2xl font-bold ${stats.devis === 0 ? (isDark ? 'text-slate-400' : 'text-slate-500') : 'text-blue-500'}`}>{stats.devis}</p>
            <p className={`text-xs ${textMuted} flex items-center justify-center gap-1`}><FileText size={12} /> Devis</p>
          </div>
          <div className={`${cardBg} rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center shadow-sm`}>
            <p className={`text-lg sm:text-2xl font-bold ${stats.factures === 0 ? (isDark ? 'text-slate-400' : 'text-slate-500') : 'text-purple-500'}`}>{stats.factures}</p>
            <p className={`text-xs ${textMuted} flex items-center justify-center gap-1`}><FileText size={12} /> Factures</p>
          </div>
          <div className={`${cardBg} rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center shadow-sm`}>
            <p className={`text-lg sm:text-2xl font-bold ${stats.ca === 0 ? (isDark ? 'text-slate-400' : 'text-slate-500') : 'text-emerald-500'}`}>{formatMoney(stats.ca)}</p>
            <p className={`text-xs ${textMuted} flex items-center justify-center gap-1`}><Euro size={12} /> CA Total</p>
          </div>
        </div>

        {/* Onglets Historique */}
        <div className={`flex gap-1 sm:gap-2 border-b pb-2 overflow-x-auto ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {[
            ['historique', <History size={14} />, 'Historique'],
            ['chantiers', <Home size={14} />, 'Chantiers'],
            ['documents', <FileText size={14} />, 'Documents'],
            ['echanges', <MessageSquare size={14} />, 'Échanges'],
            ['photos', <Camera size={14} />, 'Photos'],
            ['memos', <ClipboardList size={14} />, 'Mémos']
          ].map(([k, icon, label]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-3 sm:px-4 py-2.5 rounded-t-lg sm:rounded-t-xl text-sm font-medium whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${activeTab === k ? (isDark ? 'bg-slate-800 border border-b-slate-800 border-slate-700 text-white' : 'bg-white border border-b-white border-slate-200') + ' -mb-[3px]' : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {activeTab === 'historique' && (() => {
          const timeline = [];
          // Devis
          clientDevis.filter(d => d.type === 'devis').forEach(d => timeline.push({
            id: `d-${d.id}`, date: d.date, type: 'devis', icon: FileText,
            label: `Devis ${d.numero || '#'}`, statut: d.statut,
            montant: d.total_ttc || d.total_ht || 0,
            color: '#f97316', onClick: () => { setSelectedDevis?.(d); setPage?.('devis'); }
          }));
          // Factures
          clientDevis.filter(d => d.type === 'facture').forEach(f => timeline.push({
            id: `f-${f.id}`, date: f.date, type: 'facture', icon: Receipt,
            label: `Facture ${f.numero || '#'}`, statut: f.statut,
            montant: f.total_ttc || f.total_ht || 0,
            color: '#8b5cf6', onClick: () => { setSelectedDevis?.(f); setPage?.('devis'); }
          }));
          // Chantiers
          clientChantiers.forEach(c => timeline.push({
            id: `c-${c.id}`, date: c.date_debut || c.created_at, type: 'chantier', icon: Building2,
            label: c.nom, statut: c.statut,
            color: '#22c55e', onClick: () => { setSelectedChantier?.(c.id); setPage?.('chantiers'); }
          }));
          timeline.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

          const statusLabel = (s) => ({ brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé', payee: 'Payée', en_cours: 'En cours', termine: 'Terminé', prospect: 'Prospect' }[s] || s || '');
          const statusColor = (s) => ({ accepte: 'text-emerald-500', payee: 'text-emerald-500', termine: 'text-emerald-500', refuse: 'text-red-500', envoye: 'text-blue-500', en_cours: 'text-amber-500' }[s] || textMuted);

          return (
            <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
              {timeline.length === 0 ? (
                <div className="text-center py-10">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <History size={28} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                  </div>
                  <p className={`font-medium ${textPrimary}`}>Aucun historique</p>
                  <p className={`text-sm ${textMuted}`}>Les devis, factures et chantiers apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {timeline.map(item => (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15` }}>
                        <item.icon size={16} style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${textPrimary}`}>{item.label}</p>
                        <p className={`text-xs ${textMuted}`}>
                          {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}
                          {item.montant ? ` • ${formatMoney(item.montant)}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-medium ${statusColor(item.statut)}`}>{statusLabel(item.statut)}</span>
                      <ChevronRight size={14} className={textMuted} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'chantiers' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {clientChantiers.length === 0 ? (
              <div className="text-center py-10">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <Home size={28} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                </div>
                <p className={`font-medium ${textPrimary} mb-1`}>Aucun chantier</p>
                <p className={`text-sm ${textMuted} mb-5`}>Créez votre premier chantier pour ce client</p>
                <button
                  onClick={() => {
                    localStorage.setItem('cp_new_chantier_client', client.id);
                    setPage?.('chantiers');
                    setCreateMode?.(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: couleur, color: 'white' }}
                >
                  <Plus size={18} /> Nouveau chantier
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('cp_new_chantier_client', client.id);
                      setPage?.('chantiers');
                      setCreateMode?.(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                    style={{ background: `${couleur}15`, color: couleur }}
                  >
                    <Home size={14} /> Nouveau chantier
                  </button>
                </div>
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
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {clientDevis.length === 0 ? (
              <div className="text-center py-10">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <FileText size={28} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                </div>
                <p className={`font-medium ${textPrimary} mb-1`}>Aucun document</p>
                <p className={`text-sm ${textMuted} mb-5`}>Créez un devis ou une facture pour ce client</p>
                <button
                  onClick={() => {
                    localStorage.setItem('cp_new_devis_client', client.id);
                    setPage?.('devis');
                    setCreateMode?.(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: couleur, color: 'white' }}
                >
                  <Plus size={18} /> Nouveau devis
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('cp_new_devis_client', client.id);
                      setPage?.('devis');
                      setCreateMode?.(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                    style={{ background: `${couleur}15`, color: couleur }}
                  >
                    <FileText size={14} /> Nouveau devis
                  </button>
                </div>
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
                        <p className={`font-bold ${(d.total_ttc || 0) === 0 ? (isDark ? 'text-slate-400' : 'text-slate-500') : ''}`} style={(d.total_ttc || 0) > 0 ? {color: couleur} : {}}>{formatMoney(d.total_ttc)}</p>
                        <ChevronRight size={18} className={textMuted} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'echanges' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {(() => {
              const clientEchanges = echanges.filter(e => e.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
              if (clientEchanges.length === 0) return (
                <div className="text-center py-10">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <MessageSquare size={28} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                  </div>
                  <p className={`font-medium ${textPrimary} mb-1`}>Aucun échange</p>
                  <p className={`text-sm ${textMuted} mb-5`}>Commencez une conversation avec ce client</p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    {client.email && (
                      <a href={`mailto:${client.email}`} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                        <Mail size={16} /> Email
                      </a>
                    )}
                    {client.telephone && (
                      <>
                        <a href={`sms:${client.telephone.replace(/\s/g, '')}`} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          <MessageCircle size={16} /> SMS
                        </a>
                        <a href={`https://wa.me/${client.telephone.replace(/\s/g, '').replace(/^0/, '33')}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                          <MessageCircle size={16} /> WhatsApp
                        </a>
                      </>
                    )}
                    {!client.email && !client.telephone && (
                      <p className={`text-sm ${textMuted}`}>Ajoutez un email ou téléphone pour contacter ce client</p>
                    )}
                  </div>
                </div>
              );
              return (
                <div className="space-y-3">
                  <div className="flex justify-end gap-2 mb-4">
                    <a href={`mailto:${client.email || ''}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                      <Mail size={14} /> Email
                    </a>
                    <a href={`sms:${client.telephone?.replace(/\s/g, '')}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
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
                        {e.montant && <p className="text-sm font-medium mt-1" style={{color: couleur}}>{formatMoney(e.montant)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'memos' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {(() => {
              const clientMemos = memos.filter(m => m.client_id === client.id);
              const activeMemos = clientMemos.filter(m => !m.is_done);
              const doneMemos = clientMemos.filter(m => m.is_done);
              return (
                <div className="space-y-3">
                  {/* Quick add */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id={`memo-client-${client.id}`}
                      placeholder="Nouveau mémo pour ce client..."
                      className={`flex-1 px-3 py-2 border rounded-xl text-sm ${inputBg}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          addMemo?.({ text: e.target.value.trim(), client_id: client.id });
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`memo-client-${client.id}`);
                        if (input?.value.trim()) {
                          addMemo?.({ text: input.value.trim(), client_id: client.id });
                          input.value = '';
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-white text-sm font-medium"
                      style={{ backgroundColor: couleur }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Active memos */}
                  {activeMemos.length > 0 && (
                    <div className="space-y-1">
                      {activeMemos.map(m => (
                        <div key={m.id} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                          <button
                            onClick={() => toggleMemo?.(m.id)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 ${isDark ? 'border-slate-500' : 'border-slate-300'}`}
                            aria-label="Marquer comme fait"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${textPrimary}`}>{m.text}</p>
                            {m.due_date && (
                              <span className={`text-xs ${m.due_date < new Date().toISOString().split('T')[0] ? 'text-red-500' : textMuted}`}>
                                {new Date(m.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Done memos */}
                  {doneMemos.length > 0 && (
                    <details className={`text-sm ${textMuted}`}>
                      <summary className="cursor-pointer py-1 font-medium">Terminés ({doneMemos.length})</summary>
                      <div className="space-y-1 mt-1">
                        {doneMemos.map(m => (
                          <div key={m.id} className="flex items-center gap-2.5 px-3 py-1.5 opacity-60">
                            <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                            <span className="line-through text-sm">{m.text}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {clientMemos.length === 0 && (
                    <div className="text-center py-8">
                      <ClipboardList size={28} className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                      <p className={textMuted}>Aucun mémo pour ce client</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-3 sm:p-5`}>
            {(() => {
              const allPhotos = clientChantiers.flatMap(ch => (ch.photos || []).map(p => ({ ...p, chantierNom: ch.nom, chantierId: ch.id })));
              if (allPhotos.length === 0) return (
                <div className="text-center py-10">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <Camera size={28} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                  </div>
                  <p className={`font-medium ${textPrimary} mb-1`}>Aucune photo</p>
                  {clientChantiers.length > 0 ? (
                    <>
                      <p className={`text-sm ${textMuted} mb-5`}>Documentez vos chantiers avec des photos</p>
                      <button
                        onClick={() => {
                          if (setSelectedChantier) setSelectedChantier(clientChantiers[0].id);
                          if (setPage) setPage('chantiers');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: couleur, color: 'white' }}
                      >
                        <Plus size={18} /> Ajouter une photo
                      </button>
                    </>
                  ) : (
                    <p className={`text-sm ${textMuted}`}>Créez d'abord un chantier pour ajouter des photos</p>
                  )}
                </div>
              );
              return (
                <div className="space-y-3">
                  {clientChantiers.length > 0 && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => {
                          if (setSelectedChantier) setSelectedChantier(clientChantiers[0].id);
                          if (setPage) setPage('chantiers');
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                        style={{ background: `${couleur}15`, color: couleur }}
                      >
                        <Camera size={14} /> Ajouter une photo
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {allPhotos.map(p => (
                      <div key={p.id} className="relative group cursor-pointer" onClick={() => { if (setSelectedChantier && p.chantierId) { setSelectedChantier(p.chantierId); setPage?.('chantiers'); } }}>
                        <img src={p.src} className="w-full h-24 object-cover rounded-xl" alt={`Photo du chantier ${p.chantierNom}`} />
                        <p className={`text-xs ${textMuted} mt-1 truncate`}>{p.chantierNom}</p>
                      </div>
                    ))}
                  </div>
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
        <button onClick={() => { setShow(false); setEditId(null); setForm({ nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '' }); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h2 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouveau'} client</h2>
      </div>
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div><label htmlFor="client-nom" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label><input id="client-nom" aria-required="true" aria-invalid={!!errors.nom} aria-describedby={errors.nom ? 'client-nom-error' : undefined} className={`w-full px-4 py-2.5 border rounded-xl ${inputBg} ${errors.nom ? 'border-red-500' : ''}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} /><FormError id="client-nom-error" message={errors.nom} /></div>
          <div><label htmlFor="client-prenom" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prénom</label><input id="client-prenom" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prenom} onChange={e => setForm(p => ({...p, prenom: e.target.value}))} /></div>
          <div><label htmlFor="client-entreprise" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Entreprise</label><input id="client-entreprise" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.entreprise} onChange={e => setForm(p => ({...p, entreprise: e.target.value}))} /></div>
          <div><label htmlFor="client-telephone" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Téléphone</label><input id="client-telephone" aria-invalid={!!errors.telephone} aria-describedby={errors.telephone ? 'client-telephone-error' : undefined} className={`w-full px-4 py-2.5 border rounded-xl ${inputBg} ${errors.telephone ? 'border-red-500' : ''}`} value={form.telephone} onChange={e => setForm(p => ({...p, telephone: e.target.value}))} /><FormError id="client-telephone-error" message={errors.telephone} /></div>
          <div><label htmlFor="client-email" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email</label><input id="client-email" type="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'client-email-error' : undefined} className={`w-full px-4 py-2.5 border rounded-xl ${inputBg} ${errors.email ? 'border-red-500' : ''}`} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /><FormError id="client-email-error" message={errors.email} /></div>
          <div><label htmlFor="client-categorie" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Catégorie</label><select id="client-categorie" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}><option value="">— Sélectionner —</option><option value="Particulier">Particulier</option><option value="Professionnel">Professionnel</option><option value="Syndic">Syndic</option><option value="Architecte">Architecte</option><option value="Promoteur">Promoteur</option><option value="Collectivité">Collectivité</option></select></div>
          <div className="sm:col-span-2"><label htmlFor="client-adresse" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Adresse</label><textarea id="client-adresse" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} /></div>
          <div className="sm:col-span-2"><label htmlFor="client-notes" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Notes internes</label><textarea id="client-notes" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Code portail, infos utiles..." /></div>
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
      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        onSubmit={handleQuickSubmit}
        isDark={isDark}
        couleur={couleur}
      />

      {/* KPI Cards */}
      {clients.length > 0 && (() => {
        const totalCA = Array.from(clientStatsMap.values()).reduce((s, v) => s + v.ca, 0);
        const clientsActifs = Array.from(clientStatsMap.values()).filter(v => v.chantiersActifs > 0 || v.devisActifs > 0).length;
        const devisEnAttente = (devis || []).filter(d => d.type === 'devis' && d.statut === 'envoye').length;
        let topClient = null;
        let topCA = 0;
        clientStatsMap.forEach((v, cid) => {
          if (v.ca > topCA) { topCA = v.ca; topClient = clients.find(c => c.id === cid); }
        });
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className={`${cardBg} rounded-xl border p-3 sm:p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${couleur}20` }}>
                  <Users size={16} style={{ color: couleur }} />
                </div>
              </div>
              <p className={`text-lg sm:text-xl font-bold ${textPrimary}`}>{clientsActifs}</p>
              <p className={`text-xs ${textMuted}`}>Clients actifs</p>
            </div>
            <div className={`${cardBg} rounded-xl border p-3 sm:p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                  <Euro size={16} className="text-emerald-500" />
                </div>
              </div>
              <p className={`text-lg sm:text-xl font-bold text-emerald-500`}>{formatMoney(totalCA)}</p>
              <p className={`text-xs ${textMuted}`}>CA total</p>
            </div>
            <div className={`${cardBg} rounded-xl border p-3 sm:p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10">
                  <Briefcase size={16} className="text-purple-500" />
                </div>
              </div>
              <p className={`text-lg sm:text-xl font-bold text-purple-500 truncate`}>{modeDiscret ? '·····' : (topClient?.nom || '—')}</p>
              <p className={`text-xs ${textMuted}`}>Top client</p>
            </div>
            <div className={`${cardBg} rounded-xl border p-3 sm:p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10">
                  <Send size={16} className="text-blue-500" />
                </div>
              </div>
              <p className={`text-lg sm:text-xl font-bold text-blue-500`}>{devisEnAttente}</p>
              <p className={`text-xs ${textMuted}`}>Devis en attente</p>
            </div>
          </div>
        );
      })()}

      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Clients ({clients.length})</h1>
        </div>
        <div className="flex items-center gap-2">
          {onImportClients && (
            <button
              onClick={onImportClients}
              className={`w-11 h-11 sm:w-auto sm:h-11 sm:px-4 rounded-xl text-sm flex items-center justify-center sm:gap-2 transition-all border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              title="Importer des clients (CSV)"
            >
              <Upload size={16} /><span className="hidden sm:inline">Importer</span>
            </button>
          )}
          <button
            onClick={() => setShowQuickModal(true)}
            className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 rounded-xl text-sm flex items-center justify-center sm:gap-2 hover:shadow-lg transition-all"
            style={{background: `${couleur}20`, color: couleur}}
            title="Ajout rapide"
          >
            <Zap size={16} /><span className="hidden sm:inline">Ajout rapide</span>
          </button>
          <button onClick={() => setShow(true)} className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl text-sm flex items-center justify-center sm:gap-2 hover:shadow-lg transition-all" style={{background: couleur}}>
            <Plus size={16} /><span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input type="text" placeholder="Rechercher un client..." aria-label="Rechercher un client" value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm ${inputBg}`} />
        </div>
        {clients.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
            <select
              value={filterCategorie}
              onChange={e => setFilterCategorie(e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${inputBg}`}
            >
              <option value="">Tous</option>
              <option value="Particulier">Particulier</option>
              <option value="Professionnel">Professionnel</option>
              <option value="Syndic">Syndic</option>
              <option value="Architecte">Architecte</option>
              <option value="Promoteur">Promoteur</option>
              <option value="Collectivité">Collectivité</option>
            </select>
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

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => setShowQuickModal(true)} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                  <Zap size={18} />
                  Ajout rapide
                </button>
                <button onClick={() => setShow(true)} className={`px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all font-medium ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  <Plus size={18} />
                  Formulaire complet
                </button>
              </div>
            </div>
          )}

          {/* Simple CTA for search empty state */}
          {search && (
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} text-center`}>
              <button onClick={() => setShowQuickModal(true)} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
                <Zap size={18} />
                Ajout rapide
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {getSortedClients().map(c => {
            const s = getClientStats(c.id);
            return (
              <div key={c.id} className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-orange-200 dark:hover:border-orange-700 transition-all duration-200 cursor-pointer group flex flex-col h-full`} onClick={() => setViewId(c.id)}>
                {/* Header with gradient */}
                <div className="p-4 sm:p-5 relative" style={{background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)`}}>
                  <div className="flex gap-3 sm:gap-4">
                    <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-lg flex-shrink-0" style={{background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)`}}>
                      {c.prenom ? `${c.nom?.[0] || ''}${c.prenom[0]}`.toUpperCase() : (c.nom?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base sm:text-lg ${textPrimary}`}>{c.nom} {c.prenom}</h3>
                      {c.entreprise && (
                        <p className={`text-sm ${textMuted} truncate flex items-center gap-1`}>
                          <Building2 size={12} /> {c.entreprise}
                        </p>
                      )}
                      {c.categorie && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          <Tag size={10} /> {c.categorie}
                        </span>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(c); }} title="Modifier ce client" aria-label="Modifier ce client" className={`p-2.5 rounded-lg transition-all absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center sm:opacity-60 sm:hover:opacity-100 sm:group-hover:opacity-100 ${isDark ? 'bg-slate-700/90 hover:bg-slate-600 text-slate-200 hover:text-white' : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 shadow-sm hover:shadow-md'}`}>
                      <Edit3 size={18} />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className={`px-4 sm:px-5 py-3 space-y-2 border-t flex-grow ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  {c.telephone && (
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} className={textMuted} />
                      <span className={`text-sm ${textSecondary} flex-1`}>{c.telephone}</span>
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => callPhone(c.telephone)} aria-label="Appeler le client" className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'bg-slate-700 hover:bg-blue-900/50' : 'bg-blue-50 hover:bg-blue-100'}`} title="Appeler">
                          <Phone size={18} className="text-blue-500" />
                        </button>
                        <button onClick={() => sendWhatsApp(c.telephone, c.prenom)} aria-label="Contacter par WhatsApp" className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'bg-slate-700 hover:bg-green-900/50' : 'bg-green-50 hover:bg-green-100'}`} title="WhatsApp">
                          <MessageCircle size={18} className="text-green-500" />
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
                      <span className={`text-sm ${textSecondary} flex-1 truncate whitespace-pre-line`}>{c.adresse}</span>
                      <button onClick={() => openGPS(c.adresse)} aria-label="Ouvrir dans Google Maps" className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${isDark ? 'bg-slate-700 hover:bg-purple-900/50' : 'bg-purple-50 hover:bg-purple-100'}`} title="Voir sur Google Maps">
                        <ExternalLink size={18} className="text-purple-500" />
                      </button>
                    </div>
                  )}
                  {!c.telephone && !c.email && !c.adresse && (
                    <p className={`text-sm ${textMuted} italic`}>Aucune info de contact</p>
                  )}
                </div>

                {/* Stats footer */}
                <div className={`px-4 sm:px-5 py-3 border-t flex items-center justify-between mt-auto ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex gap-4">
                    <span className={`flex items-center gap-1.5 text-sm ${s.chantiers > 0 ? textSecondary : textMuted}`} title="Chantiers">
                      <Home size={14} className={s.chantiers > 0 ? 'text-emerald-500' : ''} /> <span className="font-medium">{s.chantiers}</span>
                    </span>
                    <span className={`flex items-center gap-1.5 text-sm ${s.devis > 0 ? textSecondary : textMuted}`} title="Devis">
                      <FileText size={14} className={s.devis > 0 ? 'text-blue-500' : ''} /> <span className="font-medium">{s.devis}</span>
                    </span>
                    <span className={`flex items-center gap-1.5 text-sm ${s.factures > 0 ? textSecondary : textMuted}`} title="Factures">
                      <FileText size={14} className={s.factures > 0 ? 'text-purple-500' : ''} /> <span className="font-medium">{s.factures}</span>
                    </span>
                  </div>
                  <span className={`font-bold text-sm ${s.ca === 0 ? (isDark ? 'text-slate-400' : 'text-slate-500') : ''}`} style={s.ca > 0 ? {color: couleur} : {}} title={s.ca > 0 && !modeDiscret ? `CA total: ${s.ca.toLocaleString('fr-FR')} €` : ''}>{formatMoney(s.ca)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
