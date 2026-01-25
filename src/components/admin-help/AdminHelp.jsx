import { useState } from 'react';
import {
  FileText, Users, Building2, Calendar, CheckSquare, Euro,
  FileCheck, Shield, ChevronRight, Clock, AlertTriangle,
  ExternalLink, HelpCircle, Zap, Book, Calculator
} from 'lucide-react';
import TVAManager from './TVAManager';
import AdminCalendar from './AdminCalendar';
import DocumentChecklist from './DocumentChecklist';
import ConformityReport from './ConformityReport';

/**
 * Module Aide Administrative - Version simplifiée
 * Vue d'ensemble rapide + actions principales
 */

// Ressources utiles BTP
const RESSOURCES = [
  { label: 'URSSAF - Déclarations', url: 'https://www.urssaf.fr/', icon: Users },
  { label: 'Impots.gouv - TVA', url: 'https://www.impots.gouv.fr/', icon: Euro },
  { label: 'MaPrimeRénov\'', url: 'https://www.maprimerenov.gouv.fr/', icon: Building2 },
  { label: 'Qualibat - RGE', url: 'https://www.qualibat.com/', icon: Shield },
];

// FAQ rapide
const FAQ_ITEMS = [
  {
    q: 'Quelle TVA appliquer en rénovation ?',
    a: '10% pour travaux amélioration (logement >2 ans), 5.5% pour rénovation énergétique, 20% pour neuf.'
  },
  {
    q: 'DSN : quelle date limite ?',
    a: 'Le 5 du mois suivant (entreprises >50 salariés) ou le 15 (autres entreprises).'
  },
  {
    q: 'Quand le devis est-il obligatoire ?',
    a: 'Pour tout travaux >150€ TTC. Le devis signé vaut contrat.'
  },
  {
    q: 'E-facturation : quand ?',
    a: 'Obligatoire pour recevoir : sept 2026. Pour émettre : sept 2026 (grandes), sept 2027 (PME).'
  },
];

