import { useMemo } from 'react';
import { ClipboardList, CheckCircle2, ChevronRight, AlertCircle, Clock } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];

export default function DashboardMemos({ memos = [], toggleMemo, setPage, couleur = '#f97316', isDark = false }) {
  const tc = {
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-900',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
  };

  // Today's memos + overdue, max 5
  const todayMemos = useMemo(() => {
    const todayStr = today();
    return memos
      .filter(m => !m.is_done && m.due_date && m.due_date <= todayStr)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 5);
  }, [memos]);

  const overdueCount = memos.filter(m => !m.is_done && m.due_date && m.due_date < today()).length;

  if (todayMemos.length === 0 && memos.filter(m => !m.is_done).length === 0) return null;

  return (
    <div className={`rounded-2xl border ${tc.card} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${couleur}15` }}>
            <ClipboardList size={14} style={{ color: couleur }} />
          </div>
          <h2 className={`text-sm font-semibold ${tc.text}`}>Tâches du jour</h2>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
              <AlertCircle size={11} />
              {overdueCount} en retard
            </span>
          )}
        </div>
        <button
          onClick={() => setPage('tasks')}
          className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-1 transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Voir tout
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Memo list */}
      {todayMemos.length > 0 ? (
        <div className="space-y-1.5">
          {todayMemos.map(m => {
            const isOverdue = m.due_date < today();
            return (
              <div
                key={m.id}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                onClick={() => setPage('tasks')}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMemo(m.id); }}
                  className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDark ? 'border-slate-500' : 'border-slate-300'}`}
                  aria-label="Marquer comme fait"
                />
                <span className={`flex-1 text-sm truncate ${tc.text}`}>{m.text}</span>
                {isOverdue && <Clock size={12} className="text-red-500 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`text-center py-4 ${tc.muted}`}>
          <CheckCircle2 size={22} className="mx-auto mb-1.5 text-emerald-500 opacity-60" />
          <p className="text-xs">Rien de prévu aujourd'hui</p>
        </div>
      )}
    </div>
  );
}
