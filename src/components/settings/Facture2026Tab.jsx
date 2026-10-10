import React, { useMemo, useState, useCallback } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  Lock,
  Info,
  Zap,
  Code,
  X,
  Loader2,
} from 'lucide-react';
import { testFacturXCompliance, selectProfile } from '../../lib/facturx';
import { jourLocal } from '../../lib/dates';
import { mentionsFacture } from '../../lib/mentionsFacture';
import { estFranchiseTva, sansTva } from '../../lib/franchiseTva';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Pastille from '../ui/Pastille';

const NOM_ONGLET = { identite: 'Identité', legal: 'Légal', assurances: 'Assurances', banque: 'Banque' };

/** Ouvre l'onglet des Réglages qui porte le champ, et y place le curseur (Settings.jsx, « navigate-settings-tab »). */
function ouvrirChamp({ onglet, champ }) {
  window.dispatchEvent(new CustomEvent('navigate-settings-tab', { detail: { tab: onglet, fieldId: champ } }));
}

/** Une information : coche ou alerte, libellé, puis « Renseigné » ou « Compléter ». */
function LigneInformation({ info }) {
  return (
    <li className="flex items-center gap-3 py-2">
      {info.rempli
        ? <CheckCircle size={18} aria-hidden="true" className="shrink-0 text-succes-texte" />
        : <AlertCircle size={18} aria-hidden="true" className="shrink-0 text-alerte-texte" />}
      <span className="flex-1 min-w-0 text-sm text-encre">{info.libelle}</span>
      {info.rempli ? (
        <Pastille ton="succes" className="shrink-0">Renseigné</Pastille>
      ) : (
        <Bouton
          taille="compacte"
          className="shrink-0"
          onClick={() => ouvrirChamp(info)}
          aria-label={`Compléter : ${info.libelle} (onglet ${NOM_ONGLET[info.onglet] || info.onglet})`}
        >
          Compléter
        </Bouton>
      )}
    </li>
  );
}

// Classes écrites en entier : Tailwind ne génère pas une classe composée à l'exécution
const TEXTE_TON = { succes: 'text-succes-texte', alerte: 'text-alerte-texte', danger: 'text-danger-texte' };

/**
 * Note circulaire. Verte seulement à 100 % : sous 100, il manque une information obligatoire.
 */
