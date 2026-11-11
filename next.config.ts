import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/e-risk',

  // assetPrefix: '/digitalplan',
  trailingSlash: true,

  // No framing anywhere: stops clickjacking of the OAuth consent and action-confirm pages.
  headers: async () => [
    {
      source: '/((?!api/files/).*)', // /api/files sets its own stricter CSP (sandbox)
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }
      ]
    }
  ],

  // The login page is archived (docs/archive/login). Sign-in is ERP OAuth from the profile menu only.
  redirects: async () => [
    {
      source: '/login',
      destination: '/',
      permanent: false
    }
  ]
}

export default nextConfig
