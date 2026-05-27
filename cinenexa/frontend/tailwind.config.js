/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CineNexa brand palette
        brand: {
          50:  '#fff1f0',
          100: '#ffe0dc',
          200: '#ffc5bf',
          300: '#ff9f96',
          400: '#ff6b5f',
          500: '#f03f30',   // primary red (Netflix-inspired but distinct)
          600: '#dd2315',
          700: '#b81a0e',
          800: '#981910',
          900: '#7c1b12',
          950: '#440a07',
        },
        surface: {
          50:  '#f7f7f8',
          100: '#ededef',
          200: '#d3d3d8',
          300: '#adadb5',
          400: '#81818d',
          500: '#666672',
          600: '#545460',
          700: '#46464f',
          800: '#3d3d44',  // card bg
          900: '#27272c',  // section bg
          950: '#141417',  // page bg dark
        },
        gold: {
          400: '#f5c518',  // IMDb-inspired rating gold
          500: '#e6b800',
        }
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(to right, rgba(0,0,0,0.95) 30%, rgba(0,0,0,0.5) 60%, transparent 100%)',
        'card-gradient': 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0,0,0,0.5)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.7)',
        'glow': '0 0 20px rgba(240,63,48,0.4)',
        'glow-sm': '0 0 10px rgba(240,63,48,0.3)',
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
}
