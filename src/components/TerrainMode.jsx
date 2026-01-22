import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  X, HardHat, Clock, Plus, Minus, Camera, MapPin, Phone,
  FileText, Euro, Check, Pause, Play, Coffee, Sun, Moon,
  ChevronUp, ChevronDown, AlertTriangle, Mic, Image
} from 'lucide-react';

/**
 * TerrainMode - Field mode with extra-large buttons for gloved hands
 * Critical for Jean-Marc on construction site at 7am
 *
 * Features:
 * - 64px minimum touch targets (vs standard 44px)
 * - High contrast colors for outdoor visibility
 * - Simplified interface with most common actions
 * - Voice notes capability
 * - Quick photo capture for expenses
 */
export default function TerrainMode({
  isOpen,
  onClose,
  // Data
  chantiers = [],
  equipe = [],
  currentUser,
  // Actions
  onStartTimer,
  onStopTimer,
  onAddDepense,
  onAddNote,
  onTakePhoto,
  // Settings
  isDark = false,
  couleur = '#f97316'
}) {
  const [activeChantier, setActiveChantier] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showDepenseForm, setShowDepenseForm] = useState(false);
  const [depenseAmount, setDepenseAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(null);

  // High contrast colors for outdoor use
  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Format timer display
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle timer toggle
  const handleTimerToggle = () => {
    if (timerRunning) {
      onStopTimer?.(timerSeconds, activeChantier);
      setShowSuccess('Temps enregistre');
      setTimeout(() => setShowSuccess(null), 2000);
    } else {
      onStartTimer?.(activeChantier);
    }
    setTimerRunning(!timerRunning);
  };

  // Handle quick expense
  const handleQuickDepense = (amount) => {
    onAddDepense?.({
      montant: amount,
      chantierId: activeChantier?.id,
      categorie: 'Materiaux',
      date: new Date().toISOString()
    });
    setShowSuccess(`${amount} EUR ajoute`);
    setTimeout(() => setShowSuccess(null), 2000);
    setShowDepenseForm(false);
    setDepenseAmount('');
  };

  // Quick amounts for common expenses
  const quickAmounts = [20, 50, 100, 200];

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: bgColor }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Header - Always visible */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: couleur }}
        >
          <div className="flex items-center gap-3">
            <HardHat size={28} className="text-white" />
            <div>
              <h1 className="text-xl font-bold text-white">Mode Terrain</h1>
              <p className="text-white/80 text-sm">
                {activeChantier?.nom || 'Selectionnez un chantier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-14 h-14 flex items-center justify-center bg-white/20 rounded-2xl"
          >
            <X size={28} className="text-white" />
          </button>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              className="absolute top-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-2xl z-50 flex items-center gap-3"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
            >
              <Check size={24} />
              {showSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {/* Chantier selector (if not selected) */}
          {!activeChantier && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: textColor }}>
                Chantier du jour
              </h2>
              <div className="space-y-3">
                {chantiers.filter(c => c.statut === 'en_cours').slice(0, 4).map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChantier(ch)}
                    className="w-full p-5 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      minHeight: '80px'
                    }}
                  >
                    <p className="font-bold text-xl" style={{ color: textColor }}>
                      {ch.nom}
                    </p>
                    {ch.adresse && (
                      <p className="text-base mt-1 flex items-center gap-2" style={{ color: mutedColor }}>
                        <MapPin size={18} />
                        {ch.adresse}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main actions (when chantier selected) */}
          {activeChantier && (
            <>
              {/* Timer section */}
              <div className="mb-6">
                <div
                  className="p-6 rounded-3xl text-center"
                  style={{
                    backgroundColor: timerRunning ? '#10b981' : (isDark ? '#1e293b' : '#f1f5f9')
                  }}
                >
                  <p
                    className="text-6xl font-mono font-bold mb-4"
                    style={{ color: timerRunning ? '#ffffff' : textColor }}
                  >
                    {formatTime(timerSeconds)}
                  </p>

                  <button
                    onClick={handleTimerToggle}
                    className="w-full py-6 rounded-2xl text-2xl font-bold flex items-center justify-center gap-4 transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: timerRunning ? '#ffffff' : couleur,
                      color: timerRunning ? '#10b981' : '#ffffff',
                      minHeight: '80px'
                    }}
                  >
                    {timerRunning ? (
                      <>
                        <Pause size={32} />
                        ARRETER
                      </>
                    ) : (
                      <>
                        <Play size={32} />
                        DEMARRER
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick actions grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Add expense */}
                <button
                  onClick={() => setShowDepenseForm(true)}
                  className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    minHeight: '120px'
                  }}
                >
                  <Euro size={40} style={{ color: couleur }} />
                  <span className="font-bold text-lg" style={{ color: textColor }}>
                    Depense
                  </span>
                </button>

                {/* Take photo */}
                <button
                  onClick={onTakePhoto}
                  className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    minHeight: '120px'
                  }}
                >
                  <Camera size={40} style={{ color: couleur }} />
                  <span className="font-bold text-lg" style={{ color: textColor }}>
                    Photo
                  </span>
                </button>

                {/* Voice note */}
                <button
                  onClick={onAddNote}
                  className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    minHeight: '120px'
                  }}
                >
                  <Mic size={40} style={{ color: couleur }} />
                  <span className="font-bold text-lg" style={{ color: textColor }}>
                    Note vocale
                  </span>
                </button>

                {/* Break */}
                <button
                  className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    minHeight: '120px'
                  }}
                >
                  <Coffee size={40} style={{ color: couleur }} />
                  <span className="font-bold text-lg" style={{ color: textColor }}>
                    Pause
                  </span>
                </button>
              </div>

              {/* Change chantier */}
              <button
                onClick={() => setActiveChantier(null)}
                className="w-full py-4 rounded-2xl text-lg font-medium flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                  color: mutedColor
                }}
              >
                Changer de chantier
              </button>
            </>
          )}
        </div>

        {/* Expense form modal */}
        <AnimatePresence>
          {showDepenseForm && (
            <motion.div
              className="absolute inset-0 bg-black/60 flex items-end justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDepenseForm(false)}
            >
              <motion.div
                className="w-full rounded-t-3xl p-6"
                style={{ backgroundColor: bgColor }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold mb-6" style={{ color: textColor }}>
                  Ajouter une depense
                </h3>

                {/* Quick amounts */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {quickAmounts.map(amount => (
                    <button
                      key={amount}
                      onClick={() => handleQuickDepense(amount)}
                      className="py-6 rounded-2xl text-2xl font-bold transition-all active:scale-[0.98]"
                      style={{
                        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                        color: textColor
                      }}
                    >
                      {amount} EUR
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={depenseAmount}
                    onChange={e => setDepenseAmount(e.target.value)}
                    placeholder="Autre montant"
                    className="flex-1 px-6 py-5 rounded-2xl text-2xl font-bold text-center"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      color: textColor,
                      border: 'none'
                    }}
                  />
                  <button
                    onClick={() => depenseAmount && handleQuickDepense(parseFloat(depenseAmount))}
                    disabled={!depenseAmount}
                    className="px-8 py-5 rounded-2xl text-white text-2xl font-bold disabled:opacity-50"
                    style={{ backgroundColor: couleur }}
                  >
                    OK
                  </button>
                </div>

                {/* Cancel */}
                <button
                  onClick={() => setShowDepenseForm(false)}
                  className="w-full mt-4 py-4 rounded-2xl text-lg font-medium"
                  style={{ color: mutedColor }}
                >
                  Annuler
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

/**
 * TerrainModeToggle - Quick access button for terrain mode
 */
export function TerrainModeToggle({ onClick, isDark, couleur }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-40 transition-all hover:scale-110 active:scale-95"
      style={{ backgroundColor: couleur }}
      title="Mode Terrain"
    >
      <HardHat size={24} className="text-white" />
    </button>
  );
}
