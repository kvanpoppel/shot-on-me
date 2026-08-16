// PWA enabled with network-first service worker (no stale-cache hydration issues)

const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
// CSP is set dynamically in middleware.ts (nonce-based, no unsafe-inline/unsafe-eval).
// Only non-CSP security headers live here.
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
]

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };
    return config;
  },
}

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
})
