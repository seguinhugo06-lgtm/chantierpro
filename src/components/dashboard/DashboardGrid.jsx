/**
 * DashboardGrid - Customizable widget grid with drag-and-drop support
 * Orchestrates rendering of all dashboard widgets in a responsive grid
 *
 * @module DashboardGrid
 */

import React, { useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WIDGET_REGISTRY, SIZE_CLASSES } from './widgetRegistry';

// Widget components
import HeroSection from './HeroSection';
import KPIEncaisserWidget from './KPIEncaisserWidget';
import KPIFactureWidget from './KPIFactureWidget';
import SuggestionsSection from './SuggestionsSection';
import OverviewWidget from './OverviewWidget';
import RevenueChartWidget from './RevenueChartWidget';
import DevisWidget from './DevisWidget';
import ChantiersWidget from './ChantiersWidget';
import TresorerieWidget from './TresorerieWidget';
import RecentActivityWidget from './RecentActivityWidget';
import WeatherAlertsWidget from './WeatherAlertsWidget';
import ScoreSanteWidget from './ScoreSanteWidget';
import MemosWidget from './MemosWidget';
import PlanLimitsWidget from './PlanLimitsWidget';

const WIDGET_COMPONENTS = {
  'hero': HeroSection,
  'kpi-encaisser': KPIEncaisserWidget,
  'kpi-facture': KPIFactureWidget,
  'suggestions': SuggestionsSection,
  'overview': OverviewWidget,
  'revenue-chart': RevenueChartWidget,
  'devis': DevisWidget,
  'chantiers': ChantiersWidget,
  'tresorerie': TresorerieWidget,
  'activite': RecentActivityWidget,
  'meteo': WeatherAlertsWidget,
  'score-sante': ScoreSanteWidget,
  'memos': MemosWidget,
  'plan-limits': PlanLimitsWidget,
};

// ============ SORTABLE WIDGET WRAPPER ============

function SortableWidget({ id, isEditMode, isDark, onRemove, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.7 : 1,
  };

  const registry = WIDGET_REGISTRY[id];
  const sizeClass = SIZE_CLASSES[registry?.defaultSize || 'third'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClass,
        isEditMode && 'relative group',
        isEditMode && (isDark
          ? 'ring-2 ring-dashed ring-blue-500/40 rounded-2xl'
          : 'ring-2 ring-dashed ring-blue-400/50 rounded-2xl'
        ),
        isDragging && 'shadow-2xl',
      )}
    >
      {/* Edit mode overlay: drag handle + remove button */}
      {isEditMode && (
        <>
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className={cn(
              'absolute top-2 left-1/2 -translate-x-1/2 z-10',
              'flex items-center gap-1 px-3 py-1.5 rounded-full',
              'cursor-grab active:cursor-grabbing',
              'transition-opacity duration-200',
              'opacity-70 group-hover:opacity-100',
              isDark
                ? 'bg-blue-600/90 text-white'
                : 'bg-blue-500/90 text-white',
              'shadow-lg',
              'text-xs font-medium',
            )}
          >
            <GripVertical size={14} />
            <span className="hidden sm:inline">Glisser</span>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove?.(id)}
            className={cn(
              'absolute top-2 right-2 z-10',
              'w-7 h-7 rounded-full flex items-center justify-center',
              'transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              isDark
                ? 'bg-red-700/90 hover:bg-red-800 text-white'
                : 'bg-red-700/90 hover:bg-red-800 text-white',
              'shadow-md',
            )}
            title="Masquer ce widget"
          >
            <EyeOff size={14} />
          </button>
        </>
      )}
      {children}
    </div>
  );
}

// ============ WIDGET RENDERER ============

function WidgetRenderer({ widgetId, widgetProps }) {
  const Component = WIDGET_COMPONENTS[widgetId];
  if (!Component) return null;

  // Each widget type gets different props
  const propsMap = {
    'hero': {
      userName: widgetProps.userName,
      activeChantiers: widgetProps.stats?.chantiersActifs,
      urgentAction: widgetProps.urgentAction,
      devisEnAttente: widgetProps.devisEnAttente || 0,
      isDark: widgetProps.isDark,
      onChantiersClick: () => widgetProps.setPage?.('chantiers'),
    },
    'kpi-encaisser': {
      stats: widgetProps.stats,
      clients: widgetProps.clients,
      isDark: widgetProps.isDark,
      modeDiscret: widgetProps.modeDiscret,
      formatMoney: widgetProps.formatMoney,
      setSelectedDevis: widgetProps.setSelectedDevis,
      setPage: widgetProps.setPage,
      onOpenEncaisser: widgetProps.onOpenEncaisser,
    },
    'kpi-facture': {
      stats: widgetProps.stats,
      devis: widgetProps.devis,
      isDark: widgetProps.isDark,
      modeDiscret: widgetProps.modeDiscret,
      formatMoney: widgetProps.formatMoney,
      onOpenCeMois: widgetProps.onOpenCeMois,
    },
    'suggestions': {
      suggestions: widgetProps.suggestions,
      isDark: widgetProps.isDark,
      couleur: widgetProps.couleur,
      setPage: widgetProps.setPage,
      onOpenRelance: widgetProps.onOpenRelance,
      onOpenMarginAnalysis: widgetProps.onOpenMarginAnalysis,
    },
    'overview': {
      setPage: widgetProps.setPage,
      isDark: widgetProps.isDark,
    },
    'revenue-chart': {
      setPage: widgetProps.setPage,
      isDark: widgetProps.isDark,
    },
    'devis': {
      setPage: widgetProps.setPage,
      setSelectedDevis: widgetProps.setSelectedDevis,
      onRelance: widgetProps.onRelance,
      isDark: widgetProps.isDark,
    },
    'chantiers': {
      setPage: widgetProps.setPage,
      setSelectedChantier: widgetProps.setSelectedChantier,
      isDark: widgetProps.isDark,
    },
    'tresorerie': {
      setPage: widgetProps.setPage,
      isDark: widgetProps.isDark,
    },
    'activite': {
      activities: widgetProps.recentActivity,
      isDark: widgetProps.isDark,
      formatMoney: widgetProps.formatMoneyDiscret,
      onActivityClick: widgetProps.onActivityClick,
    },
    'meteo': {
      setPage: widgetProps.setPage,
      isDark: widgetProps.isDark,
    },
    'score-sante': {
      isDark: widgetProps.isDark,
      setPage: widgetProps.setPage,
      couleur: widgetProps.couleur,
      entreprise: widgetProps.entreprise,
    },
    'memos': {
      isDark: widgetProps.isDark,
      couleur: widgetProps.couleur,
    },
    'plan-limits': {
      isDark: widgetProps.isDark,
      couleur: widgetProps.couleur,
    },
  };

  const specificProps = propsMap[widgetId] || { isDark: widgetProps.isDark };

  return <Component {...specificProps} />;
}

