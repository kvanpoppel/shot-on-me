// PWA COMPLETELY DISABLED to prevent service worker cache issues causing hydration errors

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };
    return config;
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:5000/api',
    GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8',
    RENDER_SERVICE_ID: process.env.RENDER_SERVICE_ID || 'srv-d3i7318dl3ps73cvlv00',
  },
}

module.exports = nextConfig
