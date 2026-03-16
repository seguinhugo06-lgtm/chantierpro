/**
 * PhotoReportButton Component
 * Button to generate and download/send photo report PDFs
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  Download,
  Mail,
  Eye,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  generatePhotoReport,
  downloadPDF,
  previewPDF,
  sendReportByEmail,
} from '../../lib/reportGenerator';
import { Button } from '../ui/Button';
import { useToast } from '../../context/AppContext';

/**
 * @typedef {Object} PhotoReportButtonProps
 * @property {string} chantierId - Chantier ID
 * @property {string} [clientEmail] - Client email for send option
 * @property {string} [chantierName] - Chantier name for display
 * @property {'button' | 'icon' | 'menu-item'} [variant] - Button variant
 * @property {string} [className] - Additional CSS classes
 */

/**
 * PhotoReportButton - Generate and download/email photo reports
 * @param {PhotoReportButtonProps} props
 */
export default function PhotoReportButton({
  chantierId,
  clientEmail,
  chantierName,
  variant = 'button',
  className,
}) {
  const { showToast } = useToast();

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [progressMessage, setProgressMessage] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [reportResult, setReportResult] = React.useState(null);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState(null);

  /**
   * Handle generate report
   */
  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setProgressMessage('Demarrage...');
    setError(null);
    setReportResult(null);

    try {
      const result = await generatePhotoReport(chantierId, {
        onProgress: (p, msg) => {
          setProgress(p);
          setProgressMessage(msg);
        },
      });

      setReportResult(result);
      setShowModal(true);
    } catch (err) {
      console.error('Report generation error:', err);
      setError(err.message || 'Erreur lors de la generation');
      showToast(err.message || 'Erreur lors de la generation', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle download
   */
  const handleDownload = () => {
    if (reportResult) {
      downloadPDF(reportResult.blob, reportResult.filename);
      showToast('Rapport telecharge!', 'success');
    }
  };

  /**
   * Handle preview
   */
  const handlePreview = () => {
    if (reportResult) {
      previewPDF(reportResult.blob);
    }
  };

  /**
   * Handle send by email
   */
  const handleSendEmail = async () => {
    if (!reportResult || !clientEmail) return;

    setIsSending(true);

    try {
      const result = await sendReportByEmail(
        chantierId,
        clientEmail,
        reportResult.blob,
        {
          subject: `Rapport photos - ${chantierName || 'Chantier'}`,
        }
      );

      if (result.success) {
        showToast(result.message, 'success');
        setShowModal(false);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Email send error:', err);
      showToast(err.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Close modal
   */
  const handleClose = () => {
    setShowModal(false);
    setReportResult(null);
  };

  // Render button based on variant
  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            'hover:bg-gray-100 dark:hover:bg-slate-800',
            isGenerating && 'opacity-50 cursor-not-allowed',
            className
          )}
          title="Generer rapport PDF"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
        </button>
      );
    }

    if (variant === 'menu-item') {
      return (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
            'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800',
            isGenerating && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Generer rapport PDF
        </button>
      );
    }

    // Default button variant
    return (
      <Button
        variant="outline"
        onClick={handleGenerate}
        disabled={isGenerating}
        className={cn('gap-2', className)}
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        Generer rapport PDF
      </Button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {/* Progress overlay when generating */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4"
            >
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {/* Progress circle */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-gray-200 dark:text-slate-700"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={226}
                      strokeDashoffset={226 - (226 * progress) / 100}
                      className="text-orange-500 transition-all duration-300"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-gray-900 dark:text-white">
                    {progress}%
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Generation en cours
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {progressMessage}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result modal */}
      <AnimatePresence>
        {showModal && reportResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Rapport genere!
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {reportResult.photoCount} photos - {reportResult.pageCount} pages
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-3">
                <Button
                  variant="default"
                  onClick={handleDownload}
                  className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <Download className="w-4 h-4" />
                  Telecharger le PDF
                </Button>

                <Button
                  variant="outline"
                  onClick={handlePreview}
                  className="w-full gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Aperçu
                </Button>

                {clientEmail && (
                  <Button
                    variant="outline"
                    onClick={handleSendEmail}
                    disabled={isSending}
                    className="w-full gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Envoyer au client
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      ({clientEmail})
                    </span>
                  </Button>
                )}
              </div>

              {/* Filename */}
              <div className="px-4 pb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate">
                  {reportResult.filename}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      <AnimatePresence>
        {error && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm"
          >
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Erreur de generation
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * PhotoReportButtonSkeleton - Loading skeleton
 */
export function PhotoReportButtonSkeleton() {
  return (
    <div className="h-10 w-40 rounded-lg bg-gray-200 dark:bg-slate-700 animate-pulse" />
  );
}
