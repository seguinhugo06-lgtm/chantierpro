/**
 * BrowserFrame — macOS-style browser chrome wrapper for screenshots.
 *
 * Renders a realistic browser window frame around an image.
 * Used across landing pages to display app screenshots.
 */

import React from 'react';

export default function BrowserFrame({
  src,
  alt = 'Capture d\'écran BatiGesti',
  className = '',
  url = 'batigesti.fr',
  children,
}) {
  return (
    <div className={`rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-200 bg-white ${className}`}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        {/* Address bar */}
        <div className="flex-1 mx-3">
          <div className="bg-white rounded-md px-3 py-1 text-xs text-slate-400 text-center border border-slate-200 max-w-xs mx-auto">
            {url}
          </div>
        </div>
        {/* Spacer for symmetry */}
        <div className="w-[54px]" />
      </div>
      {/* Content */}
      <div className="relative bg-slate-50">
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full h-auto block"
            width={1200}
            height={750}
          />
        ) : children ? (
          children
        ) : (
          /* Placeholder gradient when no screenshot available */
          <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 via-orange-50 to-slate-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-orange-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
              </div>
              <p className="text-xs text-slate-400">Aperçu de l'application</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
