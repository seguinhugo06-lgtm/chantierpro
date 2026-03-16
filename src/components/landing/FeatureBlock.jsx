/**
 * FeatureBlock — Reusable zig-zag feature block with screenshot and text.
 *
 * Alternates image/text layout based on `reversed` prop.
 * Scroll-triggered animations: image slides from side, text fades up.
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import BrowserFrame from './BrowserFrame';

export default function FeatureBlock({
  title,
  description,
  bullets = [],
  screenshotSrc,
  icon: Icon,
  iconColor = '#f97316',
  iconBg = 'bg-orange-50',
  reversed = false,
  badge,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.25 });

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const imageVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, x: reversed ? 60 : -60 },
        visible: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        },
      };

  const textVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] },
        },
      };

  return (
    <div ref={ref} className="py-8 sm:py-12">
      <div
        className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
          reversed ? 'lg:direction-rtl' : ''
        }`}
        style={reversed ? { direction: 'rtl' } : undefined}
      >
        {/* Screenshot side */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={imageVariants}
          className="group"
          style={reversed ? { direction: 'ltr' } : undefined}
        >
          <BrowserFrame
            src={screenshotSrc}
            alt={`${title} — BatiGesti`}
            className="transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-orange-500/10 group-hover:scale-[1.02]"
          />
        </motion.div>

        {/* Text side */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={textVariants}
          style={reversed ? { direction: 'ltr' } : undefined}
        >
          {/* Badge */}
          {badge && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: `${iconColor}15`, color: iconColor }}
            >
              {badge}
            </span>
          )}

          {/* Icon + Title */}
          <div className="flex items-center gap-3 mb-4">
            {Icon && (
              <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} style={{ color: iconColor }} />
              </div>
            )}
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h3>
          </div>

          {/* Description */}
          <p className="text-slate-500 leading-relaxed mb-5">{description}</p>

          {/* Bullet points */}
          {bullets.length > 0 && (
            <ul className="space-y-2.5">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="flex-shrink-0 mt-0.5"
                  >
                    <circle cx="12" cy="12" r="10" fill={`${iconColor}15`} />
                    <path
                      d="M8 12l3 3 5-5"
                      stroke={iconColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
}
