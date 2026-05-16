import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#05050f',
        'midnight-alt': '#08081a',
        surface: {
          DEFAULT: 'rgba(255,255,255,0.03)',
          raised: 'rgba(255,255,255,0.05)',
          overlay: 'rgba(255,255,255,0.08)',
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
          none:   '#64748b',
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
        'card':    '0 2px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.09)',
        'lifted': '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%)',
        'shimmer': 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.065) 50%, transparent 60%)',
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
