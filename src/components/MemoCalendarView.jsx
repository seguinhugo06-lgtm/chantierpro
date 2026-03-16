import { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, Building2, Users, Tag, Plus } from 'lucide-react';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const PRIORITIES = {
  haute: '#ef4444',
  moyenne: '#f59e0b',
  basse: '#22c55e',
};

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
  }

  return days;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeFR(t) {
  if (!t) return '';
  return t.substring(0, 5);
}

// HOURS for week view
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00

export default function MemoCalendarView({
  memos = [],
  onSelectMemo,
  selectedMemoId,
  toggleMemo,
  addMemo,
  chantiers = [],
  clients = [],
  couleur = '#f97316',
  isDark = false,
}) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  });
  const hoverTimeoutRef = useRef(null);

  const tc = {
    text: isDark ? 'text-white' : 'text-slate-900',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    border: isDark ? 'border-slate-700' : 'border-slate-200',
    cellBg: isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50',
    selectedBg: isDark ? 'bg-slate-700' : 'bg-orange-50',
  };

  // Group memos by date
  const memosByDate = useMemo(() => {
    const map = {};
    memos.forEach(m => {
      if (m.due_date) {
        if (!map[m.due_date]) map[m.due_date] = [];
        map[m.due_date].push(m);
      }
    });
    return map;
  }, [memos]);

  const monthDays = useMemo(
    () => getMonthDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const todayKey = formatDateKey(now);

  const goToPrevMonth = () => {
    if (viewMode === 'week') {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      setWeekStart(d);
    } else {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
      else setCurrentMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMode === 'week') {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      setWeekStart(d);
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
      else setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(todayKey);
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    setWeekStart(new Date(d.getFullYear(), d.getMonth(), diff));
  };

  const selectedDateMemos = selectedDate ? (memosByDate[selectedDate] || []) : [];

  // Handle adding a new memo with pre-filled date
  const handleAddMemoForDate = (dateStr) => {
    if (addMemo) {
      addMemo({ text: '', due_date: dateStr });
    }
  };

  // Week view days
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const headerText = viewMode === 'week'
    ? `${weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${MONTHS_FR[currentMonth]} ${currentYear}`;

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goToPrevMonth} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ChevronLeft size={18} className={tc.muted} />
          </button>
          <h3 className={`text-sm font-semibold ${tc.text} min-w-[180px] text-center`}>
            {headerText}
          </h3>
          <button onClick={goToNextMonth} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ChevronRight size={18} className={tc.muted} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          {['month', 'week'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                viewMode === mode
                  ? 'text-white'
                  : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
              style={viewMode === mode ? { backgroundColor: couleur } : {}}
            >
              {mode === 'month' ? 'Mois' : 'Semaine'}
            </button>
          ))}
          <button
            onClick={goToToday}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium ml-1 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* ── MONTH VIEW ── */}
      {viewMode === 'month' && (
        <>
          <div className="grid grid-cols-7 gap-px mb-4">
            {DAYS.map(d => (
              <div key={d} className={`text-center text-xs font-medium py-1.5 ${tc.muted}`}>{d}</div>
            ))}

            {monthDays.map(({ date, isCurrentMonth }, i) => {
              const dateKey = formatDateKey(date);
              const dayMemos = memosByDate[dateKey] || [];
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;
              const isHovered = dateKey === hoveredDate;
              const hasMemos = dayMemos.length > 0;

              return (
                <div key={i} className="relative">
                  <button
                    onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                    onMouseEnter={() => {
                      if (hasMemos) {
                        hoverTimeoutRef.current = setTimeout(() => setHoveredDate(dateKey), 300);
                      }
                    }}
                    onMouseLeave={() => {
                      clearTimeout(hoverTimeoutRef.current);
                      setHoveredDate(null);
                    }}
                    className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                      isSelected ? tc.selectedBg : tc.cellBg
                    } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                    style={isToday ? { boxShadow: `inset 0 0 0 2px ${couleur}`, borderRadius: '0.5rem' } : {}}
                  >
                    <span className={`${isToday ? 'font-bold' : 'font-medium'} ${tc.text}`}>
                      {date.getDate()}
                    </span>
                    {hasMemos && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayMemos.slice(0, 3).map((m, j) => (
                          <div
                            key={j}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: m.is_done ? '#94a3b8' : PRIORITIES[m.priority] || couleur
                            }}
                          />
                        ))}
                        {dayMemos.length > 3 && (
                          <span className={`text-[8px] ${tc.muted}`}>+{dayMemos.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Tooltip on hover */}
                  {isHovered && hasMemos && !isSelected && (
                    <div className={`absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 ${isDark ? 'bg-slate-700' : 'bg-white'} shadow-lg rounded-lg p-2 text-xs min-w-[140px] max-w-[200px] border ${tc.border}`}>
                      {dayMemos.slice(0, 4).map(m => (
                        <div key={m.id} className={`py-0.5 truncate ${m.is_done ? 'line-through opacity-50' : ''} ${tc.text}`}>
                          {m.priority === 'haute' ? '🔴 ' : m.priority === 'moyenne' ? '🟡 ' : m.priority === 'basse' ? '🟢 ' : ''}{m.text}
                        </div>
                      ))}
                      {dayMemos.length > 4 && (
                        <div className={`pt-0.5 ${tc.muted}`}>+{dayMemos.length - 4} de plus</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected date memos */}
          {selectedDate && (
            <div className={`border-t ${tc.border} pt-3`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`text-xs font-semibold uppercase tracking-wide ${tc.muted}`}>
                  📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                  <span className="ml-2 font-normal">
                    ({selectedDateMemos.length} mémo{selectedDateMemos.length !== 1 ? 's' : ''})
                  </span>
                </h4>
                {addMemo && (
                  <button
                    onClick={() => handleAddMemoForDate(selectedDate)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-white"
                    style={{ backgroundColor: couleur }}
                  >
                    <Plus size={12} />
                    Ajouter
                  </button>
                )}
              </div>

              {selectedDateMemos.length > 0 ? (
                <div className="space-y-1">
                  {selectedDateMemos.map(m => {
                    const chantier = m.chantier_id ? chantiers.find(c => c.id === m.chantier_id) : null;
                    const client = m.client_id ? clients.find(c => c.id === m.client_id) : null;

                    return (
                      <div
                        key={m.id}
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedMemoId === m.id
                            ? isDark ? 'bg-slate-700' : 'bg-slate-100'
                            : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                        } ${m.is_done ? 'opacity-60' : ''}`}
                        onClick={() => onSelectMemo(m.id)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMemo(m.id); }}
                          className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
                            m.is_done
                              ? 'border-green-500 bg-green-500 text-white'
                              : isDark ? 'border-slate-500' : 'border-slate-300'
                          }`}
                        >
                          {m.is_done && <CheckCircle2 size={10} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${m.is_done ? 'line-through' : ''} ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {m.text}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {m.due_time && (
                              <span className={`text-xs ${tc.muted}`}>{formatTimeFR(m.due_time)}</span>
                            )}
                            {chantier && (
                              <span className={`inline-flex items-center gap-0.5 text-xs ${tc.muted}`}>
                                <Building2 size={9} /> {chantier.nom}
                              </span>
                            )}
                            {client && (
                              <span className={`inline-flex items-center gap-0.5 text-xs ${tc.muted}`}>
                                <Users size={9} /> {client.nom}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`text-center py-4 ${tc.muted}`}>
                  <p className="text-sm">Aucun mémo ce jour</p>
                  {addMemo && (
                    <button
                      onClick={() => handleAddMemoForDate(selectedDate)}
                      className="mt-2 text-xs hover:underline"
                      style={{ color: couleur }}
                    >
                      + Ajouter un mémo pour ce jour
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── WEEK VIEW ── */}
      {viewMode === 'week' && (
        <div className={`border rounded-lg ${tc.border} overflow-hidden`}>
          {/* Header row with day names */}
          <div className={`grid grid-cols-[50px_repeat(7,1fr)] border-b ${tc.border}`}>
            <div className={`p-2 text-xs font-medium ${tc.muted}`}></div>
            {weekDays.map((d, i) => {
              const dateKey = formatDateKey(d);
              const isToday = dateKey === todayKey;
              const dayMemos = memosByDate[dateKey] || [];
              return (
                <div
                  key={i}
                  className={`p-2 text-center border-l ${tc.border} ${isToday ? (isDark ? 'bg-slate-700' : 'bg-orange-50') : ''}`}
                >
                  <div className={`text-xs font-medium ${tc.muted}`}>{DAYS[i]}</div>
                  <div className={`text-sm font-semibold ${isToday ? '' : ''} ${tc.text}`}>{d.getDate()}</div>
                  {/* All-day memos (no time) */}
                  {dayMemos.filter(m => !m.due_time && !m.is_done).map(m => (
                    <div
                      key={m.id}
                      onClick={() => onSelectMemo(m.id)}
                      className="mt-1 px-1 py-0.5 rounded text-[10px] truncate cursor-pointer text-white"
                      style={{ backgroundColor: PRIORITIES[m.priority] || couleur }}
                      title={m.text}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Time slots */}
          <div className="max-h-[400px] overflow-y-auto">
            {HOURS.map(hour => (
              <div key={hour} className={`grid grid-cols-[50px_repeat(7,1fr)] border-b ${tc.border} min-h-[36px]`}>
                <div className={`p-1 text-[10px] text-right pr-2 ${tc.muted}`}>
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map((d, i) => {
                  const dateKey = formatDateKey(d);
                  const dayMemos = memosByDate[dateKey] || [];
                  const hourMemos = dayMemos.filter(m => {
                    if (!m.due_time || m.is_done) return false;
                    const h = parseInt(m.due_time.split(':')[0]);
                    return h === hour;
                  });

                  return (
                    <div key={i} className={`border-l ${tc.border} p-0.5 min-h-[36px]`}>
                      {hourMemos.map(m => (
                        <div
                          key={m.id}
                          onClick={() => onSelectMemo(m.id)}
                          className="px-1 py-0.5 rounded text-[10px] truncate cursor-pointer text-white mb-0.5"
                          style={{ backgroundColor: PRIORITIES[m.priority] || couleur }}
                          title={`${formatTimeFR(m.due_time)} - ${m.text}`}
                        >
                          {formatTimeFR(m.due_time)} {m.text}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
