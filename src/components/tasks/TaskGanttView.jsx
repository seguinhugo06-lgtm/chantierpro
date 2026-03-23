import { useState, useMemo, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from './constants';

// ════════════════════════════════════════════════════════
// TaskGanttView — Custom Gantt chart (HTML/CSS, no lib)
// ════════════════════════════════════════════════════════

const ZOOM_LEVELS = [
  { id: 'day', label: 'Jour', cellWidth: 30 },
  { id: 'week', label: 'Semaine', cellWidth: 120 },
  { id: 'month', label: 'Mois', cellWidth: 200 },
];

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 28;
const BAR_Y_OFFSET = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const NAME_COL_WIDTH = 200;

const CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.color])
);

// ── Date helpers ──

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d) {
  const r = startOfDay(d);
  const day = r.getDay();
  r.setDate(r.getDate() - ((day + 6) % 7)); // Monday
  return r;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatShortDate(d) {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatMonthYear(d) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatWeekLabel(d) {
  const end = addDays(d, 6);
  return `${d.getDate()}/${d.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// ── Filter helpers ──

function applyFilters(memos, filters) {
  return memos.filter(m => {
    if (!m.due_date) return false;
    if (m.is_done && filters.status !== 'termine') return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!(m.title || '').toLowerCase().includes(s) && !(m.content || '').toLowerCase().includes(s)) return false;
    }
    if (filters.category && m.category !== filters.category) return false;
    if (filters.priority && m.priority !== filters.priority) return false;
    if (filters.status) {
      const status = m.status || (m.is_done ? 'termine' : 'a_faire');
      if (status !== filters.status) return false;
    }
    return true;
  });
}

// ── Timeline generation ──

function generateTimeline(startDate, endDate, zoom) {
  const cells = [];
  if (zoom === 'day') {
    let d = startOfDay(startDate);
    while (d <= endDate) {
      cells.push({ date: new Date(d), label: formatShortDate(d), isWeekend: isWeekend(d) });
      d = addDays(d, 1);
    }
  } else if (zoom === 'week') {
    let d = startOfWeek(startDate);
    while (d <= endDate) {
      cells.push({ date: new Date(d), label: formatWeekLabel(d), isWeekend: false });
      d = addDays(d, 7);
    }
  } else {
    let d = startOfMonth(startDate);
    while (d <= endDate) {
      cells.push({ date: new Date(d), label: formatMonthYear(d), isWeekend: false });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
  }
  return cells;
}

// ── Tooltip component ──

function Tooltip({ memo, x, y, isDark }) {
  const status = memo.status || (memo.is_done ? 'Terminé' : 'À faire');
  const priorityLabel = memo.priority === 'haute' ? 'Haute' : memo.priority === 'moyenne' ? 'Moyenne' : memo.priority === 'basse' ? 'Basse' : '';

  return (
    <div
      className={`fixed z-50 px-3 py-2 rounded-lg shadow-lg text-xs max-w-xs pointer-events-none ${
        isDark ? 'bg-slate-700 text-slate-100 border border-slate-600' : 'bg-white text-slate-800 border border-slate-200'
      }`}
      style={{ left: x + 12, top: y - 10 }}
    >
      <div className="font-semibold mb-1 truncate">{memo.title}</div>
      <div className={isDark ? 'text-slate-300' : 'text-slate-500'}>
        {memo.due_date}{memo.due_date_end ? ` → ${memo.due_date_end}` : ''}
      </div>
      {status && <div className="mt-0.5">Statut : {status}</div>}
      {priorityLabel && <div>Priorité : {priorityLabel}</div>}
      {memo.subtasks?.length > 0 && (
        <div>Sous-tâches : {memo.subtasks.filter(s => s.done).length}/{memo.subtasks.length}</div>
      )}
    </div>
  );
}

// ── Main component ──

export default function TaskGanttView({ memos, updateMemo, chantiers, clients, isDark, couleur, filters, onSelectMemo }) {
  const [zoom, setZoom] = useState('day');
  const scrollRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const zoomLevel = ZOOM_LEVELS.find(z => z.id === zoom);
  const cellWidth = zoomLevel.cellWidth;

  // Filtered memos (only those with dates)
  const filteredMemos = useMemo(() => applyFilters(memos, filters), [memos, filters]);

  // Sort by due_date
  const sortedMemos = useMemo(() =>
    [...filteredMemos].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
    [filteredMemos]
  );

  // Timeline range
  const { timelineStart, timelineEnd, timeline } = useMemo(() => {
    const today = startOfDay(new Date());
    if (sortedMemos.length === 0) {
      const s = startOfMonth(today);
      const e = endOfMonth(today);
      return { timelineStart: s, timelineEnd: e, timeline: generateTimeline(s, e, zoom) };
    }
    const dates = sortedMemos.flatMap(m => {
      const start = parseDate(m.due_date);
      const end = parseDate(m.due_date_end) || start;
      return [start, end].filter(Boolean);
    });
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const s = addDays(minDate, -7);
    const e = addDays(maxDate, 14);
    return { timelineStart: s, timelineEnd: e, timeline: generateTimeline(s, e, zoom) };
  }, [sortedMemos, zoom]);

  // Today line position
  const todayOffset = useMemo(() => {
    const today = startOfDay(new Date());
    if (zoom === 'day') {
      return diffDays(timelineStart, today) * cellWidth;
    } else if (zoom === 'week') {
      const weekStart = startOfWeek(timelineStart);
      return (diffDays(weekStart, today) / 7) * cellWidth;
    } else {
      const monthsDiff = (today.getFullYear() - timelineStart.getFullYear()) * 12
        + today.getMonth() - timelineStart.getMonth()
        + today.getDate() / 30;
      return monthsDiff * cellWidth;
    }
  }, [timelineStart, cellWidth, zoom]);

  // Bar position calculator
  const getBarProps = useCallback((memo) => {
    const start = parseDate(memo.due_date);
    if (!start) return null;
    const end = parseDate(memo.due_date_end) || start;

    let x, width;
    if (zoom === 'day') {
      x = diffDays(timelineStart, start) * cellWidth;
      width = Math.max((diffDays(start, end) + 1) * cellWidth, cellWidth);
    } else if (zoom === 'week') {
      const weekStart = startOfWeek(timelineStart);
      x = (diffDays(weekStart, start) / 7) * cellWidth;
      const durationDays = diffDays(start, end) + 1;
      width = Math.max((durationDays / 7) * cellWidth, cellWidth * 0.15);
    } else {
      const msStart = timelineStart.getTime();
      const totalMs = timelineEnd.getTime() - msStart;
      const totalWidth = timeline.length * cellWidth;
      x = ((start.getTime() - msStart) / totalMs) * totalWidth;
      const durationMs = end.getTime() - start.getTime() + 86400000;
      width = Math.max((durationMs / totalMs) * totalWidth, cellWidth * 0.1);
    }

    return { x, width };
  }, [timelineStart, timelineEnd, timeline, cellWidth, zoom]);

  // Subtask progress
  const getProgress = (memo) => {
    if (!memo.subtasks || memo.subtasks.length === 0) {
      return memo.is_done ? 1 : 0;
    }
    const done = memo.subtasks.filter(s => s.done).length;
    return done / memo.subtasks.length;
  };

  // Bar color by category
  const getBarColor = (memo) => {
    if (memo.category && CATEGORY_COLORS[memo.category]) {
      return CATEGORY_COLORS[memo.category];
    }
    return couleur || '#f97316';
  };

  const handleMouseEnter = (e, memo) => {
    setTooltip({ memo, x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (tooltip) {
      setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollLeft -= cellWidth * 3;
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollLeft += cellWidth * 3;
  };

  // Scroll to today on mount
  const scrollInitialized = useRef(false);
  useMemo(() => {
    scrollInitialized.current = false;
  }, [zoom]);

  const setScrollRef = useCallback((node) => {
    scrollRef.current = node;
    if (node && !scrollInitialized.current) {
      scrollInitialized.current = true;
      const scrollTo = Math.max(0, todayOffset - node.clientWidth / 3);
      node.scrollLeft = scrollTo;
    }
  }, [todayOffset]);

  const totalWidth = timeline.length * cellWidth;
  const totalHeight = sortedMemos.length * ROW_HEIGHT;

  const gridBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const bgMain = isDark ? 'bg-slate-900' : 'bg-white';
  const bgHeader = isDark ? 'bg-slate-800' : 'bg-slate-50';
  const textColor = isDark ? 'text-slate-300' : 'text-slate-700';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const nameBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  if (sortedMemos.length === 0) {
    return (
      <div className={`rounded-xl border p-8 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <p className={`text-sm ${textMuted}`}>
          Aucune tâche avec date à afficher.
        </p>
        <p className={`text-xs mt-1 ${textMuted}`}>
          Ajoutez une date d'échéance à vos tâches pour les voir dans le Gantt.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${bgMain} ${gridBorder}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${bgHeader} ${gridBorder}`}>
        <div className="flex items-center gap-1">
          {ZOOM_LEVELS.map(z => (
            <button
              key={z.id}
              onClick={() => setZoom(z.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                zoom === z.id
                  ? 'text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
              style={zoom === z.id ? { background: couleur } : {}}
            >
              {z.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={scrollLeft}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => {
              if (scrollRef.current) {
                const scrollTo = Math.max(0, todayOffset - scrollRef.current.clientWidth / 3);
                scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={scrollRight}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Gantt body */}
      <div className="flex overflow-hidden" style={{ height: Math.min(totalHeight + 40, 600) }}>
        {/* Name column (hidden on mobile) */}
        <div
          className={`hidden sm:block flex-shrink-0 border-r overflow-hidden ${nameBg}`}
          style={{ width: NAME_COL_WIDTH }}
        >
          {/* Header spacer */}
          <div className={`h-10 border-b ${gridBorder} flex items-center px-3`}>
            <span className={`text-xs font-semibold ${textMuted}`}>Tâche</span>
          </div>
          {/* Task names */}
          <div className="overflow-y-auto" style={{ height: Math.min(totalHeight, 560) }}>
            {sortedMemos.map(memo => (
              <div
                key={memo.id}
                className={`flex items-center px-3 border-b cursor-pointer transition-colors ${gridBorder} ${
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                }`}
                style={{ height: ROW_HEIGHT }}
                onClick={() => onSelectMemo?.(memo.id)}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mr-2"
                  style={{ background: getBarColor(memo) }}
                />
                <span className={`text-xs truncate ${textColor}`}>
                  {memo.title || 'Sans titre'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline area */}
        <div
          ref={setScrollRef}
          className="flex-1 overflow-auto"
          onMouseMove={handleMouseMove}
        >
          {/* Timeline header */}
          <div className={`sticky top-0 z-10 h-10 border-b ${bgHeader} ${gridBorder}`} style={{ width: totalWidth }}>
            <div className="flex h-full">
              {timeline.map((cell, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 flex items-center justify-center border-r text-xs ${gridBorder} ${
                    cell.isWeekend
                      ? isDark ? 'text-slate-500' : 'text-slate-400'
                      : textMuted
                  }`}
                  style={{ width: cellWidth }}
                >
                  {cell.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
            {/* Grid lines */}
            {timeline.map((cell, i) => (
              <div
                key={i}
                className={`absolute top-0 bottom-0 border-r ${gridBorder} ${
                  cell.isWeekend ? (isDark ? 'bg-slate-800/50' : 'bg-slate-50/80') : ''
                }`}
                style={{ left: i * cellWidth, width: cellWidth }}
              />
            ))}

            {/* Row dividers */}
            {sortedMemos.map((_, i) => (
              <div
                key={i}
                className={`absolute left-0 right-0 border-b ${gridBorder}`}
                style={{ top: (i + 1) * ROW_HEIGHT }}
              />
            ))}

            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= totalWidth && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: todayOffset, width: 2, background: '#ef4444', opacity: 0.5 }}
              />
            )}

            {/* Task bars */}
            {sortedMemos.map((memo, i) => {
              const barProps = getBarProps(memo);
              if (!barProps) return null;
              const { x, width } = barProps;
              const color = getBarColor(memo);
              const progress = getProgress(memo);
              const y = i * ROW_HEIGHT + BAR_Y_OFFSET;

              return (
                <div
                  key={memo.id}
                  className="absolute rounded-md cursor-pointer transition-opacity hover:opacity-90 overflow-hidden"
                  style={{
                    left: x,
                    top: y,
                    width: Math.max(width, 4),
                    height: BAR_HEIGHT,
                    background: `${color}40`,
                    border: `1px solid ${color}80`,
                  }}
                  onClick={() => onSelectMemo?.(memo.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, memo)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Progress fill */}
                  {progress > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-l-md"
                      style={{
                        width: `${progress * 100}%`,
                        background: `${color}90`,
                      }}
                    />
                  )}
                  {/* Title text */}
                  <span
                    className="absolute inset-0 flex items-center px-1.5 text-[10px] font-medium truncate z-10"
                    style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                  >
                    {/* On mobile, always show name; on desktop, only if bar is wide enough */}
                    <span className="sm:hidden truncate">{memo.title || 'Sans titre'}</span>
                    {width >= 50 && (
                      <span className="hidden sm:inline truncate">{memo.title || 'Sans titre'}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && <Tooltip memo={tooltip.memo} x={tooltip.x} y={tooltip.y} isDark={isDark} />}
    </div>
  );
}
