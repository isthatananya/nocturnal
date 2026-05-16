import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fey-aligned: cool neutral dark, no purple tint
        midnight:     '#09090c',
        'midnight-2': '#0d0d11',
        'midnight-3': '#111116',
        // surfaces as concrete dark layers (not just transparency)
        surface: {
          DEFAULT: '#111116',
          raised:  '#16161c',
          overlay: '#1a1a22',
        },
        // Zinc/slate text scale
        ink: {
          DEFAULT: '#ffffff',
          2: '#e4e4eb',
          3: '#a1a1aa',
          4: '#71717a',
          5: '#52525b',
          6: '#3f3f46',
        },
        indigo: {
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        tier: {
          none:   '#71717a',
          bronze: '#d97706',
          silver: '#94a3b8',
          gold:   '#eab308',
          prime:  '#6366f1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-xs': '0 0 10px rgba(99,102,241,0.18)',
        'glow-sm': '0 0 20px rgba(99,102,241,0.28)',
        'glow':    '0 0 36px rgba(99,102,241,0.4)',
        'glow-lg': '0 0 60px rgba(99,102,241,0.55)',
        // Card shadows more concrete — Fey uses real depth not just transparency
        'card':       '0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 16px rgba(0,0,0,0.5)',
        'card-hover': '0 1px 0 rgba(255,255,255,0.08) inset, 0 8px 32px rgba(0,0,0,0.6)',
        'lifted':     '0 1px 0 rgba(255,255,255,0.07) inset, 0 20px 56px rgba(0,0,0,0.65)',
        'menu':       '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(var(--tw-gradient-stops))',
        // Fey-style: subtle top radial glow, not full background
        'hero-glow': 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,102,241,0.13) 0%, transparent 100%)',
        'shimmer': 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.055) 50%, transparent 60%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite alternate',
        'shimmer':    'shimmer 2.2s linear infinite',
        'float':      'float 6s ease-in-out infinite',
        'fade-in':    'fadeIn 0.5s ease-out both',
        'slide-up':   'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':   'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        glowPulse: {
          '0%':   { boxShadow: '0 0 16px rgba(99,102,241,0.2)' },
          '100%': { boxShadow: '0 0 44px rgba(99,102,241,0.6)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
