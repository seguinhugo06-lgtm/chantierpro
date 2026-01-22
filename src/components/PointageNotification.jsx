import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  MapPin, Clock, Play, X, ChevronRight, Navigation,
  Building2, CheckCircle2
} from 'lucide-react';
import { formatDistance } from '../services/GeofencingService';

/**
 * PointageNotification - Push-style notification for smart clocking
 * Sprint 1: Pointage Intelligent
 *
 * Shows when:
 * - User arrives at a construction site (geofence trigger)
 * - User has pending pointages to approve
 * - Quick reminder to clock out at end of day
 */
export default function PointageNotification({
  isVisible,
  onDismiss,
  onCheckIn,
  chantier,
  distance,
  employe,
  couleur = '#f97316',
  isDark = false,
  autoHideDelay = 30000 // Auto hide after 30 seconds
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [countdown, setCountdown] = useState(autoHideDelay / 1000);

  // Auto-hide countdown
  useEffect(() => {
    if (!isVisible) return;

    setCountdown(autoHideDelay / 1000);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          onDismiss?.();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, autoHideDelay, onDismiss]);

  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';

  if (!isVisible || !chantier) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        className="fixed top-4 left-4 right-4 z-[60] max-w-md mx-auto"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div
          className={`${cardBg} rounded-2xl shadow-2xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
        >
          {/* Progress bar */}
          <div className="h-1 bg-slate-200 dark:bg-slate-700">
            <motion.div
              className="h-full"
              style={{ backgroundColor: couleur }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoHideDelay / 1000, ease: 'linear' }}
            />
          </div>

          {/* Header */}
          <div className="p-4 flex items-start gap-3">
            {/* Icon */}
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${couleur}20` }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MapPin size={24} style={{ color: couleur }} />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-medium ${textSecondary}`}>
                  Arrive sur site
                </span>
                {distance && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {formatDistance(distance)}
                  </span>
                )}
              </div>
              <h3 className={`font-bold text-lg ${textPrimary} truncate`}>
                {chantier.nom}
              </h3>
              {chantier.adresse && (
                <p className={`text-sm ${textSecondary} truncate mt-0.5`}>
                  {chantier.adresse}
                </p>
              )}
            </div>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              <X size={20} className={textSecondary} />
            </button>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-3">
            {/* Quick check-in button */}
            <button
              onClick={() => onCheckIn?.(chantier)}
              className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: couleur }}
            >
              <Play size={20} />
              Pointer maintenant
            </button>

            {/* Expand for more options */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-4 py-3 rounded-xl transition-colors ${
                isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <ChevronRight
                size={20}
                className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
          </div>

          {/* Expanded options */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={`px-4 pb-4 pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <button
                    onClick={() => {
                      onDismiss?.();
                      // Could navigate to full Equipe page
                    }}
                    className={`w-full py-2 text-left text-sm ${textSecondary} flex items-center gap-2`}
                  >
                    <Clock size={16} />
                    Voir les heures de la semaine
                  </button>
                  <button
                    onClick={() => onDismiss?.()}
                    className={`w-full py-2 text-left text-sm ${textSecondary} flex items-center gap-2`}
                  >
                    <X size={16} />
                    Rappeler plus tard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

/**
 * PointageReminderNotification - Reminder to clock out
 */
export function PointageReminderNotification({
  isVisible,
  onDismiss,
  onCheckOut,
  session,
  elapsedHours,
  couleur = '#f97316',
  isDark = false
}) {
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';

  if (!isVisible || !session) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        className="fixed top-4 left-4 right-4 z-[60] max-w-md mx-auto"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
      >
        <div className={`${cardBg} rounded-2xl shadow-2xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {/* Header */}
          <div className="p-4 flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Clock size={24} className="text-amber-600 dark:text-amber-400" />
            </div>

            <div className="flex-1">
              <p className={`text-sm ${textSecondary}`}>Timer actif depuis</p>
              <h3 className={`font-bold text-lg ${textPrimary}`}>
                {Math.round(elapsedHours * 10) / 10}h sur {session.chantierNom}
              </h3>
              <p className={`text-sm ${textSecondary} mt-1`}>
                N'oubliez pas de pointer votre sortie
              </p>
            </div>

            <button onClick={onDismiss} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <X size={20} className={textSecondary} />
            </button>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-3">
            <button
              onClick={() => onCheckOut?.(session)}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2"
            >
              Arreter ({Math.round(elapsedHours * 10) / 10}h)
            </button>
            <button
              onClick={onDismiss}
              className={`px-4 py-3 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
            >
              Continuer
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

/**
 * GeofenceArrivalToast - Simple toast for site arrival
 */
export function GeofenceArrivalToast({
  isVisible,
  chantier,
  onTap,
  couleur = '#f97316'
}) {
  if (!isVisible || !chantier) return null;

  const content = (
    <motion.button
      onClick={onTap}
      className="fixed bottom-28 left-4 right-4 z-50 max-w-md mx-auto"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
    >
      <div
        className="px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-white"
        style={{ backgroundColor: couleur }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <MapPin size={20} />
        </motion.div>
        <div className="flex-1 text-left">
          <p className="font-medium">Arrive a {chantier.nom}</p>
          <p className="text-sm text-white/80">Appuyez pour pointer</p>
        </div>
        <ChevronRight size={20} />
      </div>
    </motion.button>
  );

  return createPortal(content, document.body);
}
