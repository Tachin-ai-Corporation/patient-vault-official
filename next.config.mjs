/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/terms',
        destination: 'https://www.tachin.ai/terms',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: 'https://www.tachin.ai/privacy',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