// ============ DASHBOARD GRID ============

export default function DashboardGrid({
  visibleWidgets,
  isEditMode,
  isDark,
  widgetProps,
  onReorder,
  onToggleWidget,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      onReorder?.(active.id, over.id);
    }
  }, [onReorder]);

  const widgetIds = useMemo(
    () => visibleWidgets.map(w => w.id),
    [visibleWidgets]
  );

  // Group widgets by size for proper grid rendering
  // Full-width widgets break out of the grid, half widgets are in 2-col grid,
  // third widgets are in 3-col grid
  const groupedWidgets = useMemo(() => {
    const groups = [];
    let currentThirds = [];

    visibleWidgets.forEach(widget => {
      const registry = WIDGET_REGISTRY[widget.id];
      const size = registry?.defaultSize || 'third';

      if (size === 'full') {
        // Flush accumulated thirds
        if (currentThirds.length > 0) {
          groups.push({ type: 'grid', widgets: [...currentThirds] });
          currentThirds = [];
        }
        groups.push({ type: 'full', widget });
      } else if (size === 'half') {
        // Flush accumulated thirds
        if (currentThirds.length > 0) {
          groups.push({ type: 'grid', widgets: [...currentThirds] });
          currentThirds = [];
        }
        groups.push({ type: 'half', widget });
      } else {
        currentThirds.push(widget);
      }
    });

    // Flush remaining thirds
    if (currentThirds.length > 0) {
      groups.push({ type: 'grid', widgets: [...currentThirds] });
    }

    return groups;
  }, [visibleWidgets]);

  const content = (
    <div className="space-y-6">
      {/* Collect half widgets to render in pairs */}
      {(() => {
        const elements = [];
        let halfBuffer = [];

        groupedWidgets.forEach((group, gi) => {
          if (group.type === 'full') {
            // Flush half buffer
            if (halfBuffer.length > 0) {
              elements.push(
                <div key={`half-group-${gi}`} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {halfBuffer.map(widget => (
                    <SortableWidget
                      key={widget.id}
                      id={widget.id}
                      isEditMode={isEditMode}
                      isDark={isDark}
                      onRemove={onToggleWidget}
                    >
                      <WidgetRenderer widgetId={widget.id} widgetProps={widgetProps} />
                    </SortableWidget>
                  ))}
                </div>
              );
              halfBuffer = [];
            }

            elements.push(
              <SortableWidget
                key={group.widget.id}
                id={group.widget.id}
                isEditMode={isEditMode}
                isDark={isDark}
                onRemove={onToggleWidget}
              >
                <WidgetRenderer widgetId={group.widget.id} widgetProps={widgetProps} />
              </SortableWidget>
            );
          } else if (group.type === 'half') {
            halfBuffer.push(group.widget);
          } else if (group.type === 'grid') {
            // Flush half buffer
            if (halfBuffer.length > 0) {
              elements.push(
                <div key={`half-group-${gi}`} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {halfBuffer.map(widget => (
                    <SortableWidget
                      key={widget.id}
                      id={widget.id}
                      isEditMode={isEditMode}
                      isDark={isDark}
                      onRemove={onToggleWidget}
                    >
                      <WidgetRenderer widgetId={widget.id} widgetProps={widgetProps} />
                    </SortableWidget>
                  ))}
                </div>
              );
              halfBuffer = [];
            }

            elements.push(
              <div key={`grid-${gi}`} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {group.widgets.map(widget => (
                  <SortableWidget
                    key={widget.id}
                    id={widget.id}
                    isEditMode={isEditMode}
                    isDark={isDark}
                    onRemove={onToggleWidget}
                  >
                    <WidgetRenderer widgetId={widget.id} widgetProps={widgetProps} />
                  </SortableWidget>
                ))}
              </div>
            );
          }
        });

        // Flush remaining halves
        if (halfBuffer.length > 0) {
          elements.push(
            <div key="half-group-final" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {halfBuffer.map(widget => (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  isEditMode={isEditMode}
                  isDark={isDark}
                  onRemove={onToggleWidget}
                >
                  <WidgetRenderer widgetId={widget.id} widgetProps={widgetProps} />
                </SortableWidget>
              ))}
            </div>
          );
        }

        return elements;
      })()}
    </div>
  );

  if (isEditMode) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          {content}
        </SortableContext>
      </DndContext>
    );
  }

  return content;
}
