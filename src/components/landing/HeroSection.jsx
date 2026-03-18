/**
 * HeroSection — Animated hero with parallax art, floating shapes, and app mockup.
 *
 * Design: Light gradient background, Z-pattern layout (text left, mockup right),
 * scroll-triggered parallax on floating elements, staggered text entrance.
 */

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Play, Shield, CheckCircle, Sparkles } from 'lucide-react';
import HeroMockup from './HeroMockup';

const textVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const wordVariant = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HeroSection({ onSignup }) {
  const { scrollY } = useScroll();

  // Parallax for floating shapes — move at different rates
  const shape1Y = useTransform(scrollY, [0, 600], [0, -80]);
  const shape2Y = useTransform(scrollY, [0, 600], [0, -50]);
  const shape3Y = useTransform(scrollY, [0, 600], [0, -120]);
  const shape4Y = useTransform(scrollY, [0, 600], [0, -30]);

  // Hero text fade-out on scroll
  const textOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const textScale = useTransform(scrollY, [0, 400], [1, 0.95]);

  const headlineWords = ['Pilotez', 'vos', 'chantiers,'];
  const headlineAccent = ['boostez', 'votre', 'rentabilité'];
  const headlineEnd = ['sans', 'effort.'];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-orange-50/30 to-white">
      {/* Animated background mesh */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient orbs */}
        <motion.div
          style={{ y: shape1Y }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-orange-200/40 to-orange-100/20 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: shape2Y }}
          className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-gradient-to-br from-blue-100/30 to-cyan-50/20 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: shape3Y }}
          className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gradient-to-br from-orange-100/20 to-yellow-50/10 rounded-full blur-3xl"
        />

        {/* Floating geometric shapes */}
        <motion.div
          style={{ y: shape1Y }}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-32 right-[15%] w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400/10 to-orange-300/5 border border-orange-200/30 backdrop-blur-sm"
        />
        <motion.div
          style={{ y: shape2Y }}
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-64 left-[8%] w-12 h-12 rounded-full bg-gradient-to-br from-blue-400/10 to-blue-300/5 border border-blue-200/30"
        />
        <motion.div
          style={{ y: shape3Y }}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-32 left-[20%] w-10 h-10 rounded-xl bg-gradient-to-br from-green-400/10 to-green-300/5 border border-green-200/30"
        />
        <motion.div
          style={{ y: shape4Y }}
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-48 right-[40%] w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400/10 to-violet-300/5 border border-violet-200/30"
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text content */}
          <motion.div style={{ opacity: textOpacity, scale: textScale }}>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-200/60 text-orange-600 text-xs font-semibold mb-6"
            >
              <Sparkles size={14} />
              Nouveau : Devis IA par reconnaissance vocale
            </motion.div>

            {/* Animated headline */}
            <motion.h1
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="text-3xl sm:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-[1.1] mb-6"
            >
              {headlineWords.map((word, i) => (
                <motion.span key={i} variants={wordVariant} className="inline-block mr-[0.3em]">
                  {word}
                </motion.span>
              ))}
              <br className="hidden sm:block" />
              {headlineAccent.map((word, i) => (
                <motion.span
                  key={`a-${i}`}
                  variants={wordVariant}
                  className="inline-block mr-[0.3em] text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                >
                  {word}
                </motion.span>
              ))}
              <br className="hidden sm:block" />
              {headlineEnd.map((word, i) => (
                <motion.span key={`e-${i}`} variants={wordVariant} className="inline-block mr-[0.3em]">
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              custom={0.8}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-base sm:text-lg text-slate-500 mb-8 max-w-lg leading-relaxed"
            >
              Devis, factures, chantiers, tr&eacute;sorerie — tout au m&ecirc;me endroit.
              L'outil con&ccedil;u par et pour les artisans du b&acirc;timent, qui vous fait gagner 2h par jour.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-8"
            >
              <button
                onClick={onSignup}
                className="group w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 relative overflow-hidden"
              >
                {/* Shimmer effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center gap-2">
                  Démarrer mon essai gratuit
                  <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
              <a
                href="#features"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
              >
                <Play size={16} className="text-orange-500" />
                Voir une d&eacute;mo
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              custom={1.2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap items-center gap-4 sm:gap-5 text-slate-500 text-xs"
            >
              {[
                { icon: CheckCircle, text: 'Gratuit pour d\u00e9marrer — sans carte bancaire', color: 'text-green-500' },
                { icon: Shield, text: 'Conforme facturation 2026', color: 'text-blue-500' },
                { icon: CheckCircle, text: 'Donn\u00e9es h\u00e9berg\u00e9es en France', color: 'text-green-500' },
              ].map((badge) => (
                <div key={badge.text} className="flex items-center gap-1.5">
                  <badge.icon size={14} className={badge.color} />
                  <span>{badge.text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — App mockup */}
          <div className="relative lg:pl-8">
            <HeroMockup className="w-full max-w-xl mx-auto lg:max-w-none" />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
