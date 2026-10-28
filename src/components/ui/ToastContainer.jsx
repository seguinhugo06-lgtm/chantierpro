import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';

/**
 * Icon mapping for toast types
 */
const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

/**
 * Tons des notifications (src/lib/statuts.js) : un fond, un trait et un texte par ton, clair et sombre par les jetons du thème
 */
const COLOR_MAP = {
  success: { bg: 'bg-succes-fond', border: 'border-succes-point/40', text: 'text-succes-texte', icon: 'text-succes-point' },
  error: { bg: 'bg-danger-fond', border: 'border-danger-point/40', text: 'text-danger-texte', icon: 'text-danger-point' },
  warning: { bg: 'bg-alerte-fond', border: 'border-alerte-point/40', text: 'text-alerte-texte', icon: 'text-alerte-point' },
  info: { bg: 'bg-info-fond', border: 'border-info-point/40', text: 'text-info-texte', icon: 'text-info-point' },
};

/**
 * ToastContainer - Renders toast notifications with animations
 *
 * Place this component once at the root of your app.
 * Uses Zustand store for state management.
 *
 * @param {Object} props
 * @param {'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'} props.position
 */
export default function ToastContainer({ position = 'bottom-right', isDark: _isDark = false }) {
  const { toasts, removeToast } = useToastStore();

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };

  // Animation variants based on position
  const isTop = position.startsWith('top');
  const isRight = position.includes('right');

  const variants = {
    initial: {
      opacity: 0,
      y: isTop ? -20 : 20,
      x: position.includes('center') ? 0 : isRight ? 20 : -20,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      x: position.includes('center') ? 0 : isRight ? 100 : -100,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div
      className={`fixed z-[1080] flex flex-col gap-2 ${positionClasses[position]}`}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          const colors = COLOR_MAP[toast.type];

          return (
            <motion.div
              key={toast.id}
              layout
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              role={toast.type === 'error' ? 'alert' : 'status'}
              aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
              className={`
                flex items-start gap-3 p-4 rounded-xl border shadow-lg
                min-w-[300px] max-w-[400px]
                ${colors.bg} ${colors.border}
              `}
            >
              <Icon size={20} className={`flex-shrink-0 mt-0.5 ${colors.icon}`} />

              <div className={`flex-1 min-w-0 ${colors.text}`}>
                <p className="font-medium">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm opacity-80 mt-0.5">{toast.message}</p>
                )}
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action.onClick?.();
                      removeToast(toast.id);
                    }}
                    className="text-sm font-medium underline mt-2 hover:no-underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>

              {toast.dismissible !== false && (
                <button
                  onClick={() => removeToast(toast.id)}
                  className={`flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity p-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${colors.text}`}
                  aria-label="Fermer la notification"
                >
                  <X size={16} />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
