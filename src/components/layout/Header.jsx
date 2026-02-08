import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Search, Menu, ChevronDown, User, Settings, LogOut, X, Moon, Sun, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge, Avatar, IconButton, Button } from '../ui';

/**
 * @typedef {Object} Notification
 * @property {string} id - Unique ID
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {'info'|'success'|'warning'|'danger'} [type='info'] - Type
 * @property {boolean} read - Read status
 * @property {Date|string} createdAt - Timestamp
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} [avatar] - Avatar URL
 * @property {string} [role] - User role
 */

/**
 * @typedef {Object} HeaderProps
 * @property {User} [user] - Current user
 * @property {Notification[]} [notifications] - Notifications list
 * @property {function} [onNavigateHome] - Navigate to home
 * @property {function} [onOpenSearch] - Open search/command palette
 * @property {function} [onOpenSettings] - Open settings
 * @property {function} [onLogout] - Logout handler
 * @property {function} [onNotificationClick] - Notification click handler
 * @property {function} [onMarkAllRead] - Mark all notifications read
 * @property {function} [onToggleTheme] - Toggle dark/light theme
 * @property {function} [onToggleSidebar] - Toggle mobile sidebar
 * @property {boolean} [isDark] - Dark mode active
 * @property {string} [brandColor] - Brand color
 * @property {string} [companyName] - Company name override
 */

/**
 * Header - Main application header
 *
 * @description
 * Sticky header with logo, search, notifications, and user menu.
 * Supports responsive design and keyboard shortcuts.
 *
 * @example
 * <Header
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   notifications={notifications}
 *   onOpenSearch={() => setShowCommandPalette(true)}
 *   onLogout={handleLogout}
 *   isDark={isDark}
 *   onToggleTheme={toggleTheme}
 * />
 */
export default function Header({
  user,
  notifications = [],
  onNavigateHome,
  onOpenSearch,
  onOpenSettings,
  onLogout,
  onNotificationClick,
  onMarkAllRead,
  onToggleTheme,
  onToggleSidebar,
  isDark = false,
  brandColor = '#f97316',
  companyName = 'ChantierPro',
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  // Close dropdowns on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSearchClick = useCallback(() => {
    onOpenSearch?.();
  }, [onOpenSearch]);

  return (
    <header
      className={cn(
        'sticky top-0 z-sticky',
        'h-16 px-4 md:px-6',
        'flex items-center justify-between gap-4',
        'border-b shadow-sm',
        isDark
          ? 'bg-slate-900 border-slate-700'
          : 'bg-white border-gray-200'
      )}
    >
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          className={cn(
            'lg:hidden p-2 rounded-lg transition-colors',
            isDark ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          )}
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>

        {/* Logo */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 group"
          aria-label="Retour à l'accueil"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: brandColor }}
          >
            CP
          </div>
          <span
            className={cn(
              'hidden sm:block text-lg font-semibold',
              'group-hover:opacity-80 transition-opacity',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {companyName}
          </span>
        </button>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-2xl mx-4 hidden md:block">
        <button
          onClick={handleSearchClick}
          className={cn(
            'w-full h-10 px-4 rounded-lg',
            'flex items-center gap-3',
            'border transition-all',
            isDark
              ? 'bg-slate-800 border-slate-700 hover:border-slate-600 text-gray-400'
              : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
          )}
          aria-label="Rechercher"
        >
          <Search size={18} className="flex-shrink-0" />
          <span className="flex-1 text-left text-sm truncate">
            Rechercher devis, clients, chantiers...
          </span>
          <kbd
            className={cn(
              'hidden lg:flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
              isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-200 text-gray-500'
            )}
          >
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Mobile search button */}
      <button
        onClick={handleSearchClick}
        className={cn(
          'md:hidden p-2.5 rounded-lg transition-colors',
          isDark ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
        )}
        aria-label="Rechercher"
      >
        <Search size={20} />
      </button>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className={cn(
            'hidden sm:flex p-2.5 rounded-lg transition-colors',
            isDark ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          )}
          aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              'relative p-2.5 rounded-lg transition-colors',
              isDark ? 'hover:bg-slate-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600',
              showNotifications && (isDark ? 'bg-slate-800' : 'bg-gray-100')
            )}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
            aria-expanded={showNotifications}
            aria-haspopup="true"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-danger-500 rounded-full"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <NotificationDropdown
              notifications={notifications}
              onNotificationClick={(notification) => {
                onNotificationClick?.(notification);
                setShowNotifications(false);
              }}
              onMarkAllRead={onMarkAllRead}
              onClose={() => setShowNotifications(false)}
              isDark={isDark}
            />
          )}
        </div>

        {/* User Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'flex items-center gap-2 p-1.5 rounded-lg transition-colors',
              isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100',
              showUserMenu && (isDark ? 'bg-slate-800' : 'bg-gray-100')
            )}
            aria-label="Menu utilisateur"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <UserAvatar user={user} size="sm" />
            <ChevronDown
              size={16}
              className={cn(
                'hidden sm:block transition-transform',
                isDark ? 'text-gray-400' : 'text-gray-500',
                showUserMenu && 'rotate-180'
              )}
            />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <UserMenuDropdown
              user={user}
              onOpenSettings={() => {
                onOpenSettings?.();
                setShowUserMenu(false);
              }}
              onToggleTheme={onToggleTheme}
              onLogout={() => {
                onLogout?.();
                setShowUserMenu(false);
              }}
              onClose={() => setShowUserMenu(false)}
              isDark={isDark}
            />
          )}
        </div>
      </div>
    </header>
  );
}

// ============ USER AVATAR ============

/**
 * UserAvatar - User avatar with initials fallback
 */
function UserAvatar({ user, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || 'User'}
        className={cn(sizeClasses[size], 'rounded-full object-cover')}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-full flex items-center justify-center font-medium',
        'bg-primary-100 text-primary-700'
      )}
    >
      {getInitials(user?.name)}
    </div>
  );
}

