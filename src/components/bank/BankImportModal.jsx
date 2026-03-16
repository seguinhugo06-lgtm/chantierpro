/**
 * BankImportModal - Drag & drop CSV import modal
 *
 * Features:
 * - Drag & drop zone for CSV files
 * - Auto-detect bank format
 * - Preview first 5 lines
 * - Progress bar during import
 * - Summary after import (imported, duplicates, auto-matched)
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  X, Upload, FileText, CheckCircle, AlertTriangle,
  ArrowRight, Loader2, FileSpreadsheet, Building2,
} from 'lucide-react';
import { parseBankFile } from '../../lib/bank/csvParser';

const ACCEPTED_TYPES = ['.csv', '.CSV'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function BankImportModal({ isOpen, onClose, onImport, isDark, couleur }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [parseError, setParseError] = useState(null);
  const fileRef = useRef(null);

  const tc = {
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-900',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-600',
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    input: isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300',
  };

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setParsing(false);
    setImporting(false);
    setResult(null);
    setParseError(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ---------------------------------------------------------------------------
  // File selection
  // ---------------------------------------------------------------------------

  const processFile = useCallback(async (f) => {
    if (!f) return;

    // Validate file type
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      setParseError('Format non supporté. Veuillez importer un fichier .csv');
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      setParseError('Fichier trop volumineux (max 10 Mo)');
      return;
    }

    setFile(f);
    setParsing(true);
    setParseError(null);

    try {
      const parsed = await parseBankFile(f);
      setPreview(parsed);
    } catch (err) {
      setParseError(err.message || 'Erreur lors de la lecture du fichier');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    processFile(f);
  }, [processFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    const f = e.target.files[0];
    processFile(f);
  }, [processFile]);

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  const handleImport = useCallback(async () => {
    if (!file || !preview || importing) return;
    setImporting(true);
    try {
      const res = await onImport(file);
      setResult(res);
    } catch (err) {
      setParseError(err.message || "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  }, [file, preview, importing, onImport]);

  if (!isOpen) return null;

  // Format montant for preview
  const fmtMontant = (m) => {
    if (m === null || m === undefined) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(m);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${tc.card} border`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <Upload size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${tc.text}`}>Importer un relevé bancaire</h2>
              <p className={`text-sm ${tc.textMuted}`}>Importez votre fichier CSV depuis votre banque</p>
            </div>
          </div>
          <button onClick={handleClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <X size={20} className={tc.textMuted} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: File selection / Drop zone */}
          {!result && (
            <>
              {!preview && (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-blue-400 bg-blue-50/10'
                      : isDark
                        ? 'border-slate-600 hover:border-slate-500'
                        : 'border-slate-300 hover:border-slate-400'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />

                  {parsing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={40} className="animate-spin" style={{ color: couleur }} />
                      <p className={tc.text}>Analyse du fichier...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <FileSpreadsheet size={32} style={{ color: couleur }} />
                      </div>
                      <div>
                        <p className={`font-medium ${tc.text}`}>
                          Glissez votre relevé CSV ici
                        </p>
                        <p className={`text-sm mt-1 ${tc.textMuted}`}>
                          ou cliquez pour sélectionner un fichier
                        </p>
                      </div>
                      <div className={`flex flex-wrap items-center justify-center gap-2 text-xs ${tc.textMuted}`}>
                        <span className={`px-2 py-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>Société Générale</span>
                        <span className={`px-2 py-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>BNP Paribas</span>
                        <span className={`px-2 py-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>CIC</span>
                        <span className={`px-2 py-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>Caisse d'Épargne</span>
                        <span className={`px-2 py-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>+10 banques</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {parseError && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-500">{parseError}</p>
                </div>
              )}

              {/* Step 2: Preview */}
              {preview && !importing && (
                <div className="space-y-4">
                  {/* Bank detected */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-200'}`}>
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                        Banque détectée : {preview.banqueDetectee}
                      </span>
                      <span className={`text-sm ml-2 ${tc.textMuted}`}>
                        · {preview.transactions.length} transactions trouvées
                      </span>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                      <Building2 size={16} className="text-green-500" />
                    </div>
                  </div>

                  {/* File info */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <FileText size={16} style={{ color: couleur }} />
                    <span className={`text-sm ${tc.text}`}>{file?.name}</span>
                    <span className={`text-xs ${tc.textMuted}`}>
                      ({(file?.size / 1024).toFixed(1)} Ko)
                    </span>
                    <button
                      onClick={reset}
                      className={`ml-auto text-xs px-2 py-1 rounded-lg ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                    >
                      Changer
                    </button>
                  </div>

                  {/* Preview table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                          <th className="text-left py-2 px-3 font-medium">Date</th>
                          <th className="text-left py-2 px-3 font-medium">Libellé</th>
                          <th className="text-right py-2 px-3 font-medium">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.transactions.slice(0, 5).map((tx, i) => (
                          <tr key={i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <td className={`py-2 px-3 whitespace-nowrap ${tc.text}`}>
                              {tx.date ? new Date(tx.date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className={`py-2 px-3 ${tc.text} max-w-[200px] truncate`}>
                              {tx.libelle}
                            </td>
                            <td className={`py-2 px-3 text-right whitespace-nowrap font-medium ${
                              tx.montant > 0 ? 'text-green-500' : tx.montant < 0 ? 'text-red-500' : tc.text
                            }`}>
                              {tx.montant > 0 ? '+' : ''}{fmtMontant(tx.montant)}
                            </td>
                          </tr>
                        ))}
                        {preview.transactions.length > 5 && (
                          <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <td colSpan={3} className={`py-2 px-3 text-center ${tc.textMuted} text-xs`}>
                              ... et {preview.transactions.length - 5} autres transactions
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Parse errors */}
                  {preview.erreurs.length > 0 && (
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className={`text-xs font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                          {preview.erreurs.length} avertissement{preview.erreurs.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className={`text-xs ${tc.textMuted} max-h-20 overflow-y-auto`}>
                        {preview.erreurs.slice(0, 3).map((e, i) => (
                          <p key={i}>{e}</p>
                        ))}
                        {preview.erreurs.length > 3 && <p>... et {preview.erreurs.length - 3} autres</p>}
                      </div>
                    </div>
                  )}

                  {/* Import button */}
                  <button
                    onClick={handleImport}
                    disabled={preview.transactions.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-3 text-white font-medium rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: couleur }}
                  >
                    <Upload size={18} />
                    Importer {preview.transactions.length} transaction{preview.transactions.length > 1 ? 's' : ''}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* Importing progress */}
              {importing && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 size={40} className="animate-spin" style={{ color: couleur }} />
                  <p className={`font-medium ${tc.text}`}>Import en cours...</p>
                  <p className={`text-sm ${tc.textMuted}`}>Analyse et rapprochement automatique</p>
                  <div className="w-full max-w-xs h-2 rounded-full overflow-hidden" style={{ background: `${couleur}20` }}>
                    <div className="h-full rounded-full animate-pulse" style={{ background: couleur, width: '60%' }} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Result */}
          {result && (
            <div className="space-y-4">
              {/* Success icon */}
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${couleur}20` }}>
                  <CheckCircle size={32} style={{ color: couleur }} />
                </div>
                <h3 className={`text-lg font-semibold ${tc.text}`}>Import terminé</h3>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-2xl font-bold ${tc.text}`}>{result.imported}</p>
                  <p className={`text-sm ${tc.textMuted}`}>Importées</p>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
                  <p className="text-2xl font-bold text-green-500">{result.rapproches || 0}</p>
                  <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>Rapprochées auto</p>
                </div>
                {result.doublons > 0 && (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                    <p className="text-2xl font-bold text-amber-500">{result.doublons}</p>
                    <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Doublons ignorés</p>
                  </div>
                )}
                {(result.suggeres || 0) > 0 && (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <p className="text-2xl font-bold text-blue-500">{result.suggeres}</p>
                    <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Suggestions</p>
                  </div>
                )}
              </div>

              {result.banqueDetectee && (
                <p className={`text-sm ${tc.textMuted} text-center`}>
                  Source : {result.banqueDetectee}
                </p>
              )}

              {/* Close button */}
              <button
                onClick={handleClose}
                className="w-full py-3 text-white font-medium rounded-xl transition-all hover:shadow-lg"
                style={{ background: couleur }}
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
