import { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Mail, MapPin, Building2, ChevronDown, ChevronUp, Check, Sparkles } from 'lucide-react';

/**
 * QuickClientModal - Fast client creation with minimal friction
 * 2 required fields (nom, telephone) + expandable details
 */
export default function QuickClientModal({
  isOpen,
  onClose,
  onSubmit,
  isDark = false,
  couleur = '#f97316'
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
  const inputRef = useRef(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

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
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!form.nom.trim()) return;

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

  if (!isOpen) return null;

  const canSubmit = form.nom.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full sm:max-w-md ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden`}
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
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
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
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <User size={14} style={{ color: couleur }} />
                Nom *
              </label>
              <input
                ref={inputRef}
                type="text"
                value={form.nom}
                onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                placeholder="Dupont"
                className={`w-full px-4 py-3 border rounded-xl text-base transition-all focus:ring-2 focus:ring-offset-1 ${inputBg}`}
                style={{ '--tw-ring-color': couleur }}
              />
            </div>

            {/* Prenom field */}
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <User size={14} className={textMuted} />
                Prenom
              </label>
              <input
                type="text"
                value={form.prenom}
                onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                placeholder="Marie"
                className={`w-full px-4 py-3 border rounded-xl text-base ${inputBg}`}
              />
            </div>

            {/* Telephone field */}
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                <Phone size={14} style={{ color: couleur }} />
                Telephone
              </label>
              <input
                type="tel"
                value={form.telephone}
                onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                placeholder="06 12 34 56 78"
                className={`w-full px-4 py-3 border rounded-xl text-base ${inputBg}`}
              />
            </div>
          </div>

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
              {showDetails ? (
                <ChevronUp size={18} className={textMuted} />
              ) : (
                <ChevronDown size={18} className={textMuted} />
              )}
            </button>

            {showDetails && (
              <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="pt-3">
                  <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                    <Mail size={14} className={textMuted} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="marie.dupont@email.fr"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                    <Building2 size={14} className={textMuted} />
                    Entreprise
                  </label>
                  <input
                    type="text"
                    value={form.entreprise}
                    onChange={e => setForm(p => ({ ...p, entreprise: e.target.value }))}
                    placeholder="SCI Martin (optionnel)"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${textPrimary}`}>
                    <MapPin size={14} className={textMuted} />
                    Adresse
                  </label>
                  <textarea
                    value={form.adresse}
                    onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))}
                    placeholder="12 rue des Lilas, 75011 Paris"
                    rows={2}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm resize-none ${inputBg}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all min-h-[48px] ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl font-medium text-white transition-all min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg active:scale-[0.98]"
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
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
