import React, { useState } from 'react';
import { FileText, Download, Check, X, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';

/**
 * Format currency to EUR
 * @param {number} amount
 * @returns {string}
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
};

/**
 * Format date to French locale
 * @param {string} dateStr
 * @returns {string}
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
};

/**
 * Get status badge variant and label
 * @param {string} statut
 * @returns {{ variant: string, label: string, icon: React.ComponentType }}
 */
const getStatusInfo = (statut) => {
  switch (statut) {
    case 'accepte':
      return { variant: 'success', label: 'Accepte', icon: CheckCircle };
    case 'refuse':
      return { variant: 'danger', label: 'Refuse', icon: XCircle };
    case 'envoye':
    case 'en_attente':
      return { variant: 'warning', label: 'En attente', icon: Clock };
    default:
      return { variant: 'secondary', label: statut, icon: Clock };
  }
};

/**
 * DevisCard - Display a single devis with actions
 * @param {Object} props
 * @param {Object} props.devis - Devis object
 * @param {Function} props.onAccept - Callback when devis is accepted
 * @param {Function} props.onRefuse - Callback when devis is refused
 * @param {Function} props.onDownload - Callback to download PDF
 */
export default function DevisCard({ devis, onAccept, onRefuse, onDownload }) {
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusInfo = getStatusInfo(devis.statut);
  const StatusIcon = statusInfo.icon;
  const canRespond = ['envoye', 'en_attente'].includes(devis.statut);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept?.(devis.id);
      setShowAcceptModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefuse = async () => {
    setLoading(true);
    try {
      await onRefuse?.(devis.id);
      setShowRefuseModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Devis #{devis.numero}
                  </h3>
                  {devis.description && (
                    <p className="text-sm text-slate-600 mt-0.5 line-clamp-1">
                      {devis.description}
                    </p>
                  )}
                </div>
                <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="font-semibold text-lg text-slate-900">
                  {formatCurrency(devis.total_ttc)}
                </span>
                <span className="text-slate-400">|</span>
                <span>{formatDate(devis.created_at)}</span>
                {devis.valid_until && (
                  <>
                    <span className="text-slate-400">|</span>
                    <span>Valide jusqu'au {formatDate(devis.valid_until)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 p-4 pt-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload?.(devis.id)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Telecharger PDF
            </Button>

            {canRespond && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAcceptModal(true)}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  Accepter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRefuseModal(true)}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                  Refuser
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accept Modal */}
      <Modal
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        title="Accepter le devis"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Vous etes sur le point d'accepter le devis <strong>#{devis.numero}</strong> d'un montant de{' '}
            <strong>{formatCurrency(devis.total_ttc)}</strong>.
          </p>
          <p className="text-sm text-slate-500">
            En acceptant ce devis, vous confirmez votre accord pour les travaux decrits.
            L'artisan sera notifie et vous recontactera sous 48h.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAcceptModal(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleAccept}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Confirmer l'acceptation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refuse Modal */}
      <Modal
        isOpen={showRefuseModal}
        onClose={() => setShowRefuseModal(false)}
        title="Refuser le devis"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Vous etes sur le point de refuser le devis <strong>#{devis.numero}</strong>.
          </p>
          <p className="text-sm text-slate-500">
            Cette action est definitive. L'artisan sera notifie de votre decision.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRefuseModal(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleRefuse}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Confirmer le refus
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
