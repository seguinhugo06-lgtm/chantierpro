import React, { useState } from 'react';

export default function HelpModal({ showHelp, setShowHelp, isDark, couleur, tc }) {
  const [helpSection, setHelpSection] = useState('overview');

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-700';

  const helpSections = {
    overview: {
      title: "Bienvenue",
      titleFull: "Bienvenue dans ChantierPro",
      icon: "🏠",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>ChantierPro est votre assistant de gestion quotidien. Suivez vos chantiers, vos devis et votre rentabilité en quelques clics.</p>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>💡 Exemple concret</h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>
              Jean, plombier, utilise ChantierPro pour : créer ses devis en 5 min, suivre la marge de chaque chantier, et ne jamais oublier une relance client.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <h4 className={`font-semibold mb-2 ${textPrimary}`}>📍 Par où commencer ?</h4>
            <ol className={`text-sm space-y-2 ${textSecondary}`}>
              <li>1. Configurez votre entreprise dans <strong>Paramètres</strong></li>
              <li>2. Ajoutez vos prestations dans le <strong>Catalogue</strong></li>
              <li>3. Créez votre premier <strong>Client</strong> et <strong>Devis</strong></li>
            </ol>
          </div>
        </div>
      )
    },
    devis: {
      title: "Devis & Factures",
      titleFull: "Créer et gérer vos devis",
      icon: "📋",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Créez des devis professionnels et transformez-les en factures en un clic.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>1. Créer un devis</h5>
              <p className={`text-sm ${textSecondary}`}>Cliquez sur "Nouveau" puis ajoutez vos lignes depuis le catalogue ou manuellement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>2. Envoyer au client</h5>
              <p className={`text-sm ${textSecondary}`}>Générez le PDF et envoyez-le par WhatsApp ou email directement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>3. Convertir en facture</h5>
              <p className={`text-sm ${textSecondary}`}>Devis accepté ? Demandez un acompte ou facturez directement.</p>
            </div>
          </div>
        </div>
      )
    },
    chantiers: {
      title: "Chantiers",
      titleFull: "Suivre vos chantiers",
      icon: "🏗️",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Suivez chaque chantier : dépenses, heures, avancement et rentabilité.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>📊 Suivi financier</h5>
              <p className={`text-sm ${textSecondary}`}>Ajoutez vos dépenses (matériaux, sous-traitance) et pointez les heures. La marge se calcule automatiquement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>📸 Photos de chantier</h5>
              <p className={`text-sm ${textSecondary}`}>Prenez des photos avant/pendant/après pour documenter votre travail.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>✅ To-do list</h5>
              <p className={`text-sm ${textSecondary}`}>Créez des tâches pour ne rien oublier sur chaque chantier.</p>
            </div>
          </div>
        </div>
      )
    },
    rentabilite: {
      title: "Rentabilité",
      titleFull: "Comprendre votre marge",
      icon: "💰",
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>La marge nette est calculée automatiquement :</p>
          <div className={`p-4 rounded-xl font-mono text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <p className={textPrimary}>Marge = CA - Dépenses - Main d'œuvre</p>
          </div>
          <div className="space-y-2">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
              <span className="text-2xl">🟢</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{">"} 40% = Excellent</p>
                <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Vous êtes très rentable</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
              <span className="text-2xl">🟡</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>20-40% = Correct</p>
                <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Marge standard du BTP</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <span className="text-2xl">🔴</span>
              <div>
                <p className={`font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>{"<"} 20% = Attention</p>
                <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>Revoyez vos prix ou coûts</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    astuces: {
      title: "Astuces",
      titleFull: "Astuces pour gagner du temps",
      icon: "⚡",
      content: (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>📱 Utilisez le sur mobile</h4>
            <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>ChantierPro fonctionne parfaitement sur téléphone. Ajoutez-le à votre écran d'accueil pour un accès rapide.</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>🎨 Personnalisez</h4>
            <p className={`text-sm ${isDark ? 'text-purple-200' : 'text-purple-700'}`}>Dans Paramètres, ajoutez votre logo et choisissez votre couleur. Vos devis auront un aspect professionnel unique.</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>📊 Mode discret</h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>Cliquez sur l'œil pour masquer les montants. Pratique quand un client regarde votre écran !</p>
          </div>
        </div>
      )
    }
  };

  const currentSection = helpSections[helpSection];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowHelp(false)}>
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                <span className="text-xl">❓</span>
              </div>
              <div>
                <h2 className={`font-bold text-lg ${textPrimary}`}>Guide d'utilisation</h2>
                <p className={`text-sm ${textSecondary}`}>Tout savoir sur ChantierPro</p>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <span className={textPrimary}>✕</span>
            </button>
          </div>
        </div>

        {/* Tabs - Mobile only */}
        <div className={`md:hidden border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex overflow-x-auto p-2 gap-1 scrollbar-hide">
            {Object.entries(helpSections).map(([key, section]) => (
              <button
                key={key}
                onClick={() => setHelpSection(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap min-h-[40px] transition-colors flex-shrink-0 ${
                  helpSection === key
                    ? 'text-white'
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={helpSection === key ? { background: couleur } : {}}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content with sidebar for desktop */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Desktop only */}
          <div className={`hidden md:block w-48 border-r ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} p-3`}>
            <div className="space-y-1">
              {Object.entries(helpSections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setHelpSection(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                    helpSection === key
                      ? 'text-white'
                      : isDark
                        ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  style={helpSection === key ? { background: couleur } : {}}
                >
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{currentSection.icon}</span>
              <h3 className={`text-xl font-bold ${textPrimary}`}>{currentSection.titleFull || currentSection.title}</h3>
            </div>
            {currentSection.content}
          </div>
        </div>
      </div>
    </div>
  );
}
