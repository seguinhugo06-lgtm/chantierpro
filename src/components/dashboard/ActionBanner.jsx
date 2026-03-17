import * as React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

/**
 * @typedef {Object} ActionBannerProps
 * @property {React.ReactNode} icon - Icon component to display
 * @property {'high' | 'medium' | 'low'} priority - Priority level for styling
 * @property {string} title - Banner title (e.g., "Action prioritaire")
 * @property {string} description - Banner description (e.g., "Relancer 2 devis en attente")
 * @property {string} [value] - Optional value display (e.g., "14 400 €")
 * @property {string} ctaLabel - CTA button label (e.g., "Relancer maintenant")
 * @property {() => void} ctaAction - CTA button click handler
 * @property {() => void} [onDismiss] - Optional dismiss handler
 * @property {string} [className] - Additional CSS classes
 */

// Priority-based styling configurations
const getPriorityConfig = (isDark) => ({
  high: {
    container: isDark
      ? 'bg-gradient-to-r from-blue-900/20 to-blue-800/20 border-l-4 border-l-blue-500'
      : 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-l-blue-500',
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
    title: isDark ? 'text-blue-400' : 'text-blue-700',
    value: isDark ? 'text-blue-400' : 'text-blue-700',
    button: 'primary',
  },
  medium: {
    container: isDark
      ? 'bg-gradient-to-r from-primary-900/20 to-primary-800/20 border-l-4 border-l-primary-500'
      : 'bg-gradient-to-r from-primary-50 to-primary-100 border-l-4 border-l-primary-500',
    iconBg: 'bg-primary-500',
    iconColor: 'text-white',
    title: isDark ? 'text-primary-400' : 'text-primary-700',
    value: isDark ? 'text-primary-400' : 'text-primary-700',
    button: 'secondary',
  },
  low: {
    container: isDark
      ? 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-l-4 border-l-gray-400'
      : 'bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-l-gray-400',
    iconBg: isDark ? 'bg-gray-600' : 'bg-gray-500',
    iconColor: 'text-white',
    title: isDark ? 'text-gray-400' : 'text-gray-600',
    value: isDark ? 'text-gray-300' : 'text-gray-700',
    button: 'outline',
  },
});

/**
 * ActionBanner - Priority action banner for dashboard
 *
 * @param {ActionBannerProps} props
 */
const ActionBanner = React.forwardRef(
  (
    {
      icon,
      priority = 'medium',
      title,
      description,
      value,
      ctaLabel,
      ctaAction,
      onDismiss,
      isDark = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [isExiting, setIsExiting] = React.useState(false);
    const priorityConfig = getPriorityConfig(isDark);
    const config = priorityConfig[priority] || priorityConfig.medium;

    // Slide-in animation on mount
    React.useEffect(() => {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }, []);

    // Handle dismiss with exit animation
    const handleDismiss = () => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss?.();
      }, 300);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative p-4 rounded-xl transition-all duration-300 ease-out',
          config.container,
          // Animation states
          isVisible && !isExiting
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4',
          className
        )}
        {...props}
      >
        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            className={cn('absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 transition-colors', isDark ? 'hover:text-gray-300 hover:bg-black/20' : 'hover:text-gray-600 hover:bg-white/50')}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icon + Content */}
          <div className="flex items-start gap-3 flex-1">
            {/* Icon container */}
            <div
              className={cn(
                'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg',
                config.iconBg
              )}
            >
              {React.isValidElement(icon) &&
                React.cloneElement(icon, {
                  className: cn('w-5 h-5', config.iconColor),
                })}
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0 pr-6 sm:pr-0">
              {/* Title */}
              <p
                className={cn(
                  'text-xs font-semibold uppercase tracking-wide mb-1',
                  config.title
                )}
              >
                {title}
              </p>

              {/* Description */}
              <p className={cn('text-base font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                {description}
              </p>

              {/* Value */}
              {value && (
                <p className={cn('text-sm font-bold mt-1', config.value)}>
                  Valeur potentielle : {value}
                </p>
              )}
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex-shrink-0 sm:ml-4">
            <Button
              variant={config.button}
              onClick={ctaAction}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

ActionBanner.displayName = 'ActionBanner';

export default ActionBanner;

/**
 * ActionBannerStack - Container for multiple action banners
 */
export function ActionBannerStack({ children, className }) {
  return (
    <div className={cn('space-y-3', className)}>
      {children}
    </div>
  );
}
