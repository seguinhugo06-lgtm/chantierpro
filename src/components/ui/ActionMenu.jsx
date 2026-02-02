/**
 * ActionMenu Component
 * Dropdown menu for inline actions in lists
 *
 * @module ActionMenu
 */

import * as React from 'react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MoreVertical, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * @typedef {'sm' | 'md' | 'lg'} ActionMenuSize
 */

/**
 * @typedef {Object} ActionItem
 * @property {string} label - Action label text
 * @property {React.ReactNode} [icon] - Optional icon
 * @property {() => void | Promise<void>} onClick - Click handler
 * @property {boolean} [danger] - Red/destructive styling
 * @property {boolean} [disabled] - Disabled state
 * @property {string} [shortcut] - Keyboard shortcut hint
 * @property {ActionItem[]} [submenu] - Nested submenu items
 * @property {'separator'} [type] - Set to 'separator' for divider
 */

/**
 * @typedef {Object} ActionMenuProps
 * @property {React.ReactNode} [trigger] - Custom trigger element
 * @property {ActionItem[]} actions - List of actions
 * @property {'left' | 'right'} [align='right'] - Dropdown alignment
 * @property {ActionMenuSize} [size='md'] - Menu size
 * @property {string} [className] - Additional CSS classes
 * @property {string} [triggerClassName] - Trigger button classes
 * @property {boolean} [disabled] - Disable the menu
 * @property {string} [ariaLabel] - Accessible label
 */

// Size configurations
const menuSizes = {
  sm: 'min-w-[160px] text-sm',
  md: 'min-w-[200px] text-sm',
  lg: 'min-w-[240px] text-base',
};

const itemSizes = {
  sm: 'px-2.5 py-1.5',
  md: 'px-3 py-2',
  lg: 'px-4 py-2.5',
};

const iconSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * ActionMenu - Dropdown menu for list actions
 *
 * @example
 * <ActionMenu
 *   trigger={<MoreVertical />}
 *   actions={[
 *     { label: 'Modifier', icon: <Edit />, onClick: handleEdit },
 *     { label: 'Dupliquer', icon: <Copy />, onClick: handleDuplicate },
 *     { type: 'separator' },
 *     { label: 'Supprimer', icon: <Trash />, onClick: handleDelete, danger: true }
 *   ]}
 * />
 *
 * @param {ActionMenuProps} props
 */
