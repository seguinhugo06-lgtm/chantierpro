/**
 * StarRating.jsx — Reusable star rating component
 *
 * Features:
 * - Interactive mode (click to rate) + read-only mode
 * - Half-star display support
 * - Configurable size (sm, md, lg)
 * - Accessible (aria-labels, keyboard navigation)
 * - Dark mode support
 */

import React, { useState, memo, useCallback } from 'react';
import { Star } from 'lucide-react';

const SIZES = {
  xs: { star: 12, gap: 'gap-0', text: 'text-[10px]' },
  sm: { star: 14, gap: 'gap-0.5', text: 'text-xs' },
  md: { star: 18, gap: 'gap-0.5', text: 'text-sm' },
  lg: { star: 24, gap: 'gap-1', text: 'text-base' },
  xl: { star: 32, gap: 'gap-1', text: 'text-lg' },
};

const StarRating = memo(function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 'md',
  showValue = false,
  showCount = false,
  count = 0,
  maxStars = 5,
  isDark = false,
  className = '',
  color = '#f59e0b', // amber-500
}) {
  const [hoverValue, setHoverValue] = useState(0);
  const sizeConfig = SIZES[size] || SIZES.md;
  const displayValue = hoverValue || value;

  const handleClick = useCallback((starIndex) => {
    if (readOnly) return;
    onChange?.(starIndex);
  }, [readOnly, onChange]);

  const handleMouseEnter = useCallback((starIndex) => {
    if (readOnly) return;
    setHoverValue(starIndex);
  }, [readOnly]);

  const handleMouseLeave = useCallback(() => {
    setHoverValue(0);
  }, []);

  const handleKeyDown = useCallback((e, starIndex) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange?.(starIndex);
    }
  }, [readOnly, onChange]);

  return (
    <div
      className={`inline-flex items-center ${sizeConfig.gap} ${className}`}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={readOnly ? `Note: ${value} sur ${maxStars}` : `Sélectionner une note`}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const starIndex = i + 1;
        const fillPercent = Math.min(Math.max(displayValue - i, 0), 1) * 100;

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onKeyDown={(e) => handleKeyDown(e, starIndex)}
            className={`relative flex-shrink-0 ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            } focus:outline-none focus:ring-1 focus:ring-amber-400 rounded transition-transform ${
              !readOnly && hoverValue === starIndex ? 'scale-110' : ''
            }`}
            style={{ width: sizeConfig.star, height: sizeConfig.star, minWidth: readOnly ? undefined : '44px', minHeight: readOnly ? undefined : '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            disabled={readOnly}
            tabIndex={readOnly ? -1 : 0}
            role={readOnly ? undefined : 'radio'}
            aria-checked={readOnly ? undefined : starIndex === Math.round(value)}
            aria-label={`${starIndex} étoile${starIndex > 1 ? 's' : ''}`}
          >
            {/* Background (empty) star */}
            <Star
              size={sizeConfig.star}
              className={isDark ? 'text-slate-600' : 'text-gray-300'}
              fill={isDark ? 'rgb(71,85,105)' : 'rgb(209,213,219)'}
            />
            {/* Filled overlay */}
            {fillPercent > 0 && (
              <div
                className="absolute inset-0 overflow-hidden flex items-center justify-center"
                style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0)` }}
              >
                <Star
                  size={sizeConfig.star}
                  fill={color}
                  stroke={color}
                />
              </div>
            )}
          </button>
        );
      })}

      {/* Value text */}
      {showValue && (
        <span className={`ml-1 font-semibold ${sizeConfig.text} ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {value > 0 ? value.toFixed(1) : '—'}
        </span>
      )}

      {/* Count */}
      {showCount && count > 0 && (
        <span className={`${sizeConfig.text} ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          ({count})
        </span>
      )}
    </div>
  );
});

/**
 * RatingBar — Horizontal progress bar for a single rating criterion
 */
export const RatingBar = memo(function RatingBar({
  label,
  value = 0,
  maxValue = 5,
  isDark = false,
  couleur = '#f97316',
  size = 'md',
}) {
  const percent = (value / maxValue) * 100;
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs w-28 truncate ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
        {label}
      </span>
      <div className={`flex-1 ${barHeight} rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
        <div
          className={`${barHeight} rounded-full transition-all duration-300`}
          style={{ width: `${percent}%`, background: couleur }}
        />
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {value > 0 ? value.toFixed(1) : '—'}
      </span>
    </div>
  );
});

export default StarRating;
