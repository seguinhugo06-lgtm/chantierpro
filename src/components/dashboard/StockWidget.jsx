import * as React from 'react';

import {
  Package,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Lightbulb,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import Widget, {
  WidgetHeader,
  WidgetContent,
  WidgetFooter,
  WidgetEmptyState,
  WidgetMenuButton,
  WidgetLink,
} from './Widget';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import {
  checkStockLevels,
  predictStockNeeds,
  groupPurchaseOpportunity,
  formatCurrency,
  getPriorityColor,
} from '../../lib/stockAlerts';

/**
 * @typedef {Object} StockWidgetProps
 * @property {string} userId - User ID for data fetching
 * @property {string} [className] - Additional CSS classes
 */

// Refresh interval (5 minutes)
const REFRESH_INTERVAL = 5 * 60 * 1000;

// Max alerts to show before collapsing
const MAX_VISIBLE_ALERTS = 3;

/**
 * Progress bar component for stock levels
 */
function StockProgressBar({ current, threshold, className, isDark = false }) {
  const percentage = threshold > 0 ? Math.min(100, (current / threshold) * 100) : 0;

  let colorClass = 'bg-green-500';
  if (percentage <= 25) {
    colorClass = 'bg-red-500';
  } else if (percentage <= 50) {
    colorClass = 'bg-orange-500';
  }

  return (
    <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-gray-200', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-300', colorClass)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

/**
 * Single alert card component
 */
function AlertCard({ alert, onOrder, onDismiss, isDismissing, isDark = false }) {
  const priorityColors = {
    urgent: isDark ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50',
    critical: isDark ? 'border-orange-800 bg-orange-900/20' : 'border-orange-200 bg-orange-50',
    warning: isDark ? 'border-yellow-800 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50',
  };

  const iconColors = {
    urgent: 'text-red-500',
    critical: 'text-orange-500',
    warning: 'text-yellow-500',
  };

  const percentage = alert.threshold > 0
    ? Math.round((alert.currentQuantity / alert.threshold) * 100)
    : 0;

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-all',
      priorityColors[alert.priority] || priorityColors.warning
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', iconColors[alert.priority])} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', isDark ? 'text-white' : 'text-gray-900')}>
            {alert.productName}
          </p>
          <p className={cn('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-600')}>
            Stock : {alert.currentQuantity} / Seuil : {alert.threshold} {alert.unit}
          </p>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <StockProgressBar
              current={alert.currentQuantity}
              threshold={alert.threshold}
              className="flex-1"
              isDark={isDark}
            />
            <span className={cn('text-xs font-medium w-10 text-right', isDark ? 'text-gray-400' : 'text-gray-500')}>
              {percentage}%
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="primary"
              size="xs"
              onClick={() => onOrder(alert)}
              className="text-xs"
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Commander {alert.threshold * 2}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onDismiss(alert.productId)}
              disabled={isDismissing}
              className="text-xs text-gray-500"
            >
              {isDismissing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                'Ignorer'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Prediction item component
 */
function PredictionItem({ prediction, isDark = false }) {
  const hasSufficient = prediction.shortfall <= 0;

  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-gray-400 mt-0.5">•</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-700')}>
          <span className="font-medium">{prediction.predictedNeed}</span> {prediction.productName}
          <span className={cn('text-xs ml-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
            ({prediction.chantiers.length} chantier{prediction.chantiers.length > 1 ? 's' : ''})
          </span>
        </p>
        <p className={cn(
          'text-xs mt-0.5 flex items-center gap-1',
          hasSufficient
            ? isDark ? 'text-green-400' : 'text-green-600'
            : isDark ? 'text-orange-400' : 'text-orange-600'
        )}>
          {hasSufficient ? (
            <>
              <Check className="w-3 h-3" />
              Stock suffisant
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3" />
              Manque {prediction.shortfall} unites
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Optimization card component
 */
function OptimizationCard({ opportunity, onViewDetails, isDark = false }) {
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      isDark
        ? 'bg-blue-900/20 border-blue-800'
        : 'bg-blue-50 border-blue-200'
    )}>
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', isDark ? 'text-blue-100' : 'text-blue-900')}>
            Commander {opportunity.products.length} produits chez {opportunity.supplier}
          </p>
          <p className={cn('text-xs mt-1', isDark ? 'text-blue-300' : 'text-blue-700')}>
            = -{opportunity.discountPercent}% ({formatCurrency(opportunity.totalWithoutDiscount)} → {formatCurrency(opportunity.totalWithDiscount)})
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onViewDetails(opportunity)}
            className={cn('mt-2 p-0', isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700')}
          >
            Voir details
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Order modal component
 */
function OrderModal({ isOpen, onClose, alert, onConfirm }) {
  const [quantity, setQuantity] = React.useState(alert?.threshold * 2 || 10);
  const [isOrdering, setIsOrdering] = React.useState(false);

  React.useEffect(() => {
    if (alert) {
      setQuantity(alert.threshold * 2);
    }
  }, [alert]);

  const handleOrder = async () => {
    setIsOrdering(true);
    // Simulate order creation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onConfirm?.(alert, quantity);
    setIsOrdering(false);
    onClose();
  };

  if (!alert) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Commander {alert.productName}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Stock actuel : <span className="font-medium text-gray-900 dark:text-white">{alert.currentQuantity} {alert.unit}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantite a commander
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              min="1"
            />
          </div>

          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Stock apres commande :
              <span className="font-medium text-gray-900 dark:text-white ml-1">
                {alert.currentQuantity + quantity} {alert.unit}
              </span>
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleOrder} disabled={isOrdering}>
          {isOrdering ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
              Commande en cours...
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Commander
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Group purchase details modal
 */
function GroupPurchaseModal({ isOpen, onClose, opportunity }) {
  if (!opportunity) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Commande groupee - {opportunity.supplier}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Economie potentielle : {formatCurrency(opportunity.savings)} (-{opportunity.discountPercent}%)
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Produits inclus ({opportunity.products.length})
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {opportunity.products.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {product.productName}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {product.quantity} x {formatCurrency(product.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Sous-total</span>
              <span className="text-gray-500 dark:text-gray-400 line-through">
                {formatCurrency(opportunity.totalWithoutDiscount)}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Remise (-{opportunity.discountPercent}%)</span>
              <span className="text-green-600 dark:text-green-400">
                -{formatCurrency(opportunity.savings)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(opportunity.totalWithDiscount)}
              </span>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Fermer
        </Button>
        <Button variant="primary">
          <ShoppingCart className="w-4 h-4 mr-1.5" />
          Creer commande
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * StockWidget - Dashboard widget for stock alerts and predictions
 *
 * @param {StockWidgetProps} props
 */
export default function StockWidget({ userId, className, setPage, isDark = false }) {

  // State
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [alerts, setAlerts] = React.useState([]);
  const [predictions, setPredictions] = React.useState([]);
  const [opportunities, setOpportunities] = React.useState([]);
  const [showAllAlerts, setShowAllAlerts] = React.useState(false);
  const [dismissedAlerts, setDismissedAlerts] = React.useState(new Set());
  const [dismissingId, setDismissingId] = React.useState(null);

  // Modals
  const [orderModalAlert, setOrderModalAlert] = React.useState(null);
  const [groupPurchaseModal, setGroupPurchaseModal] = React.useState(null);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);

      const [alertsData, predictionsData, opportunitiesData] = await Promise.all([
        checkStockLevels(userId),
        predictStockNeeds(userId, 14), // 2 weeks ahead
        groupPurchaseOpportunity(userId),
      ]);

      setAlerts(alertsData);
      setPredictions(predictionsData.slice(0, 5)); // Top 5
      setOpportunities(opportunitiesData.slice(0, 1)); // Top 1
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch and refresh interval
  React.useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter out dismissed alerts
  const visibleAlerts = React.useMemo(() => {
    return alerts.filter((a) => !dismissedAlerts.has(a.productId));
  }, [alerts, dismissedAlerts]);

  // Critical + warning counts
  const criticalCount = visibleAlerts.filter((a) => a.priority === 'urgent' || a.priority === 'critical').length;

  // Handle dismiss
  const handleDismiss = async (productId) => {
    setDismissingId(productId);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDismissedAlerts((prev) => new Set([...prev, productId]));
    setDismissingId(null);

    // Auto-restore after 24h (store in localStorage in real app)
    setTimeout(() => {
      setDismissedAlerts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }, 24 * 60 * 60 * 1000);
  };

  // Handle order
  const handleOrder = (alert, quantity) => {
    console.log('Order placed:', { alert, quantity });
    // In real app: create order in database, update predicted stock
  };

  // Handle navigate
  const handleManageStock = () => {
    setPage?.('catalogue');
  };

  const handleViewMovements = () => {
    setPage?.('catalogue');
  };

  // Alerts to display
  const displayedAlerts = showAllAlerts
    ? visibleAlerts
    : visibleAlerts.slice(0, MAX_VISIBLE_ALERTS);

  const hasMoreAlerts = visibleAlerts.length > MAX_VISIBLE_ALERTS;

  // Empty state
  const isEmpty = !loading && visibleAlerts.length === 0 && predictions.length === 0;

  return (
    <>
      <Widget
        loading={loading}
        empty={isEmpty}
        isDark={isDark}
        emptyState={
          <WidgetEmptyState
            icon={<Check className="text-green-500" />}
            title="Stock bien gere"
            description="Aucune alerte ni besoin prevu"
            ctaLabel="Voir le stock"
            onCtaClick={handleManageStock}
            isDark={isDark}
          />
        }
        className={className}
      >
        <WidgetHeader
          title="Stock & Approvisionnement"
          icon={<Package />}
          isDark={isDark}
          actions={
            <Button variant="ghost" size="sm" onClick={fetchData} className="p-1.5">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          }
        />

        <WidgetContent className="space-y-4">
          {error ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Reessayer
              </Button>
            </div>
          ) : (
            <>
              {/* Critical Alerts Section */}
              {visibleAlerts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      Alertes critiques ({criticalCount})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {displayedAlerts.map((alert) => (
                      <AlertCard
                        key={alert.productId}
                        alert={alert}
                        onOrder={setOrderModalAlert}
                        onDismiss={handleDismiss}
                        isDismissing={dismissingId === alert.productId}
                        isDark={isDark}
                      />
                    ))}
                  </div>

                  {hasMoreAlerts && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllAlerts(!showAllAlerts)}
                      className="w-full mt-2 text-xs"
                    >
                      {showAllAlerts ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Voir toutes ({visibleAlerts.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Predictions Section */}
              {predictions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-blue-500" />
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      Besoins prevus (14 jours)
                    </span>
                  </div>

                  <div className="pl-1">
                    {predictions.map((prediction) => (
                      <PredictionItem key={prediction.productId} prediction={prediction} isDark={isDark} />
                    ))}
                  </div>
                </div>
              )}

              {/* Optimization Section */}
              {opportunities.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      Optimisation
                    </span>
                  </div>

                  {opportunities.map((opportunity, index) => (
                    <OptimizationCard
                      key={index}
                      opportunity={opportunity}
                      onViewDetails={setGroupPurchaseModal}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </WidgetContent>

        <WidgetFooter isDark={isDark}>
          <WidgetLink onClick={handleManageStock} isDark={isDark}>
            Gerer stock
          </WidgetLink>
          <WidgetLink onClick={handleViewMovements} isDark={isDark}>
            Voir mouvements
          </WidgetLink>
        </WidgetFooter>
      </Widget>

      {/* Order Modal */}
      <OrderModal
        isOpen={!!orderModalAlert}
        onClose={() => setOrderModalAlert(null)}
        alert={orderModalAlert}
        onConfirm={handleOrder}
      />

      {/* Group Purchase Modal */}
      <GroupPurchaseModal
        isOpen={!!groupPurchaseModal}
        onClose={() => setGroupPurchaseModal(null)}
        opportunity={groupPurchaseModal}
      />
    </>
  );
}

/**
 * StockWidgetSkeleton - Full skeleton for the widget
 */
export function StockWidgetSkeleton() {
  return (
    <Widget loading>
      <WidgetHeader title="Stock & Approvisionnement" icon={<Package />} />
      <WidgetContent>
        <div className="animate-pulse space-y-4">
          {/* Alerts skeleton */}
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-gray-100 dark:bg-slate-800" />
            ))}
          </div>

          {/* Predictions skeleton */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 rounded bg-gray-100 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </WidgetContent>
    </Widget>
  );
}
