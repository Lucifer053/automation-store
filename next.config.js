/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
  experimental: {
    // pdfkit reads its bundled data files via __dirname, so it must not be bundled
    serverComponentsExternalPackages: ['pdfkit'],
    // ship the Thai fonts with the PDF route (read from disk at runtime)
    outputFileTracingIncludes: {
      '/api/orders/[id]/pdf': ['./assets/fonts/**'],
    },
  },
}

module.exports = nextConfig
