/**
 * animations.js — Shared Framer Motion animation presets for landing pages.
 *
 * Centralizes all animation variants, hooks, and wrapper components
 * used across the BatiGesti marketing site.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useSpring,
  useMotionValue,
} from 'framer-motion';

// ── Transition presets ──

export const springTransition = { type: 'spring', stiffness: 100, damping: 20 };
export const easeTransition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] };
export const slowReveal = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };

// ── Variant presets ──

export const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: easeTransition },
};

export const fadeInDown = {
  hidden: { opacity: 0, y: -40 },
  visible: { opacity: 1, y: 0, transition: easeTransition },
};

export const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: slowReveal },
};

export const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: slowReveal },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeTransition },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: springTransition },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

// ── ScrollReveal wrapper component ──

/**
 * Wraps children with scroll-triggered animation.
 * Uses useInView with once:true so animation plays once.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object} [props.variants] - Framer Motion variants (default: fadeInUp)
 * @param {string} [props.className]
 * @param {number} [props.delay] - Additional delay in seconds
 * @param {number} [props.threshold] - InView threshold (0-1)
 */
export function ScrollReveal({
  children,
  variants = fadeInUp,
  className = '',
  delay = 0,
  threshold = 0.1,
  ...rest
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: threshold });

  // Respect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return <div className={className} {...rest}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        ...variants,
        visible: {
          ...variants.visible,
          transition: {
            ...variants.visible?.transition,
            delay: (variants.visible?.transition?.delay || 0) + delay,
          },
        },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerReveal wrapper for lists ──

export function StaggerReveal({
  children,
  className = '',
  staggerDelay = 0.12,
  threshold = 0.01,
  ...rest
}) {
  const ref = useRef(null);
  // Use very low threshold so tall containers trigger on mobile
  const isInView = useInView(ref, { once: true, amount: threshold, margin: '-50px' });

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return <div className={className} {...rest}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
        },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ── Parallax hook ──

/**
 * Returns a motion value that moves within `range` pixels relative to scroll.
 *
 * @param {number[]} range - [startOffset, endOffset] e.g. [-50, 50]
 * @returns {import('framer-motion').MotionValue}
 */
export function useParallax(range = [-50, 50]) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], range);
  return { ref, y };
}

// ── Counter animation hook ──

/**
 * Animate a number from 0 to target when element is in view.
 *
 * @param {number} target - Target value
 * @param {number} [duration=2] - Duration in seconds
 * @returns {{ ref: React.RefObject, value: number }}
 */
export function useCounter(target, duration = 2) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      motionValue.set(target);
    }
  }, [isInView, target, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      setDisplayValue(Math.round(v));
    });
    return unsubscribe;
  }, [spring]);

  return { ref, value: displayValue };
}

// ── Floating element animation (for decorative shapes) ──

export const floatAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

export const floatAnimationSlow = {
  y: [0, -10, 0],
  transition: {
    duration: 8,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

// ── Shimmer animation for CTAs ──

export const shimmer = {
  backgroundSize: '200% 100%',
  backgroundPosition: ['100% 0', '-100% 0'],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    repeatDelay: 3,
    ease: 'linear',
  },
};
