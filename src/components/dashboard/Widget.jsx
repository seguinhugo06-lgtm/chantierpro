/**
 * Widget Component System
 * Composable widget containers for dashboard
 *
 * Design System:
 * - 20px/24px padding
 * - 16px border-radius
 * - Subtle shadows with hover elevation
 * - Clean header/content/footer separation
 *
 * @module Widget
 */

import * as React from 'react';
import { MoreVertical, FileQuestion, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

// ============ WIDGET SKELETON ============

function WidgetSkeleton({ rows = 3, isDark = false }) {
  return (
    <div className="animate-pulse space-y-5">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl', isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]')} />
          <div className={cn('h-5 w-32 rounded-md', isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]')} />
        </div>
        <div className={cn('w-8 h-8 rounded-lg', isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]')} />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl', isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]')} />
            <div className="flex-1 space-y-2">
              <div
                className={cn('h-4 rounded-md', isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]')}
                style={{ width: `${70 + Math.random() * 30}%` }}
              />
              <div
                className={cn('h-3 rounded', isDark ? 'bg-[#161616]' : 'bg-[#fafafa]')}
                style={{ width: `${40 + Math.random() * 30}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className={cn('pt-4 border-t', isDark ? 'border-[#262626]' : 'border-[#ebebeb]')}>
        <div className={cn('h-8 w-24 rounded-lg', isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]')} />
      </div>
    </div>
  );
}

// ============ WIDGET EMPTY STATE ============

export function WidgetEmptyState({
  icon,
  title = 'Aucune donnée',
  description = "Il n'y a rien à afficher pour le moment.",
  ctaLabel,
  onCtaClick,
  isDark = false,
  className,
}) {
  return (
    <div
      className={cn(
        // Empty state container with dashed border
        'flex flex-col items-center justify-center py-8 px-4 text-center',
        'rounded-lg',
        isDark ? 'bg-[#161616]/50 border-[#262626]' : 'bg-[#fafafa] border-[#ebebeb]',
        'border-2 border-dashed',
        className
      )}
    >
      {/* Icon - WCAG AA visible */}
      <div className={cn(
        'flex items-center justify-center w-14 h-14 rounded-xl mb-4',
        isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]'
      )}>
        {icon ? (
          React.isValidElement(icon) &&
          React.cloneElement(icon, {
            className: cn('w-7 h-7', isDark ? 'text-[#666]' : 'text-[#999]'),
          })
        ) : (
          <FileQuestion className={cn('w-7 h-7', isDark ? 'text-[#666]' : 'text-[#999]')} />
        )}
      </div>

      {/* Title */}
      <p className={cn(
        'text-base font-semibold mb-1',
        isDark ? 'text-[#f5f5f5]' : 'text-[#1a1a1a]'
      )}>
        {title}
      </p>

      {/* Description */}
      <p className={cn(
        'text-sm max-w-[240px] leading-relaxed',
        isDark ? 'text-[#666]' : 'text-[#666]'
      )}>
        {description}
      </p>

      {/* CTA */}
      {ctaLabel && onCtaClick && (
        <button
          type="button"
          onClick={onCtaClick}
          className="
            mt-4 px-4 py-2 rounded-lg
            bg-primary-500 hover:bg-primary-600
            text-white text-sm font-medium
            shadow-sm hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            active:scale-95
            transition-all duration-150
          "
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

// ============ WIDGET HEADER ============

export const WidgetHeader = React.forwardRef(
  ({ title, icon, badge, actions, isDark = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between mb-5', className)}
        {...props}
      >
        {/* Title with optional icon */}
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl',
              isDark ? 'bg-[#1e1e1e]/50' : 'bg-[#fafafa]'
            )}>
              {React.isValidElement(icon) &&
                React.cloneElement(icon, {
                  className: cn('w-[18px] h-[18px]', isDark ? 'text-[#666]' : 'text-[#999]'),
                })}
            </div>
          )}
          <h2 className={cn(
            'text-base font-semibold',
            isDark ? 'text-[#f5f5f5]' : 'text-[#1a1a1a]'
          )}>
            {title}
          </h2>
          {badge && (
            <span className={cn(
              'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
              isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-600'
            )}>
              {badge}
            </span>
          )}
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
    );
  }
);

WidgetHeader.displayName = 'WidgetHeader';

// ============ WIDGET CONTENT ============

export const WidgetContent = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex-1 min-h-0', className)} {...props}>
        {children}
      </div>
    );
  }
);

WidgetContent.displayName = 'WidgetContent';

// ============ WIDGET FOOTER ============

export const WidgetFooter = React.forwardRef(
  ({ isDark = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between pt-4 mt-auto border-t',
          isDark ? 'border-[#262626]' : 'border-[#ebebeb]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

WidgetFooter.displayName = 'WidgetFooter';

// ============ WIDGET MENU BUTTON ============

export function WidgetMenuButton({ onClick, isDark = false, className, title = "Voir tout" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-2 rounded-md transition-all duration-150',
        isDark
          ? 'text-[#666] hover:text-[#a0a0a0] hover:bg-[#1e1e1e]'
          : 'text-[#999] hover:text-[#666] hover:bg-[#f5f5f5]',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'active:scale-95',
        className
      )}
      aria-label={title}
      title={title}
    >
      <MoreVertical className="w-[18px] h-[18px]" />
    </button>
  );
}

// ============ WIDGET LINK ============

export function WidgetLink({ href, onClick, isDark = false, children, className }) {
  const Component = href ? 'a' : 'button';

  return (
    <Component
      href={href}
      onClick={onClick}
      type={href ? undefined : 'button'}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isDark
          ? 'text-primary-400 hover:text-primary-300'
          : 'text-primary-600 hover:text-primary-700',
        'transition-colors duration-200',
        'group',
        className
      )}
    >
      {children}
      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
    </Component>
  );
}

// ============ WIDGET TABS ============

export function WidgetTabs({ tabs, activeTab, onTabChange, isDark = false, className }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 p-1 rounded-xl',
        isDark ? 'bg-[#1e1e1e]/50' : 'bg-[#f5f5f5]',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200',
            activeTab === tab.value
              ? isDark
                ? 'bg-[#262626] text-[#f5f5f5] shadow-sm'
                : 'bg-white text-[#1a1a1a] shadow-sm'
              : isDark
                ? 'text-[#666] hover:text-[#a0a0a0]'
                : 'text-[#999] hover:text-[#666]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============ WIDGET (MAIN CONTAINER) ============

const Widget = React.forwardRef(
  (
    {
      loading = false,
      empty = false,
      emptyState,
      isDark = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles — Linear-inspired
          'rounded-xl overflow-hidden border',
          isDark ? 'bg-[#161616] border-gray-800/60' : 'bg-white border-gray-200/70',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
          'hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]',
          'p-5 sm:p-6',
          'transition-all duration-200',
          'flex flex-col h-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <WidgetSkeleton isDark={isDark} />
        ) : empty ? (
          emptyState || <WidgetEmptyState isDark={isDark} />
        ) : (
          children
        )}
      </div>
    );
  }
);

Widget.displayName = 'Widget';

export default Widget;
