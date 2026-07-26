/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // 优化 barrel 文件导入（lucide-react / framer-motion / recharts 等）
  // 启用后 Next.js 会按需 tree-shake，减少首屏 JS bundle 体积
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
  images: {
    // 当前策略：unoptimized=true
    // - 服务器仅 1 核 CPU，开启 Next.js 内置 Sharp 优化器会显著消耗算力
    // - 后端 upload.service.ts 已用 Sharp 将图片压缩为 1200px/80 质量 JPEG，
    //   再由 Caddy 直接代理 /uploads/，因此前端直接用原图即可
    // - 若未来接入 CDN 或升级服务器，可将 unoptimized 改为 false 并配置 loader
    unoptimized: true,
    // 预置 sizes，确保各组件 `sizes` 属性与设备像素密度对齐
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 默认格式：为将来启用优化器时优先使用 webp 做准备
    formats: ['image/webp'],
    // 安全：仅允许已知图片域名，防止 SSRF 与防盗链绕过
    // - 后端域名（用户上传的盆景图、头像）
    // - picsum.photos（种子数据占位图，绕开 ORB）
    // 生产部署时通过环境变量 NEXT_PUBLIC_IMAGE_DOMAINS 注入真实后端域名
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'http', hostname: 'localhost' },
      // 通过环境变量扩展（逗号分隔），生产环境注入实际域名
      ...(process.env.NEXT_PUBLIC_IMAGE_DOMAINS
        ? process.env.NEXT_PUBLIC_IMAGE_DOMAINS.split(',').map((d) => {
            const trimmed = d.trim();
            // 支持 protocol://hostname 格式
            const match = trimmed.match(/^(https?):\/\/(.+)$/);
            if (match) {
              return { protocol: match[1], hostname: match[2] };
            }
            return { protocol: 'https', hostname: trimmed };
          })
        : []),
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    // 生产环境 apiUrl 为相对路径（/api/v1），由 Caddy/Nginx 代理，无需 Next.js rewrite
    // 仅开发环境（apiUrl 为绝对 URL）时启用 rewrite，避免生产环境自重写循环
    if (!apiUrl.startsWith('http')) {
      return [];
    }
    const backendUrl = apiUrl.replace('/api/v1', '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      // 开发环境：将 /uploads/ 静态资源代理到后端（后端 express.static 服务）
      // 生产环境由 Caddy/Nginx 直接代理 /uploads/ 到后端，不经过 Next.js
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      // 开发环境：WebSocket 代理由 next.config.js 无法实现，需在客户端指定 NEXT_PUBLIC_SOCKET_URL
      // 生产环境 Caddy 代理 /socket.io/ 到后端
    ];
  },
};

module.exports = nextConfig;
