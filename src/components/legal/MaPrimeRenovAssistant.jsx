/**
 * MaPrimeRénov' Assistant Component
 * Complete wizard for managing French energy renovation aid applications
 *
 * Based on official ANAH guidelines and MaPrimeRénov' 2024 requirements
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  REVENUE_CATEGORIES,
  TRAVAUX_ELIGIBLES,
  determineRevenueCategory,
  calculateAideAmount,
  calculateTotalAide,
  checkEligibility
} from '../../lib/compliance/renovation-compliance';

// ============ CONSTANTS ============

const STEPS = [
  { id: 1, label: 'Éligibilité', icon: '🏠' },
  { id: 2, label: 'Travaux', icon: '🔧' },
  { id: 3, label: 'Certification RGE', icon: '✅' },
  { id: 4, label: 'Devis', icon: '📄' },
  { id: 5, label: 'Documents', icon: '📦' }
];

const LOGEMENT_TYPES = [
  { value: 'residence_principale', label: 'Résidence principale', eligible: true },
  { value: 'residence_secondaire', label: 'Résidence secondaire', eligible: false },
  { value: 'locatif', label: 'Investissement locatif', eligible: true, note: 'Conditions spécifiques' }
];

const IDF_DEPARTMENTS = ['75', '77', '78', '91', '92', '93', '94', '95'];

const STATUS_COLORS = {
  en_preparation: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'En préparation' },
  depose: { bg: 'bg-blue-100', dark: 'bg-blue-900/30 text-blue-400', text: 'text-blue-700', label: 'Déposé' },
  en_instruction: { bg: 'bg-yellow-100', dark: 'bg-yellow-900/30 text-yellow-400', text: 'text-yellow-700', label: 'En instruction' },
  accepte: { bg: 'bg-green-100', dark: 'bg-green-900/30 text-green-400', text: 'text-green-700', label: 'Accepté' },
  refuse: { bg: 'bg-red-100', dark: 'bg-red-900/30 text-red-400', text: 'text-red-700', label: 'Refusé' }
};

// ============ DEMO DATA ============

const DEMO_COMPANY = {
  id: 'demo-company',
  nom: 'Réno Pro Services',
  rge: true,
  rge_numero: 'E-RGE-2024-12345',
  rge_validite: '2025-12-31',
  rge_domaines: ['Isolation thermique', 'Chauffage / Climatisation', 'Ventilation'],
  assurance_decennale: true,
  assurance_decennale_numero: 'DEC-2024-789456'
};

const DEMO_DOSSIERS = [
  {
    id: 'demo-1',
    client_nom: 'Martin Dupont',
    status: 'accepte',
    montant_aide_estime: 4500,
    montant_aide_accorde: 4200,
    travaux: 'Isolation combles + PAC',
    date_depot: '2024-01-10',
    date_decision: '2024-01-28'
  },
  {
    id: 'demo-2',
    client_nom: 'Sophie Bernard',
    status: 'en_instruction',
    montant_aide_estime: 8000,
    montant_aide_accorde: null,
    travaux: 'PAC géothermique',
    date_depot: '2024-01-20',
    date_decision: null
  },
  {
    id: 'demo-3',
    client_nom: 'Pierre Leroy',
    status: 'depose',
    montant_aide_estime: 2500,
    montant_aide_accorde: null,
    travaux: 'VMC double flux',
    date_depot: '2024-01-25',
    date_decision: null
  }
];

// ============ HELPER COMPONENTS ============

/**
 * Progress bar for wizard steps
 */
