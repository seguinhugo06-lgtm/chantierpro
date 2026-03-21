// ── Tâches : constantes partagées ──

export const CATEGORIES = [
  { value: 'rappel', label: 'Rappel', color: '#3b82f6' },
  { value: 'achat', label: 'Achat', color: '#f59e0b' },
  { value: 'rdv', label: 'RDV', color: '#8b5cf6' },
  { value: 'admin', label: 'Admin', color: '#6366f1' },
  { value: 'idee', label: 'Idée', color: '#22c55e' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export const PRIORITIES = [
  { value: 'haute', label: 'Haute', color: '#ef4444', dot: '🔴' },
  { value: 'moyenne', label: 'Moyenne', color: '#f59e0b', dot: '🟡' },
  { value: 'basse', label: 'Basse', color: '#22c55e', dot: '🟢' },
];

export const PRIORITY_ORDER = { haute: 0, moyenne: 1, basse: 2 };

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récent' },
  { value: 'oldest', label: 'Plus ancien' },
  { value: 'priority', label: 'Priorité' },
  { value: 'alpha', label: 'Alphabétique' },
];

export const RECURRENCE_OPTIONS = [
  { value: '', label: 'Aucune' },
  { value: 'daily', label: 'Tous les jours' },
  { value: 'weekly', label: 'Toutes les semaines' },
  { value: 'monthly', label: 'Tous les mois' },
  { value: 'custom', label: 'Personnalisé' },
];

export const TASK_STATUSES = [
  { value: 'a_faire', label: 'À faire', color: '#3b82f6', icon: 'Circle' },
  { value: 'en_cours', label: 'En cours', color: '#f59e0b', icon: 'Clock' },
  { value: 'termine', label: 'Terminé', color: '#10b981', icon: 'CheckCircle' },
];
