import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a3a2e',
          light: '#2d5a3d',
          dark: '#0f2820',
        },
        accent: {
          DEFAULT: '#c9a961',
          light: '#d9bd7a',
          dark: '#a8893f',
        },
        background: '#faf8f5',
        surface: '#ffffff',
        text: {
          // 对齐 WCAG AA：在 #faf8f5 背景上小文本对比度 ≥ 4.5:1
          DEFAULT: '#2c2c2c',
          light: '#5f5f5f',
          muted: '#6b6b6b',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'serif'],
        sans: ['var(--font-sans)', 'Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
        'slow-zoom': 'slowZoom 20s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        slowZoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
