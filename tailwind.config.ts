import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        // Brand - Medical teal palette
        brand: {
          900: '#0B3D3A',
          700: '#0F5C57',
          500: '#1A8A82',
          300: '#5BBFB8',
          100: '#D0F0EE',
          50: '#F0FAFA',
        },
        // Status - Semantic colors
        status: {
          critical: '#C0392B',
          warning: '#E67E22',
          stable: '#27AE60',
          pending: '#8E44AD',
          neutral: '#7F8C8D',
        },
        // Surface
        surface: {
          page: '#F4F6F8',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
          sunken: '#EAECEF',
        },
        // Text
        text: {
          primary: '#1A1D21',
          secondary: '#4A5568',
          tertiary: '#718096',
          disabled: '#A0AEC0',
          inverse: '#FFFFFF',
        },
        // Border
        border: {
          subtle: 'rgba(0,0,0,0.06)',
          DEFAULT: 'rgba(0,0,0,0.12)',
          strong: 'rgba(0,0,0,0.24)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', '1rem'],
        sm: ['0.875rem', '1.25rem'],
        base: ['1rem', '1.5rem'],
        lg: ['1.125rem', '1.75rem'],
        xl: ['1.25rem', '1.75rem'],
        '2xl': ['1.5rem', '2rem'],
        '3xl': ['1.875rem', '2.25rem'],
        '4xl': ['2.25rem', '2.5rem'],
      },
      fontWeight: {
        '450': '450',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      boxShadow: {
        '0': 'none',
        '1': '0 1px 2px rgba(0,0,0,0.05)',
        '2': '0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
        '3': '0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)',
        luxury: '0 1px 2px rgba(0,0,0,0.05)',
        'luxury-lg': '0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
      },
      backgroundImage: {
        'gradient-dashboard': 'linear-gradient(135deg, #1A8A82 0%, #0B3D3A 100%)',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgba(230, 126, 34, 0.5)' },
          '50%': { borderColor: 'rgba(230, 126, 34, 0.8)' },
        },
      },
      animation: {
        'pulse-border': 'pulse-border 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
// AGENT: Design system from master prompt - healthcare-grade palette, not generic SaaS