export function ActionMenu({
  trigger,
  actions,
  align = 'right',
  size = 'md',
  className,
  triggerClassName,
  disabled = false,
  ariaLabel = 'Actions',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);

  // Filter out separators for keyboard navigation
  const navigableItems = useMemo(
    () => actions.filter((a) => a.type !== 'separator' && !a.disabled),
    [actions]
  );

  // Close menu
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    setActiveSubmenu(null);
  }, []);

  // Toggle menu
  const toggleMenu = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setActiveIndex(-1);
    setActiveSubmenu(null);
  }, [disabled]);

  // Handle item click
  const handleItemClick = useCallback(
    async (action, event) => {
      event?.preventDefault();
      event?.stopPropagation();

      if (action.disabled) return;

      // If has submenu, toggle it
      if (action.submenu?.length) {
        setActiveSubmenu(activeSubmenu === action.label ? null : action.label);
        return;
      }

      // Execute action
      try {
        await action.onClick?.();
      } catch (error) {
        console.error('Action error:', error);
      }

      closeMenu();
    },
    [activeSubmenu, closeMenu]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          event.preventDefault();
          setIsOpen(true);
          setActiveIndex(0);
        }
        return;
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          closeMenu();
          triggerRef.current?.focus();
          break;

        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex((prev) => (prev + 1) % navigableItems.length);
          break;

        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex((prev) => (prev - 1 + navigableItems.length) % navigableItems.length);
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (navigableItems[activeIndex]?.submenu) {
            setActiveSubmenu(navigableItems[activeIndex].label);
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          setActiveSubmenu(null);
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (activeIndex >= 0 && navigableItems[activeIndex]) {
            handleItemClick(navigableItems[activeIndex], event);
          }
          break;

        case 'Tab':
          closeMenu();
          break;

        case 'Home':
          event.preventDefault();
          setActiveIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setActiveIndex(navigableItems.length - 1);
          break;

        default:
          // Type-ahead search
          const char = event.key.toLowerCase();
          if (char.length === 1) {
            const match = navigableItems.findIndex(
              (item, i) => i > activeIndex && item.label.toLowerCase().startsWith(char)
            );
            if (match >= 0) {
              setActiveIndex(match);
            } else {
              const wrapMatch = navigableItems.findIndex((item) =>
                item.label.toLowerCase().startsWith(char)
              );
              if (wrapMatch >= 0) {
                setActiveIndex(wrapMatch);
              }
            }
          }
      }
    },
    [isOpen, activeIndex, navigableItems, handleItemClick, closeMenu]
  );

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeMenu]);

  // Focus active item
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].focus();
    }
  }, [isOpen, activeIndex]);

  // Render action item
  const renderItem = (action, index, isSubmenuItem = false) => {
    if (action.type === 'separator') {
      return (
        <div
          key={`sep-${index}`}
          className="my-1 h-px bg-gray-200 dark:bg-slate-700"
          role="separator"
        />
      );
    }

    const isActive = !isSubmenuItem && navigableItems.indexOf(action) === activeIndex;
    const hasSubmenu = action.submenu?.length > 0;
    const isSubmenuOpen = activeSubmenu === action.label;

    return (
      <div key={action.label} className="relative">
        <button
          ref={(el) => {
            if (!isSubmenuItem) {
              const navIndex = navigableItems.indexOf(action);
              if (navIndex >= 0) itemRefs.current[navIndex] = el;
            }
          }}
          type="button"
          role="menuitem"
          tabIndex={isActive ? 0 : -1}
          disabled={action.disabled}
          onClick={(e) => handleItemClick(action, e)}
          onMouseEnter={() => {
            if (!isSubmenuItem) {
              setActiveIndex(navigableItems.indexOf(action));
            }
            if (hasSubmenu) {
              setActiveSubmenu(action.label);
            }
          }}
          onMouseLeave={() => {
            if (hasSubmenu && !isSubmenuOpen) {
              setActiveSubmenu(null);
            }
          }}
          className={cn(
            'w-full flex items-center gap-2 rounded-md transition-colors',
            itemSizes[size],
            action.disabled && 'opacity-50 cursor-not-allowed',
            !action.disabled && !action.danger && 'hover:bg-gray-100 dark:hover:bg-slate-700',
            !action.disabled && action.danger && 'hover:bg-red-50 dark:hover:bg-red-900/20',
            action.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200',
            isActive && !action.danger && 'bg-gray-100 dark:bg-slate-700',
            isActive && action.danger && 'bg-red-50 dark:bg-red-900/20'
          )}
          aria-haspopup={hasSubmenu ? 'menu' : undefined}
          aria-expanded={hasSubmenu ? isSubmenuOpen : undefined}
        >
          {action.icon && (
            <span className={cn(iconSizes[size], 'flex-shrink-0')}>{action.icon}</span>
          )}
          <span className="flex-1 text-left">{action.label}</span>
          {action.shortcut && (
            <kbd className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-mono">
              {action.shortcut}
            </kbd>
          )}
          {hasSubmenu && <ChevronRight className={cn(iconSizes[size], 'ml-auto opacity-50')} />}
        </button>

        {/* Submenu */}
        {hasSubmenu && isSubmenuOpen && (
          <div
            className={cn(
              'absolute top-0 left-full ml-1 z-50',
              'bg-white dark:bg-slate-800 rounded-lg shadow-lg',
              'border border-gray-200 dark:border-slate-700',
              'py-1',
              menuSizes[size]
            )}
            role="menu"
          >
            {action.submenu.map((subItem, subIndex) => renderItem(subItem, subIndex, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-center rounded-lg p-1.5',
          'transition-colors duration-150',
          'hover:bg-gray-100 dark:hover:bg-slate-700',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed',
          triggerClassName
        )}
      >
        {trigger || <MoreVertical className={iconSizes[size]} />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
          className={cn(
            'absolute z-50 mt-1',
            align === 'right' ? 'right-0' : 'left-0',
            'bg-white dark:bg-slate-800 rounded-lg shadow-lg',
            'border border-gray-200 dark:border-slate-700',
            'py-1',
            'animate-fade-in',
            menuSizes[size]
          )}
          style={{
            animation: 'fadeIn 0.15s ease-out, slideDown 0.15s ease-out',
          }}
        >
          {actions.map((action, index) => renderItem(action, index))}
        </div>
      )}
    </div>
  );
}

/**
 * ActionMenuButton - Convenience wrapper for common use case
 *
 * @param {ActionMenuProps} props
 */
export function ActionMenuButton(props) {
  return <ActionMenu {...props} trigger={<MoreVertical />} />;
}

export default ActionMenu;
