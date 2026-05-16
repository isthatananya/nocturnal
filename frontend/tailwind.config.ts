import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral near-black surfaces — Apple-style
        midnight:     '#000000',
        'midnight-2': '#0a0a0a',
        'midnight-3': '#111111',
        surface: {
          DEFAULT: '#111111',
          raised:  '#1a1a1a',
          overlay: '#222222',
        },
        ink: {
          DEFAULT: '#f5f5f7',
          2: '#d2d2d7',
          3: '#86868b',
          4: '#6e6e73',
          5: '#48484a',
        },
        // Remap "indigo" to neutral white-range so existing classes still work
        indigo: {
          300: '#e5e5e7',
          400: '#ababab',
          500: '#f5f5f7',
          600: '#d2d2d7',
          700: '#a1a1a1',
        },
        // Remap violet → teal only for semantic status (PAN card)
        violet: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        tier: {
          none:   '#6e6e73',
          bronze: '#d97706',
          silver: '#94a3b8',
          gold:   '#eab308',
          prime:  '#f5f5f7',  // white for prime
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-xs': '0 0 10px rgba(255,255,255,0.06)',
        'glow-sm': '0 0 20px rgba(255,255,255,0.09)',
        'glow':    '0 0 36px rgba(255,255,255,0.12)',
        'glow-lg': '0 0 60px rgba(255,255,255,0.18)',
        'card':       '0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 16px rgba(0,0,0,0.6)',
        'card-hover': '0 1px 0 rgba(255,255,255,0.07) inset, 0 8px 32px rgba(0,0,0,0.7)',
        'lifted':     '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 56px rgba(0,0,0,0.7)',
        'menu':       '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 100%)',
        'shimmer': 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':    'shimmer 2.2s linear infinite',
        'float':      'float 6s ease-in-out infinite',
        'fade-in':    'fadeIn 0.5s ease-out both',
        'slide-up':   'slideUp 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both',
        'scale-in':   'scaleIn 0.4s cubic-bezier(0.25,0.46,0.45,0.94) both',
      },
      keyframes: {
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
