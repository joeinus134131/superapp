import "./globals.css";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata = {
  title: "SelfOne — Personal Management Platform",
  description: "All-in-one platform untuk mengelola tugas, kebiasaan, keuangan, jurnal, kesehatan, dan lebih banyak lagi. Tingkatkan produktivitas dan value diri Anda bersama SelfOne.",
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning={true}>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
