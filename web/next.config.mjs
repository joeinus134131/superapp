import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(configDir, '..'),
  async redirects() {
    return [
      ['/dashboard', '/'],
      ['/productivity/tasks', '/tasks'],
      ['/productivity/calendar', '/calendar'],
      ['/productivity/focus', '/pomodoro'],
      ['/life/habits', '/habits'],
      ['/life/goals', '/goals'],
      ['/life/journal', '/journal'],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  transpilePackages: ['@superapp/shared'],
  turbopack: {
    root: path.resolve(configDir, '..'),
  },
};

export default nextConfig;
