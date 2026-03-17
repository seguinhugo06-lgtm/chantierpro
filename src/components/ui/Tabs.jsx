import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Tabs - Tab navigation component
 *
 * Usage:
 * <Tabs defaultValue="tab1" isDark={isDark}>
 *   <TabsList>
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="tab1">Content 1</TabsContent>
 *   <TabsContent value="tab2">Content 2</TabsContent>
 * </Tabs>
 */

const TabsContext = React.createContext(null);

// ============ TABS ROOT ============
export const Tabs = React.forwardRef(
  ({ className, defaultValue, value, onValueChange, isDark = false, children, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(value || defaultValue);

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    const handleValueChange = React.useCallback(
      (newValue) => {
        setSelectedValue(newValue);
        onValueChange?.(newValue);
      },
      [onValueChange]
    );

    return (
      <TabsContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange, isDark }}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = 'Tabs';

// ============ TABS LIST ============
export const TabsList = React.forwardRef(
  ({ className, variant = 'default', isDark: isDarkProp, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isDark = isDarkProp ?? context?.isDark ?? false;

    const variantStyles = {
      default: cn('p-1 rounded-xl overflow-x-auto flex-nowrap', isDark ? 'bg-slate-800' : 'bg-gray-100'),
      underline: cn('border-b overflow-x-auto flex-nowrap', isDark ? 'border-slate-700' : 'border-gray-200'),
      pills: 'gap-2 overflow-x-auto flex-nowrap',
    };

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          'inline-flex items-center',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsList.displayName = 'TabsList';

// ============ TABS TRIGGER ============
export const TabsTrigger = React.forwardRef(
  ({ className, value, disabled = false, variant = 'default', isDark: isDarkProp, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isDark = isDarkProp ?? context?.isDark ?? false;
    const isSelected = context?.value === value;

    const handleClick = () => {
      if (!disabled) {
        context?.onValueChange(value);
      }
    };

    // Styles par variante - min-h-[44px] for touch targets on mobile
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap px-4 py-2 min-h-[44px] sm:min-h-[36px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

    const variantStyles = {
      default: isSelected
        ? cn(isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900', 'shadow-sm rounded-lg')
        : cn(isDark ? 'text-gray-400 hover:text-white hover:bg-slate-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50', 'rounded-lg'),
      underline: isSelected
        ? cn(isDark ? 'text-white' : 'text-gray-900', 'border-b-2 border-current -mb-px font-semibold')
        : cn(isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700', 'border-b-2 border-transparent -mb-px'),
      pills: isSelected
        ? 'bg-primary-500 text-white rounded-full'
        : cn(isDark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100', 'rounded-full'),
    };

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          baseStyles,
          variantStyles[variant] || variantStyles.default,
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

// ============ TABS CONTENT ============
export const TabsContent = React.forwardRef(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isSelected = context?.value === value;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        tabIndex={0}
        className={cn(
          'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';

export default Tabs;
