import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Toast - Notification component
 *
 * Usage with useToast hook:
 * const { showToast } = useToast();
 * showToast('Message saved!', 'success');
 */

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const TOAST_STYLES = {
  success: {
    bg: 'bg-emerald-500',
    darkBg: 'bg-emerald-600',
    text: 'text-white'
  },
  error: {
    bg: 'bg-red-500',
    darkBg: 'bg-red-600',
    text: 'text-white'
  },
  warning: {
    bg: 'bg-amber-500',
    darkBg: 'bg-amber-600',
    text: 'text-white'
  },
  info: {
    bg: 'bg-blue-500',
    darkBg: 'bg-blue-600',
    text: 'text-white'
  }
};

export function Toast({
  message,
  type = 'info',
  isVisible,
  onClose,
  duration = 3000,
  isDark = false,
  action
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Slight delay for animation
      requestAnimationFrame(() => setShow(true));

      if (duration > 0) {
        const timer = setTimeout(() => {
          setShow(false);
          setTimeout(onClose, 300); // Wait for exit animation
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !show) return null;

  const Icon = TOAST_ICONS[type];
  const style = TOAST_STYLES[type];

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 z-50
        transform -translate-x-1/2
        transition-all duration-300 ease-out
        ${show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`
          flex items-center gap-3
          px-4 py-3 rounded-xl
          shadow-lg
          ${isDark ? style.darkBg : style.bg}
          ${style.text}
        `}
      >
        {Icon && <Icon size={20} aria-hidden="true" />}

        <span className="text-sm font-medium max-w-xs">
          {message}
        </span>

        {action && (
          <button
            onClick={action.onClick}
            className="ml-2 px-2 py-1 text-xs font-bold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            {action.label}
          </button>
        )}

        <button
          onClick={() => {
            setShow(false);
            setTimeout(onClose, 300);
          }}
          className="ml-2 p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * ToastContainer - Manages multiple toasts
 */
export function ToastContainer({ toasts = [], onDismiss, isDark = false }) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => onDismiss(toast.id)}
          duration={toast.duration}
          isDark={isDark}
          action={toast.action}
        />
      ))}
    </div>
  );
}

/**
 * Snackbar - Alternative toast style (bottom of screen)
 */
export function Snackbar({
  message,
  isVisible,
  onClose,
  action,
  isDark = false,
  duration = 4000
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => setShow(true));

      if (duration > 0) {
        const timer = setTimeout(() => {
          setShow(false);
          setTimeout(onClose, 300);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !show) return null;

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 z-50
        transform -translate-x-1/2
        transition-all duration-300 ease-out
        ${show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`
          flex items-center gap-4
          px-4 py-3 rounded-xl
          shadow-lg
          min-w-[300px] max-w-md
          ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'}
        `}
      >
        <span className="flex-1 text-sm">
          {message}
        </span>

        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wide"
          >
            {action.label}
          </button>
        )}

        <button
          onClick={() => {
            setShow(false);
            setTimeout(onClose, 300);
          }}
          className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export default Toast;
