/** @type {import('tailwindcss').Config} */
// Couleur lue dans une variable CSS « r g b » : l'opacité Tailwind fonctionne (bg-accent/10).
const v = (nom) => `rgb(var(${nom}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Thème par rôle (src/styles/theme.css, posé sur <html> par App.jsx) — refonte du 9 oct. 2026.
        // Une seule palette neutre ; l'accent vient de la couleur de l'entreprise.
        fond: v('--fond'),
        surface: v('--surface'),
        'surface-2': v('--surface-2'),
        bord: v('--bord'),
        'bord-fort': v('--bord-fort'),
        encre: v('--encre'),
        'encre-2': v('--encre-2'),
        'encre-3': v('--encre-3'),
        accent: v('--accent'),
        'accent-texte': v('--accent-texte'),
        'sur-accent': v('--sur-accent'),
        // Tons : bg-succes-fond text-succes-texte, bg-danger-point… (un statut = un ton, src/lib/statuts.js)
        neutre: { fond: v('--neutre-fond'), texte: v('--neutre-texte'), point: v('--neutre-point') },
        info: { fond: v('--info-fond'), texte: v('--info-texte'), point: v('--info-point') },
        succes: { fond: v('--succes-fond'), texte: v('--succes-texte'), point: v('--succes-point') },
        alerte: { fond: v('--alerte-fond'), texte: v('--alerte-texte'), point: v('--alerte-point') },
        // Primary - Orange BTP (brand color)
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Success - Green for positive margins/profits
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Warning - Amber for alerts
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Danger - Red for errors/overdue
        danger: {
          fond: v('--danger-fond'),
          texte: v('--danger-texte'),
          point: v('--danger-point'),
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      screens: {
        'xs': '400px',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      spacing: {
        '11': '2.75rem', // 44px - touch target
        '13': '3.25rem',
        '15': '3.75rem',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
        'strong': '0 8px 24px -8px rgba(0, 0, 0, 0.15)',
        'glow-primary': '0 0 20px rgba(249, 115, 22, 0.3)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.3)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        // Trois élévations seulement : posé (cartes), flottant (menus, barres), modal.
        'e1': 'var(--e1)',
        'e2': 'var(--e2)',
        'e3': 'var(--e3)',
      },
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
