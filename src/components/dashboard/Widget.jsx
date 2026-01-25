import * as React from 'react';
import { MoreVertical, FileQuestion } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

/**
 * @typedef {Object} WidgetProps
 * @property {boolean} [loading] - Show loading skeleton
 * @property {boolean} [empty] - Show empty state
 * @property {React.ReactNode} [emptyState] - Custom empty state content
 * @property {string} [className] - Additional CSS classes
 * @property {React.ReactNode} children - Widget content
 */

/**
 * @typedef {Object} WidgetHeaderProps
 * @property {string} title - Widget title
 * @property {React.ReactNode} [icon] - Icon component
 * @property {React.ReactNode} [actions] - Action buttons/menu
 * @property {string} [className] - Additional CSS classes
 */

/**
 * @typedef {Object} WidgetContentProps
 * @property {string} [className] - Additional CSS classes
 * @property {React.ReactNode} children - Content
 */

/**
 * @typedef {Object} WidgetFooterProps
 * @property {string} [className] - Additional CSS classes
 * @property {React.ReactNode} children - Footer content
 */

/**
 * @typedef {Object} WidgetEmptyStateProps
 * @property {React.ReactNode} [icon] - Custom icon
 * @property {string} [title] - Empty state title
 * @property {string} [description] - Empty state description
 * @property {string} [ctaLabel] - CTA button label
 * @property {() => void} [onCtaClick] - CTA click handler
 * @property {string} [className] - Additional CSS classes
 */

// ============ WIDGET SKELETON ============
function WidgetSkeleton({ rows = 3 }) {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-slate-700" />
        </div>
        <div className="w-8 h-8 rounded bg-gray-200 dark:bg-slate-700" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div
                className="h-4 rounded bg-gray-200 dark:bg-slate-700"
                style={{ width: `${70 + Math.random() * 30}%` }}
              />
              <div
                className="h-3 rounded bg-gray-100 dark:bg-slate-800"
                style={{ width: `${40 + Math.random() * 30}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
        <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

// ============ WIDGET EMPTY STATE ============
/**
 * WidgetEmptyState - Default empty state for widgets
 *
 * @param {WidgetEmptyStateProps} props
 */
export function WidgetEmptyState({
  icon,
  title = 'Aucune donnée',
  description = "Il n'y a rien à afficher pour le moment.",
  ctaLabel,
  onCtaClick,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8 px-4 text-center',
        className
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
        {icon ? (
          React.isValidElement(icon) &&
          React.cloneElement(icon, {
            className: 'w-8 h-8 text-gray-400 dark:text-gray-500',
          })
        ) : (
          <FileQuestion className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Title */}
      <p className="text-base font-medium text-gray-900 dark:text-white mb-1">
        {title}
      </p>

      {/* Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {description}
      </p>

      {/* CTA */}
      {ctaLabel && onCtaClick && (
        <Button
          variant="primary"
          size="sm"
          onClick={onCtaClick}
          className="mt-4"
        >
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}

// ============ WIDGET HEADER ============
/**
 * WidgetHeader - Widget header with title, icon, and actions
 *
 * @param {WidgetHeaderProps} props
 */
export const WidgetHeader = React.forwardRef(
  ({ title, icon, actions, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-slate-700',
          className
        )}
        {...props}
      >
        {/* Title with optional icon */}
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-gray-500 dark:text-gray-400">
              {React.isValidElement(icon) &&
                React.cloneElement(icon, {
                  className: 'w-5 h-5',
                })}
            </span>
          )}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }
);

WidgetHeader.displayName = 'WidgetHeader';

// ============ WIDGET CONTENT ============
/**
 * WidgetContent - Widget content container
 *
 * @param {WidgetContentProps} props
 */
export const WidgetContent = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {children}
      </div>
    );
  }
);

WidgetContent.displayName = 'WidgetContent';

// ============ WIDGET FOOTER ============
/**
 * WidgetFooter - Widget footer with CTAs or links
 *
 * @param {WidgetFooterProps} props
 */
export const WidgetFooter = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-slate-700',
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
/**
 * WidgetMenuButton - Standard 3-dot menu button for widget actions
 */
export function WidgetMenuButton({ onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
        'hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800',
        className
      )}
      aria-label="Options du widget"
    >
      <MoreVertical className="w-5 h-5" />
    </button>
  );
}

// ============ WIDGET (MAIN CONTAINER) ============
/**
 * Widget - Composable widget container for dashboards
 *
 * @param {WidgetProps} props
 *
 * @example
 * <Widget loading={isLoading} empty={data.length === 0}>
 *   <WidgetHeader title="Devis récents" icon={<FileText />} actions={<WidgetMenuButton />} />
 *   <WidgetContent>
 *     {data.map(item => <Item key={item.id} {...item} />)}
 *   </WidgetContent>
 *   <WidgetFooter>
 *     <Button variant="ghost">Voir tout</Button>
 *   </WidgetFooter>
 * </Widget>
 */
const Widget = React.forwardRef(
  (
    {
      loading = false,
      empty = false,
      emptyState,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        className={cn(
          'p-6 transition-shadow duration-200 hover:shadow-md',
          className
        )}
        {...props}
      >
        {loading ? (
          <WidgetSkeleton />
        ) : empty ? (
          emptyState || <WidgetEmptyState />
        ) : (
          children
        )}
      </Card>
    );
  }
);

Widget.displayName = 'Widget';

export default Widget;

// ============ LINK COMPONENTS FOR FOOTER ============
/**
 * WidgetLink - Styled link for widget footer
 */
export function WidgetLink({ href, onClick, children, className }) {
  const Component = href ? 'a' : 'button';

  return (
    <Component
      href={href}
      onClick={onClick}
      type={href ? undefined : 'button'}
      className={cn(
        'text-sm font-medium text-gray-500 dark:text-gray-400',
        'hover:text-primary-600 dark:hover:text-primary-400 transition-colors',
        'focus:outline-none focus:text-primary-600 dark:focus:text-primary-400',
        className
      )}
    >
      {children}
    </Component>
  );
}

// ============ WIDGET WITH TABS ============
/**
 * WidgetTabs - Tab navigation for widget
 */
export function WidgetTabs({ tabs, activeTab, onTabChange, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
            activeTab === tab.value
              ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
