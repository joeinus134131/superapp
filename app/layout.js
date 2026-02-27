import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "SuperApp — Personal Management Platform",
  description: "All-in-one platform untuk mengelola tugas, kebiasaan, keuangan, jurnal, kesehatan, dan lebih banyak lagi. Tingkatkan produktivitas dan value diri Anda.",
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning={true}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
