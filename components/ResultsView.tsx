"use client";

import {
    Copy,
    ExternalLink,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Wallet,
    TrendingUp,
    Clock,
    Check,
    ChevronLeft,
    ChevronRight,
    ArrowRightLeft,
    PieChart,
    AlertTriangle,
    Lock,
    Unlock,
    Activity,
} from "lucide-react";
import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { CHAINS } from "@/lib/chains";
import BubbleMapModal from "./BubbleMapModal";
import { ethers } from "ethers";

type ResultsViewProps = {
    result: AnalysisResult;
    onBack: () => void;
};

function truncateAddress(addr: string): string {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatNumber(val: string | number): React.ReactNode {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;

    if (num < 0.0001 && num > 0) {
        const str = num.toFixed(20);
        const match = str.match(/^0\.0+/);
        if (match) {
            const zerosCount = match[0].length - 2;
            const significantDigits = str.slice(match[0].length).slice(0, 4);
            return (
                <span className="inline-flex items-baseline font-mono">
                    0.0<sup className="text-[10px] mx-0.5" style={{ verticalAlign: "super" }}>{zerosCount}</sup>{significantDigits}
                </span>
            );
        }
    }

    return num.toFixed(4);
}

function timeAgo(timestamp: number): string {
    if (!timestamp || timestamp === 0) return "Unknown";
    const diff = Math.floor(Date.now() / 1000 - timestamp);
    if (diff < 0) return "Just now";
    if (diff > 315360000) return "Unknown";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    };
    return (
        <button
            onClick={handleCopy}
            className="p-1 rounded transition-colors cursor-pointer"
            style={{ color: copied ? "var(--status-green)" : "var(--text-muted)" }}
            title="Copy address"
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

export default function ResultsView({ result, onBack }: ResultsViewProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [txView, setTxView] = useState<"creator" | "token" | "withdrawals">("creator");
    const [isBubbleMapOpen, setIsBubbleMapOpen] = useState(false);
    const activeIncome = result.feeIncome;
    const ITEMS_PER_PAGE = 10;

    const chain = CHAINS.find((c) => c.id === result.chain);
    const explorerUrl = chain?.explorerUrl || "https://basescan.org";

    const allTxs = txView === "creator"
        ? (result.feeIncome?.recentTxs?.filter(t => t.type !== "withdrawal") || [])
        : txView === "withdrawals"
            ? (result.feeIncome?.recentTxs?.filter(t => t.type === "withdrawal") || [])
            : (result.tokenTrades || []);

    const totalPages = Math.ceil(allTxs.length / ITEMS_PER_PAGE);
    const paginatedTxs = allTxs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="w-full space-y-6 pt-4">
            {/* ── Token header ────────────────────────── */}
            <div className="glass-card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                                {result.token.name}
                            </h2>
                            <span
                                className="px-2 py-0.5 rounded-md text-xs font-mono font-bold border border-(--border-subtle)"
                                style={{
                                    background: "var(--bg-secondary)",
                                    color: "var(--text-primary)",
                                }}
                            >
                                ${result.token.symbol}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                            <span className="font-mono">{truncateAddress(result.contractAddress)}</span>
                            <CopyButton text={result.contractAddress} />
                            <a
                                href={`${explorerUrl}/address/${result.contractAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            {chain && (
                                <span className="px-2 py-0.5 rounded text-xs bg-black/5 dark:bg-white/5 border border-(--border-subtle)">
                                    {chain.icon} {chain.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            <a
                                href={`https://app.uniswap.org/swap?outputCurrency=${result.contractAddress}&chain=${result.chain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 border border-[#ff007a33] hover:border-[#ff007a66]"
                                style={{
                                    background: "rgba(255, 0, 122, 0.08)",
                                    color: "#ff007a",
                                }}
                            >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Trade
                            </a>
                            {["base", "ethereum", "bsc", "arbitrum", "polygon", "avalanche"].includes(chain?.id || "") && (
                                <button
                                    onClick={() => setIsBubbleMapOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 border border-[#8b5cf633] hover:border-[#8b5cf666]"
                                    style={{
                                        background: "rgba(139, 92, 246, 0.08)",
                                        color: "#a78bfa",
                                    }}
                                >
                                    <PieChart className="h-3.5 w-3.5" />
                                    Map
                                </button>
                            )}
                            <span
                                className="px-2.5 py-1 rounded-lg text-xs font-bold border border-(--border-subtle)"
                                style={{
                                    background: "var(--bg-secondary)",
                                    color: "var(--text-primary)",
                                }}
                            >
                                {result.contractVerified ? "✓ Verified" : "⚠ Unverified"}
                            </span>
                        </div>
                        {result.platform && result.platform !== "generic" && (
                            <span
                                className="px-2.5 py-1 w-fit rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5"
                                style={{
                                    borderColor: result.platform === "bankr" ? "#3b82f633" : "#22c55e33",
                                    background: result.platform === "bankr" ? "#3b82f611" : "#22c55e11",
                                    color: result.platform === "bankr" ? "#3b82f6" : "#22c55e"
                                }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: result.platform === "bankr" ? "#3b82f6" : result.platform === "clanker" ? "#22c55e" : "#9ca3af" }}></span>
                                {result.platform === "bankr"
                                    ? `Bankr ${result.subPlatform === "doppler" ? "Doppler" : "Clanker v4"} Optimized`
                                    : result.platform === "clanker" && result.poolAddress?.toLowerCase() === "0x498581ff718922c3f8e6a244956af099b2652b2b"
                                        ? "Clanker v4 Optimized"
                                        : result.platform === "clanker"
                                            ? "Clanker v0 - v3"
                                            : result.platform}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Security Scan Panel ────────────────────────── */}
            {result.securityRisk ? (
                <div className="glass-card p-6 border-2" style={{ borderColor: result.securityRisk.riskLevel === "Low" ? "var(--status-green)" : result.securityRisk.riskLevel === "Medium" ? "var(--status-yellow)" : "var(--status-red)" }}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <svg className="w-20 h-20 transform -rotate-90">
                                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-black/5 dark:text-white/5" />
                                    <circle
                                        cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent"
                                        strokeDasharray={2 * Math.PI * 36}
                                        strokeDashoffset={2 * Math.PI * 36 * (1 - result.securityRisk.score / 100)}
                                        strokeLinecap="round"
                                        style={{ color: result.securityRisk.riskLevel === "Low" ? "#22c55e" : result.securityRisk.riskLevel === "Medium" ? "#eab308" : "#ef4444" }}
                                    />
                                </svg>
                                <span className="absolute text-xl font-bold">{result.securityRisk.score}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider opacity-60">Security Score</h3>
                                <div className="text-2xl font-black">{result.securityRisk.riskLevel} Risk</div>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {result.securityRisk.riskFlags.map((flag, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-(--border-subtle) bg-black/5 dark:bg-white/5">
                                    {flag.type === "success" ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4" style={{ color: flag.type === "danger" ? "#ef4444" : "#eab308" }} />
                                    )}
                                    <span className="text-xs font-semibold">{flag.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-(--border-subtle)">
                        <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 opacity-60">
                            <Activity className="h-3.5 w-3.5" />
                            Top Holders Distribution
                        </h4>
                        <div className="space-y-2">
                            {result.securityRisk.topHolders.slice(0, 5).map((holder, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 text-[10px] font-mono opacity-40">{i + 1}.</span>
                                        <span className="font-mono">{truncateAddress(holder.address)}</span>
                                        {holder.label && (
                                            <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[9px] font-bold uppercase border border-(--border-subtle)">
                                                {holder.label}
                                            </span>
                                        )}
                                        {holder.address.toLowerCase() === result.poolAddress?.toLowerCase() && (
                                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold uppercase border border-blue-500/20">
                                                LP POOL
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                                            <div className="h-full bg-current" style={{ width: `${holder.percent}%` }} />
                                        </div>
                                        <span className="font-bold min-w-12 text-right">{holder.percent.toFixed(2)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-card p-4 text-center text-xs opacity-40 italic border-dashed mb-6">
                    Security analysis simplified or unavailable for this token.
                </div>
            )}

            {/* ── Main content area ────────────────────────── */}
            {result.platform === "bankr" ? (
                <div className="glass-card p-8 text-center border-2 border-[#3b82f633]" style={{ background: "#3b82f608" }}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#3b82f6" }}></span>
                        <p className="text-lg font-bold" style={{ color: "#3b82f6" }}>Bankr Support Coming Soon</p>
                    </div>
                    <p className="text-sm opacity-60">
                        Fee tracking for {result.subPlatform === "doppler" ? "Doppler" : "Clanker v4"} tokens launched via Bankr is under development.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Revenue Card */}
                    <div className="glass-card p-8 text-center border-2 border-(--border-subtle)">
                        <div className="pt-2 grid grid-cols-2 gap-8">
                            <div className="text-left">
                                <p className="text-xs uppercase tracking-wider mb-1 opacity-60 font-bold">Claimed</p>
                                <p className="text-2xl font-bold">{formatNumber(activeIncome.totalEth || "0")} {chain?.nativeSymbol}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase tracking-wider mb-1 opacity-60 font-bold">Unclaimed</p>
                                <p className="text-2xl font-bold" style={{ color: "var(--status-green)" }}>
                                    {formatNumber(activeIncome.unclaimedEth || "0")} {chain?.nativeSymbol}
                                </p>
                                {activeIncome.unclaimedTokenAmount && parseFloat(activeIncome.unclaimedTokenAmount) > 0 && (
                                    <p className="text-xs font-bold mt-1 opacity-80">
                                        + {formatNumber(activeIncome.unclaimedTokenAmount)} ${activeIncome.tokenSymbol}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fee Wallets */}
                    {result.feeWallets.length > 0 ? (
                        <div className="glass-card p-6">
                            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 opacity-80">
                                <Wallet className="h-4 w-4" />
                                Fee Wallets ({result.feeWallets.length})
                            </h3>
                            <div className="space-y-2">
                                {result.feeWallets.map((wallet, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-black/10 dark:border-white/10">{wallet.label}</span>
                                            <span className="text-sm font-mono opacity-80">{truncateAddress(wallet.address)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <CopyButton text={wallet.address} />
                                            <a href={`${explorerUrl}/address/${wallet.address}`} target="_blank" rel="noopener noreferrer" className="p-1 opacity-40 hover:opacity-100 transition-opacity">
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card p-6 text-center text-sm opacity-40">
                            {result.contractVerified ? "No standard fee wallets detected" : "Contract not verified — unable to detect fee wallets"}
                        </div>
                    )}

                    {/* Transaction History */}
                    <div className="glass-card p-0 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="text-sm font-bold flex items-center gap-2 opacity-80">
                                <Clock className="h-4 w-4" />
                                Transaction History
                            </h3>
                            <div className="flex p-1 rounded-xl bg-black/10 dark:bg-white/5 border border-white/5">
                                {(["creator", "token", "withdrawals"] as const).map((view) => (
                                    <button
                                        key={view}
                                        onClick={() => { setTxView(view); setCurrentPage(1); }}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${txView === view ? "bg-white text-black shadow-sm" : "opacity-40 hover:opacity-100"
                                            }`}
                                    >
                                        {view === "creator" ? "Revenue" : view === "token" ? "Trades" : "Withdrawals"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {allTxs.length > 0 ? (
                            <>
                                <div className="overflow-x-auto p-6">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="opacity-40 uppercase tracking-tighter">
                                                <th className="text-left pb-4 font-black">Hash</th>
                                                <th className="text-left pb-4 font-black">
                                                    {txView === "creator" ? "From" : txView === "withdrawals" ? "To" : "From"}
                                                </th>
                                                <th className="text-right pb-4 font-black">
                                                    {txView === "token" ? result.token.symbol : (chain?.nativeSymbol || "WETH")}
                                                </th>
                                                <th className="text-right pb-4 font-black">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {paginatedTxs.map((tx, i) => (
                                                <tr key={i} className="group">
                                                    <td className="py-4">
                                                        <a href={`${explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="font-mono opacity-80 hover:opacity-100 underline">
                                                            {truncateAddress(tx.hash)}
                                                        </a>
                                                    </td>
                                                    <td className="py-4 font-mono opacity-60">
                                                        {truncateAddress(txView === "withdrawals" ? (tx.to || "") : tx.from)}
                                                    </td>
                                                    <td className="py-4 text-right font-mono font-bold">
                                                        {formatNumber(tx.value)}
                                                    </td>
                                                    <td className="py-4 text-right opacity-40">
                                                        {timeAgo(tx.timestamp)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="p-6 border-t border-white/5 flex items-center justify-between">
                                        <p className="text-[10px] opacity-40 uppercase font-black">
                                            Page {currentPage} of {totalPages}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-1.5 rounded-lg border border-white/10 disabled:opacity-20 transition-opacity"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="p-1.5 rounded-lg border border-white/10 disabled:opacity-20 transition-opacity"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-12 text-center text-xs opacity-40 italic">
                                No recent {txView === "creator" ? "revenue" : txView === "withdrawals" ? "withdrawals" : "trades"} found.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <BubbleMapModal
                isOpen={isBubbleMapOpen}
                onClose={() => setIsBubbleMapOpen(false)}
                chain={chain}
                tokenAddress={result.token.address}
                tokenName={result.token.name}
            />
        </div>
    );
}