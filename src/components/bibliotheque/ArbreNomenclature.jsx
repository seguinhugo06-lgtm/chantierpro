import React, { useMemo } from 'react';
import {
  Building2,
  MapPin,
  DoorOpen,
  Wrench,
  Paintbrush,
  Home,
  Hammer,
  Droplets,
  Zap,
  ThermometerSun,
  AlertTriangle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { LOTS, getChildren } from '../../lib/data/bibliotheque';
import TreeNode from './TreeNode';

// ---------------------------------------------------------------------------
// Icon mapping by LOT id
// ---------------------------------------------------------------------------
const ICON_MAP = {
  LOT_CN: Briefcase,
  LOT_01: Building2,
  LOT_02: MapPin,
  LOT_03: DoorOpen,
  LOT_04: Wrench,
  LOT_05: Home,
  LOT_06: Paintbrush,
  LOT_07: Hammer,
  LOT_08: Droplets,
  LOT_09: Zap,
  LOT_10: ThermometerSun,
  LOT_11: AlertTriangle,
};

/**
 * ArbreNomenclature - Hierarchical tree navigation for the BTP nomenclature.
 * Displays: LOT -> Corps d'etat -> Chapitre
 */
export default function ArbreNomenclature({
  selectedNodeId,
  onSelectNode,
  expandedNodes,
  onToggleNode,
  countByNode,
  isDark = false,
  couleur = '#f97316',
}) {
  // Pre-compute lot children once
  const lotsWithChildren = useMemo(
    () =>
      LOTS.map((lot) => ({
        lot,
        children: getChildren(lot.id),
      })),
    [],
  );

  // Total count across all ouvrages (for the "Tous" button)
  const totalCount = useMemo(() => {
    if (!countByNode) return 0;
    return LOTS.reduce((sum, lot) => sum + (countByNode(lot.id) || 0), 0);
  }, [countByNode]);

  // Container theme
  const containerBg = isDark ? 'bg-gray-800' : 'bg-white';
  const containerText = isDark ? 'text-gray-100' : 'text-gray-900';
  const containerBorder = isDark ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';

  // "Tous" button styling
  const isAllSelected = selectedNodeId === null;
  const allBg = isAllSelected
    ? isDark
      ? 'bg-orange-900/20 border-l-2 border-orange-500'
      : 'bg-orange-50 border-l-2 border-orange-500'
    : `border-l-2 border-transparent ${hoverBg}`;

  return (
    <div
      className={`flex flex-col h-full overflow-y-auto ${containerBg} ${containerText} ${containerBorder}`}
      role="tree"
      aria-label="Nomenclature BTP"
    >
      {/* "Tous" - show all ouvrages */}
      <button
        type="button"
        className={`flex items-center gap-2 py-2.5 px-3 cursor-pointer transition-colors duration-150 w-full text-left ${allBg}`}
        onClick={() => onSelectNode(null)}
      >
        <Layers
          size={16}
          className="flex-shrink-0"
          style={{ color: isAllSelected ? couleur : (isDark ? '#9ca3af' : '#6b7280') }}
        />
        <span className={`flex-1 text-sm ${isAllSelected ? 'font-semibold' : 'font-medium'}`}>
          Tous les ouvrages
        </span>
        {totalCount > 0 && (
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isAllSelected ? couleur : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
              color: isAllSelected ? '#fff' : (isDark ? '#d1d5db' : '#6b7280'),
            }}
          >
            {totalCount}
          </span>
        )}
      </button>

      {/* Separator */}
      <div className={`border-b ${containerBorder} mx-3`} />

      {/* LOT tree items */}
      <div className="flex-1 py-1">
        {lotsWithChildren.map(({ lot, children }) => {
          const LotIcon = ICON_MAP[lot.id] || Briefcase;
          const isSelected = selectedNodeId === lot.id;
          const isExpanded = expandedNodes.has(lot.id);
          const hasChildren = children.length > 0;
          const count = countByNode ? countByNode(lot.id) : 0;

          const selectedBg = isDark
            ? 'bg-orange-900/20 border-l-2 border-orange-500'
            : 'bg-orange-50 border-l-2 border-orange-500';
          const defaultBorder = 'border-l-2 border-transparent';

          return (
            <div key={lot.id}>
              {/* LOT row */}
              <div
                className={[
                  'flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors duration-150',
                  isSelected ? selectedBg : `${defaultBorder} ${hoverBg}`,
                ].join(' ')}
                onClick={() => {
                  onSelectNode(lot.id);
                  if (hasChildren) {
                    onToggleNode(lot.id);
                  }
                }}
                role="treeitem"
                aria-selected={isSelected}
                aria-expanded={hasChildren ? isExpanded : undefined}
              >
                {/* LOT icon with color */}
                <span
                  className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
                  style={{
                    backgroundColor: `${lot.color}20`,
                  }}
                >
                  <LotIcon size={14} style={{ color: lot.color }} />
                </span>

                {/* LOT name */}
                <span className={`flex-1 text-sm truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                  {lot.nom}
                </span>

                {/* Ouvrage count badge */}
                {count > 0 && (
                  <span
                    className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isSelected ? couleur : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                      color: isSelected ? '#fff' : (isDark ? '#d1d5db' : '#6b7280'),
                    }}
                  >
                    {count}
                  </span>
                )}
              </div>

              {/* Expanded children (corps -> chapitres) */}
              {isExpanded &&
                children.map((child) => {
                  const grandChildren = getChildren(child.id);
                  return (
                    <TreeNode
                      key={child.id}
                      node={child}
                      children={grandChildren}
                      selectedNodeId={selectedNodeId}
                      onSelectNode={onSelectNode}
                      expandedNodes={expandedNodes}
                      onToggleNode={onToggleNode}
                      countByNode={countByNode}
                      getChildrenFn={getChildren}
                      level={1}
                      isDark={isDark}
                      couleur={couleur}
                    />
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
