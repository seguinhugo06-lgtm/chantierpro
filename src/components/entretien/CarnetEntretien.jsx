import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, ChevronLeft, Check, Calendar,
  AlertTriangle, Clock, Shield, ClipboardList, Filter,
  Flame, Droplets, Zap, Home, Building2, Layers, Wind, Wrench,
  ArrowLeft, Eye, CheckCircle, Circle, Tag, MapPin, FileText,
  ChevronDown, MoreVertical, RefreshCw, Bell, Copy, Sparkles
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_CARNETS = 'cp_carnets_entretien';
const STORAGE_KEY_TACHES = 'cp_entretien_taches';

const TYPES_BIEN = [
  { id: 'maison', label: 'Maison' },
  { id: 'appartement', label: 'Appartement' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'bureau', label: 'Bureau' },
  { id: 'batiment', label: 'Bâtiment' },
  { id: 'autre', label: 'Autre' },
];

const CATEGORIES = [
  { id: 'chauffage', label: 'Chauffage' },
  { id: 'plomberie', label: 'Plomberie' },
  { id: 'electricite', label: 'Électricité' },
  { id: 'toiture', label: 'Toiture' },
  { id: 'facade', label: 'Façade' },
  { id: 'menuiserie', label: 'Menuiserie' },
  { id: 'ventilation', label: 'Ventilation' },
  { id: 'general', label: 'Général' },
];

const RECURRENCES = [
  { id: 'mensuel', label: 'Mensuel' },
  { id: 'trimestriel', label: 'Trimestriel' },
  { id: 'semestriel', label: 'Semestriel' },
  { id: 'annuel', label: 'Annuel' },
  { id: 'biennal', label: 'Biennal' },
  { id: 'unique', label: 'Unique' },
];

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const categorieIcons = {
  chauffage: Flame,
  plomberie: Droplets,
  electricite: Zap,
  toiture: Home,
  facade: Building2,
  menuiserie: Layers,
  ventilation: Wind,
  general: Wrench,
};

const categorieColors = {
  chauffage: '#ef4444',
  plomberie: '#3b82f6',
  electricite: '#f59e0b',
  toiture: '#6b7280',
  facade: '#8b5cf6',
  menuiserie: '#84cc16',
  ventilation: '#06b6d4',
  general: '#64748b',
};

const typeBienColors = {
  maison: '#3b82f6',
  appartement: '#8b5cf6',
  commerce: '#f59e0b',
  bureau: '#06b6d4',
  batiment: '#6b7280',
  autre: '#64748b',
};

// ---------------------------------------------------------------------------
// Templates by property type
// ---------------------------------------------------------------------------

