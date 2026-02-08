import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, ChevronDown, Loader2 } from 'lucide-react';

/**
 * ImportModal - CSV/Excel import with column mapping
 * Supports drag-and-drop, file preview, and field mapping
 * Inline CSV parser (no external dependency)
 */

// ── Field definitions per type ──────────────────────────────────
const FIELD_DEFINITIONS = {
  clients: [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'email', label: 'Email' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'adresse', label: 'Adresse' },
    { key: 'entreprise', label: 'Entreprise' },
    { key: 'notes', label: 'Notes' },
  ],
  articles: [
    { key: 'designation', label: 'Designation' },
    { key: 'unite', label: 'Unite' },
    { key: 'prixUnitaire', label: 'Prix unitaire' },
    { key: 'tva', label: 'TVA (%)' },
    { key: 'categorie', label: 'Categorie' },
  ],
  ouvrages: [
    { key: 'designation', label: 'Designation' },
    { key: 'description', label: 'Description' },
    { key: 'unite', label: 'Unite' },
    { key: 'prixUnitaire', label: 'Prix unitaire' },
    { key: 'tva', label: 'TVA (%)' },
    { key: 'categorie', label: 'Categorie' },
  ],
};

const TYPE_LABELS = {
  clients: 'Clients',
  articles: 'Articles',
  ouvrages: 'Ouvrages',
};

// ── Inline CSV parser ───────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',' || ch === ';') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim());
        current = '';
        if (row.some(cell => cell !== '')) {
          rows.push(row);
        }
        row = [];
        if (ch === '\r') i++; // skip \n after \r
      } else {
        current += ch;
      }
    }
  }

  // Last field / row
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

// ── Auto-mapping heuristic ──────────────────────────────────────
function autoMapColumns(csvHeaders, fields) {
  const mapping = {};
  csvHeaders.forEach((header, index) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = fields.find(f => {
      const fNorm = f.key.toLowerCase();
      const fLabel = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        normalized === fNorm ||
        normalized === fLabel ||
        normalized.includes(fNorm) ||
        fNorm.includes(normalized) ||
        // Common aliases
        (fNorm === 'prixunitaire' && (normalized.includes('prix') || normalized.includes('price') || normalized.includes('tarif'))) ||
        (fNorm === 'telephone' && (normalized.includes('tel') || normalized.includes('phone'))) ||
        (fNorm === 'designation' && (normalized.includes('nom') || normalized.includes('libelle') || normalized.includes('name'))) ||
        (fNorm === 'entreprise' && (normalized.includes('societe') || normalized.includes('company')))
      );
    });
    mapping[index] = match ? match.key : '';
  });
  return mapping;
}