function CircularProgress({ score, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const ton = score >= 100 ? 'succes' : score >= 50 ? 'alerte' : 'danger';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--bord))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`rgb(var(--${ton}-point))`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold tabular-nums ${TEXTE_TON[ton]}`}>{score} %</span>
      </div>
    </div>
  );
}

/**
 * Facture2026Tab - réforme de la facture électronique : réception obligatoire depuis le 1er sept. 2026,
 * émission au 1er sept. 2027 pour les TPE/PME, par une Plateforme Agréée (Mallettico n'en est pas une).
 *
 * - les informations d'entreprise à vérifier pour les factures (lib/mentionsFacture), obligatoires et utiles,
 *   chacune avec « Compléter » vers l'onglet et le champ des Réglages ;
 * - le test du fichier Factur-X (profil MINIMUM ou BASIC) sur une facture d'exemple ;
 * - ce que Mallettico fait, et ce qu'il ne fait pas (transmission, conservation).
 */
export default function Facture2026Tab({ entreprise, isDark, couleur }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';

  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const liste = useMemo(() => mentionsFacture(entreprise), [entreprise]);
  const manquantes = liste.total - liste.remplies;

  // Profil Factur-X atteignable (BASIC : IBAN + lignes détaillées)
  const achievableProfile = useMemo(() => {
    const mockInvoice = {
      numero: 'TEST-001',
      date: new Date().toISOString(),
      type: 'facture',
      lignes: [{ description: 'Test', quantite: 1, prixUnitaire: 1000, montant: 1000, unite: 'forfait' }],
    };
    return selectProfile(mockInvoice, { nom: 'Client Test' }, entreprise || {});
  }, [entreprise]);

  // Émission obligatoire pour les TPE, PME et indépendants : 1er septembre 2027 (docs/metier-btp.md §8).
  // Avant (relecture juridique du 10 oct. 2026) : un compte à rebours vers le 1er septembre 2026, déjà passé.
  const joursAvantEmission = useMemo(() => {
    const cible = new Date(2027, 8, 1);
    return Math.max(0, Math.ceil((cible - new Date()) / 86400000));
  }, []);

  // Run real Factur-X compliance test
  const runComplianceTest = useCallback(() => {
    setTesting(true);
    // Use setTimeout to let UI update with loading state
    setTimeout(() => {
      try {
        // Facture d'exemple. Micro-entreprise en franchise (293 B) : sans TVA, comme ses vraies factures ;
        // avant, 20 % de TVA, et le test réclamait un n° de TVA intracommunautaire.
        const franchise = estFranchiseTva(entreprise || {});
        const tauxTva = franchise ? 0 : 20;
        const lignes = [
          { description: 'Travaux de rénovation salle de bain', quantite: 1, prixUnitaire: 800, montant: 800, unite: 'forfait', tva: tauxTva },
          { description: 'Fourniture et pose carrelage', quantite: 12, prixUnitaire: 45, montant: 540, unite: 'm²', tva: tauxTva },
          { description: 'Plomberie raccordements', quantite: 4, prixUnitaire: 40, montant: 160, unite: 'h', tva: tauxTva },
        ];
        const testInvoice = {
          numero: 'TEST-COMPLIANCE-001',
          date: jourLocal(),
          type: 'facture',
          total_ht: 1500,
          tva: franchise ? 0 : 300,
          total_ttc: franchise ? 1500 : 1800,
          tvaRate: tauxTva,
          validite: 30,
          lignes: franchise ? sansTva(lignes) : lignes,
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
      {/* ── Bandeau : « complètes » seulement à 100 % (avant : dès 80 %) ── */}
      <div className={`rounded-2xl p-4 sm:p-5 flex items-start gap-3 ${liste.complet ? 'bg-succes-fond' : 'bg-alerte-fond'}`}>
        {liste.complet
          ? <CheckCircle size={24} aria-hidden="true" className="shrink-0 mt-0.5 text-succes-texte" />
          : <AlertTriangle size={24} aria-hidden="true" className="shrink-0 mt-0.5 text-alerte-texte" />}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-encre">
            Facture électronique : réception depuis le 1er septembre 2026, émission au 1er septembre 2027
          </h2>
          <p className={`mt-1 text-sm font-medium ${liste.complet ? 'text-succes-texte' : 'text-alerte-texte'}`}>
            {liste.complet
              ? 'Vos informations d\'entreprise sont complètes.'
              : `${manquantes} information${manquantes > 1 ? 's' : ''} obligatoire${manquantes > 1 ? 's' : ''} à compléter.`}
            {` Émission par une Plateforme Agréée obligatoire dans ${joursAvantEmission} jours.`}
          </p>
        </div>
      </div>

      {/* ── Note + liste ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-surface border border-bord rounded-2xl shadow-e1 p-5 flex flex-col items-center justify-center text-center">
          <CircularProgress score={liste.note} />
          <p className="mt-3 text-sm font-semibold text-encre">Informations obligatoires</p>
          <p className="text-sm mt-1 text-encre-3 tabular-nums">
            {liste.remplies} sur {liste.total} renseignée{liste.remplies > 1 ? 's' : ''}
          </p>
          <Pastille ton={achievableProfile === 'basic' ? 'info' : 'neutre'} icone={Zap} className="mt-3">
            Profil Factur-X {achievableProfile === 'basic' ? 'BASIC' : 'MINIMUM'}
          </Pastille>
        </div>

        <div className="bg-surface border border-bord rounded-2xl shadow-e1 p-4 sm:p-5 lg:col-span-2">
          <h3 className="font-semibold text-encre flex items-center gap-2">
            <Shield size={20} aria-hidden="true" className="shrink-0 text-accent-texte" />
            Informations à vérifier pour vos factures
          </h3>

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-encre-3">Obligatoires</h4>
          <ul className="divide-y divide-bord">
            {liste.obligatoires.map((info) => <LigneInformation key={info.id} info={info} />)}
          </ul>

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-encre-3">Utiles</h4>
          <ul className="divide-y divide-bord">
            {liste.utiles.map((info) => <LigneInformation key={info.id} info={info} />)}
          </ul>
          <p className="mt-1 text-xs text-encre-3">Les informations utiles ne comptent pas dans la note.</p>
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
                La réforme impose de passer par une Plateforme Agréée pour <strong>recevoir</strong> les
                factures électroniques (depuis le 1er septembre 2026) puis pour les envoyer. Ce raccordement
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
            le traitement automatisé par les Plateformes Agréées.
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

        {/* ── Résultat du test : « sans erreur » seulement s'il n'y en a aucune (avant : dès 70/100, erreurs comprises) ── */}
        {testResult && (
          <div className={`mt-5 rounded-xl p-4 ${testResult.isValid ? 'bg-succes-fond' : 'bg-alerte-fond'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {testResult.isValid
                  ? <CheckCircle size={24} aria-hidden="true" className="shrink-0 text-succes-texte" />
                  : <AlertTriangle size={24} aria-hidden="true" className="shrink-0 text-alerte-texte" />}
                <div className="min-w-0">
                  <p className="font-semibold text-encre">
                    Fichier Factur-X d'essai : profil {testResult.profileLabel}
                  </p>
                  <p className="text-sm mt-0.5 text-encre-2">
                    {testResult.isValid
                      ? 'Produit sans erreur à partir de vos informations.'
                      : 'Des informations manquent : voir ci-dessous.'}
                  </p>
                </div>
              </div>
              <BoutonIcone icone={X} libelle="Fermer le résultat" onClick={() => setTestResult(null)} className="-mt-2 -mr-2" />
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
              <XmlPreview xml={testResult.xml} isDark={isDark} couleur={couleur} />
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
function XmlPreview({ xml, isDark, couleur }) {
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
