/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Theme Colors
        primary: {
          DEFAULT: '#ff6b35', // Vibrant Orange
          light: '#ff8c42',
          dark: '#e55a2b',
        },
        secondary: {
          DEFAULT: '#4ecdc4', // Teal
          light: '#6ee7df',
          dark: '#3db8b0',
        },
        // Background Colors
        darkbg: {
          DEFAULT: '#0a0a0a', // Primary Black
          secondary: '#111111',
          tertiary: '#1a1a1a',
          card: '#1e1e1e',
          cardHover: '#252525',
        },
        // Accent Colors
        success: '#00d4aa',
        warning: '#ffa726',
        danger: '#ff4757',
        info: '#3742fa',
        // Text Colors
        text: {
          primary: '#ffffff',
          secondary: '#b0b0b0',
          muted: '#808080',
        },
        // Border Colors
        border: {
          DEFAULT: '#333333',
          hover: '#444444',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'display': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-lg': '0 0 40px rgba(255, 107, 53, 0.4)',
        'dark': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'dark-lg': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}