export default function ImportModal({
  isOpen,
  onClose,
  type = 'clients',
  onImport,
  isDark = false,
  couleur = '#f97316'
}) {
  // ── State ───────────────────────────────────────────────────
  const [step, setStep] = useState('upload'); // 'upload' | 'mapping' | 'importing' | 'done'
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const fields = FIELD_DEFINITIONS[type] || FIELD_DEFINITIONS.clients;

  // ── Theme ─────────────────────────────────────────────────
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const dropZoneBg = isDark ? 'bg-slate-700/50' : 'bg-slate-50';
  const tableBg = isDark ? 'bg-slate-700/50' : 'bg-slate-50';
  const tableRowBg = isDark ? 'even:bg-slate-700/30' : 'even:bg-slate-50';

  // ── Reset on close ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setFileName('');
      setCsvHeaders([]);
      setCsvRows([]);
      setMapping({});
      setDragOver(false);
      setError('');
      setImportProgress(0);
      setImportResult(null);
    }
  }, [isOpen]);

  // ── File processing ───────────────────────────────────────
  const processFile = useCallback((file) => {
    setError('');

    // Validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'txt'].includes(ext)) {
      setError('Format non supporte. Veuillez utiliser un fichier .csv');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 5 Mo)');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);

        if (parsed.length < 2) {
          setError('Le fichier doit contenir au moins un en-tete et une ligne de donnees');
          return;
        }

        const headers = parsed[0];
        const dataRows = parsed.slice(1);

        setCsvHeaders(headers);
        setCsvRows(dataRows);
        setMapping(autoMapColumns(headers, fields));
        setStep('mapping');
      } catch (err) {
        setError('Erreur lors de la lecture du fichier: ' + err.message);
      }
    };

    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier');
    };

    reader.readAsText(file, 'UTF-8');
  }, [fields]);

  // ── Drag and drop handlers ────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  // ── Column mapping change ─────────────────────────────────
  const handleMappingChange = (colIndex, fieldKey) => {
    setMapping(prev => ({ ...prev, [colIndex]: fieldKey }));
  };

  // ── Count mapped columns ──────────────────────────────────
  const mappedCount = Object.values(mapping).filter(v => v !== '').length;

  // ── Execute import ────────────────────────────────────────
  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);

    const mappedData = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const obj = {};
      let hasData = false;

      Object.entries(mapping).forEach(([colIndex, fieldKey]) => {
        if (fieldKey && row[parseInt(colIndex)] !== undefined) {
          let value = row[parseInt(colIndex)];

          // Convert numeric fields
          if (['prixUnitaire', 'tva'].includes(fieldKey)) {
            const parsed = parseFloat(value.replace(',', '.'));
            value = isNaN(parsed) ? 0 : parsed;
          }

          if (value !== '' && value !== undefined) {
            obj[fieldKey] = value;
            hasData = true;
          }
        }
      });

      if (hasData) {
        mappedData.push(obj);
      }

      // Update progress
      setImportProgress(Math.round(((i + 1) / csvRows.length) * 100));

      // Small delay for visual feedback on large files
      if (i % 50 === 0 && i > 0) {
        await new Promise(r => setTimeout(r, 10));
      }
    }

    // Call the import callback
    try {
      await onImport(mappedData);
      setImportResult({ success: true, count: mappedData.length });
    } catch (err) {
      setImportResult({ success: false, error: err.message || 'Erreur lors de l\'importation' });
    }

    setStep('done');
  };

  // ── Keyboard handler ──────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // ── Preview rows (first 5) ────────────────────────────────
  const previewRows = csvRows.slice(0, 5);

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={`relative w-full sm:max-w-2xl max-h-[90vh] ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col`}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header with gradient */}
            <div
              className="px-6 pt-6 pb-4 shrink-0"
              style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Importer des {TYPE_LABELS[type] || type}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {step === 'upload' && 'Fichier CSV'}
                      {step === 'mapping' && `${csvRows.length} lignes detectees`}
                      {step === 'importing' && 'Importation en cours...'}
                      {step === 'done' && 'Termine'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-white/20 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-4">
                {['upload', 'mapping', 'done'].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step === s || (['importing', 'done'].includes(step) && s === 'done') ||
                        (step === 'mapping' && i < 1) || (step === 'importing' && i < 2) || (step === 'done' && i < 2)
                          ? 'bg-white text-slate-900'
                          : 'bg-white/30 text-white'
                      }`}
                    >
                      {(step === 'done' && i < 2) || (step === 'mapping' && i === 0) || (step === 'importing' && i <= 1) ? (
                        <Check size={14} />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < 2 && (
                      <div className={`w-8 h-0.5 rounded ${
                        (step === 'mapping' && i === 0) || (step === 'importing' && i <= 1) || (step === 'done' && i <= 1)
                          ? 'bg-white'
                          : 'bg-white/30'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content - scrollable */}
            <div className="p-6 overflow-y-auto flex-1">

              {/* ── STEP: Upload ───────────────────────────── */}
              {step === 'upload' && (
                <div className="space-y-4">
                  {/* Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      dragOver
                        ? 'border-current scale-[1.01]'
                        : `${borderColor} ${hoverBg}`
                    } ${dropZoneBg}`}
                    style={dragOver ? { borderColor: couleur, backgroundColor: `${couleur}10` } : {}}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: `${couleur}15` }}
                    >
                      <Upload size={28} style={{ color: couleur }} />
                    </div>
                    <p className={`text-base font-medium mb-1 ${textPrimary}`}>
                      Glissez votre fichier ici
                    </p>
                    <p className={`text-sm ${textMuted}`}>
                      ou cliquez pour parcourir
                    </p>
                    <p className={`text-xs mt-3 ${textMuted}`}>
                      Formats acceptes: .csv (max 5 Mo)
                    </p>
                  </div>

                  {/* Error message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
                    >
                      <AlertCircle size={16} className="shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  {/* Format hints */}
                  <div className={`rounded-xl p-4 ${tableBg}`}>
                    <p className={`text-sm font-medium mb-2 ${textPrimary}`}>
                      Colonnes attendues pour {TYPE_LABELS[type]}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {fields.map(f => (
                        <span
                          key={f.key}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            isDark ? 'bg-slate-600 text-slate-200' : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP: Mapping ──────────────────────────── */}
              {step === 'mapping' && (
                <div className="space-y-5">
                  {/* File info */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${tableBg}`}>
                    <FileSpreadsheet size={18} style={{ color: couleur }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${textPrimary}`}>{fileName}</p>
                      <p className={`text-xs ${textMuted}`}>
                        {csvRows.length} lignes, {csvHeaders.length} colonnes
                      </p>
                    </div>
                    <button
                      onClick={() => { setStep('upload'); setError(''); }}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        isDark ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Changer
                    </button>
                  </div>

                  {/* Column mapping */}
                  <div>
                    <p className={`text-sm font-medium mb-3 ${textPrimary}`}>
                      Associer les colonnes ({mappedCount}/{csvHeaders.length} associees)
                    </p>
                    <div className="space-y-2">
                      {csvHeaders.map((header, colIndex) => (
                        <div
                          key={colIndex}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${borderColor} transition-colors ${
                            mapping[colIndex] ? '' : isDark ? 'opacity-60' : 'opacity-70'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${textPrimary}`}>{header}</p>
                            {previewRows[0] && previewRows[0][colIndex] && (
                              <p className={`text-xs truncate ${textMuted}`}>
                                ex: {previewRows[0][colIndex]}
                              </p>
                            )}
                          </div>
                          <ArrowRight size={16} className={textMuted} />
                          <div className="relative">
                            <select
                              value={mapping[colIndex] || ''}
                              onChange={(e) => handleMappingChange(colIndex, e.target.value)}
                              className={`appearance-none pl-3 pr-8 py-2 rounded-xl border text-sm cursor-pointer min-w-[160px] ${inputBg}`}
                            >
                              <option value="">-- Ignorer --</option>
                              {fields.map(f => (
                                <option key={f.key} value={f.key}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview table */}
                  <div>
                    <p className={`text-sm font-medium mb-3 ${textPrimary}`}>
                      Aperçu (5 premières lignes)
                    </p>
                    <div className={`overflow-x-auto rounded-xl border ${borderColor}`}>
                      <table className="w-full text-sm" aria-label="Aperçu des données importées">
                        <thead>
                          <tr className={tableBg}>
                            {csvHeaders.map((h, i) => (
                              <th key={i} scope="col" className={`px-3 py-2 text-left font-medium whitespace-nowrap ${textSecondary}`}>
                                {mapping[i] ? (
                                  <span style={{ color: couleur }}>
                                    {fields.find(f => f.key === mapping[i])?.label || h}
                                  </span>
                                ) : (
                                  <span className={`line-through ${textMuted}`}>{h}</span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className={tableRowBg}>
                              {csvHeaders.map((_, colIdx) => (
                                <td
                                  key={colIdx}
                                  className={`px-3 py-2 whitespace-nowrap ${
                                    mapping[colIdx] ? textPrimary : textMuted + ' line-through'
                                  }`}
                                >
                                  {row[colIdx] || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                    <button
                      onClick={onClose}
                      className={`w-full sm:flex-1 px-4 py-3 rounded-xl font-medium transition-all min-h-[48px] ${
                        isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={mappedCount === 0}
                      className="w-full sm:flex-1 px-4 py-3 rounded-xl font-medium text-white transition-all min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg active:scale-[0.98]"
                      style={{ backgroundColor: couleur }}
                    >
                      <Upload size={18} />
                      <span>Importer {csvRows.length} lignes</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP: Importing ────────────────────────── */}
              {step === 'importing' && (
                <div className="space-y-6 py-8">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Loader2 size={40} className="animate-spin" style={{ color: couleur }} />
                    </div>
                    <p className={`text-base font-medium ${textPrimary}`}>
                      Importation en cours...
                    </p>
                    <p className={`text-sm mt-1 ${textMuted}`}>
                      {importProgress}% termine
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: couleur }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${importProgress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP: Done ─────────────────────────────── */}
              {step === 'done' && importResult && (
                <div className="space-y-6 py-8">
                  <div className="text-center">
                    {importResult.success ? (
                      <>
                        <div
                          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${couleur}15` }}
                        >
                          <Check size={32} style={{ color: couleur }} />
                        </div>
                        <p className={`text-lg font-bold ${textPrimary}`}>
                          Importation reussie
                        </p>
                        <p className={`text-sm mt-1 ${textMuted}`}>
                          {importResult.count} {TYPE_LABELS[type]?.toLowerCase() || 'elements'} importes avec succes
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                          <AlertCircle size={32} className="text-red-500" />
                        </div>
                        <p className={`text-lg font-bold ${textPrimary}`}>
                          Erreur lors de l'importation
                        </p>
                        <p className="text-sm mt-1 text-red-500">
                          {importResult.error}
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full px-4 py-3 rounded-xl font-medium text-white transition-all min-h-[48px] flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98]"
                    style={{ backgroundColor: couleur }}
                  >
                    <Check size={18} />
                    <span>Fermer</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
