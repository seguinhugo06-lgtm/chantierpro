/**
 * Widget Registry - Central registry for all dashboard widgets
 * Maps widget IDs to metadata (title, icon, size, priority, category)
 */

import {
  FileText,
  Wallet,
  TrendingUp,
  Sparkles,
  BarChart3,
  HardHat,
  Activity,
  CloudRain,
  Heart,
  StickyNote,
  Shield,
} from 'lucide-react';

export const WIDGET_REGISTRY = {
  'hero': {
    title: 'Bannière devis',
    icon: FileText,
    defaultSize: 'full',
    priority: 1,
    category: 'overview',
  },
  'kpi-encaisser': {
    title: 'À encaisser',
    icon: Wallet,
    defaultSize: 'half',
    priority: 2,
    category: 'finance',
  },
  'kpi-facture': {
    title: 'Facturé ce mois',
    icon: TrendingUp,
    defaultSize: 'half',
    priority: 3,
    category: 'finance',
  },
  'suggestions': {
    title: 'À faire (Actions + Mémos)',
    icon: Sparkles,
    defaultSize: 'full',
    priority: 4,
    category: 'overview',
  },
  'overview': {
    title: 'KPIs',
    icon: BarChart3,
    defaultSize: 'full',
    priority: 5,
    category: 'overview',
  },
  'revenue-chart': {
    title: 'Performance mensuelle',
    icon: TrendingUp,
    defaultSize: 'full',
    priority: 6,
    category: 'finance',
  },
  'devis': {
    title: 'Devis à relancer',
    icon: FileText,
    defaultSize: 'third',
    priority: 7,
    category: 'commercial',
  },
  'chantiers': {
    title: 'Chantiers',
    icon: HardHat,
    defaultSize: 'third',
    priority: 8,
    category: 'operations',
  },
  'tresorerie': {
    title: 'Trésorerie',
    icon: Wallet,
    defaultSize: 'third',
    priority: 9,
    category: 'finance',
  },
  'activite': {
    title: 'Activité récente',
    icon: Activity,
    defaultSize: 'third',
    priority: 10,
    category: 'overview',
  },
  'meteo': {
    title: 'Alertes Météo',
    icon: CloudRain,
    defaultSize: 'third',
    priority: 11,
    category: 'operations',
  },
  'score-sante': {
    title: 'Score Santé',
    icon: Heart,
    defaultSize: 'third',
    priority: 12,
    category: 'overview',
  },
  'memos': {
    title: 'Mémos du jour (ancien)',
    icon: StickyNote,
    defaultSize: 'third',
    priority: 13,
    category: 'overview',
    deprecated: true,
  },
  'plan-limits': {
    title: 'Plan & Limites',
    icon: Shield,
    defaultSize: 'third',
    priority: 14,
    category: 'system',
  },
};

/**
 * Widget categories for grouping in the customize panel
 */
export const WIDGET_CATEGORIES = {
  overview: { label: 'Aperçu', order: 1 },
  finance: { label: 'Finance', order: 2 },
  commercial: { label: 'Commercial', order: 3 },
  operations: { label: 'Opérations', order: 4 },
  system: { label: 'Système', order: 5 },
};

/**
 * CSS col-span classes based on widget size
 */
export const SIZE_CLASSES = {
  full: 'col-span-1 md:col-span-2 xl:col-span-3',
  half: 'col-span-1',
  third: 'col-span-1',
};

/**
 * Get default layout (all widgets visible in priority order)
 */
export function getDefaultLayout() {
  return Object.entries(WIDGET_REGISTRY)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([id, config], index) => ({
      id,
      visible: !config.deprecated,
      order: index,
    }));
}
