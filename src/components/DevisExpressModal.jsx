/**
 * DevisExpressModal - Modal de création rapide de devis à partir de modèles
 * Flow: Métier → Modèle → Personnalisation → Création
 */

import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Search, Check, FileText, Euro, TrendingUp, Minus, Plus, Trash2, Edit3, FolderOpen } from 'lucide-react';
import { MODELES_DEVIS, getMetiersWithModeles, getModelesByMetier, prepareModeleLignes, calculateModeleTotal, calculateModeleMarge } from '../lib/data/modeles-devis';
import TemplateSelector from './TemplateSelector';

export default function DevisExpressModal({
  isOpen,
  onClose,
  onCreateDevis,
  clients = [],
  isDark = false,
  couleur = '#f97316',
  tvaDefaut = 10
}) {
  const [step, setStep] = useState(1); // 1: Métier, 2: Modèle, 3: Personnalisation
  const [selectedMetier, setSelectedMetier] = useState(null);
  const [selectedModele, setSelectedModele] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [remise, setRemise] = useState(0);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [modeleQtys, setModeleQtys] = useState({}); // { modeleId: qty } for step 2 preview

  // Theme classes
  const bgMain = isDark ? 'bg-slate-900' : 'bg-white';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-slate-50';
  const bgHover = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputBg = isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300';

  // Reset state
  const handleClose = () => {
    setStep(1);
    setSelectedMetier(null);
    setSelectedModele(null);
    setSelectedClient(null);
    setLignes([]);
    setSearchQuery('');
    setClientSearch('');
    setNotes('');
    setRemise(0);
    setShowTemplateSelector(false);
    setModeleQtys({});
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
    setLignes(prepareModeleLignes(modele, tvaDefaut));
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
      tva: l.tva || tvaDefaut,
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
    const remiseAmount = totalHT * (remise / 100);
    const totalApresRemise = totalHT - remiseAmount;
    const tva = totalApresRemise * (tvaDefaut / 100);
    const ttc = totalApresRemise + tva;
    const marge = totalHT > 0 ? Math.round(((totalHT - totalAchat) / totalHT) * 100) : 0;

    return { totalHT, totalAchat, remiseAmount, totalApresRemise, tva, ttc, marge };
  }, [lignes, remise, tvaDefaut]);

  // Create devis
  const handleCreateDevis = () => {
    if (!selectedClient) return;

    onCreateDevis({
      client_id: selectedClient.id,
      type: 'devis',
      statut: 'brouillon',
      date: new Date().toISOString().split('T')[0],
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
      notes,
      modele_source: selectedModele?.id,
    });

    handleClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className={`${bgMain} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-4xl h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl`}>
        {/* Header */}
        <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={handleBack} aria-label="Retour" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${bgHover} ${textSecondary}`}>
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h2 className={`font-bold text-lg ${textPrimary}`}>
                {step === 1 && 'Devis Express'}
                {step === 2 && selectedMetier?.nom}
                {step === 3 && selectedModele?.nom}
              </h2>
              <p className={`text-sm ${textMuted}`}>
                {step === 1 && 'Choisissez votre métier'}
                {step === 2 && 'Sélectionnez un modèle de devis'}
                {step === 3 && 'Personnalisez et créez votre devis'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} aria-label="Fermer" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${bgHover} ${textMuted}`}>
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className={`px-4 py-2 border-b ${borderColor}`}>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${s <= step ? '' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}
                style={{ backgroundColor: s <= step ? couleur : undefined }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Métiers */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Option: Charger un modèle existant */}
              <button
                onClick={() => setShowTemplateSelector(true)}
                className={`w-full p-4 rounded-xl border-2 ${bgHover} flex items-center gap-4 transition-all hover:shadow-md`}
                style={{ borderColor: `${couleur}60` }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${couleur}15` }}
                >
                  <FolderOpen size={24} style={{ color: couleur }} />
                </div>
                <div className="text-left flex-1">
                  <p className={`font-semibold ${textPrimary}`}>Charger un modèle</p>
                  <p className={`text-sm ${textMuted}`}>Utiliser un template pré-enregistré</p>
                </div>
                <ChevronRight className={textMuted} size={20} />
              </button>

              {/* Séparateur */}
              <div className="flex items-center gap-3">
                <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <span className={`text-xs ${textMuted}`}>ou choisir un métier</span>
                <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              </div>

              {/* Grille des métiers */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {metiers.map(metier => (
                  <button
                    key={metier.id}
                    onClick={() => handleSelectMetier(metier)}
                    className={`p-4 rounded-xl border ${borderColor} ${bgCard} ${bgHover} text-center transition-all hover:scale-[1.02] hover:shadow-md`}
                  >
                    <div
                      className="w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${metier.color}20` }}
                    >
                      {metier.icon}
                    </div>
                    <p className={`font-medium ${textPrimary}`}>{metier.nom}</p>
                    <p className={`text-xs ${textMuted} mt-1`}>{metier.modelesCount} modèles</p>
                  </button>
                ))}
              </div>
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
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2`}
                  style={{ '--tw-ring-color': couleur }}
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
                      className={`p-4 rounded-xl border transition-all ${qty > 0 ? `ring-2 ${isDark ? 'bg-slate-800/80' : 'bg-white'}` : `${bgCard}`} ${borderColor}`}
                      style={qty > 0 ? { '--tw-ring-color': couleur, ringColor: couleur } : {}}
                    >
                      <div className="flex items-start gap-3" onClick={() => { if (qty === 0) handleSelectModele(modele); }}>
                        <div className="flex-1 cursor-pointer">
                          <p className={`font-semibold ${textPrimary}`}>{modele.nom}</p>
                          <p className={`text-sm ${textMuted} mt-1`}>{modele.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'} ${textMuted}`}>
                              {modele.lignes.length} lignes
                            </span>
                            <span className={`text-xs flex items-center gap-1 ${marge >= 40 ? 'text-green-500' : marge >= 25 ? 'text-yellow-500' : 'text-red-500'}`}>
                              <TrendingUp size={12} />
                              {marge}%
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-bold text-lg" style={{ color: couleur }}>
                            ~{total.toLocaleString('fr-FR')} EUR
                          </p>
                          {/* Qty controls */}
                          <div className="flex items-center gap-1">
                            {qty > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setModeleQtys(p => ({ ...p, [modele.id]: Math.max(0, qty - 1) })); }}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                              >
                                <Minus size={16} />
                              </button>
                            )}
                            {qty > 0 && (
                              <span className={`w-8 text-center font-bold ${textPrimary}`}>{qty}</span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setModeleQtys(p => ({ ...p, [modele.id]: qty + 1 })); if (qty === 0) handleSelectModele(modele); }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white transition-colors"
                              style={{ backgroundColor: couleur }}
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
                <div className={`sticky bottom-0 -mx-4 -mb-4 px-4 py-3 border-t ${borderColor} ${isDark ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur-sm`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${textSecondary}`}>Total estime HT</span>
                    <span className="text-xl font-bold" style={{ color: couleur }}>
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
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2`}
                    style={{ '--tw-ring-color': couleur }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedClient?.id === client.id
                          ? 'text-white'
                          : `${bgCard} ${textSecondary} ${bgHover} border ${borderColor}`
                      }`}
                      style={{ backgroundColor: selectedClient?.id === client.id ? couleur : undefined }}
                    >
                      {client.nom} {client.prenom}
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
                          className={`p-2.5 rounded-lg shrink-0 ${isDark ? 'hover:bg-red-900/40 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
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
                            className={`min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center font-bold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                          >
                            <Minus size={18} />
                          </button>
                          <div className={`min-w-[50px] text-center font-bold text-base ${textPrimary}`}>
                            {ligne.quantite} <span className={`text-xs font-normal ${textMuted}`}>{ligne.unite}</span>
                          </div>
                          <button
                            onClick={() => updateLigne(index, 'quantite', (ligne.quantite || 0) + 1)}
                            className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center font-bold text-white transition-colors"
                            style={{ backgroundColor: couleur }}
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
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        remise === r
                          ? 'text-white'
                          : `${bgCard} ${textSecondary} ${bgHover} border ${borderColor}`
                      }`}
                      style={{ backgroundColor: remise === r ? couleur : undefined }}
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
                  className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2`}
                  style={{ '--tw-ring-color': couleur }}
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
                    <div className="flex justify-between text-red-500">
                      <span>Remise ({remise}%)</span>
                      <span>-{totals.remiseAmount.toLocaleString('fr-FR')} €</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={textMuted}>TVA ({tvaDefaut}%)</span>
                    <span className={textPrimary}>{totals.tva.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t ${borderColor}`}>
                    <span className={`font-semibold ${textPrimary}`}>Total TTC</span>
                    <span className="font-bold text-lg" style={{ color: couleur }}>
                      {totals.ttc.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className={textMuted}>Marge estimée</span>
                    <span className={`font-medium ${totals.marge >= 40 ? 'text-green-500' : totals.marge >= 25 ? 'text-yellow-500' : 'text-red-500'}`}>
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
            <button
              onClick={handleCreateDevis}
              disabled={!selectedClient || lignes.length === 0}
              className={`w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all ${
                !selectedClient || lignes.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: couleur }}
            >
              <FileText size={20} />
              Créer le devis
            </button>
          </div>
        )}
      </div>

      {/* TemplateSelector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
        isDark={isDark}
        couleur={couleur}
      />
    </div>
  );
}
