import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, FileText } from 'lucide-react';

export default function RapportPreview({ blob, filename, onClose, onDownload, isDark }) {
  const [objectUrl, setObjectUrl] = useState(null);

  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';

  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [blob]);

  const handlePrint = () => {
    if (objectUrl) {
      const printWindow = window.open(objectUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Header bar */}
        <motion.div
          className={`relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 ${cardBg} border-b ${borderColor}`}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={18} className={textMuted} />
            <span className={`text-sm font-medium ${textPrimary} truncate`}>
              {filename || 'Rapport PDF'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold bg-surface text-encre border border-bord-fort hover:bg-surface-2 transition-colors"
              title="Télécharger"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Télécharger</span>
            </button>
            <button
              onClick={handlePrint}
              className={`p-2 rounded-xl transition-all hover:bg-surface-2 text-encre-2`}
              title="Imprimer"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all hover:bg-surface-2 text-encre-2`}
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>

        {/* PDF viewer */}
        <motion.div
          className="relative z-10 flex-1 flex items-center justify-center p-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {objectUrl ? (
            <iframe
              src={objectUrl}
              className="w-full h-full max-w-4xl rounded-xl shadow-2xl bg-white"
              style={{ minHeight: '400px' }}
              title="Aperçu du rapport"
            />
          ) : (
            <div className={`flex flex-col items-center gap-3 ${textMuted}`}>
              <FileText size={48} />
              <p className="text-sm">Chargement du PDF...</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
