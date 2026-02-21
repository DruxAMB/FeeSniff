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
} from "lucide-react";
import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { CHAINS } from "@/lib/chains";

type ResultsViewProps = {
    result: AnalysisResult;
    onBack: () => void;
};

function truncateAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatNumber(val: string | number): React.ReactNode {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;

    // Handle small values with compact zero notation (e.g., 0.0₅34)
    if (num < 0.0001 && num > 0) {
        const str = num.toFixed(20);
        const match = str.match(/^0\.0+/);
        if (match) {
            const zerosCount = match[0].length - 2; // subtract "0."
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
    const diff = Math.floor(Date.now() / 1000 - timestamp);
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
        } catch {
            // Clipboard not available
        }
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

function TaxBadge({ label, value }: { label: string; value: number }) {
    const color = "var(--text-primary)";
    const icon = <ShieldCheck className="h-4 w-4" />;

    return (
        <div
            className="flex items-center gap-3 p-4 rounded-xl border border-(--border-subtle)"
            style={{ background: "var(--bg-secondary)" }}
        >
            <div style={{ color }}>{icon}</div>
            <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {label}
                </p>
                <p className="text-xl font-bold" style={{ color }}>
                    {value}%
                </p>
            </div>
        </div>
    );
}

export default function ResultsView({ result, onBack }: ResultsViewProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [txView, setTxView] = useState<"creator" | "token">("creator");
    const activeIncome = result.feeIncome;
    const ITEMS_PER_PAGE = 10;

    const chain = CHAINS.find((c) => c.id === result.chain);
    const explorerUrl = chain?.explorerUrl || "https://basescan.org";

    const allTxs = txView === "creator" ? result.feeIncome.recentTxs : result.tokenTrades;

    const totalPages = Math.ceil(allTxs.length / ITEMS_PER_PAGE);
    const paginatedTxs = allTxs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="w-full space-y-4 pt-4">
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
                                style={{ color: "var(--text-muted)" }}
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            {chain && (
                                <span
                                    className="px-2 py-0.5 rounded text-xs"
                                    style={{
                                        background: "var(--bg-secondary)",
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    {chain.icon} {chain.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-right flex md:flex-col items-end gap-2">
                        <span
                            className="px-2.5 py-1 rounded-lg text-xs font-bold border border-(--border-subtle)"
                            style={{
                                background: "var(--bg-secondary)",
                                color: "var(--text-primary)",
                            }}
                        >
                            {result.contractVerified ? "✓ Verified" : "⚠ Unverified"}
                        </span>
                        {result.platform && result.platform !== "generic" && (
                            <span
                                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5"
                                style={{
                                    borderColor: result.platform === "bankr" ? "#3b82f633" : "#22c55e33",
                                    background: result.platform === "bankr" ? "#3b82f611" : "#22c55e11",
                                    color: result.platform === "bankr" ? "#3b82f6" : "#22c55e"
                                }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: result.platform === "bankr" ? "#3b82f6" : "#22c55e" }}></span>
                                {result.platform === "bankr" ? `Bankr ${result.subPlatform === "doppler" ? "Doppler" : "Clanker v4"}` : result.platform} Optimized
                            </span>
                        )}
                    </div>
                </div>

                {/* Token details */}
                <div
                    className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                    <div>
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                            Total Supply
                        </p>
                        <p className="text-sm font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                            {formatNumber(result.token.totalSupply)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                            Total Volume
                        </p>
                        <p className="text-sm font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                            {formatNumber(result.volumeEth || "0")} {chain?.nativeSymbol || "ETH"}
                        </p>
                    </div>
                    {result.token.deployer && (
                        <div>
                            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                                Deployer
                            </p>
                            <div className="flex items-center gap-1">
                                <p
                                    className="text-sm font-mono font-medium"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    {truncateAddress(result.token.deployer)}
                                </p>
                                <CopyButton text={result.token.deployer} />
                            </div>
                        </div>
                    )}
                    {result.token.deployedAt && (
                        <div>
                            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                                Deployed
                            </p>
                            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                                {new Date(result.token.deployedAt).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                    {result.poolAddress && (
                        <div>
                            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                                LP Pool
                            </p>
                            <div className="flex items-center gap-1">
                                <a
                                    href={`${explorerUrl}/address/${result.poolAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-mono font-medium transition-colors"
                                    style={{ color: "var(--accent-primary)" }}
                                >
                                    {truncateAddress(result.poolAddress)}
                                </a>
                                <CopyButton text={result.poolAddress} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bankr: Coming Soon Gate ─────────────── */}
            {result.platform === "bankr" ? (
                <div className="glass-card p-8 text-center border-2 border-[#3b82f633]" style={{ background: "#3b82f608" }}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#3b82f6" }}></span>
                        <p className="text-lg font-bold" style={{ color: "#3b82f6" }}>
                            Bankr Support Coming Soon
                        </p>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Fee tracking for {result.subPlatform === "doppler" ? "Doppler" : "Clanker v4"} tokens launched via Bankr is under development.
                    </p>
                    <p className="text-xs mt-3 opacity-50">
                        Token identified as {result.subPlatform === "doppler" ? "Bankr Doppler" : "Bankr Clanker v4"} optimized.
                    </p>
                </div>
            ) : (
                <>
                    {/* ── Fee Breakdowns ──────────────────────── */}
                    <div className="space-y-4">
                        {/* ── Hero metric: Total Creator Revenue ─────────────── */}
                        <div className="glass-card p-8 text-center border-2 border-(--border-strong)">
                            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                                <TrendingUp className="inline h-4 w-4 mr-1" />
                                Total Fees Claimed (Platform Global)
                            </p>
                            <p className="text-4xl font-bold gradient-text mb-1">
                                {formatNumber((parseFloat(activeIncome.totalEth) + parseFloat(activeIncome.unclaimedEth || "0")).toString())} {chain?.nativeSymbol || "WETH"}
                                {(parseFloat(activeIncome.totalEth) + parseFloat(activeIncome.unclaimedEth || "0")) === 0 && activeIncome.unclaimedTokenAmount && parseFloat(activeIncome.unclaimedTokenAmount) > 0 && (
                                    <span className="text-sm align-middle ml-2" style={{ color: "var(--status-green)" }}>
                                        + {formatNumber(activeIncome.unclaimedTokenAmount)} ${activeIncome.tokenSymbol}
                                    </span>
                                )}
                            </p>
                            {(activeIncome.totalUsd || activeIncome.unclaimedUsd) && (parseFloat(activeIncome.totalUsd || "0") + parseFloat(activeIncome.unclaimedUsd || "0")) > 0 && (
                                <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
                                    ≈ ${(parseFloat(activeIncome.totalUsd || "0") + parseFloat(activeIncome.unclaimedUsd || "0")).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            )}
                            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                                {activeIncome.txCount > 0 ? (
                                    `Across ${activeIncome.txCount} transaction${activeIncome.txCount !== 1 ? "s" : ""}`
                                ) : (
                                    activeIncome.unclaimedTokenAmount && parseFloat(activeIncome.unclaimedTokenAmount) > 0
                                        ? "Current token rewards listed below"
                                        : "No recent transactions found"
                                )}
                            </p>

                            {/* Claimed/Unclaimed Breakdown */}
                            {activeIncome.unclaimedEth && parseFloat(activeIncome.unclaimedEth) > 0 && (
                                <div className="mt-6 pt-6 border-t border-(--border-subtle) grid grid-cols-2 gap-4">
                                    <div className="text-left">
                                        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                                            Global Claimed
                                        </p>
                                        <p className="text-lg font-bold" style={{ color: "var(--text-secondary)" }}>
                                            {formatNumber(activeIncome.totalEth)} {chain?.nativeSymbol}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                                            Available in Locker
                                        </p>
                                        <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                                            {formatNumber(activeIncome.unclaimedEth)} {chain?.nativeSymbol}
                                        </p>
                                        {activeIncome.unclaimedTokenAmount && parseFloat(activeIncome.unclaimedTokenAmount) > 0 && (
                                            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                                                + {formatNumber(activeIncome.unclaimedTokenAmount)} ${activeIncome.tokenSymbol || "TOKENS"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* ── Tax Rates ──────────────────────────── */}
                    {result.taxRates && (result.taxRates.buyTax > 0 || result.taxRates.sellTax > 0) ? (
                        <div className="grid grid-cols-2 gap-4">
                            <TaxBadge label="Buy Tax" value={result.taxRates.buyTax} />
                            <TaxBadge label="Sell Tax" value={result.taxRates.sellTax} />
                        </div>
                    ) : null}

                    {/* ── Fee Wallets ────────────────────────── */}
                    {result.feeWallets.length > 0 ? (
                        <div className="glass-card p-6">
                            <h3
                                className="text-sm font-semibold mb-4 flex items-center gap-2"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                <Wallet className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
                                Fee Wallets ({result.feeWallets.length})
                            </h3>
                            <div className="space-y-3">
                                {result.feeWallets.map((wallet, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: "var(--bg-secondary)" }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="px-2 py-0.5 rounded text-xs font-bold border border-(--border-subtle)"
                                                style={{
                                                    background: "var(--bg-primary)",
                                                    color: "var(--text-primary)",
                                                }}
                                            >
                                                {wallet.label}
                                            </span>
                                            <span
                                                className="text-sm font-mono"
                                                style={{ color: "var(--text-secondary)" }}
                                            >
                                                {truncateAddress(wallet.address)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <CopyButton text={wallet.address} />
                                            <a
                                                href={`${explorerUrl}/address/${wallet.address}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 transition-colors"
                                                style={{ color: "var(--text-muted)" }}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div
                            className="glass-card p-4 text-center text-sm"
                            style={{ color: "var(--text-muted)" }}
                        >
                            {result.contractVerified
                                ? "No standard fee wallets detected"
                                : "Contract not verified — unable to detect fee wallets"}
                        </div>
                    )}

                    {/* ── Recent Transactions ────────────────── */}
                    {allTxs.length > 0 && (
                        <div className="glass-card p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h3
                                    className="text-sm font-semibold flex items-center gap-2"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    <Clock className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
                                    Transaction History
                                </h3>

                                {/* Tab Switcher */}
                                <div
                                    className="flex p-1 rounded-xl w-fit border border-(--border-subtle)"
                                    style={{ background: "var(--bg-secondary)" }}
                                >
                                    <button
                                        onClick={() => { setTxView("creator"); setCurrentPage(1); }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${txView === "creator"
                                            ? "bg-accent-primary text-bg-primary shadow-sm"
                                            : "text-text-muted hover:text-text-primary"
                                            }`}
                                    >
                                        Creator Revenue
                                    </button>
                                    <button
                                        onClick={() => { setTxView("token"); setCurrentPage(1); }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${txView === "token"
                                            ? "bg-accent-primary text-bg-primary shadow-sm"
                                            : "text-text-muted hover:text-text-primary"
                                            }`}
                                    >
                                        ${result.token.symbol} Trades
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ color: "var(--text-muted)" }}>
                                            <th className="text-left py-2 pr-4 font-medium text-xs">Tx Hash</th>
                                            <th className="text-left py-2 pr-4 font-medium text-xs">
                                                {txView === "creator" ? "From (Payer)" : "From"}
                                            </th>
                                            <th className="text-right py-2 pr-4 font-medium text-xs">
                                                {txView === "creator" ? "Amount (WETH)" : "Amount"}
                                            </th>
                                            <th className="text-right py-2 font-medium text-xs">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedTxs.map((tx, i) => (
                                            <tr
                                                key={i}
                                                className="border-t border-(--border-subtle) hover:bg-bg-secondary transition-colors"
                                            >
                                                <td className="py-2.5 pr-4">
                                                    <a
                                                        href={`${explorerUrl}/tx/${tx.hash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-mono transition-colors underline"
                                                        style={{ color: "var(--accent-primary)" }}
                                                    >
                                                        {truncateAddress(tx.hash)}
                                                    </a>
                                                </td>
                                                <td
                                                    className="py-2.5 pr-4 font-mono"
                                                    style={{ color: "var(--text-secondary)" }}
                                                >
                                                    {truncateAddress(tx.from)}
                                                </td>
                                                <td
                                                    className="py-2.5 pr-4 text-right font-mono font-medium"
                                                    style={{ color: "var(--text-primary)" }}
                                                >
                                                    {formatNumber(tx.value)} {txView === "creator" ? (chain?.nativeSymbol || "WETH") : result.token.symbol}
                                                </td>
                                                <td
                                                    className="py-2.5 text-right"
                                                    style={{ color: "var(--text-muted)" }}
                                                >
                                                    {timeAgo(tx.timestamp)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-(--border-subtle)">
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                        Showing <span className="text-text-primary font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-text-primary font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, allTxs.length)}</span> of <span className="text-text-primary font-medium">{allTxs.length}</span> transactions
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 rounded-lg border border-(--border-subtle) transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-secondary"
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <span
                                                className="w-10 h-8 flex items-center justify-center rounded-lg text-xs font-bold border border-accent-primary bg-accent-primary text-bg-primary shadow-sm"
                                            >
                                                {currentPage}
                                            </span>
                                            <span className="text-xs font-medium px-2" style={{ color: "var(--text-muted)" }}>
                                                of {totalPages}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-1.5 rounded-lg border border-(--border-subtle) transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-secondary"
                                            aria-label="Next page"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
