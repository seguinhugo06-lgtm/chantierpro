import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../context/AppContext';
import { Link2, Unlink, Download, FileSpreadsheet, FileText, RefreshCw, CheckCircle, AlertCircle, Calendar, ExternalLink, Calculator, CreditCard, Receipt, Building2, ArrowLeft, Trash2, Shield, Search, ChevronDown, ChevronRight, Zap, Palette, FileCheck, BellRing, Package, Check, X, Loader2 } from 'lucide-react';
import { auth } from '../supabaseClient';
import AdminHelp from './admin-help/AdminHelp';
import {
  INTEGRATION_TYPES,
  SYNC_STATUS,
  getIntegrations,
  saveIntegration,
  removeIntegration,
  exportInvoicesToCSV,
  exportExpensesToCSV,
  generateFEC,
  downloadFile,
  calculateTVASummary,
  syncToPennylane,
  syncToIndy
} from '../lib/integrations/accounting';

import Facture2026Tab from './settings/Facture2026Tab';
import RelanceConfigTab from './settings/RelanceConfigTab';
import MultiEntreprise from './settings/MultiEntreprise';

// ── Tab groups for mobile navigation ────────────────────────────────────────
const TAB_GROUPS = [
  { id: 'entreprise', label: '\u26a1 Mon entreprise', tabs: [
    { key: 'identite', label: '\ud83c\udfe2 Identit\u00e9' },
    { key: 'legal', label: '\ud83d\udccb L\u00e9gal' },
    { key: 'assurances', label: '\ud83d\udee1\ufe0f Assurances' },
    { key: 'banque', label: '\ud83c\udfe6 Banque' },
  ]},
  { id: 'documents', label: '\ud83d\udcc4 Documents', tabs: [
    { key: 'documents', label: '\ud83d\udcc4 Documents' },
    { key: 'facture2026', label: '\ud83e\uddfe Facture 2026' },
    { key: 'relances', label: '\ud83d\udce8 Relances' },
  ]},
  { id: 'finance', label: '\ud83d\udcb6 Finance', tabs: [
    { key: 'comptabilite', label: '\ud83e\uddee Comptabilit\u00e9' },
    { key: 'rentabilite', label: '\ud83d\udcca Rentabilit\u00e9' },
  ]},
  { id: 'avance', label: '\u2699\ufe0f Avanc\u00e9', tabs: [
    { key: 'donnees', label: '\ud83d\udcbe Donn\u00e9es' },
    { key: 'administratif', label: '\ud83d\udcc1 Administratif' },
    { key: 'multi', label: '\ud83c\udfd7\ufe0f Multi-entreprise' },
  ]},
];

// ── Wizard step definitions ─────────────────────────────────────────────────
const WIZARD_STEPS_DEF = [
  { id: 'identite', title: 'Identit\u00e9', desc: 'Votre entreprise en un coup d\u2019\u0153il', icon: Palette },
  { id: 'siret', title: 'Informations l\u00e9gales', desc: 'SIRET + auto-remplissage SIRENE', icon: Search },
  { id: 'documents', title: 'Documents', desc: 'TVA, acompte et mentions', icon: FileCheck },
  { id: 'relances', title: 'Relances', desc: '85% des relances auto sont pay\u00e9es dans 7 jours', icon: BellRing },
  { id: 'catalogue', title: 'Catalogue', desc: 'Importez le r\u00e9f\u00e9rentiel BTP', icon: Package },
];

// ── Frais de structure charge items ─────────────────────────────────────────
const FRAIS_ITEMS = [
  { key: 'loyer', label: 'Loyer / local', placeholder: '1500', icon: '\ud83c\udfe0' },
  { key: 'assurances', label: 'Assurances (RC + D\u00e9cennale)', placeholder: '800', icon: '\ud83d\udee1\ufe0f' },
  { key: 'telephone', label: 'T\u00e9l\u00e9phone / Internet', placeholder: '100', icon: '\ud83d\udcf1' },
  { key: 'comptable', label: 'Comptable / Expert', placeholder: '300', icon: '\ud83e\uddee' },
  { key: 'carburant', label: 'Carburant / D\u00e9placements', placeholder: '400', icon: '\u26fd' },
  { key: 'divers', label: 'Fournitures / Divers', placeholder: '200', icon: '\ud83d\udce6' },
];

// Villes RCS principales France
const VILLES_RCS = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Saint-Étienne', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Clermont-Ferrand', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt', 'Metz', 'Besançon', 'Orléans', 'Rouen', 'Mulhouse', 'Caen', 'Nancy', 'Saint-Denis', 'Argenteuil', 'Roubaix', 'Tourcoing', 'Montreuil', 'Avignon', 'Créteil', 'Poitiers', 'Fort-de-France', 'Versailles', 'Courbevoie', 'Vitry-sur-Seine', 'Colombes', 'Pau'];

