import { NextResponse } from "next/server";

const CA = "0x1e59A76e58E07e988d97aa7d89Eb15dc4BF18b07";
const CHAIN_ID = "base";

export async function GET() {
    try {
        const response = await fetch(
            `https://api.geckoterminal.com/api/v2/networks/${CHAIN_ID}/tokens/${CA}`,
            { next: { revalidate: 60 } }
        );

        if (response.ok) {
            const data = await response.json();
            const attr = data.data?.attributes;

            if (attr) {
                return NextResponse.json({
                    symbol: `$${attr.symbol?.toUpperCase() || "NOSEY"}`,
                    marketCap: formatMarketCap(parseFloat(attr.fdv_usd || "0")),
                    buyLink: `https://app.uniswap.org/swap?outputCurrency=${CA}&chain=base`,
                    contract: CA
                });
            }
        }

        // Fallback for API failure
        return NextResponse.json({
            symbol: "$NOSEY",
            marketCap: "...",
            buyLink: `https://app.uniswap.org/swap?outputCurrency=${CA}&chain=base`,
            contract: CA
        });
    } catch (error) {
        console.error("[API] Token fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch token data" }, { status: 500 });
    }
}

function formatMarketCap(value: number): string {
    if (value === 0) return "...";
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(0)}`;
}