function StepProgress({ currentStep, steps, isDark }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
              ${currentStep >= step.id
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-400'
                  : 'bg-white border-gray-300 text-gray-500'}
            `}>
              {currentStep > step.id ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span>{step.icon}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 md:w-24 h-1 mx-2 rounded ${
                currentStep > step.id
                  ? 'bg-emerald-500'
                  : isDark ? 'bg-gray-700' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs md:text-sm">
        {steps.map(step => (
          <span key={step.id} className={`
            ${currentStep >= step.id
              ? 'text-emerald-600 font-medium'
              : isDark ? 'text-gray-500' : 'text-gray-400'}
          `}>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Alert component for messages
 */
function Alert({ type, message, onClose, isDark }) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const icons = {
    error: '❌',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️'
  };

  return (
    <div className={`p-4 rounded-lg border ${styles[type]} flex items-start gap-3`}>
      <span className="text-lg">{icons[type]}</span>
      <p className="flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100">×</button>
      )}
    </div>
  );
}

/**
 * Category badge with color
 */
function CategoryBadge({ category, isDark }) {
  const colors = {
    tres_modeste: { bg: 'bg-blue-500', label: 'Très modestes (Bleu)' },
    modeste: { bg: 'bg-yellow-500', label: 'Modestes (Jaune)' },
    intermediaire: { bg: 'bg-purple-500', label: 'Intermédiaires (Violet)' },
    superieur: { bg: 'bg-pink-500', label: 'Supérieurs (Rose)' }
  };

  const cat = colors[category?.id || category] || colors.superieur;

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium ${cat.bg}`}>
      <span className="w-2 h-2 rounded-full bg-white/50" />
      {cat.label}
    </span>
  );
}

// ============ STEP COMPONENTS ============

/**
 * Step 1: Client Eligibility
 */
