// GitHub Pages serves the site from /<repo>/ as plain static files. The Pages workflow
// sets PAGES_BASE_PATH (e.g. "/eggy-chess"); local `npm run dev` leaves it unset.
const basePath = process.env.PAGES_BASE_PATH || ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: basePath ? 'export' : undefined,
  basePath,
  trailingSlash: !!basePath,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
