/**
 * ArticlePicker - Sélecteur d'article BTP en 4 étapes
 * Flow: Catégorie métier → Sous-catégorie → Article → Configuration prix
 */

import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Search, Check, Plus, Package, Tag, Euro, Info } from 'lucide-react';
import { ALL_ARTICLES_BTP, CATEGORIES_METIERS, getSousCategories, getArticlesBySousCategorie, searchAllArticles, createCatalogueItem } from '../lib/data';

export default function ArticlePicker({ isOpen, onClose, onSelect, isDark = false, couleur = '#f97316' }) {
  const [step, setStep] = useState(1); // 1: Catégorie, 2: Sous-catégorie, 3: Article, 4: Config
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [selectedSousCategorie, setSelectedSousCategorie] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customPrix, setCustomPrix] = useState(null);
  const [customPrixAchat, setCustomPrixAchat] = useState(null);
  const [quantite, setQuantite] = useState(1);

  // Theme classes
  const bgMain = isDark ? 'bg-slate-900' : 'bg-white';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-slate-50';
  const bgHover = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputBg = isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300';

  // Reset state when closing
  const handleClose = () => {
    setStep(1);
    setSelectedCategorie(null);
    setSelectedSousCategorie(null);
    setSelectedArticle(null);
    setSearchQuery('');
    setCustomPrix(null);
    setCustomPrixAchat(null);
    setQuantite(1);
    onClose();
  };

  // Go back one step
  const handleBack = () => {
    if (step === 4) {
      setStep(3);
      setCustomPrix(null);
      setCustomPrixAchat(null);
    } else if (step === 3) {
      setStep(2);
      setSelectedArticle(null);
    } else if (step === 2) {
      setStep(1);
      setSelectedSousCategorie(null);
    }
  };

  // Select a category
  const handleSelectCategorie = (cat) => {
    setSelectedCategorie(cat);
    setStep(2);
    setSearchQuery('');
  };

  // Select a sous-categorie
  const handleSelectSousCategorie = (sousCat) => {
    setSelectedSousCategorie(sousCat);
    setStep(3);
  };

  // Select an article
  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setCustomPrix(article.prixDefaut);
    setCustomPrixAchat(Math.round(article.prixDefaut * 0.6));
    setStep(4);
  };

  // Confirm and add article
  const handleConfirm = () => {
    if (!selectedArticle) return;

    const catalogueItem = {
      id: crypto.randomUUID(),
      reference: `REF-${selectedArticle.id.toUpperCase().slice(0, 10)}`,
      nom: selectedArticle.nom,
      designation: selectedArticle.nom,
      description: '',
      unite: selectedArticle.unite,
      prixUnitaire: customPrix || selectedArticle.prixDefaut,
      prix_unitaire_ht: customPrix || selectedArticle.prixDefaut,
      prixAchat: customPrixAchat || Math.round((customPrix || selectedArticle.prixDefaut) * 0.6),
      tva: 10,
      categorie: selectedCategorie?.nom || 'Autre',
      favori: false,
      actif: true,
      quantite: quantite,
    };

    onSelect(catalogueItem);
    handleClose();
  };

  // Search results
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return searchAllArticles(searchQuery).slice(0, 20);
  }, [searchQuery]);

  // Get sous-categories for selected category
  const sousCategories = useMemo(() => {
    if (!selectedCategorie) return [];
    return getSousCategories(selectedCategorie.id);
  }, [selectedCategorie]);

  // Get articles for selected sous-category
  const articles = useMemo(() => {
    if (!selectedCategorie || !selectedSousCategorie) return [];
    return getArticlesBySousCategorie(selectedCategorie.id, selectedSousCategorie.id);
  }, [selectedCategorie, selectedSousCategorie]);

  // Calculate marge
  const marge = useMemo(() => {
    if (!customPrix || customPrix === 0) return 0;
    return Math.round(((customPrix - (customPrixAchat || 0)) / customPrix) * 100);
  }, [customPrix, customPrixAchat]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${bgMain} rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl`}>
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
                {step === 1 && 'Choisir une catégorie'}
                {step === 2 && selectedCategorie?.nom}
                {step === 3 && selectedSousCategorie?.nom}
                {step === 4 && 'Configurer l\'article'}
              </h2>
              <p className={`text-sm ${textMuted}`}>
                {step === 1 && 'Sélectionnez votre type d\'activité'}
                {step === 2 && 'Sélectionnez une sous-catégorie'}
                {step === 3 && 'Sélectionnez un article'}
                {step === 4 && 'Ajustez les prix et la quantité'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} aria-label="Fermer" className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${bgHover} ${textMuted}`}>
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className={`px-4 py-2 border-b ${borderColor}`}>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${s <= step ? '' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}
                style={{ backgroundColor: s <= step ? couleur : undefined }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${step >= 1 ? textSecondary : textMuted}`}>Catégorie</span>
            <span className={`text-xs ${step >= 2 ? textSecondary : textMuted}`}>Type</span>
            <span className={`text-xs ${step >= 3 ? textSecondary : textMuted}`}>Article</span>
            <span className={`text-xs ${step >= 4 ? textSecondary : textMuted}`}>Config</span>
          </div>
        </div>

        {/* Search bar (steps 1-3) */}
        {step < 4 && (
          <div className={`p-4 border-b ${borderColor}`}>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} size={18} />
              <input
                type="text"
                placeholder="Rechercher un article..."
                aria-label="Rechercher un article"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2`}
                style={{ '--tw-ring-color': couleur }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Search Results */}
          {searchQuery.length >= 2 && step < 4 && (
            <div className="space-y-2">
              <p className={`text-sm ${textMuted} mb-3`}>{searchResults.length} résultat(s)</p>
              {searchResults.map(article => (
                <button
                  key={`${article.categorieId}-${article.sousCategorieId}-${article.id}`}
                  onClick={() => {
                    const cat = CATEGORIES_METIERS.find(c => c.id === article.categorieId);
                    setSelectedCategorie(cat);
                    setSelectedSousCategorie({ id: article.sousCategorieId, nom: article.sousCategorieNom });
                    handleSelectArticle(article);
                  }}
                  className={`w-full p-3 rounded-xl border ${borderColor} ${bgCard} ${bgHover} text-left transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{article.nom}</p>
                      <p className={`text-xs ${textMuted}`}>
                        {article.categorieNom} → {article.sousCategorieNom}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: couleur }}>{article.prixDefaut} €</p>
                      <p className={`text-xs ${textMuted}`}>/ {article.unite}</p>
                    </div>
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className={`text-center py-8 ${textMuted}`}>Aucun article trouvé</p>
              )}
            </div>
          )}

          {/* Step 1: Categories */}
          {step === 1 && searchQuery.length < 2 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES_METIERS.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategorie(cat)}
                  className={`p-4 rounded-xl border ${borderColor} ${bgCard} ${bgHover} text-center transition-all hover:scale-[1.02] hover:shadow-md`}
                >
                  <div
                    className="w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    {cat.icon}
                  </div>
                  <p className={`font-medium text-sm ${textPrimary}`}>{cat.nom}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Sous-categories */}
          {step === 2 && searchQuery.length < 2 && (
            <div className="space-y-2">
              {sousCategories.map(sousCat => (
                <button
                  key={sousCat.id}
                  onClick={() => handleSelectSousCategorie(sousCat)}
                  className={`w-full p-4 rounded-xl border ${borderColor} ${bgCard} ${bgHover} text-left transition-all flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${selectedCategorie?.color}20` }}
                    >
                      <Tag size={18} style={{ color: selectedCategorie?.color }} />
                    </div>
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{sousCat.nom}</p>
                      <p className={`text-sm ${textMuted}`}>{sousCat.articlesCount} articles</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className={`${textMuted} group-hover:translate-x-1 transition-transform`} />
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Articles */}
          {step === 3 && searchQuery.length < 2 && (
            <div className="space-y-2">
              {articles.map(article => (
                <button
                  key={article.id}
                  onClick={() => handleSelectArticle(article)}
                  className={`w-full p-4 rounded-xl border ${borderColor} ${bgCard} ${bgHover} text-left transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`font-medium ${textPrimary}`}>{article.nom}</p>
                      <p className={`text-sm ${textMuted} mt-1`}>
                        {article.prixMin} € - {article.prixMax} € / {article.unite}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-lg" style={{ color: couleur }}>{article.prixDefaut} €</p>
                      <p className={`text-xs ${textMuted}`}>prix conseillé</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Configuration */}
          {step === 4 && selectedArticle && (
            <div className="space-y-6">
              {/* Article summary */}
              <div className={`p-4 rounded-xl ${bgCard} border ${borderColor}`}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${selectedCategorie?.color}20` }}
                  >
                    {selectedCategorie?.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold ${textPrimary}`}>{selectedArticle.nom}</p>
                    <p className={`text-sm ${textMuted}`}>{selectedCategorie?.nom} → {selectedSousCategorie?.nom}</p>
                    <div className={`flex items-center gap-2 mt-2 text-sm ${textMuted}`}>
                      <Info size={14} />
                      <span>Prix marché : {selectedArticle.prixMin} € - {selectedArticle.prixMax} € / {selectedArticle.unite}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prix de vente */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Prix de vente HT (€ / {selectedArticle.unite})
                </label>
                <input
                  type="number"
                  value={customPrix || ''}
                  onChange={(e) => setCustomPrix(parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary} text-lg font-bold focus:outline-none focus:ring-2`}
                  style={{ '--tw-ring-color': couleur }}
                  min="0"
                  step="0.01"
                />
                <div className="flex gap-2 mt-2">
                  {[selectedArticle.prixMin, selectedArticle.prixDefaut, selectedArticle.prixMax].map((prix, i) => (
                    <button
                      key={i}
                      onClick={() => setCustomPrix(prix)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        customPrix === prix
                          ? 'text-white'
                          : `${bgCard} ${textSecondary} ${bgHover}`
                      }`}
                      style={{ backgroundColor: customPrix === prix ? couleur : undefined }}
                    >
                      {i === 0 && 'Min'} {i === 1 && 'Moyen'} {i === 2 && 'Max'}
                      <br />
                      <span className="font-bold">{prix} €</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prix d'achat */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Prix d'achat HT (optionnel)
                </label>
                <input
                  type="number"
                  value={customPrixAchat || ''}
                  onChange={(e) => setCustomPrixAchat(parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2`}
                  style={{ '--tw-ring-color': couleur }}
                  min="0"
                  step="0.01"
                  placeholder="Pour calculer votre marge"
                />
              </div>

              {/* Quantité */}
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Quantité par défaut
                </label>
                <input
                  type="number"
                  value={quantite}
                  onChange={(e) => setQuantite(parseFloat(e.target.value) || 1)}
                  className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary} focus:outline-none focus:ring-2`}
                  style={{ '--tw-ring-color': couleur }}
                  min="0.01"
                  step="0.01"
                />
              </div>

              {/* Marge indicator */}
              {customPrixAchat > 0 && (
                <div className={`p-4 rounded-xl ${bgCard} border ${borderColor}`}>
                  <div className="flex items-center justify-between">
                    <span className={textSecondary}>Marge brute</span>
                    <span
                      className={`font-bold text-lg ${
                        marge >= 40 ? 'text-green-500' : marge >= 25 ? 'text-yellow-500' : 'text-red-500'
                      }`}
                    >
                      {marge}%
                    </span>
                  </div>
                  <div className={`h-2 rounded-full mt-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        marge >= 40 ? 'bg-green-500' : marge >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(marge, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 4 && (
          <div className={`p-4 border-t ${borderColor}`}>
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              <Plus size={20} />
              Ajouter au catalogue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
