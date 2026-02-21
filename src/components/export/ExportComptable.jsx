import React, { useState, useMemo } from 'react';
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
  Receipt,
  ShoppingCart,
  Euro,
  Info,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const fmtNum = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// ─── Accounting mapping ─────────────────────────────────────────────────────

const mapFactureToEntries = (facture, client) => {
  const date = new Date(facture.date_creation || facture.created_at);
  const ref = facture.numero || `F-${date.getFullYear()}-${String(facture.id).slice(0, 4)}`;
  const clientName = client?.nom || client?.entreprise || 'Client inconnu';
  return [
    {
      date,
      ref,
      libelle: `Facture ${ref} - ${clientName}`,
      debit: facture.montant_ttc || 0,
      credit: 0,
      compte: '411000',
      journal: 'VE',
    },
    {
      date,
      ref,
      libelle: `Facture ${ref} - Prestations`,
      debit: 0,
      credit: facture.montant_ht || 0,
      compte: '706000',
      journal: 'VE',
    },
    {
      date,
      ref,
      libelle: `Facture ${ref} - TVA collectée`,
      debit: 0,
      credit: (facture.montant_ttc || 0) - (facture.montant_ht || 0),
      compte: '445710',
      journal: 'VE',
    },
  ];
};

const mapDepenseToEntries = (depense) => {
  const date = new Date(depense.date);
  const ref = depense.reference || `D-${date.getFullYear()}-${String(depense.id).slice(0, 4)}`;
  const montant = depense.montant || 0;
  const tvaRate = depense.tva_rate != null ? depense.tva_rate / 100 : 0.2;
  const montantHT = Math.round((montant / (1 + tvaRate)) * 100) / 100;
  const montantTVA = Math.round((montant - montantHT) * 100) / 100;

  const entries = [
    {
      date,
      ref,
      libelle: `${depense.categorie || 'Charge'} - ${depense.description || depense.fournisseur || ''}`,
      debit: montantHT,
      credit: 0,
      compte: '606000',
      journal: 'AC',
    },
  ];

  // Add TVA déductible entry if applicable
  if (montantTVA > 0) {
    entries.push({
      date,
      ref,
      libelle: `TVA déductible - ${depense.fournisseur || depense.categorie || 'Achat'}`,
      debit: montantTVA,
      credit: 0,
      compte: '445660',
      journal: 'AC',
    });
  }

  entries.push({
    date,
    ref,
    libelle: `${depense.fournisseur || 'Fournisseur'}`,
    debit: 0,
    credit: montant,
    compte: '401000',
    journal: 'AC',
  });

  return entries;
};

/** Map a paiement (bank transaction) to Journal Banque entries */
const mapPaiementToEntries = (paiement, facture, client) => {
  const date = new Date(paiement.date || paiement.createdAt);
  const ref = paiement.reference || `P-${date.getFullYear()}-${String(paiement.id).slice(0, 4)}`;
  const montant = Number(paiement.amount || paiement.montant) || 0;
  if (montant <= 0) return [];

  const clientName = client?.nom || client?.entreprise || 'Client';
  const factureNum = facture?.numero || '';

  return [
    {
      date,
      ref,
      libelle: `Encaissement ${factureNum ? `fact. ${factureNum}` : ''} - ${clientName}`.trim(),
      debit: montant,
      credit: 0,
      compte: '512000',
      journal: 'BQ',
    },
    {
      date,
      ref,
      libelle: `Règlement client ${clientName}`,
      debit: 0,
      credit: montant,
      compte: '411000',
      journal: 'BQ',
    },
  ];
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
      fmtNum.format(e.debit),
      fmtNum.format(e.credit),
      e.compte,
      e.journal,
    ].join(';')
  );
  return [header, ...rows].join('\r\n');
};

