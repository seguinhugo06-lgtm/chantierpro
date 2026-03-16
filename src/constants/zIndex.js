/**
 * Centralized z-index values for consistent layering across the app
 * Use these constants instead of arbitrary z-index values
 */

export const Z_INDEX = {
  // Base layer
  base: 0,

  // Dropdowns and popovers
  dropdown: 10,

  // Sticky elements (headers, footers)
  sticky: 20,

  // Overlays and backdrops
  overlay: 30,

  // Sidebar navigation
  sidebar: 40,

  // Modal dialogs
  modal: 50,

  // Toast notifications
  toast: 60,

  // Tooltips (highest priority)
  tooltip: 70,

  // Command palette (above everything)
  commandPalette: 80
};

// Tailwind class helpers
export const Z_CLASSES = {
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-20',
  overlay: 'z-30',
  sidebar: 'z-40',
  modal: 'z-50',
  toast: 'z-[60]',
  tooltip: 'z-[70]',
  commandPalette: 'z-[80]'
};
