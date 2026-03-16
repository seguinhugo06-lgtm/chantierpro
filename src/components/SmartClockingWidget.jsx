import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Pause, Coffee, MapPin, Clock, CheckCircle2,
  AlertTriangle, Wifi, WifiOff, ChevronDown, ChevronUp,
  Navigation, Timer, Zap, User, Building2
} from 'lucide-react';
import {
  checkIn, checkOut, pauseSession, resumeSession,
  startBreak, endBreak, getActiveSession, calculateElapsedTime,
  formatElapsedTime, SESSION_STATE
} from '../services/PointageService';
import {
  getCurrentPosition, findNearbyChantiers, formatDistance,
  getLocationPermission
} from '../services/GeofencingService';

/**
 * SmartClockingWidget - One-tap check-in/out with GPS intelligence
 * Sprint 1: Pointage Intelligent
 *
 * Features:
 * - One-tap check-in from notification
 * - GPS-based site detection
 * - Real-time work timer
 * - Quick pause/break controls
 * - Offline-capable
 */
export default function SmartClockingWidget({
  employe,
  chantiers = [],
  onPointageCreated,
  couleur = '#f97316',
  isDark = false,
  compact = false
}) {
  // State
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState({ workSeconds: 0, breakSeconds: 0 });
  const [nearbyChantiers, setNearbyChantiers] = useState([]);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [showChantierPicker, setShowChantierPicker] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsStatus, setGpsStatus] = useState('unknown'); // 'granted', 'denied', 'prompt', 'unavailable'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
    checkGpsPermission();

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (!session || session.state === SESSION_STATE.IDLE) return;

    const tick = () => {
      setElapsed(calculateElapsedTime(session));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Check for nearby chantiers periodically
  useEffect(() => {
    if (session) return; // Don't check while working

    const checkNearby = async () => {
      if (gpsStatus !== 'granted') return;

      try {
        const position = await getCurrentPosition();
        const nearby = findNearbyChantiers(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          },
          chantiers
        );
        setNearbyChantiers(nearby);

        // Auto-select closest if only one
        if (nearby.length === 1 && !selectedChantier) {
          setSelectedChantier(nearby[0]);
        }
      } catch (error) {
        // Silent fail - GPS might be temporarily unavailable
      }
    };

    checkNearby();
    const interval = setInterval(checkNearby, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session, gpsStatus, chantiers, selectedChantier]);

  const loadActiveSession = async () => {
    try {
      const active = await getActiveSession();
      if (active && active.employeId === employe?.id) {
        setSession(active);
        // Find the chantier
        const ch = chantiers.find(c => c.id === active.chantierId);
        if (ch) setSelectedChantier(ch);
      }
    } catch (error) {
      console.error('Failed to load active session:', error);
    }
  };

  const checkGpsPermission = async () => {
    try {
      const status = await getLocationPermission();
      setGpsStatus(status);
    } catch {
      setGpsStatus('unavailable');
    }
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!employe?.id || !selectedChantier) {
      setError('Selectionnez un chantier');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newSession = await checkIn({
        employeId: employe.id,
        chantierId: selectedChantier.id,
        chantierNom: selectedChantier.nom,
        chantierCoords: selectedChantier.latitude ? {
          latitude: selectedChantier.latitude,
          longitude: selectedChantier.longitude
        } : null,
        validateGPS: gpsStatus === 'granted'
      });

      setSession(newSession);
    } catch (error) {
      console.error('Check-in failed:', error);
      setError('Echec du pointage');
    } finally {
      setLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async (note = '') => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const pointage = await checkOut(session.id, {
        validateGPS: gpsStatus === 'granted',
        note
      });

      setSession(null);
      setSelectedChantier(null);
      onPointageCreated?.(pointage);
    } catch (error) {
      console.error('Check-out failed:', error);
      setError('Echec de l\'arret');
    } finally {
      setLoading(false);
    }
  };

  // Handle pause toggle
  const handlePauseToggle = async () => {
    if (!session) return;

    try {
      if (session.state === SESSION_STATE.PAUSED) {
        const updated = await resumeSession(session.id);
        setSession(updated);
      } else if (session.state === SESSION_STATE.WORKING) {
        const updated = await pauseSession(session.id);
        setSession(updated);
      }
    } catch (error) {
      console.error('Pause toggle failed:', error);
    }
  };

  // Handle break toggle
  const handleBreakToggle = async () => {
    if (!session) return;

    try {
      if (session.state === SESSION_STATE.BREAK) {
        const updated = await endBreak(session.id);
        setSession(updated);
      } else {
        const updated = await startBreak(session.id, 'coffee');
        setSession(updated);
      }
    } catch (error) {
      console.error('Break toggle failed:', error);
    }
  };

  // Active chantiers (en_cours)
  const activeChantiers = useMemo(() =>
    chantiers.filter(c => c.statut === 'en_cours'),
    [chantiers]
  );

  // Render idle state (not working)
  if (!session) {
    return (
      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: `${couleur}15` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: couleur }}
            >
              <Clock size={16} className="text-white" />
            </div>
            <span className={`font-semibold ${textPrimary}`}>Pointage intelligent</span>
          </div>
          <div className="flex items-center gap-2">
            {gpsStatus === 'granted' && (
              <div className="flex items-center gap-1 text-emerald-500 text-xs">
                <Navigation size={12} />
                <span>GPS</span>
              </div>
            )}
            {isOnline ? (
              <Wifi size={14} className="text-emerald-500" />
            ) : (
              <WifiOff size={14} className="text-amber-500" />
            )}
          </div>
        </div>

        {/* Nearby chantiers suggestion */}
        {nearbyChantiers.length > 0 && !selectedChantier && (
          <div className="px-4 py-3 border-b border-dashed" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <p className={`text-xs ${textMuted} mb-2`}>
              <MapPin size={12} className="inline mr-1" />
              Chantiers a proximite
            </p>
            {nearbyChantiers.map(ch => (
              <button
                key={ch.id}
                onClick={() => setSelectedChantier(ch)}
                className={`w-full text-left p-2 rounded-lg transition-all ${
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${textPrimary}`}>{ch.nom}</span>
                  <span className={`text-xs ${textMuted}`}>{formatDistance(ch.distance)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Chantier selector */}
        <div className="p-4">
          <button
            onClick={() => setShowChantierPicker(!showChantierPicker)}
            className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between ${
              isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {selectedChantier ? (
              <div className="flex items-center gap-2">
                <Building2 size={16} style={{ color: couleur }} />
                <span className={textPrimary}>{selectedChantier.nom}</span>
              </div>
            ) : (
              <span className={textMuted}>Selectionner un chantier...</span>
            )}
            {showChantierPicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {showChantierPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className={`max-h-48 overflow-y-auto rounded-xl border ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                  {activeChantiers.length === 0 ? (
                    <p className={`p-3 text-sm ${textMuted}`}>Aucun chantier en cours</p>
                  ) : (
                    activeChantiers.map(ch => (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setSelectedChantier(ch);
                          setShowChantierPicker(false);
                        }}
                        className={`w-full text-left p-3 border-b last:border-b-0 transition-all ${
                          selectedChantier?.id === ch.id
                            ? isDark ? 'bg-slate-700' : 'bg-slate-50'
                            : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                        } ${isDark ? 'border-slate-600' : 'border-slate-100'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${textPrimary}`}>{ch.nom}</p>
                            {ch.adresse && (
                              <p className={`text-xs ${textMuted} mt-0.5`}>{ch.adresse}</p>
                            )}
                          </div>
                          {selectedChantier?.id === ch.id && (
                            <CheckCircle2 size={16} style={{ color: couleur }} />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <div className="mt-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Check-in button */}
          <button
            onClick={handleCheckIn}
            disabled={!selectedChantier || loading}
            className="w-full mt-4 py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: couleur }}
          >
            {loading ? (
              <motion.div
                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                <Play size={24} />
                POINTER
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Render active session (working)
  const isPaused = session.state === SESSION_STATE.PAUSED;
  const isOnBreak = session.state === SESSION_STATE.BREAK;

  return (
    <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
      {/* Active session header */}
      <div
        className="px-4 py-3"
        style={{
          backgroundColor: isPaused || isOnBreak
            ? isDark ? '#475569' : '#f1f5f9'
            : '#10b981'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              className={`w-3 h-3 rounded-full ${isPaused || isOnBreak ? 'bg-amber-500' : 'bg-white'}`}
              animate={isPaused || isOnBreak ? {} : { scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className={isPaused || isOnBreak ? textPrimary : 'text-white'} >
              {isOnBreak ? 'En pause' : isPaused ? 'Timer en pause' : 'En cours'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={14} className={isPaused || isOnBreak ? 'text-emerald-500' : 'text-white/80'} />
            ) : (
              <WifiOff size={14} className="text-amber-500" />
            )}
          </div>
        </div>
      </div>

      {/* Timer display */}
      <div className="p-4 text-center">
        <p className={`text-xs ${textMuted} mb-1`}>
          <Building2 size={12} className="inline mr-1" />
          {session.chantierNom || 'Chantier'}
        </p>
        <p
          className={`text-5xl font-mono font-bold mb-2 ${textPrimary}`}
          style={isPaused || isOnBreak ? {} : { color: couleur }}
        >
          {formatElapsedTime(elapsed.workSeconds)}
        </p>
        {elapsed.breakSeconds > 0 && (
          <p className={`text-xs ${textMuted}`}>
            <Coffee size={12} className="inline mr-1" />
            Pauses: {formatElapsedTime(elapsed.breakSeconds)}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 pt-0 flex gap-3">
        {/* Pause/Resume button */}
        <button
          onClick={handlePauseToggle}
          disabled={isOnBreak}
          className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
            isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {isPaused ? <Play size={18} /> : <Pause size={18} />}
          {isPaused ? 'Reprendre' : 'Pause'}
        </button>

        {/* Break button */}
        <button
          onClick={handleBreakToggle}
          disabled={isPaused}
          className={`py-3 px-4 rounded-xl transition-all disabled:opacity-50 ${
            isOnBreak
              ? 'bg-amber-500 text-white'
              : isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Coffee size={18} />
        </button>
      </div>

      {/* Check-out button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => handleCheckOut()}
          disabled={loading}
          className="w-full py-4 rounded-xl bg-red-500 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <motion.div
              className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <Square size={20} />
              ARRETER - {Math.round(elapsed.workSeconds / 3600 * 10) / 10}h
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * SmartClockingMini - Compact version for sidebar/FAB
 */
export function SmartClockingMini({
  session,
  elapsed,
  onExpand,
  couleur = '#f97316',
  isDark = false
}) {
  if (!session) return null;

  const isPaused = session.state === SESSION_STATE.PAUSED;
  const isOnBreak = session.state === SESSION_STATE.BREAK;

  return (
    <motion.button
      onClick={onExpand}
      className={`fixed bottom-24 right-4 z-40 px-4 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        isPaused || isOnBreak ? 'bg-amber-500' : ''
      }`}
      style={isPaused || isOnBreak ? {} : { backgroundColor: '#10b981' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="w-2 h-2 rounded-full bg-white"
        animate={isPaused || isOnBreak ? {} : { scale: [1, 1.3, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <span className="text-white font-mono font-bold">
        {formatElapsedTime(elapsed.workSeconds)}
      </span>
      <Timer size={16} className="text-white" />
    </motion.button>
  );
}
