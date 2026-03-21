// ── Tâches : fonctions utilitaires ──

export const today = () => new Date().toISOString().split('T')[0];

export const isOverdue = (m) => !m.is_done && m.due_date && m.due_date < today();

export const isToday = (m) => m.due_date === today();

export const isFuture = (m) => m.due_date && m.due_date > today();

export const isUndated = (m) => !m.due_date;

export const formatDateFR = (d) => {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const formatTimeFR = (t) => {
  if (!t) return '';
  return t.substring(0, 5); // "09:30:00" -> "09:30"
};

export const getNextOccurrence = (currentDate, recurrence) => {
  if (!currentDate || !recurrence) return null;
  const date = new Date(currentDate + 'T00:00:00');
  const type = recurrence.type || recurrence;
  const interval = recurrence.interval || 1;

  switch (type) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 * interval));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
    case 'custom': {
      const unit = recurrence.unit || 'day';
      if (unit === 'day') date.setDate(date.getDate() + interval);
      else if (unit === 'week') date.setDate(date.getDate() + (7 * interval));
      else if (unit === 'month') date.setMonth(date.getMonth() + interval);
      break;
    }
    default: return null;
  }
  return date.toISOString().split('T')[0];
};
