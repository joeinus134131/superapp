/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@superapp/shared'],
  experimental: {
    turbopack: {
      root: '../../',
    },
  },
};

export default nextConfig;
