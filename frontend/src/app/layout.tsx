import type { Metadata } from "next";
import { SessionProvider } from "@/modules/accounts/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Peluit",
  description: "Skor, statistik, dan open play olahraga",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