export default function Settings({ entreprise, setEntreprise, user, devis = [], depenses = [], clients = [], chantiers = [], onExportComptable, isDark, couleur, setPage, modeDiscret }) {
  const { showToast } = useToast();

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

  // Persist wizard step
  useEffect(() => {
    if (showSetupWizard) {
      try { localStorage.setItem('cp_wizard_step', String(wizardStep)); } catch {}
    }
  }, [wizardStep, showSetupWizard]);

  // SIRENE API lookup
  const lookupSIRENE = useCallback(async () => {
    const siret = (entreprise.siret || '').replace(/\s/g, '');
    if (siret.length !== 14) {
      showToast('SIRET invalide (14 chiffres requis)', 'error');
      return;
    }
    setSireneLoading(true);
    try {
      // Use open data API (no key required)
      const resp = await fetch(`https://api.insee.fr/entreprises/sirene/V3.11/siret/${siret}`, {
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      // Fallback to open data API
      const resp2 = resp?.ok ? resp : await fetch(`https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${siret}`);
      if (!resp2?.ok) throw new Error('API indisponible');
      const data = await resp2.json();
      const etab = data.etablissement || data;
      const unite = etab.uniteLegale || etab.unite_legale || {};
      const adresse = etab.adresseEtablissement || etab.adresse || {};

      const nom = unite.denominationUniteLegale || unite.denomination || unite.nomUniteLegale || '';
      const prenom = unite.prenomUsuelUniteLegale || '';
      const fullNom = nom || (prenom ? `${prenom} ${unite.nomUniteLegale || ''}`.trim() : '');
      const codeNaf = etab.periodesEtablissement?.[0]?.activitePrincipaleEtablissement || unite.activitePrincipaleUniteLegale || '';
      const formeJur = unite.categorieJuridiqueUniteLegale || '';
      const adresseStr = [
        adresse.numeroVoieEtablissement,
        adresse.typeVoieEtablissement,
        adresse.libelleVoieEtablissement,
        adresse.codePostalEtablissement,
        adresse.libelleCommuneEtablissement,
      ].filter(Boolean).join(' ');

      updateEntreprise(prev => ({
        ...prev,
        ...(fullNom && !prev.nom ? { nom: fullNom } : {}),
        ...(adresseStr && !prev.adresse ? { adresse: adresseStr } : {}),
        ...(codeNaf ? { codeApe: codeNaf } : {}),
      }));

      showToast(`SIRENE : ${fullNom || 'Entreprise trouv\u00e9e'}`, 'success');
    } catch (err) {
      showToast('Impossible de r\u00e9cup\u00e9rer les donn\u00e9es SIRENE. V\u00e9rifiez le SIRET.', 'error');
    }
    setSireneLoading(false);
  }, [entreprise.siret, updateEntreprise, showToast]);

  // Frais de structure calculator
  const fraisTotal = useMemo(() => Object.values(fraisCharges).reduce((s, v) => s + (parseFloat(v) || 0), 0), [fraisCharges]);
  const caEstime = useMemo(() => {
    // rough estimate: sum of accepte/signe devis monthly avg
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recentCA = devis
      .filter(d => ['accepte', 'signe', 'payee', 'paye'].includes(d.statut) && new Date(d.date) >= sixMonthsAgo)
      .reduce((s, d) => s + (d.total_ht || 0), 0);
    return recentCA / 6 || 1;
  }, [devis]);
  const tauxSuggere = useMemo(() => caEstime > 0 ? Math.round((fraisTotal / caEstime) * 100) : 15, [fraisTotal, caEstime]);

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
  const [comptaSubTab, setComptaSubTab] = useState('integrations');
  const [integrations, setIntegrations] = useState(getIntegrations);
  const [connecting, setConnecting] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [exportPeriod, setExportPeriod] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      debut: firstDay.toISOString().split('T')[0],
      fin: now.toISOString().split('T')[0]
    };
  });

  // Debounced save notification with visible indicator
  const saveTimeoutRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved'
  const updateEntreprise = useCallback((updater) => {
    setEntreprise(updater);
    setSaveStatus('saving');
    // Debounce the toast to avoid spam
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
      showToast('Modifications enregistrées', 'success');
      // Reset indicator after 3s
      setTimeout(() => setSaveStatus(null), 3000);
    }, 800);
  }, [setEntreprise, showToast]);
  
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      showToast('Logo trop volumineux (500 Ko max)', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEntreprise(p => ({ ...p, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  // Helper to mask sensitive data in modeDiscret
  const maskValue = (value) => modeDiscret ? '····················' : value;
  
  const COULEURS = ['#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  // Calcul score complétude
  const PROFILE_FIELDS = [
    { key: 'nom', label: 'Nom de l\'entreprise', required: true, tab: 'identite' },
    { key: 'adresse', label: 'Adresse', required: true, tab: 'identite' },
    { key: 'siret', label: 'N° SIRET', required: true, tab: 'legal' },
    { key: 'tel', label: 'Téléphone', required: true, tab: 'identite' },
    { key: 'email', label: 'Email', required: true, tab: 'identite' },
    { key: 'formeJuridique', label: 'Forme juridique', required: false, tab: 'legal' },
    { key: 'codeApe', label: 'Code APE', required: false, tab: 'legal' },
    { key: 'rcsVille', label: 'Ville RCS', required: false, tab: 'legal' },
    { key: 'rcsNumero', label: 'N° RCS', required: false, tab: 'legal' },
    { key: 'tvaIntra', label: 'N° TVA Intracommunautaire', required: false, tab: 'legal' },
    { key: 'rcProAssureur', label: 'Assureur RC Pro', required: false, tab: 'assurances' },
    { key: 'rcProNumero', label: 'N° Police RC Pro', required: false, tab: 'assurances' },
    { key: 'decennaleAssureur', label: 'Assureur Décennale', required: false, tab: 'assurances' },
    { key: 'decennaleNumero', label: 'N° Police Décennale', required: false, tab: 'assurances' },
  ];
  const missingFields = PROFILE_FIELDS.filter(f => !entreprise[f.key] || String(entreprise[f.key]).trim() === '');
  const missingRequired = missingFields.filter(f => f.required);
  const missingRecommended = missingFields.filter(f => !f.required);
  const getCompletude = () => {
    const filled = PROFILE_FIELDS.filter(f => entreprise[f.key] && String(entreprise[f.key]).trim() !== '');
    return Math.round((filled.length / PROFILE_FIELDS.length) * 100);
  };
  const completude = getCompletude();

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

  // Comptabilite handlers
  const handleConnect = async (integrationId) => {
    setConnecting(integrationId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    saveIntegration(integrationId, {
      status: SYNC_STATUS.CONNECTED,
      connectedAt: new Date().toISOString(),
      lastSync: null
    });
    setIntegrations(getIntegrations());
    setConnecting(null);
    showToast(`${INTEGRATION_TYPES[integrationId.toUpperCase()]?.name || integrationId} connecté`, 'success');
  };

  const handleDisconnect = (integrationId) => {
    removeIntegration(integrationId);
    setIntegrations(getIntegrations());
    showToast(`${INTEGRATION_TYPES[integrationId.toUpperCase()]?.name || integrationId} déconnecté`, 'info');
  };

  const handleSync = async (integrationId) => {
    setSyncing(integrationId);
    try {
      if (integrationId === 'pennylane') {
        await syncToPennylane(factures, depenses, integrations[integrationId]?.apiKey);
      } else if (integrationId === 'indy') {
        await syncToIndy(factures, integrations[integrationId]?.apiKey);
      }
      saveIntegration(integrationId, {
        ...integrations[integrationId],
        lastSync: new Date().toISOString(),
        status: SYNC_STATUS.UP_TO_DATE
      });
      setIntegrations(getIntegrations());
      showToast('Synchronisation terminée', 'success');
    } catch (error) {
      showToast('Erreur de synchronisation', 'error');
    }
    setSyncing(null);
  };

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

  const getIntegrationIcon = (iconName) => {
    switch (iconName) {
      case 'receipt': return Receipt;
      case 'calculator': return Calculator;
      case 'credit-card': return CreditCard;
      case 'file-spreadsheet': return FileSpreadsheet;
      case 'file-text': return FileText;
      default: return Building2;
    }
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
        new Date(d.date).toLocaleDateString('fr-FR'),
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Export_Comptable_${exportYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
              className={`p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              aria-label="Retour au tableau de bord"
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Paramètres</h1>
          {/* Auto-save status indicator */}
          {saveStatus && (
            <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-fade-in ${
              saveStatus === 'saving'
                ? isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'
                : isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {saveStatus === 'saving' ? (
                <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Enregistrement...</>
              ) : (
                <><CheckCircle size={12} /> Enregistré</>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-2 transition-colors"
            title="Exporter vos devis et factures au format CSV pour votre comptable"
          >
            📊 Export comptable
          </button>
          <div className="relative">
            <button
              onClick={() => completude < 100 ? setShowProfileDetail(prev => !prev) : null}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm ${completude < 100 ? 'cursor-pointer hover:shadow-md hover:border-opacity-80' : ''}`}
              style={completude < 100 ? { borderColor: completude >= 80 ? '#22c55e' : completude >= 50 ? '#f59e0b' : '#ef4444' } : undefined}
              title={completude < 100 ? 'Cliquez pour voir les champs manquants' : 'Profil complet !'}
            >
              <div className="text-right">
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Profil complété</p>
                <p className="text-xl font-bold" style={{ color: completude >= 80 ? '#22c55e' : completude >= 50 ? '#f59e0b' : '#ef4444' }}>{completude}%</p>
              </div>
              <div className={`w-32 h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completude}%`, background: completude >= 80 ? '#22c55e' : completude >= 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
              {completude < 100 && <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>▼</span>}
            </button>

            {/* Dropdown showing missing fields */}
            {showProfileDetail && completude < 100 && (
              <div className={`absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-xl z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${textPrimary}`}>Champs manquants ({missingFields.length})</p>
                    <button onClick={() => setShowProfileDetail(false)} className={`p-1 rounded-lg text-xs ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>✕</button>
                  </div>

                  {missingRequired.length > 0 && (
                    <div>
                      <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Obligatoires
                      </p>
                      <div className="space-y-1">
                        {missingRequired.map(f => (
                          <button key={f.key} onClick={() => { setTab(f.tab); setShowProfileDetail(false); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <span>{f.label}</span>
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>→ {f.tab === 'identite' ? 'Identité' : f.tab === 'legal' ? 'Légal' : 'Assurances'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {missingRecommended.length > 0 && (
                    <div>
                      <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Recommandés
                      </p>
                      <div className="space-y-1">
                        {missingRecommended.map(f => (
                          <button key={f.key} onClick={() => { setTab(f.tab); setShowProfileDetail(false); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <span>{f.label}</span>
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>→ {f.tab === 'identite' ? 'Identité' : f.tab === 'legal' ? 'Légal' : 'Assurances'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => { setShowSetupWizard(true); setWizardStep(0); setShowProfileDetail(false); }}
                    className="w-full mt-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: couleur }}
                  >
                    🪄 Compléter avec l'assistant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertes assurances critiques */}
      {alertesAssurances.filter(a => a.severity === 'critical').map((alert, i) => (
        <div key={i} className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <span className="text-2xl"></span>
          <div className="flex-1">
            <p className="font-bold text-red-800">{alert.message}</p>
            <p className="text-sm text-red-600">Date d'expiration: {alert.date.toLocaleDateString('fr-FR')}</p>
          </div>
          <button onClick={() => setTab('assurances')} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm">Renouveler</button>
        </div>
      ))}

      {completude < 80 && (
        <div className={`rounded-xl p-4 flex items-center gap-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-xl">📝</span>
          <div className="flex-1">
            <p className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Complétez votre profil</p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Complétez vos informations pour générer des documents conformes. Progression : {completude}%</p>
          </div>
          <button
            onClick={() => { setShowSetupWizard(true); setWizardStep(0); }}
            className="px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
            style={{ background: couleur }}
          >
            🪄 Assistant de configuration
          </button>
        </div>
      )}

      {/* Tabs — Desktop: pills with separators, Mobile: accordion groups */}
      {/* Desktop tabs (hidden on mobile) */}
      <div className={`hidden sm:flex gap-2 border-b pb-2 flex-wrap overflow-x-auto ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {[
          ['identite', '\ud83c\udfe2 Identit\u00e9'],
          ['legal', '\ud83d\udccb L\u00e9gal'],
          ['assurances', `\ud83d\udee1\ufe0f Assurances${hasAssuranceAlerts ? ' \u26a0\ufe0f' : ''}`],
          ['banque', '\ud83c\udfe6 Banque'],
          ['_sep1', ''],
          ['documents', '\ud83d\udcc4 Documents'],
          ['facture2026', '\ud83e\uddfe Facture 2026'],
          ['relances', '\ud83d\udce8 Relances'],
          ['_sep2', ''],
          ['comptabilite', '\ud83e\uddee Comptabilit\u00e9'],
          ['rentabilite', '\ud83d\udcca Rentabilit\u00e9'],
          ['donnees', '\ud83d\udcbe Donn\u00e9es'],
          ['administratif', '\ud83d\udcc1 Administratif'],
          ['multi', '\ud83c\udfd7\ufe0f Multi-entreprise'],
        ].filter(([k]) => k).map(([k, v]) => (
          k.startsWith('_sep') ? <div key={k} className={`w-px h-6 self-center mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} /> :
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 rounded-t-xl font-medium whitespace-nowrap min-h-[44px] text-sm ${tab === k ? (isDark ? 'bg-slate-800 border border-b-slate-800 border-slate-700' : 'bg-white border border-b-white border-slate-200') + ' -mb-[3px]' : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')} ${k === 'assurances' && hasAssuranceAlerts ? 'text-red-500' : ''}`} style={tab === k ? {color: entreprise.couleur} : {}}>{v}</button>
        ))}
      </div>

      {/* Mobile tabs — grouped accordion (visible < 640px) */}
      <div className={`sm:hidden space-y-1 border rounded-xl overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {TAB_GROUPS.map(group => {
          const isOpen = mobileGroupOpen === group.id;
          const activeInGroup = group.tabs.some(t => t.key === tab);
          return (
            <div key={group.id}>
              <button
                onClick={() => setMobileGroupOpen(isOpen ? '' : group.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors ${
                  activeInGroup
                    ? isDark ? 'bg-slate-700/60 text-white' : 'bg-slate-50 text-slate-900'
                    : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{group.label}</span>
                <div className="flex items-center gap-2">
                  {activeInGroup && !isOpen && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${couleur}20`, color: couleur }}>
                      {group.tabs.find(t => t.key === tab)?.label}
                    </span>
                  )}
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>
              {isOpen && (
                <div className={`px-2 pb-2 flex flex-wrap gap-1.5 ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                  {group.tabs.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                        tab === t.key
                          ? 'text-white shadow-sm'
                          : isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-700/40' : 'text-slate-500 hover:text-slate-700 bg-slate-100'
                      } ${t.key === 'assurances' && hasAssuranceAlerts ? 'text-red-500' : ''}`}
                      style={tab === t.key ? { backgroundColor: couleur } : {}}
                    >
                      {t.label}
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
                  <div className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    {entreprise.logo ? (
                      <img src={entreprise.logo} className="w-full h-full object-contain" alt="Logo" />
                    ) : entreprise.nom ? (
                      <span className="text-2xl font-bold" style={{ color: entreprise.couleur || '#64748b' }}>
                        {entreprise.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-3xl text-slate-300">🏢</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block px-4 py-2 rounded-xl cursor-pointer text-white text-sm" style={{background: entreprise.couleur}}>
                       Choisir une image
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {entreprise.logo && (
                      <button onClick={() => updateEntreprise(p => ({...p, logo: ''}))} className="block text-sm text-red-500 hover:underline">
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Format: PNG, JPG. Taille max: 500KB</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Couleur principale</p>
                <div className="flex gap-2 flex-wrap">
                  {COULEURS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateEntreprise(p => ({...p, couleur: c}))}
                      className={`w-10 h-10 rounded-xl transition-all duration-200 hover:scale-110 flex items-center justify-center ${entreprise.couleur === c ? 'ring-2 ring-offset-2 scale-110 shadow-lg' : 'hover:shadow-md'}`}
                      style={{ background: c, ringColor: c }}
                      title={entreprise.couleur === c ? 'Couleur sélectionnée' : 'Sélectionner cette couleur'}
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
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Ex: Dupont Rénovation" value={entreprise.nom || ''} onChange={e => updateEntreprise(p => ({...p, nom: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Statut juridique <span className="text-red-500">*</span></label>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.formeJuridique || ''} onChange={e => updateEntreprise(p => ({...p, formeJuridique: e.target.value}))}>
                  <option value="">Sélectionner...</option>
                  <option value="EI">Entreprise Individuelle (EI)</option>
                  <option value="EIRL">EIRL</option>
                  <option value="Micro-entreprise">Micro-entreprise / Auto-entrepreneur</option>
                  <option value="EURL">EURL</option>
                  <option value="SARL">SARL</option>
                  <option value="SAS">SAS</option>
                  <option value="SASU">SASU</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Capital (optionnel)
                </label>
                <div className="flex">
                  <input type="number" className={`flex-1 px-4 py-2.5 border rounded-l-xl ${inputBg}`} placeholder="10000" value={entreprise.capital || ''} onChange={e => updateEntreprise(p => ({...p, capital: e.target.value}))} />
                  <span className={`px-4 py-2.5 border-y border-r rounded-r-xl ${isDark ? 'bg-slate-600 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>€</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Adresse siège social <span className="text-red-500">*</span></label>
                <textarea id="settings-field-adresse" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} rows={2} placeholder="12 rue des Artisans&#10;75001 Paris&#10;FRANCE" value={entreprise.adresse || ''} onChange={e => updateEntreprise(p => ({...p, adresse: e.target.value}))} />
                <p className="text-xs text-slate-500 mt-1">Inclure "FRANCE" pour les documents internationaux</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone <span className="text-red-500">*</span></label>
                <input type="tel" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="06 12 34 56 78" value={entreprise.tel || ''} onChange={e => updateEntreprise(p => ({...p, tel: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="contact@monentreprise.fr" value={entreprise.email || ''} onChange={e => updateEntreprise(p => ({...p, email: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site web</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="www.monentreprise.fr" value={entreprise.siteWeb || ''} onChange={e => updateEntreprise(p => ({...p, siteWeb: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slogan (optionnel)</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Votre artisan de confiance" value={entreprise.slogan || ''} onChange={e => updateEntreprise(p => ({...p, slogan: e.target.value}))} />
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
                <input id="settings-field-siret" className={`w-full px-4 py-2.5 border rounded-xl font-mono ${entreprise.siret && !validateSIRET(entreprise.siret) ? 'border-red-300 bg-red-50' : inputBg}`} placeholder="123 456 789 00012" maxLength={17} value={entreprise.siret || ''} onChange={e => updateEntreprise(p => ({...p, siret: e.target.value}))} />
                {entreprise.siret && !validateSIRET(entreprise.siret) && (
                  <p className="text-xs text-red-500 mt-1">Format invalide. Attendu: 14 chiffres</p>
                )}
                {entreprise.siret && validateSIRET(entreprise.siret) && (
                  <p className="text-xs text-green-600 mt-1">“ Format valide</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code APE/NAF</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="4339Z" maxLength={5} value={entreprise.codeApe || ''} onChange={e => updateEntreprise(p => ({...p, codeApe: e.target.value.toUpperCase()}))} />
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">RCS - Registre du Commerce</h3>
            <p className="text-sm text-slate-500 mb-4">Format légal: RCS [Ville] [Type] [Numéro]</p>
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
                <input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="123 456 789" maxLength={11} value={entreprise.rcsNumero || ''} onChange={e => updateEntreprise(p => ({...p, rcsNumero: e.target.value}))} />
              </div>
            </div>
            {getRCSComplet() && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl">
                <p className="text-sm text-green-700">“ Sera affiché: <strong>{getRCSComplet()}</strong></p>
              </div>
            )}
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">TVA Intracommunautaire</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Numéro TVA</label>
              <input id="settings-field-tvaIntra" className={`w-full px-4 py-2.5 border rounded-xl font-mono ${entreprise.tvaIntra && !validateTVA(entreprise.tvaIntra) ? 'border-amber-300 bg-amber-50' : inputBg}`} placeholder="FR 12 345678901" value={entreprise.tvaIntra || ''} onChange={e => updateEntreprise(p => ({...p, tvaIntra: e.target.value.toUpperCase()}))} />
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
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="E-12345" value={entreprise.rge || ''} onChange={e => updateEntreprise(p => ({...p, rge: e.target.value}))} />
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

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-medium text-amber-800">⚠️  Obligatoire pour les artisans du BTP</p>
            <p className="text-sm text-amber-700 mt-1">L'assurance RC Pro et la garantie décennale doivent figurer sur tous vos devis et factures (Article L243-1 du Code des assurances).</p>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold"> Assurance RC Professionnelle</h3>
              {entreprise.rcProAssureur && entreprise.rcProNumero && entreprise.rcProValidite && new Date(entreprise.rcProValidite) > new Date() && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">“ Valide</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Compagnie d'assurance <span className="text-red-500">*</span></label>
                <input id="settings-field-rcPro" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="AXA, MAAF, MMA..." value={entreprise.rcProAssureur || ''} onChange={e => updateEntreprise(p => ({...p, rcProAssureur: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de contrat <span className="text-red-500">*</span></label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="RC-123456789" value={entreprise.rcProNumero || ''} onChange={e => updateEntreprise(p => ({...p, rcProNumero: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de validité <span className="text-red-500">*</span></label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.rcProValidite || ''} onChange={e => updateEntreprise(p => ({...p, rcProValidite: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zone géographique</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="France entière" value={entreprise.rcProZone || 'France entière'} onChange={e => updateEntreprise(p => ({...p, rcProZone: e.target.value}))} />
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold"> Garantie Décennale</h3>
              {entreprise.decennaleAssureur && entreprise.decennaleNumero && entreprise.decennaleValidite && new Date(entreprise.decennaleValidite) > new Date() && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">“ Valide</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Compagnie d'assurance <span className="text-red-500">*</span></label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="SMABTP, AXA..." value={entreprise.decennaleAssureur || ''} onChange={e => updateEntreprise(p => ({...p, decennaleAssureur: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de contrat <span className="text-red-500">*</span></label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="DEC-987654321" value={entreprise.decennaleNumero || ''} onChange={e => updateEntreprise(p => ({...p, decennaleNumero: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de validité <span className="text-red-500">*</span></label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.decennaleValidite || ''} onChange={e => updateEntreprise(p => ({...p, decennaleValidite: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Activités couvertes</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Tous corps d'état" value={entreprise.decennaleActivites || ''} onChange={e => updateEntreprise(p => ({...p, decennaleActivites: e.target.value}))} />
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
              <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder="Crédit Agricole, BNP..." value={entreprise.banque || ''} onChange={e => updateEntreprise(p => ({...p, banque: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Titulaire du compte</label>
              <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} placeholder={entreprise.nom || 'Nom du titulaire'} value={entreprise.titulaireBanque || ''} onChange={e => updateEntreprise(p => ({...p, titulaireBanque: e.target.value}))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">IBAN</label>
              <input id="settings-field-iban" className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="FR76 1234 5678 9012 3456 7890 123" value={modeDiscret ? '···· ···· ···· ···· ···· ···· ···' : (entreprise.iban || '')} onChange={e => updateEntreprise(p => ({...p, iban: e.target.value.toUpperCase()}))} readOnly={modeDiscret} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">BIC/SWIFT</label>
              <input className={`w-full px-4 py-2.5 border rounded-xl font-mono ${inputBg}`} placeholder="AGRIFRPP" value={modeDiscret ? '········' : (entreprise.bic || '')} onChange={e => updateEntreprise(p => ({...p, bic: e.target.value.toUpperCase()}))} readOnly={modeDiscret} />
            </div>
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
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TVA par défaut</label>
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.tvaDefaut || 10} onChange={e => updateEntreprise(p => ({...p, tvaDefaut: parseFloat(e.target.value)}))}>
                  <option value={20}>20% (taux normal)</option>
                  <option value={10}>10% (rénovation &gt;2 ans)</option>
                  <option value={5.5}>5,5% (réno. énergétique)</option>
                  <option value={0}>0% (franchise TVA)</option>
                </select>
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
                <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.acompteDefaut || 30} onChange={e => updateEntreprise(p => ({...p, acompteDefaut: parseInt(e.target.value)}))}>
                  <option value={0}>Pas d'acompte</option>
                  <option value={20}>20%</option>
                  <option value={30}>30% (max légal si &gt;1500€)</option>
                  <option value={40}>40%</option>
                  <option value={50}>50%</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Mentions légales sur les documents</h3>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <div>
                  <p className="font-medium">Droit de rétractation (14 jours)</p>
                  <p className="text-sm text-slate-500">Article L221-18 du Code de la consommation</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={entreprise.mentionRetractation !== false} onChange={e => updateEntreprise(p => ({...p, mentionRetractation: e.target.checked}))} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
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

          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className="font-semibold mb-4">Conditions générales personnalisées</h3>
            <textarea className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} rows={4} placeholder="Ajoutez ici vos conditions générales personnalisées qui apparaîtront sur tous vos devis et factures..." value={entreprise.cgv || ''} onChange={e => updateEntreprise(p => ({...p, cgv: e.target.value}))} />
            <p className="text-xs text-slate-500 mt-2">Ce texte sera ajouté après les mentions légales obligatoires.</p>
          </div>
        </div>
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
          updateEntreprise={updateEntreprise}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {/* RENTABILITÉ */}
      {tab === 'rentabilite' && (
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
          <h3 className={`font-semibold mb-4 ${textPrimary}`}>{'\ud83d\udcca'} Calcul de Rentabilit{'\u00e9'}</h3>
          <div className="space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Taux de frais de structure (%)</label>
                <input type="number" min="0" max="50" className={`w-32 px-4 py-2.5 border rounded-xl ${inputBg}`} value={entreprise.tauxFraisStructure || 15} onChange={e => updateEntreprise(p => ({...p, tauxFraisStructure: parseFloat(e.target.value) || 15}))} />
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
                <p className={`text-sm font-semibold ${textPrimary}`}>{'\ud83e\uddee'} Calculez votre taux r{'\u00e9'}el</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FRAIS_ITEMS.map(item => (
                    <div key={item.key}>
                      <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>{item.icon} {item.label}</label>
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
                    <p className={`text-xs ${textSecondary}`}>Taux sugg{'\u00e9'}r{'\u00e9'}</p>
                    <p className="text-xl font-bold" style={{ color: couleur }}>{tauxSuggere}%</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    updateEntreprise(p => ({ ...p, tauxFraisStructure: tauxSuggere }));
                    setShowFraisCalc(false);
                    showToast(`Taux mis \u00e0 jour : ${tauxSuggere}%`, 'success');
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: couleur }}
                >
                  Appliquer {tauxSuggere}% comme taux de frais de structure
                </button>
              </div>
            )}

            <div className={`${isDark ? 'bg-slate-700' : 'bg-slate-50'} rounded-xl p-4 font-mono text-sm ${textPrimary}`}>
              <p><strong>Marge R{'\u00e9'}elle</strong> = CA HT + Ajustements Revenus</p>
              <p className="ml-4">- Mat{'\u00e9'}riaux (achats)</p>
              <p className="ml-4">- Main d{'\u2019'}{'\u0153'}uvre (heures {'\u00d7'} co{'\u00fb'}t charg{'\u00e9'})</p>
              <p className="ml-4">- Frais structure ({entreprise.tauxFraisStructure || 15}% du CA)</p>
              <p className="ml-4">- Ajustements D{'\u00e9'}penses</p>
            </div>
            <div className={`rounded-xl p-4 text-sm ${isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <p><strong>Code couleur marge:</strong></p>
              <p className="flex items-center gap-2 mt-1"><span className="w-3 h-3 rounded bg-red-500"></span> Rouge: Marge n{'\u00e9'}gative ({'<'}0%)</p>
              <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500"></span> Orange: Marge faible (0-15%)</p>
              <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span> Vert: Marge saine ({'>'}15%)</p>
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
              { id: 'integrations', label: 'Intégrations', icon: Link2 },
              { id: 'export', label: 'Export', icon: Download },
              { id: 'tva', label: 'Résumé TVA', icon: Calculator }
            ].map(subtab => (
              <button
                key={subtab.id}
                onClick={() => setComptaSubTab(subtab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                  comptaSubTab === subtab.id
                    ? 'text-white'
                    : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={comptaSubTab === subtab.id ? { background: couleur } : {}}
              >
                <subtab.icon size={16} />
                {subtab.label}
              </button>
            ))}
          </div>

          {/* Integrations Sub-tab */}
          {comptaSubTab === 'integrations' && (
            <div className="space-y-4">
              <p className={`text-sm ${textSecondary} mb-4`}>
                Connectez vos outils comptables pour synchroniser automatiquement vos factures et dépenses.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {Object.values(INTEGRATION_TYPES).filter(i => i.apiSupported).map(integration => {
                  const isConnected = integrations[integration.id]?.status === SYNC_STATUS.CONNECTED ||
                                     integrations[integration.id]?.status === SYNC_STATUS.UP_TO_DATE;
                  const Icon = getIntegrationIcon(integration.icon);
                  const isSyncing = syncing === integration.id;
                  const isConnecting = connecting === integration.id;

                  return (
                    <div
                      key={integration.id}
                      className={`${cardBg} rounded-xl border p-4 transition-all hover:shadow-lg ${
                        isConnected ? (isDark ? 'border-emerald-800' : 'border-emerald-200') : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: `${integration.color}20` }}
                          >
                            <Icon size={20} style={{ color: integration.color }} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${textPrimary}`}>{integration.name}</h3>
                            <p className={`text-xs ${textMuted}`}>{integration.description}</p>
                          </div>
                        </div>
                        {isConnected && (
                          <CheckCircle size={20} className="text-emerald-500" />
                        )}
                      </div>

                      {isConnected ? (
                        <div className="space-y-3">
                          <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                            <span>Dernière sync:</span>
                            <span>{integrations[integration.id]?.lastSync
                              ? new Date(integrations[integration.id].lastSync).toLocaleDateString('fr-FR')
                              : 'Jamais'
                            }</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSync(integration.id)}
                              disabled={isSyncing}
                              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white disabled:opacity-50"
                              style={{ background: couleur }}
                            >
                              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                              {isSyncing ? 'Sync...' : 'Synchroniser'}
                            </button>
                            <button
                              onClick={() => handleDisconnect(integration.id)}
                              className={`py-2 px-3 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              <Unlink size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnect(integration.id)}
                          disabled={isConnecting}
                          className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                            isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          } disabled:opacity-50`}
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              Connexion...
                            </>
                          ) : (
                            <>
                              <Link2 size={14} />
                              Connecter
                            </>
                          )}
                        </button>
                      )}

                      <a
                        href={integration.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 text-xs mt-3 ${textMuted} hover:underline`}
                      >
                        <ExternalLink size={12} />
                        {integration.website.replace('https://', '')}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <FileSpreadsheet size={20} className="text-blue-600 dark:text-blue-400" />
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
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <FileSpreadsheet size={20} className="text-amber-600 dark:text-amber-400" />
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
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <FileText size={20} className="text-emerald-600 dark:text-emerald-400" />
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
                <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-700/50' : 'border-slate-200 bg-slate-50'}`}>
                  <h3 className={`font-semibold ${textPrimary}`}>Détail par taux de TVA</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" aria-label="Détail par taux de TVA">
                    <thead className={isDark ? 'bg-slate-700/30' : 'bg-slate-50'}>
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
                            <tr key={taux} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
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
                    <p className={`text-sm mt-1 ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                      Ce résumé TVA est indicatif et basé sur les données saisies dans ChantierPro.
                      Pour votre déclaration officielle, consultez votre expert-comptable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
              Exportez toutes vos données ChantierPro dans un fichier JSON. Idéal pour les sauvegardes ou le transfert vers un autre appareil.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Devis/Factures', count: devis.length, color: couleur },
                { label: 'Clients', count: clients.length, color: '#3b82f6' },
                { label: 'Chantiers', count: chantiers.length, color: '#10b981' },
                { label: 'Dépenses', count: depenses.length, color: '#8b5cf6' },
              ].map((s, i) => (
                <div key={i} className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
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
                    app: 'ChantierPro',
                    data: {
                      entreprise,
                      devis,
                      clients,
                      chantiers,
                      depenses,
                    },
                    localStorage: (() => {
                      const keys = Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('chantierpro'));
                      const obj = {};
                      keys.forEach(k => { try { obj[k] = JSON.parse(localStorage.getItem(k)); } catch { obj[k] = localStorage.getItem(k); } });
                      return obj;
                    })(),
                  };
                  const json = JSON.stringify(exportData, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `chantierpro_backup_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                  showToast('Export global téléchargé', 'success');
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
              Import de données
            </h3>
            <p className={`text-sm ${textMuted} mb-4`}>
              Restaurez vos données depuis un fichier d'export ChantierPro (.json). Les données existantes seront fusionnées.
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
                      if (!data.app || data.app !== 'ChantierPro') {
                        showToast('Fichier non reconnu (pas un export ChantierPro)', 'error');
                        return;
                      }
                      // Restore localStorage keys
                      if (data.localStorage) {
                        Object.entries(data.localStorage).forEach(([k, v]) => {
                          try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch {}
                        });
                      }
                      // Restore entreprise
                      if (data.data?.entreprise) {
                        setEntreprise(prev => ({ ...prev, ...data.data.entreprise }));
                      }
                      showToast(`Import réussi — ${data.exportDate ? new Date(data.exportDate).toLocaleDateString('fr-FR') : 'date inconnue'}. Rechargez la page pour voir tous les changements.`, 'success');
                    } catch {
                      showToast('Erreur de lecture du fichier', 'error');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <div className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <RefreshCw size={24} className={textMuted} />
                </div>
                <p className={`text-sm font-medium ${textPrimary}`}>Cliquez pour sélectionner un fichier</p>
                <p className={`text-xs ${textMuted} mt-1`}>Format .json (export ChantierPro)</p>
              </label>
            </div>
          </div>

          {/* Onboarding Replay */}
          <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            <h3 className={`font-semibold mb-2 flex items-center gap-2 ${textPrimary}`}>
              🎓 Visite guidée
            </h3>
            <p className={`text-sm ${textMuted} mb-4`}>
              Rejouez le tutoriel d'introduction pour redécouvrir toutes les fonctionnalités de ChantierPro.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('chantierpro_onboarding_complete');
                localStorage.removeItem('chantierpro_onboarding_skipped');
                showToast('Rechargez la page pour relancer la visite guidée', 'info');
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all hover:shadow-lg ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
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
              {Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('chantierpro')).length > 0 && (
                <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${textMuted}`}>Clés stockées</p>
                  <p className="text-lg font-bold" style={{ color: couleur }}>
                    {Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('chantierpro')).length}
                  </p>
                </div>
              )}
              <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
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
              onClick={() => {
                try {
                  const rgpdData = {
                    export_type: 'RGPD - Droit d\'accès (Art. 15)',
                    date: new Date().toISOString(),
                    utilisateur: {
                      email: user?.email || 'Mode démo',
                      id: user?.id || 'demo',
                      date_inscription: user?.created_at || null,
                    },
                    entreprise: {
                      nom: entreprise.nom,
                      adresse: entreprise.adresse,
                      siret: entreprise.siret,
                      email: entreprise.email,
                      telephone: entreprise.tel,
                    },
                    donnees: {
                      clients: clients.map(c => ({ nom: c.nom, prenom: c.prenom, email: c.email, telephone: c.telephone, adresse: c.adresse })),
                      nombre_devis: devis.filter(d => d.type === 'devis').length,
                      nombre_factures: devis.filter(d => d.type === 'facture').length,
                      nombre_chantiers: chantiers.length,
                      nombre_depenses: depenses.length,
                    },
                    consentements: (() => {
                      try {
                        const c = localStorage.getItem('cp_cookie_consent');
                        return c ? JSON.parse(c) : { info: 'Aucun consentement enregistré' };
                      } catch { return {}; }
                    })(),
                  };
                  const json = JSON.stringify(rgpdData, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `chantierpro_rgpd_export_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                  showToast('Export RGPD téléchargé', 'success');
                } catch {
                  showToast('Erreur lors de l\'export RGPD', 'error');
                }
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all hover:shadow-lg ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              <Download size={18} />
              Exporter mes données personnelles
            </button>
          </div>

          {/* Danger Zone — Suppression de compte */}
          <div className={`rounded-xl sm:rounded-2xl border-2 border-red-300 p-4 sm:p-6 ${isDark ? 'bg-red-950/20' : 'bg-red-50'}`}>
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-500">
              <Trash2 size={18} />
              Zone de danger
            </h3>
            <p className={`text-sm ${textMuted} mb-2`}>
              <strong>Supprimer mon compte et mes données.</strong> Cette action est irréversible. Toutes vos données (devis, factures, clients, chantiers) seront définitivement supprimées.
            </p>
            <p className={`text-xs ${textMuted} mb-4`}>
              Nous vous recommandons d'exporter vos données avant de procéder.
            </p>
            <button
              onClick={async () => {
                const confirmation = prompt('Tapez "SUPPRIMER" pour confirmer la suppression définitive de votre compte et de toutes vos données :');
                if (confirmation !== 'SUPPRIMER') {
                  if (confirmation !== null) showToast('Suppression annulée — texte incorrect', 'info');
                  return;
                }
                try {
                  // Clear all localStorage
                  const keys = Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('chantierpro'));
                  keys.forEach(k => localStorage.removeItem(k));
                  // Sign out
                  await auth.signOut();
                  showToast('Compte et données supprimés', 'success');
                  window.location.reload();
                } catch {
                  showToast('Erreur lors de la suppression', 'error');
                }
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-all"
            >
              <Trash2 size={18} />
              Supprimer mon compte
            </button>
          </div>
        </div>
      )}

      {/* Multi-entreprise Tab */}
      {tab === 'multi' && (
        <MultiEntreprise
          entreprise={entreprise}
          setEntreprise={setEntreprise}
          isDark={isDark}
          couleur={entreprise.couleur || couleur}
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

      {/* APERÇU DOCUMENT */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <h3 className="font-semibold mb-4"> Aperçu en-tête document</h3>
        <div className={`border rounded-xl p-6 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              {entreprise.logo ? (
                <img src={entreprise.logo} className="h-16 object-contain" alt="Logo" />
              ) : entreprise.nom ? (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: `${entreprise.couleur}20`, color: entreprise.couleur }}>
                  {entreprise.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{background: `${entreprise.couleur}20`}}>🏢</div>
              )}
              <div>
                <p className="font-bold text-lg">{entreprise.nom || 'Nom entreprise'}</p>
                {entreprise.slogan && <p className="text-xs text-slate-500 italic">{entreprise.slogan}</p>}
                {entreprise.formeJuridique && (
                  <p className="text-xs text-slate-500">{entreprise.formeJuridique}{entreprise.capital && ` · Capital: ${entreprise.capital} €`}</p>
                )}
                <p className="text-sm text-slate-500 whitespace-pre-line mt-1">{entreprise.adresse || 'Adresse non renseignée'}</p>
              </div>
            </div>
            <p className="font-bold text-xl" style={{color: entreprise.couleur}}>DEVIS</p>
          </div>
          <div className="text-xs text-slate-500 space-y-0.5 border-t pt-3 mt-3">
            {entreprise.siret && <p>SIRET: {maskValue(entreprise.siret)} {entreprise.codeApe && `· APE: ${entreprise.codeApe}`}</p>}
            {getRCSComplet() && <p>{getRCSComplet()}</p>}
            {entreprise.tvaIntra && <p>TVA Intracommunautaire: {entreprise.tvaIntra}</p>}
            {entreprise.tel && <p>Tél: {entreprise.tel} {entreprise.email && `· ${entreprise.email}`}</p>}
            {(entreprise.rcProAssureur || entreprise.decennaleAssureur) && (
              <p className="pt-1 text-[10px]">
                {entreprise.rcProAssureur && `RC Pro: ${entreprise.rcProAssureur} N°${entreprise.rcProNumero}`}
                {entreprise.rcProAssureur && entreprise.decennaleAssureur && ' · '}
                {entreprise.decennaleAssureur && `Décennale: ${entreprise.decennaleAssureur} N°${entreprise.decennaleNumero}${entreprise.decennaleValidite ? ` (Valide: ${new Date(entreprise.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Setup Wizard Modal (5 steps) ─────────────────────────── */}
      {showSetupWizard && (() => {
        const totalSteps = WIZARD_STEPS_DEF.length;
        const safeStep = Math.min(wizardStep, totalSteps - 1);
        const stepDef = WIZARD_STEPS_DEF[safeStep];
        const progress = ((safeStep + 1) / totalSteps) * 100;
        const StepIcon = stepDef.icon;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowSetupWizard(false)}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
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
                          isDone ? 'text-white' : isCurrent ? 'text-white shadow-lg scale-110' : isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
                        }`}
                        style={(isDone || isCurrent) ? { backgroundColor: couleur } : undefined}
                        title={s.title}
                      >
                        {isDone ? <Check size={14} /> : <SIcon size={14} />}
                      </button>
                      {i < totalSteps - 1 && (
                        <div className={`flex-1 h-0.5 rounded max-w-[40px] ${isDone ? '' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`} style={isDone ? { backgroundColor: couleur } : undefined} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Header */}
              <div className="px-5 pb-2 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{'\u00c9'}tape {safeStep + 1}/{totalSteps}</p>
                  <button onClick={() => setShowSetupWizard(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
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
                      <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom de l{'\u2019'}entreprise *</label>
                      <input type="text" value={entreprise.nom || ''} onChange={e => updateEntreprise(p => ({ ...p, nom: e.target.value }))}
                        placeholder="Ex : Martin R\u00e9novation" className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Logo</label>
                      <div className="flex items-center gap-3">
                        {entreprise.logo ? (
                          <img src={entreprise.logo} alt="Logo" className="w-12 h-12 rounded-xl object-contain border" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white" style={{ backgroundColor: entreprise.couleur || couleur }}>
                            {(entreprise.nom || 'E').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <label className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
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
                      <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>N{'\u00b0'} SIRET *</label>
                      <div className="flex gap-2">
                        <input type="text" value={entreprise.siret || ''} onChange={e => updateEntreprise(p => ({ ...p, siret: e.target.value }))}
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
                      <p className={`text-xs mt-1 ${textMuted}`}>Recherche automatique via l{'\u2019'}API SIRENE</p>
                    </div>
                    {[
                      { key: 'formeJuridique', label: 'Forme juridique', placeholder: 'SARL, SAS, EI, Auto-entrepreneur...' },
                      { key: 'codeApe', label: 'Code APE', placeholder: '4399C' },
                      { key: 'tvaIntra', label: 'N\u00b0 TVA Intracommunautaire', placeholder: 'FR12345678901' },
                      { key: 'adresse', label: 'Adresse compl\u00e8te *', placeholder: '12 rue des Artisans, 75011 Paris' },
                      { key: 'tel', label: 'T\u00e9l\u00e9phone *', placeholder: '06 12 34 56 78' },
                      { key: 'email', label: 'Email *', placeholder: 'contact@entreprise.fr' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>{f.label}</label>
                        <input type="text" value={entreprise[f.key] || ''} onChange={e => updateEntreprise(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder} className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`} />
                      </div>
                    ))}
                  </>
                )}

                {/* Step 3: Documents */}
                {safeStep === 2 && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Taux de TVA par d{'\u00e9'}faut : <strong>{entreprise.tauxTva || 10}%</strong></label>
                      <input type="range" min="0" max="20" step="0.5"
                        value={entreprise.tauxTva || 10}
                        onChange={e => updateEntreprise(p => ({ ...p, tauxTva: parseFloat(e.target.value) }))}
                        className="w-full accent-current" style={{ accentColor: couleur }}
                      />
                      <div className={`flex justify-between text-xs ${textMuted}`}><span>0%</span><span>5.5%</span><span>10%</span><span>20%</span></div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Acompte par d{'\u00e9'}faut : <strong>{entreprise.acompte || 30}%</strong></label>
                      <input type="range" min="0" max="50" step="5"
                        value={entreprise.acompte || 30}
                        onChange={e => updateEntreprise(p => ({ ...p, acompte: parseInt(e.target.value) }))}
                        className="w-full" style={{ accentColor: couleur }}
                      />
                      <div className={`flex justify-between text-xs ${textMuted}`}><span>0%</span><span>30%</span><span>50%</span></div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { key: 'mentionRGE', label: 'Mention RGE sur les documents' },
                        { key: 'mentionDecennale', label: 'Mentions assurance d\u00e9cennale' },
                      ].map(toggle => (
                        <label key={toggle.key} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <span className={`text-sm font-medium ${textPrimary}`}>{toggle.label}</span>
                          <div className={`relative w-11 h-6 rounded-full transition-colors ${entreprise[toggle.key] ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
                            style={entreprise[toggle.key] ? { backgroundColor: couleur } : undefined}
                            onClick={(e) => { e.preventDefault(); updateEntreprise(p => ({ ...p, [toggle.key]: !p[toggle.key] })); }}>
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${entreprise[toggle.key] ? 'translate-x-5' : ''}`} />
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {/* Step 4: Relances */}
                {safeStep === 3 && (
                  <>
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-emerald-900/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'}`}>
                      <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>85%</p>
                      <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>des relances automatiques sont pay{'\u00e9'}es dans les 7 jours</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <p className={`text-sm font-semibold mb-2 ${textPrimary}`}>Sc{'\u00e9'}nario de relance type :</p>
                      <div className="space-y-2">
                        {[
                          { jour: 'J+7', type: 'Email', desc: 'Rappel de consultation' },
                          { jour: 'J+15', type: 'Email + SMS', desc: 'Relance douce' },
                          { jour: 'J+30', type: 'Email', desc: 'Derni\u00e8re relance' },
                        ].map(r => (
                          <div key={r.jour} className={`flex items-center gap-3 text-sm ${textSecondary}`}>
                            <span className="font-mono font-bold w-10" style={{ color: couleur }}>{r.jour}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{r.type}</span>
                            <span className={textPrimary}>{r.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      entreprise.relancesActives
                        ? isDark ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-300 bg-emerald-50'
                        : isDark ? 'border-slate-600' : 'border-slate-200'
                    }`}>
                      <div>
                        <p className={`text-sm font-semibold ${textPrimary}`}>Activer les relances automatiques</p>
                        <p className={`text-xs ${textMuted}`}>(recommand{'\u00e9'})</p>
                      </div>
                      <div className={`relative w-11 h-6 rounded-full transition-colors ${entreprise.relancesActives ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
                        style={entreprise.relancesActives ? { backgroundColor: '#22c55e' } : undefined}
                        onClick={(e) => { e.preventDefault(); updateEntreprise(p => ({ ...p, relancesActives: !p.relancesActives })); }}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${entreprise.relancesActives ? 'translate-x-5' : ''}`} />
                      </div>
                    </label>
                  </>
                )}

                {/* Step 5: Catalogue */}
                {safeStep === 4 && (
                  <>
                    <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <Package size={40} className={`mx-auto mb-3 ${textSecondary}`} />
                      <p className={`text-sm font-semibold ${textPrimary}`}>Importez le R{'\u00e9'}f{'\u00e9'}rentiel BTP</p>
                      <p className={`text-xs mt-1 ${textMuted}`}>S{'\u00e9'}lectionnez votre m{'\u00e9'}tier pour importer automatiquement les articles courants dans votre catalogue.</p>
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
              <div className={`p-5 pt-3 border-t flex items-center gap-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                {safeStep > 0 && (
                  <button
                    onClick={() => setWizardStep(s => Math.max(0, s - 1))}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {'\u2190'} Pr{'\u00e9'}c{'\u00e9'}dent
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
                    Suivant {'\u2192'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowSetupWizard(false);
                      try { localStorage.setItem('cp_wizard_done', '1'); } catch {}
                      showToast('Configuration termin\u00e9e !', 'success');
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
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-md`}>
            <h3 className={`font-bold text-lg mb-4 ${textPrimary}`}> Export pour comptable</h3>
            <p className={`${textMuted} mb-4`}>Exportez vos devis et factures au format Excel/CSV pour votre comptable.</p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Année à exporter</label>
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={exportYear} onChange={e => setExportYear(parseInt(e.target.value))}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className={`${isDark ? 'bg-slate-700' : 'bg-slate-50'} rounded-xl p-4 mb-6 text-sm`}>
              <p className="font-medium mb-2">Colonnes exportées:</p>
              <p className="text-slate-600">N° Document, Type, Date, Client, Total HT, TVA 5.5%, TVA 10%, TVA 20%, Total TTC, Statut</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)} className={`flex-1 px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
              <button onClick={handleExportComptable} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl"> Télécharger CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
