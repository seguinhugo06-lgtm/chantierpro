import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowLeft, Phone, MessageCircle, MapPin, Mail, Building2, User, Edit3, Trash2, ChevronRight, Search, X, Check, Briefcase, FileText, Camera, Home, Users, Euro, Calendar, ExternalLink, Smartphone, ArrowUpDown, Send, MessageSquare, Zap, Tag, History, Receipt, ClipboardList, CheckCircle2, Upload, LayoutGrid, List, AlertTriangle, Info, Clock, Mic } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState('recent'); // recent, name, ca, activite
  const [filterCategorie, setFilterCategorie] = useState('');
  const [kpiFilter, setKpiFilter] = useState(null); // null | 'actifs' | 'ca' | 'devis_attente'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

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
    const q = debouncedSearch?.toLowerCase() || '';
    const matchSearch = !q ||
      c.nom?.toLowerCase().includes(q) ||
      c.prenom?.toLowerCase().includes(q) ||
      c.entreprise?.toLowerCase().includes(q) ||
      c.telephone?.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
      c.email?.toLowerCase().includes(q) ||
      c.adresse?.toLowerCase().includes(q);
    const matchCat = !filterCategorie || c.categorie === filterCategorie;
    // KPI filter
    let matchKpi = true;
    if (kpiFilter === 'actifs') {
      matchKpi = getClientStatus(c.id) === 'actif';
    } else if (kpiFilter === 'ca') {
      matchKpi = getClientStats(c.id).ca > 0;
    } else if (kpiFilter === 'devis_attente') {
      matchKpi = getClientStats(c.id).devisActifs > 0;
    }
    return matchSearch && matchCat && matchKpi;
  });

  // Get last activity date for a client (for sorting)
  const getLastActivity = (clientId) => {
    let latest = 0;
    (devis || []).forEach(d => {
      if (d.client_id === clientId && d.created_at) {
        const t = new Date(d.created_at).getTime();
        if (t > latest) latest = t;
      }
    });
    (chantiers || []).forEach(ch => {
      if (ch.client_id === clientId && ch.created_at) {
        const t = new Date(ch.created_at).getTime();
        if (t > latest) latest = t;
      }
    });
    return latest;
  };

  const getSortedClients = () => {
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      case 'ca':
        return sorted.sort((a, b) => getClientStats(b.id).ca - getClientStats(a.id).ca);
      case 'activite':
        return sorted.sort((a, b) => getLastActivity(b.id) - getLastActivity(a.id));
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

    const clientStatus = getClientStatus(client.id);
    const clientStatusColor = CLIENT_STATUS_COLORS[clientStatus];
    const clientTypeColor = CLIENT_TYPE_COLORS[client.categorie];

    return (
      <div className="space-y-4">
        {/* Sticky Header */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-3 backdrop-blur-md ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setViewId(null)} className={`p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <ArrowLeft size={20} className={textPrimary} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className={`text-lg sm:text-xl font-bold ${textPrimary} leading-tight`}>{client.nom} {client.prenom}</h2>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {client.entreprise && <span className={`${textMuted} flex items-center gap-1 text-xs`}><Building2 size={12} />{client.entreprise}</span>}
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? clientStatusColor.darkBg + ' ' + clientStatusColor.darkText : clientStatusColor.bg + ' ' + clientStatusColor.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${clientStatusColor.dot}`} />
                  {CLIENT_STATUS_LABELS[clientStatus]}
                </span>
                {/* Type badge */}
                {client.categorie && clientTypeColor && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? clientTypeColor.darkBg + ' ' + clientTypeColor.darkText : clientTypeColor.bg + ' ' + clientTypeColor.text}`}>
                    {client.categorie}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => startEdit(client)} className="px-3 py-2 text-sm rounded-xl min-h-[40px] flex items-center justify-center gap-1.5 hover:shadow-md transition-all" style={{ background: `${couleur}15`, color: couleur }}>
                <Edit3 size={14} /><span className="hidden sm:inline">Modifier</span>
              </button>
              <button onClick={() => handleDeleteClient(client.id)} className={`p-2 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center transition-all ${isDark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`} title="Supprimer">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Zone Contact — above the fold */}
        <div className={`${cardBg} rounded-xl border p-4`}>
          {/* 3 action buttons */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            {/* GPS first on mobile via order */}
            <button
              onClick={() => client.adresse ? openGPS(client.adresse) : startEdit(client)}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 rounded-xl min-h-[44px] transition-all text-white shadow-md hover:shadow-lg order-first sm:order-last ${!client.adresse ? 'opacity-50' : ''}`}
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              <MapPin size={20} />
              <span className="text-xs font-medium">Itinéraire</span>
            </button>
            <button
              onClick={() => client.telephone ? callPhone(client.telephone) : startEdit(client)}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 rounded-xl min-h-[44px] transition-all text-white shadow-md hover:shadow-lg ${!client.telephone ? 'opacity-50' : ''}`}
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
            >
              <Phone size={20} />
              <span className="text-xs font-medium">Appeler</span>
            </button>
            <button
              onClick={() => client.telephone ? sendWhatsApp(client.telephone, client.prenom) : startEdit(client)}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 rounded-xl min-h-[44px] transition-all text-white shadow-md hover:shadow-lg ${!client.telephone ? 'opacity-50' : ''}`}
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              <MessageCircle size={20} />
              <span className="text-xs font-medium">WhatsApp</span>
            </button>
          </div>

          {/* Contact info */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Phone size={14} className={textMuted} />
              {client.telephone ? (
                <a href={`tel:${client.telephone.replace(/\s/g, '')}`} className={`text-sm font-medium ${textPrimary} hover:underline`}>{client.telephone}</a>
              ) : (
                <button onClick={() => startEdit(client)} className={`text-sm italic ${textMuted} hover:underline`}>+ Ajouter un téléphone</button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <Mail size={14} className={textMuted} />
              {client.email ? (
                <a href={`mailto:${client.email}`} className={`text-sm font-medium ${textPrimary} hover:underline truncate`}>{client.email}</a>
              ) : (
                <button onClick={() => startEdit(client)} className={`text-sm italic ${textMuted} hover:underline`}>+ Ajouter un email</button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin size={14} className={textMuted} />
              {client.adresse ? (
                <p className={`text-sm ${textPrimary} flex-1`}>{client.adresse}</p>
              ) : (
                <button onClick={() => startEdit(client)} className={`text-sm italic ${textMuted} hover:underline`}>+ Ajouter une adresse</button>
              )}
            </div>
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

      {/* KPI Cards - Clickable */}
      {clients.length > 0 && (() => {
        const totalCA = Array.from(clientStatsMap.values()).reduce((s, v) => s + v.ca, 0);
        const caFacture = (devis || []).filter(d => d.type === 'facture' && d.statut === 'payee').reduce((s, d) => s + (d.montant_ttc || 0), 0);
        const caDevis = totalCA - caFacture;
        const clientsActifs = clients.filter(c => getClientStatus(c.id) === 'actif').length;
        const devisEnAttente = (devis || []).filter(d => d.type === 'devis' && (d.statut === 'envoye' || d.statut === 'vu')).length;
        let topClient = null;
        let topCA = 0;
        clientStatsMap.forEach((v, cid) => {
          if (v.ca > topCA) { topCA = v.ca; topClient = clients.find(c => c.id === cid); }
        });

        const kpiItems = [
          { key: 'actifs', icon: Users, color: couleur, iconBg: `${couleur}15`, value: clientsActifs, label: 'Clients actifs', sub: `sur ${clients.length}` },
          { key: 'ca', icon: Euro, color: '#10b981', iconBg: 'rgba(16,185,129,0.1)', value: formatMoney(totalCA), label: 'CA total', sub: modeDiscret ? '' : `${formatMoney(caFacture)} facturé` },
          { key: 'top', icon: Briefcase, color: '#8b5cf6', iconBg: 'rgba(139,92,246,0.1)', value: modeDiscret ? '·····' : (topClient?.nom || '—'), label: 'Top client', sub: modeDiscret ? '' : formatMoney(topCA) },
          { key: 'devis_attente', icon: Send, color: '#3b82f6', iconBg: 'rgba(59,130,246,0.1)', value: devisEnAttente, label: 'Devis en attente', sub: devisEnAttente > 0 ? 'à relancer' : '' },
        ];

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {kpiItems.map(kpi => {
              const isActive = kpiFilter === kpi.key;
              const Icon = kpi.icon;
              return (
                <button
                  key={kpi.key}
                  onClick={() => {
                    if (kpi.key === 'top' && topClient) {
                      setViewId(topClient.id);
                    } else {
                      setKpiFilter(isActive ? null : kpi.key);
                    }
                  }}
                  className={`${cardBg} rounded-xl border p-3 sm:p-4 text-left transition-all duration-200 ${isActive ? 'ring-2 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'}`}
                  style={isActive ? { borderColor: kpi.color, ringColor: kpi.color, '--tw-ring-color': kpi.color } : {}}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: kpi.iconBg }}>
                      <Icon size={16} style={{ color: kpi.color }} />
                    </div>
                    {isActive && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ background: kpi.color }}
                        onClick={(e) => { e.stopPropagation(); setKpiFilter(null); }}
                      >
                        ×
                      </span>
                    )}
                  </div>
                  <p className={`text-lg sm:text-xl font-bold truncate ${kpi.key === 'top' ? 'text-purple-500' : ''}`} style={kpi.key !== 'top' ? { color: kpi.color } : {}}>{kpi.value}</p>
                  <p className={`text-xs ${textMuted}`}>{kpi.label}</p>
                  {kpi.sub && <p className={`text-[10px] ${textMuted} mt-0.5`}>{kpi.sub}</p>}
                </button>
              );
            })}
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

      {/* Toolbar */}
      <div className="space-y-3">
        {/* Search bar full-width */}
        <div className="relative">
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, email, adresse..."
            aria-label="Rechercher un client"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm ${inputBg}`}
          />
          {search && (
            <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:text-red-400`}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters row */}
        {clients.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Grid/List toggle */}
            <div className={`flex rounded-lg border overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'text-white' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                style={viewMode === 'grid' ? { background: couleur } : {}}
                title="Vue grille"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors ${viewMode === 'list' ? 'text-white' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                style={viewMode === 'list' ? { background: couleur } : {}}
                title="Vue liste"
              >
                <List size={16} />
              </button>
            </div>

            {/* Type filter */}
            <select
              value={filterCategorie}
              onChange={e => setFilterCategorie(e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border min-h-[36px] ${inputBg}`}
            >
              <option value="">Type : Tous</option>
              {CLIENT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Sort buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown size={14} className={textMuted} />
              {[
                { key: 'recent', label: 'Récent' },
                { key: 'name', label: 'Nom' },
                { key: 'ca', label: 'CA' },
                { key: 'activite', label: 'Activité' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${sortBy === opt.key ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  style={sortBy === opt.key ? { background: couleur } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active filter indicator */}
        {(kpiFilter || filterCategorie) && (
          <div className="flex items-center gap-2">
            <span className={`text-xs ${textMuted}`}>Filtres actifs :</span>
            {kpiFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white" style={{ background: couleur }}>
                {kpiFilter === 'actifs' ? 'Clients actifs' : kpiFilter === 'ca' ? 'CA > 0' : kpiFilter === 'devis_attente' ? 'Devis en attente' : kpiFilter}
                <button onClick={() => setKpiFilter(null)} className="ml-0.5 hover:opacity-80">×</button>
              </span>
            )}
            {filterCategorie && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                {filterCategorie}
                <button onClick={() => setFilterCategorie('')} className="ml-0.5 hover:opacity-80">×</button>
              </span>
            )}
            <button onClick={() => { setKpiFilter(null); setFilterCategorie(''); }} className={`text-xs underline ${textMuted} hover:${textPrimary}`}>
              Tout effacer
            </button>
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
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {getSortedClients().map(c => {
            const s = getClientStats(c.id);
            const status = getClientStatus(c.id);
            const statusColor = CLIENT_STATUS_COLORS[status];
            const statusLabel = CLIENT_STATUS_LABELS[status];
            const typeColor = CLIENT_TYPE_COLORS[c.categorie];
            const avatarBg = typeColor?.color || couleur;
            const initials = c.prenom ? `${c.nom?.[0] || ''}${c.prenom[0]}`.toUpperCase() : (c.nom?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?');

            return (
              <div key={c.id} className={`${cardBg} rounded-xl sm:rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col h-full`} onClick={() => setViewId(c.id)}>
                {/* Header */}
                <div className="p-4 relative">
                  <div className="flex gap-3">
                    {/* Avatar circle */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0" style={{ background: `linear-gradient(135deg, ${avatarBg}, ${avatarBg}cc)` }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-sm sm:text-base ${textPrimary} leading-tight`}>{c.nom} {c.prenom}</h3>
                      </div>
                      {c.entreprise && (
                        <p className={`text-xs ${textMuted} truncate flex items-center gap-1 mt-0.5`}>
                          <Building2 size={11} /> {c.entreprise}
                        </p>
                      )}
                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? statusColor.darkBg + ' ' + statusColor.darkText : statusColor.bg + ' ' + statusColor.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                          {statusLabel}
                        </span>
                        {/* Type badge */}
                        {c.categorie && typeColor && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? typeColor.darkBg + ' ' + typeColor.darkText : typeColor.bg + ' ' + typeColor.text}`}>
                            {c.categorie}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Edit button */}
                    <button onClick={(e) => { e.stopPropagation(); startEdit(c); }} title="Modifier" aria-label="Modifier ce client" className={`p-2 rounded-lg transition-all absolute top-2 right-2 opacity-0 group-hover:opacity-100 ${isDark ? 'bg-slate-700/90 hover:bg-slate-600 text-slate-200' : 'bg-white/90 hover:bg-slate-100 text-slate-500 shadow-sm'}`}>
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>

                {/* Contact + Actions */}
                <div className={`px-4 py-2.5 border-t flex-grow ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  {c.telephone ? (
                    <div className="flex items-center gap-2">
                      <Smartphone size={13} className={textMuted} />
                      <span className={`text-sm ${textSecondary} flex-1`}>{c.telephone}</span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => callPhone(c.telephone)} aria-label="Appeler" className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isDark ? 'hover:bg-blue-900/40' : 'hover:bg-blue-50'}`} title="Appeler">
                          <Phone size={15} className="text-blue-500" />
                        </button>
                        <button onClick={() => sendWhatsApp(c.telephone, c.prenom)} aria-label="WhatsApp" className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isDark ? 'hover:bg-green-900/40' : 'hover:bg-green-50'}`} title="WhatsApp">
                          <MessageCircle size={15} className="text-green-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-xs ${textMuted} italic`}>Pas de téléphone</p>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 mt-1">
                      <Mail size={13} className={textMuted} />
                      <span className={`text-xs ${textMuted} truncate`}>{c.email}</span>
                    </div>
                  )}
                </div>

                {/* Stats footer */}
                <div className={`px-4 py-2.5 border-t flex items-center justify-between mt-auto ${isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
                  <div className="flex gap-3">
                    <span className={`flex items-center gap-1 text-xs ${s.chantiers > 0 ? textSecondary : textMuted}`} title="Chantiers">
                      <Home size={12} className={s.chantiers > 0 ? 'text-emerald-500' : ''} /> {s.chantiers}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${s.devis > 0 ? textSecondary : textMuted}`} title="Devis">
                      <FileText size={12} className={s.devis > 0 ? 'text-blue-500' : ''} /> {s.devis}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${s.factures > 0 ? textSecondary : textMuted}`} title="Factures">
                      <Receipt size={12} className={s.factures > 0 ? 'text-purple-500' : ''} /> {s.factures}
                    </span>
                  </div>
                  <span className={`font-bold text-xs ${s.ca === 0 ? textMuted : ''}`} style={s.ca > 0 ? { color: couleur } : {}}>{formatMoney(s.ca)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vue Liste compacte */
        <div className={`${cardBg} rounded-xl border overflow-hidden`}>
          {/* Header row - desktop only */}
          <div className={`hidden sm:grid grid-cols-[40px_1fr_100px_100px_80px_80px_70px] gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
            <span></span>
            <span>Client</span>
            <span>Type</span>
            <span>Téléphone</span>
            <span className="text-right">CA</span>
            <span className="text-center">Stats</span>
            <span></span>
          </div>
          {getSortedClients().map((c, idx) => {
            const s = getClientStats(c.id);
            const status = getClientStatus(c.id);
            const statusColor = CLIENT_STATUS_COLORS[status];
            const typeColor = CLIENT_TYPE_COLORS[c.categorie];
            const avatarBg = typeColor?.color || couleur;
            const initials = c.prenom ? `${c.nom?.[0] || ''}${c.prenom[0]}`.toUpperCase() : (c.nom?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?');

            return (
              <div
                key={c.id}
                className={`group cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} ${idx > 0 ? `border-t ${isDark ? 'border-slate-700/50' : 'border-slate-100'}` : ''}`}
                onClick={() => setViewId(c.id)}
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[40px_1fr_100px_100px_80px_80px_70px] gap-3 px-4 py-2.5 items-center">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: avatarBg }}>
                    {initials}
                  </div>
                  {/* Name + company + status */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${textPrimary} truncate`}>{c.nom} {c.prenom}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isDark ? statusColor.darkBg + ' ' + statusColor.darkText : statusColor.bg + ' ' + statusColor.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                        {CLIENT_STATUS_LABELS[status]}
                      </span>
                    </div>
                    {c.entreprise && <p className={`text-xs ${textMuted} truncate`}>{c.entreprise}</p>}
                  </div>
                  {/* Type */}
                  <div>
                    {c.categorie && typeColor ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${isDark ? typeColor.darkBg + ' ' + typeColor.darkText : typeColor.bg + ' ' + typeColor.text}`}>
                        {c.categorie}
                      </span>
                    ) : (
                      <span className={`text-xs ${textMuted}`}>—</span>
                    )}
                  </div>
                  {/* Phone */}
                  <span className={`text-xs ${textSecondary} truncate`}>{c.telephone || '—'}</span>
                  {/* CA */}
                  <span className={`text-xs font-bold text-right ${s.ca > 0 ? '' : textMuted}`} style={s.ca > 0 ? { color: couleur } : {}}>{formatMoney(s.ca)}</span>
                  {/* Stats */}
                  <div className="flex items-center justify-center gap-2">
                    <span className={`flex items-center gap-0.5 text-[10px] ${s.chantiers > 0 ? textSecondary : textMuted}`} title="Chantiers">
                      <Home size={10} className={s.chantiers > 0 ? 'text-emerald-500' : ''} /> {s.chantiers}
                    </span>
                    <span className={`flex items-center gap-0.5 text-[10px] ${s.devis > 0 ? textSecondary : textMuted}`} title="Devis">
                      <FileText size={10} className={s.devis > 0 ? 'text-blue-500' : ''} /> {s.devis}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                    {c.telephone && (
                      <>
                        <button onClick={() => callPhone(c.telephone)} className={`w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-blue-900/40' : 'hover:bg-blue-50'}`} title="Appeler">
                          <Phone size={13} className="text-blue-500" />
                        </button>
                        <button onClick={() => sendWhatsApp(c.telephone, c.prenom)} className={`w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-green-900/40' : 'hover:bg-green-50'}`} title="WhatsApp">
                          <MessageCircle size={13} className="text-green-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile row */}
                <div className="sm:hidden px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: avatarBg }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${textPrimary} truncate`}>{c.nom} {c.prenom}</span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor.dot}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.entreprise && <span className={`text-xs ${textMuted} truncate`}>{c.entreprise}</span>}
                      <span className={`text-xs font-medium ${s.ca > 0 ? '' : textMuted}`} style={s.ca > 0 ? { color: couleur } : {}}>{formatMoney(s.ca)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {c.telephone && (
                      <button onClick={() => callPhone(c.telephone)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'hover:bg-blue-900/40' : 'hover:bg-blue-50'}`}>
                        <Phone size={16} className="text-blue-500" />
                      </button>
                    )}
                  </div>
                  <ChevronRight size={16} className={textMuted} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
