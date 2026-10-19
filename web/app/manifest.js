export default function manifest() {
  return {
    name: 'Whenya — Your Life, In Sync.',
    short_name: 'Whenya',
    description: 'All-in-one personal management platform for tasks, habits, finance, health, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F4EC',
    theme_color: '#193F30',
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
