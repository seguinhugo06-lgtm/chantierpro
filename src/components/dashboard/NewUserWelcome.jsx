/**
 * NewUserWelcome
 * Welcome screen shown to new users on the dashboard.
 *
 * Extracted from Dashboard.jsx for modularity.
 * Provides onboarding steps (configure company, add client, create devis)
 * and a preview of what the dashboard will look like with data.
 *
 * @module NewUserWelcome
 */

import React, { memo } from 'react';
import {
  Sparkles, BarChart3, Settings, Users, FileText,
  Lightbulb, DollarSign, TrendingUp, Hammer,
} from 'lucide-react';

const NewUserWelcome = memo(function NewUserWelcome({ isDark, couleur, setPage, setCreateMode }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div className="p-8 sm:p-12 text-center" style={{ background: `linear-gradient(135deg, ${couleur}15 0%, ${couleur}05 100%)` }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: couleur }}>
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-3 ${textPrimary}`}>Bienvenue dans ChantierPro</h1>
          <p className={`text-base sm:text-lg ${textSecondary} max-w-lg mx-auto`}>Votre assistant pour gérer devis, factures et chantiers. Commençons !</p>
        </div>

        <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-5 ${textMuted}`}>Pour bien démarrer</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: 1, icon: Settings, title: 'Configurer mon entreprise', desc: 'Nom, adresse, SIRET, logo...', onClick: () => setPage?.('settings') },
              { step: 2, icon: Users, title: 'Ajouter un client', desc: 'Créez votre premier contact', onClick: () => { setCreateMode?.((p) => ({ ...p, client: true })); setPage?.('clients'); } },
              { step: 3, icon: FileText, title: 'Créer un devis', desc: 'Lancez votre première affaire', onClick: () => { setCreateMode?.((p) => ({ ...p, devis: true })); setPage?.('devis'); } },
            ].map((item) => (
              <button key={item.step} onClick={item.onClick} className={`group p-5 rounded-xl border text-left transition-all hover:shadow-lg hover:-translate-y-1 ${isDark ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                    <span className="text-lg font-bold" style={{ color: couleur }}>{item.step}</span>
                  </div>
                  <item.icon size={20} className={textMuted} />
                </div>
                <h3 className={`font-semibold mb-1 ${textPrimary}`}>{item.title}</h3>
                <p className={`text-sm ${textMuted}`}>{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl border p-6 sm:p-8`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl" style={{ background: `${couleur}20` }}>
            <BarChart3 size={20} style={{ color: couleur }} />
          </div>
          <div>
            <h3 className={`font-semibold ${textPrimary}`}>Votre futur tableau de bord</h3>
            <p className={`text-sm ${textMuted}`}>Voici ce que vous verrez une fois vos données ajoutées</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 opacity-60">
          {[
            { icon: DollarSign, label: "Chiffre d'affaires", value: '12 500 €', sub: '+15% ce mois' },
            { icon: TrendingUp, label: 'Marge nette', value: '3 750 €', sub: '30% de marge' },
            { icon: FileText, label: 'Devis en attente', value: '3', sub: '8 500 € potentiel' },
            { icon: Hammer, label: 'Chantiers actifs', value: '2', sub: 'En cours' },
          ].map((kpi, i) => (
            <div key={i} className={`p-4 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon size={16} style={{ color: couleur }} />
                <span className={`text-xs ${textMuted}`}>{kpi.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: couleur }}>{kpi.value}</p>
              <p className={`text-xs ${textMuted}`}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-start gap-3">
            <Lightbulb size={20} className="text-blue-500 mt-0.5" />
            <div>
              <p className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Astuce de pro</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                Commencez par remplir votre catalogue de prestations. Vous pourrez ensuite créer des devis en quelques clics !
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default NewUserWelcome;
