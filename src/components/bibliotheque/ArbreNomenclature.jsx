import { useMemo } from 'react';
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
  const containerBg = 'bg-surface';
  const containerText = 'text-encre';
  const containerBorder = 'border-bord';
  const hoverBg = 'hover:bg-surface-2';

  // "Tous" button styling
  const isAllSelected = selectedNodeId === null;
  const allBg = isAllSelected
    ? 'bg-accent/10 border-l-2 border-accent'
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
          aria-hidden="true"
          className={`flex-shrink-0 ${isAllSelected ? 'text-accent-texte' : 'text-encre-3'}`}
        />
        <span className={`flex-1 text-sm ${isAllSelected ? 'font-semibold' : 'font-medium'}`}>
          Tous les ouvrages
        </span>
        {totalCount > 0 && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full tabular-nums ${isAllSelected ? 'bg-accent text-sur-accent' : 'bg-surface-2 text-encre-3'}`}>
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

          const selectedBg = 'bg-accent/10 border-l-2 border-accent';
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
                {/* L'icône du lot : neutre, le nom dit le lot (une teinte par lot décorait sans rien dire) */}
                <span className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center bg-surface-2 text-encre-2">
                  <LotIcon size={14} aria-hidden="true" />
                </span>

                {/* LOT name */}
                <span className={`flex-1 text-sm truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                  {lot.nom}
                </span>

                {/* Ouvrage count badge */}
                {count > 0 && (
                  <span className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full tabular-nums ${isSelected ? 'bg-accent text-sur-accent' : 'bg-surface-2 text-encre-3'}`}>
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
