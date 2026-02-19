/**
 * Dashboard Layout Presets
 * Pre-configured widget layouts for common use cases
 */

import { WIDGET_REGISTRY, getDefaultLayout } from './widgetRegistry';

export const PRESETS = {
  compact: {
    label: 'Compact',
    description: '4 widgets essentiels',
    icon: '⚡',
    widgets: ['hero', 'kpi-encaisser', 'kpi-facture', 'suggestions'],
  },
  complet: {
    label: 'Complet',
    description: 'Tous les widgets',
    icon: '📊',
    widgets: Object.keys(WIDGET_REGISTRY),
  },
  finance: {
    label: 'Finance',
    description: 'Trésorerie & facturation',
    icon: '💰',
    widgets: ['kpi-encaisser', 'kpi-facture', 'revenue-chart', 'tresorerie', 'devis', 'activite'],
  },
};

/**
 * Generate a layout from a preset
 * @param {string} presetName - 'compact' | 'complet' | 'finance'
 * @returns {Array} layout array with { id, visible, order }
 */
export function generatePresetLayout(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) return getDefaultLayout();

  const presetWidgets = new Set(preset.widgets);

  return Object.entries(WIDGET_REGISTRY)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([id], index) => ({
      id,
      visible: presetWidgets.has(id),
      order: index,
    }));
}
