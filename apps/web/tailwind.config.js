/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nordic-inspired color palette
        primary: '#3B82F6', // Blue
        positive: '#10B981', // Green
        negative: '#EF4444', // Red
        warning: '#F59E0B', // Yellow
        surface: '#F9FAFB', // Light gray
        'text-primary': '#111827', // Almost black
        'text-secondary': '#6B7280', // Medium gray
        border: '#E5E7EB', // Light gray
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
