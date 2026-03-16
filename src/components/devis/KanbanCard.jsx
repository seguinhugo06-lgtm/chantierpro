import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Receipt, Euro, Calendar, User } from 'lucide-react';

/**
 * KanbanCard — Carte draggable pour un devis/facture dans le pipeline Kanban.
 */
export default function KanbanCard({ item, client, isDark, couleur, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardBg = isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const isFacture = item.type === 'facture';
  const montant = (item.total_ttc || 0).toLocaleString('fr-FR');
  const dateStr = item.date
    ? new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-3 rounded-xl border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${cardBg}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${isFacture ? '#8b5cf6' : couleur}15` }}
        >
          {isFacture
            ? <Receipt size={14} style={{ color: '#8b5cf6' }} />
            : <FileText size={14} style={{ color: couleur }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${textPrimary}`}>
            {item.numero || `#${item.id?.slice(-6)}`}
          </p>
          {client && (
            <p className={`text-xs truncate ${textMuted}`}>
              {client.nom} {client.prenom || ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${textPrimary}`}>
          {montant} €
        </span>
        {dateStr && (
          <span className={`text-xs ${textMuted}`}>{dateStr}</span>
        )}
      </div>
    </div>
  );
}
