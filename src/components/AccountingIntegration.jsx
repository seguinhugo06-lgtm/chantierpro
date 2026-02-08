import React, { useState, useMemo } from 'react';
import { X, Link2, Unlink, Download, FileSpreadsheet, FileText, RefreshCw, CheckCircle, AlertCircle, Calendar, ArrowRight, ExternalLink, Calculator, CreditCard, Receipt, Building2 } from 'lucide-react';
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

/**
 * Composant d'integration comptable
 * Permet de connecter Pennylane, Indy, Qonto et exporter les donnees
 */
export default function AccountingIntegration({
  isOpen,
  onClose,
  devis,
  depenses,
  clients,
  chantiers,
  entreprise,
  isDark,
  couleur
}) {
  const [activeTab, setActiveTab] = useState('integrations'); // integrations, export, tva
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
  const [toast, setToast] = useState(null);

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";
  const modalBg = isDark ? "bg-slate-900" : "bg-slate-50";

  // Factures only
  const factures = useMemo(() => devis.filter(d => d.type === 'facture'), [devis]);

  // TVA Summary
  const tvaSummary = useMemo(() => {
    return calculateTVASummary(devis, depenses, exportPeriod.debut, exportPeriod.fin);
  }, [devis, depenses, exportPeriod]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!isOpen) return null;

  const handleConnect = async (integrationId) => {
    setConnecting(integrationId);

    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500));

    saveIntegration(integrationId, {
      status: SYNC_STATUS.CONNECTED,
      connectedAt: new Date().toISOString(),
      lastSync: null
    });
    setIntegrations(getIntegrations());
    setConnecting(null);
    showToast(`${INTEGRATION_TYPES[integrationId.toUpperCase()]?.name || integrationId} connecté`);
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
      showToast('Synchronisation terminée');
    } catch (error) {
      showToast('Erreur de synchronisation', 'error');
    }

    setSyncing(null);
  };

  const handleExportCSV = (type) => {
    if (type === 'factures') {
      const csv = exportInvoicesToCSV(factures, clients, entreprise);
      downloadFile(csv, `factures_${exportPeriod.debut}_${exportPeriod.fin}.csv`);
      showToast(`${factures.length} factures exportées`);
    } else if (type === 'depenses') {
      const csv = exportExpensesToCSV(depenses, chantiers);
      downloadFile(csv, `depenses_${exportPeriod.debut}_${exportPeriod.fin}.csv`);
      showToast(`${depenses.length} dépenses exportées`);
    }
  };

  const handleExportFEC = () => {
    const fec = generateFEC(factures, depenses, clients, chantiers, entreprise, exportPeriod.debut, exportPeriod.fin);
    downloadFile(fec, `FEC_${entreprise?.siret || 'SIRET'}_${exportPeriod.debut.replace(/-/g, '')}_${exportPeriod.fin.replace(/-/g, '')}.txt`, 'text/plain');
    showToast('Fichier FEC généré');
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

  const tabs = [
    { id: 'integrations', label: 'Integrations', icon: Link2 },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'tva', label: 'Resume TVA', icon: Calculator }
  ];

  return (
    <div className="fixed inset-0 z-50 animate-fade-in flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={`relative ${modalBg} flex-1 m-2 sm:m-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-4xl mx-auto w-full`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: `${couleur}20` }}>
              <Building2 size={24} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Comptabilite</h2>
              <p className={textMuted}>Integrations et exports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}
          >
            <X size={20} className={textSecondary} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 px-4 sm:px-6 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={activeTab === tab.id ? { background: couleur } : {}}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <p className={`text-sm ${textSecondary} mb-6`}>
                Connectez vos outils comptables pour synchroniser automatiquement vos factures et depenses.
              </p>

              {/* Integration Cards */}
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
                            <span>Derniere sync:</span>
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

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Period Selector */}
              <div className={`${cardBg} rounded-xl border p-4`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
                  <Calendar size={18} style={{ color: couleur }} />
                  Periode d'export
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
                    Telecharger CSV
                  </button>
                </div>

                {/* CSV Depenses */}
                <div className={`${cardBg} rounded-xl border p-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <FileSpreadsheet size={20} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${textPrimary}`}>Depenses (CSV)</h3>
                      <p className={`text-xs ${textMuted}`}>{depenses.length} depense{depenses.length > 1 ? 's' : ''}</p>
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
                    Telecharger CSV
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
                    Format obligatoire pour les controles fiscaux (article A.47 A-1 du LPF).
                    Compatible avec tous les logiciels comptables agrees.
                  </p>
                  <button
                    onClick={handleExportFEC}
                    className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                      isDark ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-600'
                    } text-white`}
                  >
                    <Download size={16} />
                    Generer FEC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TVA Tab */}
          {activeTab === 'tva' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className={`${cardBg} rounded-xl border p-4`}>
                  <p className={`text-sm ${textMuted} mb-1`}>TVA collectee</p>
                  <p className={`text-2xl font-bold text-emerald-500`}>
                    {tvaSummary.tvaCollectee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                  </p>
                  <p className={`text-xs ${textMuted} mt-1`}>{tvaSummary.nbFactures} facture{tvaSummary.nbFactures > 1 ? 's' : ''}</p>
                </div>

                <div className={`${cardBg} rounded-xl border p-4`}>
                  <p className={`text-sm ${textMuted} mb-1`}>TVA deductible</p>
                  <p className={`text-2xl font-bold text-blue-500`}>
                    {tvaSummary.tvaDeductible.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                  </p>
                  <p className={`text-xs ${textMuted} mt-1`}>{tvaSummary.nbDepenses} depense{tvaSummary.nbDepenses > 1 ? 's' : ''}</p>
                </div>

                <div className={`${cardBg} rounded-xl border p-4 ${
                  tvaSummary.isCredit
                    ? (isDark ? 'border-blue-800' : 'border-blue-200')
                    : (isDark ? 'border-amber-800' : 'border-amber-200')
                }`}>
                  <p className={`text-sm ${textMuted} mb-1`}>
                    {tvaSummary.isCredit ? 'Credit de TVA' : 'TVA a payer'}
                  </p>
                  <p className={`text-2xl font-bold ${tvaSummary.isCredit ? 'text-blue-500' : 'text-amber-500'}`}>
                    {Math.abs(tvaSummary.tvaNetteAPayer).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                  </p>
                  <p className={`text-xs ${textMuted} mt-1`}>
                    {tvaSummary.periode.debut} au {tvaSummary.periode.fin}
                  </p>
                </div>
              </div>

              {/* Detail par taux */}
              <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-700/50' : 'border-slate-200 bg-slate-50'}`}>
                  <h3 className={`font-semibold ${textPrimary}`}>Detail par taux de TVA</h3>
                </div>
                <table className="w-full" aria-label="Détail par taux de TVA">
                  <thead className={isDark ? 'bg-slate-700/30' : 'bg-slate-50'}>
                    <tr>
                      <th scope="col" className={`text-left px-4 py-3 text-sm font-medium ${textMuted}`}>Taux</th>
                      <th scope="col" className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Base HT</th>
                      <th scope="col" className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Collectee</th>
                      <th scope="col" className={`text-right px-4 py-3 text-sm font-medium ${textMuted}`}>Deductible</th>
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
                              {data.base.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </td>
                            <td className={`text-right px-4 py-3 text-emerald-500`}>
                              {data.collectee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </td>
                            <td className={`text-right px-4 py-3 text-blue-500`}>
                              {data.deductible.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </td>
                            <td className={`text-right px-4 py-3 font-medium ${solde >= 0 ? 'text-amber-500' : 'text-blue-500'}`}>
                              {solde >= 0 ? '+' : ''}{solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
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
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-60 animate-fade-in ${
          toast.type === 'error'
            ? 'bg-red-500 text-white'
            : toast.type === 'info'
            ? (isDark ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white')
            : 'bg-emerald-500 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
