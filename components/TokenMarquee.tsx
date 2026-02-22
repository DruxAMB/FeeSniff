"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TokenData {
    symbol: string;
    marketCap: string;
    buyLink: string;
}

export default function TokenMarquee() {
    const [tokenData, setTokenData] = useState<TokenData>({
        symbol: "$NOSEY",
        marketCap: "...",
        buyLink: "#"
    });

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await fetch("/api/token");
                const data = await res.json();
                setTokenData({
                    symbol: data.symbol || "$NOSEY",
                    marketCap: data.marketCap || "...",
                    buyLink: data.buyLink || "#"
                });
            } catch (error) {
                console.error("Failed to fetch token data:", error);
            }
        };

        fetchToken();
        const interval = setInterval(fetchToken, 60000);
        return () => clearInterval(interval);
    }, []);

    const content = (
        <div className="flex items-center gap-10 text-xs font-bold whitespace-nowrap px-4">
            <span className="flex items-center gap-2">
                <span className="text-sm">👃🏽</span>
                <span style={{ color: "var(--text-primary)" }}>{tokenData.symbol}</span>
            </span>

            <span className="flex items-center gap-2">
                <span style={{ color: "var(--text-muted)" }} className="opacity-60">MCap:</span>
                <span className="text-green-400">{tokenData.marketCap}</span>
            </span>

            <a
                href={tokenData.buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-(--accent-primary)/10 border border-(--accent-primary)/20 px-3 py-1 rounded-full hover:bg-(--accent-primary)/20 transition-all active:scale-95"
            >
                <span className="text-[10px]">🛒</span>
                <span className="gradient-text font-black tracking-tighter uppercase text-[10px]">Buy Now</span>
            </a>

            <span style={{ color: "var(--border-subtle)" }} className="opacity-30">•</span>
        </div>
    );

    const launchContent = (
        <div className="flex items-center gap-10 text-[10px] font-bold whitespace-nowrap px-4">
            <span className="flex items-center gap-2 uppercase tracking-wider">
                <span className="animate-pulse">👃🏽</span>
                <span className="gradient-text font-black">$SNIFF LAUNCH:</span>
                <span style={{ color: "var(--text-secondary)" }}>Wednesday 25th Feb @ 7pm UTC</span>
            </span>
            <span style={{ color: "var(--border-subtle)" }} className="opacity-30">•</span>
        </div>
    );

    return (
        <div
            className="fixed top-0 left-0 right-0 z-100 h-9 flex flex-col overflow-hidden border-b border-(--border-subtle) backdrop-blur-md"
        >
            {/* Top Row: Token Stats - Commented out for now
            <div className="flex-1 flex items-center border-b border-(--border-subtle)/30">
                <motion.div
                    className="flex"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                        duration: 80,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i}>{content}</div>
                    ))}
                </motion.div>
            </div>
            */}

            {/* Bottom Row: Launch News */}
            <div className="flex-1 flex items-center">
                <motion.div
                    className="flex"
                    animate={{ x: ["-50%", "0%"] }} // Scroll reverse for visual interest
                    transition={{
                        duration: 100,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i}>{launchContent}</div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
