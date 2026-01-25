import * as React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

const variantStyles = {
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: 'text-blue-500',
    title: 'text-blue-800 dark:text-blue-300',
    description: 'text-blue-700 dark:text-blue-400',
  },
  success: {
    container: 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800',
    icon: 'text-success-500',
    title: 'text-success-800 dark:text-success-300',
    description: 'text-success-700 dark:text-success-400',
  },
  warning: {
    container: 'bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800',
    icon: 'text-warning-500',
    title: 'text-warning-800 dark:text-warning-300',
    description: 'text-warning-700 dark:text-warning-400',
  },
  danger: {
    container: 'bg-danger-50 border-danger-200 dark:bg-danger-900/20 dark:border-danger-800',
    icon: 'text-danger-500',
    title: 'text-danger-800 dark:text-danger-300',
    description: 'text-danger-700 dark:text-danger-400',
  },
};

const variantIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export const Alert = React.forwardRef(
  (
    {
      className,
      variant = 'info',
      title,
      children,
      icon,
      dismissible = false,
      onDismiss,
      action,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(true);
    const styles = variantStyles[variant];
    const IconComponent = icon || variantIcons[variant];

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative flex gap-3 p-4 rounded-xl border',
          styles.container,
          className
        )}
        {...props}
      >
        <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
          <IconComponent size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className={cn('font-semibold text-sm mb-1', styles.title)}>
              {title}
            </h5>
          )}
          {children && (
            <div className={cn('text-sm', styles.description)}>
              {children}
            </div>
          )}
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>

        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 p-1 rounded-lg transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/10',
              styles.icon
            )}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;
