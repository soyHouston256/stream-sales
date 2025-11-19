/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // SECURITY: Additional security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Download-Options',
            value: 'noopen'
          },
        ],
      },
    ];
  },

  // SECURITY: Disable x-powered-by header to hide Next.js
  poweredByHeader: false,
}

module.exports = nextConfig
