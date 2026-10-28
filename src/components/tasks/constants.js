// ── Tâches : constantes partagées ──
//
// Un statut, une priorité ou une catégorie = un mot et un ton (src/lib/statuts.js) : plus de couleur propre à chaque
// valeur. Le rouge est réservé à « en retard » (une tâche dont l'échéance est passée) ; l'ambre dit « à surveiller ».

/**
 * Classes de chaque ton, écrites en entier : Tailwind ne génère pas une classe composée (`bg-${ton}-fond`).
 * pastille = fond teinté + texte ; point = pastille pleine ; texte = texte seul.
 */
export const CLASSES_TON = {
  neutre: { pastille: 'bg-neutre-fond text-neutre-texte', point: 'bg-neutre-point', texte: 'text-neutre-texte' },
  info: { pastille: 'bg-info-fond text-info-texte', point: 'bg-info-point', texte: 'text-info-texte' },
  succes: { pastille: 'bg-succes-fond text-succes-texte', point: 'bg-succes-point', texte: 'text-succes-texte' },
  alerte: { pastille: 'bg-alerte-fond text-alerte-texte', point: 'bg-alerte-point', texte: 'text-alerte-texte' },
  danger: { pastille: 'bg-danger-fond text-danger-texte', point: 'bg-danger-point', texte: 'text-danger-texte' },
};
export const classesTon = (ton) => CLASSES_TON[ton] || CLASSES_TON.neutre;

export const CATEGORIES = [
  { value: 'rappel', label: 'Rappel', ton: 'neutre' },
  { value: 'achat', label: 'Achat', ton: 'neutre' },
  { value: 'rdv', label: 'RDV', ton: 'neutre' },
  { value: 'admin', label: 'Admin', ton: 'neutre' },
  { value: 'idee', label: 'Idée', ton: 'neutre' },
  { value: 'urgent', label: 'Urgent', ton: 'alerte' },
];

export const PRIORITIES = [
  { value: 'haute', label: 'Haute', ton: 'alerte' },
  { value: 'moyenne', label: 'Moyenne', ton: 'neutre' },
  { value: 'basse', label: 'Basse', ton: 'neutre' },
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
  { value: 'a_faire', label: 'À faire', ton: 'neutre', icon: 'Circle' },
  { value: 'en_cours', label: 'En cours', ton: 'info', icon: 'Clock' },
  { value: 'termine', label: 'Terminé', ton: 'succes', icon: 'CheckCircle' },
];
