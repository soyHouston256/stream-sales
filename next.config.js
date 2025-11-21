/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  images: {
    domains: [
      'streams-laboratory.s3.sa-east-1.amazonaws.com',
      'stream-sales-dev-images-336912793236.s3.us-east-1.amazonaws.com',
      'vortex-streaming.com',
      'imgur.com',
      'i.imgur.com',
      'localhost',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
  },
}

module.exports = nextConfig
