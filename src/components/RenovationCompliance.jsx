import { useState, useMemo } from 'react';
import {
  X, Leaf, Home, Users, Euro, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, ChevronDown, Info, Calculator, FileText, Building2,
  Thermometer, Wind, Sun, Droplets, Zap, HelpCircle, ArrowRight, Download
} from 'lucide-react';
import {
  REVENUE_CATEGORIES,
  TRAVAUX_ELIGIBLES,
  RE2020_EXIGENCES,
  determineRevenueCategory,
  calculateTotalAide,
  checkEligibility,
  checkRE2020Compliance,
  getTravauxByCategory,
  getAllTravaux
} from '../lib/compliance/renovation-compliance';

export default function RenovationCompliance({
  onClose,
  client = null,
  chantier = null,
  isDark = false,
  couleur = '#f97316'
}) {
  // États
  const [activeTab, setActiveTab] = useState('maprimenov'); // maprimenov | re2020
  const [step, setStep] = useState(1); // 1: infos client, 2: travaux, 3: résultat

  // MaPrimeRénov' states
  const [revenuFiscal, setRevenuFiscal] = useState('');
  const [nbPersonnes, setNbPersonnes] = useState(2);
  const [isIDF, setIsIDF] = useState(false);
  const [anneeConstruction, setAnneeConstruction] = useState('');
  const [typeUsage, setTypeUsage] = useState('principale');
  const [artisanRGE, setArtisanRGE] = useState(true);
  const [selectedTravaux, setSelectedTravaux] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState('isolation');

  // RE2020 states
  const [typeBatiment, setTypeBatiment] = useState('maison');
  const [re2020Values, setRE2020Values] = useState({
    bbio: '',
    cep: '',
    cep_nr: '',
    ic_energie: '',
    ic_construction: '',
    dh: ''
  });

  // Calculs
  const revenueCategory = useMemo(() => {
    if (!revenuFiscal) return null;
    return determineRevenueCategory(parseFloat(revenuFiscal), nbPersonnes, isIDF);
  }, [revenuFiscal, nbPersonnes, isIDF]);

  const eligibilityResult = useMemo(() => {
    return checkEligibility({
      anneeConstruction: anneeConstruction ? parseInt(anneeConstruction) : null,
      typeUsage,
      artisanRGE
    });
  }, [anneeConstruction, typeUsage, artisanRGE]);

  const aidesResult = useMemo(() => {
    if (!revenueCategory || selectedTravaux.length === 0) return null;
    return calculateTotalAide(selectedTravaux, revenueCategory.id);
  }, [revenueCategory, selectedTravaux]);

  const re2020Result = useMemo(() => {
    const values = {};
    Object.entries(re2020Values).forEach(([key, val]) => {
      if (val !== '') values[key] = parseFloat(val);
    });
    if (Object.keys(values).length === 0) return null;
    return checkRE2020Compliance(values, typeBatiment);
  }, [re2020Values, typeBatiment]);

  // Handlers
  const toggleTravail = (travailId) => {
    setSelectedTravaux(prev => {
      const existing = prev.find(t => t.travailId === travailId);
      if (existing) {
        return prev.filter(t => t.travailId !== travailId);
      }
      return [...prev, { travailId, quantite: 1 }];
    });
  };

  const updateQuantite = (travailId, quantite) => {
    setSelectedTravaux(prev =>
      prev.map(t =>
        t.travailId === travailId ? { ...t, quantite: Math.max(1, quantite) } : t
      )
    );
  };

  const categoryIcons = {
    isolation: Thermometer,
    chauffage: Zap,
    fenetres: Sun,
    ventilation: Wind,
    audit: FileText
  };

  const categoryLabels = {
    isolation: 'Isolation',
    chauffage: 'Chauffage & Eau chaude',
    fenetres: 'Fenêtres',
    ventilation: 'Ventilation',
    audit: 'Audit énergétique'
  };

  // === Render MaPrimeRénov' ===
  const renderMaPrimeRenovStep1 = () => (
    <div className="space-y-4">
      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Informations du ménage
      </h3>

      {/* Revenu fiscal */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Revenu fiscal de référence (€)
        </label>
        <input
          type="number"
          value={revenuFiscal}
          onChange={(e) => setRevenuFiscal(e.target.value)}
          placeholder="Ex: 35000"
          className={`w-full px-4 py-2 rounded-lg border ${
            isDark
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Ligne 25 de l'avis d'imposition
        </p>
      </div>

      {/* Nombre de personnes */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Nombre de personnes dans le foyer
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => setNbPersonnes(n)}
              className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                nbPersonnes === n
                  ? 'text-white'
                  : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={nbPersonnes === n ? { backgroundColor: couleur } : {}}
            >
              {n}{n === 6 ? '+' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Zone géographique */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Zone géographique
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setIsIDF(false)}
            className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
              !isIDF
                ? 'border-2'
                : isDark
                ? 'bg-gray-800 border-gray-700 text-gray-300'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
            style={!isIDF ? { borderColor: couleur, color: couleur } : {}}
          >
            Province
          </button>
          <button
            onClick={() => setIsIDF(true)}
            className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
              isIDF
                ? 'border-2'
                : isDark
                ? 'bg-gray-800 border-gray-700 text-gray-300'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
            style={isIDF ? { borderColor: couleur, color: couleur } : {}}
          >
            Île-de-France
          </button>
        </div>
      </div>

      {/* Catégorie déterminée */}
      {revenueCategory && (
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: `${revenueCategory.color}20` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full"
              style={{ backgroundColor: revenueCategory.color }}
            />
            <div>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Catégorie MaPrimeRénov' : {revenueCategory.colorName}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Ménage {revenueCategory.label.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Informations logement */}
      <h3 className={`font-semibold pt-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Informations du logement
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Année de construction
          </label>
          <input
            type="number"
            value={anneeConstruction}
            onChange={(e) => setAnneeConstruction(e.target.value)}
            placeholder="Ex: 1985"
            className={`w-full px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Type d'usage
          </label>
          <select
            value={typeUsage}
            onChange={(e) => setTypeUsage(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="principale">Résidence principale</option>
            <option value="secondaire">Résidence secondaire</option>
            <option value="locatif">Location</option>
          </select>
        </div>
      </div>

      {/* Artisan RGE */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={artisanRGE}
          onChange={(e) => setArtisanRGE(e.target.checked)}
          className="w-5 h-5 rounded"
          style={{ accentColor: couleur }}
        />
        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
          Les travaux seront réalisés par un artisan RGE
        </span>
      </label>

      {/* Vérifications éligibilité */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <p className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Vérifications d'éligibilité
        </p>
        <div className="space-y-2">
          {eligibilityResult.checks.map(check => (
            <div key={check.id} className="flex items-center gap-2">
              {check.passed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {check.label}
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                ({check.detail})
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setStep(2)}
        disabled={!revenueCategory}
        className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
          revenueCategory
            ? 'text-white'
            : isDark
            ? 'bg-gray-700 text-gray-500'
            : 'bg-gray-200 text-gray-400'
        }`}
        style={revenueCategory ? { backgroundColor: couleur } : {}}
      >
        Sélectionner les travaux
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderMaPrimeRenovStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Travaux éligibles
        </h3>
        {revenueCategory && (
          <span
            className="px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: revenueCategory.color }}
          >
            {revenueCategory.colorName}
          </span>
        )}
      </div>

      {/* Catégories de travaux */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {Object.entries(categoryLabels).map(([catKey, catLabel]) => {
          const Icon = categoryIcons[catKey];
          const travaux = getTravauxByCategory(catKey);
          const isExpanded = expandedCategory === catKey;
          const selectedInCat = selectedTravaux.filter(t =>
            travaux.some(tr => tr.id === t.travailId)
          );

          return (
            <div
              key={catKey}
              className={`rounded-xl border overflow-hidden ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                className={`w-full flex items-center justify-between p-4 ${
                  isDark ? 'bg-gray-800' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" style={{ color: couleur }} />
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {catLabel}
                  </span>
                  {selectedInCat.length > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs text-white"
                      style={{ backgroundColor: couleur }}
                    >
                      {selectedInCat.length}
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                ) : (
                  <ChevronRight className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                )}
              </button>

              {isExpanded && (
                <div className={`p-4 space-y-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                  {travaux.map(travail => {
                    const isSelected = selectedTravaux.some(t => t.travailId === travail.id);
                    const selected = selectedTravaux.find(t => t.travailId === travail.id);
                    const montant = travail.montants[revenueCategory?.id] || 0;

                    return (
                      <div
                        key={travail.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-2'
                            : isDark
                            ? 'border-gray-700 bg-gray-800'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                        style={isSelected ? { borderColor: couleur } : {}}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTravail(travail.id)}
                            className="mt-1 w-5 h-5 rounded"
                            style={{ accentColor: couleur }}
                          />
                          <div className="flex-1">
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {travail.label}
                            </p>
                            <p className="text-sm" style={{ color: couleur }}>
                              {montant > 0 ? `${montant} ${travail.unite}` : 'Non éligible'}
                            </p>
                            {travail.conditions.length > 0 && (
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {travail.conditions[0]}
                              </p>
                            )}
                          </div>
                        </div>

                        {isSelected && travail.plafond > 1 && (
                          <div className="mt-3 flex items-center gap-3">
                            <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              Quantité (max {travail.plafond}):
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={travail.plafond}
                              value={selected?.quantite || 1}
                              onChange={(e) => updateQuantite(travail.id, parseInt(e.target.value))}
                              className={`w-20 px-2 py-1 rounded border ${
                                isDark
                                  ? 'bg-gray-700 border-gray-600 text-white'
                                  : 'bg-white border-gray-300'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Résumé aides */}
      {aidesResult && (
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: `${couleur}15` }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Aide estimée MaPrimeRénov'
            </span>
            <span className="text-xl font-bold" style={{ color: couleur }}>
              {aidesResult.totalAide.toLocaleString('fr-FR')} €
            </span>
          </div>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {selectedTravaux.length} travaux sélectionnés
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setStep(1)}
          className={`flex-1 py-3 rounded-xl font-medium ${
            isDark
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Retour
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={selectedTravaux.length === 0}
          className={`flex-1 py-3 rounded-xl font-medium text-white ${
            selectedTravaux.length === 0 ? 'opacity-50' : ''
          }`}
          style={{ backgroundColor: couleur }}
        >
          Voir le récapitulatif
        </button>
      </div>
    </div>
  );

  const renderMaPrimeRenovStep3 = () => (
    <div className="space-y-4">
      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Récapitulatif de votre simulation
      </h3>

      {/* Catégorie */}
      {revenueCategory && (
        <div
          className="p-4 rounded-xl flex items-center gap-4"
          style={{ backgroundColor: `${revenueCategory.color}20` }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: revenueCategory.color }}
          >
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              MaPrimeRénov' {revenueCategory.colorName}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Ménage {revenueCategory.label.toLowerCase()} • {nbPersonnes} personne(s)
            </p>
          </div>
        </div>
      )}

      {/* Travaux */}
      <div className={`rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`p-3 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Travaux sélectionnés
          </p>
        </div>
        <div className={`p-4 space-y-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
          {aidesResult?.details.map((detail, index) => {
            const travail = getAllTravaux().find(t => t.id === detail.travailId);
            return (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {travail?.label}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {detail.quantite > 1 ? `${detail.quantite} x ` : ''}{detail.montantUnitaire} {detail.unite}
                  </p>
                </div>
                <span className="font-semibold" style={{ color: couleur }}>
                  {detail.aide.toLocaleString('fr-FR')} €
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <div
        className="p-4 rounded-xl text-center"
        style={{ backgroundColor: couleur }}
      >
        <p className="text-white/80 text-sm">Aide totale estimée</p>
        <p className="text-3xl font-bold text-white">
          {aidesResult?.totalAide.toLocaleString('fr-FR')} €
        </p>
      </div>

      {/* Eligibilité */}
      <div className={`p-4 rounded-xl ${
        eligibilityResult.isEligible
          ? isDark ? 'bg-green-900/30' : 'bg-green-50'
          : isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {eligibilityResult.isEligible ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          )}
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {eligibilityResult.message}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className={`p-3 rounded-lg flex items-start gap-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <Info className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Simulation indicative basée sur les barèmes 2024. Le montant définitif sera déterminé
          après instruction du dossier par l'ANAH. Cumul possible avec CEE, éco-PTZ et aides locales.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep(2)}
          className={`flex-1 py-3 rounded-xl font-medium ${
            isDark
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Modifier
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl font-medium text-white"
          style={{ backgroundColor: couleur }}
        >
          Terminer
        </button>
      </div>
    </div>
  );

  // === Render RE2020 ===
  const renderRE2020 = () => (
    <div className="space-y-4">
      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Vérification RE2020
      </h3>

      {/* Type de bâtiment */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Type de construction
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setTypeBatiment('maison')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
              typeBatiment === 'maison'
                ? ''
                : isDark
                ? 'bg-gray-800 border-gray-700 text-gray-300'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
            style={typeBatiment === 'maison' ? { borderColor: couleur, color: couleur } : {}}
          >
            <Home className="w-5 h-5" />
            Maison individuelle
          </button>
          <button
            onClick={() => setTypeBatiment('collectif')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
              typeBatiment === 'collectif'
                ? ''
                : isDark
                ? 'bg-gray-800 border-gray-700 text-gray-300'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
            style={typeBatiment === 'collectif' ? { borderColor: couleur, color: couleur } : {}}
          >
            <Building2 className="w-5 h-5" />
            Logement collectif
          </button>
        </div>
      </div>

      {/* Saisie des indicateurs */}
      <div className="space-y-4">
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Renseignez les valeurs de l'étude thermique (laissez vide si non applicable)
        </p>

        {Object.entries(RE2020_EXIGENCES).map(([key, exigence]) => {
          const seuil = exigence.seuils[typeBatiment];
          const value = re2020Values[exigence.id];
          const hasValue = value !== '';
          const isOK = hasValue && parseFloat(value) <= seuil.max;

          return (
            <div
              key={key}
              className={`p-4 rounded-xl border ${
                isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {exigence.label}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Seuil: ≤ {seuil.max} {seuil.unit}
                  </p>
                </div>
                {hasValue && (
                  isOK ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setRE2020Values(prev => ({
                    ...prev,
                    [exigence.id]: e.target.value
                  }))}
                  placeholder={`Ex: ${Math.round(seuil.max * 0.8)}`}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {seuil.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Résultat RE2020 */}
      {re2020Result && (
        <div
          className={`p-4 rounded-xl ${
            re2020Result.isCompliant
              ? isDark ? 'bg-green-900/30' : 'bg-green-50'
              : isDark ? 'bg-red-900/30' : 'bg-red-50'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {re2020Result.isCompliant ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {re2020Result.isCompliant ? 'Conforme RE2020' : 'Non conforme'}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {re2020Result.totalOK}/{re2020Result.total} indicateurs validés
              </p>
            </div>
          </div>

          {/* Indicateurs non conformes */}
          {re2020Result.results.filter(r => !r.passed).map(result => (
            <div
              key={result.id}
              className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            >
              <p className={`font-medium text-red-500`}>
                {result.label}: {result.valeur} {result.unite} (max: {result.seuil})
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Dépassement: +{result.ecartPourcent}%
              </p>
              {result.conseils.length > 0 && (
                <div className="mt-2">
                  <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Conseils d'amélioration:
                  </p>
                  <ul className={`text-xs mt-1 space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {result.conseils.map((conseil, i) => (
                      <li key={i}>• {conseil}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${couleur}20` }}
            >
              <Leaf className="w-5 h-5" style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Aides & Conformité
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                MaPrimeRénov' et RE2020
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => { setActiveTab('maprimenov'); setStep(1); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'maprimenov'
                ? ''
                : isDark
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'maprimenov' ? { color: couleur } : {}}
          >
            MaPrimeRénov'
            {activeTab === 'maprimenov' && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: couleur }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('re2020')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 're2020'
                ? ''
                : isDark
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 're2020' ? { color: couleur } : {}}
          >
            RE2020
            {activeTab === 're2020' && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: couleur }}
              />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'maprimenov' && (
            <>
              {step === 1 && renderMaPrimeRenovStep1()}
              {step === 2 && renderMaPrimeRenovStep2()}
              {step === 3 && renderMaPrimeRenovStep3()}
            </>
          )}
          {activeTab === 're2020' && renderRE2020()}
        </div>
      </div>
    </div>
  );
}
