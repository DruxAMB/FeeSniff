import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Dog } from "lucide-react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FeeSniff — See how much token creators earn in fees",
  description:
    "Paste any token contract address and instantly see the buy/sell tax rates, fee wallets, and total fees the creator has earned.",
  keywords: ["token fees", "crypto tax", "fee tracker", "base", "dex", "token analyzer"],
  openGraph: {
    title: "FeeSniff — Token Fee Tracker",
    description: "See how much token creators earn in fees. Paste a contract address to start.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        {/* ── Navbar ───────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-50">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-semibold text-lg">
              <Dog className="h-6 w-6" style={{ color: "var(--accent-primary)" }} />
              <span className="gradient-text">FeeSniff</span>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors hover:text-text-secondary"
              style={{ color: "var(--text-muted)" }}
            >
              GitHub
            </a>
          </div>
        </nav>

        {/* ── Main content (offset for fixed nav) ── */}
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
