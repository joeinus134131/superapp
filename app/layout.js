import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "SuperApp — Personal Management Platform",
  description: "All-in-one platform untuk mengelola tugas, kebiasaan, keuangan, jurnal, kesehatan, dan lebih banyak lagi. Tingkatkan produktivitas dan value diri Anda.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
