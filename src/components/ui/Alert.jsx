import * as React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

const getVariantStyles = (isDark) => ({
  info: {
    container: isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: isDark ? 'text-blue-300' : 'text-blue-800',
    description: isDark ? 'text-blue-400' : 'text-blue-700',
  },
  success: {
    container: isDark ? 'bg-success-900/20 border-success-800' : 'bg-success-50 border-success-200',
    icon: 'text-success-500',
    title: isDark ? 'text-success-300' : 'text-success-800',
    description: isDark ? 'text-success-400' : 'text-success-700',
  },
  warning: {
    container: isDark ? 'bg-warning-900/20 border-warning-800' : 'bg-warning-50 border-warning-200',
    icon: 'text-warning-500',
    title: isDark ? 'text-warning-300' : 'text-warning-800',
    description: isDark ? 'text-warning-400' : 'text-warning-700',
  },
  danger: {
    container: isDark ? 'bg-danger-900/20 border-danger-800' : 'bg-danger-50 border-danger-200',
    icon: 'text-danger-500',
    title: isDark ? 'text-danger-300' : 'text-danger-800',
    description: isDark ? 'text-danger-400' : 'text-danger-700',
  },
});

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
      isDark = false,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(true);
    const styles = getVariantStyles(isDark)[variant];
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
              isDark ? 'hover:bg-white/10' : 'hover:bg-black/5',
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
