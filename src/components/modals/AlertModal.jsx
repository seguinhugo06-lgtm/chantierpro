import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';

/**
 * AlertModal - Simple alert/info dialog
 *
 * @param {Object} props
 * @param {string} props.title - Alert title
 * @param {string} props.message - Alert message
 * @param {'info' | 'warning' | 'error' | 'success'} props.type - Alert type
 * @param {string} props.buttonText - Button text
 * @param {Function} props.onClose - Callback to close modal
 */
export default function AlertModal({
  title = 'Information',
  message,
  type = 'info',
  buttonText = 'Compris',
  onClose
}) {
  const typeConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-500',
      buttonColor: 'bg-primary-500 hover:bg-primary-600'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning-100 dark:bg-warning-900/30',
      iconColor: 'text-warning-500',
      buttonColor: 'bg-warning-500 hover:bg-warning-600'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-danger-100 dark:bg-danger-900/30',
      iconColor: 'text-danger-500',
      buttonColor: 'bg-danger-500 hover:bg-danger-600'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success-100 dark:bg-success-900/30',
      iconColor: 'text-success-500',
      buttonColor: 'bg-success-500 hover:bg-success-600'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
          <Icon size={24} className={config.iconColor} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          {message && (
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {message}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className={`px-6 py-2.5 rounded-xl font-medium text-white transition-colors ${config.buttonColor}`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
