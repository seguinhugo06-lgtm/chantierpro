/**
 * BankConnectionModal - Multi-step modal for connecting a bank account
 *
 * Steps:
 * 1. API Configuration (first time): Enter GoCardless secret_id + secret_key
 * 2. Bank Selection: Searchable grid of French banks
 * 3. Confirmation: After redirect, shows IBAN + account details
 *
 * Uses isDark prop pattern (not Tailwind dark: prefixes)
 *
 * @module BankConnectionModal
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, Search, ArrowRight, ArrowLeft, Check, Loader2, Shield,
  ExternalLink, Key, AlertCircle, Link2, RefreshCw, X,
} from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { listInstitutions, storeApiKeys, createConnection, getStatus } from '../../lib/integrations/gocardless';
import { isDemo } from '../../supabaseClient';

// ============================================================================
// Step Components
// ============================================================================

function ApiKeyStep({ isDark, onNext, onClose }) {
  const [secretId, setSecretId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const handleSave = async () => {
    setError('');
    if (!secretId || secretId.length < 10) {
      setError('Secret ID invalide');
      return;
    }
    if (!secretKey || secretKey.length < 10) {
      setError('Secret Key invalide');
      return;
    }

    setSaving(true);
    try {
      const result = await storeApiKeys(secretId, secretKey);
      if (result?.success) {
        onNext();
      } else {
        setError(result?.error || 'Erreur lors de la sauvegarde');
      }
    } catch (e) {
      setError(e.message || 'Erreur de connexion');
    }
    setSaving(false);
  };

  return (
    <>
      <ModalBody>
        <div className="space-y-5">
          {/* Info banner */}
          <div className={`rounded-xl p-4 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex gap-3">
              <Shield size={20} className={isDark ? 'text-blue-400 flex-shrink-0 mt-0.5' : 'text-blue-600 flex-shrink-0 mt-0.5'} />
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                  Connexion sécurisée via GoCardless
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-blue-400/80' : 'text-blue-700'}`}>
                  Vos identifiants API sont stockés de manière chiffrée. Nous n'avons jamais accès à vos identifiants bancaires.
                </p>
              </div>
            </div>
          </div>

          {isDemo && (
            <div className={`rounded-xl p-4 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                <strong>Mode démo :</strong> En mode démo, la connexion est simulée avec des données fictives. Entrez n'importe quelles valeurs pour tester.
              </p>
            </div>
          )}

          {/* Secret ID */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Secret ID
            </label>
            <input
              type="text"
              value={secretId}
              onChange={e => setSecretId(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl font-mono text-sm ${inputBg} focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors`}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          {/* Secret Key */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Secret Key
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl font-mono text-sm ${inputBg} focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors`}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          {error && (
            <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Link to GoCardless */}
          <p className={`text-xs ${textSecondary}`}>
            Obtenez vos clés API sur{' '}
            <a
              href="https://bankaccountdata.gocardless.com/user-secrets/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:text-primary-600 inline-flex items-center gap-1"
            >
              GoCardless Dashboard <ExternalLink size={12} />
            </a>
          </p>
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          onClick={onClose}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !secretId || !secretKey}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
          Enregistrer et continuer
        </button>
      </ModalFooter>
    </>
  );
}

function BankSelectionStep({ isDark, onSelect, onBack }) {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-gray-900';

  useEffect(() => {
    (async () => {
      try {
        const data = await listInstitutions('FR');
        setInstitutions(data);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return institutions;
    const q = search.toLowerCase();
    return institutions.filter(i => i.name.toLowerCase().includes(q));
  }, [institutions, search]);

  return (
    <>
      <ModalBody>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher votre banque..."
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm ${inputBg} focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors`}
            />
          </div>

          {error && (
            <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Bank grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`animate-pulse rounded-xl p-4 h-24 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {filtered.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => onSelect(inst)}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-xl border
                    transition-all duration-150 hover:shadow-md active:scale-95
                    ${isDark
                      ? 'bg-slate-700/50 border-slate-600 hover:border-primary-500 hover:bg-slate-700'
                      : 'bg-white border-gray-200 hover:border-primary-500 hover:bg-primary-50'
                    }
                  `}
                >
                  {inst.logo ? (
                    <img
                      src={inst.logo}
                      alt={inst.name}
                      className="w-10 h-10 object-contain rounded-lg"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <Building2 size={24} className={isDark ? 'text-slate-400' : 'text-gray-400'} />
                  )}
                  <span className={`text-xs font-medium text-center leading-tight ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {inst.name}
                  </span>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="col-span-full py-8 text-center">
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Aucune banque trouvée pour "{search}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ArrowLeft size={16} />
          Retour
        </button>
      </ModalFooter>
    </>
  );
}

function RedirectingStep({ isDark, institution, onComplete, onBack }) {
  const [status, setStatus] = useState('redirecting'); // redirecting, checking, success, error
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemo) {
      // In demo mode, simulate the full flow
      const timer1 = setTimeout(() => setStatus('checking'), 1500);
      const timer2 = setTimeout(() => {
        setDetails({
          iban: 'FR76 1820 6000 4134 5678 9012 345',
          owner_name: 'SARL Bâti Plus',
          balance: 15432.67,
        });
        setStatus('success');
      }, 3000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }

    // In real mode, create requisition and redirect
    (async () => {
      try {
        const redirectUrl = `${window.location.origin}/bank/callback`;
        const result = await createConnection(institution, redirectUrl);
        if (result.link && result.link !== '#demo-redirect') {
          window.location.href = result.link;
        }
      } catch (e) {
        setError(e.message);
        setStatus('error');
      }
    })();
  }, [institution]);

  const formatIBAN = (iban) => {
    if (!iban) return '';
    const clean = iban.replace(/\s/g, '');
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  const maskIBAN = (iban) => {
    if (!iban) return '';
    const formatted = formatIBAN(iban);
    const parts = formatted.split(' ');
    if (parts.length <= 3) return formatted;
    return `${parts[0]} ${parts[1]} ${'•••• '.repeat(parts.length - 3)}${parts[parts.length - 1]}`;
  };

  return (
    <>
      <ModalBody>
        <div className="flex flex-col items-center py-8 space-y-6">
          {status === 'redirecting' && (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-primary-500/20' : 'bg-primary-100'}`}>
                <Loader2 size={32} className="text-primary-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Redirection vers {institution?.name}...
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Vous allez être redirigé vers votre banque pour autoriser l'accès
                </p>
              </div>
            </>
          )}

          {status === 'checking' && (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                <RefreshCw size={32} className="text-amber-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Vérification de la connexion...
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Récupération des informations de votre compte
                </p>
              </div>
            </>
          )}

          {status === 'success' && details && (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <Check size={32} className="text-emerald-500" />
              </div>
              <div className="text-center space-y-1">
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Compte connecté !
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {details.owner_name}
                </p>
              </div>

              {/* Account details card */}
              <div className={`w-full max-w-sm rounded-xl border p-5 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  {institution?.logo ? (
                    <img src={institution.logo} alt="" className="w-8 h-8 rounded-lg object-contain" />
                  ) : (
                    <Building2 size={24} className={isDark ? 'text-slate-400' : 'text-gray-400'} />
                  )}
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {institution?.name}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>IBAN</p>
                    <p className={`font-mono text-sm mt-0.5 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                      {maskIBAN(details.iban)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Solde</p>
                    <p className={`text-lg font-bold mt-0.5 ${details.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(details.balance)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Erreur de connexion
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  {error || 'Une erreur est survenue lors de la connexion'}
                </p>
              </div>
            </>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        {(status === 'error' || status === 'redirecting') && (
          <button
            onClick={onBack}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft size={16} />
            Retour
          </button>
        )}
        {status === 'success' && (
          <button
            onClick={() => onComplete(details)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            Première synchronisation
          </button>
        )}
      </ModalFooter>
    </>
  );
}

// ============================================================================
// Main Modal
// ============================================================================

export default function BankConnectionModal({
  isOpen,
  onClose,
  onConnected,
  isDark = false,
}) {
  const [step, setStep] = useState('loading'); // loading, api_keys, select_bank, redirecting
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  // Check if API keys are already configured
  useEffect(() => {
    if (!isOpen) {
      setStep('loading');
      setSelectedInstitution(null);
      return;
    }

    (async () => {
      try {
        const status = await getStatus();
        setStep(status.enabled ? 'select_bank' : 'api_keys');
      } catch {
        setStep('api_keys');
      }
    })();
  }, [isOpen]);

  const handleBankSelect = (institution) => {
    setSelectedInstitution(institution);
    setStep('redirecting');
  };

  const handleComplete = (details) => {
    onConnected?.(details);
    onClose();
  };

  const stepTitles = {
    loading: 'Connexion bancaire',
    api_keys: 'Configuration API',
    select_bank: 'Choisissez votre banque',
    redirecting: 'Connexion en cours',
  };

  const stepDescriptions = {
    loading: 'Chargement...',
    api_keys: 'Entrez vos identifiants GoCardless pour connecter votre banque',
    select_bank: 'Sélectionnez votre établissement bancaire pour commencer',
    redirecting: selectedInstitution?.name || 'Connexion en cours',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={step === 'select_bank' ? 'lg' : 'md'}
      isDark={isDark}
    >
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-primary-500/20' : 'bg-primary-100'}`}>
            <Building2 size={20} className="text-primary-500" />
          </div>
          <div>
            <ModalTitle>{stepTitles[step]}</ModalTitle>
            <ModalDescription>{stepDescriptions[step]}</ModalDescription>
          </div>
        </div>
      </ModalHeader>

      {step === 'loading' && (
        <ModalBody>
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-primary-500 animate-spin" />
          </div>
        </ModalBody>
      )}

      {step === 'api_keys' && (
        <ApiKeyStep
          isDark={isDark}
          onNext={() => setStep('select_bank')}
          onClose={onClose}
        />
      )}

      {step === 'select_bank' && (
        <BankSelectionStep
          isDark={isDark}
          onSelect={handleBankSelect}
          onBack={() => setStep('api_keys')}
        />
      )}

      {step === 'redirecting' && (
        <RedirectingStep
          isDark={isDark}
          institution={selectedInstitution}
          onComplete={handleComplete}
          onBack={() => setStep('select_bank')}
        />
      )}
    </Modal>
  );
}
