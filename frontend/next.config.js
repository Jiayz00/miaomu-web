/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // 优化 barrel 文件导入（lucide-react / framer-motion / recharts 等）
  // 启用后 Next.js 会按需 tree-shake，减少首屏 JS bundle 体积
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
  images: {
    // 生产环境禁用 next/image 图片优化器：
    // 1. 服务器资源有限（1 核 CPU），Sharp 优化会消耗大量 CPU
    // 2. 上传图片由后端 Sharp 压缩后存储，已优化过一次
    // 3. 后端静态服务（/uploads/）通过 Caddy 直接代理，相对路径可正常访问
    // 4. 避免相对路径 /uploads/xxx.jpg 在 next/image 优化器中返回 400
    unoptimized: true,
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
