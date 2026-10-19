/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Luxury palette — deep onyx + champagne gold
        ink: {
          50: '#f6f6f7',
          100: '#e9e9ec',
          200: '#d4d5db',
          300: '#b8bac4',
          400: '#9498a6',
          500: '#74788a',
          600: '#484b58',
          700: '#393b47',
          800: '#262832',
          900: '#16171d',
          950: '#0b0c10',
        },
        gold: {
          50: '#fdf9ec',
          100: '#faf0cb',
          200: '#f5df92',
          300: '#efc85a',
          400: '#e9b133',
          500: '#d9941c',
          600: '#bc7215',
          700: '#965316',
          800: '#7c4219',
          900: '#683819',
          950: '#3d1d09',
        },
        accent: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        success: '#16a34a',
        warning: '#eab308',
        danger: '#dc2626',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(8, 8, 16, 0.37)',
        'glass-lg': '0 22px 60px -12px rgba(8, 8, 16, 0.55)',
        'gold-glow': '0 0 0 1px rgba(233,177,51,0.4), 0 12px 40px -8px rgba(233,177,51,0.45)',
        'inner-glass': 'inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 -1px 0 0 rgba(0,0,0,0.4)',
        'raised': '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 18px -6px rgba(0,0,0,0.6), 0 2px 4px -2px rgba(0,0,0,0.5)',
        'raised-lg': '0 1px 0 rgba(255,255,255,0.08) inset, 0 20px 40px -10px rgba(0,0,0,0.7), 0 6px 10px -4px rgba(0,0,0,0.6)',
        'press': 'inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'glass-radial':
          'radial-gradient(1200px 600px at 20% -10%, rgba(233,177,51,0.12), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(20,184,166,0.10), transparent 55%), linear-gradient(180deg, #0b0c10 0%, #16171d 100%)',
        'gold-sheen':
          'linear-gradient(135deg, #f5df92 0%, #e9b133 40%, #bc7215 100%)',
        'glass-panel':
          'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: {
        xs: '3px',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
      },
    },
  },
  plugins: [],
};
