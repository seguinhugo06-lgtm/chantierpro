/**
 * HeroMockup — Animated app mockup in browser frame with parallax.
 *
 * Displays dashboard screenshot in a BrowserFrame with:
 * - Vertical parallax (moves slower than scroll)
 * - Subtle 3D perspective tilt
 * - Shadow that intensifies on scroll
 */

import React from 'react';
import { motion } from 'framer-motion';
import BrowserFrame from './BrowserFrame';
import { useParallax } from './animations';

export default function HeroMockup({ className = '' }) {
  const { ref, y } = useParallax([-30, 30]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={`relative ${className}`}
    >
      {/* Glow behind the mockup */}
      <div className="absolute -inset-4 bg-gradient-to-br from-orange-500/20 via-transparent to-blue-500/10 rounded-3xl blur-2xl" />

      {/* Browser frame */}
      <div className="relative" style={{ perspective: '1000px' }}>
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 5 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <BrowserFrame
            src="/screenshots/dashboard.webp"
            alt="Dashboard BatiGesti — vue d'ensemble de votre activité"
            url="app.batigesti.fr/dashboard"
          />
        </motion.div>
      </div>

      {/* Floating notification card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -bottom-4 -left-4 sm:-left-8 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-slate-100 p-3 sm:p-4 z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">Devis #247 accept&eacute;</p>
            <p className="text-[10px] sm:text-xs text-slate-400">il y a 2 min</p>
          </div>
        </div>
      </motion.div>

      {/* Floating stat card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -top-2 -right-2 sm:-right-6 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-slate-100 p-3 sm:p-4 z-10"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">+12 340 &euro;</p>
            <p className="text-[10px] sm:text-xs text-green-500 font-medium">+23% ce mois</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
