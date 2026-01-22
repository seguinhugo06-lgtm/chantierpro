import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  X, Mail, Phone, MessageCircle, AlertTriangle, Clock, Send,
  Check, ChevronRight, Copy, ExternalLink, Bell, BellOff,
  Calendar, Euro, User, FileText
} from 'lucide-react';
import {
  getPendingRelances,
  formatRelanceForDisplay,
  createRelanceRecord,
  RELANCE_TEMPLATES
} from '../services/RelanceService';

/**
 * RelanceCenter - Centralized reminder management
 * Shows all pending invoice reminders with one-click actions
 */
export default function RelanceCenter({
  isOpen,
  onClose,
  factures = [],
  clients = [],
  entreprise,
  relanceHistory = {},
  onSendRelance,
  onMarkAsSent,
  isDark = false,
  couleur = '#f97316'
}) {
  const [selectedRelance, setSelectedRelance] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Get all pending reminders
  const pendingRelances = useMemo(() => {
    const pending = getPendingRelances(factures, clients, relanceHistory);
    return pending.map(r => formatRelanceForDisplay(r, entreprise));
  }, [factures, clients, relanceHistory, entreprise]);

  // Group by priority
  const groupedRelances = useMemo(() => {
    const groups = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    pendingRelances.forEach(r => {
      groups[r.priority]?.push(r);
    });
    return groups;
  }, [pendingRelances]);

  // Priority config
  const priorityConfig = {
    critical: {
      label: 'Critique',
      color: '#ef4444',
      bgLight: 'bg-red-50',
      bgDark: 'bg-red-900/20',
      icon: AlertTriangle
    },
    high: {
      label: 'Urgent',
      color: '#f59e0b',
      bgLight: 'bg-amber-50',
      bgDark: 'bg-amber-900/20',
      icon: Clock
    },
    medium: {
      label: 'A faire',
      color: '#3b82f6',
      bgLight: 'bg-blue-50',
      bgDark: 'bg-blue-900/20',
      icon: Mail
    },
    low: {
      label: 'Rappel',
      color: '#10b981',
      bgLight: 'bg-emerald-50',
      bgDark: 'bg-emerald-900/20',
      icon: Bell
    }
  };

  // Copy email content to clipboard
  const handleCopyEmail = async (relance) => {
    const text = `Objet: ${relance.subject}\n\n${relance.body}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(relance.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send email (opens mailto)
  const handleSendEmail = (relance) => {
    const mailtoUrl = `mailto:${relance.clientEmail}?subject=${encodeURIComponent(relance.subject)}&body=${encodeURIComponent(relance.body)}`;
    window.open(mailtoUrl, '_blank');
    onMarkAsSent?.(relance.factureId, relance.templateId, 'email');
  };

  // Send SMS (opens sms link on mobile)
  const handleSendSMS = (relance) => {
    if (!relance.sms) return;
    const smsUrl = `sms:${relance.clientTelephone}?body=${encodeURIComponent(relance.sms)}`;
    window.open(smsUrl, '_blank');
    onMarkAsSent?.(relance.factureId, relance.templateId, 'sms');
  };

  // Call client
  const handleCall = (relance) => {
    window.open(`tel:${relance.clientTelephone}`, '_blank');
    onMarkAsSent?.(relance.factureId, relance.templateId, 'phone');
  };

  const totalAmount = pendingRelances.reduce((sum, r) => sum + (r.montant || 0), 0);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          className={`relative w-full sm:max-w-2xl max-h-[90vh] ${cardBg} rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div
            className="px-6 pt-6 pb-4 flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bell size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Centre de relances</h2>
                  <p className="text-white/80 text-sm">
                    {pendingRelances.length} relance{pendingRelances.length > 1 ? 's' : ''} en attente
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Stats bar */}
            {pendingRelances.length > 0 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <Euro size={16} className="text-white/80" />
                  <span className="text-white font-bold">
                    {totalAmount.toLocaleString('fr-FR')} EUR
                  </span>
                  <span className="text-white/60 text-sm">a encaisser</span>
                </div>
                <div className="flex gap-2 ml-auto">
                  {Object.entries(groupedRelances).map(([priority, items]) => (
                    items.length > 0 && (
                      <span
                        key={priority}
                        className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white"
                      >
                        {items.length} {priorityConfig[priority].label.toLowerCase()}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {pendingRelances.length === 0 ? (
              <div className={`text-center py-12 ${textMuted}`}>
                <Check size={48} className="mx-auto mb-3 text-emerald-500" />
                <p className="font-medium text-emerald-600">Aucune relance en attente</p>
                <p className="text-sm mt-1">Toutes vos factures sont a jour</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Priority groups */}
                {Object.entries(groupedRelances).map(([priority, items]) => (
                  items.length > 0 && (
                    <div key={priority}>
                      {/* Group header */}
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const Icon = priorityConfig[priority].icon;
                          return <Icon size={14} style={{ color: priorityConfig[priority].color }} />;
                        })()}
                        <span
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{ color: priorityConfig[priority].color }}
                        >
                          {priorityConfig[priority].label} ({items.length})
                        </span>
                      </div>

                      {/* Relance cards */}
                      <div className="space-y-2">
                        {items.map(relance => (
                          <RelanceCard
                            key={relance.id}
                            relance={relance}
                            priorityConfig={priorityConfig[relance.priority]}
                            onSelect={() => setSelectedRelance(relance)}
                            onCopy={() => handleCopyEmail(relance)}
                            onSendEmail={() => handleSendEmail(relance)}
                            onSendSMS={() => handleSendSMS(relance)}
                            onCall={() => handleCall(relance)}
                            isCopied={copiedId === relance.id}
                            isDark={isDark}
                            couleur={couleur}
                          />
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t flex-shrink-0 ${borderColor}`}>
            <p className={`text-center text-xs ${textMuted}`}>
              Les relances sont basees sur la date d'echeance de vos factures
            </p>
          </div>
        </motion.div>

        {/* Detail modal */}
        {selectedRelance && (
          <RelanceDetailModal
            relance={selectedRelance}
            onClose={() => setSelectedRelance(null)}
            onCopy={() => handleCopyEmail(selectedRelance)}
            onSendEmail={() => {
              handleSendEmail(selectedRelance);
              setSelectedRelance(null);
            }}
            isDark={isDark}
            couleur={couleur}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

/**
 * Individual relance card
 */
function RelanceCard({
  relance,
  priorityConfig,
  onSelect,
  onCopy,
  onSendEmail,
  onSendSMS,
  onCall,
  isCopied,
  isDark,
  couleur
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: priorityConfig.color }} />
            <span className={`font-medium ${textPrimary}`}>
              {relance.factureNumero}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${priorityConfig.color}20`,
                color: priorityConfig.color
              }}
            >
              {relance.joursRetard}j
            </span>
          </div>
          <p className={`text-sm ${textMuted} mt-0.5`}>
            {relance.clientNom}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold" style={{ color: couleur }}>
            {(relance.montant || 0).toLocaleString('fr-FR')} EUR
          </p>
          <p className={`text-xs ${textMuted}`}>{relance.templateName}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {relance.canSendEmail && (
          <button
            onClick={onSendEmail}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 min-h-[44px]"
            style={{ backgroundColor: couleur }}
          >
            <Mail size={16} />
            Email
          </button>
        )}

        {relance.canSendSMS && (
          <button
            onClick={onSendSMS}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
              isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MessageCircle size={16} />
          </button>
        )}

        {relance.clientTelephone && (
          <button
            onClick={onCall}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
              isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Phone size={16} />
          </button>
        )}

        <button
          onClick={onCopy}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
            isCopied
              ? 'bg-emerald-500 text-white'
              : isDark
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>

        <button
          onClick={onSelect}
          className={`flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
            isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Relance detail modal
 */
function RelanceDetailModal({ relance, onClose, onCopy, onSendEmail, isDark, couleur }) {
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        className={`relative w-full max-w-lg ${cardBg} rounded-2xl shadow-2xl overflow-hidden`}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div>
            <h3 className={`font-bold ${textPrimary}`}>Apercu du message</h3>
            <p className={`text-sm ${textMuted}`}>{relance.templateName}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <X size={20} className={textMuted} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="mb-4">
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${textMuted}`}>Objet</p>
            <p className={`font-medium ${textPrimary}`}>{relance.subject}</p>
          </div>

          <div>
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${textMuted}`}>Message</p>
            <pre className={`text-sm whitespace-pre-wrap font-sans ${textPrimary}`}>
              {relance.body}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t flex gap-3"
          style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <button
            onClick={onCopy}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium min-h-[48px] ${
              isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Copy size={18} />
            Copier
          </button>
          {relance.canSendEmail && (
            <button
              onClick={onSendEmail}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white min-h-[48px]"
              style={{ backgroundColor: couleur }}
            >
              <Send size={18} />
              Envoyer
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
