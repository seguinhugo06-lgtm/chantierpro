import { Loader2 } from 'lucide-react';

/**
 * Spinner - Simple loading spinner
 */
export function Spinner({ size = 24, className = '' }) {
  return (
    <Loader2
      size={size}
      className={`animate-spin ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * LoadingOverlay - Full screen or container loading overlay
 */
export function LoadingOverlay({
  message = 'Chargement...',
  fullScreen = false,
  isDark = false
}) {
  const bgColor = isDark ? 'bg-slate-900/80' : 'bg-white/80';
  const textColor = isDark ? 'text-white' : 'text-slate-900';

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50'
    : 'absolute inset-0 z-10';

  return (
    <div
      className={`${containerClasses} ${bgColor} backdrop-blur-sm flex flex-col items-center justify-center`}
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner size={40} className={textColor} />
      {message && (
        <p className={`mt-4 text-sm font-medium ${textColor}`}>
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * LoadingButton - Button with loading state
 * (Use Button component with loading prop instead for most cases)
 */
export function LoadingButton({
  loading,
  children,
  loadingText,
  ...props
}) {
  return (
    <button disabled={loading} {...props}>
      {loading ? (
        <>
          <Spinner size={16} className="mr-2" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Skeleton - Loading placeholder
 */
export function Skeleton({
  width,
  height = '1rem',
  rounded = 'md',
  className = '',
  isDark = false
}) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  return (
    <div
      className={`animate-pulse ${roundedClasses[rounded]} ${isDark ? 'bg-slate-700' : 'bg-slate-200'} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonCard - Card-shaped loading placeholder
 */
export function SkeletonCard({ isDark = false, className = '' }) {
  return (
    <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-700' : 'border-slate-200'} ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton width="48px" height="48px" rounded="xl" isDark={isDark} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="20px" isDark={isDark} />
          <Skeleton width="40%" height="16px" isDark={isDark} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton width="100%" height="12px" isDark={isDark} />
        <Skeleton width="80%" height="12px" isDark={isDark} />
      </div>
    </div>
  );
}

/**
 * SkeletonList - List of skeleton items
 */
export function SkeletonList({ count = 3, isDark = false, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} isDark={isDark} />
      ))}
    </div>
  );
}

/**
 * PageLoader - Full page loading state
 */
export function PageLoader({ message, isDark = false }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Spinner size={48} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
      {message && (
        <p className={`mt-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * InlineLoader - Small inline loading indicator
 */
export function InlineLoader({ text = 'Chargement', isDark = false }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
      <Spinner size={14} />
      {text}
    </span>
  );
}

export default LoadingOverlay;
