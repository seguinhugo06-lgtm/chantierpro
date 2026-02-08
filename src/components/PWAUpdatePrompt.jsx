/**
 * PWAUpdatePrompt
 * Prompts users when a new version is available
 * Matches app theme (light/dark) with brand color
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, RefreshCw, X, WifiOff, Share, PlusSquare, Smartphone, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePWA } from '../hooks/usePWA';
import { Button } from './ui/Button';

/**
 * @typedef {Object} PWAUpdatePromptProps
 * @property {Object} [syncHandlers] - Handlers for sync operations
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [isDark] - Dark mode flag
 * @property {string} [couleur] - Brand color
 */

// Check if user dismissed install prompt recently (within 7 days)
const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Detect iOS Safari
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Detect if running as standalone PWA
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Detect mobile device
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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
export default function PWAUpdatePrompt({ syncHandlers = {}, className, isDark = false, couleur = '#f97316' }) {
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

  // Detect platform
  const [platform, setPlatform] = React.useState({ isIOS: false, isMobile: false, isStandalone: false });

  React.useEffect(() => {
    const timer = setTimeout(() => setShowDelayed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    setPlatform({
      isIOS: isIOS(),
      isMobile: isMobile(),
      isStandalone: isStandalone()
    });
  }, []);

  // Handle dismissal with localStorage persistence
  const handleDismissInstall = () => {
    setDismissed(d => ({ ...d, install: true }));
    setDismissedInStorage();
  };

  // Debug logging
  React.useEffect(() => {
    if (showDelayed) {
      console.log('PWA Install Debug:', {
        platform,
        canInstall,
        isInstalled,
        dismissed: dismissed.install,
        showDelayed
      });
    }
  }, [platform, canInstall, isInstalled, dismissed.install, showDelayed]);

  // Show install prompt for:
  // 1. Chrome/Android with native prompt (canInstall)
  // 2. iOS Safari (need manual instructions)
  // 3. Any mobile browser (show instructions even without native prompt)
  const showNativeInstall = canInstall && !dismissed.install && showDelayed && !isInstalled;
  const showIOSInstall = platform.isIOS && !platform.isStandalone && !dismissed.install && showDelayed;
  // Also show for Android mobile browsers that don't support beforeinstallprompt
  const showMobileInstructions = platform.isMobile && !platform.isStandalone && !dismissed.install && showDelayed && !canInstall && !platform.isIOS;
  const showInstall = showNativeInstall || showIOSInstall || showMobileInstructions;
  const showUpdate = needsRefresh && !dismissed.update;

  // Theme-aware classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-500';
  const stepBg = isDark ? 'bg-slate-700/50' : 'bg-slate-100';
  const closeBtnHover = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100';

  return (
    <div className={cn('fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 sm:left-auto sm:right-4 sm:w-96', className)}>
      <AnimatePresence mode="popLayout">
        {/* Offline indicator */}
        {isOffline && (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-amber-500 text-white shadow-lg"
          >
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Mode hors ligne</p>
              {pendingSyncCount > 0 && (
                <p className="text-xs opacity-90">
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
            className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500 text-white shadow-lg"
          >
            <RefreshCw className="w-5 h-5 flex-shrink-0 animate-spin" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Synchronisation...</p>
              <p className="text-xs opacity-90">
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
            className={cn(
              'relative p-4 rounded-2xl shadow-xl border-2',
              cardBg,
              cardBorder
            )}
          >
            <button
              type="button"
              onClick={() => setDismissed(d => ({ ...d, update: true }))}
              className={cn(
                'absolute top-3 right-3 p-1.5 rounded-lg transition-colors',
                textSecondary,
                closeBtnHover
              )}
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${couleur}20` }}
              >
                <Sparkles className="w-6 h-6" style={{ color: couleur }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-base font-bold mb-1', textPrimary)}>
                  Nouvelle version disponible
                </p>
                <p className={cn('text-sm mb-3', textSecondary)}>
                  Des ameliorations sont pretes !
                </p>
                <Button
                  size="sm"
                  onClick={refresh}
                  className="w-full text-white font-semibold py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
                  style={{ backgroundColor: couleur }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Mettre a jour
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Install prompt - Theme-aware design */}
        {showInstall && (
          <motion.div
            key="install"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              'relative overflow-hidden rounded-2xl shadow-2xl border-2',
              cardBg,
              cardBorder
            )}
          >
            {/* Accent bar at top */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: couleur }}
            />

            <div className="relative p-5 pt-6">
              <button
                type="button"
                onClick={handleDismissInstall}
                className={cn(
                  'absolute top-4 right-4 p-2 rounded-full transition-colors',
                  textSecondary,
                  closeBtnHover
                )}
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header with app icon */}
              <div className="flex items-center gap-4 mb-4 pr-8">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: couleur }}
                >
                  <span className="text-3xl">🏗️</span>
                </div>
                <div>
                  <p className={cn('text-xl font-bold', textPrimary)}>ChantierPro</p>
                  <p className={cn('text-sm', textSecondary)}>Gestion de chantiers BTP</p>
                </div>
              </div>

              {/* Native install button for Chrome/Android */}
              {canInstall ? (
                <>
                  <Button
                    size="lg"
                    onClick={install}
                    className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] text-base"
                    style={{ backgroundColor: couleur }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Installer l'application
                  </Button>

                  {/* Benefits */}
                  <div className={cn('flex items-center justify-center gap-4 mt-4 text-xs font-medium', textMuted)}>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      100% Gratuit
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Hors-ligne
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Rapide
                    </span>
                  </div>
                </>
              ) : platform.isIOS ? (
                /* iOS Instructions */
                <div className="space-y-3">
                  <p className={cn('text-sm font-medium mb-3', textSecondary)}>
                    Pour installer sur votre iPhone :
                  </p>
                  <div className={cn('flex items-center gap-4 p-3 rounded-xl', stepBg)}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: couleur }}
                    >
                      1
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Share className="w-4 h-4" style={{ color: couleur }} />
                        <p className={cn('font-semibold text-sm', textPrimary)}>Appuyez sur Partager</p>
                      </div>
                      <p className={cn('text-xs', textMuted)}>Icone en bas de Safari</p>
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-4 p-3 rounded-xl', stepBg)}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: couleur }}
                    >
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <PlusSquare className="w-4 h-4" style={{ color: couleur }} />
                        <p className={cn('font-semibold text-sm', textPrimary)}>Sur l'ecran d'accueil</p>
                      </div>
                      <p className={cn('text-xs', textMuted)}>Puis "Ajouter"</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Android/Other browsers */
                <div className="space-y-3">
                  <p className={cn('text-sm font-medium mb-3', textSecondary)}>
                    Pour installer sur votre telephone :
                  </p>
                  <div className={cn('flex items-center gap-4 p-3 rounded-xl', stepBg)}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: couleur }}
                    >
                      1
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-lg font-bold', textPrimary)}>⋮</span>
                        <p className={cn('font-semibold text-sm', textPrimary)}>Menu du navigateur</p>
                      </div>
                      <p className={cn('text-xs', textMuted)}>3 points en haut a droite</p>
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-4 p-3 rounded-xl', stepBg)}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: couleur }}
                    >
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <PlusSquare className="w-4 h-4" style={{ color: couleur }} />
                        <p className={cn('font-semibold text-sm', textPrimary)}>Ajouter a l'ecran d'accueil</p>
                      </div>
                      <p className={cn('text-xs', textMuted)}>L'app sera installee</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom hint for manual install */}
              {!canInstall && (
                <div className={cn('flex items-center justify-center gap-2 mt-4 pt-4 border-t text-xs', cardBorder, textMuted)}>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Acces instantane • Fonctionne hors-ligne</span>
                </div>
              )}
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
export function PWAInstallButton({ className, couleur = '#f97316' }) {
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
      style={{ borderColor: couleur, color: couleur }}
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
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        className
      )}
    >
      <WifiOff className="w-3 h-3" />
      Hors ligne
      {pendingSyncCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px]">
          {pendingSyncCount}
        </span>
      )}
    </div>
  );
}
