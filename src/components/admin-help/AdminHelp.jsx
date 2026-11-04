import { useState, useMemo } from 'react';
import {
  Users, Building2, Calendar, CheckSquare, Euro,
  Shield, ChevronRight, Clock,
  ExternalLink, HelpCircle, Zap, Book, Calculator,
  Bell, TrendingUp
} from 'lucide-react';
import TVAManager from './TVAManager';
import AdminCalendar from './AdminCalendar';
import DocumentChecklist from './DocumentChecklist';
import ConformityReport from './ConformityReport';
import { calculateTVASummary } from '../../lib/integrations/accounting';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { estOuverte } from '../../lib/ventes';
import { jourLocal } from '../../lib/dates';
import { profilAdmin, tvaRegleeDansLaTresorerie, questionsManquantes, echeancesPour, prochainesEcheances, couvertureBientotFinie } from '../../lib/echeancesAdmin';
import { LigneEcheance, QuestionsProfil } from './EcheancesUi';
import { useRegimeTvaTresorerie } from '../../hooks/useRegimeTvaTresorerie';

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
    a: '10 % pour l’amélioration, la transformation, l’aménagement ou l’entretien d’un logement achevé depuis plus de 2 ans ; 5,5 % pour la rénovation énergétique de ce logement ; 20 % pour le neuf, les travaux qui augmentent la surface de plancher de plus de 10 %, le nettoyage, les espaces verts et les travaux comprenant la fourniture ou la pose d’une chaudière pouvant utiliser des combustibles fossiles. Le taux réduit suppose que le client certifie ces conditions sur le devis ou la facture.'
  },
  {
    q: 'DSN : quelle date limite ?',
    a: 'Le 15 du mois suivant ; le 5 pour une entreprise de 50 salariés ou plus qui verse les salaires dans le mois.'
  },
  {
    q: 'Quand le devis est-il obligatoire ?',
    a: 'Chez un particulier, un devis écrit est obligatoire avant tout dépannage, réparation ou entretien, quel que soit le montant (arrêté du 24 janvier 2017). Signé par le client, le devis vaut contrat.'
  },
  {
    q: 'E-facturation : quand ?',
    a: 'Recevoir : obligatoire pour toutes les entreprises depuis le 1er septembre 2026. Émettre ses factures aux entreprises, et transmettre les données de ses ventes aux particuliers (e-reporting) : 1er septembre 2026 pour les grandes entreprises et les ETI, 1er septembre 2027 pour les PME et les micro-entreprises. Il faut passer par une plateforme agréée ; Mallettico n’en est pas une.'
  },
];

// Réponses aux questions de l'Administratif (rythme Urssaf, TVA, impôt, salariés) : gardées sur cet appareil.
const CLE_REPONSES = 'cp_admin_profil';
function lireReponses() {
  try { return JSON.parse(localStorage.getItem(CLE_REPONSES) || '{}') || {}; } catch { return {}; }
}