const TASK_TEMPLATES = {
  maison: [
    { designation: 'Ramonage cheminée/conduit', categorie: 'chauffage', recurrence: 'annuel', mois_prevu: 9, priorite: 1 },
    { designation: 'Entretien chaudière', categorie: 'chauffage', recurrence: 'annuel', mois_prevu: 10, priorite: 1 },
    { designation: 'Vérification toiture', categorie: 'toiture', recurrence: 'annuel', mois_prevu: 3, priorite: 2 },
    { designation: 'Nettoyage gouttières', categorie: 'toiture', recurrence: 'semestriel', mois_prevu: 11, priorite: 2 },
    { designation: 'Contrôle installation électrique', categorie: 'electricite', recurrence: 'annuel', mois_prevu: 1, priorite: 2 },
    { designation: 'Purge radiateurs', categorie: 'chauffage', recurrence: 'annuel', mois_prevu: 9, priorite: 3 },
    { designation: 'Entretien VMC', categorie: 'ventilation', recurrence: 'semestriel', mois_prevu: 4, priorite: 2 },
    { designation: 'Vérification joints plomberie', categorie: 'plomberie', recurrence: 'annuel', mois_prevu: 6, priorite: 3 },
  ],
  appartement: [
    { designation: 'Entretien chaudière/PAC', categorie: 'chauffage', recurrence: 'annuel', mois_prevu: 10, priorite: 1 },
    { designation: 'Contrôle VMC', categorie: 'ventilation', recurrence: 'annuel', mois_prevu: 4, priorite: 2 },
    { designation: 'Vérification robinetterie', categorie: 'plomberie', recurrence: 'annuel', mois_prevu: 6, priorite: 3 },
    { designation: 'Contrôle détecteurs fumée', categorie: 'electricite', recurrence: 'annuel', mois_prevu: 1, priorite: 1 },
    { designation: 'Purge radiateurs', categorie: 'chauffage', recurrence: 'annuel', mois_prevu: 9, priorite: 3 },
  ],
  commerce: [
    { designation: 'Contrôle extincteurs', categorie: 'general', recurrence: 'annuel', mois_prevu: 1, priorite: 1 },
    { designation: 'Vérification éclairage de sécurité', categorie: 'electricite', recurrence: 'semestriel', mois_prevu: 6, priorite: 1 },
    { designation: 'Entretien climatisation', categorie: 'ventilation', recurrence: 'annuel', mois_prevu: 4, priorite: 2 },
    { designation: 'Contrôle installation électrique ERP', categorie: 'electricite', recurrence: 'annuel', mois_prevu: 3, priorite: 1 },
    { designation: 'Vérification accessibilité PMR', categorie: 'general', recurrence: 'annuel', mois_prevu: 2, priorite: 2 },
    { designation: 'Nettoyage façade', categorie: 'facade', recurrence: 'annuel', mois_prevu: 5, priorite: 3 },
  ],
  bureau: [
    { designation: 'Entretien climatisation', categorie: 'ventilation', recurrence: 'semestriel', mois_prevu: 4, priorite: 2 },
    { designation: 'Contrôle extincteurs', categorie: 'general', recurrence: 'annuel', mois_prevu: 1, priorite: 1 },
    { designation: 'Vérification installation électrique', categorie: 'electricite', recurrence: 'annuel', mois_prevu: 3, priorite: 2 },
    { designation: 'Entretien VMC', categorie: 'ventilation', recurrence: 'annuel', mois_prevu: 10, priorite: 2 },
    { designation: 'Contrôle plomberie sanitaire', categorie: 'plomberie', recurrence: 'annuel', mois_prevu: 6, priorite: 3 },
  ],
  batiment: [
    { designation: 'Inspection toiture et étanchéité', categorie: 'toiture', recurrence: 'annuel', mois_prevu: 3, priorite: 1 },
    { designation: 'Contrôle façade et fissures', categorie: 'facade', recurrence: 'annuel', mois_prevu: 5, priorite: 2 },
    { designation: 'Vérification parties communes', categorie: 'general', recurrence: 'semestriel', mois_prevu: 6, priorite: 2 },
    { designation: 'Contrôle installation gaz', categorie: 'chauffage', recurrence: 'annuel', mois_prevu: 10, priorite: 1 },
    { designation: 'Entretien ascenseur', categorie: 'general', recurrence: 'mensuel', mois_prevu: 1, priorite: 1 },
    { designation: 'Désinsectisation/dératisation', categorie: 'general', recurrence: 'annuel', mois_prevu: 4, priorite: 2 },
  ],
  autre: [
    { designation: 'Contrôle général', categorie: 'general', recurrence: 'annuel', mois_prevu: 1, priorite: 2 },
    { designation: 'Vérification installation électrique', categorie: 'electricite', recurrence: 'annuel', mois_prevu: 3, priorite: 2 },
    { designation: 'Contrôle plomberie', categorie: 'plomberie', recurrence: 'annuel', mois_prevu: 6, priorite: 3 },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFromStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* silently fail */ }
}

function addYears(dateStr, years) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

function getWarrantyStatus(endDate) {
  if (!endDate) return { status: 'expired', daysRemaining: 0, color: '#ef4444' };
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return { status: 'expired', daysRemaining: 0, color: '#ef4444' };
  if (days <= 90) return { status: 'expiring', daysRemaining: days, color: '#f59e0b' };
  return { status: 'active', daysRemaining: days, color: '#22c55e' };
}

