import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, User, Phone, Mail, MapPin, Building2, ChevronDown, ChevronUp, Check, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';
import FormError from './ui/FormError';

/**
 * QuickClientModal - Fast client creation with minimal friction
 * 2 required fields (nom, telephone) + expandable details
 * With real-time duplicate detection
 */
export default function QuickClientModal({
  isOpen,
  onClose,
  onSubmit,
  isDark = false,
  couleur = '#f97316',
  existingClients = [],
  onViewClient,
}) {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    entreprise: '',
    adresse: ''
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const inputRef = useRef(null);
  const dupeTimeoutRef = useRef(null);

  // Validation helpers
  const validateEmail = (email) => {
    if (!email) return true; // Optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // Optional field
    // French phone format: 10 digits, may have spaces/dots/dashes
    const cleaned = phone.replace(/[\s.\-]/g, '');
    return /^(0[1-9])\d{8}$/.test(cleaned);
  };

  // Duplicate detection
  const checkDuplicates = (field, value) => {
    if (!value || !existingClients.length) { setDuplicates([]); return; }
    const found = [];
    const normalizePhone = (p) => (p || '').replace(/[\s.\-+]/g, '');

    if (field === 'telephone') {
      const cleanVal = normalizePhone(value);
      if (cleanVal.length >= 6) {
        existingClients.forEach(c => {
          if (normalizePhone(c.telephone) === cleanVal) {
            found.push({ ...c, reason: 'Même téléphone' });
          }
        });
      }
    }

    if (field === 'nom') {
      const q = value.toLowerCase().trim();
      if (q.length >= 3) {
        existingClients.forEach(c => {
          const fullName = `${c.nom || ''} ${c.prenom || ''}`.toLowerCase().trim();
          const reverseName = `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().trim();
          if (fullName.includes(q) || reverseName.includes(q) || q.includes((c.nom || '').toLowerCase())) {
            if (!found.some(f => f.id === c.id)) {
              found.push({ ...c, reason: 'Nom similaire' });
            }
          }
        });
      }
    }

    setDuplicates(found.slice(0, 3));
  };

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  // Auto-focus on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setForm({ nom: '', prenom: '', telephone: '', email: '', entreprise: '', adresse: '' });
      setShowDetails(false);
      setIsSubmitting(false);
      setErrors({});
      setDuplicates([]);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    // Validate all fields
    const newErrors = {};

    if (!form.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (form.email && !validateEmail(form.email)) {
      newErrors.email = 'Format email invalide (ex: nom@email.fr)';
    }

    if (form.telephone && !validatePhone(form.telephone)) {
      newErrors.telephone = 'Format téléphone invalide (ex: 06 12 34 56 78)';
    }

    // If errors, show them and focus first error field
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus on first error field
      if (newErrors.nom) {
        inputRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // Simulate quick save animation
    await new Promise(r => setTimeout(r, 300));

    onSubmit({
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      entreprise: form.entreprise.trim(),
      adresse: form.adresse.trim()
    });

    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && form.nom.trim()) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const canSubmit = form.nom.trim().length > 0;

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
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
            className={`relative w-full sm:max-w-md ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden`}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onKeyDown={handleKeyDown}
          >
        {/* Header with gradient */}
        <div
          className="px-6 pt-6 pb-4"
          style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Nouveau client</h2>
                <p className="text-white/80 text-sm">Ajout rapide</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/20 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Form content */}
        <div className="p-6 space-y-4">
          {/* Essential fields - always visible */}
          <div className="space-y-3">
            {/* Nom field - required */}
            <div>
              <label htmlFor="qc-nom" className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <User size={14} style={{ color: couleur }} />
                Nom *
              </label>
              <input
                id="qc-nom"
                ref={inputRef}
                type="text"
                value={form.nom}
                onChange={e => {
                  const val = e.target.value;
                  setForm(p => ({ ...p, nom: val }));
                  if (errors.nom) setErrors(p => ({ ...p, nom: null }));
                  clearTimeout(dupeTimeoutRef.current);
                  dupeTimeoutRef.current = setTimeout(() => checkDuplicates('nom', val), 500);
                }}
                placeholder="Dupont"
                aria-required="true"
                aria-invalid={!!errors.nom}
                aria-describedby={errors.nom ? 'qc-nom-error' : undefined}
                className={`w-full px-4 py-3 border rounded-xl text-base transition-all focus:ring-2 focus:ring-offset-1 ${inputBg} ${errors.nom ? 'border-red-500 ring-red-500/20 ring-2' : ''}`}
                style={{ '--tw-ring-color': errors.nom ? '#ef4444' : couleur }}
              />
              <FormError id="qc-nom-error" message={errors.nom} />
            </div>

            {/* Prenom field */}
            <div>
              <label htmlFor="qc-prenom" className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <User size={14} className={textMuted} />
                Prénom
              </label>
              <input
                id="qc-prenom"
                type="text"
                value={form.prenom}
                onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                placeholder="Marie"
                className={`w-full px-4 py-3 border rounded-xl text-base ${inputBg}`}
              />
            </div>

            {/* Telephone field */}
            <div>
              <label htmlFor="qc-telephone" className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <Phone size={14} style={{ color: couleur }} />
                Téléphone
              </label>
              <input
                id="qc-telephone"
                type="tel"
                value={form.telephone}
                onChange={e => {
                  const val = e.target.value;
                  setForm(p => ({ ...p, telephone: val }));
                  if (errors.telephone) setErrors(p => ({ ...p, telephone: null }));
                  clearTimeout(dupeTimeoutRef.current);
                  dupeTimeoutRef.current = setTimeout(() => checkDuplicates('telephone', val), 500);
                }}
                placeholder="06 12 34 56 78"
                aria-invalid={!!errors.telephone}
                aria-describedby={errors.telephone ? 'qc-telephone-error' : undefined}
                className={`w-full px-4 py-3 border rounded-xl text-base ${inputBg} ${errors.telephone ? 'border-red-500 ring-red-500/20 ring-2' : ''}`}
              />
              <FormError id="qc-telephone-error" message={errors.telephone} />
            </div>
          </div>

          {/* Duplicate detection warning */}
          {duplicates.length > 0 && (
            <div className={`rounded-xl p-3 ${isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-amber-500" />
                <p className={`text-xs font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  Client(s) similaire(s) détecté(s)
                </p>
              </div>
              {duplicates.map(dup => (
                <div key={dup.id} className={`flex items-center gap-2 py-1.5 ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                  <span className="text-xs flex-1">
                    <span className="font-medium">{dup.nom} {dup.prenom}</span>
                    {dup.telephone && <span className={`ml-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>· {dup.telephone}</span>}
                    <span className={`ml-1 text-[10px] ${isDark ? 'text-amber-500' : 'text-amber-500'}`}>({dup.reason})</span>
                  </span>
                  {onViewClient && (
                    <button
                      onClick={(e) => { e.preventDefault(); onClose(); setTimeout(() => onViewClient(dup.id), 100); }}
                      className="text-[10px] font-medium flex items-center gap-0.5 px-2 py-1 rounded-md transition-colors hover:bg-amber-500/20"
                      style={{ color: couleur }}
                    >
                      Voir <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Expandable details section */}
          <div className={`border rounded-xl overflow-hidden transition-all ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
            >
              <span className={`text-sm font-medium ${textSecondary}`}>
                Ajouter plus de details
              </span>
              <motion.div
                animate={{ rotate: showDetails ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={18} className={textMuted} />
              </motion.div>
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`overflow-hidden border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                >
                  <div className="px-4 pb-4 pt-3 space-y-3">
                    <div>
                      <label htmlFor="qc-email" className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                        <Mail size={14} className={textMuted} />
                        Email
                      </label>
                      <input
                        id="qc-email"
                        type="email"
                        value={form.email}
                        onChange={e => {
                          setForm(p => ({ ...p, email: e.target.value }));
                          if (errors.email) setErrors(p => ({ ...p, email: null }));
                        }}
                        placeholder="marie.dupont@email.fr"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'qc-email-error' : undefined}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg} ${errors.email ? 'border-red-500 ring-red-500/20 ring-2' : ''}`}
                      />
                      <FormError id="qc-email-error" message={errors.email} />
                    </div>

                    <div>
                      <label htmlFor="qc-entreprise" className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                        <Building2 size={14} className={textMuted} />
                        Entreprise
                      </label>
                      <input
                        id="qc-entreprise"
                        type="text"
                        value={form.entreprise}
                        onChange={e => setForm(p => ({ ...p, entreprise: e.target.value }))}
                        placeholder="SCI Martin (optionnel)"
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                      />
                    </div>

                    <div>
                      <label htmlFor="qc-adresse" className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                        <MapPin size={14} className={textMuted} />
                        Adresse
                      </label>
                      <textarea
                        id="qc-adresse"
                        value={form.adresse}
                        onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))}
                        placeholder="12 rue des Lilas, 75011 Paris"
                        rows={2}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm resize-none ${inputBg}`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons - stack on mobile */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <button
              onClick={onClose}
              className={`w-full sm:flex-1 px-4 py-3 rounded-xl font-medium transition-all min-h-[48px] ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full sm:flex-1 px-4 py-3 rounded-xl font-medium text-white transition-all min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: couleur }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Ajout...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Ajouter</span>
                </>
              )}
            </button>
          </div>

          {/* Hint */}
          <p className={`text-center text-xs ${textMuted}`}>
            Appuyez sur Entree pour ajouter rapidement
          </p>
        </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
