/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jx3-gold': '#d4af37',
        'jx3-ink': '#1a1a1a',
        'jx3-paper': '#f2e6d9',
        'jx3-jade': '#00a86b',
        'jx3-vermilion': '#e34234',
        'jx3-wood': '#5d4037',
      },
      fontFamily: {
        'pixel': ['"Fusion Pixel Font"', '"DotGothic16"', '"Zpix"', '"Press Start 2P"', 'monospace'],
      },
      // 像素圆角约定
      borderRadius: {
        'pixel-sm': '2px',
        'pixel-md': '4px',
        'pixel-lg': '8px',
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
        'pixel-gold': '4px 4px 0px 0px #d4af37',
        'pixel-hover': '6px 6px 0px 0px rgba(0, 0, 0, 1)',
      },
      keyframes: {
        'pixel-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pixel-blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        }
      },
      animation: {
        'pixel-float': 'pixel-float 2s ease-in-out infinite',
        'pixel-blink': 'pixel-blink 0.8s steps(2, start) infinite',
      }
    },
  },
  plugins: [],
}
