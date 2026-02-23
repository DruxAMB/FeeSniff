import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import TokenMarquee from "@/components/TokenMarquee";
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
  title: "TokenSniff — See how much token creators earn in fees",
  description:
    "Paste any token contract address and instantly see the buy/sell, fee wallets, and total fees the creator has earned.",
  keywords: ["token fees", "crypto tax", "fee tracker", "base", "dex", "token analyzer"],
  openGraph: {
    title: "TokenSniff — Token Fee Tracker",
    description: "See how much token creators earn in fees. Paste a contract address to start.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "tokenSniff Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TokenSniff — Token Fee Tracker",
    description: "See how much token creators earn in fees. Paste a contract address to start.",
    images: ["/og-image.png"],
  },
};

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
          <nav className="fixed top-9 left-0 right-0 z-50 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
              <a href="/" className="flex items-center gap-2 font-semibold text-lg shrink-0">
                <Image src="/nosey.png" height={100} width={100} alt="" className="rounded-xl w-6 h-6" />
                <span className="gradient-text">tokenSniff</span>
              </a>
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/tokensniff"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors opacity-60 hover:opacity-100"
                  aria-label="Follow TokenSniff on X"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-current"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <ThemeToggle />
              </div>
            </div>
          </nav>

          <main className="min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
