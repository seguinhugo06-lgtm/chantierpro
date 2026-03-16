/**
 * CustomizePanel - Side panel for customizing dashboard layout
 * Allows toggling widgets, applying presets, and saving layout
 *
 * @module CustomizePanel
 */

import React, { useMemo } from 'react';
import { X, RotateCcw, Save, Check, GripVertical, Eye, EyeOff, Layout } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from './widgetRegistry';
import { PRESETS } from './presets';

export default function CustomizePanel({
  layout,
  activePreset,
  isDark,
  couleur = '#f97316',
  onToggleWidget,
  onApplyPreset,
  onSave,
  onReset,
  onClose,
}) {
  // Group widgets by category
  const categorizedWidgets = useMemo(() => {
    const categories = {};

    // Build visibility map from layout
    const visibilityMap = {};
    layout.forEach(w => {
      visibilityMap[w.id] = w.visible;
    });

    Object.entries(WIDGET_REGISTRY).forEach(([id, meta]) => {
      const cat = meta.category || 'overview';
      if (!categories[cat]) {
        categories[cat] = {
          ...WIDGET_CATEGORIES[cat],
          widgets: [],
        };
      }
      categories[cat].widgets.push({
        id,
        ...meta,
        visible: visibilityMap[id] !== false,
      });
    });

    return Object.entries(categories)
      .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));
  }, [layout]);

  const visibleCount = useMemo(
    () => layout.filter(w => w.visible).length,
    [layout]
  );

  const totalCount = Object.keys(WIDGET_REGISTRY).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full z-50',
          'w-full sm:w-96',
          'flex flex-col',
          'transition-transform duration-300',
          'shadow-2xl',
          isDark ? 'bg-slate-900 border-l border-slate-700' : 'bg-white border-l border-gray-200',
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-5 py-4 border-b',
          isDark ? 'border-slate-700' : 'border-gray-200',
        )}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <Layout size={18} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                Personnaliser
              </h2>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
                {visibleCount}/{totalCount} widgets affichés
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500',
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Presets */}
          <div>
            <h3 className={cn(
              'text-xs font-semibold uppercase tracking-wider mb-3',
              isDark ? 'text-slate-500' : 'text-gray-400',
            )}>
              Dispositions
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => {
                const isActive = activePreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onApplyPreset(key)}
                    className={cn(
                      'relative p-3 rounded-xl border-2 text-center transition-all duration-200',
                      isActive
                        ? 'border-current shadow-md'
                        : isDark
                          ? 'border-slate-700 hover:border-slate-600'
                          : 'border-gray-200 hover:border-gray-300',
                    )}
                    style={isActive ? { borderColor: couleur, color: couleur } : undefined}
                  >
                    {isActive && (
                      <div
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ background: couleur }}
                      >
                        <Check size={12} />
                      </div>
                    )}
                    <span className="text-lg">{preset.icon}</span>
                    <p className={cn(
                      'text-xs font-semibold mt-1',
                      isActive
                        ? ''
                        : isDark ? 'text-white' : 'text-gray-900',
                    )}
                      style={isActive ? { color: couleur } : undefined}
                    >
                      {preset.label}
                    </p>
                    <p className={cn(
                      'text-[10px] mt-0.5',
                      isDark ? 'text-slate-500' : 'text-gray-400',
                    )}>
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Widget toggles by category */}
          {categorizedWidgets.map(([catKey, category]) => (
            <div key={catKey}>
              <h3 className={cn(
                'text-xs font-semibold uppercase tracking-wider mb-3',
                isDark ? 'text-slate-500' : 'text-gray-400',
              )}>
                {category.label}
              </h3>
              <div className="space-y-1">
                {category.widgets.map(widget => {
                  const IconComponent = widget.icon;
                  return (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => onToggleWidget(widget.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                        widget.visible
                          ? isDark
                            ? 'bg-slate-800 hover:bg-slate-750'
                            : 'bg-gray-50 hover:bg-gray-100'
                          : isDark
                            ? 'opacity-50 hover:opacity-70'
                            : 'opacity-40 hover:opacity-60',
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        widget.visible
                          ? isDark ? 'bg-slate-700' : 'bg-white shadow-sm'
                          : isDark ? 'bg-slate-800' : 'bg-gray-100',
                      )}>
                        {IconComponent && <IconComponent size={15} className={isDark ? 'text-slate-400' : 'text-gray-500'} />}
                      </div>

                      {/* Title */}
                      <span className={cn(
                        'flex-1 text-left text-sm font-medium',
                        isDark ? 'text-white' : 'text-gray-700',
                      )}>
                        {widget.title}
                      </span>

                      {/* Toggle indicator */}
                      <div className={cn(
                        'w-10 h-6 rounded-full relative transition-colors duration-200',
                        widget.visible
                          ? ''
                          : isDark ? 'bg-slate-700' : 'bg-gray-300',
                      )}
                        style={widget.visible ? { background: couleur } : undefined}
                      >
                        <div className={cn(
                          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                          widget.visible ? 'translate-x-[18px]' : 'translate-x-0.5',
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={cn(
          'px-5 py-4 border-t flex items-center gap-3',
          isDark ? 'border-slate-700' : 'border-gray-200',
        )}>
          <button
            type="button"
            onClick={onReset}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
            )}
          >
            <RotateCcw size={15} />
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-[0.98]"
            style={{ background: couleur }}
          >
            <Save size={15} />
            Enregistrer
          </button>
        </div>
      </div>
    </>
  );
}
