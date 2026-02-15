import React, { useMemo } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Lock,
  ExternalLink,
  Building2,
  CreditCard,
  MapPin,
  Receipt,
  ShieldCheck,
  Info
} from 'lucide-react';

/**
 * Checklist item definition with field validation
 */
const CHECKLIST_ITEMS = [
  {
    id: 'siret',
    label: 'SIRET renseigné',
    check: (e) => !!e.siret?.trim(),
    tab: 'identite',
    icon: Building2,
  },
  {
    id: 'tvaIntra',
    label: 'Numéro TVA intracommunautaire',
    check: (e) => !!e.tvaIntra?.trim(),
    tab: 'legal',
    icon: Receipt,
  },
  {
    id: 'rcs',
    label: 'RCS complet',
    check: (e) => !!e.rcs?.trim(),
    tab: 'legal',
    icon: FileText,
  },
  {
    id: 'iban',
    label: 'Coordonnées bancaires',
    check: (e) => !!e.iban?.trim(),
    tab: 'banque',
    icon: CreditCard,
  },
  {
    id: 'adresse',
    label: 'Adresse complète',
    check: (e) => !!e.adresse?.trim(),
    tab: 'identite',
    icon: MapPin,
  },
  {
    id: 'rcPro',
    label: 'Assurance RC Pro valide',
    check: (e) => !!e.rcPro?.numero?.trim(),
    tab: 'assurances',
    icon: ShieldCheck,
  },
  {
    id: 'facturx',
    label: 'Factur-X activé',
    check: () => true, // Always true - built into ChantierPro
    tab: null,
    icon: Shield,
  },
];

/**
 * Circular progress component for compliance score display
 */
function CircularProgress({ score, size = 120, strokeWidth = 10, couleur, isDark }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDark ? '#334155' : '#e2e8f0'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

/**
 * Facture2026Tab - Compliance readiness tab for the September 2026
 * French electronic invoicing mandate (facturation électronique).
 *
 * Displays compliance score, checklist, Factur-X info, and archive details.
 */
export default function Facture2026Tab({ entreprise, setEntreprise, isDark, couleur }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Compute checklist results and compliance score
  const { results, score } = useMemo(() => {
    const results = CHECKLIST_ITEMS.map((item) => ({
      ...item,
      passed: item.check(entreprise || {}),
    }));
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const score = Math.round((passed / total) * 100);
    return { results, score };
  }, [entreprise]);

  const isReady = score >= 80;

  return (
    <div className="space-y-5">
      {/* ── Alert Banner ── */}
      <div
        className={`rounded-2xl border p-5 ${
          isReady
            ? 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-300/40'
            : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-300/40'
        }`}
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isReady ? 'bg-emerald-500/20' : 'bg-amber-500/20'
            }`}
          >
            {isReady ? (
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Facturation électronique obligatoire le 1er septembre 2026
            </h2>
            <p className={`mt-1 text-sm font-medium ${isReady ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isReady
                ? 'Vous êtes prêt avec ChantierPro \u2713'
                : 'Actions requises pour être conforme'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Score + Checklist row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score card */}
        <div className={`${cardBg} rounded-2xl border p-5 flex flex-col items-center justify-center`}>
          <CircularProgress score={score} isDark={isDark} couleur={couleur} />
          <p className={`mt-3 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            Score Conformité 2026
          </p>
          <p className={`text-xs mt-1 ${textMuted}`}>
            {results.filter((r) => r.passed).length}/{results.length} critères validés
          </p>
        </div>

        {/* Checklist card */}
        <div className={`${cardBg} rounded-2xl border p-5 lg:col-span-2`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Shield className="w-5 h-5" style={{ color: couleur }} />
            Checklist de conformité
          </h3>
          <div className="space-y-2.5">
            {results.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${textMuted}`} />
                  <span className={`flex-1 text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                  {item.passed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Conforme
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <XCircle className="w-3.5 h-3.5" />
                      À compléter
                    </span>
                  )}
                  {item.tab && !item.passed && (
                    <button
                      className="text-xs flex items-center gap-1 hover:underline"
                      style={{ color: couleur }}
                      onClick={() => {
                        // Navigate to the relevant settings tab and scroll to the field
                        const event = new CustomEvent('navigate-settings-tab', {
                          detail: { tab: item.tab, fieldId: item.id }
                        });
                        window.dispatchEvent(event);
                      }}
                      title={`Aller à l'onglet ${item.tab}`}
                    >
                      Compléter
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Factur-X Info card ── */}
      <div className={`${cardBg} rounded-2xl border p-5`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          <FileText className="w-5 h-5" style={{ color: couleur }} />
          Format Factur-X / ZUGFeRD
        </h3>
        <div className="space-y-3">
          <p className={`text-sm leading-relaxed ${textSecondary}`}>
            Factur-X est le standard franco-allemand de facturation électronique basé sur la norme
            européenne EN 16931. Il combine un PDF lisible avec un fichier XML structuré, permettant
            le traitement automatisé par les plateformes de dématérialisation partenaires (PDP).
          </p>
          <div className={`flex flex-wrap gap-4 mt-3 text-sm ${textSecondary}`}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>ChantierPro génère automatiquement vos factures au format Factur-X</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <Info className="w-4 h-4" style={{ color: couleur }} />
              <span>Profil : <strong>MINIMUM</strong> (conforme PDP)</span>
            </div>
          </div>
          <div className="mt-4">
            <button
              className="px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-90"
              style={{ background: couleur }}
              onClick={() => {
                // Dispatch event for testing compliance of an existing invoice
                const event = new CustomEvent('test-facturx-compliance');
                window.dispatchEvent(event);
              }}
            >
              <Shield className="w-4 h-4" />
              Tester la conformité d'une facture
            </button>
          </div>
        </div>
      </div>

      {/* ── Archive legale card ── */}
      <div className={`${cardBg} rounded-2xl border p-5`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          <Lock className="w-5 h-5" style={{ color: couleur }} />
          Archivage légal (10 ans)
        </h3>
        <div className="space-y-3">
          <p className={`text-sm leading-relaxed ${textSecondary}`}>
            La législation française impose un archivage des factures pendant 10 ans (article L123-22
            du Code de commerce). ChantierPro assure la conservation et l'intégrité de vos documents.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Archivage automatique
                </p>
                <p className={`text-xs mt-0.5 ${textMuted}`}>
                  Vos factures sont archivées et horodatées automatiquement
                </p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <Lock className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Vérification SHA-256
                </p>
                <p className={`text-xs mt-0.5 ${textMuted}`}>
                  Chaque document est scellé par un hash SHA-256 garantissant son intégrité
                </p>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Piste d'audit fiable
                </p>
                <p className={`text-xs mt-0.5 ${textMuted}`}>
                  Traçabilité complète des modifications et accès aux documents
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
