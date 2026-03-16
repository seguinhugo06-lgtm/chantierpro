import React, { useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

/**
 * TreeNode - Recursive tree node for the nomenclature hierarchy.
 * Renders a single node row with expand/collapse and recursive children.
 */
const TreeNode = React.memo(function TreeNode({
  node,
  children: childNodes,
  selectedNodeId,
  onSelectNode,
  expandedNodes,
  onToggleNode,
  countByNode,
  getChildrenFn,
  level = 0,
  isDark,
  couleur,
}) {
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = childNodes && childNodes.length > 0;
  const count = countByNode ? countByNode(node.id) : 0;

  // Indentation based on level
  const paddingClass = level === 0 ? 'pl-3' : level === 1 ? 'pl-7' : 'pl-11';

  // Row styling
  const selectedBg = isDark
    ? 'bg-orange-900/20 border-l-2 border-orange-500'
    : 'bg-orange-50 border-l-2 border-orange-500';
  const hoverBg = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';
  const defaultBorder = 'border-l-2 border-transparent';

  const rowClasses = [
    'flex items-center gap-2 py-2 pr-3 cursor-pointer transition-colors duration-150',
    paddingClass,
    isSelected ? selectedBg : `${defaultBorder} ${hoverBg}`,
  ].join(' ');

  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const mutedColor = isDark ? 'text-gray-400' : 'text-gray-500';

  function handleClick() {
    onSelectNode(node.id);
    if (hasChildren) {
      onToggleNode(node.id);
    }
  }

  // Recursively rendered children
  const renderedChildren = useMemo(() => {
    if (!isExpanded || !hasChildren) return null;
    return childNodes.map((child) => {
      const grandChildren = getChildrenFn(child.id);
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
          getChildrenFn={getChildrenFn}
          level={level + 1}
          isDark={isDark}
          couleur={couleur}
        />
      );
    });
  }, [
    isExpanded,
    hasChildren,
    childNodes,
    selectedNodeId,
    expandedNodes,
    onToggleNode,
    onSelectNode,
    countByNode,
    getChildrenFn,
    level,
    isDark,
    couleur,
  ]);

  return (
    <>
      <div className={rowClasses} onClick={handleClick} role="treeitem" aria-selected={isSelected}>
        {/* Expand/collapse indicator */}
        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} className={mutedColor} />
            ) : (
              <ChevronRight size={14} className={mutedColor} />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </span>

        {/* Color indicator dot */}
        <span
          className="flex-shrink-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: node.color || couleur }}
        />

        {/* Node name */}
        <span className={`flex-1 text-sm truncate ${textColor} ${isSelected ? 'font-semibold' : 'font-normal'}`}>
          {node.nom}
        </span>

        {/* Ouvrage count badge */}
        {count > 0 && (
          <span
            className="flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isSelected ? (couleur || '#f97316') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
              color: isSelected ? '#fff' : (isDark ? '#d1d5db' : '#6b7280'),
            }}
          >
            {count}
          </span>
        )}
      </div>

      {/* Render children if expanded */}
      {renderedChildren}
    </>
  );
});

export default TreeNode;
