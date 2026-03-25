/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ResiHub brand palette
        'rh-cyan': {
          DEFAULT: '#00CCCC',
          50:  '#e6ffff',
          100: '#ccffff',
          200: '#99ffff',
          300: '#66ffff',
          400: '#33ffff',
          500: '#00CCCC',
          600: '#009999',
          700: '#006666',
          800: '#003333',
          900: '#001a1a',
        },
        'rh-rose': {
          DEFAULT: '#E8197A',
          50:  '#fde8f2',
          100: '#fbd1e5',
          200: '#f7a3cb',
          300: '#f375b1',
          400: '#ef4797',
          500: '#E8197A',
          600: '#ba1462',
          700: '#8c0f49',
          800: '#5d0a31',
          900: '#2f0518',
        },
        // Dark theme surfaces
        'rh-bg':      '#0f0f12',
        'rh-bg2':     '#16161b',
        'rh-bg3':     '#1e1e26',
        'rh-surface': '#16161b',
        'rh-dark':    '#0f0f12',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
      },
    },
  },
  plugins: [],
};
