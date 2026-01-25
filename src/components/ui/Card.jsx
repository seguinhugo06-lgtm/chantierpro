import * as React from 'react';
import { cn } from '../../lib/utils';

// ============ CARD ROOT ============
const cardVariants = {
  default: 'bg-white border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700',
  elevated: 'bg-white shadow-md dark:bg-slate-800',
  outlined: 'bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700',
};

const cardPadding = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = React.forwardRef(
  (
    {
      className,
      variant = 'default',
      padding = 'none',
      hoverable = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl transition-all duration-200',
          cardVariants[variant],
          cardPadding[padding],
          hoverable && 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

// ============ CARD HEADER ============
export const CardHeader = React.forwardRef(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between p-6 pb-0', className)}
        {...props}
      >
        {children || (
          <>
            <div className="space-y-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              )}
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </>
        )}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

// ============ CARD CONTENT ============
export const CardContent = React.forwardRef(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6', className)} {...props} />;
  }
);
CardContent.displayName = 'CardContent';

// ============ CARD FOOTER ============
export const CardFooter = React.forwardRef(
  ({ className, bordered = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center p-6 pt-0',
          bordered && 'pt-6 mt-0 border-t border-gray-100 dark:border-slate-700',
          className
        )}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';

export default Card;
