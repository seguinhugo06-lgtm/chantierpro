/**
 * useDashboardLayout - Hook for managing customizable dashboard layout
 * Handles widget visibility, ordering, presets, and persistence
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { getDefaultLayout, WIDGET_REGISTRY } from '../components/dashboard/widgetRegistry';
import { PRESETS, generatePresetLayout } from '../components/dashboard/presets';
import supabase, { isDemo } from '../supabaseClient';

const STORAGE_KEY = 'chantierPro_dashboardLayout';

/**
 * Load layout from localStorage
 */
function loadFromLocalStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.widgets && Array.isArray(parsed.widgets)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load dashboard layout from localStorage:', e);
  }
  return null;
}

/**
 * Save layout to localStorage
 */
function saveToLocalStorage(layoutData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutData));
  } catch (e) {
    console.warn('Failed to save dashboard layout to localStorage:', e);
  }
}

/**
 * Ensure layout includes all registry widgets (handles new widgets added after save)
 */
function reconcileLayout(savedWidgets) {
  const existingIds = new Set(savedWidgets.map(w => w.id));
  const allIds = Object.keys(WIDGET_REGISTRY);

  // Add any new widgets not in the saved layout
  let maxOrder = Math.max(...savedWidgets.map(w => w.order), -1);
  const newWidgets = allIds
    .filter(id => !existingIds.has(id))
    .map(id => ({
      id,
      visible: true,
      order: ++maxOrder,
    }));

  // Remove widgets that no longer exist in registry
  const validWidgets = savedWidgets.filter(w => allIds.includes(w.id));

  return [...validWidgets, ...newWidgets].sort((a, b) => a.order - b.order);
}

/**
 * Custom hook for dashboard layout management
 */
export default function useDashboardLayout(userId) {
  const [layoutData, setLayoutData] = useState(() => {
    const stored = loadFromLocalStorage();
    if (stored) {
      return {
        widgets: reconcileLayout(stored.widgets),
        activePreset: stored.activePreset || 'custom',
      };
    }
    return {
      widgets: getDefaultLayout(),
      activePreset: 'complet',
    };
  });

  const [isEditMode, setEditMode] = useState(false);
  const hasLoadedFromSupabase = useRef(false);

  // Load from Supabase on mount (if localStorage was empty)
  useEffect(() => {
    if (hasLoadedFromSupabase.current || isDemo || !supabase || !userId) return;
    hasLoadedFromSupabase.current = true;

    const stored = loadFromLocalStorage();
    if (stored) return; // Already have local data

    (async () => {
      try {
        const { data } = await supabase
          .from('entreprise')
          .select('dashboard_layout')
          .eq('user_id', userId)
          .single();

        if (data?.dashboard_layout) {
          const cloudLayout = data.dashboard_layout;
          if (cloudLayout.widgets && Array.isArray(cloudLayout.widgets)) {
            const reconciled = {
              widgets: reconcileLayout(cloudLayout.widgets),
              activePreset: cloudLayout.activePreset || 'custom',
            };
            setLayoutData(reconciled);
            saveToLocalStorage(reconciled);
          }
        }
      } catch (e) {
        console.warn('Failed to load dashboard layout from Supabase:', e);
      }
    })();
  }, [userId]);

  // Derived: visible widgets in order
  const visibleWidgets = useMemo(
    () => layoutData.widgets
      .sort((a, b) => a.order - b.order)
      .filter(w => w.visible),
    [layoutData.widgets]
  );

  // Toggle widget visibility
  const toggleWidget = useCallback((widgetId) => {
    setLayoutData(prev => ({
      ...prev,
      activePreset: 'custom',
      widgets: prev.widgets.map(w =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      ),
    }));
  }, []);

  // Reorder widgets (drag and drop)
  const reorderWidgets = useCallback((activeId, overId) => {
    if (activeId === overId) return;

    setLayoutData(prev => {
      const oldIndex = prev.widgets.findIndex(w => w.id === activeId);
      const newIndex = prev.widgets.findIndex(w => w.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(prev.widgets, oldIndex, newIndex)
        .map((w, i) => ({ ...w, order: i }));

      return {
        ...prev,
        activePreset: 'custom',
        widgets: reordered,
      };
    });
  }, []);

  // Apply a preset
  const applyPreset = useCallback((presetName) => {
    const presetLayout = generatePresetLayout(presetName);
    setLayoutData({
      widgets: presetLayout,
      activePreset: presetName,
    });
  }, []);

  // Save layout (localStorage + Supabase)
  const saveLayout = useCallback(async () => {
    saveToLocalStorage(layoutData);

    if (!isDemo && supabase && userId) {
      try {
        await supabase
          .from('entreprise')
          .update({ dashboard_layout: layoutData })
          .eq('user_id', userId);
      } catch (e) {
        console.warn('Failed to save dashboard layout to Supabase:', e);
      }
    }

    setEditMode(false);
  }, [layoutData, userId]);

  // Reset to default
  const resetToDefault = useCallback(() => {
    const defaultLayout = {
      widgets: getDefaultLayout(),
      activePreset: 'complet',
    };
    setLayoutData(defaultLayout);
  }, []);

  return {
    layout: layoutData.widgets,
    visibleWidgets,
    activePreset: layoutData.activePreset,
    isEditMode,
    setEditMode,
    toggleWidget,
    reorderWidgets,
    applyPreset,
    saveLayout,
    resetToDefault,
  };
}
