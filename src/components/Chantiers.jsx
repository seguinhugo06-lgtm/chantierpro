import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Edit3, Trash2, Check, X, Camera, MapPin, Phone, Clock, Calendar, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Package, Users, FileText, ChevronRight, Save, Image, StickyNote, CheckSquare, Square, MoreVertical, Percent, Coins, Receipt, Banknote, PiggyBank, Target, BarChart3, CircleDollarSign, Wallet, MessageSquare, AlertCircle, ArrowUpRight, ArrowDownRight, UserCog, Download, Share2, ArrowUpDown, SortAsc, SortDesc, Building2 } from 'lucide-react';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';

const PHOTO_CATS = ['avant', 'pendant', 'après', 'litige'];

export default function Chantiers({ chantiers, addChantier, updateChantier, clients, depenses, setDepenses, pointages, setPointages, equipe, devis, ajustements, addAjustement, deleteAjustement, getChantierBilan, couleur, modeDiscret, entreprise, selectedChantier, setSelectedChantier, catalogue, deductStock, isDark, createMode, setCreateMode }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";

  const [view, setView] = useState(selectedChantier || null);
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState('finances');
  const [form, setForm] = useState({ nom: '', client_id: '', adresse: '', date_debut: new Date().toISOString().split('T')[0], date_fin: '', statut: 'prospect', avancement: 0, notes: '', budget_estime: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newTache, setNewTache] = useState('');
  const [newDepense, setNewDepense] = useState({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '' });
  const [showAjustement, setShowAjustement] = useState(null);
  const [showMODetail, setShowMODetail] = useState(false);
  const [showAddMO, setShowAddMO] = useState(false);
  const [showQuickMateriau, setShowQuickMateriau] = useState(false); // Modal ajout rapide matériau
  const [photoPreview, setPhotoPreview] = useState(null); // Photo preview modal
  const [adjForm, setAdjForm] = useState({ libelle: '', montant_ht: '' });
  const [moForm, setMoForm] = useState({ employeId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  const [newMessage, setNewMessage] = useState({ type: 'email', content: '' });
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ budget_estime: '' });
  const [sortBy, setSortBy] = useState('recent'); // recent, name, status, margin

  useEffect(() => { if (selectedChantier) setView(selectedChantier); }, [selectedChantier]);
  useEffect(() => { if (createMode) { setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);

  const formatMoney = (n) => modeDiscret ? '·····' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  const formatPct = (n) => modeDiscret ? '··%' : (n || 0).toFixed(1) + '%';
  const getMargeColor = (t) => t < 0 ? 'text-red-500' : t < 15 ? 'text-amber-500' : 'text-emerald-500';
  const getMargeBg = (t) => t < 0 ? 'bg-red-50' : t < 15 ? 'bg-amber-50' : 'bg-emerald-50';

  // Handlers
  const handlePhotoAdd = (e, cat = 'pendant') => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { photos: [...(ch.photos || []), { id: generateId(), src: reader.result, categorie: cat, date: new Date().toISOString() }] }); }; reader.readAsDataURL(file); };
  const deletePhoto = (id) => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { photos: ch.photos.filter(p => p.id !== id) }); };
  const addTache = () => { if (!newTache.trim()) return; const ch = chantiers.find(c => c.id === view); if (ch) { updateChantier(view, { taches: [...(ch.taches || []), { id: generateId(), text: newTache, done: false }] }); setNewTache(''); } };
  const toggleTache = (id) => { const ch = chantiers.find(c => c.id === view); if (ch) updateChantier(view, { taches: ch.taches.map(t => t.id === id ? { ...t, done: !t.done } : t) }); };
  const addDepenseToChantier = () => {
    if (!newDepense.description || !newDepense.montant) return;
    const qty = parseInt(newDepense.quantite) || 1;
    setDepenses([...depenses, {
      id: generateId(),
      chantierId: view,
      description: newDepense.description + (qty > 1 ? ` (x${qty})` : ''),
      montant: parseFloat(newDepense.montant),
      categorie: newDepense.categorie,
      date: new Date().toISOString().split('T')[0]
    }]);
    if (newDepense.catalogueId && deductStock) deductStock(newDepense.catalogueId, qty);
    setNewDepense({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '' });
    setShowQuickMateriau(false);
  };
  const handleAddAjustement = () => { if (!adjForm.libelle || !adjForm.montant_ht) return; addAjustement({ chantierId: view, type: showAjustement, libelle: adjForm.libelle, montant_ht: parseFloat(adjForm.montant_ht) }); setAdjForm({ libelle: '', montant_ht: '' }); setShowAjustement(null); };
  const handleAddMO = () => { if (!moForm.employeId || !moForm.heures) return; setPointages([...pointages, { id: generateId(), employeId: moForm.employeId, chantierId: view, date: moForm.date, heures: parseFloat(moForm.heures), note: moForm.note, manuel: true, approuve: true }]); setMoForm({ employeId: '', date: new Date().toISOString().split('T')[0], heures: '', note: '' }); setShowAddMO(false); };
  const handleEditPointage = (id, field, value) => setPointages(pointages.map(p => p.id === id ? { ...p, [field]: field === 'heures' ? parseFloat(value) || 0 : value } : p));
  const deletePointage = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer ce pointage ?' });
    if (confirmed) setPointages(pointages.filter(p => p.id !== id));
  };
  const submit = () => {
    if (!form.nom) return showToast('Nom requis', 'error');
    const newChantier = addChantier({ ...form, budget_estime: form.budget_estime ? parseFloat(form.budget_estime) : undefined });
    setShow(false);
    setShowAdvanced(false);
    setForm({ nom: '', client_id: '', adresse: '', date_debut: new Date().toISOString().split('T')[0], date_fin: '', statut: 'prospect', avancement: 0, notes: '', budget_estime: '' });
    // Redirect to the new chantier details
    if (newChantier?.id) setView(newChantier.id);
  };

  // Vue détail chantier
  if (view) {
    const ch = chantiers.find(c => c.id === view);
    if (!ch) { setView(null); return null; }
    const client = clients.find(c => c.id === ch.client_id);
    const bilan = getChantierBilan(ch.id);
    const chDepenses = depenses.filter(d => d.chantierId === ch.id);
    const chPointages = pointages.filter(p => p.chantierId === ch.id);
    const chAjustements = (ajustements || []).filter(a => a.chantierId === ch.id);
    const adjRevenus = chAjustements.filter(a => a.type === 'REVENU');
    const adjDepenses = chAjustements.filter(a => a.type === 'DEPENSE');
    const tasksDone = ch.taches?.filter(t => t.done).length || 0;
    const tasksTotal = ch.taches?.length || 0;

    // Devis lié
    const devisLie = devis?.find(d => d.chantier_id === ch.id && d.type === 'devis');
    const devisHT = devisLie?.total_ht || 0;

    // Projections
    const avancement = ch.avancement || (tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0);
    const depensesFinalesEstimees = avancement > 0 ? bilan.totalDepenses / (avancement / 100) : bilan.totalDepenses * 2;
    const beneficeProjecte = bilan.revenuPrevu - depensesFinalesEstimees;
    const tauxMargeProjecte = bilan.revenuPrevu > 0 ? (beneficeProjecte / bilan.revenuPrevu) * 100 : 0;

    // Alertes - basées sur des seuils clairs
    const revenuTotal = bilan.revenuPrevu + (bilan.adjRevenus || 0);
    const budgetDepasse = revenuTotal > 0 && bilan.totalDepenses > revenuTotal * 0.9; // >90% du budget consommé
    const margeNegative = bilan.margePrevisionnelle < 0;
    const margeFaible = !margeNegative && bilan.tauxMargePrevi < 15;

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button onClick={() => { setView(null); setSelectedChantier?.(null); }} className={`p-2.5 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center`}><ArrowLeft size={20} className={textPrimary} /></button>
          <div className="flex-1 min-w-0"><h1 className={`text-lg sm:text-2xl font-bold truncate ${textPrimary}`}>{ch.nom}</h1><p className={`text-xs sm:text-sm ${textMuted} truncate`}>{client?.nom} · {ch.adresse}</p></div>
          <select
            value={ch.statut}
            onChange={e => updateChantier(ch.id, { statut: e.target.value })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer border-0 outline-none appearance-none pr-7 bg-no-repeat bg-right min-h-[44px] ${
              ch.statut === 'en_cours' ? (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700')
              : ch.statut === 'termine' ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
              : (isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700')
            }`}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '16px', backgroundPosition: 'right 8px center' }}
          >
            <option value="prospect">Prospect</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
          </select>
        </div>

        {/* Alertes */}
        {(margeNegative || budgetDepasse || margeFaible) && (
          <div className={`rounded-2xl p-4 ${margeNegative ? (isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200') : budgetDepasse ? (isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200') : (isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200')}`}>
            <div className="flex items-center gap-3">
              {margeNegative ? <TrendingDown size={24} className="text-red-500" /> : budgetDepasse ? <AlertTriangle size={24} className="text-amber-500" /> : <AlertCircle size={24} className="text-blue-500" />}
              <div>
                <p className={`font-semibold ${margeNegative ? (isDark ? 'text-red-400' : 'text-red-700') : budgetDepasse ? (isDark ? 'text-amber-400' : 'text-amber-700') : (isDark ? 'text-blue-400' : 'text-blue-700')}`}>
                  {margeNegative ? 'Chantier en perte' : budgetDepasse ? 'Budget presque epuise' : 'Marge faible'}
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {margeNegative
                    ? `Les depenses (${formatMoney(bilan.totalDepenses)}) depassent le revenu prevu (${formatMoney(revenuTotal)}).`
                    : budgetDepasse
                    ? `Vous avez consomme ${((bilan.totalDepenses / revenuTotal) * 100).toFixed(0)}% du budget. Surveillez les couts.`
                    : `Marge previsionnelle de ${formatPct(bilan.tauxMargePrevi)} - en dessous de 15%.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Résumé Financier Principal */}
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-5`}>
          {/* Titre et marge */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {bilan.margePrevisionnelle < 0 ? (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-red-900/50' : 'bg-red-100'}`}>
                  <TrendingDown size={20} className="text-red-500" />
                </div>
              ) : bilan.tauxMargePrevi < 15 ? (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-900/50' : 'bg-amber-100'}`}>
                  <AlertTriangle size={20} className="text-amber-500" />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
                  <TrendingUp size={20} className="text-emerald-500" />
                </div>
              )}
              <div>
                <p className={`text-xs ${textMuted}`}>Marge previsionnelle</p>
                <p className={`font-bold text-xl ${bilan.margePrevisionnelle < 0 ? 'text-red-500' : bilan.tauxMargePrevi < 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {formatMoney(bilan.margePrevisionnelle)} <span className="text-sm opacity-80">({formatPct(bilan.tauxMargePrevi)})</span>
                </p>
              </div>
            </div>
            {devisLie && (
              <span className={`text-xs px-3 py-1.5 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                Lie au devis {devisLie.numero}
              </span>
            )}
          </div>

          {/* Quick Stats - 3 key metrics for mobile */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>
              <p className={`text-[10px] uppercase tracking-wider ${textMuted}`}>Marge</p>
              <p className={`text-lg font-bold ${bilan.tauxMarge < 0 ? 'text-red-500' : bilan.tauxMarge < 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {formatPct(bilan.tauxMarge)}
              </p>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>
              <p className={`text-[10px] uppercase tracking-wider ${textMuted}`}>Reste</p>
              <p className={`text-lg font-bold ${revenuTotal - bilan.totalDepenses < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {formatMoney(Math.max(0, revenuTotal - bilan.totalDepenses))}
              </p>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-white border'}`}>
              <p className={`text-[10px] uppercase tracking-wider ${textMuted}`}>Avancement</p>
              <p className={`text-lg font-bold ${textPrimary}`}>{avancement.toFixed(0)}%</p>
            </div>
          </div>

          {/* Grille Revenus vs Dépenses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Colonne Revenus */}
            <div className={`rounded-xl p-4 border ${isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight size={16} className="text-emerald-500" />
                <h4 className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Revenus</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${textSecondary}`}>Montant devis</span>
                  <span className={`font-semibold ${textPrimary}`}>{bilan.revenuPrevu > 0 ? formatMoney(bilan.revenuPrevu) : <span className={textMuted}>Non défini</span>}</span>
                </div>
                {(bilan.adjRevenus || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${textSecondary}`}>Travaux supplémentaires</span>
                    <span className="font-semibold text-emerald-600">+{formatMoney(bilan.adjRevenus)}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center pt-2 border-t ${isDark ? 'border-emerald-800' : 'border-emerald-200'}`}>
                  <span className={`font-medium ${textPrimary}`}>Total prévu</span>
                  <span className="font-bold text-lg" style={{ color: couleur }}>{formatMoney(revenuTotal)}</span>
                </div>
                {bilan.revenuEncaisse > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className={textMuted}>Déjà encaissé</span>
                    <span className="text-emerald-600">{formatMoney(bilan.revenuEncaisse)}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowAjustement('REVENU')} className={`mt-3 w-full py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 ${isDark ? 'bg-emerald-800/50 text-emerald-300 hover:bg-emerald-800' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                <Plus size={14} /> Ajouter un revenu
              </button>
            </div>

            {/* Colonne Dépenses */}
            <div className={`rounded-xl p-4 border ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownRight size={16} className="text-red-500" />
                <h4 className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>Dépenses</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center cursor-pointer hover:opacity-80" onClick={() => setShowQuickMateriau(true)}>
                  <span className={`text-sm ${textSecondary} flex items-center gap-1.5`}><Package size={14} /> Matériaux</span>
                  <span className={`font-semibold ${textPrimary}`}>{formatMoney(bilan.coutMateriaux)}</span>
                </div>
                <div className="flex justify-between items-center cursor-pointer hover:opacity-80" onClick={() => setShowMODetail(true)}>
                  <span className={`text-sm ${textSecondary} flex items-center gap-1.5`}><UserCog size={14} /> Main d'oeuvre ({bilan.heuresTotal}h)</span>
                  <span className={`font-semibold ${textPrimary}`}>{formatMoney(bilan.coutMO)}</span>
                </div>
                {(bilan.coutAutres || 0) > 0 && (
                  <div className="flex justify-between items-center cursor-pointer hover:opacity-80" onClick={() => setShowAjustement('DEPENSE')}>
                    <span className={`text-sm ${textSecondary}`}>Autres frais</span>
                    <span className={`font-semibold ${textPrimary}`}>{formatMoney(bilan.coutAutres)}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center pt-2 border-t ${isDark ? 'border-red-800' : 'border-red-200'}`}>
                  <span className={`font-medium ${textPrimary}`}>Total dépenses</span>
                  <span className="font-bold text-lg text-red-500">{formatMoney(bilan.totalDepenses)}</span>
                </div>
              </div>
              <button onClick={() => setShowQuickMateriau(true)} className={`mt-3 w-full py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 ${isDark ? 'bg-red-800/50 text-red-300 hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                <Plus size={14} /> Ajouter une dépense
              </button>
            </div>
          </div>

          {/* Budget restant */}
          {revenuTotal > 0 && (
            <div className={`mt-4 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${textSecondary}`}>Budget consommé</span>
                <span className={`font-semibold ${bilan.totalDepenses > revenuTotal ? 'text-red-500' : textPrimary}`}>
                  {formatMoney(bilan.totalDepenses)} / {formatMoney(revenuTotal)} ({((bilan.totalDepenses / revenuTotal) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                <div
                  className={`h-full rounded-full transition-all ${bilan.totalDepenses > revenuTotal ? 'bg-red-500' : bilan.totalDepenses > revenuTotal * 0.9 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (bilan.totalDepenses / revenuTotal) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className={textMuted}>Reste: <span className={bilan.margePrevisionnelle < 0 ? 'text-red-500' : 'text-emerald-500'}>{formatMoney(revenuTotal - bilan.totalDepenses)}</span></span>
                <button onClick={() => { setBudgetForm({ budget_estime: ch.budget_estime?.toString() || '' }); setShowEditBudget(true); }} className="flex items-center gap-1 hover:underline" style={{ color: couleur }}>
                  <Edit3 size={12} /> Modifier budget
                </button>
              </div>
            </div>
          )}

          {/* Avancement */}
          <div className={`mt-4 p-4 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className={`text-sm font-medium ${textPrimary}`}>Avancement du chantier</span>
              <span className="font-bold text-lg" style={{ color: couleur }}>{avancement.toFixed(0)}%</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={avancement}
                onChange={e => updateChantier(ch.id, { avancement: parseInt(e.target.value) })}
                className="w-full h-2 appearance-none cursor-pointer rounded-full"
                style={{
                  background: `linear-gradient(to right, ${couleur} 0%, ${couleur} ${avancement}%, ${isDark ? '#475569' : '#e2e8f0'} ${avancement}%, ${isDark ? '#475569' : '#e2e8f0'} 100%)`,
                  WebkitAppearance: 'none'
                }}
              />
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: ${couleur};
                  cursor: pointer;
                  border: 3px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: ${couleur};
                  cursor: pointer;
                  border: 3px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
              `}</style>
            </div>
          </div>

          {/* Projection */}
          {avancement > 0 && avancement < 100 && revenuTotal > 0 && (
            <div className={`mt-4 rounded-xl p-4 border-2 border-dashed ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Target size={18} style={{ color: couleur }} />
                <h4 className={`font-medium ${textPrimary}`}>Projection fin de chantier</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'} ${textMuted}`}>Estimation</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'} text-center`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Dépenses totales estimées</p>
                  <p className="font-bold text-red-500 text-lg">{formatMoney(depensesFinalesEstimees)}</p>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'} text-center`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Bénéfice projeté</p>
                  <p className={`font-bold text-lg ${getMargeColor(tauxMargeProjecte)}`}>{formatMoney(beneficeProjecte)}</p>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'} text-center`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Marge projetée</p>
                  <p className={`font-bold text-lg ${getMargeColor(tauxMargeProjecte)}`}>{formatPct(tauxMargeProjecte)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Onglets */}
        <div className={`flex gap-1 border-b overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {[
            { key: 'finances', label: 'Finances', icon: Wallet },
            { key: 'taches', label: 'Tâches', icon: CheckSquare },
            { key: 'photos', label: 'Photos', icon: Camera },
            { key: 'notes', label: 'Notes', icon: StickyNote },
            { key: 'messages', label: 'Messages', icon: MessageSquare }
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium min-h-[44px] transition-colors ${activeTab === key ? 'text-white' : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`} style={activeTab === key ? { background: couleur } : {}}>
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'finances' && (
          <div className="space-y-4">
            {adjRevenus.length > 0 && (
              <div className={`${cardBg} rounded-2xl border p-5`}>
                <h3 className="font-semibold mb-3 text-emerald-600"> Ajustements Revenus</h3>
                {adjRevenus.map(a => (<div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0"><span>{a.libelle}</span><div className="flex items-center gap-3"><span className="font-bold text-emerald-600">+{formatMoney(a.montant_ht)}</span><button onClick={() => deleteAjustement(a.id)} className="text-red-400 hover:text-red-600">x</button></div></div>))}
              </div>
            )}
            {adjDepenses.length > 0 && (
              <div className={`${cardBg} rounded-2xl border p-5`}>
                <h3 className="font-semibold mb-3 text-red-600"> Ajustements Dépenses</h3>
                {adjDepenses.map(a => (<div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0"><span>{a.libelle}</span><div className="flex items-center gap-3"><span className="font-bold text-red-600">-{formatMoney(a.montant_ht)}</span><button onClick={() => deleteAjustement(a.id)} className="text-red-400 hover:text-red-600">x</button></div></div>))}
              </div>
            )}
            <div className={`${cardBg} rounded-2xl border p-5`}>
              <h3 className={`font-semibold mb-4 ${textPrimary}`}>Dépenses Matériaux</h3>
              <div className="space-y-2 mb-4">{chDepenses.map(d => (<div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}><span className={`text-sm w-24 ${textMuted}`}>{new Date(d.date).toLocaleDateString('fr-FR')}</span><span className={`flex-1 ${textPrimary}`}>{d.description}</span><span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{d.categorie}</span><span className="font-bold text-red-500">{formatMoney(d.montant)}</span></div>))}{chDepenses.length === 0 && <p className={`text-center py-4 ${textMuted}`}>Aucune dépense</p>}</div>
              <div className="flex gap-2 flex-wrap">
                <select value={newDepense.catalogueId} onChange={e => { const item = catalogue?.find(c => c.id === e.target.value); if (item) setNewDepense(p => ({...p, catalogueId: e.target.value, description: item.nom, montant: item.prixAchat?.toString() || '' })); }} className={`px-3 py-2.5 border rounded-xl text-sm ${inputBg}`}><option value="">Catalogue...</option>{catalogue?.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.prixAchat}€)</option>)}</select>
                <input placeholder="Ex: Carrelage, Peinture murale..." value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} className={`flex-1 min-w-[150px] px-4 py-2.5 border rounded-xl ${inputBg}`} />
                <input type="number" placeholder="€ HT" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} className={`w-28 px-4 py-2.5 border rounded-xl ${inputBg}`} />
                <button onClick={addDepenseToChantier} className="px-4 py-2.5 text-white rounded-xl min-h-[44px]" style={{background: couleur}}>+</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'taches' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 ${textPrimary}`}>✅ Tâches {tasksTotal > 0 && `(${tasksDone}/${tasksTotal})`}</h3>
            {tasksTotal > 0 && <div className={`w-full h-2 rounded-full mb-4 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}><div className="h-full rounded-full" style={{width: `${(tasksDone/tasksTotal)*100}%`, background: couleur}} /></div>}
            <div className="space-y-2 mb-4">{ch.taches?.map(t => (<div key={t.id} onClick={() => toggleTache(t.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${t.done ? (isDark ? 'bg-emerald-900/30' : 'bg-emerald-50') : (isDark ? 'bg-slate-700' : 'bg-slate-50')}`}><span className="text-xl">{t.done ? '✅' : '⬜'}</span><span className={`${textPrimary} ${t.done ? 'line-through opacity-50' : ''}`}>{t.text}</span></div>))}</div>
            <div className="flex gap-2"><input placeholder="Ex: Poser le carrelage salle de bain..." value={newTache} onChange={e => setNewTache(e.target.value)} onKeyPress={e => e.key === 'Enter' && addTache()} className={`flex-1 px-4 py-2.5 border rounded-xl ${inputBg}`} /><button onClick={addTache} className="px-4 py-2.5 text-white rounded-xl" style={{background: couleur}}>+</button></div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="font-semibold"> Carnet Photos</h3>
              <div className="flex gap-2 flex-wrap">{PHOTO_CATS.map(cat => (<label key={cat} className="px-3 py-1.5 text-white rounded-lg cursor-pointer text-xs" style={{background: cat === 'litige' ? '#ef4444' : cat === 'avant' ? '#3b82f6' : cat === 'après' ? '#22c55e' : couleur}}>+ {cat}<input type="file" accept="image/*" capture="environment" onChange={e => handlePhotoAdd(e, cat)} className="hidden" /></label>))}</div>
            </div>
            {(!ch.photos || ch.photos.length === 0) ? <p className="text-slate-400 text-center py-8">Aucune photo</p> : (
              <div className="space-y-4">{PHOTO_CATS.map(cat => { const catPhotos = (ch.photos || []).filter(p => p.categorie === cat); if (catPhotos.length === 0) return null; return (<div key={cat}><p className="text-sm font-medium mb-2 capitalize">{cat} ({catPhotos.length})</p><div className="flex gap-2 flex-wrap">{catPhotos.map(p => (<div key={p.id} className="relative group cursor-pointer" onClick={() => setPhotoPreview(p)}><img src={p.src} className="w-24 h-24 object-cover rounded-xl hover:opacity-90 transition-opacity" alt="" /><button onClick={(e) => { e.stopPropagation(); deletePhoto(p.id); }} className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center shadow-md"><X size={14} /></button></div>))}</div></div>); })}</div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><StickyNote size={18} /> Notes</h3>
            <textarea className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} rows={6} value={ch.notes || ''} onChange={e => updateChantier(ch.id, { notes: e.target.value })} placeholder="Contraintes d'accès, contacts sur site, détails importants..." />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><MessageSquare size={18} style={{ color: couleur }} /> Historique des échanges</h3>
            <p className={`text-sm ${textMuted} mb-4`}>Centralisez ici tous vos échanges avec le client (emails, SMS, appels...).</p>

            {/* Existing messages */}
            <div className="space-y-3 mb-4">
              {(!ch.messages || ch.messages.length === 0) ? (
                <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                  <MessageSquare size={32} className={`mx-auto mb-2 ${textMuted}`} />
                  <p className={textMuted}>Aucun échange enregistré</p>
                </div>
              ) : (
                ch.messages.map(msg => (
                  <div key={msg.id} className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${msg.type === 'email' ? 'bg-blue-100 text-blue-700' : msg.type === 'sms' ? 'bg-green-100 text-green-700' : msg.type === 'appel' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>{msg.type === 'email' ? 'Email' : msg.type === 'sms' ? 'SMS' : msg.type === 'appel' ? 'Appel' : 'Note'}</span>
                      <span className={`text-xs ${textMuted}`}>{new Date(msg.date).toLocaleDateString('fr-FR')} - {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => updateChantier(ch.id, { messages: ch.messages.filter(m => m.id !== msg.id) })} className="ml-auto p-1 rounded text-red-400 hover:bg-red-50"><X size={14} /></button>
                    </div>
                    <p className={`text-sm ${textPrimary}`}>{msg.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add new message */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex gap-2 mb-3">
                {['email', 'sms', 'appel', 'note'].map(type => (
                  <button key={type} onClick={() => setNewMessage && setNewMessage(p => ({ ...p, type }))} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${(newMessage?.type || 'email') === type ? 'text-white' : isDark ? 'bg-slate-600 text-slate-300' : 'bg-white text-slate-600'}`} style={(newMessage?.type || 'email') === type ? { background: couleur } : {}}>
                    {type === 'email' ? 'Email' : type === 'sms' ? 'SMS' : type === 'appel' ? 'Appel' : 'Note'}
                  </button>
                ))}
              </div>
              <textarea className={`w-full px-3 py-2 border rounded-xl text-sm ${inputBg}`} rows={2} placeholder="Résumer l'échange avec le client..." value={newMessage?.content || ''} onChange={e => setNewMessage && setNewMessage(p => ({ ...p, content: e.target.value }))} />
              <button onClick={() => {
                if (!newMessage?.content) return;
                const msg = { id: generateId(), type: newMessage.type || 'email', content: newMessage.content, date: new Date().toISOString() };
                updateChantier(ch.id, { messages: [...(ch.messages || []), msg] });
                setNewMessage && setNewMessage({ type: 'email', content: '' });
              }} className="mt-2 px-4 py-2 text-white rounded-xl text-sm flex items-center gap-2" style={{ background: couleur }}>
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Photo Preview Modal */}
        {photoPreview && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setPhotoPreview(null)}>
            {/* Top buttons */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <a
                href={photoPreview.src}
                download={`photo_${photoPreview.categorie}_${new Date(photoPreview.date).toISOString().split('T')[0]}.jpg`}
                onClick={(e) => e.stopPropagation()}
                className="text-white p-2.5 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2"
                title="Telecharger"
              >
                <Download size={20} />
              </a>
              <button onClick={() => setPhotoPreview(null)} className="text-white p-2.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <img src={photoPreview.src} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" alt="" onClick={(e) => e.stopPropagation()} />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm">
              <span className="capitalize">{photoPreview.categorie}</span> · {new Date(photoPreview.date).toLocaleDateString('fr-FR')}
            </div>
          </div>
        )}

        {/* Modal Ajustement */}
        {showAjustement && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>{showAjustement === 'REVENU' ? ' Ajustement Revenu' : ' Ajustement Dépense'}</h3>
              <p className="text-sm text-slate-500 mb-4">{showAjustement === 'REVENU' ? 'Ex: Travaux supplémentaires acceptés' : 'Ex: Achat imprévu, sous-traitance...'}</p>
              <div className="space-y-4">
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex: Travaux supplémentaires, Remise..." value={adjForm.libelle} onChange={e => setAdjForm(p => ({...p, libelle: e.target.value}))} />
                <input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Montant € HT" value={adjForm.montant_ht} onChange={e => setAdjForm(p => ({...p, montant_ht: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => { setShowAjustement(null); setAdjForm({ libelle: '', montant_ht: '' }); }} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={handleAddAjustement} className="px-4 py-2 text-white rounded-xl" style={{background: showAjustement === 'REVENU' ? '#22c55e' : '#ef4444'}}>Ajouter</button></div>
            </div>
          </div>
        )}

        {/* Modal Ajouter une dépense */}
        {showQuickMateriau && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowQuickMateriau(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>💰 Ajouter une dépense</h3>
              <p className={`text-sm ${textMuted} mb-4`}>Enregistrez un achat ou une dépense sur ce chantier</p>

              {/* Sélection depuis catalogue */}
              {catalogue && catalogue.length > 0 && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Depuis le catalogue</label>
                  <select
                    className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                    value={newDepense.catalogueId}
                    onChange={e => {
                      const item = catalogue.find(c => c.id === e.target.value);
                      if (item) {
                        const prix = item.prixAchat || item.prix || 0;
                        setNewDepense(p => ({
                          ...p,
                          catalogueId: e.target.value,
                          description: item.nom,
                          prixUnitaire: prix.toString(),
                          montant: (prix * (p.quantite || 1)).toString()
                        }));
                      }
                    }}
                  >
                    <option value="">Choisir un article...</option>
                    {catalogue.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.prixAchat || c.prix}€/{c.unite || 'unité'})</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Description *</label>
                  <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex: Sac de ciment 35kg" value={newDepense.description} onChange={e => setNewDepense(p => ({...p, description: e.target.value}))} />
                </div>

                {/* Quantité et prix unitaire */}
                {newDepense.catalogueId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Quantité</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const qty = Math.max(1, (parseInt(newDepense.quantite) || 1) - 1);
                            const prix = parseFloat(newDepense.prixUnitaire) || 0;
                            setNewDepense(p => ({...p, quantite: qty, montant: (prix * qty).toString()}));
                          }}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >-</button>
                        <input
                          type="number"
                          min="1"
                          className={`flex-1 px-3 py-2.5 border rounded-xl text-center ${inputBg}`}
                          value={newDepense.quantite}
                          onChange={e => {
                            const qty = parseInt(e.target.value) || 1;
                            const prix = parseFloat(newDepense.prixUnitaire) || 0;
                            setNewDepense(p => ({...p, quantite: qty, montant: (prix * qty).toString()}));
                          }}
                        />
                        <button
                          onClick={() => {
                            const qty = (parseInt(newDepense.quantite) || 1) + 1;
                            const prix = parseFloat(newDepense.prixUnitaire) || 0;
                            setNewDepense(p => ({...p, quantite: qty, montant: (prix * qty).toString()}));
                          }}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >+</button>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Prix unitaire</label>
                      <div className="relative">
                        <input
                          type="number"
                          className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                          value={newDepense.prixUnitaire}
                          onChange={e => {
                            const prix = parseFloat(e.target.value) || 0;
                            const qty = parseInt(newDepense.quantite) || 1;
                            setNewDepense(p => ({...p, prixUnitaire: e.target.value, montant: (prix * qty).toString()}));
                          }}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted}`}>€</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Montant total TTC *</label>
                  <div className="relative">
                    <input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex: 150" value={newDepense.montant} onChange={e => setNewDepense(p => ({...p, montant: e.target.value}))} />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted}`}>€</span>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Catégorie</label>
                  <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={newDepense.categorie} onChange={e => setNewDepense(p => ({...p, categorie: e.target.value}))}>
                    <option value="Matériaux">Matériaux</option>
                    <option value="Outillage">Outillage</option>
                    <option value="Location">Location</option>
                    <option value="Sous-traitance">Sous-traitance</option>
                    <option value="Transport">Transport</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowQuickMateriau(false); setNewDepense({ description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '' }); }} className={`flex-1 px-4 py-2.5 rounded-xl min-h-[44px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
                <button onClick={addDepenseToChantier} disabled={!newDepense.description || !newDepense.montant} className="flex-1 px-4 py-2.5 text-white rounded-xl disabled:opacity-50 min-h-[44px]" style={{background: couleur}}>Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal MO */}
        {showMODetail && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-lg animate-slide-up sm:animate-fade-in max-h-[85vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">⏱ Détail Main d'oeuvre</h3><button onClick={() => setShowAddMO(true)} className="px-3 py-1.5 text-sm text-white rounded-lg" style={{background: couleur}}>+ Heures</button></div>
              <div className="space-y-2 mb-4">{chPointages.map(p => { const emp = equipe.find(e => e.id === p.employeId); const cout = emp?.coutHoraireCharge || 28; return (
                <div key={p.id} className={`p-3 rounded-xl ${p.manuel ? 'bg-blue-50' : 'bg-slate-50'} ${p.verrouille ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span>{p.approuve ? '[OK]' : '⏳'}</span>{p.manuel && <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">Manuel</span>}{p.verrouille && <span className="text-xs bg-slate-400 text-white px-2 py-0.5 rounded"></span>}</div>{!p.verrouille && <button onClick={() => deletePointage(p.id)} className="text-red-400"></button>}</div>
                  <div className="grid grid-cols-4 gap-2 mt-2 text-sm"><div><p className="text-xs text-slate-500">Date</p><input type="date" value={p.date} onChange={e => handleEditPointage(p.id, 'date', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded text-xs" /></div><div><p className="text-xs text-slate-500">Employé</p><p className="font-medium">{emp?.nom}</p></div><div><p className="text-xs text-slate-500">Heures</p><input type="number" step="0.5" value={p.heures} onChange={e => handleEditPointage(p.id, 'heures', e.target.value)} disabled={p.verrouille} className="w-full px-2 py-1 border rounded" /></div><div><p className="text-xs text-slate-500">Coût</p><p className="font-bold text-blue-600">{formatMoney(p.heures * cout)}</p></div></div>
                </div>
              ); })}{chPointages.length === 0 && <p className="text-center text-slate-400 py-4">Aucun pointage</p>}</div>
              <div className="border-t pt-4 flex justify-between items-center"><span className="font-semibold">Total</span><span className="text-xl font-bold text-blue-600">{formatMoney(bilan.coutMO)}</span></div>
              <button onClick={() => setShowMODetail(false)} className={`w-full mt-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Fermer</button>
            </div>
          </div>
        )}

        {/* Modal Ajout MO */}
        {showAddMO && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto`}>
              <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>+ Ajouter des heures</h3>
              <div className="space-y-4">
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.employeId} onChange={e => setMoForm(p => ({...p, employeId: e.target.value}))}><option value="">Employé *</option>{equipe.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}</select>
                <div className="grid grid-cols-2 gap-4"><input type="date" className={`px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.date} onChange={e => setMoForm(p => ({...p, date: e.target.value}))} /><input type="number" step="0.5" placeholder="Nb heures *" className={`px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.heures} onChange={e => setMoForm(p => ({...p, heures: e.target.value}))} /></div>
                <input placeholder="Ex: Pose carrelage salle de bain..." className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={moForm.note} onChange={e => setMoForm(p => ({...p, note: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowAddMO(false)} className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button><button onClick={handleAddMO} className="px-4 py-2 text-white rounded-xl" style={{background: couleur}}>Ajouter</button></div>
            </div>
          </div>
        )}

        {/* Modal Edit Budget */}
        {showEditBudget && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowEditBudget(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md animate-slide-up sm:animate-fade-in`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>Modifier le budget</h3>
              <p className={`text-sm ${textMuted} mb-4`}>Définissez le budget prévisionnel HT pour ce chantier.</p>
              {devisLie && (
                <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    Ce chantier est lié au devis <strong>{devisLie.numero}</strong> ({formatMoney(devisHT)}).
                    Le budget du devis sera utilisé par défaut.
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Budget estimé HT</label>
                  <div className="relative">
                    <DollarSign size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                    <input
                      type="number"
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-xl ${inputBg}`}
                      placeholder="Ex: 15000"
                      value={budgetForm.budget_estime}
                      onChange={e => setBudgetForm({ budget_estime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditBudget(false)} className={`flex-1 px-4 py-2.5 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
                <button
                  onClick={() => {
                    updateChantier(ch.id, { budget_estime: budgetForm.budget_estime ? parseFloat(budgetForm.budget_estime) : undefined });
                    setShowEditBudget(false);
                  }}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl"
                  style={{ background: couleur }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Formulaire création
  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm(p => ({
      ...p,
      client_id: clientId,
      adresse: client?.adresse || p.adresse,
      nom: client ? `${client.nom} - ${p.nom || 'Nouveau chantier'}` : p.nom
    }));
  };

  // Get devis acceptés sans chantier pour suggestion
  const devisDisponibles = devis.filter(d => d.type === 'devis' && d.statut === 'accepte' && !d.chantier_id);

  if (show) return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setShow(false)} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-xl transition-colors`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Nouveau chantier</h1>
          <p className={`text-sm ${textMuted}`}>Créez un chantier pour suivre vos dépenses et votre rentabilité</p>
        </div>
      </div>

      {/* Suggestion de devis disponibles */}
      {devisDisponibles.length > 0 && (
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-5`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <FileText size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>Devis acceptés disponibles</h3>
              <p className={`text-sm ${textMuted}`}>Créez un chantier à partir d'un devis existant</p>
            </div>
          </div>
          <div className="space-y-2">
            {devisDisponibles.slice(0, 3).map(d => {
              const client = clients.find(c => c.id === d.client_id);
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setForm(p => ({
                      ...p,
                      nom: `${client?.nom || 'Client'} - ${d.lignes?.[0]?.description || 'Chantier'}`.substring(0, 60),
                      client_id: d.client_id,
                      adresse: client?.adresse || '',
                      budget_estime: d.total_ht?.toString() || '',
                      notes: `Lié au devis ${d.numero}`
                    }));
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all hover:shadow-md ${isDark ? 'border-slate-600 hover:border-slate-500 bg-slate-700/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{d.numero}</p>
                      <p className={`text-sm ${textMuted}`}>{client?.nom} · {d.lignes?.[0]?.description?.substring(0, 30)}...</p>
                    </div>
                    <span className="font-bold" style={{ color: couleur }}>{(d.total_ht || 0).toLocaleString('fr-FR')} €</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        {/* Section principale avec icônes */}
        <div className="space-y-4">
          {/* Nom du chantier */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
              <Building2 size={16} style={{ color: couleur }} />
              Nom du chantier *
            </label>
            <input
              className={`w-full px-4 py-3 border rounded-xl text-base ${inputBg}`}
              value={form.nom}
              onChange={e => setForm(p => ({...p, nom: e.target.value}))}
              placeholder="Ex: Rénovation cuisine, Extension maison..."
            />
          </div>

          {/* Client et Adresse en ligne */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <Users size={16} style={{ color: couleur }} />
                Client
              </label>
              <select
                className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                value={form.client_id}
                onChange={e => handleClientChange(e.target.value)}
              >
                <option value="">Sélectionner un client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
              </select>
            </div>
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <MapPin size={16} style={{ color: couleur }} />
                Adresse du chantier
              </label>
              <input
                className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                value={form.adresse}
                onChange={e => setForm(p => ({...p, adresse: e.target.value}))}
                placeholder="Ex: 12 rue des Lilas, 75011 Paris"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <Calendar size={16} style={{ color: couleur }} />
                Date début
              </label>
              <input
                type="date"
                className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                value={form.date_debut}
                onChange={e => setForm(p => ({...p, date_debut: e.target.value}))}
              />
            </div>
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <Calendar size={16} className={textMuted} />
                Date fin prévue
              </label>
              <input
                type="date"
                className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                value={form.date_fin}
                onChange={e => setForm(p => ({...p, date_fin: e.target.value}))}
              />
            </div>
          </div>

          {/* Budget - Visible by default with quick-fill */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
              <DollarSign size={16} style={{ color: couleur }} />
              Budget estimé HT
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                  value={form.budget_estime}
                  onChange={e => setForm(p => ({...p, budget_estime: e.target.value}))}
                  placeholder="Ex: 15000"
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted}`}>€</span>
              </div>
              {/* Quick-fill buttons from devis */}
              {devisDisponibles.length > 0 && (
                <div className="flex gap-1">
                  {devisDisponibles.slice(0, 2).map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setForm(p => ({...p, budget_estime: d.total_ht?.toString() || ''}))}
                      className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all hover:scale-105 ${
                        form.budget_estime === d.total_ht?.toString()
                          ? 'text-white'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                      style={form.budget_estime === d.total_ht?.toString() ? { backgroundColor: couleur } : {}}
                      title={`Depuis ${d.numero}`}
                    >
                      {(d.total_ht || 0).toLocaleString()}EUR
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.budget_estime && (
              <p className={`text-xs mt-1 ${textMuted}`}>
                Budget TTC (TVA 10%): {(parseFloat(form.budget_estime) * 1.1).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} EUR
              </p>
            )}
          </div>
        </div>

        {/* Options avancées toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`mt-6 flex items-center gap-2 text-sm font-medium ${textMuted} hover:opacity-80 transition-all`}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${showAdvanced ? '' : isDark ? 'bg-slate-700' : 'bg-slate-100'}`} style={showAdvanced ? { background: couleur } : {}}>
            <ChevronRight size={14} className={`transition-transform ${showAdvanced ? 'rotate-90 text-white' : ''}`} />
          </div>
          Options avancees (statut, notes)
        </button>

        {/* Options avancées */}
        {showAdvanced && (
          <div className={`mt-4 pt-4 border-t space-y-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <Target size={16} style={{ color: couleur }} />
                Statut initial
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'prospect', label: 'Prospect', icon: '⏳' },
                  { value: 'en_cours', label: 'En cours', icon: '🔨' },
                  { value: 'termine', label: 'Termine', icon: '✅' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({...p, statut: opt.value}))}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 ${
                      form.statut === opt.value
                        ? 'text-white shadow-lg'
                        : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}
                    style={form.statut === opt.value ? { backgroundColor: couleur } : {}}
                  >
                    <span>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <FileText size={16} style={{ color: couleur }} />
                Notes / Description
              </label>
              <textarea
                className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                rows={3}
                value={form.notes}
                onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                placeholder="Contraintes d'accès, spécificités du chantier..."
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            onClick={() => { setShow(false); setShowAdvanced(false); }}
            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 min-h-[44px] transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            <X size={16} />
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!form.nom}
            className="px-6 py-2.5 text-white rounded-xl flex items-center gap-2 min-h-[44px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{background: couleur}}
          >
            <Check size={16} />
            Créer le chantier
          </button>
        </div>
      </div>
    </div>
  );

  // Sorting logic
  const getSortedChantiers = () => {
    const sorted = [...chantiers];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      case 'status':
        const statusOrder = { en_cours: 0, prospect: 1, termine: 2 };
        return sorted.sort((a, b) => (statusOrder[a.statut] || 2) - (statusOrder[b.statut] || 2));
      case 'margin':
        return sorted.sort((a, b) => getChantierBilan(b.id).tauxMarge - getChantierBilan(a.id).tauxMarge);
      case 'recent':
      default:
        return sorted.sort((a, b) => new Date(b.date_debut || 0) - new Date(a.date_debut || 0));
    }
  };

  // Liste
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Chantiers ({chantiers.length})</h1>
        <button onClick={() => setShow(true)} className="px-3 sm:px-4 py-2 text-white rounded-xl text-sm min-h-[44px] flex items-center gap-1.5 hover:shadow-lg transition-all" style={{background: couleur}}>
          <Plus size={16} /><span className="hidden sm:inline">Nouveau</span>
        </button>
      </div>

      {/* Sorting options */}
      {chantiers.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className={`text-sm ${textMuted} flex items-center gap-1`}><ArrowUpDown size={14} /> Trier:</span>
          {[
            { key: 'recent', label: 'Recent' },
            { key: 'name', label: 'Nom' },
            { key: 'status', label: 'Statut' },
            { key: 'margin', label: 'Marge' }
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

      {chantiers.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          {/* Header with gradient */}
          <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

            <div className="relative">
              {/* Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
                <Building2 size={40} className="text-white" />
              </div>

              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>Commencez à suivre vos chantiers</h2>
              <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
                Gérez vos projets, suivez vos dépenses et contrôlez votre rentabilité en temps réel.
              </p>
            </div>
          </div>

          {/* Features grid */}
          <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
            <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>Ce que vous pouvez faire</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <DollarSign size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>Suivi financier</p>
                  <p className={`text-xs ${textMuted}`}>Dépenses, revenus et marge</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <Camera size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>Carnet photos</p>
                  <p className={`text-xs ${textMuted}`}>Avant, pendant, après</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                  <CheckSquare size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium text-sm ${textPrimary}`}>Liste de tâches</p>
                  <p className={`text-xs ${textMuted}`}>Suivez l'avancement</p>
                </div>
              </div>
            </div>

            <button onClick={() => setShow(true)} className="w-full sm:w-auto px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium" style={{ background: couleur }}>
              <Plus size={18} />
              Créer mon premier chantier
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {getSortedChantiers().map(ch => {
            const client = clients.find(c => c.id === ch.client_id);
            const bilan = getChantierBilan(ch.id);
            const devisLie = devis?.find(d => d.chantier_id === ch.id && d.type === 'devis');
            const budgetPrevu = devisLie?.total_ht || ch.budget_estime || 0;
            const hasAlert = bilan.tauxMarge < 0;
            const statusLabel = ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Termine' : 'Prospect';
            const statusColor = ch.statut === 'en_cours'
              ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
              : ch.statut === 'termine'
              ? (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600')
              : (isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700');
            return (
              <div key={ch.id} onClick={() => setView(ch.id)} className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${hasAlert ? (isDark ? 'border-red-700' : 'border-red-300') : ''}`}>
                {/* Header with status */}
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0 overflow-hidden pr-1">
                    <h3 className={`font-semibold text-base truncate ${textPrimary}`}>{ch.nom}</h3>
                    <p className={`text-sm ${textMuted} truncate`}>{client?.nom || 'Sans client'}{ch.adresse ? ` - ${ch.adresse}` : ''}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
                {/* Stats row */}
                <div className={`flex items-center gap-2 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <span className={`font-bold flex-shrink-0 ${getMargeColor(bilan.tauxMarge)}`}>{formatMoney(bilan.marge)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${bilan.tauxMarge < 0 ? (isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600') : bilan.tauxMarge < 15 ? (isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600') : (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600')}`}>{formatPct(bilan.tauxMarge)}</span>
                  <span className={`text-sm ${textMuted} flex-1 text-right truncate min-w-0`}>
                    {budgetPrevu > 0 ? `Budget: ${formatMoney(budgetPrevu)}` : bilan.caHT > 0 ? `CA: ${formatMoney(bilan.caHT)}` : ''}
                  </span>
                  {hasAlert && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                  <ChevronRight size={16} className={`${textMuted} flex-shrink-0`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
