/**
 * PWAUpdatePrompt
 * Prompts users when a new version is available
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, RefreshCw, X, Wifi, WifiOff, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePWA } from '../hooks/usePWA';
import { Button } from './ui/Button';

/**
 * @typedef {Object} PWAUpdatePromptProps
 * @property {Object} [syncHandlers] - Handlers for sync operations
 * @property {string} [className] - Additional CSS classes
 */

// Check if user dismissed install prompt recently (within 7 days)
const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function wasRecentlyDismissed() {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const dismissedAt = parseInt(dismissed, 10);
    return Date.now() - dismissedAt < DISMISS_DURATION;
  } catch {
    return false;
  }
}

function setDismissedInStorage() {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * PWAUpdatePrompt - Shows prompts for PWA updates and install
 * @param {PWAUpdatePromptProps} props
 */
export default function PWAUpdatePrompt({ syncHandlers = {}, className }) {
  const {
    canInstall,
    install,
    needsRefresh,
    refresh,
    isOffline,
    pendingSyncCount,
    isInstalled,
  } = usePWA(syncHandlers);

  const [dismissed, setDismissed] = React.useState({
    install: wasRecentlyDismissed(),
    update: false,
  });

  // Delay showing install prompt by 3 seconds to not interrupt user
  const [showDelayed, setShowDelayed] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowDelayed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Handle dismissal with localStorage persistence
  const handleDismissInstall = () => {
    setDismissed(d => ({ ...d, install: true }));
    setDismissedInStorage();
  };

  // Don't show install prompt if dismissed, not ready, or already installed
  const showInstall = canInstall && !dismissed.install && showDelayed && !isInstalled;
  const showUpdate = needsRefresh && !dismissed.update;

  return (
    <div className={cn('fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 sm:left-auto sm:right-4 sm:w-80', className)}>
      <AnimatePresence mode="popLayout">
        {/* Offline indicator */}
        {isOffline && (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/90 text-yellow-950 backdrop-blur-sm shadow-lg"
          >
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Mode hors ligne</p>
              {pendingSyncCount > 0 && (
                <p className="text-xs opacity-80">
                  {pendingSyncCount} operation{pendingSyncCount > 1 ? 's' : ''} en attente
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Back online with pending sync */}
        {!isOffline && pendingSyncCount > 0 && (
          <motion.div
            key="syncing"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-green-500/90 text-white backdrop-blur-sm shadow-lg"
          >
            <RefreshCw className="w-5 h-5 flex-shrink-0 animate-spin" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Synchronisation...</p>
              <p className="text-xs opacity-80">
                {pendingSyncCount} operation{pendingSyncCount > 1 ? 's' : ''} en cours
              </p>
            </div>
          </motion.div>
        )}

        {/* Update available */}
        {showUpdate && (
          <motion.div
            key="update"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative p-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-lg border border-slate-700"
          >
            <button
              type="button"
              onClick={() => setDismissed(d => ({ ...d, update: true }))}
              className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-1">
                  Mise a jour disponible
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  Une nouvelle version est prete a etre installee.
                </p>
                <Button
                  size="sm"
                  onClick={refresh}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Mettre a jour
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Install prompt - Enhanced for mobile */}
        {showInstall && (
          <motion.div
            key="install"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative p-4 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white shadow-2xl border border-orange-400/30"
          >
            <button
              type="button"
              onClick={handleDismissInstall}
              className="absolute top-3 right-3 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4 pr-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold mb-1">
                  📲 Installer ChantierPro
                </p>
                <p className="text-sm text-white/90 mb-4">
                  Ajoutez l'app à votre écran d'accueil pour un accès rapide, même hors ligne !
                </p>
                <Button
                  size="sm"
                  onClick={install}
                  className="w-full bg-white text-orange-600 hover:bg-orange-50 font-semibold py-2.5 shadow-lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Installer maintenant
                </Button>
                <p className="text-[11px] text-white/60 text-center mt-2">
                  Gratuit • Pas de téléchargement sur l'App Store
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * PWAInstallButton - Compact install button for header/menu
 */
export function PWAInstallButton({ className }) {
  const { canInstall, install, isInstalled } = usePWA();

  if (isInstalled || !canInstall) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={install}
      className={cn('gap-1.5', className)}
    >
      <Download className="w-4 h-4" />
      Installer
    </Button>
  );
}

/**
 * OfflineIndicator - Small badge showing offline status
 */
export function OfflineIndicator({ className }) {
  const { isOffline, pendingSyncCount } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        className
      )}
    >
      <WifiOff className="w-3 h-3" />
      Hors ligne
      {pendingSyncCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-yellow-200 dark:bg-yellow-800 text-[10px]">
          {pendingSyncCount}
        </span>
      )}
    </div>
  );
}
