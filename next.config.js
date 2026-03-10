/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  // Increase body size limit for PDF uploads (default is 4MB which may be too small for large PDFs)
  serverExternalPackages: ['pdf-parse'],
}
module.exports = nextConfig
