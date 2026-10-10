import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useToast, useConfirm } from '../context/AppContext';
import { Download, FileSpreadsheet, FileText, RefreshCw, CheckCircle, AlertCircle, Calendar, ExternalLink, Calculator, Building2, ArrowLeft, Shield, Search, ChevronDown, ChevronRight, Zap, Palette, FileCheck, BellRing, Package, Check, X, Loader2, Home, Smartphone, Fuel, Archive, Landmark, BarChart3, CreditCard, Users, Link2, Settings2, HardDrive, FolderOpen, Construction, Receipt, Mail, Sparkles, ClipboardList, GraduationCap } from 'lucide-react';
import { captureException } from '../lib/sentry';
import AdminHelp from './admin-help/AdminHelp';
import {
  exportInvoicesToCSV,
  exportExpensesToCSV,
  generateFEC,
  downloadFile,
  calculateTVASummary,
} from '../lib/integrations/accounting';

import Facture2026Tab from './settings/Facture2026Tab';
import RelanceConfigTab from './settings/RelanceConfigTab';
import PaymentConfigTab from './settings/PaymentConfigTab';
import EntrepriseSettingsPage from './settings/EntrepriseSettingsPage';
import TeamManagement from './settings/TeamManagement';
import { usePermissions } from '../hooks/usePermissions';
import useKeepInViewport from '../hooks/useKeepInViewport';
import { useRelances } from '../hooks/useRelances';
import { compressImage } from '../lib/image-utils';
import { useOrg } from '../context/OrgContext';
import TemplateManager from './settings/TemplateManager';
import SuppressionCompte from './settings/SuppressionCompte';
import PostChantierSettings from './settings/PostChantierSettings';
import { remettreFichier } from '../lib/natif';
import { Bouton } from './ui/Bouton';
import { jourLocal, dateLue } from '../lib/dates';
import { estEntrepreneurIndividuel, estEirl, nomImprime } from '../lib/identiteEntreprise';
import { URL_SIRENE, profilDepuisSirene } from '../lib/sirene';
import { chiffreAffairesHT } from '../lib/ventes';
import { profilManquant, PROFIL_EXIGE } from '../lib/profilLegal';

// ── Tab groups for mobile navigation ────────────────────────────────────────
const TAB_GROUPS = [
  { id: 'entreprise', label: 'Mon entreprise', icon: Zap, tabs: [
    { key: 'identite', label: 'Identité', icon: Building2 },
    { key: 'legal', label: 'Légal', icon: ClipboardList },
    { key: 'assurances', label: 'Assurances', icon: Shield },
    { key: 'banque', label: 'Banque', icon: Landmark },
  ]},
  { id: 'documents', label: 'Documents', icon: FileText, tabs: [
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'templates', label: 'Modèles', icon: ClipboardList },
    { key: 'facture2026', label: 'Facture 2026', icon: Receipt },
    { key: 'relances', label: 'Relances', icon: Mail },
    { key: 'postchantier', label: 'Post-chantier', icon: Construction },
  ]},
  { id: 'finance', label: 'Finance', icon: Calculator, tabs: [
    { key: 'comptabilite', label: 'Comptabilité', icon: Calculator },
    { key: 'rentabilite', label: 'Rentabilité', icon: BarChart3 },
    { key: 'paiements', label: 'Paiements', icon: CreditCard },
  ]},
  { id: 'equipe', label: 'Équipe', icon: Users, tabs: [
    { key: 'team', label: 'Équipe & Accès', icon: Users },
  ]},
  { id: 'avance', label: 'Avancé', icon: Settings2, tabs: [
    { key: 'donnees', label: 'Données', icon: HardDrive },
    { key: 'administratif', label: 'Administratif', icon: FolderOpen },
    { key: 'multi', label: 'Multi-entreprise', icon: Construction },
  ]},
];

// ── Wizard step definitions ─────────────────────────────────────────────────
const WIZARD_STEPS_DEF = [
  { id: 'identite', title: 'Identité', desc: 'Votre entreprise en un coup d’œil', icon: Palette },
  { id: 'siret', title: 'Informations légales', desc: 'SIRET + auto-remplissage SIRENE', icon: Search },
  { id: 'documents', title: 'Documents', desc: 'TVA, acompte et mentions', icon: FileCheck },
  { id: 'relances', title: 'Relances', desc: 'Relancer les impayés et les devis sans réponse', icon: BellRing },
  { id: 'catalogue', title: 'Catalogue', desc: 'Importez le référentiel BTP', icon: Package },
];

// ── Frais de structure charge items ─────────────────────────────────────────
const FRAIS_ITEMS = [
  { key: 'loyer', label: 'Loyer / local', placeholder: '1500', icon: Home },
  { key: 'assurances', label: 'Assurances (RC + Décennale)', placeholder: '800', icon: Shield },
  { key: 'telephone', label: 'Téléphone / Internet', placeholder: '100', icon: Smartphone },
  { key: 'comptable', label: 'Comptable / Expert', placeholder: '300', icon: Calculator },
  { key: 'carburant', label: 'Carburant / Déplacements', placeholder: '400', icon: Fuel },
  { key: 'divers', label: 'Fournitures / Divers', placeholder: '200', icon: Package },
];

// Villes RCS principales France
// Formes juridiques : une liste fermée (l'assistant proposait un texte libre ; « micro-entreprise » tapé à la
// main n'était pas reconnu et la TVA s'ajoutait sous la franchise 293 B)
const FORMES_JURIDIQUES = [
  { valeur: 'EI', libelle: 'Entreprise Individuelle (EI)' },
  { valeur: 'EIRL', libelle: 'EIRL' },
  { valeur: 'Micro-entreprise', libelle: 'Micro-entreprise / Auto-entrepreneur' },
  { valeur: 'EURL', libelle: 'EURL' },
  { valeur: 'SARL', libelle: 'SARL' },
  { valeur: 'SAS', libelle: 'SAS' },
  { valeur: 'SASU', libelle: 'SASU' },
  { valeur: 'SA', libelle: 'SA (Société Anonyme)' },
  { valeur: 'SNC', libelle: 'SNC (Société en Nom Collectif)' },
];

// Champs repris par « Reprendre les informations de l'entreprise » (texte et nombres seulement)
const CHAMPS_IMPORTABLES = [
  'nom', 'nomEntrepreneur', 'formeJuridique', 'capital', 'adresse', 'ville', 'codePostal', 'pays', 'tel', 'email', 'siteWeb',
  'slogan', 'siret', 'codeApe', 'tvaIntra', 'rcs', 'rcsVille', 'rcsNumero', 'rcsType', 'iban', 'bic', 'banque', 'titulaireBanque',
  'decennaleAssureur', 'decennaleNumero', 'decennaleValidite', 'decennaleActivites', 'decennaleAssureurAdresse', 'decennaleZone',
  'rcProAssureur', 'rcProNumero', 'rcProValidite', 'rcProMontantGarantie', 'rcProZone', 'rge', 'rgeOrganisme',
  'mediateur', 'mediateurContact', 'cgv', 'mentionDevis', 'mentionFacture', 'tvaDefaut', 'acompteDefaut', 'validiteDevis',
  'delaiPaiement', 'tauxPenalites', 'modePaiementDefaut', 'conditionsPaiementDefaut', 'tauxFraisStructure', 'couleur',
];

const VILLES_RCS = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Saint-Étienne', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Clermont-Ferrand', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt', 'Metz', 'Besançon', 'Orléans', 'Rouen', 'Mulhouse', 'Caen', 'Nancy', 'Saint-Denis', 'Argenteuil', 'Roubaix', 'Tourcoing', 'Montreuil', 'Avignon', 'Créteil', 'Poitiers', 'Fort-de-France', 'Versailles', 'Courbevoie', 'Vitry-sur-Seine', 'Colombes', 'Pau'];

// Saisie différée (moins de rendus à chaque frappe, au téléphone), mais jamais perdue : la valeur en attente est
// écrite à la sortie du champ et quand le champ disparaît (changement d'onglet ou de page). Avant (recette du
// 9 oct. 2026), le minuteur était annulé au démontage : un code APE tapé puis « Accueil » touché dans la
// seconde n'était jamais enregistré, sans message.
function useSaisieDifferee(value, onChange, delay) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const timerRef = useRef(null);
  const attenteRef = useRef(null); // valeur tapée pas encore transmise
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (attenteRef.current === null) setLocalValue(value ?? '');
  }, [value]);

  const vider = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (attenteRef.current !== null) {
      const v = attenteRef.current;
      attenteRef.current = null;
      onChangeRef.current(v);
    }
  }, []);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    attenteRef.current = newVal;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(vider, delay);
  };

  useEffect(() => vider, [vider]);

  return { localValue, handleChange, vider };
}

function DebouncedInput({ value, onChange, delay = 800, onBlur, ...props }) {
  const { localValue, handleChange, vider } = useSaisieDifferee(value, onChange, delay);
  return <input {...props} value={localValue} onChange={handleChange} onBlur={(e) => { vider(); onBlur?.(e); }} />;
}

// Same for textarea
function DebouncedTextarea({ value, onChange, delay = 800, onBlur, ...props }) {
  const { localValue, handleChange, vider } = useSaisieDifferee(value, onChange, delay);
  return <textarea {...props} value={localValue} onChange={handleChange} onBlur={(e) => { vider(); onBlur?.(e); }} />;
}

