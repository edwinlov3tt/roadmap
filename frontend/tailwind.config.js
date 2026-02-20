/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        'base': '#1D1D21',
        'elevation': {
          '1': '#252529',
          '2': '#2D2D32',
          '3': '#35353B'
        },
        // Glass surface
        'glass': '#0B0D13CC',
        // Strokes
        'stroke': {
          'outer': '#35353B',
          'inner': 'rgba(255, 255, 255, 0.08)'
        },
        // Text colors
        'text': {
          'hi': '#F7F8FA',
          'muted': '#C7CBD1',
          'subtle': '#8B91A0'
        },
        // Accent (Ignite red)
        'accent': '#CF0E0F',
        // Semantic colors
        'success': '#21C37A',
        'warn': '#F6C244',
        'danger': '#FF5C5C',
        'info': '#5AA2FF'
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      },
      fontSize: {
        'display': ['2.25rem', '2.75rem'],
        'h1': ['1.75rem', '2.25rem'],
        'h2': ['1.5rem', '2rem'],
        'h3': ['1.25rem', '1.75rem'],
        'body': ['1rem', '1.6rem'],
        'small': ['0.875rem', '1.4rem'],
        'micro': ['0.75rem', '1.2rem']
      },
      borderRadius: {
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '24px'
      },
      backdropBlur: {
        'xl': '16px'
      },
      boxShadow: {
        'glass': '0 8px 24px rgba(0, 0, 0, 0.25)',
        'inner-highlight': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glow-accent': '0 0 12px var(--accent)',
        'glow-success': '0 0 6px currentColor'
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 1.4s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite'
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.06)', opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
}