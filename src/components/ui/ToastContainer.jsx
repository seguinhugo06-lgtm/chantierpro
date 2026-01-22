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
 * Color classes for toast types
 */
const colorMap = {
  success: {
    bg: 'bg-success-50 dark:bg-success-900/30',
    border: 'border-success-200 dark:border-success-700',
    text: 'text-success-800 dark:text-success-200',
    icon: 'text-success-500'
  },
  error: {
    bg: 'bg-danger-50 dark:bg-danger-900/30',
    border: 'border-danger-200 dark:border-danger-700',
    text: 'text-danger-800 dark:text-danger-200',
    icon: 'text-danger-500'
  },
  warning: {
    bg: 'bg-warning-50 dark:bg-warning-900/30',
    border: 'border-warning-200 dark:border-warning-700',
    text: 'text-warning-800 dark:text-warning-200',
    icon: 'text-warning-500'
  },
  info: {
    bg: 'bg-primary-50 dark:bg-primary-900/30',
    border: 'border-primary-200 dark:border-primary-700',
    text: 'text-primary-800 dark:text-primary-200',
    icon: 'text-primary-500'
  }
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
export default function ToastContainer({ position = 'bottom-right' }) {
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
      className={`fixed z-[200] flex flex-col gap-2 ${positionClasses[position]}`}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          const colors = colorMap[toast.type];

          return (
            <motion.div
              key={toast.id}
              layout
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
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
                    className="text-sm font-medium underline mt-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>

              {toast.dismissible !== false && (
                <button
                  onClick={() => removeToast(toast.id)}
                  className={`flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.text}`}
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
