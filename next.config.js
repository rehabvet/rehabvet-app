/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Treat these as external packages in server components (Next.js 14 syntax)
    serverComponentsExternalPackages: ['pdf-parse', '@react-pdf/renderer'],
  },
}
module.exports = nextConfig
