import "./globals.css";
import "./whenya.css";
import "./login.css";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata = {
  title: "Whenya — Your Life, In Sync.",
  description: "A personal space to plan your day, record what matters, and understand your progress.",
  icons: {
    icon: '/favicon.png',
    apple: '/whenya-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body suppressHydrationWarning={true}>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
