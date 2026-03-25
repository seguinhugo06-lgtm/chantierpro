import { memo } from 'react';
import { X, AlertTriangle, Info, Bell } from 'lucide-react';

/**
 * NotificationStrip - Displays a single priority-sorted notification banner.
 *
 * Props:
 *  - isDark (boolean)
 *  - couleur (string, hex)
 *  - notifications (array of { id, message, type: 'urgent'|'warning'|'info', cta?, ctaLabel?, icon? })
 *  - onDismiss (function(id))
 *  - onAction (function(notification))
 */
const PRIORITY = { urgent: 0, warning: 1, info: 2 };

const TYPE_STYLES = {
  urgent: {
    light: {
      border: '#ef4444',
      bg: '#fef2f2',
      text: 'text-red-800',
      ctaBg: '#ef4444',
    },
    dark: {
      border: '#ef4444',
      bg: '#7f1d1d20',
      text: 'text-red-300',
      ctaBg: '#ef4444',
    },
  },
  warning: {
    light: {
      border: '#f59e0b',
      bg: '#fffbeb',
      text: 'text-amber-800',
      ctaBg: '#f59e0b',
    },
    dark: {
      border: '#f59e0b',
      bg: '#78350f20',
      text: 'text-amber-300',
      ctaBg: '#f59e0b',
    },
  },
  info: {
    light: {
      border: '#3b82f6',
      bg: '#eff6ff',
      text: 'text-blue-800',
      ctaBg: '#3b82f6',
    },
    dark: {
      border: '#3b82f6',
      bg: '#1e3a5f20',
      text: 'text-blue-300',
      ctaBg: '#3b82f6',
    },
  },
};

const TYPE_ICONS = {
  urgent: AlertTriangle,
  warning: Bell,
  info: Info,
};

const NotificationStrip = memo(function NotificationStrip({
  isDark,
  _couleur,
  notifications = [],
  onDismiss,
  onAction,
}) {
  if (!notifications || notifications.length === 0) return null;

  // Sort by priority, take the first (most urgent)
  const sorted = [...notifications].sort(
    (a, b) => (PRIORITY[a.type] ?? 2) - (PRIORITY[b.type] ?? 2)
  );
  const notif = sorted[0];
  const type = notif.type || 'info';
  const theme = isDark ? 'dark' : 'light';
  const styles = TYPE_STYLES[type]?.[theme] || TYPE_STYLES.info[theme];
  const _IconComponent = notif.icon || TYPE_ICONS[type] || Info;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 max-h-[56px] ${styles.text}`}
      style={{
        borderLeftColor: styles.border,
        backgroundColor: styles.bg,
      }}
      role="alert"
    >
      <IconComponent size={18} className="flex-shrink-0" style={{ color: styles.border }} />

      <p className="flex-1 text-sm font-medium truncate">{notif.message}</p>

      {notif.ctaLabel && onAction && (
        <button
          onClick={() => onAction(notif)}
          className="flex-shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: styles.ctaBg }}
        >
          {notif.ctaLabel}
        </button>
      )}

      {onDismiss && (
        <button
          onClick={() => onDismiss(notif.id)}
          className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
          }`}
          aria-label="Fermer la notification"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
});

export default NotificationStrip;