export default function AdminHelp({
  chantiers = [],
  devis = [],
  factures = [],
  depenses = [],
  entreprise = {},
  isDark = false,
  couleur = '#f97316',
}) {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Calcul échéances proches (exemple statique - à connecter aux vraies données)
  const today = new Date();
  const deadlines = [
    { id: 1, title: 'DSN Janvier', date: '2026-02-05', type: 'social' },
    { id: 2, title: 'TVA T4 2025', date: '2026-01-20', type: 'fiscal' },
    { id: 3, title: 'Renouvellement décennale', date: '2026-03-15', type: 'assurance' },
  ].map(d => ({
    ...d,
    daysLeft: Math.ceil((new Date(d.date) - today) / (1000 * 60 * 60 * 24)),
  })).sort((a, b) => a.daysLeft - b.daysLeft);

  // Quick actions
  const quickActions = [
    { id: 'calendar', icon: Calendar, label: 'Calendrier', desc: 'Échéances & rappels', color: '#3b82f6' },
    { id: 'tva', icon: Calculator, label: 'TVA', desc: 'Calcul & déclaration', color: '#22c55e' },
    { id: 'checklist', icon: CheckSquare, label: 'Documents', desc: 'Checklist chantier', color: '#f59e0b' },
    { id: 'conformite', icon: Shield, label: 'Conformité', desc: 'Audit rapide', color: '#8b5cf6' },
  ];

  // Stats rapides (calculées à partir des vraies données)
  const stats = {
    chantiersActifs: chantiers.filter(c => c.statut === 'en_cours').length,
    devisEnAttente: devis.filter(d => d.type === 'devis' && d.statut === 'envoye').length,
    facturesImpayees: devis.filter(d => d.type === 'facture' && d.statut !== 'payee').length,
  };

  // Navigation tabs (simplified)
  const sections = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Zap },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'tva', label: 'TVA', icon: Euro },
    { id: 'checklist', label: 'Documents', icon: CheckSquare },
    { id: 'conformite', label: 'Conformité', icon: Shield },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className={`p-5 rounded-2xl ${cardBg} border ${borderColor}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}20` }}>
                  <HelpCircle size={20} style={{ color: couleur }} />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${textPrimary}`}>Aide Administrative</h1>
                  <p className={`text-sm ${textMuted}`}>Gérez vos obligations simplement</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-4 rounded-xl ${cardBg} border ${borderColor} text-center`}>
                <p className="text-2xl font-bold" style={{ color: couleur }}>{stats.chantiersActifs}</p>
                <p className={`text-xs ${textMuted}`}>Chantiers actifs</p>
              </div>
              <div className={`p-4 rounded-xl ${cardBg} border ${borderColor} text-center`}>
                <p className="text-2xl font-bold text-amber-500">{stats.devisEnAttente}</p>
                <p className={`text-xs ${textMuted}`}>Devis en attente</p>
              </div>
              <div className={`p-4 rounded-xl ${cardBg} border ${borderColor} text-center`}>
                <p className="text-2xl font-bold text-blue-500">{stats.facturesImpayees}</p>
                <p className={`text-xs ${textMuted}`}>Factures impayées</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className={`font-semibold mb-3 ${textPrimary}`}>Actions rapides</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setActiveSection(action.id)}
                    className={`p-4 rounded-xl ${cardBg} border ${borderColor} text-left transition-all hover:shadow-md active:scale-98`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${action.color}15` }}>
                      <action.icon size={20} style={{ color: action.color }} />
                    </div>
                    <p className={`font-medium text-sm ${textPrimary}`}>{action.label}</p>
                    <p className={`text-xs ${textMuted}`}>{action.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={18} style={{ color: couleur }} />
                  <h2 className={`font-semibold ${textPrimary}`}>Prochaines échéances</h2>
                </div>
                <button onClick={() => setActiveSection('calendar')} className="text-sm font-medium" style={{ color: couleur }}>
                  Voir tout
                </button>
              </div>
              <div className="space-y-2">
                {deadlines.slice(0, 3).map(d => (
                  <div
                    key={d.id}
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      d.daysLeft <= 7 ? (isDark ? 'bg-red-900/30' : 'bg-red-50') : (isDark ? 'bg-slate-700' : 'bg-slate-50')
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {d.daysLeft <= 7 && <AlertTriangle size={14} className="text-red-500" />}
                      <span className={`text-sm font-medium ${textPrimary}`}>{d.title}</span>
                    </div>
                    <span className={`text-sm font-bold ${d.daysLeft <= 7 ? 'text-red-500' : textMuted}`}>
                      J-{d.daysLeft}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ rapide */}
            <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
              <div className="flex items-center gap-2 mb-3">
                <Book size={18} style={{ color: couleur }} />
                <h2 className={`font-semibold ${textPrimary}`}>Questions fréquentes</h2>
              </div>
              <div className="space-y-2">
                {FAQ_ITEMS.map((faq, i) => (
                  <div key={i} className={`rounded-lg overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className={`w-full p-3 text-left flex items-center justify-between ${textPrimary}`}
                    >
                      <span className="text-sm font-medium">{faq.q}</span>
                      <ChevronRight size={16} className={`transition-transform ${expandedFaq === i ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedFaq === i && (
                      <div className={`px-3 pb-3 text-sm ${textSecondary}`}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Ressources utiles */}
            <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink size={18} style={{ color: couleur }} />
                <h2 className={`font-semibold ${textPrimary}`}>Ressources utiles</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RESSOURCES.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-lg flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <r.icon size={16} className={textMuted} />
                    <span className={`text-sm ${textPrimary}`}>{r.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        );

      case 'tva':
        return <TVAManager isDark={isDark} couleur={couleur} devis={devis} factures={factures} depenses={depenses} />;

      case 'calendar':
        return <AdminCalendar isDark={isDark} couleur={couleur} />;

      case 'checklist':
        return <DocumentChecklist isDark={isDark} couleur={couleur} chantiers={chantiers} />;

      case 'conformite':
        return <ConformityReport isDark={isDark} couleur={couleur} entreprise={entreprise} chantiers={chantiers} />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all min-h-[44px] ${
              activeSection === section.id
                ? 'text-white shadow-lg'
                : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
            style={activeSection === section.id ? { background: couleur } : {}}
          >
            <section.icon size={16} />
            <span className="hidden sm:inline">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
