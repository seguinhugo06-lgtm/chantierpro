import { useState, useRef } from 'react';
import {
  X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ChevronRight,
  Download, Users, Receipt, HardHat, FileText, ArrowLeft, ArrowRight,
  Check, RefreshCw, Table, Eye, Trash2
} from 'lucide-react';
import {
  IMPORT_TYPES,
  parseCSV,
  findColumnMapping,
  applyMapping,
  generateTemplate,
  validateImportData,
  convertToFinalFormat
} from '../lib/import/excel-import';

export default function ExcelImport({
  onClose,
  onImportClients,
  onImportDepenses,
  onImportEquipe,
  onImportDevis,
  clients = [],
  chantiers = [],
  equipe = [],
  isDark = false,
  couleur = '#f97316'
}) {
  // États du wizard
  const [step, setStep] = useState(1); // 1: type, 2: upload, 3: mapping, 4: preview, 5: result
  const [importType, setImportType] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [mappingInfo, setMappingInfo] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const typeIcons = {
    clients: Users,
    depenses: Receipt,
    equipe: HardHat,
    devis: FileText
  };

  // === STEP 1: Choix du type ===
  const handleSelectType = (type) => {
    setImportType(type);
    setStep(2);
    setError(null);
  };

  // === STEP 2: Upload fichier ===
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      const result = parseCSV(text);

      if (!result.success) {
        setError(result.error);
        setIsProcessing(false);
        return;
      }

      setFileData({
        name: file.name,
        ...result
      });

      // Auto-détecter le mapping
      const mappingResult = findColumnMapping(result.headers, importType);
      setMappingInfo(mappingResult);
      setMapping(mappingResult.mapping);

      setStep(3);
    } catch (err) {
      setError(`Erreur de lecture: ${err.message}`);
    }

    setIsProcessing(false);
  };

  const handleDownloadTemplate = () => {
    const template = generateTemplate(importType);
    if (!template) return;

    const blob = new Blob([template.content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // === STEP 3: Mapping colonnes ===
  const handleMappingChange = (field, column) => {
    const newMapping = { ...mapping, [field]: column };
    setMapping(newMapping);

    // Recalculer si complet
    const config = IMPORT_TYPES[importType.toUpperCase()];
    const unmapped = config.requiredFields.filter(f => !newMapping[f]);
    setMappingInfo(prev => ({
      ...prev,
      mapping: newMapping,
      unmapped,
      isComplete: unmapped.length === 0
    }));
  };

  const handleConfirmMapping = () => {
    if (!mappingInfo.isComplete) {
      setError('Veuillez mapper tous les champs obligatoires');
      return;
    }

    // Appliquer le mapping
    const result = applyMapping(fileData.data, mapping, importType);

    if (result.errors.length > 0 && result.data.length === 0) {
      setError(`Erreurs de conversion: ${result.errors.join(', ')}`);
      return;
    }

    // Valider les données
    const validation = validateImportData(result.data, importType, {
      clients,
      chantiers,
      equipe
    });

    setPreviewData(result.data);
    setValidationResult(validation);
    setStep(4);
  };

  // === STEP 4: Prévisualisation ===
  const handleRemoveItem = (index) => {
    const newData = previewData.filter((_, i) => i !== index);
    setPreviewData(newData);

    // Re-valider
    const validation = validateImportData(newData, importType, {
      clients,
      chantiers,
      equipe
    });
    setValidationResult(validation);
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);

    try {
      // Convertir au format final
      const finalData = convertToFinalFormat(previewData, importType, {
        clients,
        chantiers,
        equipe
      });

      // Appeler le bon handler
      let count = 0;
      switch (importType) {
        case 'clients':
          if (onImportClients) {
            onImportClients(finalData);
            count = finalData.length;
          }
          break;
        case 'depenses':
          if (onImportDepenses) {
            onImportDepenses(finalData);
            count = finalData.length;
          }
          break;
        case 'equipe':
          if (onImportEquipe) {
            onImportEquipe(finalData);
            count = finalData.length;
          }
          break;
        case 'devis':
          if (onImportDevis) {
            onImportDevis(finalData);
            count = finalData.length;
          }
          break;
      }

      setImportResult({
        success: true,
        count,
        type: IMPORT_TYPES[importType.toUpperCase()].label
      });
      setStep(5);
    } catch (err) {
      setError(`Erreur d'import: ${err.message}`);
    }

    setIsProcessing(false);
  };

  // === Render helpers ===
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              s < step
                ? 'bg-green-500 text-white'
                : s === step
                ? 'text-white'
                : isDark
                ? 'bg-gray-700 text-gray-400'
                : 'bg-gray-200 text-gray-500'
            }`}
            style={s === step ? { backgroundColor: couleur } : {}}
          >
            {s < step ? <Check className="w-4 h-4" /> : s}
          </div>
          {s < 5 && (
            <div
              className={`w-8 h-0.5 ${
                s < step
                  ? 'bg-green-500'
                  : isDark
                  ? 'bg-gray-700'
                  : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Que souhaitez-vous importer ?
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {Object.entries(IMPORT_TYPES).map(([key, config]) => {
          const Icon = typeIcons[config.id];
          return (
            <button
              key={key}
              onClick={() => handleSelectType(config.id)}
              className={`p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                isDark
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-500'
                  : 'bg-white border-gray-200 hover:border-gray-400'
              }`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto"
                style={{ backgroundColor: `${couleur}20` }}
              >
                <Icon className="w-6 h-6" style={{ color: couleur }} />
              </div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {config.label}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {config.requiredFields.length} champs requis
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const config = IMPORT_TYPES[importType.toUpperCase()];

    return (
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Importer {config.label}
        </h3>

        {/* Zone de drop */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDark
              ? 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Cliquez pour sélectionner un fichier
          </p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Formats acceptés: CSV, TXT (Excel exporté en CSV)
          </p>
        </div>

        {/* Template */}
        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
          <div className="flex items-start gap-3">
            <FileSpreadsheet className={`w-5 h-5 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <div className="flex-1">
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Pas de fichier prêt ?
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Téléchargez notre modèle avec les colonnes attendues
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="mt-2 text-sm font-medium flex items-center gap-1"
                style={{ color: couleur }}
              >
                <Download className="w-4 h-4" />
                Télécharger le modèle CSV
              </button>
            </div>
          </div>
        </div>

        {/* Champs attendus */}
        <div>
          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Colonnes attendues :
          </p>
          <div className="flex flex-wrap gap-2">
            {config.requiredFields.map((f) => (
              <span
                key={f}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                }`}
              >
                {f}*
              </span>
            ))}
            {config.optionalFields.map((f) => (
              <span
                key={f}
                className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-4">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: couleur }} />
            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
              Analyse du fichier...
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderStep3 = () => {
    const config = IMPORT_TYPES[importType.toUpperCase()];
    const allFields = [...config.requiredFields, ...config.optionalFields];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Mapper les colonnes
          </h3>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {fileData?.rowCount} lignes détectées
          </span>
        </div>

        {/* Indicateur de complétude */}
        {mappingInfo && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 ${
              mappingInfo.isComplete
                ? isDark
                  ? 'bg-green-900/30'
                  : 'bg-green-50'
                : isDark
                ? 'bg-yellow-900/30'
                : 'bg-yellow-50'
            }`}
          >
            {mappingInfo.isComplete ? (
              <>
                <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <span className={isDark ? 'text-green-400' : 'text-green-700'}>
                  Tous les champs requis sont mappés
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={isDark ? 'text-yellow-400' : 'text-yellow-700'}>
                  Champs manquants: {mappingInfo.unmapped.join(', ')}
                </span>
              </>
            )}
          </div>
        )}

        {/* Liste des mappings */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {allFields.map((field) => {
            const isRequired = config.requiredFields.includes(field);
            const isMapped = !!mapping[field];

            return (
              <div
                key={field}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  isDark ? 'bg-gray-800' : 'bg-gray-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {field}
                    </span>
                    {isRequired && (
                      <span className="text-red-500 text-xs">*requis</span>
                    )}
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />

                <select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${!isMapped && isRequired ? 'border-red-400' : ''}`}
                >
                  <option value="">-- Sélectionner --</option>
                  {fileData?.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>

                {isMapped && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleConfirmMapping}
          disabled={!mappingInfo?.isComplete}
          className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
            mappingInfo?.isComplete
              ? 'text-white'
              : isDark
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          style={mappingInfo?.isComplete ? { backgroundColor: couleur } : {}}
        >
          Continuer vers la prévisualisation
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderStep4 = () => {
    const config = IMPORT_TYPES[importType.toUpperCase()];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Prévisualisation
          </h3>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {previewData.length} {config.label.toLowerCase()} à importer
          </span>
        </div>

        {/* Avertissements */}
        {validationResult?.hasWarnings && (
          <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <span className={`font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                {validationResult.warnings.length} avertissement(s)
              </span>
            </div>
            <ul className={`text-sm space-y-1 ${isDark ? 'text-yellow-300' : 'text-yellow-600'}`}>
              {validationResult.warnings.slice(0, 3).map((w, i) => (
                <li key={i}>• Ligne {w.item._rowNumber}: {w.warnings.join(', ')}</li>
              ))}
              {validationResult.warnings.length > 3 && (
                <li>• Et {validationResult.warnings.length - 3} autre(s)...</li>
              )}
            </ul>
          </div>
        )}

        {/* Table de prévisualisation */}
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm" aria-label="Prévisualisation des données Excel importées">
              <thead className={`sticky top-0 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <tr>
                  {config.requiredFields.slice(0, 4).map((field) => (
                    <th
                      key={field}
                      scope="col"
                      className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      {field}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className={isDark ? 'bg-gray-900' : 'bg-white'}>
                {previewData.slice(0, 10).map((item, index) => (
                  <tr
                    key={index}
                    className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} ${
                      item._warnings?.length > 0
                        ? isDark
                          ? 'bg-yellow-900/10'
                          : 'bg-yellow-50'
                        : ''
                    }`}
                  >
                    {config.requiredFields.slice(0, 4).map((field) => (
                      <td
                        key={field}
                        className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}
                      >
                        {typeof item[field] === 'number'
                          ? item[field].toLocaleString('fr-FR')
                          : item[field] || '-'}
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className={`p-1 rounded hover:bg-red-100 ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-600'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 10 && (
            <div className={`px-4 py-2 text-center text-sm ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              Et {previewData.length - 10} autres lignes...
            </div>
          )}
        </div>

        {/* Bouton d'import */}
        <button
          onClick={handleConfirmImport}
          disabled={previewData.length === 0 || isProcessing}
          className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: previewData.length > 0 ? couleur : '#9ca3af' }}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Importer {previewData.length} {config.label.toLowerCase()}
            </>
          )}
        </button>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="text-center py-8">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: `${couleur}20` }}
      >
        <CheckCircle className="w-8 h-8" style={{ color: couleur }} />
      </div>

      <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Import réussi !
      </h3>

      <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {importResult?.count} {importResult?.type.toLowerCase()} ont été importé(e)s avec succès
      </p>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => {
            setStep(1);
            setImportType(null);
            setFileData(null);
            setMapping({});
            setPreviewData([]);
            setImportResult(null);
          }}
          className={`px-6 py-2 rounded-xl font-medium ${
            isDark
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          Nouvel import
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-xl font-medium text-white"
          style={{ backgroundColor: couleur }}
        >
          Terminer
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${couleur}20` }}
            >
              <FileSpreadsheet className="w-5 h-5" style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Import Excel/CSV
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Importez vos données existantes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepIndicator()}

          {error && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>

        {/* Footer navigation */}
        {step > 1 && step < 5 && (
          <div
            className={`flex items-center justify-between p-4 border-t ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <button
              onClick={() => setStep(step - 1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>

            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Étape {step} sur 5
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
