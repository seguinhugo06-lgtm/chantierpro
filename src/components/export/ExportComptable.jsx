import { useState, useMemo } from 'react';
import { toast } from '../../stores/toastStore';
import {
  Download,
  FileText,
  Calendar,
  Table,
  CheckCircle,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  ArrowUpDown,
  Info,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { remettreFichier } from '../../lib/natif';
import { estEmise } from '../../lib/ventes';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { montantsDepense } from '../../lib/tvaDepenses';
import { ecrituresDepense } from '../../lib/ecrituresAchat';
import { ecrituresPaiement } from '../../lib/ecrituresBanque';
import { captureException } from '../../lib/sentry';
import Carte from '../ui/Carte';
import TuileChiffre from '../ui/TuileChiffre';
import Pastille from '../ui/Pastille';
import EtatVide from '../ui/EtatVide';
import { Bouton, BoutonIcone } from '../ui/Bouton';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
// Montant d'un fichier comptable : virgule décimale, SANS séparateur de milliers (l'espace fine insécable
// d'Intl, « 7 200,38 », rendait le FEC et les CSV illisibles par les logiciels — recette du 9 oct. 2026).
const fmtMontant = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',');

const pad = (n) => String(n).padStart(2, '0');

const fmtDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

const fmtDateISO = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const downloadFile = (content, filename, mimeType = 'text/csv') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  return remettreFichier(blob, filename);
};

// ─── Accounting mapping ─────────────────────────────────────────────────────

const mapFactureToEntries = (facture, client, allFactures = []) => {
  // Data model: date (ISO string), total_ht, total_ttc, tva
  const date = new Date(facture.date || facture.createdAt || facture.created_at);
  const ref = facture.numero || `F-${date.getFullYear()}-${String(facture.id).slice(0, 4)}`;
  const clientName = client
    ? `${client.prenom || ''} ${client.nom || ''}`.trim() || client.entreprise || 'Client inconnu'
    : 'Client inconnu';
  const totalTTC = facture.total_ttc || 0;
  const totalHT = facture.total_ht || 0;
  const totalTVA = facture.tva || (totalTTC - totalHT);

  // Acompte: use 419100 (Clients - Avances et acomptes reçus) instead of 411000
  const isAcompte = facture.facture_type === 'acompte';
  const isSolde = facture.facture_type === 'solde';
  const compteClient = isAcompte ? '419100' : '411000';
  const libellePrefix = isAcompte ? `Acompte ${ref}` : `Facture ${ref}`;

  const entries = [
    {
      date,
      ref,
      libelle: `${libellePrefix} - ${clientName}`,
      debit: totalTTC,
      credit: 0,
      compte: compteClient,
      journal: 'VE',
    },
    {
      date,
      ref,
      libelle: `${libellePrefix} - Prestations`,
      debit: 0,
      credit: totalHT,
      compte: '706000',
      journal: 'VE',
    },
    {
      date,
      ref,
      libelle: `${libellePrefix} - TVA collectée`,
      debit: 0,
      credit: totalTVA,
      compte: '445710',
      journal: 'VE',
    },
  ];

  // Solde: add regularization entry to transfer acompte from 419100 to 411000
  if (isSolde && facture.devis_source_id) {
    const acomptes = allFactures.filter(
      f => f.type === 'facture' && f.facture_type === 'acompte' && f.devis_source_id === facture.devis_source_id
    );
    const totalAcomptesTTC = acomptes.reduce((s, a) => s + (a.total_ttc || 0), 0);
    if (totalAcomptesTTC > 0) {
      entries.push({
        date,
        ref,
        libelle: `Régularisation acomptes - ${clientName}`,
        debit: totalAcomptesTTC,
        credit: 0,
        compte: '411000',
        journal: 'VE',
      });
      entries.push({
        date,
        ref,
        libelle: `Régularisation acomptes - ${clientName}`,
        debit: 0,
        credit: totalAcomptesTTC,
        compte: '419100',
        journal: 'VE',
      });
    }
  }

  // Un avoir a des montants négatifs : chaque écriture passe dans l'autre sens (le client est crédité, les
  // ventes et la TVA débitées). Avant : des montants négatifs au débit du client (recette du 9 oct. 2026).
  return entries.map((e) => {
    const debit = (e.debit < 0 ? 0 : e.debit) + (e.credit < 0 ? -e.credit : 0);
    const credit = (e.credit < 0 ? 0 : e.credit) + (e.debit < 0 ? -e.debit : 0);
    return { ...e, debit, credit };
  }).filter((e) => e.debit !== 0 || e.credit !== 0);
};

