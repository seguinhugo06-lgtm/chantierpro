import { Component, useState } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * With fallback:
 * <ErrorBoundary fallback={<CustomError />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you could send to error tracking service here
    // e.g., Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Minimal fallback for small components
      if (this.props.minimal) {
        return (
          <MinimalErrorFallback
            error={this.state.error}
            onRetry={this.handleReset}
            isDark={this.props.isDark}
          />
        );
      }

      // Full error page
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleReset}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          isDark={this.props.isDark}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Full error fallback UI
 */
function ErrorFallback({
  error,
  errorInfo,
  onRetry,
  onReload,
  onGoHome,
  isDark = false,
  showDetails = false
}) {
  const bgColor = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-[400px] flex items-center justify-center p-6 ${bgColor}`}>
      <div className={`max-w-md w-full ${cardBg} rounded-2xl border p-6 text-center`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-500" />
        </div>

        <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>
          Oups, quelque chose s'est mal passé
        </h2>

        <p className={`mb-6 ${textMuted}`}>
          Une erreur inattendue s'est produite. Nous nous excusons pour la gêne occasionnée.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw size={16} />
            Réessayer
          </button>

          <button
            onClick={onReload}
            className={`px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors ${
              isDark
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RefreshCw size={16} />
            Recharger la page
          </button>

          <button
            onClick={onGoHome}
            className={`px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors ${
              isDark
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Home size={16} />
            Accueil
          </button>
        </div>

        {showDetails && error && (
          <details className={`mt-6 text-left text-sm ${textMuted}`}>
            <summary className="cursor-pointer hover:text-slate-600 mb-2">
              Détails techniques
            </summary>
            <div className={`p-3 rounded-lg font-mono text-xs overflow-auto max-h-40 ${
              isDark ? 'bg-slate-900' : 'bg-slate-100'
            }`}>
              <p className="font-bold text-red-500">{error.toString()}</p>
              {errorInfo && (
                <pre className="mt-2 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal error fallback for inline components
 */
function MinimalErrorFallback({ error, onRetry, isDark = false }) {
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`p-4 text-center ${textMuted}`}>
      <AlertTriangle size={24} className="mx-auto mb-2 text-amber-500" />
      <p className="text-sm mb-2">Erreur de chargement</p>
      <button
        onClick={onRetry}
        className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 mx-auto"
      >
        <RefreshCw size={14} />
        Réessayer
      </button>
    </div>
  );
}

/**
 * withErrorBoundary - HOC to wrap components with error boundary
 */
export function withErrorBoundary(WrappedComponent, errorBoundaryProps = {}) {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * useErrorHandler - Hook to manually trigger error boundary
 * (For catching errors in event handlers, async code, etc.)
 */
export function useErrorHandler() {
  const [error, setError] = useState(null);

  if (error) {
    throw error;
  }

  return (err) => {
    setError(err);
  };
}

export default ErrorBoundary;
