import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';

/**
 * SuccessModal - Animated success feedback
 *
 * @param {Object} props
 * @param {string} props.title - Success title
 * @param {string} props.message - Success message
 * @param {Object} props.action - Optional action button
 * @param {string} props.action.label - Action button label
 * @param {Function} props.action.onClick - Action button click handler
 * @param {boolean} props.autoClose - Auto-close after delay
 * @param {number} props.autoCloseDelay - Auto-close delay in ms
 * @param {Function} props.onClose - Callback to close modal
 */
export default function SuccessModal({
  title = 'Operation reussie !',
  message,
  action,
  autoClose = true,
  autoCloseDelay = 3000,
  onClose
}) {
  // Auto-close after delay
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose?.();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  return (
    <div className="p-8 text-center">
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1, bounce: 0.5 }}
        className="w-20 h-20 mx-auto bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.3, bounce: 0.5 }}
        >
          <Check size={40} className="text-success-500" strokeWidth={3} />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 text-xl font-bold text-slate-900 dark:text-white"
      >
        {title}
      </motion.h3>

      {/* Message */}
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-slate-600 dark:text-slate-300"
        >
          {message}
        </motion.p>
      )}

      {/* Action button */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <button
            onClick={() => {
              action.onClick?.();
              onClose?.();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-success-500 hover:bg-success-600 text-white font-medium rounded-xl transition-colors"
          >
            {action.label}
            <ChevronRight size={18} />
          </button>
        </motion.div>
      )}

      {/* Auto-close indicator */}
      {autoClose && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4"
        >
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Fermeture automatique...
          </p>
          <motion.div
            className="mt-2 h-1 bg-success-200 dark:bg-success-800 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-success-500"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
