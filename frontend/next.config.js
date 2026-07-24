/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // 优化 barrel 文件导入（lucide-react / framer-motion / recharts 等）
  // 启用后 Next.js 会按需 tree-shake，减少首屏 JS bundle 体积
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
  images: {
    // 安全：仅允许已知图片域名，防止 SSRF 与防盗链绕过
    // - 后端域名（用户上传的盆景图、头像）
    // - Unsplash（种子数据占位图）
    // 生产部署时通过环境变量 NEXT_PUBLIC_IMAGE_DOMAINS 注入真实后端域名
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
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
    // 生产环境 apiUrl 为相对路径（/api/v1），由 Nginx 代理，无需 Next.js rewrite
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
    ];
  },
};

module.exports = nextConfig;