// ─── Period presets ──────────────────────────────────────────────────────────

const getPresetRange = (key) => {
  const now = new Date();
  switch (key) {
    case 'ce-mois':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'mois-dernier': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case 'ce-trimestre': {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
      return { from: qStart, to: qEnd };
    }
    case 'cette-annee':
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
};

const toInputDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

// ─── Format generators ──────────────────────────────────────────────────────

const generateCSV = (entries) => {
  const header = 'Date;Numéro;Libellé;Débit;Crédit;Compte;Journal';
  const rows = entries.map((e) =>
    [
      fmtDate(e.date),
      e.ref,
      `"${e.libelle}"`,
      fmtMontant(e.debit),
      fmtMontant(e.credit),
      e.compte,
      e.journal,
    ].join(';')
  );
  return [header, ...rows].join('\r\n');
};

const generateFEC = (entries, entreprise, dateCloture = new Date()) => {
  // SIREN : celui du profil, sinon les 9 premiers chiffres du SIRET (le profil n'a pas de champ SIREN)
  const siren = String(entreprise?.siren || '').replace(/\D/g, '').slice(0, 9)
    || String(entreprise?.siret || '').replace(/\D/g, '').slice(0, 9)
    || '000000000';
  const header = [
    'JournalCode',
    'JournalLib',
    'EcritureNum',
    'EcritureDate',
    'CompteNum',
    'CompteLib',
    'CompAuxNum',
    'CompAuxLib',
    'PieceRef',
    'PieceDate',
    'EcritureLib',
    'Debit',
    'Credit',
    'EcritureLet',
    'DateLet',
    'ValidDate',
    'Montantdevise',
    'Idevise',
  ].join('\t');

  const journalLabels = { VE: 'Journal des Ventes', AC: "Journal des Achats", BQ: 'Journal de Banque' };
  const compteLabels = {
    '411000': 'Clients',
    '706000': 'Prestations de services',
    '445710': 'TVA collectée',
    '445660': 'TVA déductible',
    '606000': 'Achats non stockés',
    '401000': 'Fournisseurs',
    '512000': 'Banque',
  };

  // Une écriture = une pièce d'un journal (toutes ses lignes partagent le numéro et s'équilibrent) ; avant, un
  // numéro par ligne : aucune écriture ne s'équilibrait.
  const numeros = new Map();
  const rows = entries.map((e) => {
    const cle = `${e.journal}|${e.ref}|${fmtDateISO(e.date)}`;
    if (!numeros.has(cle)) numeros.set(cle, String(numeros.size + 1).padStart(6, '0'));
    const ecritureNum = numeros.get(cle);
    return [
      e.journal,
      journalLabels[e.journal] || e.journal,
      ecritureNum,
      fmtDateISO(e.date),
      e.compte,
      compteLabels[e.compte] || e.compte,
      '',
      '',
      e.ref,
      fmtDateISO(e.date),
      e.libelle,
      fmtMontant(e.debit),
      fmtMontant(e.credit),
      '',
      '',
      fmtDateISO(e.date),
      '',
      'EUR',
    ].join('\t');
  });

  const filename = `${siren}FEC${fmtDateISO(dateCloture)}.txt`;
  return { content: [header, ...rows].join('\r\n'), filename };
};

const generateExcel = (entries) => {
  const BOM = '\uFEFF';
  const header = 'Date\tNuméro\tLibellé\tDébit\tCrédit\tCompte\tJournal';
  const rows = entries.map((e) =>
    [
      fmtDate(e.date),
      e.ref,
      e.libelle,
      fmtMontant(e.debit),
      fmtMontant(e.credit),
      e.compte,
      e.journal,
    ].join('\t')
  );
  return BOM + [header, ...rows].join('\r\n');
};

// ─── Presets list ────────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'ce-mois', label: 'Ce mois' },
  { key: 'mois-dernier', label: 'Mois dernier' },
  { key: 'ce-trimestre', label: 'Ce trimestre' },
  { key: 'cette-annee', label: 'Cette année' },
];

