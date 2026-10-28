import * as React from 'react';
import { cn } from '../../lib/utils';

// Tons du thème (src/lib/statuts.js : un statut = un mot et un ton) : contrastes garantis, clair et sombre.
const variantStyles = {
  default: 'bg-neutre-fond text-neutre-texte border-bord',
  secondary: 'bg-surface-2 text-encre-2 border-bord',
  success: 'bg-succes-fond text-succes-texte border-succes-point/40',
  warning: 'bg-alerte-fond text-alerte-texte border-alerte-point/40',
  danger: 'bg-danger-fond text-danger-texte border-danger-point/40',
  info: 'bg-info-fond text-info-texte border-info-point/40',
  primary: 'bg-accent/10 text-accent-texte border-accent/30',
};

const dotColors = {
  default: 'bg-neutre-point',
  secondary: 'bg-encre-3',
  success: 'bg-succes-point',
  warning: 'bg-alerte-point',
  danger: 'bg-danger-point',
  info: 'bg-info-point',
  primary: 'bg-accent',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = React.forwardRef(
  (
    {
      className,
      variant = 'default',
      size = 'sm',
      dot = false,
      pill = true,
      isDark: _isDark = false, // accepté, plus nécessaire : tons du thème
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium border',
          'transition-colors duration-150',
          variantStyles[variant],
          sizeStyles[size],
          pill ? 'rounded-full' : 'rounded-md',
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} aria-hidden="true" />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
