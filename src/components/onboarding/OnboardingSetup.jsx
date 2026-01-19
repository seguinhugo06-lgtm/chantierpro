import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Rocket, User, Briefcase, Users,
  Wrench, Zap, Building, Paintbrush, Hammer, Flame, Home,
  LayoutGrid, HardHat, Sparkles, Check
} from 'lucide-react';

/**
 * Quick Setup Wizard - 3 questions in 2 minutes
 * Goal: Capture minimum info to personalize without friction
 */
export default function OnboardingSetup({
  onComplete,
  onSkip,
  initialData = {},
  isDark = false,
  couleur = '#f97316'
}) {
  const [step, setStep] = useState(1); // 1: identity, 2: trade, 3: size
  const [data, setData] = useState({
    entreprise: initialData.entreprise || '',
    prenom: initialData.prenom || '',
    nom: initialData.nom || '',
    metier: initialData.metier || null,
    taille: initialData.taille || null
  });
  const [errors, setErrors] = useState({});

  // Trades data
  const metiers = [
    { id: 'plombier', label: 'Plombier', icon: '🔧' },
    { id: 'electricien', label: 'Électricien', icon: '⚡' },
    { id: 'macon', label: 'Maçon', icon: '🧱' },
    { id: 'peintre', label: 'Peintre', icon: '🎨' },
    { id: 'menuisier', label: 'Menuisier', icon: '🪵' },
    { id: 'carreleur', label: 'Carreleur', icon: '⬜' },
    { id: 'chauffagiste', label: 'Chauffagiste', icon: '🔥' },
    { id: 'couvreur', label: 'Couvreur', icon: '🏠' },
    { id: 'autre', label: 'Autre', icon: '🔨' }
  ];

  // Company sizes data
  const tailles = [
    {
      id: 'solo',
      label: 'Artisan solo',
      description: 'Je travaille seul (ou avec un apprenti)',
      icon: User,
      benefits: ['Templates ultra-rapides', 'Prix fixe 19€/mois', 'Support prioritaire']
    },
    {
      id: 'equipe',
      label: 'Petite équipe (2-5)',
      description: 'Quelques salariés',
      icon: Users,
      benefits: ['Gestion équipe', 'Pointage heures', 'Dashboard rentabilité']
    },
    {
      id: 'pme',
      label: 'PME BTP (6-20)',
      description: 'Structure établie',
      icon: Building,
      benefits: ['Multi-chantiers', 'Intégrations compta', 'Analytics avancés']
    }
  ];

  const validateStep1 = () => {
    const newErrors = {};
    if (!data.entreprise.trim()) newErrors.entreprise = 'Requis';
    if (!data.prenom.trim()) newErrors.prenom = 'Requis';
    if (!data.nom.trim()) newErrors.nom = 'Requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
        setErrors({});
      }
    } else if (step === 2) {
      if (data.metier) {
        setStep(3);
      }
    } else if (step === 3) {
      if (data.taille) {
        onComplete(data);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return !data.entreprise || !data.prenom || !data.nom;
    if (step === 2) return !data.metier;
    if (step === 3) return !data.taille;
    return false;
  };

  return (
    <div className={`fixed inset-0 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex flex-col`}>
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                      ? 'text-white'
                      : isDark
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                  style={s === step ? { backgroundColor: couleur } : {}}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-24 sm:w-32 h-1 mx-2 rounded ${
                      s < step
                        ? 'bg-green-500'
                        : isDark
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-lg mx-auto">
          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-4xl mb-4 block">👋</span>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Présentons-nous
                </h2>
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Pour personnaliser vos documents
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nom de votre entreprise *
                  </label>
                  <input
                    type="text"
                    value={data.entreprise}
                    onChange={(e) => setData({ ...data, entreprise: e.target.value })}
                    placeholder="Ex: Dupont Rénovation"
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-colors ${
                      errors.entreprise
                        ? 'border-red-500'
                        : isDark
                        ? 'bg-gray-800 border-gray-700 text-white focus:border-orange-500'
                        : 'bg-white border-gray-200 text-gray-900 focus:border-orange-500'
                    }`}
                  />
                  {errors.entreprise && (
                    <p className="text-red-500 text-sm mt-1">Oups ! Il manque votre nom d'entreprise</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={data.prenom}
                      onChange={(e) => setData({ ...data, prenom: e.target.value })}
                      placeholder="Jean"
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-colors ${
                        errors.prenom
                          ? 'border-red-500'
                          : isDark
                          ? 'bg-gray-800 border-gray-700 text-white focus:border-orange-500'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-orange-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={data.nom}
                      onChange={(e) => setData({ ...data, nom: e.target.value })}
                      placeholder="Dupont"
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-colors ${
                        errors.nom
                          ? 'border-red-500'
                          : isDark
                          ? 'bg-gray-800 border-gray-700 text-white focus:border-orange-500'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-orange-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Trade */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-4xl mb-4 block">🔨</span>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Quel est votre métier ?
                </h2>
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Pour charger les bons templates
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {metiers.map((metier) => (
                  <button
                    key={metier.id}
                    onClick={() => setData({ ...data, metier: metier.id })}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${
                      data.metier === metier.id
                        ? 'border-2 bg-orange-50 dark:bg-orange-900/20'
                        : isDark
                        ? 'bg-gray-800 border-gray-700 hover:border-gray-500'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    style={data.metier === metier.id ? { borderColor: couleur } : {}}
                  >
                    <div className="text-3xl mb-2">{metier.icon}</div>
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {metier.label}
                    </div>
                    {data.metier === metier.id && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: couleur }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Company size */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-4xl mb-4 block">📊</span>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Taille de votre entreprise ?
                </h2>
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Pour adapter l'interface
                </p>
              </div>

              <div className="space-y-3">
                {tailles.map((taille) => {
                  const Icon = taille.icon;
                  const isSelected = data.taille === taille.id;

                  return (
                    <button
                      key={taille.id}
                      onClick={() => setData({ ...data, taille: taille.id })}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        isSelected
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                          : isDark
                          ? 'bg-gray-800 border-gray-700 hover:border-gray-500'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? 'bg-green-500 text-white'
                              : isDark
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {taille.label}
                            </h3>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {taille.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {taille.benefits.map((benefit, i) => (
                              <span
                                key={i}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {['✨', '💰', '🎯', '👥', '⏰', '📊', '💼', '📈'][i % 8]} {benefit}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isDark
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          ) : (
            <button
              onClick={onSkip}
              className={`text-sm ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'}`}
            >
              Passer →
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={isNextDisabled()}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              isNextDisabled()
                ? isDark
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : step === 3
                ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-105 active:scale-95'
                : 'text-white hover:scale-105 active:scale-95'
            }`}
            style={!isNextDisabled() && step !== 3 ? { backgroundColor: couleur } : {}}
          >
            {step === 3 ? (
              <>
                C'est parti !
                <Rocket className="w-5 h-5" />
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