const FORMATS = [
  { key: 'csv', label: 'CSV', icon: FileText, desc: 'Séparateur point-virgule' },
  { key: 'fec', label: 'FEC', icon: FileSpreadsheet, desc: 'Fichier des Écritures Comptables', tooltip: 'Format officiel pour votre expert-comptable et la DGFiP' },
  { key: 'excel', label: 'Excel', icon: Table, desc: 'Compatible Excel (UTF-8 BOM)' },
];

const JOURNALS = [
  { key: 'all', label: 'Tous les journaux' },
  { key: 'VE', label: 'Ventes (VE)' },
  { key: 'AC', label: 'Achats (AC)' },
  { key: 'BQ', label: 'Banque (BQ)' },
  { key: 'OD', label: 'Opérations diverses (OD)' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExportComptable({
  devis = [],
  depenses = [],
  chantiers: _chantiers = [],
  clients = [],
  paiements = [],
  entreprise = {},
  // isDark et couleur restent acceptés : jetons du thème ; setPage aussi (plus de lien vers les Paramètres)
  isDark: _isDark = false,
  couleur: _couleur,
  setPage: _setPage,
}) {
  const defaultRange = getPresetRange('ce-mois');

  const [dateFrom, setDateFrom] = useState(toInputDate(defaultRange.from));
  const [dateTo, setDateTo] = useState(toInputDate(defaultRange.to));
  const [activePreset, setActivePreset] = useState('ce-mois');
  const [format, setFormat] = useState('csv');
  const [showPreview, setShowPreview] = useState(false);
  const [journalFilter, setJournalFilter] = useState('all');
  const [previewPage, setPreviewPage] = useState(0);
  const PREVIEW_PAGE_SIZE = 50;

  // ─── Styles ──────────────────────────────────────────────────────────────

  const inputCls = 'bg-surface border-bord-fort text-encre';
  const hoverRow = 'hover:bg-surface-2';
  const borderCls = 'border-bord';

  // ─── Filtered data ──────────────────────────────────────────────────────

  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);

  // Fingerprints to detect status changes even if array reference stays the same
  const devisFingerprint = devis.length + '|' + devis.reduce((s, d) => s + (d.statut || ''), '');
  const depensesFingerprint = depenses.length + '|' + depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const paiementsFingerprint = paiements.length + '|' + paiements.reduce((s, p) => s + (p.montant || 0), 0);

  const factures = useMemo(
    () =>
      devis.filter((d) => {
        // Factures et avoirs émis : un brouillon n'est pas une vente (il était exporté comme tel)
        if (!estEmise(d)) return false;
        // Use d.date (the document date) as primary, fallback to createdAt
        const dt = new Date(d.date || d.createdAt || d.created_at);
        return dt >= from && dt <= to;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devis, dateFrom, dateTo, devisFingerprint]
  );

  const filteredDepenses = useMemo(
    () =>
      depenses.filter((d) => {
        const dt = new Date(d.date);
        return dt >= from && dt <= to;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depenses, dateFrom, dateTo, depensesFingerprint]
  );

  const filteredPaiements = useMemo(
    () =>
      paiements.filter((p) => {
        const dt = new Date(p.date || p.createdAt);
        return dt >= from && dt <= to;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paiements, dateFrom, dateTo, paiementsFingerprint]
  );

  const clientsMap = useMemo(() => {
    const map = {};
    clients.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [clients]);

  const devisMap = useMemo(() => {
    const map = {};
    devis.forEach((d) => { map[d.id] = d; });
    return map;
  }, [devis]);

  // ─── Accounting entries ─────────────────────────────────────────────────

  const entries = useMemo(() => {
    const factureEntries = factures.flatMap((f) =>
      mapFactureToEntries(f, clientsMap[f.client_id], factures)
    );
    const depenseEntries = filteredDepenses.flatMap((d) => ecrituresDepense(d, { franchise: estFranchiseTva(entreprise) }));
    const paiementEntries = filteredPaiements.flatMap((p) => {
      const facture = devisMap[p.devis_id] || devisMap[p.facture_id];
      const client = facture ? clientsMap[facture.client_id] : null;
      return ecrituresPaiement(p, facture, client);
    });
    const all = [...factureEntries, ...depenseEntries, ...paiementEntries];
    all.sort((a, b) => a.date - b.date);
    return all;
  }, [factures, filteredDepenses, filteredPaiements, clientsMap, devisMap, entreprise]);

  // ─── Summaries ──────────────────────────────────────────────────────────

  const totalHTFactures = factures.reduce((s, f) => s + (f.total_ht || 0), 0);
  const franchise = estFranchiseTva(entreprise);
  const totalDepenses = filteredDepenses.reduce((s, d) => s + montantsDepense(d, { franchise }).ht, 0);
  const depensesSansTva = franchise ? 0 : filteredDepenses.filter((d) => !montantsDepense(d).connue).length;

  // ─── Preset handler ─────────────────────────────────────────────────────

  const applyPreset = (key) => {
    setActivePreset(key);
    const range = getPresetRange(key);
    setDateFrom(toInputDate(range.from));
    setDateTo(toInputDate(range.to));
  };

  // ─── Export handler ─────────────────────────────────────────────────────

  // Téléchargement : dit seulement quand le fichier est remis (avant : « Export téléchargé » s'affichait avant même la
  // fenêtre d'enregistrement, et après une annulation)
  const [exportEnCours, setExportEnCours] = useState(false);
  const handleExport = async () => {
    const exportEntries = filteredEntries;
    if (exportEntries.length === 0 || exportEnCours) return;
    setExportEnCours(true);
    try {
      const resultat = await ecrireExport(exportEntries);
      if (resultat !== 'annule') toast.success('Export téléchargé', getFilenamePreview());
    } catch (e) {
      captureException(e, { context: 'export comptable' });
      toast.error('Export non téléchargé', 'Le fichier n’a pas pu être créé. Réessayez.');
    } finally {
      setExportEnCours(false);
    }
  };
  const ecrireExport = (exportEntries) => {

    const monthStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}`;
    const journalSuffix = journalFilter !== 'all' ? `_${journalFilter}` : '';

    if (format === 'fec') {
      const { content, filename } = generateFEC(exportEntries, entreprise, to);
      return downloadFile(content, filename, 'text/plain');
    }
    if (format === 'excel') return downloadFile(generateExcel(exportEntries), `export_comptable_${monthStr}${journalSuffix}.csv`, 'text/csv');
    return downloadFile(generateCSV(exportEntries), `export_comptable_${monthStr}${journalSuffix}.csv`, 'text/csv');
  };

  // ─── Export filename preview ────────────────────────────────────────────

  const getFilenamePreview = () => {
    const monthStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}`;
    if (format === 'csv') return `export_comptable_${monthStr}.csv`;
    if (format === 'fec') {
      // Le même nom que le fichier produit (generateFEC) : SIREN, sinon les 9 premiers chiffres du SIRET ; date de fin
      const siren = String(entreprise?.siren || '').replace(/\D/g, '').slice(0, 9)
        || String(entreprise?.siret || '').replace(/\D/g, '').slice(0, 9)
        || '000000000';
      return `${siren}FEC${fmtDateISO(to)}.txt`;
    }
    return `export_comptable_${monthStr}.csv`;
  };

  // ─── Journal-filtered entries ──────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    if (journalFilter === 'all') return entries;
    return entries.filter((e) => e.journal === journalFilter);
  }, [entries, journalFilter]);

  const totalFilteredDebit = filteredEntries.reduce((s, e) => s + e.debit, 0);
  const totalFilteredCredit = filteredEntries.reduce((s, e) => s + e.credit, 0);

  const totalPreviewPages = Math.max(1, Math.ceil(filteredEntries.length / PREVIEW_PAGE_SIZE));
  const previewEntries = filteredEntries.slice(
    previewPage * PREVIEW_PAGE_SIZE,
    (previewPage + 1) * PREVIEW_PAGE_SIZE
  );

  // ─── Stat cards data ───────────────────────────────────────────────────

  const totalPaiements = filteredPaiements.reduce((s, p) => s + (Number(p.amount || p.montant) || 0), 0);

  const stats = [
    { label: 'Factures émises', value: factures.length },
    { label: 'Dépenses et achats', value: filteredDepenses.length },
    // Les corrections d'encaissement (montants négatifs, 098) ne sont pas des paiements reçus ; « Total encaissé » les déduit
    { label: 'Paiements reçus', value: filteredPaiements.filter((p) => (Number(p.amount ?? p.montant) || 0) > 0).length },
    { label: 'Total HT des factures', value: fmtEUR.format(totalHTFactures) },
    { label: 'Total encaissé', value: fmtEUR.format(totalPaiements) },
    { label: franchise ? 'Total des dépenses' : 'Total HT des dépenses', value: fmtEUR.format(totalDepenses) },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────
  // Jetons du thème (avant : la couleur brute de l'entreprise en style et des gris écrits à la main). Le titre de la page
  // est celui de Finances : l'onglet « Export comptable » ne le répète plus.
  const choisi = 'bg-encre text-surface border-encre';
  const libre = 'bg-surface text-encre-2 border-bord hover:bg-surface-2';

  return (
    <div className="space-y-6">
      <p className="text-sm text-encre-3">Vos écritures pour votre comptable ou votre logiciel de comptabilité.</p>

      {/* ── Période ────────────────────────────────────────────── */}
      <Carte>
        <h2 className="text-base font-semibold mb-4 text-encre flex items-center gap-2">
          <Calendar className="w-4 h-4 text-encre-3" aria-hidden="true" />
          Période
        </h2>
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Période">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={activePreset === p.key}
              onClick={() => applyPreset(p.key)}
              className={`h-11 px-4 rounded-full border text-sm font-medium transition-colors ${activePreset === p.key ? choisi : libre}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="export-du" className="text-sm text-encre-2">Du</label>
            <input
              id="export-du"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActivePreset(''); }}
              className={`h-11 border rounded-xl px-3 text-base sm:text-sm ${inputCls} focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20`}
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="export-au" className="text-sm text-encre-2">Au</label>
            <input
              id="export-au"
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActivePreset(''); }}
              className={`h-11 border rounded-xl px-3 text-base sm:text-sm ${inputCls} focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20`}
            />
          </div>
        </div>
      </Carte>

      {/* ── Chiffres de la période ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <TuileChiffre key={s.label} libelle={s.label} valeur={s.value} />
        ))}
      </div>

      {/* ── Format ────────────────────────────────────────────── */}
      <Carte>
        <h2 className="text-base font-semibold mb-4 text-encre flex items-center gap-2">
          <FileText className="w-4 h-4 text-encre-3" aria-hidden="true" />
          Format d’export
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Format d’export">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            const isActive = format === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setFormat(f.key)}
                title={f.tooltip || ''}
                className={`border rounded-xl p-4 text-left transition-colors bg-surface ${isActive ? 'border-accent ring-2 ring-accent' : 'border-bord hover:border-bord-fort'}`}
              >
                <span className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-accent/10 text-accent-texte' : 'bg-surface-2 text-encre-3'}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-encre">{f.label}</span>
                    <span className="block text-sm text-encre-3">{f.desc}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Dépenses sans TVA saisie : passées HT, sans TVA déductible */}
        {depensesSansTva > 0 && (
          <div role="status" className="mt-4 rounded-xl p-3 flex items-start gap-2 text-sm bg-alerte-fond text-alerte-texte">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {depensesSansTva === 1 ? '1 dépense de la période n’a pas sa TVA saisie : elle est exportée hors taxes, sans TVA déductible, avec la mention « TVA non saisie ».' : `${depensesSansTva} dépenses de la période n’ont pas leur TVA saisie : elles sont exportées hors taxes, sans TVA déductible, avec la mention « TVA non saisie ».`}
              {' '}Choisissez le taux de leur facture dans la fiche du chantier (onglet Finances), ou transmettez la facture à votre comptable.
            </span>
          </div>
        )}

        {format === 'fec' && (
          <div className="mt-4 rounded-xl p-3 flex items-start gap-2 text-sm bg-info-fond text-info-texte">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              Écritures au format FEC (art. A.47 A-1 du Livre des procédures fiscales), à importer dans la
              comptabilité tenue par votre comptable. Ce fichier ne remplace pas le FEC de votre exercice.
            </span>
          </div>
        )}
      </Carte>

      {/* ── Journal ────────────────────────────────────────────── */}
      <Carte>
        <h2 className="text-base font-semibold mb-4 text-encre flex items-center gap-2">
          <Filter className="w-4 h-4 text-encre-3" aria-hidden="true" />
          Filtre par journal
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Journal">
          {JOURNALS.map((j) => {
            const isActive = journalFilter === j.key;
            const count = j.key === 'all'
              ? entries.length
              : entries.filter((e) => e.journal === j.key).length;
            const isEmpty = count === 0 && j.key !== 'all';
            return (
              <button
                key={j.key}
                type="button"
                aria-pressed={isActive}
                disabled={isEmpty}
                onClick={() => { setJournalFilter(j.key); setPreviewPage(0); }}
                className={`h-11 flex items-center gap-2 px-4 rounded-full border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isActive && !isEmpty ? choisi : libre}`}
                title={isEmpty ? 'Aucune écriture pour ce journal' : ''}
              >
                {j.label}
                <span className="text-sm tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </Carte>

      {/* ── Aperçu ─────────────────────────────────────────────── */}
      <Carte marge="aucun">
        <button
          type="button"
          aria-expanded={showPreview}
          onClick={() => setShowPreview((v) => !v)}
          className="w-full min-h-[56px] flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left text-encre"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 flex-shrink-0 text-encre-3" aria-hidden="true" />
            <span className="text-sm font-semibold">
              Aperçu des écritures ({filteredEntries.length} ligne{filteredEntries.length > 1 ? 's' : ''}{journalFilter !== 'all' ? ` — ${JOURNALS.find(j => j.key === journalFilter)?.label}` : ''})
            </span>
          </span>
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform text-encre-3 ${showPreview ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {showPreview && (
          <div className="px-4 sm:px-5 pb-5">
            {filteredEntries.length === 0 ? (
              <EtatVide icone={FileText} titre="Aucune écriture" texte="Aucune écriture pour la période choisie." />
            ) : (
              <>
              <div className="overflow-x-auto rounded-xl border border-bord">
                <table className="w-full text-sm" aria-label="Écritures comptables">
                  <thead>
                    <tr className="bg-surface-2">
                      {['Date', 'Réf.', 'Libellé'].map((t) => <th key={t} scope="col" className="text-left px-3 py-2.5 font-semibold text-encre-2 text-sm">{t}</th>)}
                      <th scope="col" className="text-right px-3 py-2.5 font-semibold text-encre-2 text-sm">Débit</th>
                      <th scope="col" className="text-right px-3 py-2.5 font-semibold text-encre-2 text-sm">Crédit</th>
                      <th scope="col" className="text-left px-3 py-2.5 font-semibold text-encre-2 text-sm">Compte</th>
                      <th scope="col" className="text-left px-3 py-2.5 font-semibold text-encre-2 text-sm">Journal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEntries.map((e, i) => (
                      <tr key={i} className={`border-t ${borderCls} ${hoverRow} transition-colors`}>
                        <td className="px-3 py-2 text-encre-2 whitespace-nowrap">{fmtDate(e.date)}</td>
                        <td className="px-3 py-2 text-encre font-mono text-sm whitespace-nowrap">{e.ref}</td>
                        <td className="px-3 py-2 text-encre max-w-[220px] truncate">{e.libelle}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums text-encre">
                          {e.debit > 0 ? fmtEUR.format(e.debit) : <span className="text-encre-3">-</span>}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums text-encre">
                          {e.credit > 0 ? fmtEUR.format(e.credit) : <span className="text-encre-3">-</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-sm text-encre-2">{e.compte}</td>
                        <td className="px-3 py-2"><Pastille>{e.journal}</Pastille></td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-semibold border-bord-fort bg-surface-2">
                      <td className="px-3 py-2.5 text-encre" colSpan={3}>
                        Total ({filteredEntries.length} écriture{filteredEntries.length > 1 ? 's' : ''}{journalFilter !== 'all' ? ` — ${journalFilter}` : ''})
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums text-encre">{fmtEUR.format(totalFilteredDebit)}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums text-encre">{fmtEUR.format(totalFilteredCredit)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>

              {totalPreviewPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                  <span className="text-sm text-encre-3">
                    Page {previewPage + 1} sur {totalPreviewPages} · {filteredEntries.length} écritures
                  </span>
                  <div className="flex items-center gap-1">
                    <BoutonIcone icone={ChevronLeft} libelle="Page précédente" taille={18} disabled={previewPage === 0}
                      onClick={() => setPreviewPage((p) => Math.max(0, p - 1))} />
                    {Array.from({ length: Math.min(5, totalPreviewPages) }, (_, i) => {
                      let pageNum;
                      if (totalPreviewPages <= 5) pageNum = i;
                      else if (previewPage < 3) pageNum = i;
                      else if (previewPage > totalPreviewPages - 4) pageNum = totalPreviewPages - 5 + i;
                      else pageNum = previewPage - 2 + i;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          aria-current={previewPage === pageNum ? 'page' : undefined}
                          onClick={() => setPreviewPage(pageNum)}
                          className={`w-11 h-11 rounded-xl text-sm font-semibold tabular-nums transition-colors ${previewPage === pageNum ? 'bg-encre text-surface' : 'text-encre-2 hover:bg-surface-2'}`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                    <BoutonIcone icone={ChevronRight} libelle="Page suivante" taille={18} disabled={previewPage >= totalPreviewPages - 1}
                      onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages - 1, p + 1))} />
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        )}
      </Carte>

      {/* ── Télécharger ─────────────────────────────────────────────── */}
      <Carte>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-encre mb-1">Fichier de sortie</p>
            <p className="text-sm font-mono text-encre-2 px-2 py-1 rounded-lg bg-surface-2 break-all">{getFilenamePreview()}</p>
            <p className="text-sm mt-2 text-encre-3">
              {filteredEntries.length} écriture{filteredEntries.length > 1 ? 's' : ''} comptable{filteredEntries.length > 1 ? 's' : ''} {filteredEntries.length > 1 ? 'seront exportées' : 'sera exportée'}
              {journalFilter !== 'all' && ` (journal ${journalFilter})`}
            </p>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
            <Bouton variante="principal" icone={Download} chargement={exportEnCours} disabled={filteredEntries.length === 0} onClick={handleExport}>
              Télécharger l’export
            </Bouton>
            {/* « Envoyer à mon comptable » retiré : l'e-mail du comptable n'a pas de champ dans Paramètres, le bouton ne
                s'affichait jamais (relectures de la Task 8, 26 oct. 2026). */}
            {filteredEntries.length === 0 && (
              <p className="text-sm text-encre-3">Aucune écriture pour la période choisie</p>
            )}
          </div>
        </div>

        {filteredEntries.length > 0 && (
          <div className={`mt-4 pt-4 border-t ${borderCls}`}>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <ArrowUpDown className="w-4 h-4 text-encre-3" aria-hidden="true" />
              <span className="font-medium text-encre-2">
                Équilibre des écritures{journalFilter !== 'all' ? ` (${journalFilter})` : ''} :
              </span>
              {Math.abs(totalFilteredDebit - totalFilteredCredit) < 0.01 ? (
                <span className="font-semibold text-succes-texte flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  équilibré
                </span>
              ) : (
                <span className="font-semibold text-alerte-texte">
                  écart de {fmtEUR.format(Math.abs(totalFilteredDebit - totalFilteredCredit))}
                </span>
              )}
            </p>
          </div>
        )}
      </Carte>
    </div>
  );
}