function EligibilityStep({ data, onChange, errors, isDark }) {
  const isIDF = useMemo(() => {
    const cp = data.codePostal || '';
    return IDF_DEPARTMENTS.includes(cp.substring(0, 2));
  }, [data.codePostal]);

  const category = useMemo(() => {
    if (data.revenus && data.nbPersonnes) {
      return determineRevenueCategory(data.revenus, data.nbPersonnes, isIDF);
    }
    return null;
  }, [data.revenus, data.nbPersonnes, isIDF]);

  useEffect(() => {
    if (category) {
      onChange('categorieRevenus', category);
    }
  }, [category, onChange]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        🏠 Étape 1 : Éligibilité du client
      </h2>

      {/* Logement type */}
      <div>
        <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Type de logement *
        </label>
        <div className="space-y-2">
          {LOGEMENT_TYPES.map(type => (
            <label
              key={type.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.typeLogement === type.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : isDark
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="typeLogement"
                value={type.value}
                checked={data.typeLogement === type.value}
                onChange={(e) => onChange('typeLogement', e.target.value)}
                className="text-emerald-500 focus:ring-emerald-500"
              />
              <span className="flex-1">
                {type.label}
                {type.note && <span className="text-xs ml-2 text-gray-500">({type.note})</span>}
              </span>
              {type.eligible ? (
                <span className="text-xs text-green-600">Éligible</span>
              ) : (
                <span className="text-xs text-red-600">Non éligible</span>
              )}
            </label>
          ))}
        </div>
        {errors.typeLogement && <p className="mt-1 text-sm text-red-500">{errors.typeLogement}</p>}
      </div>

      {/* Code postal */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Code postal du logement *
        </label>
        <input
          type="text"
          value={data.codePostal || ''}
          onChange={(e) => onChange('codePostal', e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="75001"
          maxLength={5}
          className={`w-full px-4 py-2 rounded-lg border ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
        />
        {isIDF && (
          <p className="mt-1 text-sm text-blue-600">
            📍 Île-de-France détectée (plafonds spécifiques)
          </p>
        )}
      </div>

      {/* Ancienneté */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Ancienneté du logement *
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={data.anciennete || ''}
            onChange={(e) => onChange('anciennete', parseInt(e.target.value) || 0)}
            placeholder="15"
            min="0"
            max="200"
            className={`w-32 px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
          />
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>années</span>
        </div>
        <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Minimum 15 ans requis (2 ans pour dépose cuve fioul)
        </p>
        {errors.anciennete && <p className="mt-1 text-sm text-red-500">{errors.anciennete}</p>}
      </div>

      {/* Revenus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Revenus fiscaux de référence (N-1) *
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.revenus || ''}
              onChange={(e) => onChange('revenus', parseInt(e.target.value) || 0)}
              placeholder="35000"
              min="0"
              className={`w-full px-4 py-2 pr-10 rounded-lg border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
            />
            <span className={`absolute right-3 top-2.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>€</span>
          </div>
          {errors.revenus && <p className="mt-1 text-sm text-red-500">{errors.revenus}</p>}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Nombre de personnes dans le foyer *
          </label>
          <input
            type="number"
            value={data.nbPersonnes || ''}
            onChange={(e) => onChange('nbPersonnes', parseInt(e.target.value) || 1)}
            placeholder="3"
            min="1"
            max="20"
            className={`w-full px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
          />
          {errors.nbPersonnes && <p className="mt-1 text-sm text-red-500">{errors.nbPersonnes}</p>}
        </div>
      </div>

      {/* Category result */}
      {category && (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Catégorie de revenus déterminée :
          </p>
          <CategoryBadge category={category} isDark={isDark} />
        </div>
      )}
    </div>
  );
}

/**
 * Step 2: Works Selection
 */
function TravauxStep({ data, onChange, category, isDark }) {
  const [selectedTravaux, setSelectedTravaux] = useState(data.travaux || []);

  const handleToggleTravaux = useCallback((travailId) => {
    setSelectedTravaux(prev => {
      const exists = prev.find(t => t.id === travailId);
      if (exists) {
        return prev.filter(t => t.id !== travailId);
      } else {
        return [...prev, { id: travailId, quantite: 1 }];
      }
    });
  }, []);

  const handleQuantiteChange = useCallback((travailId, quantite) => {
    setSelectedTravaux(prev =>
      prev.map(t => t.id === travailId ? { ...t, quantite: Math.max(1, quantite) } : t)
    );
  }, []);

  useEffect(() => {
    onChange('travaux', selectedTravaux);
  }, [selectedTravaux, onChange]);

  const totalAide = useMemo(() => {
    if (!category?.id) return 0;
    const travaux = selectedTravaux.map(t => ({
      travailId: t.id,
      quantite: t.quantite
    }));
    const result = calculateTotalAide(travaux, category.id);
    return result.totalAide;
  }, [selectedTravaux, category]);

  const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0
  }).format(amount);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        🔧 Étape 2 : Travaux éligibles
      </h2>

      <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-blue-700'}`}>
          Catégorie client : <CategoryBadge category={category} isDark={isDark} />
        </p>
      </div>

      {/* Travaux categories */}
      {Object.entries(TRAVAUX_ELIGIBLES).map(([catName, travaux]) => (
        <div key={catName} className="space-y-3">
          <h3 className={`font-medium capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {catName.replace('_', ' ')}
          </h3>
          <div className="grid gap-3">
            {Object.entries(travaux).map(([key, travail]) => {
              const isSelected = selectedTravaux.some(t => t.id === travail.id);
              const selected = selectedTravaux.find(t => t.id === travail.id);
              const montantUnitaire = travail.montants[category?.id] || 0;
              const aideEstimee = isSelected ? (selected?.quantite || 1) * montantUnitaire : 0;

              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : isDark
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleTravaux(travail.id)}
                      className="mt-1 text-emerald-500 focus:ring-emerald-500 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {travail.label}
                          </p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {montantUnitaire > 0 ? `${montantUnitaire} ${travail.unite}` : 'Non éligible pour cette catégorie'}
                          </p>
                        </div>
                        {montantUnitaire > 0 && (
                          <span className={`text-sm px-2 py-1 rounded ${
                            isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            Plafond: {travail.plafond} {travail.unite.includes('m²') ? 'm²' : 'unité(s)'}
                          </span>
                        )}
                      </div>

                      {isSelected && montantUnitaire > 0 && (
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Quantité:
                            </label>
                            <input
                              type="number"
                              value={selected?.quantite || 1}
                              onChange={(e) => handleQuantiteChange(travail.id, parseInt(e.target.value) || 1)}
                              min="1"
                              max={travail.plafond}
                              className={`w-20 px-2 py-1 rounded border text-sm ${
                                isDark
                                  ? 'bg-gray-700 border-gray-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {travail.unite.includes('m²') ? 'm²' : ''}
                            </span>
                          </div>
                          <div className="flex-1 text-right">
                            <span className="text-emerald-600 font-semibold">
                              Aide estimée : {formatCurrency(aideEstimee)}
                            </span>
                          </div>
                        </div>
                      )}

                      {travail.conditions && travail.conditions.length > 0 && (
                        <div className="mt-2">
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Conditions: {travail.conditions.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Total */}
      <div className={`p-4 rounded-lg border-2 border-emerald-500 ${
        isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'
      }`}>
        <div className="flex justify-between items-center">
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Total aide estimée :
          </span>
          <span className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalAide)}
          </span>
        </div>
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          * Estimation indicative. Le montant définitif sera déterminé après instruction par l'ANAH.
        </p>
      </div>
    </div>
  );
}

/**
 * Step 3: RGE Certification
 */
function RGEStep({ company, isDark, isDemo }) {
  const isValid = company?.rge && new Date(company.rge_validite) > new Date();
  const expiresIn = company?.rge_validite
    ? Math.ceil((new Date(company.rge_validite) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        ✅ Étape 3 : Certification RGE
      </h2>

      {isValid ? (
        <div className={`p-6 rounded-lg border-2 border-green-500 ${
          isDark ? 'bg-green-900/20' : 'bg-green-50'
        }`}>
          <div className="flex items-start gap-4">
            <div className="text-4xl">✅</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-700">
                Votre entreprise est certifiée RGE
              </h3>
              <p className={`mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {company.nom}
              </p>

              <div className="mt-4 space-y-2">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="font-medium">Numéro RGE:</span> {company.rge_numero}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="font-medium">Valide jusqu'au:</span>{' '}
                  {new Date(company.rge_validite).toLocaleDateString('fr-FR')}
                  {expiresIn < 90 && (
                    <span className="ml-2 text-yellow-600">
                      (expire dans {expiresIn} jours)
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-4">
                <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Domaines couverts:
                </p>
                <div className="flex flex-wrap gap-2">
                  {(company.rge_domaines || []).map((domaine, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm ${
                        isDark
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {domaine}
                    </span>
                  ))}
                </div>
              </div>

              <button className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
                isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}>
                📄 Voir le certificat
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`p-6 rounded-lg border-2 border-red-500 ${
          isDark ? 'bg-red-900/20' : 'bg-red-50'
        }`}>
          <div className="flex items-start gap-4">
            <div className="text-4xl">❌</div>
            <div>
              <h3 className="text-lg font-semibold text-red-700">
                Certification RGE requise
              </h3>
              <p className={`mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Votre entreprise n'est pas certifiée RGE ou le certificat a expiré.
              </p>
              <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                La certification RGE est obligatoire pour que vos clients puissent bénéficier de MaPrimeRénov'.
              </p>
              <div className="mt-4 space-y-2">
                <a
                  href="https://www.qualit-enr.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  → Comment obtenir la certification RGE
                </a>
                <br />
                <a
                  href="https://www.qualibat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  → Qualibat - Organisme de certification
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {company?.assurance_decennale && (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Assurance décennale
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            N° {company.assurance_decennale_numero}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Step 4: Devis Generation
 */
function DevisStep({ data, onChange, company, category, isDark, onGenerateDevis }) {
  const [clientInfo, setClientInfo] = useState(data.client || {});
  const [generating, setGenerating] = useState(false);

  const handleClientChange = (field, value) => {
    const updated = { ...clientInfo, [field]: value };
    setClientInfo(updated);
    onChange('client', updated);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerateDevis();
    } finally {
      setGenerating(false);
    }
  };

  const totalAide = useMemo(() => {
    if (!category?.id || !data.travaux) return 0;
    const travaux = data.travaux.map(t => ({ travailId: t.id, quantite: t.quantite }));
    return calculateTotalAide(travaux, category.id).totalAide;
  }, [data.travaux, category]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        📄 Étape 4 : Génération du devis
      </h2>

      {/* Client info */}
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Informations client
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Nom *
            </label>
            <input
              type="text"
              value={clientInfo.nom || ''}
              onChange={(e) => handleClientChange('nom', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-600 border-gray-500 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Prénom
            </label>
            <input
              type="text"
              value={clientInfo.prenom || ''}
              onChange={(e) => handleClientChange('prenom', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-600 border-gray-500 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Adresse *
            </label>
            <input
              type="text"
              value={clientInfo.adresse || ''}
              onChange={(e) => handleClientChange('adresse', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-600 border-gray-500 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Email *
            </label>
            <input
              type="email"
              value={clientInfo.email || ''}
              onChange={(e) => handleClientChange('email', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-600 border-gray-500 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Téléphone
            </label>
            <input
              type="tel"
              value={clientInfo.telephone || ''}
              onChange={(e) => handleClientChange('telephone', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-600 border-gray-500 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Devis summary */}
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Récapitulatif du devis
        </h3>

        <div className="space-y-2 mb-4">
          {data.travaux?.map(t => {
            const travailInfo = Object.values(TRAVAUX_ELIGIBLES)
              .flatMap(cat => Object.values(cat))
              .find(tr => tr.id === t.id);

            return travailInfo ? (
              <div key={t.id} className={`flex justify-between text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <span>{travailInfo.label} ({t.quantite} {travailInfo.unite.includes('m²') ? 'm²' : 'u'})</span>
                <span>{(travailInfo.montants[category?.id] || 0) * t.quantite} €</span>
              </div>
            ) : null;
          })}
        </div>

        <div className={`pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex justify-between font-semibold text-emerald-600">
            <span>Total aide MaPrimeRénov' estimée</span>
            <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalAide)}</span>
          </div>
        </div>
      </div>

      {/* Mentions obligatoires */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-blue-50'}`}>
        <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-blue-800'}`}>
          Mentions obligatoires incluses :
        </h4>
        <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-blue-700'}`}>
          <li>✓ Devis établi dans le cadre de MaPrimeRénov'</li>
          <li>✓ Numéro RGE : {company?.rge_numero}</li>
          <li>✓ TVA 5,5% (rénovation énergétique)</li>
          <li>✓ Travaux éligibles sous réserve d'acceptation ANAH</li>
          <li>✓ Rappel création compte maprimerenov.gouv.fr</li>
        </ul>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || !clientInfo.nom || !clientInfo.email}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          generating || !clientInfo.nom || !clientInfo.email
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Génération en cours...
          </span>
        ) : (
          '📄 Générer le devis conforme MaPrimeRénov\''
        )}
      </button>
    </div>
  );
}

/**
 * Step 5: Documents
 */
function DocumentsStep({ data, company, category, isDark, onSendEmail, onComplete }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const totalAide = useMemo(() => {
    if (!category?.id || !data.travaux) return 0;
    const travaux = data.travaux.map(t => ({ travailId: t.id, quantite: t.quantite }));
    return calculateTotalAide(travaux, category.id).totalAide;
  }, [data.travaux, category]);

  const handleSendEmail = async () => {
    setSending(true);
    try {
      await onSendEmail();
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  const documents = [
    { id: 'devis', label: 'Devis détaillé conforme', ready: true, icon: '📄' },
    { id: 'attestation', label: 'Attestation sur l\'honneur', ready: true, icon: '✍️' },
    { id: 'notice', label: 'Notice explicative client', ready: true, icon: '📋' },
    { id: 'rge', label: 'Certificat RGE', ready: !!company?.rge, icon: '🏆' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        📦 Étape 5 : Dossier client
      </h2>

      {/* Success banner */}
      <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'} border border-green-500`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="font-semibold text-green-700">
              Dossier MaPrimeRénov' prêt !
            </p>
            <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-600'}`}>
              Aide estimée : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalAide)}
            </p>
          </div>
        </div>
      </div>

      {/* Documents list */}
      <div className="space-y-3">
        <h3 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Documents à fournir au client :
        </h3>
        {documents.map(doc => (
          <div
            key={doc.id}
            className={`p-4 rounded-lg border flex items-center justify-between ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{doc.icon}</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {doc.label}
                </p>
                <p className={`text-sm ${doc.ready ? 'text-green-600' : 'text-yellow-600'}`}>
                  {doc.ready ? '✓ Prêt' : '⏳ En attente'}
                </p>
              </div>
            </div>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                doc.ready
                  ? isDark
                    ? 'bg-gray-600 text-white hover:bg-gray-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-300 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!doc.ready}
            >
              Télécharger PDF
            </button>
          </div>
        ))}
      </div>

      {/* Client instructions */}
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
        <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-blue-800'}`}>
          📝 Instructions pour le client :
        </h3>
        <ol className={`space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-blue-700'}`}>
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Créer un compte sur <a href="https://www.maprimerenov.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline">maprimerenov.gouv.fr</a></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Déposer le devis et les justificatifs (avis d'imposition, justificatif de propriété)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Attendre la validation de l'ANAH (2-3 semaines)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Signer le devis <strong>après</strong> réception de l'accord</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">5.</span>
            <span>Réaliser les travaux dans un délai de 2 ans</span>
          </li>
        </ol>
      </div>

      {/* Send email button */}
      <div className="space-y-3">
        <button
          onClick={handleSendEmail}
          disabled={sending || sent}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            sent
              ? 'bg-green-500 text-white cursor-default'
              : sending
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {sent ? (
            <>✓ Pack envoyé avec succès</>
          ) : sending ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Envoi en cours...
            </>
          ) : (
            <>📧 Envoyer le pack complet au client</>
          )}
        </button>

        <button
          onClick={onComplete}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isDark
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✓ Terminer et suivre le dossier
        </button>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

/**
 * MaPrimeRénov' Assistant - Complete wizard component
 * @param {Object} props
 * @param {boolean} props.isDark - Dark mode
 * @param {string} [props.clientId] - Pre-selected client ID
 * @param {string} [props.devisId] - Pre-selected devis ID
 * @param {Function} props.onComplete - Callback when wizard completes
 * @param {Function} [props.onCancel] - Callback to cancel/close
 * @param {boolean} [props.isDemo] - Demo mode
 */
export default function MaPrimeRenovAssistant({
  isDark = false,
  clientId,
  devisId,
  onComplete,
  onCancel,
  isDemo = true
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState({
    typeLogement: 'residence_principale',
    codePostal: '',
    anciennete: 15,
    revenus: 35000,
    nbPersonnes: 3,
    categorieRevenus: null,
    travaux: [],
    client: {},
    devisGenere: false
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [company, setCompany] = useState(isDemo ? DEMO_COMPANY : null);
  const [loading, setLoading] = useState(!isDemo);

  // Load company data
  useEffect(() => {
    if (isDemo) return;

    const loadCompany = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (companyData) {
          setCompany(companyData);
        }
      } catch (err) {
        console.error('Error loading company:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [isDemo]);

  const handleChange = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    // Clear error for field
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [errors]);

  const validateStep = useCallback((step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (data.typeLogement === 'residence_secondaire') {
          newErrors.typeLogement = 'Seules les résidences principales sont éligibles à MaPrimeRénov\'';
        }
        if (data.anciennete < 15) {
          newErrors.anciennete = 'Le logement doit avoir au moins 15 ans (2 ans pour dépose cuve fioul uniquement)';
        }
        if (!data.revenus || data.revenus <= 0) {
          newErrors.revenus = 'Veuillez indiquer les revenus fiscaux de référence';
        }
        if (!data.nbPersonnes || data.nbPersonnes < 1) {
          newErrors.nbPersonnes = 'Veuillez indiquer le nombre de personnes dans le foyer';
        }
        if (!data.codePostal || data.codePostal.length !== 5) {
          newErrors.codePostal = 'Code postal invalide';
        }
        break;

      case 2:
        if (!data.travaux || data.travaux.length === 0) {
          setAlert({ type: 'error', message: 'Veuillez sélectionner au moins un type de travaux' });
          return false;
        }
        break;

      case 3:
        if (!company?.rge || new Date(company.rge_validite) < new Date()) {
          setAlert({ type: 'error', message: 'Certification RGE valide requise pour continuer' });
          return false;
        }
        break;

      case 4:
        if (!data.client?.nom) {
          setAlert({ type: 'error', message: 'Le nom du client est requis' });
          return false;
        }
        if (!data.client?.email) {
          setAlert({ type: 'error', message: 'L\'email du client est requis' });
          return false;
        }
        break;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return false;
    }

    return true;
  }, [data, company]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setAlert(null);
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    setAlert(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleGenerateDevis = useCallback(async () => {
    // Simulate devis generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    setData(prev => ({ ...prev, devisGenere: true }));
    setAlert({ type: 'success', message: 'Devis MaPrimeRénov\' généré avec succès !' });

    // Auto advance to next step
    setTimeout(() => {
      setAlert(null);
      setCurrentStep(5);
    }, 1500);
  }, []);

  const handleSendEmail = useCallback(async () => {
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 2000));

    setAlert({ type: 'success', message: 'Pack documents envoyé au client par email !' });
  }, []);

  const handleComplete = useCallback(async () => {
    // Save dossier
    if (!isDemo) {
      try {
        const totalAide = calculateTotalAide(
          data.travaux.map(t => ({ travailId: t.id, quantite: t.quantite })),
          data.categorieRevenus?.id || 'intermediaire'
        ).totalAide;

        await supabase.from('maprimerenov_dossiers').insert({
          client_nom: `${data.client.prenom || ''} ${data.client.nom}`.trim(),
          client_email: data.client.email,
          status: 'en_preparation',
          montant_aide_estime: totalAide,
          categorie_revenus: data.categorieRevenus?.id,
          travaux: JSON.stringify(data.travaux),
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error saving dossier:', err);
      }
    }

    onComplete?.(data);
  }, [data, isDemo, onComplete]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-12 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Chargement...
      </div>
    );
  }

  return (
    <div className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-lg`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏡</span>
            <div>
              <h1 className="text-xl font-bold">Assistant MaPrimeRénov'</h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Simulez et générez un dossier conforme
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 pt-6">
        <StepProgress currentStep={currentStep} steps={STEPS} isDark={isDark} />
      </div>

      {/* Alert */}
      {alert && (
        <div className="px-6 mb-4">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            isDark={isDark}
          />
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4 min-h-[400px]">
        {currentStep === 1 && (
          <EligibilityStep
            data={data}
            onChange={handleChange}
            errors={errors}
            isDark={isDark}
          />
        )}
        {currentStep === 2 && (
          <TravauxStep
            data={data}
            onChange={handleChange}
            category={data.categorieRevenus}
            isDark={isDark}
          />
        )}
        {currentStep === 3 && (
          <RGEStep
            company={company}
            isDark={isDark}
            isDemo={isDemo}
          />
        )}
        {currentStep === 4 && (
          <DevisStep
            data={data}
            onChange={handleChange}
            company={company}
            category={data.categorieRevenus}
            isDark={isDark}
            onGenerateDevis={handleGenerateDevis}
          />
        )}
        {currentStep === 5 && (
          <DocumentsStep
            data={data}
            company={company}
            category={data.categorieRevenus}
            isDark={isDark}
            onSendEmail={handleSendEmail}
            onComplete={handleComplete}
          />
        )}
      </div>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between`}>
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : isDark
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ← Précédent
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

// ============ NAMED EXPORTS ============

export { StepProgress, Alert, CategoryBadge, STATUS_COLORS, STEPS };
