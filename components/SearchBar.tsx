"use client";

import { useState } from "react";
import { Search, ChevronDown, Loader2 } from "lucide-react";
import { CHAINS, DEFAULT_CHAIN } from "@/lib/chains";
import type { ChainConfig } from "@/lib/types";

type SearchBarProps = {
    onSubmit: (address: string, chain: string) => void;
    isLoading: boolean;
};

export default function SearchBar({ onSubmit, isLoading }: SearchBarProps) {
    const [address, setAddress] = useState("");
    const [selectedChain, setSelectedChain] = useState<ChainConfig>(DEFAULT_CHAIN);
    const [showChainDropdown, setShowChainDropdown] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const trimmed = address.trim();
        if (!trimmed) {
            setError("Please paste a contract address");
            return;
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
            setError("Invalid address format — must be a 42-character hex address");
            return;
        }

        if (!selectedChain.enabled) {
            setError(`${selectedChain.name} support is coming soon`);
            return;
        }

        onSubmit(trimmed, selectedChain.id);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            {/* Search input row */}
            <div
                className="flex items-center gap-2 p-2 rounded-2xl transition-all duration-300"
                style={{
                    background: "var(--bg-surface)",
                    border: error
                        ? "1px solid var(--status-red)"
                        : "1px solid var(--border-subtle)",
                }}
            >
                {/* Chain selector */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowChainDropdown(!showChainDropdown)}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                        style={{
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                        }}
                    >
                        <span>{selectedChain.icon}</span>
                        <span className="hidden sm:inline">{selectedChain.name}</span>
                        <ChevronDown className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                    </button>

                    {showChainDropdown && (
                        <div
                            className="absolute top-full left-0 mt-2 w-48 rounded-xl p-1.5 z-50 shadow-xl"
                            style={{
                                background: "var(--bg-surface)",
                                border: "1px solid var(--glass-border)",
                            }}
                        >
                            {CHAINS.map((chain) => (
                                <button
                                    key={chain.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedChain(chain);
                                        setShowChainDropdown(false);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                                    style={{
                                        color: chain.enabled ? "var(--text-primary)" : "var(--text-muted)",
                                        background:
                                            selectedChain.id === chain.id
                                                ? "var(--bg-secondary)"
                                                : "transparent",
                                    }}
                                >
                                    <span>{chain.icon}</span>
                                    <span>{chain.name}</span>
                                    {!chain.enabled && (
                                        <span
                                            className="ml-auto text-xs px-1.5 py-0.5 rounded"
                                            style={{
                                                background: "var(--bg-secondary)",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            Soon
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Address input */}
                <div className="relative flex-1">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                        style={{ color: "var(--text-muted)" }}
                    />
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => {
                            setAddress(e.target.value);
                            if (error) setError("");
                        }}
                        placeholder="Paste contract address (0x...)"
                        className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm outline-none"
                        style={{
                            color: "var(--text-primary)",
                            // fontFamily: "var(--font-geist-mono)",
                        }}
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>

                {/* Submit button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: isLoading ? "var(--bg-secondary)" : "var(--accent-primary)",
                        color: isLoading ? "var(--text-muted)" : "var(--bg-primary)",
                    }}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <span>Sniff</span>
                            <span className="hidden sm:inline">Fees</span>
                        </>
                    )}
                </button>
            </div>

            {/* Error message */}
            {error && (
                <p className="mt-2 text-sm text-center" style={{ color: "var(--status-red)" }}>
                    {error}
                </p>
            )}
        </form>
    );
}
