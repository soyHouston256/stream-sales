/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com', // AWS S3 buckets
      },
      {
        protocol: 'https',
        hostname: 'vortex-streaming.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com', // Cloudinary CDN
      },
      {
        protocol: 'https',
        hostname: 'imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
}

module.exports = nextConfig
