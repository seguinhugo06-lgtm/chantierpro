import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Package,
  TrendingDown,
  ShoppingCart,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import {
  checkStockLevels,
  predictStockNeeds,
  getStockSummary,
  formatCurrency,
  formatDate,
  getPriorityColor,
} from '../lib/stockAlerts';

/**
 * Priority icon component
 */
function PriorityIcon({ priority }) {
  switch (priority) {
    case 'urgent':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'critical':
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'warning':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <Package className="w-4 h-4 text-gray-500" />;
  }
}

/**
 * Alert item component
 */
function AlertItem({ alert, onAction }) {
  const colorClass = getPriorityColor(alert.priority);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <PriorityIcon priority={alert.priority} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white truncate">
            {alert.productName}
          </span>
          <Badge
            variant={
              alert.priority === 'urgent'
                ? 'danger'
                : alert.priority === 'critical'
                ? 'warning'
                : 'secondary'
            }
            size="sm"
          >
            {alert.priority}
          </Badge>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          {alert.currentQuantity} {alert.unit} restants
        </p>
      </div>
      {alert.action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction?.(alert)}
          className="flex-shrink-0"
        >
          {alert.action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Prediction item component
 */
function PredictionItem({ prediction }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800">
        <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white truncate">
            {prediction.productName}
          </span>
          <Badge variant="primary" size="sm">
            -{prediction.shortfall}
          </Badge>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Besoin: {prediction.predictedNeed} | Stock: {prediction.currentStock}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          Pour: {prediction.chantiers.slice(0, 2).join(', ')}
          {prediction.chantiers.length > 2 && ` +${prediction.chantiers.length - 2}`}
        </p>
      </div>
    </div>
  );
}

/**
 * Stock Alerts Widget for Dashboard
 *
 * @param {Object} props
 * @param {string} props.userId - Current user ID
 * @param {Function} props.onNavigate - Navigate to stock page
 * @param {boolean} props.compact - Compact mode for sidebar
 */
export default function StockAlertsWidget({ userId, onNavigate, compact = false }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);
      const data = await getStockSummary(userId);
      setSummary(data);
    } catch (err) {
      console.error('Error fetching stock summary:', err);
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAlertAction = (alert) => {
    // Navigate to stock page with product selected
    onNavigate?.('catalogue', { productId: alert.productId, action: alert.action?.type });
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-slate-600">{error}</p>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="mt-2">
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No issues
  if (!summary?.hasIssues) {
    return (
      <Card>
        <CardHeader
          title="Stock"
          action={
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          }
        />
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Stock OK
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Aucune alerte en cours
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compact mode (for sidebar)
  if (compact) {
    const totalAlerts = summary.alerts.total;
    const urgentCount = summary.alerts.urgent + summary.alerts.critical;

    return (
      <button
        onClick={() => onNavigate?.('catalogue')}
        className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
      >
        <div
          className={`p-2 rounded-lg ${
            urgentCount > 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
          }`}
        >
          <Package className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-900 dark:text-white">
            {totalAlerts} alerte{totalAlerts > 1 ? 's' : ''} stock
          </p>
          {urgentCount > 0 && (
            <p className="text-xs text-red-600">{urgentCount} urgent{urgentCount > 1 ? 's' : ''}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  // Full widget
  return (
    <Card>
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            <span>Alertes Stock</span>
            {summary.alerts.total > 0 && (
              <Badge variant="danger" size="sm">
                {summary.alerts.total}
              </Badge>
            )}
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('catalogue')}
              className="gap-1"
            >
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p className="text-2xl font-bold text-red-600">{summary.alerts.urgent}</p>
            <p className="text-xs text-red-600">Urgents</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <p className="text-2xl font-bold text-orange-600">{summary.alerts.critical}</p>
            <p className="text-xs text-orange-600">Critiques</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <p className="text-2xl font-bold text-yellow-600">{summary.alerts.warning}</p>
            <p className="text-xs text-yellow-600">Attention</p>
          </div>
        </div>

        {/* Alerts list */}
        {summary.alerts.items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Alertes prioritaires
            </h4>
            {summary.alerts.items.map((alert) => (
              <AlertItem key={alert.productId} alert={alert} onAction={handleAlertAction} />
            ))}
          </div>
        )}

        {/* Predictions */}
        {summary.predictions.items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Besoins prevus (2 semaines)
            </h4>
            {summary.predictions.items.slice(0, 3).map((prediction) => (
              <PredictionItem key={prediction.productId} prediction={prediction} />
            ))}
          </div>
        )}

        {/* Dormant stock value */}
        {summary.waste.dormantValue > 0 && (
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Stock dormant
                </span>
              </div>
              <span className="text-sm font-bold text-purple-600">
                {formatCurrency(summary.waste.dormantValue)}
              </span>
            </div>
            <p className="text-xs text-purple-600 mt-1">
              {summary.waste.total} produit{summary.waste.total > 1 ? 's' : ''} sans mouvement depuis 6+ mois
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