function formatRemainingDays(days) {
  if (days <= 0) return 'Expirée';
  if (days < 30) return `${days} jour${days > 1 ? 's' : ''}`;
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} mois`;
  }
  const y = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return `${y} an${y > 1 ? 's' : ''}`;
  return `${y} an${y > 1 ? 's' : ''} ${remainingMonths} mois`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

function KpiCard({ icon: Icon, label, value, color, isDark }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="p-2 rounded-lg" style={{ backgroundColor: color + '18' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</div>
        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</div>
      </div>
    </div>
  );
}

function PriorityBadge({ priorite, small = false }) {
  const config = {
    1: { label: 'Haute', color: '#ef4444', bg: '#fef2f2' },
    2: { label: 'Moyenne', color: '#f59e0b', bg: '#fffbeb' },
    3: { label: 'Basse', color: '#22c55e', bg: '#f0fdf4' },
  };
  const c = config[priorite] || config[3];
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      {c.label}
    </span>
  );
}

function WarrantyDot({ label, endDate }) {
  const ws = getWarrantyStatus(endDate);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ws.color }} />
      <span className="text-xs" style={{ color: ws.color }}>{label}</span>
    </div>
  );
}

function WarrantyTimeline({ carnet, isDark }) {
  const warranties = [
    { key: 'decennale', label: 'Garantie décennale', endDate: carnet.garantie_decennale_fin },
    { key: 'biennale', label: 'Garantie biennale', endDate: carnet.garantie_biennale_fin },
    { key: 'parfait_achevement', label: 'Parfait achèvement', endDate: carnet.garantie_parfait_achevement_fin },
  ];

  return (
    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
        Garanties
      </h3>
      <div className="space-y-3">
        {warranties.map((w) => {
          const ws = getWarrantyStatus(w.endDate);
          const pct = ws.status === 'expired' ? 100 : ws.status === 'expiring' ? 85 : Math.max(5, 100 - (ws.daysRemaining / 3650) * 100);
          return (
            <div key={w.key}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{w.label}</span>
                <span className="text-xs font-medium" style={{ color: ws.color }}>
                  {formatRemainingDays(ws.daysRemaining)}
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    backgroundColor: ws.color,
                    opacity: ws.status === 'expired' ? 0.5 : 1,
                  }}
                />
              </div>
              <div className={`flex justify-between mt-0.5 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>{formatDate(carnet.date_livraison)}</span>
                <span>{formatDate(w.endDate)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({ task, isDark, couleur, onToggle, onEdit, onDelete }) {
  const CatIcon = categorieIcons[task.categorie] || Wrench;
  const catColor = categorieColors[task.categorie] || '#64748b';
  const overdue = task.statut !== 'realise' && isOverdue(task.prochaine_echeance);
  const thisMonth = !overdue && isThisMonth(task.prochaine_echeance);

  const echeanceColor = overdue ? '#ef4444' : thisMonth ? '#f59e0b' : '#22c55e';
  const isCompleted = task.statut === 'realise';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isDark ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'} ${isCompleted ? 'opacity-60' : ''}`}>
      <button
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0 p-0.5 rounded-md transition-colors"
        style={isCompleted ? { color: couleur } : {}}
        title={isCompleted ? 'Marquer comme à faire' : 'Marquer comme réalisé'}
      >
        {isCompleted
          ? <CheckCircle size={20} style={{ color: couleur }} />
          : <Circle size={20} className={isDark ? 'text-slate-500' : 'text-slate-300'} />
        }
      </button>

      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: catColor + '18' }}>
        <CatIcon size={16} style={{ color: catColor }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isCompleted ? 'line-through' : ''} ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {task.designation}
          </span>
          <PriorityBadge priorite={task.priorite} small />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {task.recurrence !== 'unique' && (
            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <RefreshCw size={9} />
              {RECURRENCES.find(r => r.id === task.recurrence)?.label}
            </span>
          )}
          {task.prochaine_echeance && (
            <span className="text-[11px] font-medium" style={{ color: echeanceColor }}>
              {formatDate(task.prochaine_echeance)}
            </span>
          )}
          {task.cout_estime > 0 && (
            <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {task.cout_estime} €
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(task)}
          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
          title="Modifier"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className={`p-1.5 rounded-lg transition-colors hover:bg-red-50 text-slate-400 hover:text-red-500`}
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function CarnetCard({ carnet, tasks, clients, isDark, couleur, onClick }) {
  const client = clients.find(c => c.id === carnet.client_id);
  const carnetTasks = tasks.filter(t => t.carnet_id === carnet.id);
  const pendingCount = carnetTasks.filter(t => t.statut !== 'realise').length;
  const overdueCount = carnetTasks.filter(t => t.statut !== 'realise' && isOverdue(t.prochaine_echeance)).length;
  const upcomingCount = carnetTasks.filter(t => {
    if (t.statut === 'realise' || !t.prochaine_echeance) return false;
    const d = new Date(t.prochaine_echeance);
    const now = new Date();
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;
  const typeColor = typeBienColors[carnet.type_bien] || '#64748b';
  const typeLabel = TYPES_BIEN.find(t => t.id === carnet.type_bien)?.label || carnet.type_bien;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-2">
          <h3 className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {carnet.nom}
          </h3>
          {client && (
            <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {client.nom || `${client.prenom || ''} ${client.nom_famille || ''}`.trim()}
            </p>
          )}
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color: typeColor, backgroundColor: typeColor + '18' }}
        >
          {typeLabel}
        </span>
      </div>

      {carnet.adresse && (
        <div className={`flex items-center gap-1 text-xs mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <MapPin size={11} />
          <span className="truncate">{carnet.adresse}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <WarrantyDot label="Décennale" endDate={carnet.garantie_decennale_fin} />
        <WarrantyDot label="Biennale" endDate={carnet.garantie_biennale_fin} />
        <WarrantyDot label="PA" endDate={carnet.garantie_parfait_achevement_fin} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {pendingCount} tâche{pendingCount > 1 ? 's' : ''}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
              {overdueCount} en retard
            </span>
          )}
          {upcomingCount > 0 && overdueCount === 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-600'} font-medium`}>
              <Bell size={10} />
              {upcomingCount} bientôt
            </span>
          )}
        </div>
        {carnet.date_livraison && (
          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Livré le {formatDate(carnet.date_livraison)}
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CarnetEntretien({ chantiers = [], clients = [], isDark = false, couleur = '#f97316', setPage }) {
  // ---- State ----
  const [carnets, setCarnets] = useState(() => loadFromStorage(STORAGE_KEY_CARNETS));
  const [taches, setTaches] = useState(() => loadFromStorage(STORAGE_KEY_TACHES));
  const [view, setView] = useState('list');
  const [selectedCarnetId, setSelectedCarnetId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCarnetModal, setShowCarnetModal] = useState(false);
  const [editingCarnet, setEditingCarnet] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFilter, setTaskFilter] = useState('toutes');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // ---- Persist ----
  useEffect(() => { saveToStorage(STORAGE_KEY_CARNETS, carnets); }, [carnets]);
  useEffect(() => { saveToStorage(STORAGE_KEY_TACHES, taches); }, [taches]);

  // ---- Theme classes ----
  const cardCls = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputCls = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900';
  const textCls = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const overlayBg = isDark ? 'bg-slate-900/70' : 'bg-black/40';

  // ---- Derived ----
  const selectedCarnet = carnets.find(c => c.id === selectedCarnetId);
  const carnetTasks = useMemo(() => taches.filter(t => t.carnet_id === selectedCarnetId), [taches, selectedCarnetId]);

  const filteredCarnets = useMemo(() => {
    let result = carnets.filter(c => c.actif !== false);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.nom.toLowerCase().includes(s) ||
        (c.adresse || '').toLowerCase().includes(s)
      );
    }
    if (filterType !== 'all') {
      result = result.filter(c => c.type_bien === filterType);
    }
    return result;
  }, [carnets, search, filterType]);

  // KPIs
  const kpis = useMemo(() => {
    const activeTaches = taches.filter(t => {
      const carnet = carnets.find(c => c.id === t.carnet_id);
      return carnet && carnet.actif !== false;
    });
    const overdue = activeTaches.filter(t => t.statut !== 'realise' && isOverdue(t.prochaine_echeance)).length;
    const thisMonthCount = activeTaches.filter(t => t.statut !== 'realise' && isThisMonth(t.prochaine_echeance)).length;
    const activeWarranties = carnets.filter(c => {
      if (c.actif === false) return false;
      return getWarrantyStatus(c.garantie_decennale_fin).status !== 'expired' ||
        getWarrantyStatus(c.garantie_biennale_fin).status !== 'expired' ||
        getWarrantyStatus(c.garantie_parfait_achevement_fin).status !== 'expired';
    }).length;
    return {
      total: carnets.filter(c => c.actif !== false).length,
      overdue,
      thisMonth: thisMonthCount,
      activeWarranties,
    };
  }, [carnets, taches]);

  // Filtered tasks for detail view
  const filteredTasks = useMemo(() => {
    if (!selectedCarnetId) return [];
    let result = carnetTasks;
    switch (taskFilter) {
      case 'a_faire': result = result.filter(t => t.statut === 'a_faire'); break;
      case 'planifie': result = result.filter(t => t.statut === 'planifie'); break;
      case 'realise': result = result.filter(t => t.statut === 'realise'); break;
      case 'en_retard': result = result.filter(t => t.statut !== 'realise' && isOverdue(t.prochaine_echeance)); break;
      default: break;
    }
    return result.sort((a, b) => {
      if (a.statut === 'realise' && b.statut !== 'realise') return 1;
      if (a.statut !== 'realise' && b.statut === 'realise') return -1;
      return (a.priorite || 3) - (b.priorite || 3);
    });
  }, [carnetTasks, taskFilter, selectedCarnetId]);

  // ---- Notification badges ----
  const notifications = useMemo(() => {
    const activeTaches = taches.filter(t => {
      const carnet = carnets.find(c => c.id === t.carnet_id);
      return carnet && carnet.actif !== false;
    });
    const overdue = activeTaches.filter(t => t.statut !== 'realise' && isOverdue(t.prochaine_echeance));
    const thisMonth = activeTaches.filter(t => t.statut !== 'realise' && isThisMonth(t.prochaine_echeance));
    const upcoming7days = activeTaches.filter(t => {
      if (t.statut === 'realise' || !t.prochaine_echeance) return false;
      const d = new Date(t.prochaine_echeance);
      const now = new Date();
      const diff = (d - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    });
    return { overdue, thisMonth, upcoming7days, total: overdue.length + upcoming7days.length };
  }, [taches, carnets]);

  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // ---- Template application ----
  function applyTemplate(carnetId, typeBien) {
    const templates = TASK_TEMPLATES[typeBien] || TASK_TEMPLATES.autre;
    const now = new Date();
    const year = now.getFullYear();
    const newTasks = templates.map(t => ({
      id: crypto.randomUUID(),
      carnet_id: carnetId,
      ...t,
      description: '',
      cout_estime: 0,
      statut: 'a_faire',
      derniere_realisation: null,
      prochaine_echeance: `${year}-${String(t.mois_prevu).padStart(2, '0')}-01`,
      notes: '',
      created_at: now.toISOString(),
    }));
    setTaches(prev => [...prev, ...newTasks]);
    setShowTemplateModal(false);
  }

  // ---- Carnet CRUD ----
  const defaultCarnetForm = () => ({
    nom: '', type_bien: 'maison', client_id: '', chantier_id: '',
    adresse: '', date_livraison: '', garantie_decennale_fin: '',
    garantie_biennale_fin: '', garantie_parfait_achevement_fin: '', notes: '',
  });

  const [carnetForm, setCarnetForm] = useState(defaultCarnetForm);

  function openNewCarnet() {
    setEditingCarnet(null);
    setCarnetForm(defaultCarnetForm());
    setShowCarnetModal(true);
  }

  function openEditCarnet(carnet) {
    setEditingCarnet(carnet);
    setCarnetForm({
      nom: carnet.nom || '',
      type_bien: carnet.type_bien || 'maison',
      client_id: carnet.client_id || '',
      chantier_id: carnet.chantier_id || '',
      adresse: carnet.adresse || '',
      date_livraison: carnet.date_livraison || '',
      garantie_decennale_fin: carnet.garantie_decennale_fin || '',
      garantie_biennale_fin: carnet.garantie_biennale_fin || '',
      garantie_parfait_achevement_fin: carnet.garantie_parfait_achevement_fin || '',
      notes: carnet.notes || '',
    });
    setShowCarnetModal(true);
  }

  function handleCarnetLivraisonChange(val) {
    setCarnetForm(prev => ({
      ...prev,
      date_livraison: val,
      garantie_decennale_fin: addYears(val, 10),
      garantie_biennale_fin: addYears(val, 2),
      garantie_parfait_achevement_fin: addYears(val, 1),
    }));
  }

  function saveCarnet() {
    const nom = carnetForm.nom.trim();
    if (!nom) return;
    if (editingCarnet) {
      setCarnets(prev => prev.map(c => c.id === editingCarnet.id ? { ...c, ...carnetForm, nom } : c));
    } else {
      const now = new Date().toISOString();
      setCarnets(prev => [...prev, {
        id: crypto.randomUUID(),
        ...carnetForm,
        nom,
        actif: true,
        created_at: now,
      }]);
    }
    setShowCarnetModal(false);
  }

  function deleteCarnet(id) {
    setCarnets(prev => prev.map(c => c.id === id ? { ...c, actif: false } : c));
    setTaches(prev => prev.filter(t => t.carnet_id !== id));
    setView('list');
    setSelectedCarnetId(null);
    setShowDeleteConfirm(null);
  }

  // ---- Task CRUD ----
  const defaultTaskForm = () => ({
    designation: '', description: '', categorie: 'general', recurrence: 'annuel',
    mois_prevu: new Date().getMonth() + 1, priorite: 2, cout_estime: '',
    prochaine_echeance: '', notes: '',
  });

  const [taskForm, setTaskForm] = useState(defaultTaskForm);

  function openNewTask() {
    setEditingTask(null);
    setTaskForm(defaultTaskForm());
    setShowTaskModal(true);
  }

  function openEditTask(task) {
    setEditingTask(task);
    setTaskForm({
      designation: task.designation || '',
      description: task.description || '',
      categorie: task.categorie || 'general',
      recurrence: task.recurrence || 'annuel',
      mois_prevu: task.mois_prevu || 1,
      priorite: task.priorite || 2,
      cout_estime: task.cout_estime || '',
      prochaine_echeance: task.prochaine_echeance || '',
      notes: task.notes || '',
    });
    setShowTaskModal(true);
  }

  function saveTask() {
    const designation = taskForm.designation.trim();
    if (!designation) return;
    if (editingTask) {
      setTaches(prev => prev.map(t => t.id === editingTask.id ? {
        ...t,
        ...taskForm,
        designation,
        cout_estime: taskForm.cout_estime ? Number(taskForm.cout_estime) : 0,
        priorite: Number(taskForm.priorite),
        mois_prevu: Number(taskForm.mois_prevu),
      } : t));
    } else {
      const now = new Date().toISOString();
      setTaches(prev => [...prev, {
        id: crypto.randomUUID(),
        carnet_id: selectedCarnetId,
        ...taskForm,
        designation,
        cout_estime: taskForm.cout_estime ? Number(taskForm.cout_estime) : 0,
        priorite: Number(taskForm.priorite),
        mois_prevu: Number(taskForm.mois_prevu),
        statut: 'a_faire',
        derniere_realisation: null,
        created_at: now,
      }]);
    }
    setShowTaskModal(false);
  }

  function toggleTaskStatus(taskId) {
    setTaches(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (t.statut === 'realise') {
        return { ...t, statut: 'a_faire', derniere_realisation: null };
      }
      return { ...t, statut: 'realise', derniere_realisation: new Date().toISOString().split('T')[0] };
    }));
  }

  function deleteTask(taskId) {
    setTaches(prev => prev.filter(t => t.id !== taskId));
  }

  // ---- Render helpers ----

  function renderCarnetModal() {
    if (!showCarnetModal) return null;
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayBg}`} onClick={() => setShowCarnetModal(false)}>
        <div
          className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border shadow-xl ${cardCls}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <h2 className={`text-lg font-semibold ${textCls}`}>
              {editingCarnet ? 'Modifier le carnet' : 'Nouveau carnet d’entretien'}
            </h2>
            <button onClick={() => setShowCarnetModal(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Nom */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Nom du bien *</label>
              <input
                type="text"
                value={carnetForm.nom}
                onChange={e => setCarnetForm(prev => ({ ...prev, nom: e.target.value }))}
                placeholder="Maison Dupont - Rénovation"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
              />
            </div>

            {/* Type + Client */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Type de bien</label>
                <select
                  value={carnetForm.type_bien}
                  onChange={e => setCarnetForm(prev => ({ ...prev, type_bien: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
                >
                  {TYPES_BIEN.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Client</label>
                <select
                  value={carnetForm.client_id}
                  onChange={e => setCarnetForm(prev => ({ ...prev, client_id: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
                >
                  <option value="">-- Aucun --</option>
                  {clients.map(cl => (
                    <option key={cl.id} value={cl.id}>
                      {cl.nom || `${cl.prenom || ''} ${cl.nom_famille || ''}`.trim() || cl.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chantier + Adresse */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Chantier lié</label>
                <select
                  value={carnetForm.chantier_id}
                  onChange={e => setCarnetForm(prev => ({ ...prev, chantier_id: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
                >
                  <option value="">-- Aucun --</option>
                  {chantiers.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.nom || ch.name || ch.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Adresse</label>
                <input
                  type="text"
                  value={carnetForm.adresse}
                  onChange={e => setCarnetForm(prev => ({ ...prev, adresse: e.target.value }))}
                  placeholder="12 rue de la Paix, 75001"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
                />
              </div>
            </div>

            {/* Date de livraison */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Date de livraison</label>
              <input
                type="date"
                value={carnetForm.date_livraison}
                onChange={e => handleCarnetLivraisonChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
              />
            </div>

            {/* Garanties */}
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-xs font-semibold mb-2 ${textCls}`}>Dates de fin de garantie</p>
              <div className="space-y-2">
                <div>
                  <label className={`block text-[10px] mb-0.5 ${textMuted}`}>Décennale (livraison + 10 ans)</label>
                  <input
                    type="date"
                    value={carnetForm.garantie_decennale_fin}
                    onChange={e => setCarnetForm(prev => ({ ...prev, garantie_decennale_fin: e.target.value }))}
                    className={`w-full px-3 py-1.5 rounded-lg border text-sm ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] mb-0.5 ${textMuted}`}>Biennale (livraison + 2 ans)</label>
                  <input
                    type="date"
                    value={carnetForm.garantie_biennale_fin}
                    onChange={e => setCarnetForm(prev => ({ ...prev, garantie_biennale_fin: e.target.value }))}
                    className={`w-full px-3 py-1.5 rounded-lg border text-sm ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] mb-0.5 ${textMuted}`}>Parfait achèvement (livraison + 1 an)</label>
                  <input
                    type="date"
                    value={carnetForm.garantie_parfait_achevement_fin}
                    onChange={e => setCarnetForm(prev => ({ ...prev, garantie_parfait_achevement_fin: e.target.value }))}
                    className={`w-full px-3 py-1.5 rounded-lg border text-sm ${inputCls}`}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Notes</label>
              <textarea
                value={carnetForm.notes}
                onChange={e => setCarnetForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Informations complémentaires..."
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${inputCls}`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <button
              onClick={() => setShowCarnetModal(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Annuler
            </button>
            <button
              onClick={saveCarnet}
              disabled={!carnetForm.nom.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ backgroundColor: couleur }}
            >
              {editingCarnet ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderTaskModal() {
    if (!showTaskModal) return null;
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayBg}`} onClick={() => setShowTaskModal(false)}>
        <div
          className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border shadow-xl ${cardCls}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <h2 className={`text-lg font-semibold ${textCls}`}>
              {editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
            </h2>
            <button onClick={() => setShowTaskModal(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Designation */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Désignation *</label>
              <input
                type="text"
                value={taskForm.designation}
                onChange={e => setTaskForm(prev => ({ ...prev, designation: e.target.value }))}
                placeholder="Vérification chaudière"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Description</label>
              <textarea
                value={taskForm.description}
                onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                placeholder="Détails de la tâche..."
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${inputCls}`}
              />
            </div>

            {/* Categorie + Recurrence */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Catégorie</label>
                <select
                  value={taskForm.categorie}
                  onChange={e => setTaskForm(prev => ({ ...prev, categorie: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Récurrence</label>
                <select
                  value={taskForm.recurrence}
                  onChange={e => setTaskForm(prev => ({ ...prev, recurrence: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
                >
                  {RECURRENCES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {/* Mois prevu + Echeance */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Mois prévu</label>
                <select
                  value={taskForm.mois_prevu}
                  onChange={e => setTaskForm(prev => ({ ...prev, mois_prevu: Number(e.target.value) }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
                >
                  {MOIS_LABELS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Prochaine échéance</label>
                <input
                  type="date"
                  value={taskForm.prochaine_echeance}
                  onChange={e => setTaskForm(prev => ({ ...prev, prochaine_echeance: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
                />
              </div>
            </div>

            {/* Priorite */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Priorité</label>
              <div className="flex gap-2">
                {[{ v: 1, label: 'Haute', color: '#ef4444' }, { v: 2, label: 'Moyenne', color: '#f59e0b' }, { v: 3, label: 'Basse', color: '#22c55e' }].map(p => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => setTaskForm(prev => ({ ...prev, priorite: p.v }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${Number(taskForm.priorite) === p.v ? 'ring-2 ring-offset-1' : 'opacity-50'}`}
                    style={Number(taskForm.priorite) === p.v
                      ? { backgroundColor: p.color + '18', color: p.color, borderColor: p.color, ringColor: p.color }
                      : { borderColor: isDark ? '#475569' : '#e2e8f0', color: isDark ? '#94a3b8' : '#64748b' }
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cout */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Coût estimé (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taskForm.cout_estime}
                onChange={e => setTaskForm(prev => ({ ...prev, cout_estime: e.target.value }))}
                placeholder="0.00"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${inputCls}`}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Notes</label>
              <textarea
                value={taskForm.notes}
                onChange={e => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Notes supplémentaires..."
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${inputCls}`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <button
              onClick={() => setShowTaskModal(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Annuler
            </button>
            <button
              onClick={saveTask}
              disabled={!taskForm.designation.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ backgroundColor: couleur }}
            >
              {editingTask ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderDeleteConfirm() {
    if (!showDeleteConfirm) return null;
    const isCarnet = showDeleteConfirm.type === 'carnet';
    return (
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${overlayBg}`} onClick={() => setShowDeleteConfirm(null)}>
        <div className={`w-full max-w-sm rounded-xl border shadow-xl p-6 ${cardCls}`} onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <h3 className={`text-base font-semibold ${textCls}`}>Confirmer la suppression</h3>
          </div>
          <p className={`text-sm mb-6 ${textMuted}`}>
            {isCarnet
              ? 'Ce carnet et toutes ses tâches seront supprimés. Cette action est irréversible.'
              : 'Cette tâche sera définitivement supprimée.'}
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (isCarnet) deleteCarnet(showDeleteConfirm.id);
                else { deleteTask(showDeleteConfirm.id); setShowDeleteConfirm(null); }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Detail view ----
  function renderDetailView() {
    if (!selectedCarnet) return null;
    const client = clients.find(c => c.id === selectedCarnet.client_id);
    const typeLabel = TYPES_BIEN.find(t => t.id === selectedCarnet.type_bien)?.label || selectedCarnet.type_bien;
    const typeColor = typeBienColors[selectedCarnet.type_bien] || '#64748b';
    const overdueCount = carnetTasks.filter(t => t.statut !== 'realise' && isOverdue(t.prochaine_echeance)).length;

    const taskFilterTabs = [
      { id: 'toutes', label: 'Toutes' },
      { id: 'a_faire', label: 'À faire' },
      { id: 'planifie', label: 'Planifié' },
      { id: 'realise', label: 'Réalisé' },
      { id: 'en_retard', label: `En retard${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
    ];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className={`p-4 rounded-xl border ${cardCls}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setView('list'); setSelectedCarnetId(null); setTaskFilter('toutes'); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-lg font-bold ${textCls}`}>{selectedCarnet.nom}</h2>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: typeColor, backgroundColor: typeColor + '18' }}
                  >
                    {typeLabel}
                  </span>
                </div>
                <div className={`flex items-center gap-3 mt-1 text-xs ${textMuted}`}>
                  {client && (
                    <span>{client.nom || `${client.prenom || ''} ${client.nom_famille || ''}`.trim()}</span>
                  )}
                  {selectedCarnet.adresse && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {selectedCarnet.adresse}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => openEditCarnet(selectedCarnet)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
                title="Modifier le carnet"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm({ type: 'carnet', id: selectedCarnet.id })}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                title="Supprimer le carnet"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Warranties */}
        <WarrantyTimeline carnet={selectedCarnet} isDark={isDark} />

        {/* Tasks Section */}
        <div className={`p-4 rounded-xl border ${cardCls}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold ${textCls}`}>Tâches d'entretien</h3>
            <div className="flex items-center gap-2">
              {carnetTasks.length === 0 && (
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-amber-900/30 text-amber-300 hover:bg-amber-900/50' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                >
                  <Sparkles size={14} />
                  Modèles
                </button>
              )}
              <button
                onClick={openNewTask}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: couleur }}
              >
                <Plus size={14} />
                Ajouter
              </button>
            </div>
          </div>

          {/* Task filter tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {taskFilterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTaskFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  taskFilter === tab.id
                    ? 'text-white'
                    : isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
                style={taskFilter === tab.id ? { backgroundColor: couleur } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Task list */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList size={32} className={isDark ? 'text-slate-600 mx-auto mb-2' : 'text-slate-300 mx-auto mb-2'} />
              <p className={`text-sm ${textMuted}`}>Aucune tâche trouvée</p>
              <button
                onClick={openNewTask}
                className="mt-2 text-xs font-medium"
                style={{ color: couleur }}
              >
                Ajouter une tâche
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isDark={isDark}
                  couleur={couleur}
                  onToggle={toggleTaskStatus}
                  onEdit={openEditTask}
                  onDelete={(id) => setShowDeleteConfirm({ type: 'task', id })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Carnet notes */}
        {selectedCarnet.notes && (
          <div className={`p-4 rounded-xl border ${cardCls}`}>
            <h3 className={`text-sm font-semibold mb-2 ${textCls}`}>Notes</h3>
            <p className={`text-sm whitespace-pre-wrap ${textMuted}`}>{selectedCarnet.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // ---- List view ----
  function renderListView() {
    return (
      <div className="space-y-4">
        {/* Notification Banner */}
        {notifications.total > 0 && (
          <div className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell size={20} className="text-amber-500" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.total}
                </span>
              </div>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                  {notifications.overdue.length > 0 && `${notifications.overdue.length} tâche${notifications.overdue.length > 1 ? 's' : ''} en retard`}
                  {notifications.overdue.length > 0 && notifications.upcoming7days.length > 0 && ' • '}
                  {notifications.upcoming7days.length > 0 && `${notifications.upcoming7days.length} dans les 7 prochains jours`}
                </p>
                <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  {notifications.overdue.slice(0, 2).map(t => t.designation).join(', ')}
                  {notifications.overdue.length > 2 && '...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={ClipboardList} label="Total carnets" value={kpis.total} color={couleur} isDark={isDark} />
          <KpiCard icon={AlertTriangle} label="Tâches en retard" value={kpis.overdue} color="#ef4444" isDark={isDark} />
          <KpiCard icon={Clock} label="Tâches ce mois" value={kpis.thisMonth} color="#f59e0b" isDark={isDark} />
          <KpiCard icon={Shield} label="Garanties actives" value={kpis.activeWarranties} color="#22c55e" isDark={isDark} />
        </div>

        {/* Search + Filter + Add */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un carnet..."
              aria-label="Rechercher un carnet"
              className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm ${inputCls}`}
            />
            {search && (
              <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className={`px-3 py-2.5 rounded-lg border text-sm ${inputCls}`}
          >
            <option value="all">Tous les types</option>
            {TYPES_BIEN.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>

          <button
            onClick={openNewCarnet}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white whitespace-nowrap"
            style={{ backgroundColor: couleur }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nouveau carnet</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>

        {/* Carnet grid */}
        {filteredCarnets.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border ${cardCls}`}>
            <ClipboardList size={40} className={isDark ? 'text-slate-600 mx-auto mb-3' : 'text-slate-300 mx-auto mb-3'} />
            <h3 className={`text-base font-semibold mb-1 ${textCls}`}>Aucun carnet d&apos;entretien</h3>
            <p className={`text-sm mb-4 ${textMuted}`}>
              {search || filterType !== 'all'
                ? 'Aucun résultat pour cette recherche.'
                : 'Créez votre premier carnet pour suivre l’entretien de vos biens.'}
            </p>
            {!search && filterType === 'all' && (
              <button
                onClick={openNewCarnet}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: couleur }}
              >
                <Plus size={16} />
                Créer un carnet
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCarnets.map(carnet => (
              <CarnetCard
                key={carnet.id}
                carnet={carnet}
                tasks={taches}
                clients={clients}
                isDark={isDark}
                couleur={couleur}
                onClick={() => { setSelectedCarnetId(carnet.id); setView('detail'); setTaskFilter('toutes'); }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Page header */}
      {view === 'list' && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-xl font-bold ${textCls}`}>Carnet d&apos;entretien</h1>
            <p className={`text-sm mt-0.5 ${textMuted}`}>Suivi de l&apos;entretien et des garanties de vos biens</p>
          </div>
        </div>
      )}

      {view === 'list' && renderListView()}
      {view === 'detail' && renderDetailView()}

      {/* Modals */}
      {renderCarnetModal()}
      {renderTaskModal()}
      {renderDeleteConfirm()}

      {/* Template Modal */}
      {showTemplateModal && selectedCarnet && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayBg}`} onClick={() => setShowTemplateModal(false)}>
          <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border shadow-xl ${cardCls}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: couleur }} />
                <h2 className={`text-lg font-semibold ${textCls}`}>Modèle de tâches</h2>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <p className={`text-sm mb-4 ${textMuted}`}>
                Appliquer un modèle de tâches pré-configuré pour <strong className={textCls}>{TYPES_BIEN.find(t => t.id === selectedCarnet.type_bien)?.label || selectedCarnet.type_bien}</strong> :
              </p>
              <div className="space-y-2 mb-4">
                {(TASK_TEMPLATES[selectedCarnet.type_bien] || TASK_TEMPLATES.autre).map((t, i) => {
                  const CatIcon = categorieIcons[t.categorie] || Wrench;
                  const catColor = categorieColors[t.categorie] || '#64748b';
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: catColor + '18' }}>
                        <CatIcon size={14} style={{ color: catColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${textCls}`}>{t.designation}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                            {RECURRENCES.find(r => r.id === t.recurrence)?.label}
                          </span>
                          <span className={`text-[10px] ${textMuted}`}>{MOIS_LABELS[t.mois_prevu - 1]}</span>
                        </div>
                      </div>
                      <PriorityBadge priorite={t.priorite} small />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                >
                  Annuler
                </button>
                <button
                  onClick={() => applyTemplate(selectedCarnet.id, selectedCarnet.type_bien)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                  style={{ backgroundColor: couleur }}
                >
                  <Copy size={14} />
                  Appliquer ({(TASK_TEMPLATES[selectedCarnet.type_bien] || TASK_TEMPLATES.autre).length} tâches)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
