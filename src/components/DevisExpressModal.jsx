/**
 * DevisExpressModal - Modal de création rapide de devis à partir de modèles
 * Flow: Métier → Modèle → Personnalisation → Création
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { sansTva } from '../lib/franchiseTva';
import { X, ChevronLeft, ChevronRight, Search, Check, FileText, Euro, TrendingUp, Minus, Plus, Trash2, Edit3, FolderOpen, UserPlus, Loader2, Star, Clock, RotateCcw } from 'lucide-react';
import { MODELES_DEVIS, getMetiersWithModeles, getModelesByMetier, prepareModeleLignes, calculateModeleTotal, calculateModeleMarge, searchModeles } from '../lib/data/modeles-devis';
import { formatClientName } from '../lib/formatters';
import Modal, { ModalTitle } from './ui/Modal';
import { Bouton } from './ui/Bouton';

// Clé de sauvegarde du brouillon Express (distincte de celle du wizard)
const EXPRESS_DRAFT_KEY = 'mallettico_devis_express_draft';
import TemplateSelector from './TemplateSelector';
import QuickClientModal from './QuickClientModal';
import { jourLocal } from '../lib/dates';
import { calculerTotaux, messageLigneSansDesignation } from '../lib/totauxDocument';

export default function DevisExpressModal({
  isOpen,
  onClose,
  onCreateDevis,
  clients = [],
  addClient,
  isDark = false,
  couleur,
  tvaDefaut = 10,
  // Micro-entreprise en franchise (art. 293 B du CGI) : aucune TVA, même sur les lignes des modèles
  franchise = false,
  recentTemplates = [],
  onTrackUsage,
  customTemplates = [],
}) {
  const [step, setStep] = useState(1); // 1: Métier, 2: Modèle, 3: Personnalisation
  const [selectedMetier, setSelectedMetier] = useState(null);
  const [selectedModele, setSelectedModele] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [remise, setRemise] = useState(0);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [modeleQtys, setModeleQtys] = useState({}); // { modeleId: qty } for step 2 preview
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [creationError, setCreationError] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Theme classes
  const bgMain = 'bg-surface';
  const bgCard = 'bg-fond';
  const bgHover = 'hover:bg-surface-2';
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-3';
  const borderColor = 'border-bord';
  const inputBg = 'bg-surface border-bord-fort';

  // Restaure le brouillon Express à l'ouverture (le travail n'est jamais perdu)
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(EXPRESS_DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (!draft || !(draft.lignes?.length > 0)) return;
      setSelectedMetier(draft.selectedMetier || null);
      setSelectedModele(draft.selectedModele || null);
      setSelectedClient(draft.selectedClientId ? (clients.find(c => c.id === draft.selectedClientId) || null) : null);
      setLignes(draft.lignes || []);
      setNotes(draft.notes || '');
      setRemise(draft.remise || 0);
      setModeleQtys(draft.modeleQtys || {});
      setStep(draft.step || 3);
      setDraftRestored(true);
    } catch { /* draft illisible — on ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Sauvegarde automatique (débounce) tant qu'il y a du travail en cours
  useEffect(() => {
    if (!isOpen || lignes.length === 0) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(EXPRESS_DRAFT_KEY, JSON.stringify({
          step,
          selectedMetier: selectedMetier ? { id: selectedMetier.id, nom: selectedMetier.nom } : null,
          selectedModele: selectedModele ? { id: selectedModele.id, nom: selectedModele.nom, description: selectedModele.description } : null,
          selectedClientId: selectedClient?.id || null,
          lignes,
          notes,
          remise,
          modeleQtys,
        }));
      } catch { /* quota dépassé / mode privé — non bloquant */ }
    }, 500);
    return () => clearTimeout(t);
  }, [isOpen, step, selectedMetier, selectedModele, selectedClient, lignes, notes, remise, modeleQtys]);

  const clearExpressDraft = useCallback(() => {
    try { localStorage.removeItem(EXPRESS_DRAFT_KEY); } catch { /* ignore */ }
  }, []);

  // « Recommencer » : jette le brouillon et repart de zéro (sans fermer)
  const handleDiscardDraft = () => {
    clearExpressDraft();
    setDraftRestored(false);
    setStep(1);
    setSelectedMetier(null);
    setSelectedModele(null);
    setSelectedClient(null);
    setLignes([]);
    setNotes('');
    setRemise(0);
    setModeleQtys({});
  };

  // Reset state
  const handleClose = () => {
    setStep(1);
    setSelectedMetier(null);
    setSelectedModele(null);
    setSelectedClient(null);
    setLignes([]);
    setSearchQuery('');
    setGlobalSearch('');
    setClientSearch('');
    setNotes('');
    setRemise(0);
    setShowTemplateSelector(false);
    setModeleQtys({});
    setIsCreating(false);
    setShowSuccess(false);
    setCreationError(null);
    setDraftRestored(false);
    onClose();
  };

  // Go back
  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      setLignes([]);
    } else if (step === 2) {
      setStep(1);
      setSelectedModele(null);
    }
  };

  // Select métier
  const handleSelectMetier = (metier) => {
    setSelectedMetier(metier);
    setStep(2);
    setSearchQuery('');
  };

  // Select modèle
  const handleSelectModele = (modele) => {
    setSelectedModele(modele);
    setLignes(franchise ? sansTva(prepareModeleLignes(modele, 0)) : prepareModeleLignes(modele, tvaDefaut));
    setStep(3);
  };

  // Handle template selection from TemplateSelector
  const handleTemplateSelect = (data) => {
    // data = { metier, template, lignes }
    setSelectedModele({
      id: data.template.id,
      nom: data.template.nom,
      description: data.template.description || ''
    });
    // Adapter les lignes au format attendu avec TVA
    const adaptedLignes = data.lignes.map((l, idx) => ({
      id: `ligne-${Date.now()}-${idx}`,
      description: l.description,
      quantite: l.quantite || 1,
      unite: l.unite || 'u',
      prixUnitaire: l.prixUnitaire || 0,
      prixAchat: l.prixAchat || 0,
      tva: franchise ? 0 : (l.tva ?? tvaDefaut),
      total: (l.quantite || 1) * (l.prixUnitaire || 0)
    }));
    setLignes(adaptedLignes);
    setShowTemplateSelector(false);
    setStep(3);
  };

  // Update ligne
  const updateLigne = (index, field, value) => {
    setLignes(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      if (field === 'quantite' || field === 'prixUnitaire') {
        updated.total = (parseFloat(updated.quantite) || 0) * (parseFloat(updated.prixUnitaire) || 0);
      }
      return updated;
    }));
  };

  // Remove ligne
  const removeLigne = (index) => {
    setLignes(prev => prev.filter((_, i) => i !== index));
  };

  // Add ligne
  const addLigne = () => {
    setLignes(prev => [...prev, {
      id: `ligne-${Date.now()}`,
      description: '',
      quantite: 1,
      unite: 'u',
      prixUnitaire: 0,
      prixAchat: 0,
      tva: tvaDefaut,
      total: 0,
    }]);
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalHT = lignes.reduce((sum, l) => sum + (l.total || 0), 0);
    const totalAchat = lignes.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prixAchat || 0)), 0);
    // Mêmes totaux que ceux enregistrés : par taux de ligne, arrondis (calculerTotaux)
    const t = calculerTotaux(lignes.map((l) => ({ ...l, montant: l.total ?? l.montant })), { remisePct: remise, tauxDefaut: tvaDefaut, toutesLesLignes: true, franchise });
    const remiseAmount = t.remiseMontant;
    const totalApresRemise = t.totalHT;
    const tva = t.totalTVA;
    const ttc = t.totalTTC;
    const marge = totalHT > 0 ? Math.round(((totalHT - totalAchat) / totalHT) * 100) : 0;

    return { totalHT, totalAchat, remiseAmount, totalApresRemise, tva, ttc, marge, tvaParTaux: t.tvaParTaux };
  }, [lignes, remise, tvaDefaut, franchise]);

  // Create devis — async with loading + success animation
  const handleCreateDevis = async () => {
    if (!selectedClient || isCreating) return;
    // Une ligne chiffrée sans désignation : le total ne correspondrait plus aux lignes imprimées (relecture juriste-btp du 16 oct. 2026)
    const sansDesignation = messageLigneSansDesignation(lignes.map((l) => ({ ...l, montant: l.total ?? l.montant })));
    if (sansDesignation) { setCreationError(sansDesignation); return; }

    setIsCreating(true);
    setCreationError(null);

    try {
      const result = await onCreateDevis({
        client_id: selectedClient.id,
        type: 'devis',
        statut: 'brouillon',
        date: jourLocal(),
        lignes: lignes.map(l => ({
          description: l.description,
          quantite: l.quantite,
          unite: l.unite,
          prixUnitaire: l.prixUnitaire,
          prixAchat: l.prixAchat,
          tva: l.tva,
        })),
        sections: [{ id: '1', titre: '', lignes }],
        remise,
        tvaRate: tvaDefaut,
        total_ht: totals.totalApresRemise,
        tva: totals.tva,
        total_ttc: totals.ttc,
        tvaParTaux: totals.tvaParTaux,
        notes,
        modele_source: selectedModele?.id,
      });

      // Track template usage
      if (onTrackUsage && selectedModele?.id) {
        try { onTrackUsage(selectedModele.id, result?.id); } catch { /* statistique d'usage perdue : ne doit pas bloquer la création du devis */ }
      }

      // If parent returned false explicitly, treat as error
      if (result === false) {
        setCreationError('Impossible de créer le devis. Vérifiez le client sélectionné.');
        setIsCreating(false);
        return;
      }

      // Success — brouillon consommé, on l'efface + animation puis fermeture
      clearExpressDraft();
      setIsCreating(false);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 1400);
    } catch (err) {
      console.error('DevisExpress creation failed:', err);
      setCreationError(err.message || 'Erreur inconnue lors de la création');
      setIsCreating(false);
    }
  };

  // Get métiers
  const metiers = useMemo(() => getMetiersWithModeles(), []);

  // Get modèles for selected métier
  const modeles = useMemo(() => {
    if (!selectedMetier) return [];
    return getModelesByMetier(selectedMetier.id);
  }, [selectedMetier]);

  // Step 2 running total based on modeleQtys (must be after modeles declaration)
  const step2Total = useMemo(() => {
    if (!modeles.length) return 0;
    return Object.entries(modeleQtys).reduce((sum, [modeleId, qty]) => {
      if (qty <= 0) return sum;
      const modele = modeles.find(m => m.id === modeleId);
      if (!modele) return sum;
      return sum + calculateModeleTotal(modele) * qty;
    }, 0);
  }, [modeleQtys, modeles]);

  // Filter modèles by search
  const filteredModeles = useMemo(() => {
    if (!searchQuery) return modeles;
    return modeles.filter(m =>
      m.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modeles, searchQuery]);

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 10);
    return clients.filter(c =>
      `${c.nom} ${c.prenom}`.toLowerCase().includes(clientSearch.toLowerCase())
    ).slice(0, 10);
  }, [clients, clientSearch]);

  // Global search results (step 1)
  const globalSearchResults = useMemo(() => {
    if (!globalSearch || globalSearch.length < 2) return [];
    return searchModeles(globalSearch).slice(0, 8);
  }, [globalSearch]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" closeOnEscape={!showTemplateSelector && !showQuickClient}
      className={`${bgMain} h-[92vh] sm:h-auto overflow-hidden`}>
        {/* Header */}
        <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={handleBack} aria-label="Retour" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${bgHover} ${textSecondary}`}>
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <ModalTitle className={`font-bold text-lg ${textPrimary}`}>
                {step === 1 && 'Devis Express'}
                {step === 2 && selectedMetier?.nom}
                {step === 3 && selectedModele?.nom}
              </ModalTitle>
              <p className={`text-sm ${textMuted}`}>
                {step === 1 && 'Choisissez votre métier'}
                {step === 2 && 'Sélectionnez un modèle de devis'}
                {step === 3 && 'Personnalisez et créez votre devis'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} aria-label="Fermer" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${bgHover} ${textMuted}`}>
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className={`px-4 py-2 border-b ${borderColor}`}>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-accent' : 'bg-surface-2'}`}
              />
            ))}
          </div>
        </div>

        {/* Brouillon restauré */}
        {draftRestored && (
          <div className={`px-4 py-2 border-b ${borderColor} flex items-center justify-between gap-3 bg-alerte-fond text-alerte-texte`}>
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={16} className="flex-shrink-0" aria-hidden="true" />
              <p className="text-sm truncate">Brouillon restauré — reprenez où vous vous étiez arrêté.</p>
            </div>
            <button
              onClick={handleDiscardDraft}
              className="flex items-center gap-1.5 h-11 -my-1.5 text-sm font-semibold px-2.5 rounded-lg flex-shrink-0 hover:underline"
            >
              <RotateCcw size={14} /> Recommencer
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Métiers */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Global search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un modèle dans tous les métiers..."
                  aria-label="Rechercher un modèle"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2 focus:ring-accent`}
                />
              </div>

              {/* Global search results */}
              {globalSearchResults.length > 0 && (
                <div className="space-y-2">
                  <p className={`text-xs font-medium ${textMuted}`}>
                    {globalSearchResults.length} résultat{globalSearchResults.length > 1 ? 's' : ''}
                  </p>
                  {globalSearchResults.map(modele => (
                    <button
                      key={`${modele.metierId}-${modele.id}`}
                      onClick={() => {
                        setSelectedModele(modele);
                        setLignes(franchise ? sansTva(prepareModeleLignes(modele, 0)) : prepareModeleLignes(modele, tvaDefaut));
                        setGlobalSearch('');
                        setStep(3);
                      }}
                      className={`w-full p-3 rounded-xl border ${borderColor} ${bgCard} ${bgHover} text-left transition-all flex items-center gap-3`}
                    >
                      <span className="text-xl">{modele.metierIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${textPrimary}`}>{modele.nom}</p>
                        <p className={`text-xs ${textMuted}`}>{modele.metierNom}</p>
                      </div>
                      <span className="text-sm font-semibold text-accent-texte">
                        ~{calculateModeleTotal(modele).toLocaleString('fr-FR')} €
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Show rest only when not actively searching */}
              {globalSearch.length < 2 && (
                <>
                  {/* Recent templates */}
                  {recentTemplates.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={14} className="text-accent-texte" />
                        <p className={`text-xs font-semibold ${textMuted}`}>Récemment utilisés</p>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        {recentTemplates.slice(0, 5).map((rt, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (rt.lignes) {
                                setSelectedModele({ id: rt.id, nom: rt.nom, description: rt.description || '' });
                                setLignes(rt.lignes.map((l, i) => ({
                                  id: `ligne-${Date.now()}-${i}`,
                                  description: l.description,
                                  quantite: l.quantite || 1,
                                  unite: l.unite || 'u',
                                  prixUnitaire: l.prixUnitaire || 0,
                                  prixAchat: l.prixAchat || 0,
                                  tva: franchise ? 0 : (l.tva ?? tvaDefaut),
                                  total: (l.quantite || 1) * (l.prixUnitaire || 0),
                                })));
                                setStep(3);
                              }
                            }}
                            className={`flex-shrink-0 px-3 py-2 rounded-lg border text-left ${borderColor} ${bgCard} ${bgHover} transition-all max-w-[200px]`}
                          >
                            <p className={`text-xs font-medium truncate ${textPrimary}`}>{rt.nom}</p>
                            <p className={`text-xs ${textMuted} truncate`}>{rt.metierNom || rt.categorie || ''}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Option: Charger un modèle existant */}
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className={`w-full p-4 rounded-xl border-2 border-accent/40 ${bgHover} flex items-center gap-4 transition-all hover:shadow-md`}
                  >
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent/10">
                      <FolderOpen size={24} className="text-accent-texte" />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-semibold ${textPrimary}`}>Charger un modèle</p>
                      <p className={`text-sm ${textMuted}`}>Utiliser un template pré-enregistré</p>
                    </div>
                    <ChevronRight className={textMuted} size={20} />
                  </button>

                  {/* Séparateur */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-bord" />
                    <span className={`text-xs ${textMuted}`}>ou choisir un métier</span>
                    <div className="flex-1 h-px bg-bord" />
                  </div>

                  {/* Grille des métiers */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {metiers.map(metier => (
                      <button
                        key={metier.id}
                        onClick={() => handleSelectMetier(metier)}
                        className={`relative p-4 rounded-xl border ${borderColor} ${bgCard} ${bgHover} text-center transition-all hover:scale-[1.02] hover:shadow-md`}
                      >
                        {metier.isNew && (
                          <span className="absolute -top-2 -right-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-info-fond text-info-texte shadow-e1 z-10">
                            Nouveau
                          </span>
                        )}
                        <div className="w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center text-2xl bg-surface-2">
                          {metier.icon}
                        </div>
                        <p className={`font-medium text-xs sm:text-sm leading-tight line-clamp-2 ${textPrimary}`}>{metier.nom}</p>
                        <p className={`text-xs ${textMuted} mt-1`}>{metier.modelesCount} modèles</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Modeles with qty selector */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un modele..."
                  aria-label="Rechercher un modele"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2 focus:ring-accent`}
                />
              </div>

              {/* Modeles list with qty controls */}
              <div className="space-y-3">
                {filteredModeles.map(modele => {
                  const total = calculateModeleTotal(modele);
                  const marge = calculateModeleMarge(modele);
                  const qty = modeleQtys[modele.id] || 0;
                  return (
                    <div
                      key={modele.id}
                      className={`p-4 rounded-xl border transition-all ${qty > 0 ? 'ring-2 ring-accent bg-surface' : `${bgCard}`} ${borderColor}`}
                    >
                      <div className="flex items-start gap-3" onClick={() => { if (qty === 0) handleSelectModele(modele); }}>
                        <div className="flex-1 cursor-pointer">
                          <p className={`font-semibold ${textPrimary}`}>{modele.nom}</p>
                          <p className={`text-sm ${textMuted} mt-1`}>{modele.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full bg-surface-2 ${textMuted}`}>
                              {modele.lignes.length} lignes
                            </span>
                            <span className={`text-xs font-medium flex items-center gap-1 ${marge >= 40 ? 'text-succes-texte' : marge >= 25 ? 'text-alerte-texte' : 'text-danger-texte'}`}>
                              <TrendingUp size={12} />
                              {marge}%
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-bold text-lg tabular-nums text-encre">
                            ~{total.toLocaleString('fr-FR')} EUR
                          </p>
                          {/* Qty controls */}
                          <div className="flex items-center gap-1">
                            {qty > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setModeleQtys(p => ({ ...p, [modele.id]: Math.max(0, qty - 1) })); }}
                                aria-label={`Une de moins : ${modele.nom}`}
                                className="w-11 h-11 rounded-lg flex items-center justify-center font-bold transition-colors bg-surface-2 hover:bg-bord text-encre"
                              >
                                <Minus size={16} />
                              </button>
                            )}
                            {qty > 0 && (
                              <span className={`w-8 text-center font-bold ${textPrimary}`}>{qty}</span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setModeleQtys(p => ({ ...p, [modele.id]: qty + 1 })); if (qty === 0) handleSelectModele(modele); }}
                              aria-label={`Une de plus : ${modele.nom}`}
                              className="w-11 h-11 rounded-lg flex items-center justify-center font-bold transition-colors bg-surface-2 hover:bg-bord text-encre"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sticky running total */}
              {step2Total > 0 && (
                <div className={`sticky bottom-0 -mx-4 -mb-4 px-4 py-3 border-t ${borderColor} bg-surface/95 backdrop-blur-sm`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${textSecondary}`}>Total estime HT</span>
                    <span className="text-xl font-bold tabular-nums text-encre">
                      ~{step2Total.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Personnalisation */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Client selection */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Client *
                </label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} size={18} />
                  <input
                    type="text"
                    placeholder="Rechercher un client..."
                    aria-label="Rechercher un client"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2 focus:ring-accent`}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* D6: Bouton Créer nouveau client */}
                  {addClient && (
                    <button
                      onClick={() => setShowQuickClient(true)}
                      className="px-3 min-h-[44px] rounded-full text-sm transition-colors flex items-center gap-1.5 border-2 border-dashed font-medium border-bord-fort text-encre-2 hover:text-encre"
                    >
                      <UserPlus size={14} />
                      Nouveau client
                    </button>
                  )}
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      aria-pressed={selectedClient?.id === client.id}
                      className={`px-3 min-h-[44px] rounded-full text-sm transition-colors border ${
                        selectedClient?.id === client.id
                          ? 'bg-encre text-surface border-encre'
                          : `${bgCard} ${textSecondary} ${bgHover} ${borderColor}`
                      }`}
                    >
                      {formatClientName(client)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lignes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={`text-sm font-medium ${textSecondary}`}>
                    Lignes du devis
                  </label>
                  <button
                    onClick={addLigne}
                    className={`text-sm flex items-center gap-1 ${textMuted} ${bgHover} px-2 py-1 rounded-lg`}
                  >
                    <Plus size={14} />
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-3">
                  {lignes.map((ligne, index) => (
                    <div key={ligne.id} className={`p-4 rounded-xl border ${borderColor} ${bgCard}`}>
                      {/* Description - full width */}
                      <div className="flex items-start gap-2 mb-3">
                        <input
                          type="text"
                          value={ligne.description}
                          onChange={(e) => updateLigne(index, 'description', e.target.value)}
                          placeholder="Description"
                          className={`flex-1 px-3 py-2.5 rounded-lg border text-sm ${inputBg} ${textPrimary}`}
                        />
                        <button
                          onClick={() => removeLigne(index)}
                          aria-label="Supprimer la ligne"
                          className="w-11 h-11 flex items-center justify-center rounded-lg shrink-0 text-encre-3 hover:bg-danger-fond hover:text-danger-texte"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {/* Qty + Price + Total - stacked on mobile */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Qty with +/- buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateLigne(index, 'quantite', Math.max(0, (ligne.quantite || 1) - 1))}
                            aria-label="Quantité moins un"
                            className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center font-bold transition-colors bg-surface-2 hover:bg-bord text-encre"
                          >
                            <Minus size={18} />
                          </button>
                          <div className={`min-w-[50px] text-center font-bold text-base ${textPrimary}`}>
                            {ligne.quantite} <span className={`text-xs font-normal ${textMuted}`}>{ligne.unite}</span>
                          </div>
                          <button
                            onClick={() => updateLigne(index, 'quantite', (ligne.quantite || 0) + 1)}
                            aria-label="Quantité plus un"
                            className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center font-bold transition-colors bg-surface-2 hover:bg-bord text-encre"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        {/* Price */}
                        <div className="flex items-center gap-2 flex-1">
                          <span className={`text-xs ${textMuted} shrink-0`}>Prix :</span>
                          <input
                            type="number"
                            value={ligne.prixUnitaire}
                            onChange={(e) => updateLigne(index, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                            className={`flex-1 min-w-0 px-3 py-2.5 rounded-lg border text-sm text-right ${inputBg} ${textPrimary}`}
                            min="0"
                            step="0.01"
                          />
                          <span className={`text-xs ${textMuted}`}>EUR</span>
                        </div>
                        {/* Line total */}
                        <div className={`text-right font-bold min-w-[90px] ${textPrimary}`}>
                          {(ligne.total || 0).toLocaleString('fr-FR')} EUR
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remise */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Remise globale (%)
                </label>
                <div className="flex gap-2">
                  {[0, 5, 10, 15, 20].map(r => (
                    <button
                      key={r}
                      onClick={() => setRemise(r)}
                      aria-pressed={remise === r}
                      className={`px-4 min-h-[44px] rounded-full text-sm font-medium transition-colors border ${
                        remise === r
                          ? 'bg-encre text-surface border-encre'
                          : `${bgCard} ${textSecondary} ${bgHover} ${borderColor}`
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Notes / Conditions
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2 focus:ring-accent`}
                  placeholder="Conditions particulières, durée des travaux..."
                />
              </div>

              {/* Summary */}
              <div className={`p-4 rounded-xl ${bgCard} border ${borderColor}`}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={textMuted}>Total HT</span>
                    <span className={textPrimary}>{totals.totalHT.toLocaleString('fr-FR')} €</span>
                  </div>
                  {remise > 0 && (
                    <div className="flex justify-between text-danger-texte">
                      <span>Remise ({remise}%)</span>
                      <span>-{totals.remiseAmount.toLocaleString('fr-FR')} €</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={textMuted}>{franchise ? 'TVA non applicable, art. 293 B du CGI' : `TVA (${tvaDefaut}%)`}</span>
                    <span className={textPrimary}>{totals.tva.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t ${borderColor}`}>
                    <span className={`font-semibold ${textPrimary}`}>Total TTC</span>
                    <span className="font-bold text-lg tabular-nums text-encre">
                      {totals.ttc.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className={textMuted}>Marge estimée</span>
                    <span className={`font-medium ${totals.marge >= 40 ? 'text-succes-texte' : totals.marge >= 25 ? 'text-alerte-texte' : 'text-danger-texte'}`}>
                      {totals.marge}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 3 && (
          <div className={`p-4 border-t ${borderColor}`}>
            {/* Error message */}
            {creationError && (
              <div role="alert" className="mb-3 p-3 rounded-xl text-sm flex items-start gap-2 bg-danger-fond text-danger-texte">
                <X size={16} className="shrink-0 mt-0.5" />
                <span>{creationError}</span>
              </div>
            )}
            <Bouton
              variante="principal" taille="grande" pleineLargeur icone={FileText}
              onClick={handleCreateDevis}
              disabled={!selectedClient || lignes.length === 0}
              chargement={isCreating}
            >
              {isCreating ? 'Création en cours...' : 'Créer le devis'}
            </Bouton>
            {!selectedClient && lignes.length > 0 && !isCreating && (
              <p className="text-sm text-center mt-2 text-alerte-texte">
                Choisissez un client avant de créer le devis
              </p>
            )}
          </div>
        )}

        {/* Success overlay */}
        {showSuccess && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div
              className="flex flex-col items-center gap-4"
              style={{ animation: 'devisSuccessIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg bg-accent"
              >
                <Check size={40} className="text-sur-accent" strokeWidth={3} />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">Devis créé !</p>
                <p className="text-white/70 text-sm mt-1">Redirection en cours...</p>
              </div>
            </div>
            <style>{`
              @keyframes devisSuccessIn {
                0% { opacity: 0; transform: scale(0.5); }
                100% { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        )}

      {/* TemplateSelector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
        customTemplates={customTemplates}
        isDark={isDark}
        couleur={couleur}
      />

      {/* D6: Quick Client Modal — create client inline during Devis Express */}
      {addClient && (
        <QuickClientModal
          isOpen={showQuickClient}
          onClose={() => setShowQuickClient(false)}
          onSubmit={async (clientData) => {
            const newClient = await addClient(clientData);
            if (newClient?.id) {
              setSelectedClient(newClient);
              setClientSearch('');
            }
          }}
          isDark={isDark}
          couleur={couleur}
          existingClients={clients}
        />
      )}
    </Modal>
  );
}
