import React, { useMemo, useState, useCallback } from 'react';
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
  Info,
  Zap,
  Code,
  X,
  Loader2,
} from 'lucide-react';
import { testFacturXCompliance, selectProfile } from '../../lib/facturx';
import { jourLocal } from '../../lib/dates';

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
    // Réglages › Légal enregistre rcsVille + rcsNumero (lus par les PDF) ; `rcs` = ancien champ libre
    check: (e) => !!(e.rcsVille?.trim() && e.rcsNumero?.trim()) || !!e.rcs?.trim(),
    tab: 'legal',
    icon: FileText,
  },
  {
    id: 'iban',
    label: 'Coordonnées bancaires (IBAN)',
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
    // Présence vérifiée, pas l'échéance : ne pas promettre « valide »
    label: 'Assurance RC Pro',
    // `rcPro.numero` n'a jamais existé : le critère restait « À compléter » même assurance saisie
    check: (e) => !!(e.rcProAssureur?.trim() && e.rcProNumero?.trim()),
    tab: 'assurances',
    icon: ShieldCheck,
  },
  {
    id: 'facturx',
    label: 'Données Factur-X jointes aux factures PDF',
    check: () => true, // Built into Mallettico
    tab: null,
    icon: Shield,
  },
];

/**
 * Circular progress component for compliance score display
 */
