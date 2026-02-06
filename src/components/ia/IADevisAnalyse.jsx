import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  Image,
  Loader,
  Euro,
  ShieldCheck,
  ArrowRight,
  Zap,
  Search,
  CalendarDays,
  Tag,
  BarChart3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'cp_ia_analyses';

const fmtCurrency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtShortDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const loadAnalyses = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveAnalyses = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUTS = {
  en_cours: { label: 'En cours', color: 'blue', icon: Loader },
  terminee: { label: 'Terminée', color: 'green', icon: CheckCircle },
  erreur: { label: 'Erreur', color: 'red', icon: AlertCircle },
  appliquee: { label: 'Appliquée', color: 'purple', icon: FileText },
};

// ---------------------------------------------------------------------------
// Mock analysis engine
// ---------------------------------------------------------------------------

const travauxDb = [
  {
    cat: 'demolition',
    items: [
      { designation: 'Dépose carrelage existant', unite: 'm²', prixMin: 15, prixMax: 25 },
      { designation: 'Évacuation gravats', unite: 'forfait', prixMin: 200, prixMax: 500 },
      { designation: 'Dépose sanitaires', unite: 'u', prixMin: 80, prixMax: 150 },
    ],
  },
  {
    cat: 'plomberie',
    items: [
      { designation: 'Fourniture et pose receveur de douche', unite: 'u', prixMin: 400, prixMax: 800 },
      { designation: 'Fourniture et pose WC suspendu', unite: 'u', prixMin: 500, prixMax: 900 },
      { designation: 'Fourniture et pose lavabo + robinetterie', unite: 'u', prixMin: 300, prixMax: 600 },
      { designation: 'Modification réseau eau chaude/froide', unite: 'forfait', prixMin: 300, prixMax: 700 },
    ],
  },
  {
    cat: 'carrelage',
    items: [
      { designation: 'Fourniture et pose carrelage sol', unite: 'm²', prixMin: 45, prixMax: 85 },
      { designation: 'Fourniture et pose faïence murale', unite: 'm²', prixMin: 50, prixMax: 90 },
      { designation: 'Réalisation joints', unite: 'm²', prixMin: 8, prixMax: 15 },
    ],
  },
  {
    cat: 'electricite',
    items: [
      { designation: 'Mise aux normes tableau électrique', unite: 'forfait', prixMin: 400, prixMax: 800 },
      { designation: 'Fourniture et pose spots LED', unite: 'u', prixMin: 45, prixMax: 85 },
      { designation: 'Point lumineux supplémentaire', unite: 'u', prixMin: 80, prixMax: 150 },
    ],
  },
  {
    cat: 'peinture',
    items: [
      { designation: 'Préparation murs (enduit + ponçage)', unite: 'm²', prixMin: 12, prixMax: 22 },
      { designation: 'Peinture murs 2 couches', unite: 'm²', prixMin: 15, prixMax: 28 },
      { designation: 'Peinture plafond', unite: 'm²', prixMin: 18, prixMax: 30 },
    ],
  },
  {
    cat: 'menuiserie',
    items: [
      { designation: 'Fourniture et pose porte intérieure', unite: 'u', prixMin: 250, prixMax: 500 },
      { designation: 'Fourniture et pose meuble vasque', unite: 'u', prixMin: 400, prixMax: 900 },
    ],
  },
];

function randBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function mockAnalyse(description) {
  const surface = parseFloat((description || '').match(/(\d+)\s*m²/)?.[1] || '12');
  const descLower = (description || '').toLowerCase();

  // Determine relevant categories based on keywords
  let relevantCats = [];
  if (/salle.de.bain|douche|baignoire|wc|lavabo|sanitaire|plomb/i.test(descLower)) {
    relevantCats.push('demolition', 'plomberie', 'carrelage', 'electricite');
  }
  if (/cuisine/i.test(descLower)) {
    relevantCats.push('demolition', 'plomberie', 'electricite', 'carrelage', 'menuiserie');
  }
  if (/peinture|mur|plafond|rafra/i.test(descLower)) {
    relevantCats.push('peinture');
  }
  if (/électr|spot|luminaire|tableau/i.test(descLower)) {
    relevantCats.push('electricite');
  }
  if (/carrelage|sol|faïence/i.test(descLower)) {
    relevantCats.push('carrelage');
  }
  if (/porte|fenêtre|menuiserie|meuble/i.test(descLower)) {
    relevantCats.push('menuiserie');
  }
  if (/rénovation|rénov/i.test(descLower) && relevantCats.length === 0) {
    relevantCats = ['demolition', 'plomberie', 'carrelage', 'electricite', 'peinture'];
  }
  if (relevantCats.length === 0) {
    relevantCats = travauxDb.map((c) => c.cat);
  }

  // Deduplicate
  relevantCats = [...new Set(relevantCats)];

  // Pick items from relevant categories
  const allRelevant = travauxDb
    .filter((c) => relevantCats.includes(c.cat))
    .flatMap((c) => c.items.map((item) => ({ ...item, cat: c.cat })));

  const count = Math.min(allRelevant.length, Math.floor(Math.random() * 4) + 4); // 4-7
  const selected = pickRandom(allRelevant, count);

  const travaux = selected.map((item) => {
    let quantite;
    if (item.unite === 'm²') {
      quantite = Math.round(surface * (0.6 + Math.random() * 0.8) * 10) / 10;
    } else if (item.unite === 'u') {
      quantite = Math.floor(Math.random() * 3) + 1;
    } else {
      quantite = 1;
    }
    const prixUnitaire = randBetween(item.prixMin, item.prixMax);
    return {
      id: crypto.randomUUID(),
      designation: item.designation,
      quantite,
      unite: item.unite,
      prixUnitaire,
      totalHT: Math.round(quantite * prixUnitaire * 100) / 100,
    };
  });

  const totalHT = Math.round(travaux.reduce((s, t) => s + t.totalHT, 0) * 100) / 100;
  const confiance = Math.floor(Math.random() * 24) + 72; // 72-95
  const categorie = relevantCats[0] || 'general';

  return {
    description: description || 'Analyse automatique',
    categorie,
    surfaceEstimee: surface,
    travaux,
    totalHT,
    confiance,
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ statut, isDark }) {
  const cfg = STATUTS[statut] || STATUTS.en_cours;
  const Icon = cfg.icon;
  const colorMap = {
    blue: isDark
      ? 'bg-blue-900/40 text-blue-300 border-blue-700'
      : 'bg-blue-50 text-blue-700 border-blue-200',
    green: isDark
      ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: isDark
      ? 'bg-red-900/40 text-red-300 border-red-700'
      : 'bg-red-50 text-red-700 border-red-200',
    purple: isDark
      ? 'bg-purple-900/40 text-purple-300 border-purple-700'
      : 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const pulse = statut === 'en_cours' ? 'animate-pulse' : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorMap[cfg.color]} ${pulse}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function ConfidenceBadge({ value, couleur }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex items-center gap-2">
      <svg width="52" height="52" className="-rotate-90">
        <circle cx="26" cy="26" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200" />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke={couleur}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div>
        <div className="text-lg font-bold" style={{ color: couleur }}>
          {value}%
        </div>
        <div className="text-xs text-slate-500">Confiance</div>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep, isDark, couleur }) {
  const steps = [
    { key: 1, label: 'Photo' },
    { key: 2, label: 'Analyse' },
    { key: 3, label: 'Résultats' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, idx) => {
        const isActive = s.key === currentStep;
        const isDone = s.key < currentStep;
        return (
          <React.Fragment key={s.key}>
            {idx > 0 && (
              <div
                className="h-0.5 w-8 rounded-full"
                style={{ backgroundColor: isDone ? couleur : isDark ? '#475569' : '#e2e8f0' }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                style={{
                  backgroundColor: isActive || isDone ? couleur : isDark ? '#334155' : '#e2e8f0',
                  color: isActive || isDone ? '#fff' : isDark ? '#94a3b8' : '#64748b',
                }}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : s.key}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? '' : isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
                style={isActive ? { color: couleur } : undefined}
              >
                {s.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, isDark, couleur }) {
  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 ${
        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: couleur + '18' }}
      >
        <Icon className="w-5 h-5" style={{ color: couleur }} />
      </div>
      <div>
        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
        <div className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</div>
      </div>
    </div>
  );
}

function AnalysisCard({ analyse, isDark, couleur, onClick }) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md hover:scale-[1.01] ${
        isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Thumbnail placeholder */}
      <div
        className={`w-full h-28 rounded-lg mb-3 flex items-center justify-center ${
          isDark ? 'bg-slate-700' : 'bg-slate-100'
        }`}
      >
        <Image className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`text-sm font-semibold line-clamp-2 ${textPrimary}`}>
          {analyse.description || 'Analyse sans titre'}
        </h3>
        <StatusBadge statut={analyse.statut} isDark={isDark} />
      </div>

      <div className={`text-xs ${textMuted} mb-2`}>
        <CalendarDays className="w-3 h-3 inline mr-1" />
        {fmtShortDate(analyse.created_at)}
      </div>

      {analyse.analyse_resultat && (
        <div className="flex items-center justify-between">
          <span className={`text-xs ${textMuted}`}>
            {analyse.analyse_resultat.travaux?.length || 0} poste(s)
          </span>
          <span className="text-sm font-bold" style={{ color: couleur }}>
            {fmtCurrency.format(analyse.analyse_resultat.totalHT || 0)} HT
          </span>
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function IADevisAnalyse({
  catalogue = [],
  clients = [],
  isDark = false,
  couleur = '#f97316',
  onCreateDevis,
}) {
  // ---- State ----
  const [analyses, setAnalyses] = useState(() => loadAnalyses());
  const [view, setView] = useState('list'); // list | new | detail
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // New analysis flow
  const [step, setStep] = useState(1); // 1: photo, 2: analyse, 3: results
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [analyseResult, setAnalyseResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // ---- Persistence ----
  useEffect(() => {
    saveAnalyses(analyses);
  }, [analyses]);

  // ---- Theme helpers ----
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const pageBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // ---- Derived ----
  const selectedAnalyse = analyses.find((a) => a.id === selectedId) || null;

  const filteredAnalyses = searchTerm.trim()
    ? analyses.filter(
        (a) =>
          (a.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (a.analyse_resultat?.categorie || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : analyses;

  const totalHTAll = analyses.reduce((s, a) => s + (a.analyse_resultat?.totalHT || 0), 0);
  const avgConfiance =
    analyses.length > 0
      ? Math.round(analyses.reduce((s, a) => s + (a.confiance || 0), 0) / analyses.length)
      : 0;

  // ---- Handlers ----

  const resetNewFlow = useCallback(() => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setDescription('');
    setProgress(0);
    setProgressLabel('');
    setAnalyseResult(null);
    setError(null);
  }, []);

  const handleOpenNew = () => {
    resetNewFlow();
    setView('new');
  };

  const handleBackToList = () => {
    resetNewFlow();
    setView('list');
    setSelectedId(null);
  };

  const handleSelectAnalyse = (id) => {
    setSelectedId(id);
    setView('detail');
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image.');
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleStartAnalysis = () => {
    if (!file) {
      setError('Veuillez ajouter une photo.');
      return;
    }
    setStep(2);
    setProgress(0);
    setError(null);

    const labels = [
      'Analyse de l’image...',
      'Identification des travaux...',
      'Estimation des quantités...',
      'Calcul des prix...',
    ];

    let current = 0;
    setProgressLabel(labels[0]);

    const interval = setInterval(() => {
      current += 1;
      const pct = Math.min(current, 100);
      setProgress(pct);

      // Change label at thresholds
      if (pct >= 25 && pct < 50) setProgressLabel(labels[1]);
      else if (pct >= 50 && pct < 75) setProgressLabel(labels[2]);
      else if (pct >= 75) setProgressLabel(labels[3]);

      if (pct >= 100) {
        clearInterval(interval);
        // Generate mock result
        try {
          const result = mockAnalyse(description);
          setAnalyseResult(result);

          // Save to localStorage
          const newEntry = {
            id: crypto.randomUUID(),
            photoName: file.name || 'photo.jpg',
            description: description.trim() || 'Analyse photo',
            statut: 'terminee',
            confiance: result.confiance,
            analyse_resultat: result,
            created_at: result.created_at,
          };
          setAnalyses((prev) => [newEntry, ...prev]);
          setSelectedId(newEntry.id);

          setTimeout(() => setStep(3), 400);
        } catch {
          setError('Erreur lors de l’analyse. Veuillez réessayer.');
          setStep(1);
        }
      }
    }, 35); // ~3.5 seconds total

    return () => clearInterval(interval);
  };

  const handleRetryAnalysis = () => {
    setStep(1);
    setAnalyseResult(null);
    setProgress(0);
  };

  const handleDeleteAnalyse = (id) => {
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setView('list');
    }
  };

  const handleCreateDevis = (analyse) => {
    if (!onCreateDevis || !analyse?.analyse_resultat) return;
    // Mark as applied
    setAnalyses((prev) =>
      prev.map((a) => (a.id === analyse.id ? { ...a, statut: 'appliquee' } : a))
    );
    onCreateDevis({
      lignes: analyse.analyse_resultat.travaux.map((t) => ({
        designation: t.designation,
        quantite: t.quantite,
        unite: t.unite,
        prixUnitaire: t.prixUnitaire,
        totalHT: t.totalHT,
      })),
      description: analyse.description,
      totalHT: analyse.analyse_resultat.totalHT,
      source: 'ia_analyse',
      analyseId: analyse.id,
    });
  };

  // ---- Renderers ----

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: couleur + '18' }}
      >
        <Camera className="w-10 h-10" style={{ color: couleur }} />
      </div>
      <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>Analyse IA de devis</h2>
      <p className={`text-sm text-center max-w-md mb-6 ${textMuted}`}>
        Prenez une photo de votre chantier et notre IA génèrera automatiquement une estimation
        détaillée des travaux avec les prix du marché.
      </p>
      <button
        onClick={handleOpenNew}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
        style={{ backgroundColor: couleur }}
      >
        <Plus className="w-5 h-5" />
        Nouvelle analyse
      </button>
    </div>
  );

  const renderKpis = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <KpiCard
        icon={BarChart3}
        label="Analyses réalisées"
        value={analyses.length}
        isDark={isDark}
        couleur={couleur}
      />
      <KpiCard
        icon={Euro}
        label="Total estimé HT"
        value={fmtCurrency.format(totalHTAll)}
        isDark={isDark}
        couleur={couleur}
      />
      <KpiCard
        icon={ShieldCheck}
        label="Confiance moy."
        value={`${avgConfiance}%`}
        isDark={isDark}
        couleur={couleur}
      />
    </div>
  );

  const renderListView = () => (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Analyses IA</h1>
          <p className={`text-sm ${textMuted}`}>
            Générez des estimations de travaux à partir de photos
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: couleur }}
        >
          <Plus className="w-4 h-4" />
          Nouvelle analyse
        </button>
      </div>

      {analyses.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {renderKpis()}

          {/* Search */}
          <div className="relative mb-4">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une analyse..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
              style={{ '--tw-ring-color': couleur }}
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnalyses.map((a) => (
              <AnalysisCard
                key={a.id}
                analyse={a}
                isDark={isDark}
                couleur={couleur}
                onClick={() => handleSelectAnalyse(a.id)}
              />
            ))}
          </div>

          {filteredAnalyses.length === 0 && searchTerm && (
            <div className={`text-center py-12 ${textMuted}`}>
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune analyse trouvée pour &laquo;&nbsp;{searchTerm}&nbsp;&raquo;</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div>
      <StepIndicator currentStep={1} isDark={isDark} couleur={couleur} />

      {/* Drop zone */}
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:scale-[1.01] ${
          preview
            ? 'border-transparent'
            : isDark
            ? 'border-slate-600 hover:border-slate-500'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Aperçu"
              className="w-full max-h-64 object-contain rounded-lg mx-auto"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setPreview(null);
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className={`mt-3 text-sm ${textMuted}`}>{file?.name}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: couleur + '18' }}
            >
              <Camera className="w-8 h-8" style={{ color: couleur }} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${textPrimary}`}>
                Glissez une photo ou cliquez pour parcourir
              </p>
              <p className={`text-xs mt-1 ${textMuted}`}>JPG, PNG, HEIC &mdash; max 10 Mo</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: couleur }}
              >
                <Upload className="w-4 h-4" />
                Parcourir
              </span>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Description */}
      <div className="mt-5">
        <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
          Description du chantier
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : Rénovation salle de bain 8m², cuisine 15m²..."
          className={`w-full px-4 py-2.5 rounded-lg border text-sm ${inputCls} focus:outline-none focus:ring-2`}
          style={{ '--tw-ring-color': couleur }}
        />
        <p className={`text-xs mt-1 ${textMuted}`}>
          Précisez la surface et le type de travaux pour une meilleure estimation.
        </p>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handleBackToList}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${textMuted} hover:opacity-80 transition`}
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>
        <button
          onClick={handleStartAnalysis}
          disabled={!file}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: couleur }}
        >
          <Sparkles className="w-4 h-4" />
          Lancer l&rsquo;analyse
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <StepIndicator currentStep={2} isDark={isDark} couleur={couleur} />

      <div className="flex flex-col items-center py-10">
        {/* Animated sparkle */}
        <div className="relative mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ backgroundColor: couleur + '22' }}
          >
            <Zap className="w-10 h-10" style={{ color: couleur }} />
          </div>
        </div>

        <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>Analyse en cours</h3>
        <p className={`text-sm mb-6 ${textMuted}`}>{progressLabel}</p>

        {/* Progress bar */}
        <div className="w-full max-w-sm">
          <div
            className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: couleur }}
            />
          </div>
          <div className={`text-sm font-medium text-center mt-2 ${textMuted}`}>{progress}%</div>
        </div>

        {/* Step labels */}
        <div className="mt-8 space-y-2 w-full max-w-xs">
          {[
            { label: 'Analyse de l’image', threshold: 0 },
            { label: 'Identification des travaux', threshold: 25 },
            { label: 'Estimation des quantités', threshold: 50 },
            { label: 'Calcul des prix', threshold: 75 },
          ].map((s) => {
            const done = progress >= s.threshold + 25;
            const active = progress >= s.threshold && progress < s.threshold + 25;
            return (
              <div key={s.threshold} className="flex items-center gap-2.5">
                {done ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : active ? (
                  <Loader className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: couleur }} />
                ) : (
                  <Clock className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                )}
                <span
                  className={`text-sm ${
                    done
                      ? 'text-emerald-600 font-medium'
                      : active
                      ? 'font-medium'
                      : isDark
                      ? 'text-slate-500'
                      : 'text-slate-400'
                  }`}
                  style={active ? { color: couleur } : undefined}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (!analyseResult) return null;

    const { travaux, totalHT, confiance, surfaceEstimee, categorie } = analyseResult;
    const tva10 = Math.round(totalHT * 0.1 * 100) / 100;
    const tva20 = Math.round(totalHT * 0.2 * 100) / 100;
    const totalTTC10 = Math.round((totalHT + tva10) * 100) / 100;
    const totalTTC20 = Math.round((totalHT + tva20) * 100) / 100;

    return (
      <div>
        <StepIndicator currentStep={3} isDark={isDark} couleur={couleur} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className={`text-lg font-bold ${textPrimary}`}>Résultats de l&rsquo;analyse</h3>
            <p className={`text-sm ${textMuted}`}>
              {description || 'Analyse photo'} &mdash; {surfaceEstimee} m² estimés
            </p>
          </div>
          <ConfidenceBadge value={confiance} couleur={couleur} />
        </div>

        {/* Category badge */}
        <div className="mb-4">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: couleur }}
          >
            <Tag className="w-3 h-3" />
            {categorie.charAt(0).toUpperCase() + categorie.slice(1)}
          </span>
        </div>

        {/* Travaux table */}
        <div className={`rounded-xl border overflow-hidden mb-6 ${cardBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>Désignation</th>
                  <th className={`text-center px-3 py-3 font-semibold ${textPrimary}`}>Qté</th>
                  <th className={`text-center px-3 py-3 font-semibold ${textPrimary}`}>Unité</th>
                  <th className={`text-right px-3 py-3 font-semibold ${textPrimary}`}>P.U. HT</th>
                  <th className={`text-right px-4 py-3 font-semibold ${textPrimary}`}>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {travaux.map((t, idx) => (
                  <tr
                    key={t.id}
                    className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} ${
                      idx % 2 === 0
                        ? ''
                        : isDark
                        ? 'bg-slate-800/50'
                        : 'bg-slate-50/50'
                    }`}
                  >
                    <td className={`px-4 py-2.5 ${textPrimary}`}>{t.designation}</td>
                    <td className={`text-center px-3 py-2.5 ${textMuted}`}>{t.quantite}</td>
                    <td className={`text-center px-3 py-2.5 ${textMuted}`}>{t.unite}</td>
                    <td className={`text-right px-3 py-2.5 ${textMuted}`}>
                      {fmtCurrency.format(t.prixUnitaire)}
                    </td>
                    <td className={`text-right px-4 py-2.5 font-medium ${textPrimary}`}>
                      {fmtCurrency.format(t.totalHT)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className={`rounded-xl border p-5 mb-6 ${cardBg}`}>
          <h4 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Récapitulatif</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={`text-sm ${textMuted}`}>Total HT</span>
              <span className={`text-sm font-semibold ${textPrimary}`}>
                {fmtCurrency.format(totalHT)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={`text-sm ${textMuted}`}>TVA 10% (rénovation)</span>
              <span className={`text-sm ${textMuted}`}>{fmtCurrency.format(tva10)}</span>
            </div>
            <div className="flex justify-between">
              <span className={`text-sm ${textMuted}`}>TVA 20% (standard)</span>
              <span className={`text-sm ${textMuted}`}>{fmtCurrency.format(tva20)}</span>
            </div>
            <div className={`border-t pt-2 mt-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex justify-between mb-1">
                <span className={`text-sm font-semibold ${textPrimary}`}>Total TTC (TVA 10%)</span>
                <span className="text-sm font-bold" style={{ color: couleur }}>
                  {fmtCurrency.format(totalTTC10)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm font-semibold ${textPrimary}`}>Total TTC (TVA 20%)</span>
                <span className="text-sm font-bold" style={{ color: couleur }}>
                  {fmtCurrency.format(totalTTC20)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onCreateDevis && (
            <button
              onClick={() => {
                const current = analyses.find((a) => a.id === selectedId);
                if (current) handleCreateDevis(current);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold shadow-md hover:shadow-lg transition-all"
              style={{ backgroundColor: couleur }}
            >
              <FileText className="w-4 h-4" />
              Créer un devis
            </button>
          )}
          <button
            onClick={handleRetryAnalysis}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition ${
              isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Relancer l&rsquo;analyse
          </button>
          <button
            onClick={handleBackToList}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${textMuted} hover:opacity-70`}
          >
            <X className="w-4 h-4" />
            Fermer
          </button>
        </div>
      </div>
    );
  };

  const renderNewAnalysis = () => (
    <div className={`rounded-xl border p-6 ${cardBg}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-bold ${textPrimary}`}>Nouvelle analyse</h2>
        <button
          onClick={handleBackToList}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
            isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );

  const renderDetailView = () => {
    if (!selectedAnalyse) return null;
    const result = selectedAnalyse.analyse_resultat;

    return (
      <div>
        {/* Back button */}
        <button
          onClick={handleBackToList}
          className={`flex items-center gap-1.5 mb-4 text-sm font-medium ${textMuted} hover:opacity-80 transition`}
        >
          <ChevronLeft className="w-4 h-4" />
          Retour aux analyses
        </button>

        <div className={`rounded-xl border p-6 ${cardBg}`}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  {selectedAnalyse.description}
                </h2>
                <StatusBadge statut={selectedAnalyse.statut} isDark={isDark} />
              </div>
              <div className={`flex items-center gap-4 text-sm ${textMuted}`}>
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {fmtDate(selectedAnalyse.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Image className="w-3.5 h-3.5" />
                  {selectedAnalyse.photoName}
                </span>
              </div>
            </div>
            {result && <ConfidenceBadge value={selectedAnalyse.confiance} couleur={couleur} />}
          </div>

          {result ? (
            <>
              {/* Info row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div
                  className={`rounded-lg border p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                >
                  <div className={`text-xs ${textMuted}`}>Catégorie</div>
                  <div className={`text-sm font-semibold ${textPrimary}`}>
                    {result.categorie.charAt(0).toUpperCase() + result.categorie.slice(1)}
                  </div>
                </div>
                <div
                  className={`rounded-lg border p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                >
                  <div className={`text-xs ${textMuted}`}>Surface estimée</div>
                  <div className={`text-sm font-semibold ${textPrimary}`}>
                    {result.surfaceEstimee} m²
                  </div>
                </div>
                <div
                  className={`rounded-lg border p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                >
                  <div className={`text-xs ${textMuted}`}>Postes de travaux</div>
                  <div className={`text-sm font-semibold ${textPrimary}`}>
                    {result.travaux?.length || 0}
                  </div>
                </div>
              </div>

              {/* Travaux table */}
              <div className={`rounded-xl border overflow-hidden mb-6 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                        <th className={`text-left px-4 py-3 font-semibold ${textPrimary}`}>
                          Désignation
                        </th>
                        <th className={`text-center px-3 py-3 font-semibold ${textPrimary}`}>Qté</th>
                        <th className={`text-center px-3 py-3 font-semibold ${textPrimary}`}>
                          Unité
                        </th>
                        <th className={`text-right px-3 py-3 font-semibold ${textPrimary}`}>
                          P.U. HT
                        </th>
                        <th className={`text-right px-4 py-3 font-semibold ${textPrimary}`}>
                          Total HT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.travaux || []).map((t, idx) => (
                        <tr
                          key={t.id || idx}
                          className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} ${
                            idx % 2 === 0
                              ? ''
                              : isDark
                              ? 'bg-slate-800/50'
                              : 'bg-slate-50/50'
                          }`}
                        >
                          <td className={`px-4 py-2.5 ${textPrimary}`}>{t.designation}</td>
                          <td className={`text-center px-3 py-2.5 ${textMuted}`}>{t.quantite}</td>
                          <td className={`text-center px-3 py-2.5 ${textMuted}`}>{t.unite}</td>
                          <td className={`text-right px-3 py-2.5 ${textMuted}`}>
                            {fmtCurrency.format(t.prixUnitaire)}
                          </td>
                          <td className={`text-right px-4 py-2.5 font-medium ${textPrimary}`}>
                            {fmtCurrency.format(t.totalHT)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div
                className={`rounded-xl border p-5 mb-6 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
              >
                <h4 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Récapitulatif</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-sm ${textMuted}`}>Total HT</span>
                    <span className={`text-sm font-semibold ${textPrimary}`}>
                      {fmtCurrency.format(result.totalHT)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${textMuted}`}>TVA 10% (rénovation)</span>
                    <span className={`text-sm ${textMuted}`}>
                      {fmtCurrency.format(Math.round(result.totalHT * 0.1 * 100) / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${textMuted}`}>TVA 20% (standard)</span>
                    <span className={`text-sm ${textMuted}`}>
                      {fmtCurrency.format(Math.round(result.totalHT * 0.2 * 100) / 100)}
                    </span>
                  </div>
                  <div
                    className={`border-t pt-2 mt-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                  >
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm font-semibold ${textPrimary}`}>
                        Total TTC (TVA 10%)
                      </span>
                      <span className="text-sm font-bold" style={{ color: couleur }}>
                        {fmtCurrency.format(
                          Math.round(result.totalHT * 1.1 * 100) / 100
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm font-semibold ${textPrimary}`}>
                        Total TTC (TVA 20%)
                      </span>
                      <span className="text-sm font-bold" style={{ color: couleur }}>
                        {fmtCurrency.format(
                          Math.round(result.totalHT * 1.2 * 100) / 100
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`text-center py-8 ${textMuted}`}>
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun résultat disponible pour cette analyse.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {onCreateDevis && result && selectedAnalyse.statut !== 'appliquee' && (
              <button
                onClick={() => handleCreateDevis(selectedAnalyse)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: couleur }}
              >
                <FileText className="w-4 h-4" />
                Créer un devis
              </button>
            )}
            {selectedAnalyse.statut === 'appliquee' && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200">
                <CheckCircle className="w-4 h-4" />
                Devis déjà créé
              </span>
            )}
            <button
              onClick={() => handleDeleteAnalyse(selectedAnalyse.id)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ---- Main render ----

  return (
    <div className={`min-h-0 ${pageBg} p-4 sm:p-6`}>
      <div className="max-w-5xl mx-auto">
        {view === 'list' && renderListView()}
        {view === 'new' && renderNewAnalysis()}
        {view === 'detail' && renderDetailView()}
      </div>
    </div>
  );
}
