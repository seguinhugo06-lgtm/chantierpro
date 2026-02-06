/**
 * CommandesFournisseurs - Module Bons de Commande Fournisseurs
 *
 * Gestion complete des commandes fournisseurs pour ChantierPro.
 * Permet la creation, le suivi et la gestion des bons de commande
 * avec integration du catalogue articles et suivi des livraisons.
 *
 * @param {Object} props
 * @param {Array} props.chantiers - Liste des chantiers [{id, nom, statut}]
 * @param {Array} props.catalogue - Catalogue articles [{id, nom, prix, prixAchat, unite, categorie}]
 * @param {Object} props.entreprise - Infos entreprise {nom, adresse, tel, email, siret}
 * @param {boolean} props.isDark - Mode sombre
 * @param {string} props.couleur - Couleur theme
 * @param {Function} props.setPage - Navigation
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingCart, Plus, Search, Edit3, Trash2, X, Save,
  Truck, Package, FileText, Calendar, Send, Check,
  CheckCircle, XCircle, AlertTriangle, ChevronRight,
  ChevronDown, Eye, Printer, Download
} from 'lucide-react';
import { generateId } from '../../lib/utils';

const STORAGE_KEY = 'cp_commandes_fournisseurs';

const UNITES = ['u', 'm', 'm2', 'm3', 'kg', 'L', 'ml', 'rouleau', 'sac', 'boite', 'lot', 'forfait'];

const STATUT_CONFIG = {
  brouillon: { label: 'Brouillon', color: 'gray', icon: FileText },
  envoyee: { label: 'Envoyee', color: 'blue', icon: Send },
  confirmee: { label: 'Confirmee', color: 'purple', icon: Check },
  livree_partiel: { label: 'Livraison partielle', color: 'amber', icon: Truck },
  livree: { label: 'Livree', color: 'green', icon: CheckCircle },
  annulee: { label: 'Annulee', color: 'red', icon: XCircle },
};

const STATUT_BADGE_CLASSES = {
  gray: { bg: 'bg-gray-100 text-gray-700', dark: 'bg-gray-700 text-gray-200' },
  blue: { bg: 'bg-blue-100 text-blue-700', dark: 'bg-blue-900/40 text-blue-300' },
  purple: { bg: 'bg-purple-100 text-purple-700', dark: 'bg-purple-900/40 text-purple-300' },
  amber: { bg: 'bg-amber-100 text-amber-700', dark: 'bg-amber-900/40 text-amber-300' },
  green: { bg: 'bg-green-100 text-green-700', dark: 'bg-green-900/40 text-green-300' },
  red: { bg: 'bg-red-100 text-red-700', dark: 'bg-red-900/40 text-red-300' },
};

function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function generateNumero(commandes) {
  const year = new Date().getFullYear();
  const yearCommandes = commandes.filter(c => c.numero && c.numero.includes(`BC-${year}`));
  const nextNum = yearCommandes.length + 1;
  return `BC-${year}-${String(nextNum).padStart(3, '0')}`;
}

function createEmptyLigne() {
  return {
    id: generateId('lig'),
    description: '',
    reference: '',
    quantite: 1,
    prixUnitaire: 0,
    unite: 'u',
    montantHt: 0,
  };
}

function createEmptyCommande(commandes) {
  return {
    id: generateId('cmd'),
    numero: generateNumero(commandes),
    fournisseurNom: '',
    fournisseurContact: '',
    fournisseurEmail: '',
    fournisseurTel: '',
    chantierId: null,
    dateCommande: new Date().toISOString().split('T')[0],
    dateLivraisonPrevue: '',
    dateLivraisonReelle: null,
    lignes: [createEmptyLigne()],
    montantHT: 0,
    tvaRate: 20,
    montantTTC: 0,
    statut: 'brouillon',
    notes: '',
    createdAt: new Date().toISOString(),
  };
}

export default function CommandesFournisseurs({
  chantiers = [],
  catalogue = [],
  entreprise = {},
  isDark = false,
  couleur = '#f97316',
  setPage,
}) {
  const [commandes, setCommandes] = useState([]);
  const [view, setView] = useState('list');
  const [activeTab, setActiveTab] = useState('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [form, setForm] = useState(null);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const pageBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCommandes(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Erreur chargement commandes:', e);
    }
  }, []);

  // Save to localStorage
  const saveCommandes = useCallback((updated) => {
    setCommandes(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur sauvegarde commandes:', e);
    }
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const enCours = commandes.filter(c =>
      ['envoyee', 'confirmee', 'livree_partiel'].includes(c.statut)
    );
    const montantEngage = enCours.reduce((sum, c) => sum + (c.montantHT || 0), 0);
    const enAttente = commandes.filter(c =>
      ['envoyee', 'confirmee'].includes(c.statut)
    );
    const enRetard = commandes.filter(c => {
      if (!c.dateLivraisonPrevue || c.statut === 'livree' || c.statut === 'annulee') return false;
      return new Date(c.dateLivraisonPrevue) < new Date() && !c.dateLivraisonReelle;
    });
    return { enCours: enCours.length, montantEngage, enAttente: enAttente.length, enRetard: enRetard.length };
  }, [commandes]);

  // Filtered list
  const filteredCommandes = useMemo(() => {
    let result = [...commandes];
    if (activeTab === 'en_cours') {
      result = result.filter(c => ['brouillon', 'envoyee', 'confirmee', 'livree_partiel'].includes(c.statut));
    } else if (activeTab === 'livrees') {
      result = result.filter(c => c.statut === 'livree');
    } else if (activeTab === 'annulees') {
      result = result.filter(c => c.statut === 'annulee');
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(c =>
        (c.numero || '').toLowerCase().includes(term) ||
        (c.fournisseurNom || '').toLowerCase().includes(term)
      );
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [commandes, activeTab, searchTerm]);

  // Catalogue filtered
  const filteredCatalogue = useMemo(() => {
    if (!catalogueSearch.trim()) return catalogue;
    const term = catalogueSearch.toLowerCase().trim();
    return catalogue.filter(item =>
      (item.nom || '').toLowerCase().includes(term) ||
      (item.categorie || '').toLowerCase().includes(term)
    );
  }, [catalogue, catalogueSearch]);

  // Recalculate totals for the form
  const recalcTotals = useCallback((lignes, tvaRate) => {
    const montantHT = lignes.reduce((sum, l) => sum + (l.montantHt || 0), 0);
    const montantTTC = montantHT * (1 + (tvaRate || 20) / 100);
    return { montantHT, montantTTC };
  }, []);

  // Start new commande
  const handleNew = () => {
    const newCmd = createEmptyCommande(commandes);
    setForm(newCmd);
    setView('form');
  };

  // Edit existing
  const handleEdit = (cmd) => {
    setForm({ ...cmd, lignes: cmd.lignes.map(l => ({ ...l })) });
    setView('form');
  };

  // View detail
  const handleViewDetail = (cmd) => {
    setSelectedCommande(cmd);
    setView('detail');
  };

  // Save form
  const handleSave = () => {
    if (!form) return;
    if (!form.fournisseurNom.trim()) return;

    const totals = recalcTotals(form.lignes, form.tvaRate);
    const saved = { ...form, ...totals };

    const existing = commandes.findIndex(c => c.id === saved.id);
    let updated;
    if (existing >= 0) {
      updated = commandes.map(c => c.id === saved.id ? saved : c);
    } else {
      updated = [...commandes, saved];
    }
    saveCommandes(updated);
    setView('list');
    setForm(null);
  };

  // Delete
  const handleDelete = (id) => {
    if (!window.confirm('Supprimer cette commande ?')) return;
    saveCommandes(commandes.filter(c => c.id !== id));
    if (view === 'detail') {
      setView('list');
      setSelectedCommande(null);
    }
  };

  // Status change
  const handleStatusChange = (cmd, newStatut) => {
    const updates = { statut: newStatut };
    if (newStatut === 'livree' || newStatut === 'livree_partiel') {
      updates.dateLivraisonReelle = new Date().toISOString().split('T')[0];
    }
    const updated = commandes.map(c => c.id === cmd.id ? { ...c, ...updates } : c);
    saveCommandes(updated);
    setSelectedCommande({ ...cmd, ...updates });
  };

  // Form: update ligne
  const updateLigne = (ligneId, field, value) => {
    if (!form) return;
    const lignes = form.lignes.map(l => {
      if (l.id !== ligneId) return l;
      const updated = { ...l, [field]: value };
      if (field === 'quantite' || field === 'prixUnitaire') {
        updated.montantHt = (updated.quantite || 0) * (updated.prixUnitaire || 0);
      }
      return updated;
    });
    const totals = recalcTotals(lignes, form.tvaRate);
    setForm({ ...form, lignes, ...totals });
  };

  // Form: add empty ligne
  const addLigne = () => {
    if (!form) return;
    const lignes = [...form.lignes, createEmptyLigne()];
    setForm({ ...form, lignes });
  };

  // Form: remove ligne
  const removeLigne = (ligneId) => {
    if (!form) return;
    const lignes = form.lignes.filter(l => l.id !== ligneId);
    const totals = recalcTotals(lignes, form.tvaRate);
    setForm({ ...form, lignes, ...totals });
  };

  // Form: add from catalogue
  const addFromCatalogue = (item, qty = 1) => {
    if (!form) return;
    const ligne = {
      id: generateId('lig'),
      description: item.nom || '',
      reference: item.id || '',
      quantite: qty,
      prixUnitaire: item.prixAchat || item.prix || 0,
      unite: item.unite || 'u',
      montantHt: qty * (item.prixAchat || item.prix || 0),
    };
    const lignes = [...form.lignes, ligne];
    const totals = recalcTotals(lignes, form.tvaRate);
    setForm({ ...form, lignes, ...totals });
    setShowCatalogueModal(false);
    setCatalogueSearch('');
  };

  // Update TVA rate
  const updateTvaRate = (rate) => {
    if (!form) return;
    const tvaRate = parseFloat(rate) || 0;
    const totals = recalcTotals(form.lignes, tvaRate);
    setForm({ ...form, tvaRate, ...totals });
  };

  // Get chantier name
  const getChantierNom = (chantierId) => {
    const ch = chantiers.find(c => c.id === chantierId);
    return ch ? ch.nom : '-';
  };

  // Status badge
  const StatutBadge = ({ statut }) => {
    const config = STATUT_CONFIG[statut] || STATUT_CONFIG.brouillon;
    const classes = STATUT_BADGE_CLASSES[config.color] || STATUT_BADGE_CLASSES.gray;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? classes.dark : classes.bg}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  // ===================== CATALOGUE MODAL =====================
  const CatalogueModal = () => {
    const [tempQty, setTempQty] = useState({});

    if (!showCatalogueModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className={`w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border shadow-2xl ${cardBg}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <h3 className={`text-lg font-bold ${textPrimary}`}>
              <Package className="inline mr-2" size={20} />
              Ajouter depuis le catalogue
            </h3>
            <button
              onClick={() => { setShowCatalogueModal(false); setCatalogueSearch(''); }}
              className={`p-1.5 rounded-lg ${hoverBg} ${textMuted}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} size={16} />
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={catalogueSearch}
                onChange={e => setCatalogueSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${inputBg} focus:outline-none focus:ring-2`}
                style={{ focusRingColor: couleur }}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredCatalogue.length === 0 ? (
              <p className={`text-center py-8 ${textMuted}`}>Aucun article trouve</p>
            ) : (
              filteredCatalogue.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${cardBg} ${hoverBg} transition-colors`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${textPrimary}`}>{item.nom}</p>
                    <p className={`text-sm ${textMuted}`}>
                      {item.categorie && <span className="mr-3">{item.categorie}</span>}
                      {formatCurrency(item.prixAchat || item.prix)} / {item.unite || 'u'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <input
                      type="number"
                      min="1"
                      value={tempQty[item.id] || 1}
                      onChange={e => setTempQty({ ...tempQty, [item.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                      className={`w-16 px-2 py-1.5 rounded border text-center text-sm ${inputBg}`}
                    />
                    <button
                      onClick={() => addFromCatalogue(item, tempQty[item.id] || 1)}
                      className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors"
                      style={{ backgroundColor: couleur }}
                    >
                      <Plus size={14} className="inline mr-1" />
                      Ajouter
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===================== KPI CARDS =====================
  const renderKPIs = () => {
    const cards = [
      { label: 'Commandes en cours', value: kpis.enCours, icon: ShoppingCart, color: couleur },
      { label: 'Montant engage', value: formatCurrency(kpis.montantEngage), icon: FileText, color: '#3b82f6' },
      { label: 'En attente livraison', value: kpis.enAttente, icon: Truck, color: '#f59e0b' },
      { label: 'Livraisons en retard', value: kpis.enRetard, icon: AlertTriangle, color: '#ef4444' },
    ];
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`p-4 rounded-xl border ${cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: card.color + '20' }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{card.value}</p>
              <p className={`text-xs mt-1 ${textMuted}`}>{card.label}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // ===================== LIST VIEW =====================
  const renderList = () => {
    const tabs = [
      { id: 'tous', label: 'Tous' },
      { id: 'en_cours', label: 'En cours' },
      { id: 'livrees', label: 'Livrees' },
      { id: 'annulees', label: 'Annulees' },
    ];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
              <ShoppingCart size={28} style={{ color: couleur }} />
              Bons de Commande
            </h1>
            <p className={`text-sm mt-1 ${textMuted}`}>
              Gerez vos commandes fournisseurs et suivez les livraisons
            </p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium shadow-lg transition-all hover:shadow-xl"
            style={{ backgroundColor: couleur }}
          >
            <Plus size={18} />
            Nouvelle commande
          </button>
        </div>

        {/* KPIs */}
        {renderKPIs()}

        {/* Tabs + Search */}
        <div className={`rounded-xl border ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b"
            style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-white'
                      : `${textSecondary} ${hoverBg}`
                  }`}
                  style={activeTab === tab.id ? { backgroundColor: couleur } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} size={16} />
              <input
                type="text"
                placeholder="Rechercher numero ou fournisseur..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                style={{ '--tw-ring-color': couleur }}
              />
            </div>
          </div>

          {/* Table */}
          {filteredCommandes.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className={`mx-auto mb-3 ${textMuted}`} size={40} />
              <p className={`font-medium ${textSecondary}`}>Aucune commande trouvee</p>
              <p className={`text-sm mt-1 ${textMuted}`}>
                Creez votre premiere commande fournisseur
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Numero</th>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Fournisseur</th>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted} hidden md:table-cell`}>Chantier</th>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted} hidden sm:table-cell`}>Date</th>
                    <th className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Montant HT</th>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Statut</th>
                    <th className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommandes.map(cmd => (
                    <tr
                      key={cmd.id}
                      className={`border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'} ${hoverBg} cursor-pointer transition-colors`}
                      onClick={() => handleViewDetail(cmd)}
                    >
                      <td className={`px-4 py-3 font-mono text-sm font-semibold ${textPrimary}`}>
                        {cmd.numero}
                      </td>
                      <td className={`px-4 py-3 ${textPrimary}`}>
                        <p className="font-medium text-sm">{cmd.fournisseurNom || '-'}</p>
                        {cmd.fournisseurContact && (
                          <p className={`text-xs ${textMuted}`}>{cmd.fournisseurContact}</p>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm ${textSecondary} hidden md:table-cell`}>
                        {cmd.chantierId ? getChantierNom(cmd.chantierId) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${textSecondary} hidden sm:table-cell`}>
                        {formatDate(cmd.dateCommande)}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${textPrimary}`}>
                        {formatCurrency(cmd.montantHT)}
                      </td>
                      <td className="px-4 py-3">
                        <StatutBadge statut={cmd.statut} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewDetail(cmd)}
                            className={`p-1.5 rounded-lg ${hoverBg} ${textMuted} transition-colors`}
                            title="Voir"
                          >
                            <Eye size={16} />
                          </button>
                          {cmd.statut === 'brouillon' && (
                            <button
                              onClick={() => handleEdit(cmd)}
                              className={`p-1.5 rounded-lg ${hoverBg} ${textMuted} transition-colors`}
                              title="Modifier"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(cmd.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===================== FORM VIEW =====================
  const renderForm = () => {
    if (!form) return null;
    const isEdit = commandes.some(c => c.id === form.id);
    const montantTVA = (form.montantHT || 0) * ((form.tvaRate || 20) / 100);

    return (
      <div className="space-y-4">
        {/* Form Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('list'); setForm(null); }}
              className={`p-2 rounded-lg ${hoverBg} ${textMuted} transition-colors`}
            >
              <X size={20} />
            </button>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>
                {isEdit ? 'Modifier la commande' : 'Nouvelle commande'}
              </h2>
              <p className={`text-sm font-mono ${textMuted}`}>{form.numero}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setView('list'); setForm(null); }}
              className={`px-4 py-2 rounded-lg border text-sm font-medium ${cardBg} ${textSecondary} transition-colors`}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!form.fournisseurNom.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: couleur }}
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column: Main form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Fournisseur */}
            <div className={`rounded-xl border p-4 ${cardBg}`}>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>
                Fournisseur
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Nom du fournisseur *
                  </label>
                  <input
                    type="text"
                    value={form.fournisseurNom}
                    onChange={e => setForm({ ...form, fournisseurNom: e.target.value })}
                    placeholder="Nom de l'entreprise"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Contact
                  </label>
                  <input
                    type="text"
                    value={form.fournisseurContact}
                    onChange={e => setForm({ ...form, fournisseurContact: e.target.value })}
                    placeholder="Nom du contact"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.fournisseurEmail}
                    onChange={e => setForm({ ...form, fournisseurEmail: e.target.value })}
                    placeholder="email@fournisseur.fr"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Telephone
                  </label>
                  <input
                    type="tel"
                    value={form.fournisseurTel}
                    onChange={e => setForm({ ...form, fournisseurTel: e.target.value })}
                    placeholder="01 23 45 67 89"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                  />
                </div>
              </div>
            </div>

            {/* Chantier + Dates */}
            <div className={`rounded-xl border p-4 ${cardBg}`}>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>
                Informations commande
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    Chantier
                  </label>
                  <select
                    value={form.chantierId || ''}
                    onChange={e => setForm({ ...form, chantierId: e.target.value || null })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                  >
                    <option value="">-- Aucun chantier --</option>
                    {chantiers.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    <Calendar size={14} className="inline mr-1" />
                    Date de commande
                  </label>
                  <input
                    type="date"
                    value={form.dateCommande}
                    onChange={e => setForm({ ...form, dateCommande: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>
                    <Truck size={14} className="inline mr-1" />
                    Livraison prevue
                  </label>
                  <input
                    type="date"
                    value={form.dateLivraisonPrevue}
                    onChange={e => setForm({ ...form, dateLivraisonPrevue: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none focus:ring-2`}
                  />
                </div>
              </div>
            </div>

            {/* Lignes de commande */}
            <div className={`rounded-xl border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${textMuted}`}>
                  Lignes de commande
                </h3>
                <div className="flex gap-2">
                  {catalogue.length > 0 && (
                    <button
                      onClick={() => setShowCatalogueModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                      style={{ borderColor: couleur, color: couleur }}
                    >
                      <Package size={14} />
                      Depuis le catalogue
                    </button>
                  )}
                  <button
                    onClick={addLigne}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors"
                    style={{ backgroundColor: couleur }}
                  >
                    <Plus size={14} />
                    Ajouter une ligne
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {form.lignes.map((ligne, idx) => (
                  <div
                    key={ligne.id}
                    className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-mono mt-2 ${textMuted}`}>{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Description */}
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="Description"
                            value={ligne.description}
                            onChange={e => updateLigne(ligne.id, 'description', e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded border text-sm ${inputBg} focus:outline-none focus:ring-1`}
                          />
                        </div>
                        {/* Reference */}
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Ref."
                            value={ligne.reference}
                            onChange={e => updateLigne(ligne.id, 'reference', e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded border text-sm ${inputBg} focus:outline-none focus:ring-1`}
                          />
                        </div>
                        {/* Quantite */}
                        <div className="sm:col-span-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Qte"
                            value={ligne.quantite}
                            onChange={e => updateLigne(ligne.id, 'quantite', parseFloat(e.target.value) || 0)}
                            className={`w-full px-2.5 py-1.5 rounded border text-sm text-center ${inputBg} focus:outline-none focus:ring-1`}
                          />
                        </div>
                        {/* Unite */}
                        <div className="sm:col-span-1">
                          <select
                            value={ligne.unite}
                            onChange={e => updateLigne(ligne.id, 'unite', e.target.value)}
                            className={`w-full px-1 py-1.5 rounded border text-sm ${inputBg} focus:outline-none focus:ring-1`}
                          >
                            {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        {/* Prix unitaire */}
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="P.U. HT"
                            value={ligne.prixUnitaire}
                            onChange={e => updateLigne(ligne.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                            className={`w-full px-2.5 py-1.5 rounded border text-sm text-right ${inputBg} focus:outline-none focus:ring-1`}
                          />
                        </div>
                        {/* Montant HT */}
                        <div className="sm:col-span-2 flex items-center justify-end">
                          <span className={`text-sm font-semibold ${textPrimary}`}>
                            {formatCurrency(ligne.montantHt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeLigne(ligne.id)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors mt-0.5"
                        title="Supprimer la ligne"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {form.lignes.length === 0 && (
                  <p className={`text-center py-6 text-sm ${textMuted}`}>
                    Aucune ligne. Ajoutez des articles a votre commande.
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className={`rounded-xl border p-4 ${cardBg}`}>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>
                Notes
              </h3>
              <textarea
                rows={3}
                placeholder="Notes internes, conditions particulieres..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${inputBg} focus:outline-none focus:ring-2`}
              />
            </div>
          </div>

          {/* Right column: Totals */}
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${cardBg} sticky top-4`}>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${textMuted}`}>
                Recapitulatif
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${textSecondary}`}>Total HT</span>
                  <span className={`text-sm font-semibold ${textPrimary}`}>
                    {formatCurrency(form.montantHT)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${textSecondary}`}>TVA</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.tvaRate}
                      onChange={e => updateTvaRate(e.target.value)}
                      className={`w-16 px-2 py-1 rounded border text-sm text-center ${inputBg}`}
                    />
                    <span className={`text-sm ${textMuted}`}>%</span>
                  </div>
                  <span className={`text-sm ${textSecondary}`}>
                    {formatCurrency(montantTVA)}
                  </span>
                </div>
                <div className={`border-t pt-3 ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-base font-bold ${textPrimary}`}>Total TTC</span>
                    <span className="text-lg font-bold" style={{ color: couleur }}>
                      {formatCurrency(form.montantTTC)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                <p className={`text-xs ${textMuted}`}>
                  {form.lignes.length} ligne{form.lignes.length > 1 ? 's' : ''} de commande
                </p>
                {form.chantierId && (
                  <p className={`text-xs mt-1 ${textMuted}`}>
                    Chantier : {getChantierNom(form.chantierId)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===================== DETAIL VIEW =====================
  const renderDetail = () => {
    if (!selectedCommande) return null;
    const cmd = selectedCommande;
    const montantTVA = (cmd.montantHT || 0) * ((cmd.tvaRate || 20) / 100);
    const isLate = cmd.dateLivraisonPrevue &&
      !cmd.dateLivraisonReelle &&
      cmd.statut !== 'livree' &&
      cmd.statut !== 'annulee' &&
      new Date(cmd.dateLivraisonPrevue) < new Date();

    return (
      <div className="space-y-4">
        {/* Detail Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('list'); setSelectedCommande(null); }}
              className={`p-2 rounded-lg ${hoverBg} ${textMuted} transition-colors`}
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>
                Commande {cmd.numero}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <StatutBadge statut={cmd.statut} />
                {isLate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    <AlertTriangle size={12} />
                    En retard
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Workflow buttons */}
            {cmd.statut === 'brouillon' && (
              <>
                <button
                  onClick={() => handleEdit(cmd)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${cardBg} ${textSecondary} transition-colors`}
                >
                  <Edit3 size={14} />
                  Modifier
                </button>
                <button
                  onClick={() => handleStatusChange(cmd, 'envoyee')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#3b82f6' }}
                >
                  <Send size={14} />
                  Envoyer
                </button>
              </>
            )}
            {cmd.statut === 'envoyee' && (
              <button
                onClick={() => handleStatusChange(cmd, 'confirmee')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: '#8b5cf6' }}
              >
                <Check size={14} />
                Confirmer reception
              </button>
            )}
            {cmd.statut === 'confirmee' && (
              <>
                <button
                  onClick={() => handleStatusChange(cmd, 'livree_partiel')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#f59e0b' }}
                >
                  <Package size={14} />
                  Livraison partielle
                </button>
                <button
                  onClick={() => handleStatusChange(cmd, 'livree')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#22c55e' }}
                >
                  <CheckCircle size={14} />
                  Livraison complete
                </button>
              </>
            )}
            {cmd.statut === 'livree_partiel' && (
              <button
                onClick={() => handleStatusChange(cmd, 'livree')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: '#22c55e' }}
              >
                <CheckCircle size={14} />
                Livraison complete
              </button>
            )}
            {cmd.statut !== 'annulee' && cmd.statut !== 'livree' && (
              <button
                onClick={() => handleStatusChange(cmd, 'annulee')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircle size={14} />
                Annuler
              </button>
            )}
            <button
              onClick={() => handleDelete(cmd.id)}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* PDF-like preview */}
        <div className={`rounded-xl border ${cardBg} overflow-hidden`}>
          {/* Document header */}
          <div className="p-6 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: couleur + '08' }}>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              {/* Company info */}
              <div>
                <h3 className={`text-lg font-bold ${textPrimary}`}>
                  {entreprise.nom || 'Mon Entreprise'}
                </h3>
                {entreprise.adresse && (
                  <p className={`text-sm mt-1 ${textSecondary}`}>{entreprise.adresse}</p>
                )}
                <div className={`text-sm mt-1 ${textMuted}`}>
                  {entreprise.tel && <span className="mr-3">{entreprise.tel}</span>}
                  {entreprise.email && <span>{entreprise.email}</span>}
                </div>
                {entreprise.siret && (
                  <p className={`text-xs mt-1 ${textMuted}`}>SIRET : {entreprise.siret}</p>
                )}
              </div>
              {/* Command info */}
              <div className="text-right">
                <h2 className="text-xl font-bold" style={{ color: couleur }}>
                  BON DE COMMANDE
                </h2>
                <p className={`text-lg font-mono font-bold mt-1 ${textPrimary}`}>{cmd.numero}</p>
                <p className={`text-sm mt-2 ${textSecondary}`}>
                  Date : {formatDate(cmd.dateCommande)}
                </p>
                {cmd.dateLivraisonPrevue && (
                  <p className={`text-sm ${textSecondary}`}>
                    Livraison prevue : {formatDate(cmd.dateLivraisonPrevue)}
                  </p>
                )}
                {cmd.dateLivraisonReelle && (
                  <p className={`text-sm ${textSecondary}`}>
                    Livraison reelle : {formatDate(cmd.dateLivraisonReelle)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Fournisseur info */}
          <div className="p-6 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${textMuted}`}>
                  Fournisseur
                </p>
                <p className={`font-bold ${textPrimary}`}>{cmd.fournisseurNom}</p>
                {cmd.fournisseurContact && (
                  <p className={`text-sm ${textSecondary}`}>{cmd.fournisseurContact}</p>
                )}
                {cmd.fournisseurEmail && (
                  <p className={`text-sm ${textMuted}`}>{cmd.fournisseurEmail}</p>
                )}
                {cmd.fournisseurTel && (
                  <p className={`text-sm ${textMuted}`}>{cmd.fournisseurTel}</p>
                )}
              </div>
              {cmd.chantierId && (
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${textMuted}`}>
                    Chantier de destination
                  </p>
                  <p className={`font-medium ${textPrimary}`}>{getChantierNom(cmd.chantierId)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lignes table */}
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className={`border-b-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                  <th className={`text-left py-2 text-xs font-semibold uppercase ${textMuted}`}>#</th>
                  <th className={`text-left py-2 text-xs font-semibold uppercase ${textMuted}`}>Description</th>
                  <th className={`text-left py-2 text-xs font-semibold uppercase ${textMuted}`}>Ref.</th>
                  <th className={`text-center py-2 text-xs font-semibold uppercase ${textMuted}`}>Qte</th>
                  <th className={`text-center py-2 text-xs font-semibold uppercase ${textMuted}`}>Unite</th>
                  <th className={`text-right py-2 text-xs font-semibold uppercase ${textMuted}`}>P.U. HT</th>
                  <th className={`text-right py-2 text-xs font-semibold uppercase ${textMuted}`}>Montant HT</th>
                </tr>
              </thead>
              <tbody>
                {(cmd.lignes || []).map((ligne, idx) => (
                  <tr key={ligne.id} className={`border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                    <td className={`py-2.5 text-sm ${textMuted}`}>{idx + 1}</td>
                    <td className={`py-2.5 text-sm font-medium ${textPrimary}`}>{ligne.description}</td>
                    <td className={`py-2.5 text-sm font-mono ${textMuted}`}>{ligne.reference || '-'}</td>
                    <td className={`py-2.5 text-sm text-center ${textSecondary}`}>{ligne.quantite}</td>
                    <td className={`py-2.5 text-sm text-center ${textMuted}`}>{ligne.unite}</td>
                    <td className={`py-2.5 text-sm text-right ${textSecondary}`}>
                      {formatCurrency(ligne.prixUnitaire)}
                    </td>
                    <td className={`py-2.5 text-sm text-right font-semibold ${textPrimary}`}>
                      {formatCurrency(ligne.montantHt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mt-4">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className={`text-sm ${textSecondary}`}>Total HT</span>
                  <span className={`text-sm font-semibold ${textPrimary}`}>
                    {formatCurrency(cmd.montantHT)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${textSecondary}`}>TVA ({cmd.tvaRate || 20}%)</span>
                  <span className={`text-sm ${textSecondary}`}>
                    {formatCurrency(montantTVA)}
                  </span>
                </div>
                <div className={`flex justify-between pt-2 border-t ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-base font-bold ${textPrimary}`}>Total TTC</span>
                  <span className="text-base font-bold" style={{ color: couleur }}>
                    {formatCurrency(cmd.montantTTC)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {cmd.notes && (
              <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textMuted}`}>
                  Notes
                </p>
                <p className={`text-sm whitespace-pre-wrap ${textSecondary}`}>{cmd.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===================== MAIN RENDER =====================
  return (
    <div className={`min-h-screen p-4 sm:p-6 ${pageBg}`}>
      <div className="max-w-7xl mx-auto">
        {view === 'list' && renderList()}
        {view === 'form' && renderForm()}
        {view === 'detail' && renderDetail()}
      </div>
      <CatalogueModal />
    </div>
  );
}
