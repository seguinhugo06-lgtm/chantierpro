import React, { useState } from 'react';
import { FONCTIONS } from '../lib/fonctions';
import { ArrowLeft, Sparkles, Bug, Zap, Shield, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { dateLue } from '../lib/dates';

// Journal public : une entrée ne promet rien qui n'existe pas aujourd'hui (relecture du 25 oct. 2026). Retirés : le
// bandeau cookies et la mesure d'audience Plausible (retirés), l'export « Pennylane, Indy » (jamais fait), le bouton
// d'action rapide (retiré), le carnet d'entretien et les commandes fournisseurs (absents de l'app), l'essai gratuit de
// 14 jours et la page de tarification (retirés), les infobulles des nouveaux utilisateurs (absentes), le module
// Sous-traitants (absent : « sous-traitant » n'est qu'un rôle d'équipe) ; le module de signatures (retiré le 10 oct.)
// devient la signature en ligne des devis, qui existe ; les nombres devenus faux (4 plans, 7 modules, « un plan
// payant ») aussi. Relecture du 25 oct., tour 3 : retirés aussi le tableau de bord de facturation (la page `billing`
// mène aux Paramètres), les « feature gates » (inutilisés), la bibliothèque d'ouvrages (la page `ouvrages` mène au
// Catalogue) ; la FAQ sans nombre (17 questions affichées) ; l'import réduit aux clients et aux articles.
const CHANGELOG = [
  {
    version: '3.3.0',
    date: '2026-02-08',
    title: 'Simplification & Support',
    highlights: true,
    changes: [
      { type: 'improve', text: 'Menu simplifié : les modules essentiels d\'abord' },
      { type: 'new', text: 'Page Finances unifiée (Trésorerie + Export + Analytique)' },
      { type: 'new', text: 'Planning accessible gratuitement pour tous' },
      { type: 'new', text: 'FAQ avec recherche intégrée' },
      { type: 'new', text: 'Onglet Administratif dans les Paramètres' },
      { type: 'new', text: 'E-mail de bienvenue automatique' },
      { type: 'improve', text: 'Palette de commandes mise à jour' },
    ],
  },
  {
    version: '3.2.0',
    date: '2026-02-08',
    title: 'Conformité & Lancement',
    changes: [
      { type: 'new', text: 'Pages légales complètes (CGV, CGU, Confidentialité, Mentions légales)' },
      { type: 'new', text: 'Export de données personnelles (RGPD)' },
      { type: 'new', text: 'Suppression de compte (droit à l\'effacement)' },
      { type: 'new', text: 'En-têtes de sécurité HTTP (HSTS, CSP, X-Frame-Options)' },
      { type: 'new', text: 'SEO : sitemap.xml, robots.txt, méta-données Open Graph' },
      { type: 'improve', text: 'Landing page marketing optimisée' },
    ],
  },
  {
    version: '3.1.0',
    date: '2026-02-07',
    title: 'Abonnements & Monétisation',
    changes: [
      { type: 'new', text: 'Abonnement en ligne par Stripe' },
      { type: 'new', text: 'Alertes d\'utilisation par palier' },
      { type: 'improve', text: 'Modal d\'upgrade contextuelle' },
    ],
  },
  {
    version: '3.0.0',
    date: '2026-02-06',
    title: 'Import, Analytique & Commercialisation',
    changes: [
      { type: 'new', text: 'Import de clients et d\'articles (CSV)' },
      { type: 'new', text: 'Page Analytique avec KPIs et graphiques' },
      { type: 'new', text: 'Landing page marketing' },
      { type: 'new', text: 'Numérotation atomique des documents (PL/pgSQL)' },
      { type: 'new', text: 'Service d\'envoi d\'e-mails (Edge Function + Resend)' },
      { type: 'improve', text: 'Validation de formulaires renforcée (devis, équipe)' },
      { type: 'fix', text: 'Correction des accents manquants (Expirée, Prénom, Électricien...)' },
    ],
  },
  {
    version: '2.5.0',
    date: '2026-02-05',
    title: 'Modules métier avancés',
    changes: [
      { type: 'new', text: 'Trésorerie temps réel avec prévisionnel' },
      ...(FONCTIONS.ia ? [{ type: 'new', text: 'IA Devis : analyse photo de chantier' }] : []),
      { type: 'new', text: 'Signature en ligne des devis' },
      { type: 'new', text: 'Export comptable (FEC, CSV, Excel)' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-02-03',
    title: 'Refonte UX & Robustesse',
    changes: [
      { type: 'new', text: 'Saisies sans réseau gardées sur l\'appareil, envoyées au retour de la connexion' },
      { type: 'new', text: 'PWA installable avec Service Worker' },
      { type: 'new', text: 'Système de design unifié (couleur, dark mode)' },
      { type: 'new', text: 'Palette de commandes (⌘K)' },
      { type: 'new', text: 'Onboarding interactif pour nouveaux utilisateurs' },
      { type: 'improve', text: 'Responsive mobile-first sur tous les modules' },
      { type: 'fix', text: 'Correction du bug d\'affichage récursif (#310)' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-28',
    title: 'Lancement initial',
    changes: [
      { type: 'new', text: 'Gestion de devis et factures BTP' },
      { type: 'new', text: 'Suivi de chantiers avec avancement' },
      { type: 'new', text: 'Gestion de clients avec historique' },
      { type: 'new', text: 'Planning et événements' },
      { type: 'new', text: 'Catalogue articles avec gestion de stock' },
      { type: 'new', text: 'Gestion d\'équipe et pointages' },
      { type: 'new', text: 'Génération PDF de devis/factures' },
      { type: 'new', text: 'Mode sombre et mode discret' },
    ],
  },
];

const typeConfig = {
  new: { label: 'Nouveau', icon: Sparkles, color: 'emerald', bg: 'bg-emerald-100 text-emerald-700' },
  improve: { label: 'Amélioré', icon: Zap, color: 'blue', bg: 'bg-blue-100 text-blue-700' },
  fix: { label: 'Corrigé', icon: Bug, color: 'amber', bg: 'bg-amber-100 text-amber-700' },
  security: { label: 'Sécurité', icon: Shield, color: 'red', bg: 'bg-red-100 text-red-700' },
};

export default function Changelog({ isDark, couleur, setPage }) {
  const [expandedVersion, setExpandedVersion] = useState(CHANGELOG[0]?.version);

  const cardBg = 'bg-surface border-bord';
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setPage('dashboard')}
          className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Changelog</h1>
          <p className={`text-sm ${textMuted}`}>Historique des mises à jour de Mallettico</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {CHANGELOG.map((release) => {
          const isExpanded = expandedVersion === release.version;
          return (
            <div key={release.version} className={`${cardBg} rounded-2xl border overflow-hidden transition-all`}>
              {/* Version header */}
              <button
                onClick={() => setExpandedVersion(isExpanded ? null : release.version)}
                className={`w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-colors hover:bg-surface-2`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${couleur}20` }}
                >
                  <Package size={20} className="text-accent-texte" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-base ${textPrimary}`}>v{release.version}</span>
                    {release.highlights && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-accent text-sur-accent">
                        Dernier
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${textMuted}`}>{release.title} — {dateLue(release.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <span className={`${textMuted} flex-shrink-0 px-2 py-1 rounded-lg text-xs bg-surface-2`}>
                  {release.changes.length} changements
                </span>
                {isExpanded ? <ChevronUp size={18} className={textMuted} /> : <ChevronDown size={18} className={textMuted} />}
              </button>

              {/* Changes list */}
              {isExpanded && (
                <div className={`px-4 sm:px-5 pb-4 sm:pb-5 border-t border-bord`}>
                  <ul className="space-y-2.5 pt-4">
                    {release.changes.map((change, idx) => {
                      const config = typeConfig[change.type] || typeConfig.new;
                      const Icon = config.icon;
                      return (
                        <li key={idx} className="flex items-start gap-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 mt-0.5 ${
                            isDark
                              ? change.type === 'new' ? 'bg-emerald-900/40 text-emerald-300'
                                : change.type === 'improve' ? 'bg-blue-900/40 text-blue-300'
                                : change.type === 'fix' ? 'bg-amber-900/40 text-amber-300'
                                : 'bg-red-900/40 text-red-300'
                              : change.type === 'new' ? 'bg-emerald-100 text-emerald-700'
                                : change.type === 'improve' ? 'bg-blue-100 text-blue-700'
                                : change.type === 'fix' ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            <Icon size={10} />
                            {config.label}
                          </span>
                          <span className={`text-sm text-encre-2`}>{change.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`mt-8 text-center text-sm ${textMuted}`}>
        <p>Mallettico est mis à jour régulièrement.</p>
        <p className="mt-1">Des questions ? Contactez-nous à <span className="text-accent-texte">contact@mallettico.fr</span></p>
      </div>
    </div>
  );
}