// ============ NOTIFICATION DROPDOWN ============

/**
 * NotificationDropdown - Notifications list dropdown
 */
function NotificationDropdown({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onClose,
  isDark,
}) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return then.toLocaleDateString('fr-FR');
  };

  const typeIcons = {
    info: 'bg-blue-100 text-blue-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    danger: 'bg-danger-100 text-danger-600',
  };

  return (
    <div
      className={cn(
        'absolute right-0 top-full mt-2 w-80 sm:w-96',
        'rounded-xl shadow-lg border',
        'overflow-hidden z-dropdown',
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      )}
      role="menu"
      aria-label="Notifications"
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 flex items-center justify-between border-b',
          isDark ? 'border-slate-700' : 'border-gray-100'
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Badge variant="danger" size="sm">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className={cn(
              'text-sm font-medium transition-colors',
              'text-primary-600 hover:text-primary-700'
            )}
          >
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className={cn('px-4 py-8 text-center', isDark ? 'text-gray-400' : 'text-gray-500')}>
            <Bell size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          <ul role="list">
            {notifications.slice(0, 10).map((notification) => (
              <li key={notification.id}>
                <button
                  onClick={() => onNotificationClick(notification)}
                  className={cn(
                    'w-full px-4 py-3 flex items-start gap-3 text-left transition-colors',
                    'hover:bg-gray-50 dark:hover:bg-slate-700',
                    !notification.read && (isDark ? 'bg-slate-700/50' : 'bg-primary-50/50')
                  )}
                  role="menuitem"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      typeIcons[notification.type || 'info']
                    )}
                  >
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {notification.title}
                    </p>
                    <p
                      className={cn(
                        'text-sm truncate',
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      )}
                    >
                      {notification.message}
                    </p>
                    <p
                      className={cn(
                        'text-xs mt-1',
                        isDark ? 'text-gray-500' : 'text-gray-400'
                      )}
                    >
                      {getTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <span
                      className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2"
                      aria-label="Non lu"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className={cn('px-4 py-3 border-t', isDark ? 'border-slate-700' : 'border-gray-100')}>
          <button
            onClick={onClose}
            className={cn(
              'w-full text-center text-sm font-medium py-2 rounded-lg transition-colors',
              'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            )}
          >
            Voir toutes les notifications
          </button>
        </div>
      )}
    </div>
  );
}

// ============ USER MENU DROPDOWN ============

/**
 * UserMenuDropdown - User account menu dropdown
 */
function UserMenuDropdown({
  user,
  onOpenSettings,
  onToggleTheme,
  onLogout,
  onClose,
  isDark,
}) {
  const menuItems = [
    {
      icon: Settings,
      label: 'Paramètres',
      onClick: onOpenSettings,
    },
    {
      icon: isDark ? Sun : Moon,
      label: isDark ? 'Mode clair' : 'Mode sombre',
      onClick: onToggleTheme,
      showOnMobile: true,
    },
    {
      icon: HelpCircle,
      label: 'Aide',
      onClick: () => {},
    },
    {
      type: 'divider',
    },
    {
      icon: LogOut,
      label: 'Déconnexion',
      onClick: onLogout,
      variant: 'danger',
    },
  ];

  return (
    <div
      className={cn(
        'absolute right-0 top-full mt-2 w-64',
        'rounded-xl shadow-lg border',
        'overflow-hidden z-dropdown',
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      )}
      role="menu"
      aria-label="Menu utilisateur"
    >
      {/* User info header */}
      <div
        className={cn(
          'px-4 py-3 border-b',
          isDark ? 'border-slate-700' : 'border-gray-100'
        )}
      >
        <p className={cn('font-semibold truncate', isDark ? 'text-white' : 'text-gray-900')}>
          {user?.name || 'Utilisateur'}
        </p>
        <p className={cn('text-sm truncate', isDark ? 'text-gray-400' : 'text-gray-500')}>
          {user?.email || 'email@example.com'}
        </p>
        {user?.role && (
          <Badge variant="info" size="sm" className="mt-2">
            {user.role}
          </Badge>
        )}
      </div>

      {/* Menu items */}
      <div className="py-1">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return (
              <div
                key={`divider-${index}`}
                className={cn('my-1 border-t', isDark ? 'border-slate-700' : 'border-gray-100')}
              />
            );
          }

          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                'w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors',
                item.variant === 'danger'
                  ? 'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20'
                  : isDark
                  ? 'text-gray-300 hover:bg-slate-700'
                  : 'text-gray-700 hover:bg-gray-50',
                item.showOnMobile ? 'sm:hidden' : ''
              )}
              role="menuitem"
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ EXPORTS ============

export { UserAvatar, NotificationDropdown, UserMenuDropdown };
