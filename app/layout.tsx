import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ThemeProvider } from "@/components/ThemeProvider";

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

import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import TokenMarquee from "@/components/TokenMarquee";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <ThemeProvider>
          {/* ── Token Marquee ────────────────────────── */}
          <TokenMarquee />

          {/* ── Navbar ───────────────────────────────── */}
          <nav className="fixed top-9 left-0 right-0 z-50" style={{ background: "var(--bg-primary)" }}>
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
              <a href="/" className="flex items-center gap-2 font-semibold text-lg shrink-0">
                <Image src="/nosey.png" height={100} width={100} alt="" className="rounded-xl w-6 h-6" />
                <span className="gradient-text">FeeSniff</span>
              </a>
              <div className="flex items-center gap-4">
                <ThemeToggle />
              </div>
            </div>
          </nav>

          {/* ── Main content (offset for fixed nav) ── */}
          <main className="min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
