import type { NextConfig } from 'next'
import { withContentlayer } from 'next-contentlayer2'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Turbopack kompatibilní konfigurace
  turbopack: {},
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '4rap.cz' },
    ],
  },
  compress: true,
  trailingSlash: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default withContentlayer(nextConfig)
