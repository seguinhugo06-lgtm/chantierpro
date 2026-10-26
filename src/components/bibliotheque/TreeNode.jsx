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
}) {
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = childNodes && childNodes.length > 0;
  const count = countByNode ? countByNode(node.id) : 0;

  // Indentation based on level
  const paddingClass = level === 0 ? 'pl-3' : level === 1 ? 'pl-7' : 'pl-11';

  // Row styling
  const selectedBg = 'bg-accent/10 border-l-2 border-accent';
  const hoverBg = 'hover:bg-surface-2';
  const defaultBorder = 'border-l-2 border-transparent';

  const rowClasses = [
    'flex items-center gap-2 py-2 pr-3 cursor-pointer transition-colors duration-150',
    paddingClass,
    isSelected ? selectedBg : `${defaultBorder} ${hoverBg}`,
  ].join(' ');

  const textColor = 'text-encre';
  const mutedColor = 'text-encre-3';

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

        {/* Node name */}
        <span className={`flex-1 text-sm truncate ${textColor} ${isSelected ? 'font-semibold' : 'font-normal'}`}>
          {node.nom}
        </span>

        {/* Ouvrage count badge */}
        {count > 0 && (
          <span className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full tabular-nums ${isSelected ? 'bg-accent text-sur-accent' : 'bg-surface-2 text-encre-3'}`}>
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