export default function Settings({ entreprise, setEntreprise, user, devis = [], depenses = [], clients = [], chantiers = [], onExportComptable, isDark, couleur, setPage, modeDiscret }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { canManageTeam } = usePermissions();
  const { orgId } = useOrg();
  const relances = useRelances({
    devis, clients, entreprise,
    userId: user?.id,
    orgId,
  });

  // Droit d'accès et à la portabilité (RGPD art. 15 et 20) : TOUTES les données, pas des compteurs.
  // Sert aussi avant une suppression de compte (les factures se conservent 10 ans).
  const exporterDonneesRGPD = () => {
    try {
      const rgpdData = {
        export_type: 'RGPD - Droit d\'accès et portabilité (art. 15 et 20)',
        date: new Date().toISOString(),
        utilisateur: {
          email: user?.email || 'Mode démo',
          id: user?.id || 'demo',
          date_inscription: user?.created_at || null,
        },
        entreprise,
        donnees: { clients, devis_et_factures: devis, chantiers, depenses },
        consentements: (() => {
          try {
            const c = localStorage.getItem('cp_cookie_consent');
            return c ? JSON.parse(c) : { info: 'Aucun consentement enregistré' };
          } catch { return { info: 'Consentements illisibles sur cet appareil' }; }
        })(),
      };
      const blob = new Blob([JSON.stringify(rgpdData, null, 2)], { type: 'application/json' });
      remettreFichier(blob, `mallettico_export_donnees_${jourLocal()}.json`)
        .then((r) => { if (r !== 'annule') showToast('Export de vos données prêt', 'success'); })
        .catch((e) => { captureException(e, { context: 'export RGPD' }); showToast('Erreur lors de l\'export de vos données', 'error'); });
    } catch (e) {
      captureException(e, { context: 'export RGPD' });
      showToast('Erreur lors de l\'export de vos données', 'error');
    }
  };

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  const [tab, setTab] = useState('identite');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(() => {
    try { return parseInt(localStorage.getItem('cp_wizard_step')) || 0; } catch { return 0; }
  });
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [sireneLoading, setSireneLoading] = useState(false);
  const [mobileGroupOpen, setMobileGroupOpen] = useState('entreprise');
  const [showFraisCalc, setShowFraisCalc] = useState(false);
  const [fraisCharges, setFraisCharges] = useState({});

  // Filter tab groups based on permissions (hide Équipe tab if not team manager)
  const visibleTabGroups = TAB_GROUPS.filter(g => g.id !== 'equipe' || canManageTeam);

  // Persist wizard step
  useEffect(() => {
    if (showSetupWizard) {
      try { localStorage.setItem('cp_wizard_step', String(wizardStep)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
    }
  }, [wizardStep, showSetupWizard]);

  // Debounced save notification with visible indicator (MUST be before lookupSIRENE)
  const saveTimeoutRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  // « Enregistré » seulement une fois la base d'accord ; un refus se dit (le message s'affichait
  // même quand rien n'était écrit). L'ancienne copie dans entreprise.settings_json est retirée :
  // l'upsert échouait toujours (pas de contrainte unique sur user_id) et, s'il avait marché, il
  // aurait écrasé la configuration des relances rangée au même endroit (relanceEngine.js).
  const updateEntreprise = useCallback((updater) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    return Promise.resolve(setEntreprise(updater)).then(() => {
      // Debounce the toast to avoid spam
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('saved');
        showToast('Modifications enregistrées', 'success');
        // Reset indicator after 3s
        setTimeout(() => setSaveStatus(null), 3000);
      }, 800);
      return true;
    }).catch((e) => {
      captureException(e, { context: 'paramètres entreprise' });
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaveStatus('error');
      showToast('Modification non enregistrée. Vérifiez votre connexion et réessayez.', 'error');
      return false;
    });
  }, [setEntreprise, showToast]);

  // SIRENE API lookup
  const lookupSIRENE = useCallback(async () => {
    const siret = (entreprise.siret || '').replace(/\s/g, '');
    if (!/^\d{14}$/.test(siret)) {
      showToast('SIRET invalide (14 chiffres requis)', 'error');
      return;
    }
    setSireneLoading(true);
    try {
      // API publique de l'État, sans clé (src/lib/sirene.js)
      const resp = await fetch(`${URL_SIRENE}?q=${encodeURIComponent(siret)}&per_page=1`, { headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const profil = profilDepuisSirene(await resp.json(), siret);
      if (!profil) throw new Error('SIRET introuvable');
      const fullNom = profil.nom;
      // Seuls les champs vides sont remplis (le code APE, public, est mis à jour)
      updateEntreprise(prev => ({
        ...prev,
        ...(profil.nom && !prev.nom ? { nom: profil.nom } : {}),
        ...(profil.adresse && !prev.adresse ? { adresse: profil.adresse } : {}),
        ...(profil.codeApe ? { codeApe: profil.codeApe } : {}),
        ...(profil.formeJuridique && !prev.formeJuridique ? { formeJuridique: profil.formeJuridique } : {}),
        ...(profil.nomEntrepreneur && !prev.nomEntrepreneur ? { nomEntrepreneur: profil.nomEntrepreneur } : {}),
      }));

      showToast(`SIRENE : ${fullNom || 'Entreprise trouvée'}`, 'success');
    } catch (err) {
      if (err?.message === 'SIRET introuvable') showToast('Ce SIRET est introuvable dans le répertoire SIRENE : vérifiez-le.', 'error');
      else { captureException(err, { context: 'auto-remplissage SIRENE' }); showToast('Le répertoire SIRENE ne répond pas : réessayez plus tard ou remplissez les champs à la main.', 'error'); }
    }
    setSireneLoading(false);
  }, [entreprise.siret, updateEntreprise, showToast]);

  // Frais de structure calculator
  const fraisTotal = useMemo(() => Object.values(fraisCharges).reduce((s, v) => s + (parseFloat(v) || 0), 0), [fraisCharges]);
  // CA moyen mensuel des 6 derniers mois : factures émises, avoirs déduits (src/lib/ventes.js). Avant (recette du
  // 9 oct. 2026) : devis signés ET factures payées additionnés, et 1 € sur un compte neuf, d'où « 230000 % ».
  const caEstime = useMemo(() => {
    const now = new Date();
    const du = jourLocal(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
    return chiffreAffairesHT(devis, { du }) / 6;
  }, [devis]);
  // Pas de chiffre d'affaires : pas de suggestion ; sinon borné comme le champ (50 %)
  const tauxSuggere = useMemo(() => (caEstime > 0 ? Math.min(50, Math.round((fraisTotal / caEstime) * 100)) : null), [fraisTotal, caEstime]);

  // Listen for cross-tab navigation events (e.g. from Facture2026Tab)
  useEffect(() => {
    const handleTabNav = (e) => {
      const data = e.detail;
      // Support both string (legacy) and object { tab, fieldId } formats
      const tabValue = typeof data === 'string' ? data : data?.tab;
      const fieldId = typeof data === 'object' ? data?.fieldId : null;
      if (tabValue) {
        setTab(tabValue);
        // After tab switch, scroll to and focus the relevant field
        if (fieldId) {
          setTimeout(() => {
            const el = document.getElementById(`settings-field-${fieldId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
            }
          }, 150);
        }
      }
    };
    window.addEventListener('navigate-settings-tab', handleTabNav);
    return () => window.removeEventListener('navigate-settings-tab', handleTabNav);
  }, []);

  // Escape key handler for modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showSetupWizard) { setShowSetupWizard(false); return; }
        if (showExportModal) { setShowExportModal(false); return; }
        if (showProfileDetail) { setShowProfileDetail(false); return; }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showSetupWizard, showExportModal, showProfileDetail]);

  // Comptabilite state
  const [comptaSubTab, setComptaSubTab] = useState('export');
  const [exportPeriod, setExportPeriod] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      debut: jourLocal(firstDay),
      fin: jourLocal(now)
    };
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez choisir un fichier image', 'error');
      e.target.value = '';
      return;
    }
    try {
      // Compresse/redimensionne le logo (≤512px) avant stockage : il est stocké en
      // base64 dans l'entreprise, chargé sur chaque page ET intégré dans chaque PDF.
      // Sans ça, un gros logo gonfle la base et alourdit tous les documents.
      const blob = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.9,
        format: file.type === 'image/png' ? 'image/png' : 'image/jpeg', // garde la transparence des PNG
        maxSizeBytes: 200 * 1024,
      });
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      // Par l'enregistrement commun : un refus de la base se dit (avant : aucun message, logo absent)
      await updateEntreprise(p => ({ ...p, logo: dataUrl }));
    } catch (err) {
      // Échec du traitement de l'image (le refus de la base est dit par updateEntreprise)
      captureException(err, { context: 'logo entreprise' });
      showToast('Le logo n\'a pas été enregistré. Réessayez avec une image plus légère ou plus tard.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Helper to mask sensitive data in modeDiscret
  const maskValue = (value) => modeDiscret ? '····················' : value;
  
  const COULEURS = ['#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  // Calcul score complétude. « Obligatoires » = ce qui bloque l'envoi (lib/profilLegal, la liste du contrôle
  // d'envoi, téléphone et e-mail compris : règle d'un client particulier, D-23). 100 % = l'envoi n'est bloqué
  // pour aucun client. Avant, la décennale n'était que « recommandée » ici : 100 % affiché, envoi bloqué.
  const RECOMMENDED_FIELDS = [
    { key: 'codeApe', label: 'Code APE', tab: 'legal' },
    { key: 'rcsVille', label: 'Ville RCS', tab: 'legal' },
    { key: 'rcsNumero', label: 'N° RCS', tab: 'legal' },
    { key: 'tvaIntra', label: 'N° TVA Intracommunautaire', tab: 'legal' },
    { key: 'rcProAssureur', label: 'Assureur RC Pro', tab: 'assurances' },
    { key: 'rcProNumero', label: 'N° Police RC Pro', tab: 'assurances' },
    // Sans objet quand l'artisan déclare ses travaux non soumis à la décennale (D-24)
    ...(entreprise.decennaleNonSoumis ? [] : [
      { key: 'decennaleAssureurAdresse', label: 'Coordonnées de l\'assureur (décennale)', tab: 'assurances' },
      { key: 'decennaleZone', label: 'Zone couverte (décennale)', tab: 'assurances' },
    ]),
    { key: 'mediateur', label: 'Médiateur de la consommation', tab: 'documents' },
  ];
  const NOM_ONGLET = { identite: 'Identité', legal: 'Légal', assurances: 'Assurances', documents: 'Documents' };
  const estVide = (f) => !entreprise[f.key] || String(entreprise[f.key]).trim() === '';
  const missingRequired = profilManquant(entreprise).map(m => ({ key: m.champ, label: m.libelle, tab: m.onglet }));
  const missingRecommended = RECOMMENDED_FIELDS.filter(estVide);
  const missingFields = [...missingRequired, ...missingRecommended];
  const completude = Math.round(((PROFIL_EXIGE.length - missingRequired.length) / PROFIL_EXIGE.length) * 100);
  // Le menu des champs manquants est ancré à droite de la jauge : à 375 px il sortait de 77 px à gauche
  const profileDetailRef = useRef(null);
  useKeepInViewport(profileDetailRef, showProfileDetail && completude < 100);

  // Alertes assurances
  const alertesAssurances = useMemo(() => {
    const alerts = [];
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    if (entreprise.rcProValidite) {
      const dateRC = new Date(entreprise.rcProValidite);
      if (dateRC < now) {
        alerts.push({ type: 'rc', severity: 'critical', message: 'RC Pro EXPIRÉE !', date: dateRC });
      } else if (dateRC < in30Days) {
        alerts.push({ type: 'rc', severity: 'warning', message: 'RC Pro expire dans moins de 30 jours', date: dateRC });
      } else if (dateRC < in60Days) {
        alerts.push({ type: 'rc', severity: 'info', message: 'RC Pro expire dans moins de 60 jours', date: dateRC });
      }
    }

    if (entreprise.decennaleValidite) {
      const dateDec = new Date(entreprise.decennaleValidite);
      if (dateDec < now) {
        alerts.push({ type: 'decennale', severity: 'critical', message: 'Décennale EXPIRÉE !', date: dateDec });
      } else if (dateDec < in30Days) {
        alerts.push({ type: 'decennale', severity: 'warning', message: 'Décennale expire dans moins de 30 jours', date: dateDec });
      } else if (dateDec < in60Days) {
        alerts.push({ type: 'decennale', severity: 'info', message: 'Décennale expire dans moins de 60 jours', date: dateDec });
      }
    }

    return alerts;
  }, [entreprise.rcProValidite, entreprise.decennaleValidite]);

  const hasAssuranceAlerts = alertesAssurances.some(a => a.severity === 'critical' || a.severity === 'warning');

  // Factures only for comptabilite
  const factures = useMemo(() => devis.filter(d => d.type === 'facture'), [devis]);

  // TVA Summary for comptabilite
  const tvaSummary = useMemo(() => {
    return calculateTVASummary(devis, depenses, exportPeriod.debut, exportPeriod.fin);
  }, [devis, depenses, exportPeriod]);

  const handleExportCSV = (type) => {
    if (type === 'factures') {
      const csv = exportInvoicesToCSV(factures, clients, entreprise);
      downloadFile(csv, `factures_${exportPeriod.debut}_${exportPeriod.fin}.csv`);
      showToast(`${factures.length} factures exportées`, 'success');
    } else if (type === 'depenses') {
      const csv = exportExpensesToCSV(depenses, chantiers);
      downloadFile(csv, `depenses_${exportPeriod.debut}_${exportPeriod.fin}.csv`);
      showToast(`${depenses.length} dépenses exportées`, 'success');
    }
  };

  const handleExportFEC = () => {
    const fec = generateFEC(factures, depenses, clients, chantiers, entreprise, exportPeriod.debut, exportPeriod.fin);
    downloadFile(fec, `FEC_${entreprise?.siret || 'SIRET'}_${exportPeriod.debut.replace(/-/g, '')}_${exportPeriod.fin.replace(/-/g, '')}.txt`, 'text/plain');
    showToast('Fichier FEC généré', 'success');
  };

  // Export comptable Excel
  const handleExportComptable = () => {
    const devisYear = devis.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === exportYear;
    });

    // Créer CSV (compatible Excel)
    const headers = ['N° Document', 'Type', 'Date', 'Client', 'Total HT', 'TVA 5.5%', 'TVA 10%', 'TVA 20%', 'Total TTC', 'Statut'];
    const rows = devisYear.map(d => {
      const tva55 = d.tvaRate === 5.5 ? d.tva : 0;
      const tva10 = d.tvaRate === 10 ? d.tva : 0;
      const tva20 = d.tvaRate === 20 ? d.tva : 0;
      return [
        d.numero,
        d.type === 'facture' ? 'Facture' : 'Devis',
        dateLue(d.date).toLocaleDateString('fr-FR'),
        d.client_nom || '',
        (d.total_ht || 0).toFixed(2),
        tva55.toFixed(2),
        tva10.toFixed(2),
        tva20.toFixed(2),
        (d.total_ttc || 0).toFixed(2),
        d.statut
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    remettreFichier(blob, `Export_Comptable_${exportYear}.csv`);
    setShowExportModal(false);
  };

  // Validation format TVA
  const validateTVA = (value) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    return /^FR\d{11}$/.test(cleaned);
  };

  // Validation SIRET
  const validateSIRET = (value) => {
    const cleaned = value.replace(/\s/g, '');
    return /^\d{14}$/.test(cleaned);
  };

  // Formater RCS complet
  const getRCSComplet = () => {
    if (!entreprise.rcsVille || !entreprise.rcsNumero) return '';
    return `RCS ${entreprise.rcsVille} ${entreprise.rcsType || 'B'} ${entreprise.rcsNumero}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec score */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {setPage && (
            <button
              onClick={() => setPage('dashboard')}
              className={`p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors hover:bg-surface-2 text-encre-3`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-xl sm:text-2xl font-bold text-encre`}>Paramètres</h1>
          {/* Auto-save status indicator */}
          {saveStatus && (
            <span role="status" className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-fade-in ${
              saveStatus === 'saving'
                ? 'bg-alerte-fond text-alerte-texte'
                : saveStatus === 'error' ? 'bg-danger-fond text-danger-texte' : 'bg-succes-fond text-succes-texte'
            }`}>
              {/* Avant (recette du 9 oct. 2026), un refus s'affichait aussi « Enregistré » en vert */}
              {saveStatus === 'saving' ? (
                <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Enregistrement...</>
              ) : saveStatus === 'error' ? (
                <><AlertCircle size={12} /> Non enregistré</>
              ) : (
                <><CheckCircle size={12} /> Enregistré</>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => completude < 100 ? setShowProfileDetail(prev => !prev) : null}
              className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl border bg-surface border-bord shadow-e1 transition-colors ${completude < 100 ? 'cursor-pointer hover:border-bord-fort' : ''}`}
              title={completude < 100 ? 'Cliquez pour voir les champs manquants' : 'Profil complet !'}
            >
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-encre-2">Profil complété</p>
                <p className={`text-xl font-bold tabular-nums ${completude >= 80 ? 'text-succes-texte' : completude >= 50 ? 'text-alerte-texte' : 'text-danger-texte'}`}>{completude} %</p>
              </div>
              <div className="w-16 sm:w-32 h-2 rounded-full overflow-hidden shrink-0 bg-surface-2">
                <div className={`h-full rounded-full transition-all duration-500 ${completude >= 80 ? 'bg-succes-point' : completude >= 50 ? 'bg-alerte-point' : 'bg-danger-point'}`} style={{ width: `${completude}%` }} />
              </div>
              {completude < 100 && <ChevronDown size={16} aria-hidden="true" className="text-encre-3" />}
            </button>

            {/* Dropdown showing missing fields */}
            {showProfileDetail && completude < 100 && (
              <div ref={profileDetailRef} className={`absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-xl z-50 bg-surface border-bord`}>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${textPrimary}`}>Champs manquants ({missingFields.length})</p>
                    <button onClick={() => setShowProfileDetail(false)} className={`p-1 rounded-lg text-xs hover:bg-surface-2 text-encre-3`}>✕</button>
                  </div>

                  {missingRequired.length > 0 && (
                    <div>
                      <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1 text-danger-texte`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Obligatoires
                      </p>
                      <div className="space-y-1">
                        {missingRequired.map(f => (
                          <button key={f.key} onClick={() => { setTab(f.tab); setShowProfileDetail(false); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between hover:bg-surface-2 text-encre-2`}>
                            <span>{f.label}</span>
                            <span className={`text-xs text-encre-3`}>→ {NOM_ONGLET[f.tab]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {missingRecommended.length > 0 && (
                    <div>
                      <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1 text-alerte-texte`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Recommandés
                      </p>
                      <div className="space-y-1">
                        {missingRecommended.map(f => (
                          <button key={f.key} onClick={() => { setTab(f.tab); setShowProfileDetail(false); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between hover:bg-surface-2 text-encre-2`}>
                            <span>{f.label}</span>
                            <span className={`text-xs text-encre-3`}>→ {NOM_ONGLET[f.tab]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Bouton variante="principal" pleineLargeur icone={Sparkles} className="mt-1"
                    onClick={() => { setShowSetupWizard(true); setWizardStep(0); setShowProfileDetail(false); }}>
                    Compléter avec l'assistant
                  </Bouton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertes assurances critiques */}
      {alertesAssurances.filter(a => a.severity === 'critical').map((alert, i) => (
        <div key={i} className="rounded-2xl px-4 py-3 flex items-center gap-3 bg-danger-fond text-danger-texte">
          <AlertCircle size={20} aria-hidden="true" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{alert.message}</p>
            <p className="text-sm">Expiration le {alert.date.toLocaleDateString('fr-FR')}</p>
          </div>
          <Bouton taille="compacte" onClick={() => setTab('assurances')}>Renouveler</Bouton>
        </div>
      ))}

      {completude < 50 && (
        <div className="rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 bg-alerte-fond text-alerte-texte">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <AlertCircle size={20} aria-hidden="true" className="shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{'Profil incomplet (' + completude + ' %)'}</p>
              <p className="text-sm">
                {missingRequired.length > 0
                  ? missingRequired.length + ' champ' + (missingRequired.length > 1 ? 's' : '') + ' obligatoire' + (missingRequired.length > 1 ? 's' : '') + ' manquant' + (missingRequired.length > 1 ? 's' : '') + '.'
                  : 'Complétez vos informations pour un profil professionnel.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const firstMissing = missingRequired[0] || missingFields[0];
              if (firstMissing) {
                setTab(firstMissing.tab);
                setTimeout(() => {
                  const el = document.getElementById('settings-field-' + firstMissing.key);
                  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
                }, 150);
              }
            }}
            className="self-end sm:self-auto h-11 px-4 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 bg-surface text-encre border border-bord-fort hover:bg-surface-2"
          >
            Compléter
          </button>
        </div>
      )}

      {/* Tabs — Desktop: 2-level grouped navigation (4 groups → sub-tabs) */}
      {/* Level 1: Group pills (hidden on mobile) */}
      <div className={`hidden sm:block border-b border-bord`}>
        <div className="flex gap-0.5">
          {visibleTabGroups.map(group => {
            const activeInGroup = group.tabs.some(t => t.key === tab);
            return (
              <button
                key={group.id}
                onClick={() => { if (!activeInGroup) setTab(group.tabs[0].key); }}
                className={`relative px-4 py-2.5 font-medium whitespace-nowrap min-h-[44px] text-sm transition-all rounded-t-lg ${activeInGroup ? 'font-semibold' : `text-encre-3 hover:text-encre hover:bg-surface-2`}`}
                style={activeInGroup ? { color: entreprise.couleur } : {}}
              >
                <span className="inline-flex items-center gap-1.5">{group.icon && <group.icon size={14} />}{group.label}</span>
                {activeInGroup && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ backgroundColor: entreprise.couleur }} />
                )}
              </button>
            );
          })}
        </div>
        {/* Level 2: Sub-tabs within active group */}
        {(() => {
          const activeGroup = visibleTabGroups.find(g => g.tabs.some(t => t.key === tab));
          if (!activeGroup || activeGroup.tabs.length <= 1) return null;
          return (
            <div className="flex gap-1 p-1 my-2 rounded-xl bg-surface-2 w-fit">
              {activeGroup.tabs.map(t => (
                <button
                  key={t.key}
                  data-tab={t.key}
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={`h-9 px-3 rounded-lg text-sm transition-colors ${tab === t.key ? 'bg-surface text-encre font-semibold shadow-e1' : 'text-encre-2 font-medium hover:text-encre'} ${t.key === 'assurances' && hasAssuranceAlerts ? 'text-danger-texte' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">{t.icon && <t.icon size={13} />}{t.label}</span>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Mobile tabs — grouped accordion (visible < 640px) */}
      <div className={`sm:hidden space-y-1 border rounded-xl overflow-hidden border-bord`}>
        {visibleTabGroups.map(group => {
          const isOpen = mobileGroupOpen === group.id;
          const activeInGroup = group.tabs.some(t => t.key === tab);
          return (
            <div key={group.id}>
              <button
                onClick={() => setMobileGroupOpen(isOpen ? '' : group.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors ${
                  activeInGroup
                    ? 'bg-surface-2 text-encre'
                    : 'text-encre-2 hover:bg-surface-2'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">{group.icon && <group.icon size={15} />}{group.label}</span>
                <div className="flex items-center gap-2">
                  {activeInGroup && !isOpen && (
                    <span className="text-sm px-2 py-0.5 rounded-full bg-surface-2 text-encre-2">
                      {group.tabs.find(t => t.key === tab)?.label}
                    </span>
                  )}
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>
              {isOpen && (
                <div className={`px-2 pb-2 flex gap-1.5 overflow-x-auto bg-surface`} style={{ scrollbarWidth: 'none' }}>
                  {group.tabs.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      aria-pressed={tab === t.key}
                      className={`px-3.5 rounded-full text-sm font-semibold transition-colors min-h-[44px] whitespace-nowrap shrink-0 ${
                        tab === t.key ? 'bg-encre text-surface' : 'bg-surface-2 text-encre-2 hover:text-encre'
                      } ${t.key === 'assurances' && hasAssuranceAlerts && tab !== t.key ? 'text-danger-texte' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">{t.icon && <t.icon size={13} />}{t.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* IDENTITÉ */}
      {tab === 'identite' && (
        <div className="space-y-4 sm:space-y-6">
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Logo & Couleur</h3>
            <div className="flex gap-6 flex-wrap items-start">
              <div>
                <p className="text-sm font-medium mb-2">Logo entreprise</p>
                <div className="flex items-center gap-4">
                  <div
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-2'); e.currentTarget.style.borderColor = entreprise.couleur; e.currentTarget.style.ringColor = entreprise.couleur; }}
                  onDragLeave={e => { e.currentTarget.classList.remove('ring-2'); e.currentTarget.style.borderColor = ''; }}
                  onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('ring-2'); e.currentTarget.style.borderColor = ''; const file = e.dataTransfer.files?.[0]; if (file) { const fakeEvent = { target: { files: [file] } }; handleLogoUpload(fakeEvent); } }}
                  className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all bg-surface-2`}>
                    {entreprise.logo ? (
                      <img src={entreprise.logo} className="w-full h-full object-contain" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : entreprise.nom ? (
                      <span className="text-2xl font-bold" style={{ color: entreprise.couleur || '#64748b' }}>
                        {entreprise.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <Building2 size={28} className="text-slate-300" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="inline-flex items-center h-11 px-4 rounded-xl cursor-pointer text-sm font-semibold bg-surface text-encre border border-bord-fort hover:bg-surface-2">
                      Choisir une image
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {entreprise.logo && (
                      <button onClick={() => updateEntreprise(p => ({...p, logo: ''}))} className="block h-11 text-sm font-semibold text-danger-texte hover:underline">
                        Supprimer le logo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-encre-3 mt-2">PNG ou JPG, 500 Ko au plus.</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Couleur principale</p>
                <div className="flex gap-2 flex-wrap">
                  {COULEURS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateEntreprise(p => ({...p, couleur: c}))}
                      aria-pressed={entreprise.couleur === c}
                      aria-label={`Couleur ${c}${entreprise.couleur === c ? ' (choisie)' : ''}`}
                      className="w-11 h-11 rounded-xl transition-transform duration-150 hover:scale-105 flex items-center justify-center"
                      // ringColor n'existe pas en CSS : la sélection passe par un contour de la couleur elle-même
                      style={{ background: c, outline: entreprise.couleur === c ? `3px solid ${c}` : 'none', outlineOffset: 3 }}
                      title={entreprise.couleur === c ? 'Couleur choisie' : 'Choisir cette couleur'}
                    >
                      {entreprise.couleur === c && (
                        <svg className="w-5 h-5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Informations entreprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom de l'entreprise <span className="text-red-500">*</span></label>
                <DebouncedInput id="settings-field-nom" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex: Dupont Rénovation" value={entreprise.nom || ''} onChange={val => updateEntreprise(p => ({...p, nom: val}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Statut juridique <span className="text-red-500">*</span></label>
                <select id="settings-field-formeJuridique" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.formeJuridique || ''} onChange={e => updateEntreprise(p => ({...p, formeJuridique: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  {FORMES_JURIDIQUES.map(f => <option key={f.valeur} value={f.valeur}>{f.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Capital (optionnel)
                </label>
                <div className="flex">
                  <DebouncedInput type="number" className={`flex-1 px-4 py-2.5 border rounded-l-xl ${inputBg}`} placeholder="10000" value={entreprise.capital || ''} onChange={val => updateEntreprise(p => ({...p, capital: val}))} />
                  <span className={`px-4 py-2.5 border-y border-r rounded-r-xl bg-surface-2 text-encre-3 border-bord-fort`}>€</span>
                </div>
              </div>
              {(estEntrepreneurIndividuel(entreprise) || estEirl(entreprise)) && (
                <div className="md:col-span-2">
                  <label htmlFor="settings-field-nomEntrepreneur" className="block text-sm font-medium mb-1">Votre prénom et nom</label>
                  <DebouncedInput id="settings-field-nomEntrepreneur" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex : Hugo Séguin" value={entreprise.nomEntrepreneur || ''} onChange={val => updateEntreprise(p => ({...p, nomEntrepreneur: val}))} />
                  <p className="text-xs text-encre-3 mt-1">
                    Sur vos devis et factures, votre nom doit être suivi de « {estEirl(entreprise) ? 'EIRL' : 'EI'} ». Il s'imprimera ainsi : <strong className="text-encre-2">{nomImprime(entreprise) || '—'}</strong>
                  </p>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Adresse siège social <span className="text-red-500">*</span></label>
                <DebouncedTextarea id="settings-field-adresse" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} placeholder="12 rue des Artisans&#10;75001 Paris&#10;FRANCE" value={entreprise.adresse || ''} onChange={val => updateEntreprise(p => ({...p, adresse: val}))} />
                <p className="text-xs text-slate-500 mt-1">Inclure "FRANCE" pour les documents internationaux</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone <span className="text-red-500">*</span></label>
                <div className="relative">
                  <DebouncedInput id="settings-field-tel" type="tel" className={`w-full px-4 py-2.5 border rounded-xl text-base sm:text-sm ${inputBg}`} placeholder="06 12 34 56 78" value={entreprise.tel || ''} onChange={val => updateEntreprise(p => ({...p, tel: val}))} />
                  {entreprise.tel && /^(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test((entreprise.tel || '').trim()) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold" aria-label="Valide"><Check size={12} /></span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <DebouncedInput id="settings-field-email" type="email" className={`w-full px-4 py-2.5 border rounded-xl text-base sm:text-sm ${inputBg}`} placeholder="contact@monentreprise.fr" value={entreprise.email || ''} onChange={val => updateEntreprise(p => ({...p, email: val}))} />
                  {entreprise.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((entreprise.email || '').trim()) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold" aria-label="Valide"><Check size={12} /></span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site web</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="www.monentreprise.fr" value={entreprise.siteWeb || ''} onChange={val => updateEntreprise(p => ({...p, siteWeb: val}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slogan (optionnel)</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Votre artisan de confiance" value={entreprise.slogan || ''} onChange={val => updateEntreprise(p => ({...p, slogan: val}))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LÉGAL */}
      {tab === 'legal' && (
        <div className="space-y-4 sm:space-y-6">
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Numéros d'identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SIRET (14 chiffres) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <DebouncedInput id="settings-field-siret" className={`w-full px-4 py-2.5 border rounded-xl font-mono text-base sm:text-sm ${entreprise.siret && !validateSIRET(entreprise.siret) ? 'border-red-300 bg-red-50' : inputBg}`} placeholder="123 456 789 00012" maxLength={17} value={entreprise.siret || ''} onChange={val => updateEntreprise(p => ({...p, siret: val}))} />
                  {entreprise.siret && validateSIRET(entreprise.siret) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold" aria-label="Valide"><Check size={12} /></span>
                  )}
                </div>
                {entreprise.siret && !validateSIRET(entreprise.siret) && (
                  <p className="text-xs text-red-500 mt-1">Format invalide. Attendu: 14 chiffres</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code APE/NAF</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="4339Z" maxLength={5} value={entreprise.codeApe || ''} onChange={val => updateEntreprise(p => ({...p, codeApe: val.toUpperCase()}))} />
              </div>
            </div>
          </div>

          {entreprise.formeJuridique !== 'Micro-entreprise' && entreprise.formeJuridique !== 'Auto-entrepreneur' ? (
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">RCS - Registre du Commerce</h3>
            <p className={`text-sm mb-4 ${textMuted}`}>Format légal: RCS [Ville] [Type] [Numéro] — ex: RCS Paris B 123 456 789</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ville du greffe</label>
                <select id="settings-field-rcs" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.rcsVille || ''} onChange={e => updateEntreprise(p => ({...p, rcsVille: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  {VILLES_RCS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.rcsType || 'B'} onChange={e => updateEntreprise(p => ({...p, rcsType: e.target.value}))}>
                  <option value="A">A - Commerçant</option>
                  <option value="B">B - Société commerciale</option>
                  <option value="C">C - GIE</option>
                  <option value="D">D - Société civile</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro (9 chiffres)</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="123 456 789" maxLength={11} value={entreprise.rcsNumero || ''} onChange={val => updateEntreprise(p => ({...p, rcsNumero: val}))} />
              </div>
            </div>
            {getRCSComplet() && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl">
                <p className="text-sm text-green-700">" Sera affiché: <strong>{getRCSComplet()}</strong></p>
              </div>
            )}
          </div>
          ) : (
          <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>ℹ️ Auto-entrepreneur / Micro-entreprise</p>
            <p className={`text-xs mt-1 text-info-texte`}>Le RCS n'est pas requis pour votre statut juridique.</p>
          </div>
          )}

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">TVA Intracommunautaire</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Numéro TVA</label>
              <DebouncedInput id="settings-field-tvaIntra" className={`w-full px-4 py-2.5 border rounded-xl font-mono ${entreprise.tvaIntra && !validateTVA(entreprise.tvaIntra) ? 'border-amber-300 bg-amber-50' : inputBg}`} placeholder="FR 12 345678901" value={entreprise.tvaIntra || ''} onChange={val => updateEntreprise(p => ({...p, tvaIntra: val.toUpperCase()}))} />
              <p className="text-xs text-slate-500 mt-1">Format: FR + 11 chiffres (ex: FR12345678901)</p>
              {entreprise.tvaIntra && validateTVA(entreprise.tvaIntra) && (
                <p className="text-xs text-green-600 mt-1">“ Format valide</p>
              )}
            </div>
          </div>

          {entreprise.formeJuridique === 'Micro-entreprise' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-medium text-blue-800"> Micro-entreprise</p>
              <p className="text-sm text-blue-700 mt-1">La mention "TVA non applicable, article 293 B du CGI" sera automatiquement ajoutée sur vos devis et factures.</p>
            </div>
          )}

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Qualifications professionnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Numéro RGE</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="E-12345" value={entreprise.rge || ''} onChange={val => updateEntreprise(p => ({...p, rge: val}))} />
                <p className="text-xs text-slate-500 mt-1">Reconnu Garant de l'Environnement</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Organisme RGE</label>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.rgeOrganisme || ''} onChange={e => updateEntreprise(p => ({...p, rgeOrganisme: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  <option value="Qualibat">Qualibat</option>
                  <option value="Qualifelec">Qualifelec</option>
                  <option value="Qualit'EnR">Qualit'EnR</option>
                  <option value="Qualiopi">Qualiopi</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSURANCES */}
      {tab === 'assurances' && (
        <div className="space-y-4 sm:space-y-6">
          {alertesAssurances.length > 0 && (
            <div className="space-y-3">
              {alertesAssurances.map((alert, i) => (
                <div key={i} className={`rounded-xl p-4 flex items-center gap-3 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-2 border-red-300' :
                  alert.severity === 'warning' ? 'bg-amber-50 border border-amber-300' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  <span className="text-xl">{alert.severity === 'critical' ? '' : alert.severity === 'warning' ? '⚠️ ' : 'ℹ'}</span>
                  <div className="flex-1">
                    <p className={`font-medium ${alert.severity === 'critical' ? 'text-red-800' : alert.severity === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>
                      {alert.message}
                    </p>
                    <p className={`text-sm ${alert.severity === 'critical' ? 'text-red-600' : alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>
                      Expiration: {alert.date.toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* C. assur. L241-1 (obligation : travaux de construction) et L243-2 (attestation jointe aux devis et factures) ;
              la RC Pro n'est pas obligatoire dans le bâtiment. Avant : « obligatoire pour les artisans du BTP », « L243-1 ». */}
          <div className="rounded-xl p-4 bg-alerte-fond text-alerte-texte">
            <p className="font-medium">Décennale : obligatoire pour les travaux de construction</p>
            <p className="text-sm mt-1">Si vous en faites, même parfois, joignez votre attestation à vos devis et factures. La RC Pro est conseillée, pas obligatoire.</p>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold"> Assurance RC Professionnelle</h3>
              {entreprise.rcProValidite && (() => {
                const d = new Date(entreprise.rcProValidite);
                const now = new Date();
                const daysLeft = Math.ceil((d - now) / (1000*60*60*24));
                if (daysLeft < 0) return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Expirée</span>;
                if (daysLeft < 60) return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">Expire dans {daysLeft}j</span>;
                return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ Valide</span>;
              })()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Compagnie d'assurance</label>
                <DebouncedInput id="settings-field-rcPro" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="AXA, MAAF, MMA..." value={entreprise.rcProAssureur || ''} onChange={val => updateEntreprise(p => ({...p, rcProAssureur: val}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de contrat</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="RC-123456789" value={entreprise.rcProNumero || ''} onChange={val => updateEntreprise(p => ({...p, rcProNumero: val}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de validité</label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.rcProValidite || ''} onChange={e => updateEntreprise(p => ({...p, rcProValidite: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Montant de garantie</label>
                <div className="flex">
                  <DebouncedInput type="number" className={`flex-1 px-4 py-2.5 border rounded-l-xl ${inputBg}`} placeholder="300000" value={entreprise.rcProMontantGarantie || ''} onChange={val => updateEntreprise(p => ({...p, rcProMontantGarantie: val}))} />
                  <span className={`px-4 py-2.5 border-y border-r rounded-r-xl bg-surface-2 text-encre-3 border-bord-fort`}>€</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zone géographique</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="France entière" value={entreprise.rcProZone || 'France entière'} onChange={val => updateEntreprise(p => ({...p, rcProZone: val}))} />
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold"> Garantie Décennale</h3>
              {entreprise.decennaleValidite && (() => {
                const d = new Date(entreprise.decennaleValidite);
                const now = new Date();
                const daysLeft = Math.ceil((d - now) / (1000*60*60*24));
                if (daysLeft < 0) return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Expirée</span>;
                if (daysLeft < 60) return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">Expire dans {daysLeft}j</span>;
                return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ Valide</span>;
              })()}
            </div>
            {/* D-24 : l'obligation de décennale (C. assur. L241-1) vise les travaux de construction, pas le dépannage
                ni l'entretien. Déclaré par l'artisan, sous sa responsabilité : l'envoi n'exige plus la décennale. */}
            <label className="flex items-start gap-3 min-h-11 mb-4 cursor-pointer">
              <input id="settings-field-decennaleNonSoumis" type="checkbox" className="mt-0.5 w-5 h-5 shrink-0" style={{ accentColor: couleur }}
                checked={entreprise.decennaleNonSoumis === true}
                onChange={e => updateEntreprise(p => ({ ...p, decennaleNonSoumis: e.target.checked }))} />
              <span className="text-sm">
                <span className="font-medium text-encre">Je ne fais que du dépannage, de l'entretien ou de petites réparations : je ne suis pas soumis à la décennale</span>
                <span className="block text-encre-3">À cocher seulement si vous ne faites jamais de construction, d'extension ni de rénovation importante (par exemple refaire une toiture ou toute l'électricité d'un logement). En cas de doute, demandez à votre assureur. Vous le déclarez sous votre responsabilité.</span>
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Compagnie d'assurance {entreprise.decennaleNonSoumis ? null : <span className="text-red-500">*</span>}</label>
                <DebouncedInput id="settings-field-decennaleAssureur" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="SMABTP, AXA..." value={entreprise.decennaleAssureur || ''} onChange={val => updateEntreprise(p => ({...p, decennaleAssureur: val}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de contrat {entreprise.decennaleNonSoumis ? null : <span className="text-red-500">*</span>}</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="DEC-987654321" value={entreprise.decennaleNumero || ''} onChange={val => updateEntreprise(p => ({...p, decennaleNumero: val}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de validité {entreprise.decennaleNonSoumis ? null : <span className="text-red-500">*</span>}</label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.decennaleValidite || ''} onChange={e => updateEntreprise(p => ({...p, decennaleValidite: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Activités couvertes</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Tous corps d'état" value={entreprise.decennaleActivites || ''} onChange={val => updateEntreprise(p => ({...p, decennaleActivites: val}))} />
              </div>
              {/* Mentions obligatoires sur devis et factures : coordonnées de l'assureur et couverture géographique */}
              <div>
                <label className="block text-sm font-medium mb-1">Coordonnées de l'assureur {entreprise.decennaleNonSoumis ? null : <span className="text-red-500">*</span>}</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Adresse de la compagnie" value={entreprise.decennaleAssureurAdresse || ''} onChange={val => updateEntreprise(p => ({...p, decennaleAssureurAdresse: val}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zone géographique couverte {entreprise.decennaleNonSoumis ? null : <span className="text-red-500">*</span>}</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="France métropolitaine" value={entreprise.decennaleZone || ''} onChange={val => updateEntreprise(p => ({...p, decennaleZone: val}))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BANQUE */}
      {tab === 'banque' && (
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
          <h3 className="font-semibold mb-4">Coordonnées bancaires</h3>
          <p className="text-sm text-slate-500 mb-4">Ces informations apparaîtront sur vos factures pour faciliter le paiement par virement.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Banque</label>
              <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Crédit Agricole, BNP..." value={entreprise.banque || ''} onChange={val => updateEntreprise(p => ({...p, banque: val}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Titulaire du compte</label>
              <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder={entreprise.nom || 'Nom du titulaire'} value={entreprise.titulaireBanque || ''} onChange={val => updateEntreprise(p => ({...p, titulaireBanque: val}))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">IBAN</label>
              <DebouncedInput id="settings-field-iban" className={`w-full px-4 py-2.5 border rounded-xl font-mono ${entreprise.iban && !/^FR\d{2}\s?([A-Z0-9]{4}\s?){5}[A-Z0-9]{3}$/.test(entreprise.iban.replace(/\s/g, '').match(/^FR\d{2}/) ? entreprise.iban : '') && entreprise.iban.replace(/\s/g, '').length > 4 ? 'border-amber-300' : ''} ${inputBg}`} placeholder="FR76 1234 5678 9012 3456 7890 123" value={modeDiscret ? '···· ···· ···· ···· ···· ···· ···' : (entreprise.iban || '')} onChange={val => updateEntreprise(p => ({...p, iban: val.toUpperCase()}))} readOnly={modeDiscret} />
              {entreprise.iban && entreprise.iban.replace(/\s/g, '').length === 27 && entreprise.iban.replace(/\s/g, '').startsWith('FR') && (
                <p className="text-xs text-green-600 mt-1">✓ Format IBAN valide</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">BIC/SWIFT</label>
              <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="AGRIFRPP" value={modeDiscret ? '········' : (entreprise.bic || '')} onChange={val => updateEntreprise(p => ({...p, bic: val.toUpperCase()}))} readOnly={modeDiscret} />
            </div>
          </div>
          <div className={`mt-4 rounded-xl p-3 flex items-start gap-2 ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <Shield size={16} className={`flex-shrink-0 mt-0.5 text-info-texte`} />
            <p className={`text-xs text-info-texte`}>
              Vos coordonnées bancaires apparaîtront sur vos factures pour faciliter les virements. Elles sont stockées localement et ne sont jamais partagées avec des tiers.
            </p>
          </div>

          {/* Mode de paiement par défaut */}
          <div className={`mt-6 pt-6 border-t border-bord`}>
            <h4 className="font-semibold mb-3">Mode de paiement par défaut</h4>
            <p className={`text-sm ${textMuted} mb-3`}>Mode pré-sélectionné lors de l'encaissement d'une facture.</p>
            <select
              className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
              value={entreprise.modePaiementDefaut || 'virement'}
              onChange={e => updateEntreprise(p => ({...p, modePaiementDefaut: e.target.value}))}
            >
              <option value="virement">Virement bancaire (recommandé BTP)</option>
              <option value="cheque">Chèque</option>
              <option value="especes">Espèces</option>
              <option value="cb">Carte bancaire</option>
              <option value="prelevement">Prélèvement</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>
      )}

      {/* DOCUMENTS — removed, content moved to comptabilite */}
      {tab === 'documents' && (
        <div className="space-y-4 sm:space-y-6">
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Paramètres par défaut des devis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Validité devis par défaut</label>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.validiteDevis || 30} onChange={e => updateEntreprise(p => ({...p, validiteDevis: parseInt(e.target.value)}))}>
                  <option value={15}>15 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={60}>2 mois</option>
                  <option value={90}>3 mois</option>
                </select>
                <p className={`text-xs mt-1 ${textMuted}`}>Art. L.111-1 du Code de la consommation</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TVA par défaut</label>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={(entreprise.tvaDefaut ?? 10)} onChange={e => updateEntreprise(p => ({...p, tvaDefaut: parseFloat(e.target.value)}))}>
                  <option value={20}>20% (taux normal)</option>
                  <option value={10}>10% (rénovation &gt;2 ans)</option>
                  <option value={5.5}>5,5% (réno. énergétique)</option>
                  <option value={0}>0% (franchise TVA)</option>
                </select>
                <p className={`text-xs mt-1 ${textMuted}`}>20% standard · 10% rénovation {'>'} 2 ans · 5,5% performance énergétique</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Délai de paiement</label>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.delaiPaiement || 30} onChange={e => updateEntreprise(p => ({...p, delaiPaiement: parseInt(e.target.value)}))}>
                  <option value={0}>Comptant</option>
                  <option value={14}>14 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={45}>45 jours</option>
                  <option value={60}>60 jours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Acompte par défaut</label>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={(entreprise.acompteDefaut ?? 30)} onChange={e => updateEntreprise(p => ({...p, acompteDefaut: parseInt(e.target.value)}))}>
                  <option value={0}>Pas d'acompte</option>
                  <option value={20}>20%</option>
                  <option value={30}>30% (recommandé BTP)</option>
                  <option value={40}>40%</option>
                  <option value={50}>50%</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Mentions légales sur les documents</h3>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-xl bg-surface-2`}>
                <div>
                  <p className="font-medium">Droit de rétractation (14 jours)</p>
                  <p className="text-sm text-slate-500">Article L221-18 du Code de la consommation</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={entreprise.mentionRetractation !== false} onChange={e => updateEntreprise(p => ({...p, mentionRetractation: e.target.checked}))} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl bg-surface-2`}>
                <div>
                  <p className="font-medium">Garanties légales BTP</p>
                  <p className="text-sm text-slate-500">Parfait achèvement, biennale, décennale</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={entreprise.mentionGaranties !== false} onChange={e => updateEntreprise(p => ({...p, mentionGaranties: e.target.checked}))} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Pénalités de retard */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Pénalités de retard</h3>
                <p className={`text-sm ${textMuted}`}>Art. L441-10 du Code de commerce — obligatoire sur les factures</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={entreprise.mentionPenalites !== false} onChange={e => updateEntreprise(p => ({...p, mentionPenalites: e.target.checked}))} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            {entreprise.mentionPenalites !== false && (
              <div className="flex items-center gap-3">
                <label className={`text-sm ${textSecondary}`}>Taux annuel :</label>
                <div className="flex items-center">
                  <input type="number" step="0.01" min="0" max="50" className={`w-24 px-3 py-2 border rounded-l-xl text-sm ${inputBg}`} value={entreprise.tauxPenalites || ''} placeholder="BCE + 10" aria-label="Taux annuel des pénalités de retard" onChange={e => updateEntreprise(p => ({...p, tauxPenalites: parseFloat(e.target.value) || null}))} />
                  <span className={`px-3 py-2 border-y border-r rounded-r-xl text-sm bg-surface-2 text-encre-3 border-bord-fort`}>%</span>
                </div>
                <p className={`text-xs ${textMuted}`}>Laissé vide : taux de la BCE majoré de 10 points. Un taux choisi ne peut être inférieur à 3 fois le taux d'intérêt légal (art. L441-10 II C. com.).</p>
              </div>
            )}
          </div>

          {/* Médiateur de la consommation */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-1">Médiateur de la consommation</h3>
            <p className={`text-sm mb-4 ${textMuted}`}>Obligatoire depuis 2016 (Art. L612-1 du Code de la consommation)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom du médiateur</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Médiation de la consommation" value={entreprise.mediateur || ''} onChange={val => updateEntreprise(p => ({...p, mediateur: val}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site web / Adresse</label>
                <DebouncedInput className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="www.mediateur-consommation.fr" value={entreprise.mediateurContact || ''} onChange={val => updateEntreprise(p => ({...p, mediateurContact: val}))} />
              </div>
            </div>
          </div>

          {/* CGV */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Conditions générales personnalisées</h3>
            <DebouncedTextarea className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} rows={4} placeholder="Ajoutez ici vos conditions générales personnalisées qui apparaîtront sur tous vos devis et factures..." value={entreprise.cgv || ''} onChange={val => updateEntreprise(p => ({...p, cgv: val}))} />
            <p className={`text-xs ${textMuted} mt-2`}>Ce texte sera ajouté après les mentions légales obligatoires.</p>
          </div>
        </div>
      )}

      {/* MODÈLES DE DEVIS */}
      {tab === 'templates' && (
        <TemplateManager
          isDark={isDark}
          couleur={couleur}
          modeDiscret={modeDiscret}
        />
      )}

      {/* FACTURE 2026 */}
      {tab === 'facture2026' && (
        <Facture2026Tab
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {/* RELANCES */}
      {tab === 'relances' && (
        <RelanceConfigTab
          entreprise={entreprise}
          setEntreprise={updateEntreprise}
          isDark={isDark}
          couleur={couleur}
          stats={relances.stats}
          exclusions={relances.exclusions}
          onRemoveExclusion={(id) => relances.deleteExclusion(id)}
          onSaveConfig={(config) => relances.saveConfig(config)}
          clients={clients}
          devis={devis}
          modeDiscret={modeDiscret}
        />
      )}

      {tab === 'postchantier' && (
        <PostChantierSettings
          isDark={isDark}
          couleur={couleur}
          showToast={showToast}
        />
      )}

      {/* RENTABILITÉ */}
      {tab === 'rentabilite' && (
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><BarChart3 size={18} /> Calcul de Rentabilité</h3>
          <div className="space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Taux de frais de structure (%)</label>
                <input type="text" inputMode="decimal" aria-label="Taux de frais de structure, en %" key={`taux-frais-${entreprise.tauxFraisStructure ?? 15}`} className={`w-32 px-4 py-2.5 border rounded-xl ${inputBg}`} defaultValue={String(entreprise.tauxFraisStructure ?? 15).replace('.', ',')}
                  onBlur={e => {
                    // Validé à la sortie du champ, borné de 0 à 50 (avant : « 15 » réimposé dès que le champ était vide)
                    const n = parseFloat(e.target.value.replace(',', '.'));
                    const v = Number.isFinite(n) ? Math.max(0, Math.min(50, n)) : (entreprise.tauxFraisStructure ?? 15);
                    e.target.value = String(v).replace('.', ',');
                    if (v !== entreprise.tauxFraisStructure) updateEntreprise(p => ({ ...p, tauxFraisStructure: v }));
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
              </div>
              <button
                onClick={() => setShowFraisCalc(!showFraisCalc)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: couleur }}
              >
                <Calculator size={16} /> {showFraisCalc ? 'Masquer' : 'Calculer mes frais'}
              </button>
            </div>

            {/* Mini-wizard frais de structure */}
            {showFraisCalc && (
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-sm font-semibold flex items-center gap-1.5 ${textPrimary}`}><Calculator size={15} /> Calculez votre taux réel</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FRAIS_ITEMS.map(item => (
                    <div key={item.key}>
                      <label className={`flex items-center gap-1 text-xs font-medium mb-1 ${textSecondary}`}>{item.icon && <item.icon size={13} />} {item.label}</label>
                      <input
                        type="number"
                        placeholder={item.placeholder}
                        value={fraisCharges[item.key] || ''}
                        onChange={e => setFraisCharges(prev => ({ ...prev, [item.key]: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                      />
                    </div>
                  ))}
                </div>
                <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-blue-200'}`}>
                  <div>
                    <p className={`text-xs ${textSecondary}`}>Total charges mensuelles</p>
                    <p className={`text-lg font-bold ${textPrimary}`}>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fraisTotal)}</p>
                  </div>
                  <div className="text-center px-4">
                    <p className={`text-xs ${textSecondary}`}>CA moyen mensuel</p>
                    <p className={`text-sm font-medium ${textPrimary}`}>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(caEstime)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${textSecondary}`}>Taux suggéré</p>
                    <p className="text-xl font-bold" style={{ color: couleur }}>{tauxSuggere === null ? '—' : `${tauxSuggere} %`}</p>
                  </div>
                </div>
                {tauxSuggere === null ? (
                  <p className={`text-sm ${textSecondary}`}>Le taux se calcule à partir de vos factures des 6 derniers mois. Sans facture émise, saisissez-le à la main ci-dessus.</p>
                ) : (
                  <button
                    onClick={() => {
                      updateEntreprise(p => ({ ...p, tauxFraisStructure: tauxSuggere }));
                      setShowFraisCalc(false);
                      showToast(`Taux mis à jour : ${tauxSuggere} %`, 'success');
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: couleur }}
                  >
                    Appliquer {tauxSuggere} % comme taux de frais de structure
                  </button>
                )}
              </div>
            )}

            {/* Visual formula breakdown */}
            <div className={`rounded-xl border p-5 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gradient-to-br from-slate-50 to-blue-50/50 border-slate-200'}`}>
              <p className={`text-sm font-semibold mb-3 ${textPrimary}`}>Formule de calcul</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="px-3 py-1.5 rounded-lg font-semibold text-white" style={{ backgroundColor: couleur }}>Marge Réelle</span>
                <span className={`text-lg font-bold ${textMuted}`}>=</span>
                <span className={`px-3 py-1.5 rounded-lg font-medium bg-succes-fond text-succes-texte`}>CA HT</span>
                <span className={`text-lg font-bold ${textMuted}`}>+</span>
                <span className={`px-3 py-1.5 rounded-lg font-medium bg-info-fond text-info-texte`}>Ajustements Revenus</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm mt-2 ml-0 sm:ml-8">
                <span className={`text-lg font-bold ${textMuted}`}>−</span>
                <span className={`px-3 py-1.5 rounded-lg font-medium bg-danger-fond text-danger-texte`}>Matériaux</span>
                <span className={`text-lg font-bold ${textMuted}`}>−</span>
                <span className={`px-3 py-1.5 rounded-lg font-medium bg-danger-fond text-danger-texte`}>Main d'œuvre</span>
                <span className={`text-lg font-bold ${textMuted}`}>−</span>
                <span className={`px-3 py-1.5 rounded-lg font-medium bg-alerte-fond text-alerte-texte`}>Frais structure ({entreprise.tauxFraisStructure || 15}%)</span>
                <span className={`text-lg font-bold ${textMuted}`}>−</span>
                <span className={`px-3 py-1.5 rounded-lg font-medium bg-danger-fond text-danger-texte`}>Ajustements Dépenses</span>
              </div>
            </div>

            {/* Color legend */}
            <div className={`rounded-xl p-4 text-sm ${isDark ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'}`}>
              <p className={`font-semibold mb-2 text-info-texte`}>Code couleur marge :</p>
              <div className="flex flex-wrap gap-4">
                <span className={`flex items-center gap-2 text-info-texte`}><span className="w-3 h-3 rounded bg-red-500 shrink-0"></span> {'<'}0% — Négative</span>
                <span className={`flex items-center gap-2 text-info-texte`}><span className="w-3 h-3 rounded bg-amber-500 shrink-0"></span> 0-15% — Faible</span>
                <span className={`flex items-center gap-2 text-info-texte`}><span className="w-3 h-3 rounded bg-emerald-500 shrink-0"></span> {'>'}15% — Saine</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPTABILITÉ */}
      {tab === 'comptabilite' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Sub-tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'export', label: 'Export', icon: Download },
              { id: 'tva', label: 'Résumé TVA', icon: Calculator }
            ].map(subtab => (
              <button
                key={subtab.id}
                onClick={() => setComptaSubTab(subtab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                  comptaSubTab === subtab.id
                    ? 'text-white'
                    : 'bg-surface-2 text-encre-2 hover:bg-bord'
                }`}
                style={comptaSubTab === subtab.id ? { background: couleur } : {}}
              >
                <subtab.icon size={16} />
                {subtab.label}
              </button>
            ))}
          </div>

          {/* Export Sub-tab */}
          {comptaSubTab === 'export' && (
            <div className="space-y-6">
              {/* Period Selector */}
              <div className={`${cardBg} rounded-xl border p-4`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
                  <Calendar size={18} style={{ color: couleur }} />
                  Période d'export
                </h3>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className={`block text-sm mb-1 ${textMuted}`}>Du</label>
                    <input
                      type="date"
                      value={exportPeriod.debut}
                      onChange={(e) => setExportPeriod(p => ({ ...p, debut: e.target.value }))}
                      className={`px-3 py-2 rounded-lg border ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${textMuted}`}>Au</label>
                    <input
                      type="date"
                      value={exportPeriod.fin}
                      onChange={(e) => setExportPeriod(p => ({ ...p, fin: e.target.value }))}
                      className={`px-3 py-2 rounded-lg border ${inputBg}`}
                    />
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* CSV Factures */}
                <div className={`${cardBg} rounded-xl border p-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-info-fond`}>
                      <FileSpreadsheet size={20} className={'text-info-texte'} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${textPrimary}`}>Factures (CSV)</h3>
                      <p className={`text-xs ${textMuted}`}>{factures.length} facture{factures.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className={`text-sm mb-4 ${textSecondary}`}>
                    Export compatible Excel, Google Sheets et logiciels comptables
                  </p>
                  <button
                    onClick={() => handleExportCSV('factures')}
                    className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white"
                    style={{ background: couleur }}
                  >
                    <Download size={16} />
                    Télécharger CSV
                  </button>
                </div>

                {/* CSV Depenses */}
                <div className={`${cardBg} rounded-xl border p-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-alerte-fond`}>
                      <FileSpreadsheet size={20} className={'text-alerte-texte'} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${textPrimary}`}>Dépenses (CSV)</h3>
                      <p className={`text-xs ${textMuted}`}>{depenses.length} dépense{depenses.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className={`text-sm mb-4 ${textSecondary}`}>
                    Export des achats et frais pour votre comptable
                  </p>
                  <button
                    onClick={() => handleExportCSV('depenses')}
                    className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white"
                    style={{ background: couleur }}
                  >
                    <Download size={16} />
                    Télécharger CSV
                  </button>
                </div>

                {/* FEC */}
                <div className={`${cardBg} rounded-xl border p-4 sm:col-span-2`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-succes-fond`}>
                      <FileText size={20} className={'text-succes-texte'} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${textPrimary}`}>Fichier FEC</h3>
                      <p className={`text-xs ${textMuted}`}>Fichier des Écritures Comptables</p>
                    </div>
                  </div>
                  <p className={`text-sm mb-4 ${textSecondary}`}>
                    Format obligatoire pour les contrôles fiscaux (article A.47 A-1 du LPF).
                    Compatible avec tous les logiciels comptables agréés.
                  </p>
                  <button
                    onClick={handleExportFEC}
                    className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                      isDark ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-600'
                    } text-white`}
                  >
                    <Download size={16} />
                    Générer FEC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TVA Sub-tab */}
          {comptaSubTab === 'tva' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className={`${cardBg} rounded-xl border p-4`}>
                  <p className={`text-sm ${textMuted} mb-1`}>TVA collectée</p>
                  <p className={`text-2xl font-bold text-emerald-500`}>
                    {tvaSummary.tvaCollectee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className={`text-xs ${textMuted} mt-1`}>{tvaSummary.nbFactures} facture{tvaSummary.nbFactures > 1 ? 's' : ''}</p>
                </div>

                <div className={`${cardBg} rounded-xl border p-4`}>
                  <p className={`text-sm ${textMuted} mb-1`}>TVA déductible</p>
                  <p className={`text-2xl font-bold text-blue-500`}>
                    {tvaSummary.tvaDeductible.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className={`text-xs ${textMuted} mt-1`}>{tvaSummary.nbDepenses} dépense{tvaSummary.nbDepenses > 1 ? 's' : ''}</p>
                </div>

                <div className={`${cardBg} rounded-xl border p-4 ${
                  tvaSummary.isCredit
                    ? (isDark ? 'border-blue-800' : 'border-blue-200')
                    : (isDark ? 'border-amber-800' : 'border-amber-200')
                }`}>
                  <p className={`text-sm ${textMuted} mb-1`}>
                    {tvaSummary.isCredit ? 'Crédit de TVA' : 'TVA à payer'}
                  </p>
                  <p className={`text-2xl font-bold ${tvaSummary.isCredit ? 'text-blue-500' : 'text-amber-500'}`}>
                    {Math.abs(tvaSummary.tvaNetteAPayer).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className={`text-xs ${textMuted} mt-1`}>
                    {tvaSummary.periode.debut} au {tvaSummary.periode.fin}
                  </p>
                </div>
              </div>

              {/* Detail par taux */}
              <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                <div className={`px-4 py-3 border-b border-bord bg-surface-2`}>
                  <h3 className={`font-semibold ${textPrimary}`}>Détail par taux de TVA</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" aria-label="Détail par taux de TVA">
                    <thead className={'bg-surface-2'}>
                      <tr>
                        <th scope="col" className={`text-left px-4 py-3 text-sm font-medium ${textMuted}`}>Taux</th>
                        <th scope="col" className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Base HT</th>
                        <th scope="col" className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Collectée</th>
                        <th scope="col" className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Déductible</th>
                        <th scope="col" className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Solde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tvaSummary.detailParTaux)
                        .filter(([, data]) => data.base > 0 || data.deductible > 0)
                        .map(([taux, data]) => {
                          const solde = data.collectee - data.deductible;
                          return (
                            <tr key={taux} className={`border-t border-bord`}>
                              <td className={`px-4 py-3 font-medium ${textPrimary}`}>{taux}%</td>
                              <td className={`text-right px-4 py-3 ${textSecondary}`}>
                                {data.base.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                              </td>
                              <td className={`text-right px-4 py-3 text-emerald-500`}>
                                {data.collectee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                              </td>
                              <td className={`text-right px-4 py-3 text-blue-500`}>
                                {data.deductible.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                              </td>
                              <td className={`text-right px-4 py-3 font-medium ${solde >= 0 ? 'text-amber-500' : 'text-blue-500'}`}>
                                {solde >= 0 ? '+' : ''}{solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info */}
              <div className={`rounded-xl p-4 ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Information</p>
                    <p className={`text-sm mt-1 text-info-texte`}>
                      Ce résumé TVA est indicatif et basé sur les données saisies dans Mallettico.
                      Pour votre déclaration officielle, consultez votre expert-comptable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAIEMENTS EN LIGNE */}
      {tab === 'paiements' && (
        <PaymentConfigTab
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
          user={user}
          modeDiscret={modeDiscret}
        />
      )}

      {/* Données Import/Export Tab — removed */}
      {tab === 'donnees' && (
        <div className="space-y-6">
          {/* Export Global */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className={`font-semibold mb-2 flex items-center gap-2 ${textPrimary}`}>
              <Download size={18} style={{ color: couleur }} />
              Export global des données
            </h3>
            <p className={`text-sm ${textMuted} mb-4`}>
              Exportez toutes vos données Mallettico dans un fichier JSON. Idéal pour les sauvegardes ou le transfert vers un autre appareil.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Devis/Factures', count: devis.length, color: couleur },
                { label: 'Clients', count: clients.length, color: '#3b82f6' },
                { label: 'Chantiers', count: chantiers.length, color: '#10b981' },
                { label: 'Dépenses', count: depenses.length, color: '#8b5cf6' },
              ].map((s, i) => (
                <div key={i} className={`p-3 rounded-xl text-center bg-surface-2`}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
                  <p className={`text-xs ${textMuted}`}>{s.label}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                try {
                  const exportData = {
                    version: '3.0',
                    exportDate: new Date().toISOString(),
                    app: 'Mallettico',
                    data: {
                      entreprise,
                      devis,
                      clients,
                      chantiers,
                      depenses,
                    },
                    localStorage: (() => {
                      // ⚠️ Le préfixe 'mallettico' est conservé volontairement : c'est celui des clés
                      // réellement écrites sur les appareils. Le renommer casserait l'effacement.
                      const keys = Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('mallettico'));
                      const obj = {};
                      keys.forEach(k => { try { obj[k] = JSON.parse(localStorage.getItem(k)); } catch { obj[k] = localStorage.getItem(k); } });
                      return obj;
                    })(),
                  };
                  const json = JSON.stringify(exportData, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  remettreFichier(blob, `mallettico_backup_${jourLocal()}.json`)
                    .then((r) => { if (r !== 'annule') showToast('Export global prêt', 'success'); })
                    .catch(() => showToast('Erreur lors de l\'export', 'error'));
                } catch (err) {
                  showToast('Erreur lors de l\'export', 'error');
                }
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg"
              style={{ background: couleur }}
            >
              <Download size={18} />
              Exporter toutes les données (.json)
            </button>
          </div>

          {/* Import Global */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className={`font-semibold mb-2 flex items-center gap-2 ${textPrimary}`}>
              <RefreshCw size={18} style={{ color: '#3b82f6' }} />
              Reprendre les informations de l'entreprise
            </h3>
            <p className={`text-sm ${textMuted} mb-4`}>
              Reprend l'identité, les mentions et les réglages de l'entreprise d'un export Mallettico (.json). Les devis, factures, clients et chantiers de l'export ne sont pas importés : gardez ce fichier, il fait office d'archive.
            </p>

            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-300 hover:border-slate-400'}`}>
              <input
                type="file"
                accept=".json"
                id="import-file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target.result);
                      if (!data.app || data.app !== 'Mallettico') {
                        showToast('Fichier non reconnu (pas un export Mallettico)', 'error');
                        return;
                      }
                      // Seules les informations de l'entreprise sont reprises, par l'enregistrement commun (un refus de la
                      // base se dit). Avant (recette du 9 oct. 2026) : « Import réussi » alors que ni devis, ni clients,
                      // ni chantiers n'étaient restaurés, et n'importe quelle clé du stockage local était réécrite.
                      if (!data.data?.entreprise || typeof data.data.entreprise !== 'object') {
                        showToast('Cet export ne contient pas d\'informations d\'entreprise.', 'error');
                        return;
                      }
                      // Liste fermée (ni statut de la fiche, ni identifiants) ; un fichier préparé par un tiers ne doit
                      // pas glisser son IBAN sans que l'artisan le voie
                      const source = data.data.entreprise;
                      const infos = Object.fromEntries(CHAMPS_IMPORTABLES.filter(k => source[k] !== undefined && source[k] !== null && typeof source[k] !== 'object').map(k => [k, source[k]]));
                      const sensibles = [['iban', 'IBAN'], ['bic', 'BIC'], ['siret', 'SIRET'], ['nom', 'nom de l\'entreprise']]
                        .filter(([k]) => infos[k] !== undefined && String(infos[k]).trim() !== String(entreprise[k] || '').trim());
                      (async () => {
                        if (sensibles.length) {
                          const ok = await confirm({
                            title: 'Remplacer ces informations ?',
                            message: sensibles.map(([k, l]) => `${l} : « ${String(entreprise[k] || '—')} » → « ${String(infos[k])} »`).join('\n') + '\n\nN\'importez que vos propres exports : ces informations s\'imprimeront sur vos devis et factures.',
                          });
                          if (!ok) return;
                        }
                        const ok = await updateEntreprise(prev => ({ ...prev, ...infos }));
                        if (ok) showToast(`Informations de l'entreprise reprises de l'export${data.exportDate ? ` du ${dateLue(data.exportDate).toLocaleDateString('fr-FR')}` : ''}.`, 'success');
                      })();
                    } catch {
                      showToast('Erreur de lecture du fichier', 'error');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <div className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center bg-surface-2`}>
                  <RefreshCw size={24} className={textMuted} />
                </div>
                <p className={`text-sm font-medium ${textPrimary}`}>Cliquez pour sélectionner un fichier</p>
                <p className={`text-xs ${textMuted} mt-1`}>Format .json (export Mallettico)</p>
              </label>
            </div>
          </div>

          {/* Onboarding Replay */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className={`font-semibold mb-2 flex items-center gap-2 ${textPrimary}`}>
              <GraduationCap size={18} /> Visite guidée
            </h3>
            <p className={`text-sm ${textMuted} mb-4`}>
              Rejouez le tutoriel d'introduction pour redécouvrir toutes les fonctionnalités de Mallettico.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('mallettico_onboarding_complete');
                localStorage.removeItem('mallettico_onboarding_skipped');
                showToast('Rechargez la page pour relancer la visite guidée', 'info');
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all hover:shadow-lg bg-surface-2 text-encre-2 hover:bg-bord`}
            >
              <RefreshCw size={18} />
              Relancer la visite guidée
            </button>
          </div>

          {/* Data Management */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className={`font-semibold mb-2 flex items-center gap-2 text-red-500`}>
              <AlertCircle size={18} />
              Gestion des données locales
            </h3>
            <p className={`text-sm ${textMuted} mb-4`}>
              Les données sont stockées localement dans votre navigateur. Pensez à exporter régulièrement.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('mallettico')).length > 0 && (
                <div className={`p-3 rounded-xl bg-surface-2`}>
                  <p className={`text-xs ${textMuted}`}>Clés stockées</p>
                  <p className="text-lg font-bold" style={{ color: couleur }}>
                    {Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('mallettico')).length}
                  </p>
                </div>
              )}
              <div className={`p-3 rounded-xl bg-surface-2`}>
                <p className={`text-xs ${textMuted}`}>Taille estimée</p>
                <p className="text-lg font-bold" style={{ color: couleur }}>
                  {(() => {
                    let total = 0;
                    Object.keys(localStorage).forEach(k => { total += (localStorage.getItem(k) || '').length; });
                    return total > 1024 * 1024 ? `${(total / (1024 * 1024)).toFixed(1)} Mo` : `${Math.round(total / 1024)} Ko`;
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* RGPD — Export données personnelles */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className={`font-semibold mb-2 flex items-center gap-2 ${textPrimary}`}>
              <Shield size={18} style={{ color: '#3b82f6' }} />
              Vos droits RGPD
            </h3>
            <p className={`text-sm ${textMuted} mb-4`}>
              Conformément au RGPD, vous pouvez exporter ou supprimer vos données personnelles à tout moment.
            </p>

            {/* Export RGPD */}
            <button
              onClick={exporterDonneesRGPD}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all hover:shadow-lg ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              <Download size={18} />
              Exporter toutes mes données
            </button>
          </div>

          {/* Danger Zone — Suppression de compte (RPC supprimer_mon_compte, migration 072) */}
          <SuppressionCompte isDark={isDark} showToast={showToast} onExporter={exporterDonneesRGPD} />
        </div>
      )}

      {/* Team Management Tab */}
      {tab === 'team' && (
        <TeamManagement isDark={isDark} couleur={entreprise.couleur || couleur} />
      )}

      {/* Multi-entreprise Tab */}
      {tab === 'multi' && (
        <EntrepriseSettingsPage
          isDark={isDark}
          couleur={entreprise.couleur || couleur}
          showToast={showToast}
        />
      )}

      {/* Administratif Tab */}
      {tab === 'administratif' && (
        <AdminHelp
          chantiers={chantiers}
          clients={clients}
          devis={devis}
          factures={devis.filter(d => d.type === 'facture')}
          depenses={depenses}
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {/* APERÇU DOCUMENT — only visible on identite tab */}
      {tab === 'identite' && <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <h3 className="font-semibold mb-4"> Aperçu en-tête document</h3>
        <div className={`border rounded-xl p-6 bg-surface-2`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              {entreprise.logo ? (
                <img src={entreprise.logo} className="h-16 object-contain" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : entreprise.nom ? (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: `${entreprise.couleur}20`, color: entreprise.couleur }}>
                  {entreprise.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{background: `${entreprise.couleur}20`}}><Building2 size={28} style={{ color: entreprise.couleur }} /></div>
              )}
              <div>
                <p className="font-bold text-lg">{entreprise.nom || 'Nom entreprise'}</p>
                {entreprise.slogan && <p className="text-xs text-slate-500 italic">{entreprise.slogan}</p>}
                {entreprise.formeJuridique && (
                  <p className="text-xs text-slate-500">{entreprise.formeJuridique}{entreprise.capital && ` · Capital: ${entreprise.capital} €`}</p>
                )}
                {entreprise.adresse ? (
                  <p className="text-sm text-slate-500 whitespace-pre-line mt-1">{entreprise.adresse}</p>
                ) : (
                  <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">⚠️ Adresse manquante — vos documents ne seront pas conformes</p>
                )}
              </div>
            </div>
            <p className="font-bold text-xl" style={{color: entreprise.couleur}}>DEVIS</p>
          </div>
          <div className="text-xs text-slate-500 space-y-0.5 border-t pt-3 mt-3">
            {entreprise.siret && <p>SIRET: {maskValue(entreprise.siret)} {entreprise.codeApe && `· APE: ${entreprise.codeApe}`}</p>}
            {getRCSComplet() && <p>{getRCSComplet()}</p>}
            {entreprise.tvaIntra && <p>TVA Intracommunautaire: {entreprise.tvaIntra}</p>}
            {entreprise.tel && <p>Tél: {entreprise.tel} {entreprise.email && `· ${entreprise.email}`}</p>}
            {/* Même règle que les documents : la décennale n'apparaît qu'avec l'assureur ET le n° de police */}
            {(entreprise.rcProAssureur || (entreprise.decennaleAssureur && entreprise.decennaleNumero)) && (
              <p className="pt-1 text-xs">
                {entreprise.rcProAssureur && `RC Pro: ${entreprise.rcProAssureur}${entreprise.rcProNumero ? ` N°${entreprise.rcProNumero}` : ''}`}
                {entreprise.rcProAssureur && entreprise.decennaleAssureur && entreprise.decennaleNumero && ' · '}
                {entreprise.decennaleAssureur && entreprise.decennaleNumero && `Décennale: ${entreprise.decennaleAssureur} N°${entreprise.decennaleNumero}${entreprise.decennaleValidite ? ` (Valide: ${dateLue(entreprise.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}`}
              </p>
            )}
          </div>
        </div>
      </div>}

      {/* ── Setup Wizard Modal (5 steps) ─────────────────────────── */}
      {showSetupWizard && (() => {
        const totalSteps = WIZARD_STEPS_DEF.length;
        const safeStep = Math.min(wizardStep, totalSteps - 1);
        const stepDef = WIZARD_STEPS_DEF[safeStep];
        const progress = ((safeStep + 1) / totalSteps) * 100;
        const StepIcon = stepDef.icon;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowSetupWizard(false)}>
            <div className={`bg-surface rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
              {/* Progress bar */}
              <div className="h-1.5 rounded-t-2xl overflow-hidden" style={{ background: isDark ? '#334155' : '#e2e8f0' }}>
                <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: couleur }} />
              </div>

              {/* Step dots */}
              <div className="flex items-center justify-center gap-3 px-5 pt-4 pb-1">
                {WIZARD_STEPS_DEF.map((s, i) => {
                  const SIcon = s.icon;
                  const isDone = i < safeStep;
                  const isCurrent = i === safeStep;
                  return (
                    <React.Fragment key={s.id}>
                      <button
                        onClick={() => i <= safeStep && setWizardStep(i)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isDone ? 'text-white' : isCurrent ? 'text-white shadow-lg scale-110' : 'bg-bord text-encre-3'
                        }`}
                        style={(isDone || isCurrent) ? { backgroundColor: couleur } : undefined}
                        title={s.title}
                      >
                        {isDone ? <Check size={14} /> : <SIcon size={14} />}
                      </button>
                      {i < totalSteps - 1 && (
                        <div className={`flex-1 h-0.5 rounded max-w-[40px] ${isDone ? '' : 'bg-bord'}`} style={isDone ? { backgroundColor: couleur } : undefined} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Header */}
              <div className="px-5 pb-2 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs font-medium text-encre-3`}>Étape {safeStep + 1}/{totalSteps}</p>
                  <button onClick={() => setShowSetupWizard(false)} className={`p-1.5 rounded-lg hover:bg-surface-2 text-encre-3`}>
                    <X size={16} />
                  </button>
                </div>
                <h3 className={`text-lg font-bold ${textPrimary}`}>{stepDef.title}</h3>
                <p className={`text-sm ${textMuted}`}>{stepDef.desc}</p>
              </div>

              {/* Step content */}
              <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">

                {/* Step 1: Identité */}
                {safeStep === 0 && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom de l’entreprise *</label>
                      <DebouncedInput type="text" value={entreprise.nom || ''} onChange={val => updateEntreprise(p => ({ ...p, nom: val }))}
                        placeholder="Ex : Martin Rénovation" className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Logo</label>
                      <div className="flex items-center gap-3">
                        {entreprise.logo ? (
                          <img src={entreprise.logo} alt="Logo" className="w-12 h-12 rounded-xl object-contain border" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white" style={{ backgroundColor: entreprise.couleur || couleur }}>
                            {(entreprise.nom || 'E').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <label className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors bg-surface-2 text-encre-2 hover:bg-bord`}>
                          {entreprise.logo ? 'Changer' : 'Uploader'} un logo
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Couleur principale</label>
                      <div className="flex gap-2 flex-wrap">
                        {COULEURS.map(c => (
                          <button key={c} onClick={() => updateEntreprise(p => ({ ...p, couleur: c }))}
                            className={`w-9 h-9 rounded-xl transition-all ${entreprise.couleur === c ? 'ring-2 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'}`}
                            style={{ backgroundColor: c, ringColor: c }} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Step 2: SIRET + SIRENE */}
                {safeStep === 1 && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>N° SIRET *</label>
                      <div className="flex gap-2">
                        <DebouncedInput type="text" value={entreprise.siret || ''} onChange={val => updateEntreprise(p => ({ ...p, siret: val }))}
                          placeholder="123 456 789 00012" className={`flex-1 px-4 py-2.5 border rounded-xl text-sm ${inputBg}`} />
                        <button
                          onClick={lookupSIRENE}
                          disabled={sireneLoading}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: couleur }}
                        >
                          {sireneLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                          Auto-remplir
                        </button>
                      </div>
                      <p className={`text-xs mt-1 ${textMuted}`}>Recherche automatique via l’API SIRENE</p>
                    </div>
                    <div>
                      <label htmlFor="assistant-forme" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Forme juridique</label>
                      <select id="assistant-forme" className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`} value={entreprise.formeJuridique || ''} onChange={e => updateEntreprise(p => ({ ...p, formeJuridique: e.target.value }))}>
                        <option value="">Sélectionner...</option>
                        {FORMES_JURIDIQUES.map(f => <option key={f.valeur} value={f.valeur}>{f.libelle}</option>)}
                      </select>
                    </div>
                    {(estEntrepreneurIndividuel(entreprise) || estEirl(entreprise)) && (
                      <div>
                        <label htmlFor="assistant-nom-entrepreneur" className={`block text-sm font-medium mb-1 ${textPrimary}`}>Votre prénom et nom</label>
                        <DebouncedInput id="assistant-nom-entrepreneur" type="text" value={entreprise.nomEntrepreneur || ''} onChange={val => updateEntreprise(p => ({ ...p, nomEntrepreneur: val }))}
                          placeholder="Ex : Hugo Séguin" className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`} />
                        <p className={`text-xs mt-1 ${textMuted}`}>Imprimé suivi de « {estEirl(entreprise) ? 'EIRL' : 'EI'} » sur vos documents.</p>
                      </div>
                    )}
                    {[
                      { key: 'codeApe', label: 'Code APE', placeholder: '4399C' },
                      { key: 'tvaIntra', label: 'N° TVA Intracommunautaire', placeholder: 'FR12345678901' },
                      { key: 'adresse', label: 'Adresse complète *', placeholder: '12 rue des Artisans, 75011 Paris' },
                      { key: 'tel', label: 'Téléphone *', placeholder: '06 12 34 56 78' },
                      { key: 'email', label: 'Email *', placeholder: 'contact@entreprise.fr' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>{f.label}</label>
                        <DebouncedInput type="text" value={entreprise[f.key] || ''} onChange={val => updateEntreprise(p => ({ ...p, [f.key]: val }))}
                          placeholder={f.placeholder} className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`} />
                      </div>
                    ))}
                  </>
                )}

                {/* Step 3: Documents */}
                {safeStep === 2 && (
                  <>
                    {/* Les mêmes réglages que l'onglet Documents (tvaDefaut, acompteDefaut). Avant (recette du 9 oct. 2026),
                        l'assistant écrivait tauxTva / acompte / mentionRGE / mentionDecennale, que rien ne lit. */}
                    <div>
                      <p className={`block text-sm font-medium mb-2 ${textPrimary}`}>Taux de TVA par défaut</p>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Taux de TVA par défaut">
                        {[20, 10, 5.5, 0].map(t => (
                          <button key={t} type="button" aria-pressed={(entreprise.tvaDefaut ?? 10) === t}
                            onClick={() => updateEntreprise(p => ({ ...p, tvaDefaut: t }))}
                            className={`min-h-[44px] px-4 rounded-xl border text-sm font-medium ${(entreprise.tvaDefaut ?? 10) === t ? 'bg-accent text-sur-accent border-transparent' : 'border-bord text-encre-2 hover:bg-surface-2'}`}>
                            {String(t).replace('.', ',')} %
                          </button>
                        ))}
                      </div>
                      <p className={`text-xs mt-1 ${textMuted}`}>Modifiable ligne par ligne sur chaque devis. En franchise de TVA (art. 293 B du CGI, sous les seuils) : aucune TVA n'est facturée.</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Acompte par défaut : <strong>{entreprise.acompteDefaut ?? 30} %</strong></label>
                      <input type="range" min="0" max="50" step="5"
                        value={entreprise.acompteDefaut ?? 30}
                        onChange={e => updateEntreprise(p => ({ ...p, acompteDefaut: parseInt(e.target.value, 10) }))}
                        className="w-full" style={{ accentColor: couleur }}
                      />
                      <div className={`flex justify-between text-xs ${textMuted}`}><span>0 %</span><span>30 %</span><span>50 %</span></div>
                    </div>
                    <p className={`text-xs ${textMuted}`}>Assurances, garanties légales, pénalités de retard et droit de rétractation s'impriment à partir de votre profil. À joindre vous-même pour l'instant : votre attestation d'assurance décennale.</p>
                  </>
                )}

                {/* Step 4: Relances */}
                {safeStep === 3 && (
                  <>
                    <div className={`p-4 rounded-xl border bg-surface-2 border-bord`}>
                      <p className={`text-sm font-semibold mb-2 ${textPrimary}`}>Scénario de relance type :</p>
                      <div className="space-y-2">
                        {[
                          { jour: 'J+7', type: 'Email', desc: 'Rappel de consultation' },
                          { jour: 'J+15', type: 'Email', desc: 'Relance douce' },
                          { jour: 'J+30', type: 'Email', desc: 'Dernière relance' },
                        ].map(r => (
                          <div key={r.jour} className={`flex items-center gap-3 text-sm ${textSecondary}`}>
                            <span className="font-mono font-bold w-10" style={{ color: couleur }}>{r.jour}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium bg-bord text-encre-2`}>{r.type}</span>
                            <span className={textPrimary}>{r.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* L'interrupteur réel des relances (relanceConfig.enabled) est dans l'onglet Relances, avec ses
                        étapes et ses textes. Avant (recette du 9 oct. 2026), celui de l'assistant écrivait
                        « relancesActives », que rien ne lit : les relances restaient désactivées. */}
                    <div className={`flex items-center justify-between gap-3 p-4 rounded-xl border border-bord`}>
                      <div>
                        <p className={`text-sm font-semibold ${textPrimary}`}>Relances automatiques : {relances.isEnabled ? 'activées' : 'désactivées'}</p>
                        <p className={`text-xs ${textMuted}`}>Réglez-les (étapes, textes, envoi) dans l'onglet Relances.</p>
                      </div>
                      <button type="button" onClick={() => { setShowSetupWizard(false); setTab('relances'); }}
                        className="min-h-[44px] px-3 rounded-xl border border-bord-fort text-sm font-medium text-encre hover:bg-surface-2 whitespace-nowrap">
                        Ouvrir les relances
                      </button>
                    </div>
                  </>
                )}

                {/* Step 5: Catalogue */}
                {safeStep === 4 && (
                  <>
                    <div className={`p-4 rounded-xl border text-center bg-surface-2 border-bord`}>
                      <Package size={40} className={`mx-auto mb-3 ${textSecondary}`} />
                      <p className={`text-sm font-semibold ${textPrimary}`}>Importez le Référentiel BTP</p>
                      <p className={`text-xs mt-1 ${textMuted}`}>Sélectionnez votre métier pour importer automatiquement les articles courants dans votre catalogue.</p>
                    </div>
                    <button
                      onClick={() => { setShowSetupWizard(false); setPage('catalogue'); }}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: couleur }}
                    >
                      <Package size={16} className="inline mr-2" />Ouvrir le Catalogue pour importer
                    </button>
                    <p className={`text-xs text-center ${textMuted}`}>Vous pourrez toujours le faire plus tard depuis le module Catalogue.</p>
                  </>
                )}
              </div>

              {/* Footer Navigation */}
              <div className={`p-5 pt-3 border-t flex items-center gap-3 border-bord`}>
                {safeStep > 0 && (
                  <button
                    onClick={() => setWizardStep(s => Math.max(0, s - 1))}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-2 text-encre-2`}
                  >
                    ← Précédent
                  </button>
                )}
                <div className="flex-1">
                  <p className={`text-xs text-center ${textMuted}`}>Profil {completude}%</p>
                </div>
                {safeStep < totalSteps - 1 ? (
                  <button
                    onClick={() => setWizardStep(s => s + 1)}
                    className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: couleur }}
                  >
                    Suivant →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowSetupWizard(false);
                      try { localStorage.setItem('cp_wizard_done', '1'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
                      showToast('Configuration terminée !', 'success');
                    }}
                    className="px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: '#22c55e' }}
                  >
                    <Check size={16} className="inline mr-1" /> Terminer
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Export Comptable */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-surface rounded-2xl p-6 w-full max-w-md`}>
            <h3 className={`font-bold text-lg mb-4 ${textPrimary}`}> Export pour comptable</h3>
            <p className={`${textMuted} mb-4`}>Exportez vos devis et factures au format Excel/CSV pour votre comptable.</p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Année à exporter</label>
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={exportYear} onChange={e => setExportYear(parseInt(e.target.value))}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className={`bg-surface-2 rounded-xl p-4 mb-6 text-sm`}>
              <p className="font-medium mb-2">Colonnes exportées:</p>
              <p className="text-slate-600">N° Document, Type, Date, Client, Total HT, TVA 5.5%, TVA 10%, TVA 20%, Total TTC, Statut</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)} className={`flex-1 px-4 py-2 rounded-xl bg-surface-2`}>Annuler</button>
              <button onClick={handleExportComptable} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl"> Télécharger CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
