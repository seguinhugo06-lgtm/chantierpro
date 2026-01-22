import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, MessageSquare, Check } from 'lucide-react';

/**
 * NoteModal - Clean modal to replace native prompt()
 * Used for adding notes to time entries
 */
export default function NoteModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Ajouter une note',
  placeholder = 'Note (optionnel)...',
  isDark = false,
  couleur = '#f97316'
}) {
  const [note, setNote] = useState('');
  const inputRef = useRef(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Auto-focus on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setNote('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    onSubmit(note.trim());
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

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
            {/* Header */}
            <div
              className="px-6 pt-6 pb-4"
              style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <MessageSquare size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <p className="text-white/80 text-sm">Optionnel</p>
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

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <textarea
                  ref={inputRef}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-xl text-base resize-none ${inputBg}`}
                />
                <p className={`text-xs mt-2 ${textMuted}`}>
                  Appuyez sur Entree pour confirmer
                </p>
              </div>

              {/* Quick notes */}
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${textMuted}`}>Notes rapides</p>
                <div className="flex flex-wrap gap-2">
                  {['Pause dejeuner', 'Trajet inclus', 'Heures sup', 'Absence partielle'].map(quickNote => (
                    <button
                      key={quickNote}
                      onClick={() => setNote(quickNote)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        note === quickNote
                          ? 'text-white'
                          : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      style={note === quickNote ? { background: couleur } : {}}
                    >
                      {quickNote}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all min-h-[48px] ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Passer
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-white transition-all min-h-[48px] flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98]"
                  style={{ backgroundColor: couleur }}
                >
                  <Check size={18} />
                  <span>Confirmer</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
