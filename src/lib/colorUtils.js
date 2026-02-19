/**
 * colorUtils.js — WCAG-compliant color utilities for ChantierPro
 *
 * Provides functions to determine accessible text colors
 * based on background color luminance.
 *
 * WCAG AA minimum contrast ratios:
 *  - Normal text: 4.5:1
 *  - Large text (≥18px bold or ≥24px): 3.0:1
 */

/**
 * Parse a hex color string to RGB components.
 * Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA formats.
 * @param {string} hex - Color in hex format
 * @returns {{ r: number, g: number, b: number }} RGB values (0-255)
 */
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  hex = hex.replace('#', '');
  if (hex.length === 3 || hex.length === 4) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return { r, g, b };
}

/**
 * Calculate relative luminance per WCAG 2.0 formula.
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {number} Luminance value between 0 (black) and 1 (white)
 */
function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors.
 * @param {string} color1 - Hex color
 * @param {string} color2 - Hex color
 * @returns {number} Contrast ratio (1:1 to 21:1)
 */
export function contrastRatio(color1, color2) {
  const l1 = relativeLuminance(hexToRgb(color1));
  const l2 = relativeLuminance(hexToRgb(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine if white or dark text should be used on a given background.
 * Returns 'text-white' if white passes WCAG AA (4.5:1),
 * otherwise returns a dark text class.
 *
 * @param {string} bgColor - Background color in hex format (e.g., '#f97316')
 * @returns {string} Tailwind text color class ('text-white' or 'text-gray-900')
 */
export function getAccessibleTextClass(bgColor) {
  if (!bgColor) return 'text-white';
  const whiteContrast = contrastRatio(bgColor, '#ffffff');
  return whiteContrast >= 4.5 ? 'text-white' : 'text-gray-900';
}

/**
 * Get the accessible text color value (for inline styles).
 * @param {string} bgColor - Background color in hex format
 * @returns {string} '#ffffff' or '#111827' (gray-900)
 */
export function getAccessibleTextColor(bgColor) {
  if (!bgColor) return '#ffffff';
  const whiteContrast = contrastRatio(bgColor, '#ffffff');
  return whiteContrast >= 4.5 ? '#ffffff' : '#111827';
}

/**
 * Darken a hex color by a given amount to improve contrast with white text.
 * Returns a darker shade that passes WCAG AA (4.5:1) with white.
 *
 * @param {string} hex - Base hex color
 * @param {number} [step=0.15] - Amount to darken (0-1)
 * @returns {string} Darkened hex color
 */
export function darkenForContrast(hex) {
  if (!hex) return '#000000';
  const { r, g, b } = hexToRgb(hex);

  // Iteratively darken until we get 4.5:1 with white
  let factor = 1.0;
  let attempts = 0;
  while (attempts < 20) {
    factor -= 0.05;
    const dr = Math.round(r * factor);
    const dg = Math.round(g * factor);
    const db = Math.round(b * factor);
    const darkened = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
    if (contrastRatio(darkened, '#ffffff') >= 4.5) {
      return darkened;
    }
    attempts++;
  }
  // Fallback: return very dark version
  return `#${Math.round(r * 0.4).toString(16).padStart(2, '0')}${Math.round(g * 0.4).toString(16).padStart(2, '0')}${Math.round(b * 0.4).toString(16).padStart(2, '0')}`;
}
