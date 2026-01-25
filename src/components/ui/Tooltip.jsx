import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Tooltip - Hover tooltip component
 *
 * @param {string} content - Tooltip text content
 * @param {string} side - Position: 'top' | 'bottom' | 'left' | 'right'
 * @param {number} delayDuration - Delay before showing (ms)
 * @param {ReactNode} children - Trigger element
 */

const positionStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowStyles = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-slate-700 border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-slate-700 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-slate-700 border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-slate-700 border-y-transparent border-l-transparent',
};

export const Tooltip = React.forwardRef(
  (
    {
      className,
      content,
      side = 'top',
      delayDuration = 300,
      children,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [shouldRender, setShouldRender] = React.useState(false);
    const timeoutRef = React.useRef(null);

    const showTooltip = React.useCallback(() => {
      timeoutRef.current = setTimeout(() => {
        setShouldRender(true);
        // Small delay for animation
        requestAnimationFrame(() => setIsVisible(true));
      }, delayDuration);
    }, [delayDuration]);

    const hideTooltip = React.useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsVisible(false);
      // Wait for animation before unmounting
      setTimeout(() => setShouldRender(false), 150);
    }, []);

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex', className)}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        {...props}
      >
        {children}

        {shouldRender && (
          <div
            role="tooltip"
            className={cn(
              'absolute z-tooltip px-3 py-1.5',
              'bg-gray-900 dark:bg-slate-700 text-white text-xs font-medium',
              'rounded-lg shadow-lg',
              'whitespace-nowrap',
              'transition-all duration-150',
              positionStyles[side],
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            )}
          >
            {content}
            {/* Arrow */}
            <span
              className={cn(
                'absolute w-0 h-0 border-4',
                arrowStyles[side]
              )}
            />
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';

export default Tooltip;
