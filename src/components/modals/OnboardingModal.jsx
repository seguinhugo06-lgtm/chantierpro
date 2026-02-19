import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import analytics from '../../lib/analytics';

export default function OnboardingModal({ setShowOnboarding, isDark, couleur }) {
  const [step, setStep] = useState(0);

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-700';

  const steps = [
    {
      icon: "\u{1F44B}",
      title: "Bienvenue sur ChantierPro",
      subtitle: "Votre assistant de gestion pour artisan",
      content: (
        <div className="space-y-4">
          <p className={`text-center ${textSecondary}`}>
            Gérez vos devis, factures et chantiers en toute simplicité. Tout est pensé pour vous faire gagner du temps.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <span className="text-3xl mb-2 block">{"📋"}</span>
              <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Devis en 5 min</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <span className="text-3xl mb-2 block">{"💰"}</span>
              <p className={`text-sm font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Marge automatique</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
              <span className="text-3xl mb-2 block">{"📱"}</span>
              <p className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Mobile friendly</p>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: "\u{1F4CB}",
      title: "Créez vos devis rapidement",
      subtitle: "Du devis à la facture en 2 clics",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: couleur + '30' }}>
                  <FileText size={18} style={{ color: couleur }} />
                </div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>DEV-2025-001</p>
                  <p className={`text-sm ${textSecondary}`}>Client: Dupont Marie</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>Accepté</span>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/80' : 'bg-white'} space-y-2`}>
              <div className="flex justify-between text-sm">
                <span className={textSecondary}>Rénovation cuisine complète</span>
                <span className={textPrimary}>{"5 000 €"}</span>
              </div>
              <div className={`pt-2 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'} flex justify-between`}>
                <span className={`font-medium ${textPrimary}`}>Total TTC</span>
                <span className="font-bold text-lg" style={{ color: couleur }}>{"5 500 €"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>{"✓ Accepté"}</span>
            <span className={textSecondary}>{"→"}</span>
            <span className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>{"💰 Facturer"}</span>
          </div>
        </div>
      )
    },
    {
      icon: "\u{1F3D7}\uFE0F",
      title: "Suivez vos chantiers",
      subtitle: "Dépenses, heures et rentabilité",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-bold ${textPrimary}`}>Rénovation Dupont</p>
                <p className={`text-sm ${textSecondary}`}>En cours</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-500">67%</p>
                <p className={`text-xs ${textSecondary}`}>Marge nette</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-blue-500">{"5 500€"}</p>
                <p className={`text-xs ${textSecondary}`}>CA</p>
              </div>
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-red-500">{"1 200€"}</p>
                <p className={`text-xs ${textSecondary}`}>Dépenses</p>
              </div>
              <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-bold text-emerald-500">{"3 685€"}</p>
                <p className={`text-xs ${textSecondary}`}>Marge</p>
              </div>
            </div>
          </div>
          <p className={`text-center text-sm ${textSecondary}`}>
            Ajoutez vos dépenses et heures pour calculer automatiquement votre rentabilité
          </p>
        </div>
      )
    },
    {
      icon: "\u{1F680}",
      title: "Prêt à commencer ?",
      subtitle: "Votre première étape",
      content: (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl ${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-white'} border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>1</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Configurez votre entreprise</p>
                  <p className={`text-sm ${textSecondary}`}>Allez dans Paramètres pour ajouter votre logo et vos infos</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>2</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Créez votre premier client</p>
                  <p className={`text-sm ${textSecondary}`}>Ajoutez les coordonnées de vos clients pour les retrouver facilement</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: couleur }}>3</div>
                <div>
                  <p className={`font-medium ${textPrimary}`}>Créez votre premier devis</p>
                  <p className={`text-sm ${textSecondary}`}>Générez un devis professionnel en quelques minutes</p>
                </div>
              </li>
            </ol>
          </div>
          <p className={`text-center text-sm ${textSecondary}`}>
            Besoin d'aide ? Cliquez sur <strong>?</strong> en haut à droite à tout moment
          </p>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  const completeOnboarding = () => {
    localStorage.setItem('chantierpro_onboarding_complete', 'true');
    analytics.onboardingCompleted();
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('chantierpro_onboarding_complete', 'true');
    analytics.onboardingSkipped(step);
    setShowOnboarding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative`}>
        {/* Close button */}
        <button
          onClick={skipOnboarding}
          className={`absolute top-4 right-4 p-2 rounded-xl z-10 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
          aria-label="Fermer"
        >
          <X size={20} />
        </button>

        {/* Progress bar */}
        <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className="h-full transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: couleur }}></div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <span className="text-5xl mb-4 block">{currentStep.icon}</span>
            <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>{currentStep.title}</h2>
            <p className={textSecondary}>{currentStep.subtitle}</p>
          </div>

          {currentStep.content}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setStep(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${i === step ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
                    style={i === step ? { background: couleur } : {}}
                  />
                ))}
              </div>
              <button
                onClick={skipOnboarding}
                className={`text-xs ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Passer
              </button>
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className={`px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Retour
                </button>
              )}
              <button
                onClick={() => step < steps.length - 1 ? setStep(step + 1) : completeOnboarding()}
                className="px-4 py-2 text-white rounded-xl text-sm hover:shadow-lg transition-all"
                style={{ background: couleur }}
              >
                {step < steps.length - 1 ? 'Suivant' : 'Terminer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
