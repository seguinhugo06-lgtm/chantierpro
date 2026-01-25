import React from 'react';
import { Receipt, Download, CreditCard, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

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
 * Check if date is overdue
 * @param {string} dateStr
 * @returns {boolean}
 */
const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

/**
 * Get status badge info for facture
 * @param {string} statut
 * @param {string} echeance
 * @returns {{ variant: string, label: string, icon: React.ComponentType }}
 */
const getStatusInfo = (statut, echeance) => {
  if (statut === 'payee') {
    return { variant: 'success', label: 'Payee', icon: CheckCircle };
  }
  if (isOverdue(echeance)) {
    return { variant: 'danger', label: 'En retard', icon: AlertTriangle };
  }
  return { variant: 'warning', label: 'Impayee', icon: Clock };
};

/**
 * FactureCard - Display a single invoice with payment option
 * @param {Object} props
 * @param {Object} props.facture - Facture object
 * @param {Function} props.onDownload - Callback to download PDF
 * @param {Function} props.onPay - Callback to initiate payment
 */
export default function FactureCard({ facture, onDownload, onPay }) {
  const statusInfo = getStatusInfo(facture.statut, facture.echeance);
  const StatusIcon = statusInfo.icon;
  const canPay = facture.statut !== 'payee';
  const overdue = isOverdue(facture.echeance) && facture.statut !== 'payee';

  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${
      overdue ? 'border-red-200 bg-red-50/30' : ''
    }`}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              facture.statut === 'payee'
                ? 'bg-green-100'
                : overdue
                  ? 'bg-red-100'
                  : 'bg-amber-100'
            }`}>
              <Receipt className={`w-6 h-6 ${
                facture.statut === 'payee'
                  ? 'text-green-600'
                  : overdue
                    ? 'text-red-600'
                    : 'text-amber-600'
              }`} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Facture #{facture.numero}
                </h3>
                {facture.description && (
                  <p className="text-sm text-slate-600 mt-0.5 line-clamp-1">
                    {facture.description}
                  </p>
                )}
              </div>
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
              <span className="font-semibold text-lg text-slate-900">
                {formatCurrency(facture.total_ttc)}
              </span>
              <span className="text-slate-400">|</span>
              <span>Emise le {formatDate(facture.created_at)}</span>
              {facture.echeance && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className={overdue ? 'text-red-600 font-medium' : ''}>
                    Echeance: {formatDate(facture.echeance)}
                  </span>
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
            onClick={() => onDownload?.(facture.id)}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Telecharger PDF
          </Button>

          {canPay && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onPay?.(facture)}
              className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <CreditCard className="w-4 h-4" />
              Payer maintenant
            </Button>
          )}
        </div>

        {/* Payment reminder for overdue */}
        {overdue && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Cette facture est en retard de paiement
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Veuillez proceder au reglement dans les plus brefs delais.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
