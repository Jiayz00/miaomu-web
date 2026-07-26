import type { Config } from 'tailwindcss';

/**
 * 盆景艺术 · Tailwind 主题配置 v2
 *
 * 设计原则：
 * - 保留旧 token（primary/accent/background/surface/text）确保向后兼容
 * - 新增 ink/gold/paper 全色阶映射设计稿 --penjing-* 变量
 * - 新增 shadow/border/radius/spacing/animation 全套设计系统
 * - 不升级到 Tailwind v4，通过 theme.extend 手动映射
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ===== 旧色名（向后兼容，等价于新 ink/gold） =====
        primary: {
          DEFAULT: 'var(--penjing-ink)',
          light: 'var(--penjing-ink-mid)',
          dark: 'var(--penjing-ink-deepest)',
        },
        accent: {
          DEFAULT: 'var(--penjing-gold)',
          light: 'var(--penjing-gold-bright)',
          dark: 'var(--penjing-gold-deep)',
        },
        background: 'var(--penjing-paper)',
        surface: '#ffffff',
        text: {
          DEFAULT: 'var(--penjing-ink-text)',
          light: 'var(--penjing-ink-text-secondary)',
          muted: 'var(--penjing-ink-text-muted)',
        },

        // ===== 新色名：墨色阶（品牌主色） =====
        ink: {
          deepest: 'var(--penjing-ink-deepest)',
          deep: 'var(--penjing-ink-deep)',
          DEFAULT: 'var(--penjing-ink)',
          mid: 'var(--penjing-ink-mid)',
          soft: 'var(--penjing-ink-soft)',
          tint: 'var(--penjing-ink-tint)',
        },

        // ===== 新色名：金色阶（品牌装饰色） =====
        gold: {
          bright: 'var(--penjing-gold-bright)',
          DEFAULT: 'var(--penjing-gold)',
          deep: 'var(--penjing-gold-deep)',
          muted: 'var(--penjing-gold-muted)',
        },

        // ===== 新色名：宣纸色阶（中性/表面） =====
        paper: {
          DEFAULT: 'var(--penjing-paper)',
          warm: 'var(--penjing-paper-warm)',
          aged: 'var(--penjing-paper-aged)',
          deep: 'var(--penjing-paper-deep)',
        },

        // ===== 新色名：文字色（基于墨色阶派生） =====
        inkText: {
          DEFAULT: 'var(--penjing-ink-text)',
          secondary: 'var(--penjing-ink-text-secondary)',
          muted: 'var(--penjing-ink-text-muted)',
          faint: 'var(--penjing-ink-text-faint)',
        },

        // ===== 新色名：状态色（仅用于语义状态） =====
        state: {
          success: 'var(--penjing-state-success)',
          warning: 'var(--penjing-state-warning)',
          error: 'var(--penjing-state-error)',
          info: 'var(--penjing-state-info)',
        },

        // ===== shadcn/ui 语义别名（为后续接入做准备） =====
        penjing: {
          background: 'var(--penjing-background)',
          foreground: 'var(--penjing-foreground)',
          card: 'var(--penjing-card)',
          'card-foreground': 'var(--penjing-card-foreground)',
          popover: 'var(--penjing-popover)',
          'popover-foreground': 'var(--penjing-popover-foreground)',
          primary: 'var(--penjing-primary)',
          'primary-foreground': 'var(--penjing-primary-foreground)',
          secondary: 'var(--penjing-secondary)',
          'secondary-foreground': 'var(--penjing-secondary-foreground)',
          muted: 'var(--penjing-muted)',
          'muted-foreground': 'var(--penjing-muted-foreground)',
          accent: 'var(--penjing-accent)',
          'accent-foreground': 'var(--penjing-accent-foreground)',
          destructive: 'var(--penjing-destructive)',
          'destructive-foreground': 'var(--penjing-destructive-foreground)',
          border: 'var(--penjing-border)',
          input: 'var(--penjing-input)',
          ring: 'var(--penjing-ring)',
        },
      },

      fontFamily: {
        serif: ['var(--penjing-font-serif)', 'Cormorant Garamond', 'serif'],
        'serif-latin': ['var(--penjing-font-serif-latin)', 'Times New Roman', 'serif'],
        sans: ['var(--penjing-font-sans)', 'Noto Sans SC', 'sans-serif'],
      },

      // ===== 间距（8pt 网格，扩展 Tailwind 默认） =====
      spacing: {
        'penjing-1': 'var(--penjing-space-1)',
        'penjing-2': 'var(--penjing-space-2)',
        'penjing-3': 'var(--penjing-space-3)',
        'penjing-4': 'var(--penjing-space-4)',
        'penjing-5': 'var(--penjing-space-5)',
        'penjing-6': 'var(--penjing-space-6)',
        'penjing-7': 'var(--penjing-space-7)',
        'penjing-8': 'var(--penjing-space-8)',
        'penjing-9': 'var(--penjing-space-9)',
      },

      // ===== 圆角（克制，最大 8px） =====
      borderRadius: {
        'penjing-sm': 'var(--penjing-radius-sm)',
        'penjing-md': 'var(--penjing-radius-md)',
        'penjing-lg': 'var(--penjing-radius-lg)',
        'penjing-full': 'var(--penjing-radius-full)',
      },

      // ===== 阴影（4 级基础 + 金色装饰 + 抽屉专用） =====
      boxShadow: {
        'penjing-static': 'var(--penjing-shadow-static)',
        'penjing-hover': 'var(--penjing-shadow-hover)',
        'penjing-float': 'var(--penjing-shadow-float)',
        'penjing-overlay': 'var(--penjing-shadow-overlay)',
        'penjing-gold': 'var(--penjing-shadow-gold)',
        'penjing-gold-strong': 'var(--penjing-shadow-gold-strong)',
        'penjing-gold-glow': 'var(--penjing-shadow-gold-glow)',
        'penjing-drawer': 'var(--penjing-shadow-drawer)',
      },

      // ===== 过渡曲线（3 条专属） =====
      transitionTimingFunction: {
        'penjing-soft': 'var(--penjing-ease-soft)',
        'penjing-enter': 'var(--penjing-ease-enter)',
        'penjing-route': 'var(--penjing-ease-route)',
      },

      // ===== 边框颜色（4 级半透明） =====
      borderColor: {
        'penjing-hairline': 'var(--penjing-border-hairline)',
        'penjing-fine': 'var(--penjing-border-fine)',
        'penjing-strong': 'var(--penjing-border-strong)',
        'penjing-gold': 'var(--penjing-border-gold)',
      },

      // ===== 背景图片（纹理） =====
      backgroundImage: {
        'texture-paper':
          'radial-gradient(circle at 25% 25%, rgba(201, 169, 97, 0.015) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(26, 58, 46, 0.015) 1px, transparent 1px)',
        'texture-ink':
          'radial-gradient(circle at 20% 30%, rgba(201, 169, 97, 0.03) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(45, 90, 61, 0.04) 1px, transparent 1px)',
      },

      // ===== 字号（与设计稿排版工具类对齐） =====
      fontSize: {
        'display-hero': ['clamp(48px, 8vw, 96px)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-section': ['clamp(32px, 4vw, 56px)', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-card': ['clamp(20px, 1.6vw, 24px)', { lineHeight: '1.3', letterSpacing: '-0.005em' }],
        'eyebrow-label': ['11px', { lineHeight: '1', letterSpacing: '0.3em' }],
        'catalog-number': ['11px', { lineHeight: '1', letterSpacing: '0.25em' }],
        'body-large': ['18px', { lineHeight: '1.7' }],
        'body-base': ['15px', { lineHeight: '1.7' }],
        'body-caption': ['13px', { lineHeight: '1.55' }],
      },

      // ===== 字距（精细控制） =====
      letterSpacing: {
        'penjing-tight': '-0.02em',
        'penjing-tight-soft': '-0.015em',
        'penjing-tight-micro': '-0.005em',
        'penjing-wide': '0.2em',
        'penjing-wide-strong': '0.25em',
        'penjing-wide-max': '0.3em',
      },

      // ===== 动画（6 个关键帧 + 旧的 fade-in/breathe/slow-zoom） =====
      animation: {
        // 旧动画（向后兼容）
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
        'slow-zoom': 'slowZoom 20s ease-in-out infinite alternate',

        // 新动画（与设计稿一致）
        'ink-spread': 'ink-spread 1s var(--penjing-ease-soft) forwards',
        'scroll-reveal': 'scroll-reveal 1.2s var(--penjing-ease-soft) forwards',
        'branch-grow': 'branch-grow 0.8s var(--penjing-ease-soft) forwards',
        'fade-in-up-penjing': 'fade-in-up 0.8s var(--penjing-ease-soft) forwards',
        'breathe-penjing': 'breathe 2.4s var(--penjing-ease-soft) infinite',
        'slow-zoom-penjing': 'slow-zoom 20s ease-in-out infinite alternate',
      },

      keyframes: {
        // 旧关键帧（向后兼容）
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slowZoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.1)' },
        },

        // 新关键帧（与设计稿一致）
        'ink-spread': {
          '0%': { opacity: '0', filter: 'blur(8px)', transform: 'scale(0.98)' },
          '100%': { opacity: '1', filter: 'blur(0)', transform: 'scale(1)' },
        },
        'scroll-reveal': {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        'branch-grow': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        'slow-zoom': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' },
        },
      },

      // ===== 大屏断点（设计稿使用 1440/1920） =====
      screens: {
        'xl-1440': '1440px',
        'xl-1600': '1600px',
        'xl-1920': '1920px',
      },
    },
  },
  plugins: [],
};

export default config;
