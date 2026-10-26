import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, TrendingUp, Wallet, Mail, Image, BarChart3, Loader2 } from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';

const PERIODICITE_OPTIONS = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel',
};

// couleur reste acceptée : l'accent du thème suit la couleur de l'entreprise
export default function RapportConfigModal({ isOpen, onClose, isDark: _isDark, couleur: _couleur, entreprise }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    activite_actif: false,
    activite_periodicite: 'mensuel',
    financier_actif: false,
    financier_periodicite: 'trimestriel',
    destinataires: [],
    inclure_logo: true,
    inclure_graphiques: true,
  });
  const [emailInput, setEmailInput] = useState('');

  const cardBg = 'bg-surface';
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-3';
  const borderColor = 'border-bord';
  const inputBg = 'bg-surface text-encre';

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    if (isDemo || !supabase) {
      try {
        const saved = localStorage.getItem('cp_rapport_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          setForm(prev => ({ ...prev, ...parsed }));
          if (parsed.destinataires?.length === 0 && entreprise?.email) {
            setForm(prev => ({ ...prev, destinataires: [entreprise.email] }));
          }
        } else if (entreprise?.email) {
          setForm(prev => ({ ...prev, destinataires: [entreprise.email] }));
        }
      } catch { /* config démo illisible : on repart des valeurs par défaut */ }
      return;
    }
    try {
      const { data } = await supabase.rpc('get_or_create_rapport_config');
      if (data) {
        setForm({
          activite_actif: data.activite_actif || false,
          activite_periodicite: data.activite_periodicite || 'mensuel',
          financier_actif: data.financier_actif || false,
          financier_periodicite: data.financier_periodicite || 'trimestriel',
          destinataires: data.destinataires || [],
          inclure_logo: data.inclure_logo !== false,
          inclure_graphiques: data.inclure_graphiques !== false,
        });
        if ((!data.destinataires || data.destinataires.length === 0) && entreprise?.email) {
          setForm(prev => ({ ...prev, destinataires: [entreprise.email] }));
        }
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isDemo || !supabase) {
        localStorage.setItem('cp_rapport_config', JSON.stringify(form));
      } else {
        const { data: existing } = await supabase.rpc('get_or_create_rapport_config');
        if (existing) {
          await supabase.from('rapport_config').update({
            activite_actif: form.activite_actif,
            activite_periodicite: form.activite_periodicite,
            financier_actif: form.financier_actif,
            financier_periodicite: form.financier_periodicite,
            destinataires: form.destinataires,
            inclure_logo: form.inclure_logo,
            inclure_graphiques: form.inclure_graphiques,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        }
      }
      onClose();
    } catch (e) {
      console.error('Error saving config:', e);
    } finally {
      setSaving(false);
    }
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email && email.includes('@') && !form.destinataires.includes(email)) {
      setForm(prev => ({ ...prev, destinataires: [...prev.destinataires, email] }));
      setEmailInput('');
    }
  };

  const removeEmail = (email) => {
    setForm(prev => ({ ...prev, destinataires: prev.destinataires.filter(e => e !== email) }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
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
            className={`relative w-full max-w-lg ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor}`}>
              <h2 className={`text-lg font-bold ${textPrimary}`}>Rapports automatiques</h2>
              <button onClick={onClose} className={`p-2 rounded-xl transition-all hover:bg-surface-2`}>
                <X size={20} className={textMuted} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Activity report toggle */}
              <div className={`rounded-xl border ${borderColor} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-2 text-encre-2">
                      <TrendingUp size={16} aria-hidden="true" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${textPrimary}`}>Rapport d'activité</p>
                      <p className={`text-xs ${textMuted}`}>CA, devis, conversion, pipeline</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateField('activite_actif', !form.activite_actif)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.activite_actif ? 'bg-accent' : 'bg-bord-fort'}`}
                    role="switch"
                    aria-checked={!!form.activite_actif}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activite_actif ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {form.activite_actif && (
                  <div className="flex gap-2 mt-2">
                    {['mensuel', 'trimestriel'].map(p => (
                      <button
                        key={p}
                        onClick={() => updateField('activite_periodicite', p)}
                        className={`h-11 px-4 text-sm font-medium rounded-full transition-colors ${
                          form.activite_periodicite === p
                            ? 'bg-encre text-surface'
                            : 'bg-surface-2 text-encre-2'
                        }`}
                        aria-pressed={form.activite_periodicite === p}
                      >
                        {PERIODICITE_OPTIONS[p]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial report toggle */}
              <div className={`rounded-xl border ${borderColor} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-2 text-encre-2">
                      <Wallet size={16} aria-hidden="true" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${textPrimary}`}>Rapport financier</p>
                      <p className={`text-xs ${textMuted}`}>Trésorerie, marges, TVA, dépenses</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateField('financier_actif', !form.financier_actif)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.financier_actif ? 'bg-accent' : 'bg-bord-fort'}`}
                    role="switch"
                    aria-checked={!!form.financier_actif}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.financier_actif ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {form.financier_actif && (
                  <div className="flex gap-2 mt-2">
                    {['mensuel', 'trimestriel', 'annuel'].map(p => (
                      <button
                        key={p}
                        onClick={() => updateField('financier_periodicite', p)}
                        className={`h-11 px-4 text-sm font-medium rounded-full transition-colors ${
                          form.financier_periodicite === p
                            ? 'bg-encre text-surface'
                            : 'bg-surface-2 text-encre-2'
                        }`}
                        aria-pressed={form.financier_periodicite === p}
                      >
                        {PERIODICITE_OPTIONS[p]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destinataires */}
              <div>
                <label className={`text-sm font-semibold ${textPrimary} flex items-center gap-2 mb-2`}>
                  <Mail size={14} /> Destinataires
                </label>
                <p className={`text-xs ${textMuted} mb-3`}>
                  Les rapports seront envoyés par email à ces adresses
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="email@exemple.com"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm border ${borderColor} ${inputBg} focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent`}
                  />
                  <button
                    onClick={addEmail}
                    disabled={!emailInput.trim()}
                    className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all bg-accent text-sur-accent"
                  >
                    Ajouter
                  </button>
                </div>
                {form.destinataires.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.destinataires.map(email => (
                      <span
                        key={email}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-2 text-encre-2`}
                      >
                        {email}
                        <button onClick={() => removeEmail(email)} className="hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className={`text-sm font-semibold ${textPrimary} mb-2 block`}>Options</label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className={`text-sm ${textSecondary} flex items-center gap-2`}>
                    <Image size={14} /> Inclure le logo de l'entreprise
                  </span>
                  <button
                    onClick={() => updateField('inclure_logo', !form.inclure_logo)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.inclure_logo ? 'bg-accent' : 'bg-bord-fort'}`}
                    role="switch"
                    aria-checked={!!form.inclure_logo}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.inclure_logo ? 'translate-x-5' : ''}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className={`text-sm ${textSecondary} flex items-center gap-2`}>
                    <BarChart3 size={14} /> Inclure les graphiques
                  </span>
                  <button
                    onClick={() => updateField('inclure_graphiques', !form.inclure_graphiques)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.inclure_graphiques ? 'bg-accent' : 'bg-bord-fort'}`}
                    role="switch"
                    aria-checked={!!form.inclure_graphiques}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.inclure_graphiques ? 'translate-x-5' : ''}`} />
                  </button>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${borderColor}`}>
              <button
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  'bg-surface-2 text-encre-2 hover:bg-bord'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2 bg-accent text-sur-accent"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Enregistrement...</>
                ) : (
                  <><Save size={16} /> Enregistrer</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