export default function AdminHelp({
  chantiers = [],
  devis = [],
  depenses = [],
  entreprise = {},
  isDark: _isDark = false,
  couleur: _couleur,
  onOuvrirTresorerie,
}) {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [reponses, setReponses] = useState(lireReponses);
  const enregistrerReponses = (nouvelles) => {
    setReponses(nouvelles);
    try { localStorage.setItem(CLE_REPONSES, JSON.stringify(nouvelles)); } catch { /* réponses non gardées : quota plein ou navigation privée ; redemandées au prochain passage */ }
  };
  const repondre = (cle, valeur) => enregistrerReponses({ ...reponses, [cle]: valeur });
  // « Changer mes réponses » (calendrier) : les questions ne s'affichent que dans la vue d'ensemble, on y revient.
  // Avant (relecture du 3 nov. 2026) : les réponses étaient effacées sans que rien ne les redemande.
  const changerReponses = () => {
    enregistrerReponses({});
    setActiveSection('overview');
    setTimeout(() => document.querySelector('[data-questions-ancre]')?.scrollIntoView({ block: 'center' }), 0);
  };

  // Échéances tirées de la fiche entreprise et des réponses (src/lib/echeancesAdmin.js). Avant (31 oct. 2026) :
  // liste vide à l'accueil, et des « alertes email » réglables que rien n'envoyait.
  // Régime de TVA réglé dans la Trésorerie : un choix explicite (franchise, mensuel) n'est pas redemandé
  const { regimeTva, charge: regimeTvaCharge } = useRegimeTvaTresorerie();
  const profil = useMemo(() => profilAdmin(entreprise, reponses, regimeTva), [entreprise, reponses, regimeTva]);
  // Tant que le réglage de la Trésorerie n'est pas lu, la question de TVA n'est pas posée (elle pourrait être inutile)
  // Régime venu de la Trésorerie : on le dit, et on renvoie vers la Trésorerie pour le changer (relecture du 3 nov. 2026 :
  // avant, la question disparaissait sans explication et « Changer mes réponses » annonçait une TVA qu'il ne changeait pas)
  const tvaTresorerie = tvaRegleeDansLaTresorerie(profil, regimeTva);
  const questions = questionsManquantes(profil).filter((q) => regimeTvaCharge || q !== 'tva');
  const echeances = useMemo(() => echeancesPour(profil, entreprise), [profil, entreprise]);
  const prochaines = prochainesEcheances(echeances, new Date(), 3);

  // TVA du trimestre en cours, sur les règles communes (src/lib/integrations/accounting.js). Avant (relecture
  // juriste-btp du 17 oct. 2026) : la TVA collectée lisait des champs inexistants (montant_ttc, montant_ht : toujours
  // 0) et la TVA déductible était estimée à 20 % de chaque dépense.
  const tvaStats = useMemo(() => {
    const now = new Date();
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
    const r = calculateTVASummary(devis, depenses, jourLocal(qStart), jourLocal(qEnd), { franchise: estFranchiseTva(entreprise) });
    const quarterLabel = `T${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
    return {
      tvaCollectee: r.tvaCollectee, tvaDeductible: r.tvaDeductible, tvaADeclarer: r.tvaNetteAPayer, quarterLabel,
      facturesCount: r.nbFactures, depensesCount: r.nbDepenses, depensesSansTva: r.depensesSansTva,
    };
  }, [devis, depenses, entreprise]);

  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-2';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';

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
    // Factures à encaisser (src/lib/ventes.js) : ni brouillon, ni avoir, ni annulée, avec un reste dû
    facturesImpayees: devis.filter(d => estOuverte(d)).length,
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
                  <HelpCircle size={20} className="text-accent-texte" />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${textPrimary}`}>Gestion Administrative</h1>
                  <p className={`text-sm ${textMuted}`}>TVA, échéances et conformité</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-4 rounded-xl ${cardBg} border ${borderColor} shadow-sm text-center`}>
                <p className="text-3xl font-bold text-accent-texte">{stats.chantiersActifs}</p>
                <p className={`text-sm font-medium ${textMuted}`}>Chantiers actifs</p>
              </div>
              <div className={`p-4 rounded-xl ${cardBg} border ${borderColor} shadow-sm text-center`}>
                <p className="text-3xl font-bold text-alerte-texte">{stats.devisEnAttente}</p>
                <p className={`text-sm font-medium ${textMuted}`}>Devis en attente</p>
              </div>
              <div className={`p-4 rounded-xl ${cardBg} border ${borderColor} shadow-sm text-center`}>
                <p className="text-3xl font-bold text-alerte-texte">{stats.facturesImpayees}</p>
                <p className={`text-sm font-medium ${textMuted}`}>Factures impayées</p>
              </div>
            </div>

            {/* Résumé TVA du trimestre (pas en franchise : ni TVA facturée ni TVA déductible) */}
            {!estFranchiseTva(entreprise) && <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-accent-texte" />
                  <h2 className={`font-semibold ${textPrimary}`}>TVA {tvaStats.quarterLabel}</h2>
                </div>
                <button onClick={() => setActiveSection('tva')} className="text-sm font-medium text-accent-texte">
                  Détails
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg text-center bg-fond`}>
                  <p className={`text-xs ${textMuted} mb-1`}>TVA facturée</p>
                  <p className="text-lg font-bold text-succes-texte">{tvaStats.tvaCollectee.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</p>
                  <p className={`text-xs ${textMuted}`}>{tvaStats.facturesCount} facture{tvaStats.facturesCount > 1 ? 's' : ''}</p>
                </div>
                <div className={`p-3 rounded-lg text-center bg-fond`}>
                  <p className={`text-xs ${textMuted} mb-1`}>TVA déductible</p>
                  <p className="text-lg font-bold text-info-texte">{tvaStats.tvaDeductible.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</p>
                  <p className={`text-xs ${textMuted}`}>{tvaStats.depensesCount} dépense{tvaStats.depensesCount > 1 ? 's' : ''}{tvaStats.depensesSansTva > 0 ? `, dont ${tvaStats.depensesSansTva} sans TVA saisie` : ''}</p>
                </div>
                <div className={`p-3 rounded-lg text-center bg-fond`}>
                  <p className={`text-xs ${textMuted} mb-1`}>Solde estimé (débits)</p>
                  <p className={`text-lg font-bold ${tvaStats.tvaADeclarer >= 0 ? 'text-alerte-texte' : 'text-succes-texte'}`}>
                    {tvaStats.tvaADeclarer.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                  </p>
                  <p className={`text-xs ${textMuted}`}>{tvaStats.tvaADeclarer >= 0 ? 'Sur vos factures émises' : 'Crédit estimé'}</p>
                </div>
              </div>
              <p className={`text-xs mt-3 ${textMuted}`}>Sans option pour les débits, la TVA de vos travaux est due à l’encaissement (art. 269 du CGI) : le montant à déclarer peut différer.</p>
            </div>}

            {/* Quick Actions */}
            <div>
              <h2 className={`font-semibold mb-3 ${textPrimary}`}>Actions rapides</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setActiveSection(action.id)}
                    className={`p-5 rounded-xl ${cardBg} border ${borderColor} text-left transition-all hover:shadow-lg hover:scale-[1.02] hover:border-bord-fort active:scale-98 cursor-pointer`}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-sm" style={{ backgroundColor: `${action.color}20` }}>
                      <action.icon size={24} style={{ color: action.color }} />
                    </div>
                    <p className={`font-semibold text-sm ${textPrimary}`}>{action.label}</p>
                    <p className={`text-xs ${textMuted} mt-0.5`}>{action.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-accent-texte" />
                  <h2 className={`font-semibold ${textPrimary}`}>Prochaines échéances</h2>
                </div>
                <button onClick={() => setActiveSection('calendar')} className="text-sm font-medium text-accent-texte">
                  Voir tout
                </button>
              </div>
              {profil.nonPriseEnCharge ? (
                <p className="text-sm text-encre-2 mb-3">Forme juridique non prise en charge ({profil.forme}) : seules les dates communes à toutes les entreprises s’affichent.</p>
              ) : !profil.formeConnue && (
                <p className="text-sm text-encre-2 mb-3">Indiquez votre statut juridique dans Paramètres › Mon entreprise › Identité : les déclarations à faire en dépendent. En attendant, seules les dates communes à toutes les entreprises s’affichent.</p>
              )}
              {tvaTresorerie && (
                <p data-tva-tresorerie className="text-sm text-encre-2 mb-3">
                  Régime de TVA : celui réglé dans la Trésorerie ({tvaTresorerie}). Pour le changer : Trésorerie › Paramètres de trésorerie.
                  {onOuvrirTresorerie && (
                    <>
                      {' '}
                      <button type="button" onClick={onOuvrirTresorerie} className="min-h-[44px] font-medium text-accent-texte underline">
                        Ouvrir la Trésorerie
                      </button>
                    </>
                  )}
                </p>
              )}
              <div data-questions-ancre />
              <QuestionsProfil questions={questions} profil={profil} onRepondre={repondre} />
              <div className={`space-y-2 ${questions.length ? 'mt-3' : ''}`}>
                {prochaines.length === 0 && (
                  <p className={`text-sm ${textMuted}`}>Aucune échéance à venir dans le calendrier de l’application (il couvre jusqu’à décembre 2027).</p>
                )}
                {prochaines.map((x) => <LigneEcheance key={x.id} echeance={x} />)}
              </div>
              {couvertureBientotFinie() && (
                <p className="text-xs text-alerte-texte mt-3">Le calendrier de l’application s’arrête en décembre 2027 : les dates suivantes ne sont pas encore saisies.</p>
              )}
              <p className="text-xs text-encre-2 mt-3 flex items-start gap-1.5">
                <Bell size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>Rappels dans l’application seulement : aucun e-mail n’est envoyé. Vérifiez chaque date sur le site officiel indiqué dans le calendrier.</span>
              </p>
            </div>

            {/* FAQ rapide */}
            <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
              <div className="flex items-center gap-2 mb-3">
                <Book size={18} className="text-accent-texte" />
                <h2 className={`font-semibold ${textPrimary}`}>Questions fréquentes</h2>
              </div>
              <div className="space-y-2">
                {FAQ_ITEMS.map((faq, i) => (
                  <div key={i} className={`rounded-xl overflow-hidden border transition-colors bg-fond border-bord ${expandedFaq === i ? 'border-bord-fort' : ''}`}>
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className={`w-full p-4 text-left flex items-center justify-between gap-3 group ${textPrimary} hover:bg-opacity-80 transition-colors`}
                      aria-expanded={expandedFaq === i}
                    >
                      <span className="text-sm font-medium flex-1">{faq.q}</span>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${expandedFaq === i ? 'rotate-90 bg-accent/10' : 'bg-surface-2'}`}>
                        <ChevronRight size={22} aria-hidden="true" className={`transition-all ${expandedFaq === i ? 'text-accent-texte' : 'text-encre-3'} group-hover:text-encre`} />
                      </div>
                    </button>
                    {expandedFaq === i && (
                      <div className={`px-4 pb-4 text-sm ${textSecondary}`}>
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
                <ExternalLink size={18} className="text-accent-texte" />
                <h2 className={`font-semibold ${textPrimary}`}>Ressources utiles</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RESSOURCES.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-lg flex items-center gap-2 transition-colors bg-fond hover:bg-surface-2`}
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
        return <TVAManager devis={devis} depenses={depenses} entreprise={entreprise} />;

      case 'calendar':
        return <AdminCalendar echeances={echeances} profil={profil} onChangerReponses={changerReponses} tvaDansLaTresorerie={!!tvaTresorerie} />;

      case 'checklist':
        return <DocumentChecklist chantiers={chantiers} />;

      case 'conformite':
        return <ConformityReport entreprise={entreprise} chantiers={chantiers} />;

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
                ? 'bg-accent text-sur-accent shadow-e1'
                : 'bg-surface text-encre-2 hover:text-encre border border-bord'
            }`}
            aria-pressed={activeSection === section.id}
            aria-label={section.label}
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