const generateFEC = (entries, entreprise) => {
  const siren = entreprise?.siren || '000000000';
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

  const rows = entries.map((e, i) => {
    const ecritureNum = String(i + 1).padStart(6, '0');
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
      fmtNum.format(e.debit),
      fmtNum.format(e.credit),
      '',
      '',
      fmtDateISO(e.date),
      '',
      'EUR',
    ].join('\t');
  });

  const filename = `${siren}FEC${fmtDateISO(new Date())}.txt`;
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
      fmtNum.format(e.debit),
      fmtNum.format(e.credit),
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
  { key: 'all', label: 'Tous les journaux', color: '#64748b' },
  { key: 'VE', label: 'Ventes (VE)', color: '#f97316' },
  { key: 'AC', label: 'Achats (AC)', color: '#8b5cf6' },
  { key: 'BQ', label: 'Banque (BQ)', color: '#3b82f6' },
  { key: 'OD', label: 'Opérations diverses (OD)', color: '#10b981' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExportComptable({
  devis = [],
  depenses = [],
  chantiers = [],
  clients = [],
  paiements = [],
  entreprise = {},
  isDark = false,
  couleur = '#f97316',
}) {
  const now = new Date();
  const defaultRange = getPresetRange('ce-mois');

  const [dateFrom, setDateFrom] = useState(toInputDate(defaultRange.from));
  const [dateTo, setDateTo] = useState(toInputDate(defaultRange.to));
  const [activePreset, setActivePreset] = useState('ce-mois');
  const [format, setFormat] = useState('csv');
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [journalFilter, setJournalFilter] = useState('all');
  const [previewPage, setPreviewPage] = useState(0);
  const PREVIEW_PAGE_SIZE = 50;

  // ─── Styles ──────────────────────────────────────────────────────────────

  const cardCls = isDark
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200';

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900';

  const textCls = isDark ? 'text-slate-100' : 'text-slate-900';
  const mutedCls = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPage = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const hoverRow = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';
  const borderCls = isDark ? 'border-slate-700' : 'border-slate-200';

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
        if (d.type !== 'facture') return false;
        const dt = new Date(d.date_creation || d.created_at);
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
      mapFactureToEntries(f, clientsMap[f.client_id])
    );
    const depenseEntries = filteredDepenses.flatMap((d) => mapDepenseToEntries(d));
    const paiementEntries = filteredPaiements.flatMap((p) => {
      const facture = devisMap[p.devis_id] || devisMap[p.facture_id];
      const client = facture ? clientsMap[facture.client_id] : null;
      return mapPaiementToEntries(p, facture, client);
    });
    const all = [...factureEntries, ...depenseEntries, ...paiementEntries];
    all.sort((a, b) => a.date - b.date);
    return all;
  }, [factures, filteredDepenses, filteredPaiements, clientsMap, devisMap]);

  // ─── Summaries ──────────────────────────────────────────────────────────

  const totalHTFactures = factures.reduce((s, f) => s + (f.montant_ht || 0), 0);
  const totalTTCFactures = factures.reduce((s, f) => s + (f.montant_ttc || 0), 0);
  const totalDepenses = filteredDepenses.reduce((s, d) => s + (d.montant || 0), 0);
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  // ─── Preset handler ─────────────────────────────────────────────────────

  const applyPreset = (key) => {
    setActivePreset(key);
    const range = getPresetRange(key);
    setDateFrom(toInputDate(range.from));
    setDateTo(toInputDate(range.to));
    setPresetsOpen(false);
  };

  // ─── Export handler ─────────────────────────────────────────────────────

  const handleExport = () => {
    const exportEntries = filteredEntries;
    if (exportEntries.length === 0) return;

    const monthStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}`;
    const journalSuffix = journalFilter !== 'all' ? `_${journalFilter}` : '';

    if (format === 'csv') {
      const csv = generateCSV(exportEntries);
      downloadFile(csv, `export_comptable_${monthStr}${journalSuffix}.csv`, 'text/csv');
    } else if (format === 'fec') {
      const { content, filename } = generateFEC(exportEntries, entreprise);
      downloadFile(content, filename, 'text/plain');
    } else if (format === 'excel') {
      const excel = generateExcel(exportEntries);
      downloadFile(excel, `export_comptable_${monthStr}${journalSuffix}.csv`, 'text/csv');
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // ─── Export filename preview ────────────────────────────────────────────

  const getFilenamePreview = () => {
    const monthStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}`;
    if (format === 'csv') return `export_comptable_${monthStr}.csv`;
    if (format === 'fec') {
      const siren = entreprise?.siren || '000000000';
      return `${siren}FEC${fmtDateISO(new Date())}.txt`;
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
    {
      label: 'Factures émises',
      value: factures.length,
      icon: Receipt,
      color: couleur,
    },
    {
      label: 'Dépenses / achats',
      value: filteredDepenses.length,
      icon: ShoppingCart,
      color: isDark ? '#94a3b8' : '#64748b',
    },
    {
      label: 'Paiements reçus',
      value: filteredPaiements.length,
      icon: Euro,
      color: couleur,
    },
    {
      label: 'Total HT factures',
      value: fmtEUR.format(totalHTFactures),
      icon: Euro,
      color: couleur,
    },
    {
      label: 'Total encaissé',
      value: fmtEUR.format(totalPaiements),
      icon: Euro,
      color: couleur,
    },
    {
      label: 'Total dépenses',
      value: fmtEUR.format(totalDepenses),
      icon: Euro,
      color: isDark ? '#94a3b8' : '#64748b',
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen ${bgPage} p-4 sm:p-6 lg:p-8`}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${couleur}20` }}
            >
              <Download className="w-5 h-5" style={{ color: couleur }} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${textCls}`}>Export Comptable</h1>
              <p className={`text-sm ${mutedCls}`}>
                Générez vos exports pour votre logiciel de comptabilité
              </p>
            </div>
          </div>
        </div>

        {/* ── Period selector ────────────────────────────────────────────── */}
        <div className={`border rounded-xl p-5 ${cardCls}`}>
          <h2 className={`text-sm font-semibold mb-4 ${textCls} flex items-center gap-2`}>
            <Calendar className="w-4 h-4" style={{ color: couleur }} />
            Période
          </h2>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activePreset === p.key
                    ? 'text-white shadow-sm'
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={activePreset === p.key ? { backgroundColor: couleur } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className={`text-sm ${mutedCls}`}>Du</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setActivePreset('');
                }}
                className={`border rounded-lg px-3 py-2 text-sm ${inputCls} focus:outline-none focus:ring-2`}
                style={{ focusRingColor: couleur }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${mutedCls}`}>Au</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setActivePreset('');
                }}
                className={`border rounded-lg px-3 py-2 text-sm ${inputCls} focus:outline-none focus:ring-2`}
                style={{ focusRingColor: couleur }}
              />
            </div>
          </div>
        </div>

        {/* ── Summary cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className={`border rounded-xl p-4 ${cardCls}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                  <span className={`text-xs font-medium ${mutedCls}`}>{s.label}</span>
                </div>
                <p className={`text-lg font-bold ${textCls}`}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* ── Format selector ────────────────────────────────────────────── */}
        <div className={`border rounded-xl p-5 ${cardCls}`}>
          <h2 className={`text-sm font-semibold mb-4 ${textCls} flex items-center gap-2`}>
            <FileText className="w-4 h-4" style={{ color: couleur }} />
            Format d'export
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FORMATS.map((f) => {
              const Icon = f.icon;
              const isActive = format === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  title={f.tooltip || ''}
                  className={`border rounded-xl p-4 text-left transition-all ${
                    isActive
                      ? 'ring-2 shadow-sm'
                      : isDark
                        ? 'border-slate-600 hover:border-slate-500'
                        : 'border-slate-200 hover:border-slate-300'
                  } ${cardCls}`}
                  style={
                    isActive
                      ? { borderColor: couleur, ringColor: couleur, boxShadow: `0 0 0 2px ${couleur}40` }
                      : {}
                  }
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: isActive ? `${couleur}20` : isDark ? '#334155' : '#f1f5f9',
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: isActive ? couleur : isDark ? '#94a3b8' : '#64748b' }}
                      />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${textCls}`}>{f.label}</p>
                      <p className={`text-xs ${mutedCls}`}>{f.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* FEC info banner */}
          {format === 'fec' && (
            <div
              className="mt-4 rounded-lg p-3 flex items-start gap-2 text-sm"
              style={{ backgroundColor: `${couleur}10`, color: couleur }}
            >
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Le format FEC est obligatoire pour les contrôles fiscaux en France. Il respecte les
                normes de l'article A.47 A-1 du Livre des Procédures Fiscales.
              </span>
            </div>
          )}
        </div>

        {/* ── Journal filter ────────────────────────────────────────────── */}
        <div className={`border rounded-xl p-5 ${cardCls}`}>
          <h2 className={`text-sm font-semibold mb-4 ${textCls} flex items-center gap-2`}>
            <Filter className="w-4 h-4" style={{ color: couleur }} />
            Filtre par journal
          </h2>
          <div className="flex flex-wrap gap-2">
            {JOURNALS.map((j) => {
              const isActive = journalFilter === j.key;
              const count = j.key === 'all'
                ? entries.length
                : entries.filter((e) => e.journal === j.key).length;
              const isEmpty = count === 0 && j.key !== 'all';
              return (
                <button
                  key={j.key}
                  onClick={() => { if (!isEmpty) { setJournalFilter(j.key); setPreviewPage(0); } }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isEmpty
                      ? 'opacity-40 cursor-not-allowed'
                      : isActive
                        ? 'text-white shadow-sm'
                        : isDark
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={isActive && !isEmpty ? { backgroundColor: j.color } : {}}
                  title={isEmpty ? 'Aucune écriture pour ce journal' : ''}
                >
                  {j.label}
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      isActive && !isEmpty
                        ? 'bg-white/20 text-white'
                        : isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Preview toggle ─────────────────────────────────────────────── */}
        <div className={`border rounded-xl ${cardCls}`}>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`w-full flex items-center justify-between p-5 ${textCls}`}
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" style={{ color: couleur }} />
              <span className="text-sm font-semibold">
                Aperçu des écritures ({filteredEntries.length} lignes{journalFilter !== 'all' ? ` — ${JOURNALS.find(j => j.key === journalFilter)?.label}` : ''})
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showPreview ? 'rotate-180' : ''}`}
              style={{ color: couleur }}
            />
          </button>

          {showPreview && (
            <div className="px-5 pb-5">
              {filteredEntries.length === 0 ? (
                <div className={`text-center py-8 ${mutedCls}`}>
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Aucune écriture pour la période sélectionnée</p>
                </div>
              ) : (
                <>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                  <table className="w-full text-sm" aria-label="Écritures comptables">
                    <thead>
                      <tr className={isDark ? 'bg-slate-700/60' : 'bg-slate-50'}>
                        <th scope="col" className={`text-left px-3 py-2.5 font-semibold ${mutedCls} text-xs`}>
                          Date
                        </th>
                        <th scope="col" className={`text-left px-3 py-2.5 font-semibold ${mutedCls} text-xs`}>
                          Réf
                        </th>
                        <th scope="col" className={`text-left px-3 py-2.5 font-semibold ${mutedCls} text-xs`}>
                          Libellé
                        </th>
                        <th scope="col" className={`text-right px-3 py-2.5 font-semibold ${mutedCls} text-xs`}>
                          Débit
                        </th>
                        <th scope="col" className={`text-right px-3 py-2.5 font-semibold ${mutedCls} text-xs`}>
                          Crédit
                        </th>
                        <th scope="col" className={`text-left px-3 py-2.5 font-semibold ${mutedCls} text-xs`}>
                          Compte
                        </th>
                        <th scope="col" className={`text-left px-3 py-2.5 font-semibold ${mutedCls} text-xs`}>
                          Journal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewEntries.map((e, i) => (
                        <tr
                          key={i}
                          className={`border-t ${borderCls} ${hoverRow} transition-colors`}
                        >
                          <td className={`px-3 py-2 ${mutedCls} whitespace-nowrap`}>
                            {fmtDate(e.date)}
                          </td>
                          <td className={`px-3 py-2 ${textCls} font-mono text-xs whitespace-nowrap`}>
                            {e.ref}
                          </td>
                          <td className={`px-3 py-2 ${textCls} max-w-[220px] truncate`}>
                            {e.libelle}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {e.debit > 0 ? (
                              <span className="text-red-500 font-medium">
                                {fmtEUR.format(e.debit)}
                              </span>
                            ) : (
                              <span className={mutedCls}>-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {e.credit > 0 ? (
                              <span className="text-emerald-500 font-medium">
                                {fmtEUR.format(e.credit)}
                              </span>
                            ) : (
                              <span className={mutedCls}>-</span>
                            )}
                          </td>
                          <td className={`px-3 py-2 font-mono text-xs ${mutedCls}`}>{e.compte}</td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                              style={{
                                backgroundColor:
                                  e.journal === 'VE' ? `${couleur}20`
                                  : e.journal === 'BQ' ? (isDark ? '#1e3a5f' : '#dbeafe')
                                  : isDark ? '#4c1d95' : '#ede9fe',
                                color:
                                  e.journal === 'VE' ? couleur
                                  : e.journal === 'BQ' ? (isDark ? '#93c5fd' : '#2563eb')
                                  : isDark ? '#c4b5fd' : '#7c3aed',
                              }}
                            >
                              {e.journal}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* Total row */}
                      <tr
                        className={`border-t-2 font-semibold ${
                          isDark ? 'border-slate-600 bg-slate-700/40' : 'border-slate-300 bg-slate-50'
                        }`}
                      >
                        <td className={`px-3 py-2.5 ${textCls}`} colSpan={3}>
                          Total ({filteredEntries.length} écritures{journalFilter !== 'all' ? ` — ${journalFilter}` : ''})
                        </td>
                        <td className="px-3 py-2.5 text-right text-red-500 whitespace-nowrap">
                          {fmtEUR.format(totalFilteredDebit)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-emerald-500 whitespace-nowrap">
                          {fmtEUR.format(totalFilteredCredit)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPreviewPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-xs ${mutedCls}`}>
                      Page {previewPage + 1} / {totalPreviewPages} — {filteredEntries.length} écritures
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                        disabled={previewPage === 0}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                          isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPreviewPages) }, (_, i) => {
                        let pageNum;
                        if (totalPreviewPages <= 5) {
                          pageNum = i;
                        } else if (previewPage < 3) {
                          pageNum = i;
                        } else if (previewPage > totalPreviewPages - 4) {
                          pageNum = totalPreviewPages - 5 + i;
                        } else {
                          pageNum = previewPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPreviewPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                              previewPage === pageNum
                                ? 'text-white shadow-sm'
                                : isDark
                                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            style={previewPage === pageNum ? { backgroundColor: couleur } : {}}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages - 1, p + 1))}
                        disabled={previewPage >= totalPreviewPages - 1}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                          isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Export action ───────────────────────────────────────────────── */}
        <div className={`border rounded-xl p-5 ${cardCls}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className={`text-sm font-semibold ${textCls} mb-1`}>Fichier de sortie</p>
              <p className={`text-xs font-mono ${mutedCls} px-2 py-1 rounded ${
                isDark ? 'bg-slate-700' : 'bg-slate-100'
              }`}>
                {getFilenamePreview()}
              </p>
              <p className={`text-xs mt-2 ${mutedCls}`}>
                {filteredEntries.length} écritures comptables seront exportées
                {journalFilter !== 'all' && ` (journal ${journalFilter})`}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleExport}
                disabled={filteredEntries.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                style={{
                  backgroundColor: filteredEntries.length === 0 ? (isDark ? '#475569' : '#94a3b8') : couleur,
                }}
              >
                <Download className="w-4 h-4" />
                Télécharger l'export
              </button>
              {filteredEntries.length === 0 && (
                <p className={`text-xs ${mutedCls}`}>Aucune écriture pour la période sélectionnée</p>
              )}
            </div>
          </div>

          {/* Equilibre check */}
          {filteredEntries.length > 0 && (
            <div className={`mt-4 pt-4 border-t ${borderCls}`}>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" style={{ color: couleur }} />
                <span className={`text-xs font-medium ${mutedCls}`}>
                  Équilibre des écritures{journalFilter !== 'all' ? ` (${journalFilter})` : ''} :
                </span>
                {Math.abs(totalFilteredDebit - totalFilteredCredit) < 0.01 ? (
                  <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Équilibré
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-500">
                    Écart de {fmtEUR.format(Math.abs(totalFilteredDebit - totalFilteredCredit))}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Success toast ──────────────────────────────────────────────── */}
        {showSuccess && (
          <div
            className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 rounded-xl text-white shadow-2xl animate-fade-in z-50"
            style={{ backgroundColor: '#10b981' }}
          >
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">Export téléchargé</p>
              <p className="text-xs opacity-90">{getFilenamePreview()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
