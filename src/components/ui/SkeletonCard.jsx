/**
 * SkeletonCard — Reusable skeleton loader for list cards
 *
 * @param {boolean} isDark - Dark mode
 * @param {number} count - Number of skeleton cards to show
 * @param {'default'|'compact'|'wide'} variant - Card layout variant
 */
export default function SkeletonCard({ isDark = false, count = 4, variant = 'default' }) {
  const bg = isDark ? 'bg-slate-700' : 'bg-slate-200';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${cardBg} rounded-xl border p-3 animate-pulse flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg ${bg} shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 ${bg} rounded w-2/3`} />
              <div className={`h-3 ${bg} rounded w-1/3`} />
            </div>
            <div className={`h-6 w-16 ${bg} rounded-full`} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'wide') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${cardBg} rounded-xl border overflow-hidden animate-pulse`}>
            <div className={`h-1 w-full ${bg}`} />
            <div className="px-4 py-3 space-y-3">
              <div className="flex justify-between">
                <div className={`h-5 ${bg} rounded w-1/2`} />
                <div className={`h-5 ${bg} rounded w-20`} />
              </div>
              <div className="flex gap-2">
                <div className={`h-4 ${bg} rounded w-24`} />
                <div className={`h-4 ${bg} rounded-full w-16`} />
              </div>
              <div className={`h-3 ${bg} rounded w-1/3`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${cardBg} rounded-xl border p-4 animate-pulse`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 ${bg} rounded w-3/4`} />
              <div className={`h-3 ${bg} rounded w-1/2`} />
              <div className="flex gap-2 pt-1">
                <div className={`h-5 ${bg} rounded-full w-16`} />
                <div className={`h-5 ${bg} rounded-full w-12`} />
              </div>
            </div>
            <div className={`h-8 w-8 rounded-lg ${bg}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
