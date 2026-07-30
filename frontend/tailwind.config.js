/** @type {import('tailwindcss').Config} */

// Colors are declared as raw channel triplets in index.css so that Tailwind's
// opacity modifiers (bg-surface/60) keep working through the CSS variables.
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // The toggle stamps data-theme on <html>; prefers-color-scheme is handled in CSS.
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Grounds and surfaces
        paper: token('--paper'),
        surface: token('--surface'),
        subtle: token('--subtle'),
        rule: token('--rule'),

        // Text
        ink: token('--ink'),
        'ink-soft': token('--ink-soft'),
        muted: token('--muted'),
        faint: token('--faint'),

        // Accent: petrol. Cool and desaturated against the warm neutrals.
        primary: {
          50: token('--primary-50'),
          100: token('--primary-100'),
          200: token('--primary-200'),
          300: token('--primary-300'),
          400: token('--primary-400'),
          500: token('--primary-500'),
          600: token('--primary-600'),
          700: token('--primary-700'),
          800: token('--primary-800'),
          900: token('--primary-900'),
        },

        // Semantic state, deliberately not the accent hue.
        ready: token('--ready'),
        'ready-bg': token('--ready-bg'),
        warn: token('--warn'),
        'warn-bg': token('--warn-bg'),
        danger: token('--danger'),
        'danger-bg': token('--danger-bg'),
      },

      fontFamily: {
        sans: ['"Instrument Sans Variable"', '"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      // A tight scale, held to throughout. Line heights are paired, not default.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em' }],
        xl: ['1.375rem', { lineHeight: '1.875rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
        '3xl': ['2.125rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
      },

      borderRadius: {
        DEFAULT: '5px',
        md: '6px',
        lg: '8px',
      },

      // Hairlines carry separation instead of shadows.
      borderWidth: {
        DEFAULT: '1px',
      },

      maxWidth: {
        content: '70rem',
        prose: '65ch',
      },

      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
