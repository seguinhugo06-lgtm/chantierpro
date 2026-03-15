import React, { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import KanbanCard from './KanbanCard';

/**
 * Pipeline Kanban columns configuration.
 */
const COLUMNS = [
  { id: 'brouillon', label: 'Brouillon', color: '#94a3b8', emoji: '📝' },
  { id: 'envoye', label: 'Envoyé', color: '#3b82f6', emoji: '📤' },
  { id: 'accepte', label: 'Accepté', color: '#f59e0b', emoji: '✅', statuts: ['accepte', 'signe'] },
  { id: 'facture', label: 'Facturé', color: '#22c55e', emoji: '💰', statuts: ['acompte_facture', 'facture'] },
  { id: 'refuse', label: 'Refusé', color: '#ef4444', emoji: '❌' },
];

/**
 * PipelineKanban — Vue Kanban des devis par statut.
 */
export default function PipelineKanban({
  devis,
  clients,
  onUpdateStatut,
  onSelectDevis,
  isDark,
  couleur,
}) {
  const [activeId, setActiveId] = useState(null);

  const cardBg = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const colBg = isDark ? 'bg-slate-800' : 'bg-slate-100';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group devis by column
  const columns = useMemo(() => {
    return COLUMNS.map(col => {
      const statuts = col.statuts || [col.id];
      const items = devis.filter(d =>
        d.type === 'devis'
          ? statuts.includes(d.statut)
          : (col.id === 'facture' && d.type === 'facture')
      );
      const total = items.reduce((s, d) => s + (d.total_ttc || 0), 0);
      return { ...col, items, total };
    });
  }, [devis]);

  // Find which column an item belongs to
  const findColumn = (itemId) => {
    for (const col of columns) {
      if (col.items.some(d => d.id === itemId)) {
        return col.id;
      }
    }
    return null;
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeCol = findColumn(active.id);
    // Check if dropped onto a column header or a card in another column
    let overCol = COLUMNS.find(c => c.id === over.id)?.id;
    if (!overCol) {
      overCol = findColumn(over.id);
    }

    if (activeCol && overCol && activeCol !== overCol && overCol !== 'refuse') {
      // Map column id to the target statut
      const targetStatut = overCol === 'accepte' ? 'accepte' : overCol;
      onUpdateStatut?.(active.id, targetStatut);
    }
  };

  const activeItem = activeId ? devis.find(d => d.id === activeId) : null;
  const activeClient = activeItem ? clients.find(c => c.id === activeItem.client_id) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-3 px-3">
        {columns.map(col => (
          <div
            key={col.id}
            className={`flex-shrink-0 w-64 sm:w-72 rounded-2xl border ${cardBg} flex flex-col`}
          >
            {/* Column header */}
            <div className="p-3 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span>{col.emoji}</span>
                  <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {col.label}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'} ${textMuted}`}>
                    {col.items.length}
                  </span>
                </div>
              </div>
              <p className={`text-xs ${textMuted}`}>
                {col.total.toLocaleString('fr-FR')} €
              </p>
            </div>

            {/* Column body — droppable area */}
            <SortableContext
              id={col.id}
              items={col.items.map(d => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="p-2 flex-1 space-y-2 min-h-[100px]">
                {col.items.length === 0 && (
                  <div className={`text-center py-8 text-xs ${textMuted}`}>
                    Aucun document
                  </div>
                )}
                {col.items.map(item => {
                  const client = clients.find(c => c.id === item.client_id);
                  return (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      client={client}
                      isDark={isDark}
                      couleur={couleur}
                      onClick={() => onSelectDevis?.(item)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem && (
          <KanbanCard
            item={activeItem}
            client={activeClient}
            isDark={isDark}
            couleur={couleur}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