function CircularProgress({ score, size = 120, strokeWidth = 10, isDark }) {
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
 * Features:
 * - Dynamic compliance score (entreprise fields + real XML generation test)
 * - Working "Tester la conformité" button with detailed results
 * - Achievable profile indicator (MINIMUM/BASIC)
 * - Checklist with navigation to relevant settings tabs
 */
export default function Facture2026Tab({ entreprise, setEntreprise, isDark, couleur }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Compute checklist results and compliance score
  const { results, score, achievableProfile } = useMemo(() => {
    const results = CHECKLIST_ITEMS.map((item) => ({
      ...item,
      passed: item.check(entreprise || {}),
    }));
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const score = Math.round((passed / total) * 100);

    // Determine achievable profile based on entreprise fields
    const mockInvoice = {
      numero: 'TEST-001',
      date: new Date().toISOString(),
      type: 'facture',
      total_ht: 1000,
      tva: 200,
      total_ttc: 1200,
      tvaRate: 20,
      lignes: [{ description: 'Test', quantite: 1, prixUnitaire: 1000, montant: 1000, unite: 'forfait' }],
    };
    const mockClient = { nom: 'Client Test', adresse: '1 rue Test 75001 Paris' };
    const achievableProfile = selectProfile(mockInvoice, mockClient, entreprise || {});

    return { results, score, achievableProfile };
  }, [entreprise]);

  const isReady = score >= 80;

  const daysLeft = useMemo(() => {
    const target = new Date('2026-09-01');
    const now = new Date();
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
  }, []);

  // Run real Factur-X compliance test
  const runComplianceTest = useCallback(() => {
    setTesting(true);
    // Use setTimeout to let UI update with loading state
    setTimeout(() => {
      try {
        // Create a realistic test invoice
        const testInvoice = {
          numero: 'TEST-COMPLIANCE-001',
          date: jourLocal(),
          type: 'facture',
          total_ht: 1500,
          tva: 300,
          total_ttc: 1800,
          tvaRate: 20,
          validite: 30,
          lignes: [
            { description: 'Travaux de rénovation salle de bain', quantite: 1, prixUnitaire: 800, montant: 800, unite: 'forfait', tva: 20 },
            { description: 'Fourniture et pose carrelage', quantite: 12, prixUnitaire: 45, montant: 540, unite: 'm²', tva: 20 },
            { description: 'Plomberie raccordements', quantite: 4, prixUnitaire: 40, montant: 160, unite: 'h', tva: 20 },
          ],
        };
        const testClient = {
          nom: 'Dupont',
          prenom: 'Marie',
          entreprise: '',
          adresse: '15 rue des Lilas, 75011 Paris',
          email: 'marie.dupont@example.com',
          telephone: '06 12 34 56 78',
        };

        const result = testFacturXCompliance(testInvoice, testClient, entreprise || {});
        setTestResult(result);
      } catch (err) {
        setTestResult({
          score: 0,
          profile: 'minimum',
          profileLabel: 'ERREUR',
          errors: [`Erreur lors du test: ${err.message}`],
          warnings: [],
          xml: null,
          isValid: false,
          isReady: false,
        });
      } finally {
        setTesting(false);
      }
    }, 300);
  }, [entreprise]);

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
                ? `Vos factures sont au bon format — ${daysLeft} jours pour choisir votre plateforme`
                : `${daysLeft} jours restants — ${results.filter((r) => !r.passed).length} information(s) à compléter`}
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
            Vos mentions légales
          </p>
          <p className={`text-xs mt-1 ${textMuted}`}>
            {results.filter((r) => r.passed).length}/{results.length} critères validés
          </p>
          {/* Profile badge */}
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            achievableProfile === 'basic'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            <Zap className="w-3 h-3" />
            Profil {achievableProfile === 'basic' ? 'BASIC' : 'MINIMUM'}
          </div>
        </div>

        {/* Checklist card */}
        <div className={`${cardBg} rounded-2xl border p-5 lg:col-span-2`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Shield className="w-5 h-5" style={{ color: couleur }} />
            Informations requises sur vos factures
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
                      Renseigné
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

      {/*
        Ce que Mallettico couvre — et ce qu'il ne couvre pas.
        La checklist ci-dessus ne vérifie que les mentions légales de l'entreprise.
        Un artisan pourrait afficher 100 % et se retrouver dans l'incapacité de
        recevoir une facture électronique le jour venu : le raccordement à une
        plateforme est une démarche qui lui appartient, et il doit le savoir.
      */}
      <div className={`${cardBg} rounded-2xl border p-5`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          <Info className="w-5 h-5" style={{ color: couleur }} />
          Ce que Mallettico fait, et ce qu'il vous reste à faire
        </h3>
        <div className="space-y-3">
          <div className={`flex items-start gap-2.5 p-3 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                Vos factures PDF contiennent les données Factur-X
              </p>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>
                Chaque facture téléchargée en PDF contient un fichier XML structuré (Factur-X). Pour l'émission
                obligatoire par une Plateforme Agréée (TPE : à partir du 1er septembre 2027), le raccordement est en préparation.
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-2.5 p-3 rounded-xl ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                Mallettico ne transmet pas encore vos factures à votre place
              </p>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                La réforme impose de passer par une plateforme agréée (PDP) pour envoyer
                et surtout <strong>recevoir</strong> les factures électroniques. Ce raccordement
                est une démarche à faire de votre côté : choisissez une plateforme, déclarez-y
                votre SIREN, et déposez-y les fichiers que Mallettico produit.
              </p>
              <p className={`text-xs mt-2 ${isDark ? 'text-amber-200/80' : 'text-amber-700/80'}`}>
                Le calendrier de la réforme a déjà été reporté plusieurs fois. Vérifiez les dates
                qui s'appliquent à votre entreprise auprès de votre expert-comptable ou sur
                impots.gouv.fr avant de vous engager.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Factur-X Info + Test card ── */}
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
          <div className={`flex flex-wrap gap-3 mt-3 text-sm ${textSecondary}`}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>XML Factur-X joint au PDF</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <Info className="w-4 h-4" style={{ color: couleur }} />
              <span>Profil : <strong>{achievableProfile === 'basic' ? 'BASIC' : 'MINIMUM'}</strong></span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <Zap className="w-4 h-4 text-blue-500" />
              <span>Génération 100% automatique</span>
            </div>
          </div>

          {/* Test button */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ background: couleur }}
              onClick={runComplianceTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {testing ? 'Vérification…' : 'Vérifier mes informations'}
            </button>
          </div>
        </div>

        {/* ── Test Results ── */}
        {testResult && (
          <div className={`mt-5 rounded-xl border p-4 ${
            testResult.isReady
              ? isDark ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-emerald-50 border-emerald-200'
              : isDark ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {testResult.isReady ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    Score : {testResult.score}/100 — Profil {testResult.profileLabel}
                  </p>
                  <p className={`text-sm mt-0.5 ${textMuted}`}>
                    {testResult.isReady ? 'Votre configuration est prête pour Factur-X' : 'Des améliorations sont nécessaires'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestResult(null)}
                className={`p-1 rounded-lg hover:bg-black/10 ${textMuted}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Errors */}
            {testResult.errors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Erreurs</p>
                {testResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {testResult.warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Avertissements</p>
                {testResult.warnings.map((warn, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {/* XML Preview toggle */}
            {testResult.xml && (
              <XmlPreview xml={testResult.xml} isDark={isDark} couleur={couleur} textMuted={textMuted} />
            )}
          </div>
        )}
      </div>

      {/* ── Conservation des factures : ce que fait Mallettico, et ce qu'il ne fait pas (D-02) ── */}
      <div className={`${cardBg} rounded-2xl border p-5`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          <Lock className="w-5 h-5" style={{ color: couleur }} />
          Conservation de vos factures (10 ans)
        </h3>
        <div className="space-y-3">
          <p className={`text-sm leading-relaxed ${textSecondary}`}>
            La loi impose de conserver vos factures pendant 10 ans (article L123-22 du Code de commerce).
            Vos documents restent dans votre compte Mallettico tant qu'il est actif, avec leur date de création.
          </p>
          <p className={`text-sm leading-relaxed ${textSecondary}`}>
            Mallettico ne fournit pas d'archivage à valeur probante (scellement des documents) : exportez
            vos factures chaque mois depuis l'export comptable et gardez-en une copie, ou confiez-les à votre comptable.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Collapsible XML preview component
 */
function XmlPreview({ xml, isDark, couleur, textMuted }) {
  const [expanded, setExpanded] = useState(false);

  // Show first ~500 chars when collapsed
  const preview = xml.length > 500 ? xml.slice(0, 500) + '...' : xml;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium hover:underline"
        style={{ color: couleur }}
      >
        <Code className="w-3.5 h-3.5" />
        {expanded ? 'Masquer le XML' : 'Voir le XML généré'}
      </button>
      {expanded && (
        <pre className={`mt-2 p-3 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono leading-relaxed ${
          isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'
        }`}>
          {xml}
        </pre>
      )}
      {!expanded && (
        <pre className={`mt-2 p-3 rounded-lg text-xs overflow-hidden max-h-20 font-mono leading-relaxed ${
          isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-500'
        }`}>
          {preview}
        </pre>
      )}
    </div>
  );
}
