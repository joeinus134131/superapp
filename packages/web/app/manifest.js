export default function manifest() {
  return {
    name: 'SuperApp — Personal Management',
    short_name: 'SuperApp',
    description: 'All-in-one personal management platform for tasks, habits, finance, health, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a1a',
    theme_color: '#8b5cf6',
    orientation: 'portrait-primary',
    categories: ['productivity', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/icon-192.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
