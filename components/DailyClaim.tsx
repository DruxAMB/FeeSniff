"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Info } from "lucide-react";
import Image from "next/image";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use";

import { useWallet } from "@/lib/useWallet";
import { getClaimContract, getClaimContractReadOnly, SNIFF_DECIMALS } from "@/lib/claim";
import { ethers } from "ethers";

// ─── Types ──────────────────────────────────────────────────

type ClaimState = {
    canClaim: boolean;
    timeLeft: number;
    streak: number;
    nextReward: string;
    isPaused: boolean;
};

type TxStatus = "idle" | "pending" | "confirming" | "success" | "error";

// ─── Helpers ────────────────────────────────────────────────

function formatSniff(wei: bigint): string {
    const formatted = ethers.formatUnits(wei, SNIFF_DECIMALS);
    const num = parseFloat(formatted);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
}

function formatCountdown(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────

export default function ClaimModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { width, height } = useWindowSize();
    const {
        address,
        isConnected,
        isOnBase,
        signer,
        hasEthereum,
        connect,
        isConnecting,
        switchToBase,
    } = useWallet();

    const [claimState, setClaimState] = useState<ClaimState | null>(null);
    const [txStatus, setTxStatus] = useState<TxStatus>("idle");
    const [txError, setTxError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // ─── Fetch claim data ───────────────────────────────────
    const fetchClaimData = useCallback(async () => {
        if (!isOpen) return;

        try {
            setLoading(true);
            const contract = getClaimContractReadOnly();
            const isPaused = await contract.paused();

            if (!address) {
                setClaimState({
                    canClaim: false,
                    timeLeft: 0,
                    streak: 0,
                    nextReward: "100",
                    isPaused,
                });
                setLoading(false);
                return;
            }

            const [canClaim, timeLeft, streak, nextReward] = await Promise.all([
                contract.canClaim(address),
                contract.timeUntilNextClaim(address),
                contract.currentStreak(address),
                contract.nextReward(address),
            ]);

            setClaimState({
                canClaim,
                timeLeft: Number(timeLeft),
                streak: Number(streak),
                nextReward: formatSniff(nextReward),
                isPaused,
            });
        } catch (err) {
            console.error("Failed to fetch claim data:", err);
        } finally {
            setLoading(false);
        }
    }, [address, isOpen]);

    useEffect(() => {
        fetchClaimData();
    }, [fetchClaimData]);

    // Reset status when modal closes or opens
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setTxStatus("idle");
                setTxError(null);
                setShowInfo(false);
            }, 300); // Wait for exit animation
        }
    }, [isOpen]);

    // ─── Countdown timer ───────────────────────────────────
    useEffect(() => {
        if (!claimState || claimState.canClaim || claimState.timeLeft <= 0) return;

        const interval = setInterval(() => {
            setClaimState((prev) => {
                if (!prev || prev.timeLeft <= 1) {
                    clearInterval(interval);
                    return prev ? { ...prev, timeLeft: 0, canClaim: true } : prev;
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [claimState?.canClaim, claimState?.timeLeft]);

    // ─── Claim handler ─────────────────────────────────────
    const handleClaim = async () => {
        if (!signer || !isOnBase) return;

        setTxStatus("pending");
        setTxError(null);

        try {
            const contract = getClaimContract(signer);
            const tx = await contract.claim();
            setTxStatus("confirming");
            await tx.wait();
            setTxStatus("success");

            // Refresh data silently
            setTimeout(() => fetchClaimData(), 2000);
        } catch (err: unknown) {
            setTxStatus("error");
            const message = err instanceof Error ? err.message : "Transaction failed";

            if (message.includes("Already claimed")) {
                setTxError("Already claimed today!");
            } else if (message.includes("rejected") || message.includes("denied")) {
                setTxError("Transaction rejected");
            } else if (message.includes("insufficient")) {
                setTxError("Contract out of funds");
            } else {
                setTxError("Failed to claim. Try again.");
            }
        }
    };

    const shareToX = () => {
        const text = encodeURIComponent(`I just claimed my free daily @tokensniff tokens!👃🏽\n\nSee how much token creators earn at tokensniff.druxamb.dev`);
        window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 backdrop-blur-sm"
                    style={{ background: "rgba(0, 0, 0, 0.4)" }}
                />

                {/* Confetti overlay (only on success) */}
                {txStatus === "success" && (
                    <div className="fixed inset-0 z-50 pointer-events-none">
                        <ReactConfetti
                            width={width}
                            height={height}
                            recycle={false}
                            numberOfPieces={400}
                            gravity={0.15}
                        />
                    </div>
                )}

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-sm overflow-hidden flex flex-col items-center justify-between p-8"
                    style={{
                        background: "var(--bg-primary)",
                        borderRadius: "32px",
                        boxShadow: "0 24px 50px rgba(0,0,0,0.1)",
                        border: "1px solid var(--border-subtle)",
                        minHeight: "480px",
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                    </button>

                    {/* Info button */}
                    {!showInfo && (
                        <button
                            onClick={() => setShowInfo(true)}
                            className="absolute top-4 left-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <Info className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                        </button>
                    )}

                    {/* ────── Info State ────── */}
                    {showInfo ? (
                        <div className="flex flex-col items-center w-full h-full mt-4 flex-1">
                            <h2 className="text-xl font-bold mb-6 mt-6" style={{ color: "var(--text-primary)" }}>
                                Streak Multipliers
                            </h2>

                            <div className="w-full text-left bg-black/5 dark:bg-white/5 p-4 rounded-2xl border mb-6 space-y-4" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                                <div className="flex justify-between items-center text-sm">
                                    <span>Days 1-6</span>
                                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>1.0x (100)</span>
                                </div>
                                <hr style={{ borderColor: "var(--border-subtle)", opacity: 0.5 }} />
                                <div className="flex justify-between items-center text-sm">
                                    <span>Days 7-13</span>
                                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>1.5x (150)</span>
                                </div>
                                <hr style={{ borderColor: "var(--border-subtle)", opacity: 0.5 }} />
                                <div className="flex justify-between items-center text-sm">
                                    <span>Days 14-29</span>
                                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>2.0x (200)</span>
                                </div>
                                <hr style={{ borderColor: "var(--border-subtle)", opacity: 0.5 }} />
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span>Days 30+</span>
                                    <span style={{ color: "#22c55e" }}>3.0x (300)</span>
                                </div>
                            </div>

                            <div className="mb-auto">
                                <p className="text-xs text-center px-2" style={{ color: "var(--text-muted)", lineHeight: "1.5" }}>
                                    You have a 48 hour grace period.<br />If you don't claim within 48 hours,<br />your streak resets to 1x!
                                </p>
                            </div>

                            <button
                                onClick={() => setShowInfo(false)}
                                className="w-full max-w-[200px] mt-8 py-3.5 rounded-xl font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                                style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                            >
                                Got it
                            </button>
                        </div>
                    ) : txStatus === "success" ? (
                        /* ────── Success State (Matches reference image 1) ────── */
                        <div className="flex flex-col items-center w-full h-full justify-center mt-12 mb-4 animate-fade-in text-center flex-1">
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                                style={{ background: "#22c55e" }} // Bright green like reference
                            >
                                <Check className="w-12 h-12 text-white" strokeWidth={3} />
                            </div>

                            <h2 className="text-xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>
                                Claim Successful
                            </h2>

                            <div className="mb-auto">
                                <p className="text-xs px-4" style={{ color: "var(--text-secondary)" }}>
                                    {claimState?.nextReward} $SNIFF has been sent to your wallet. Come back tomorrow for more!
                                </p>
                                {claimState && claimState.streak > 0 && (
                                    <p className="text-xs mt-2 font-medium" style={{ color: "#22c55e" }}>
                                        🔥 {claimState.streak} day streak!
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={shareToX}
                                className="w-full max-w-[200px] mt-12 py-3.5 rounded-xl font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                                style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                            >
                                Share
                            </button>
                        </div>
                    ) : (
                        /* ────── Claim State (Matches reference image 2) ────── */
                        <div className="flex flex-col items-center w-full h-full mt-4 text-center flex-1">
                            {/* Token Logo Circle */}
                            <div
                                className="relative w-40 h-40 mb-8 rounded-full border border-dashed p-2 flex items-center justify-center"
                                style={{ borderColor: "var(--border-subtle)" }}
                            >
                                <div
                                    className="absolute inset-0 rounded-full border m-4"
                                    style={{ borderColor: "var(--border-strong)", opacity: 0.2 }}
                                ></div>
                                <Image
                                    src="/nosey.png"
                                    width={120}
                                    height={120}
                                    alt="Nosey Token"
                                    className="rounded-full relative z-10"
                                />
                            </div>

                            <h2 className="text-2xl font-bold mb-6 flex gap-2 items-center justify-center" style={{ color: "var(--text-primary)" }}>
                                Claim {claimState?.nextReward || "..."} <span className="text-lg" style={{ color: "var(--text-muted)" }}>$SNIFF</span>
                            </h2>

                            <div className="mb-auto">
                                <p className="text-xs px-4" style={{ color: "var(--text-muted)" }}>
                                    Build your daily streak to earn up to 3x rewards!
                                    {claimState && claimState.streak > 0 && (
                                        <span className="block mt-1">
                                            Current streak: {claimState.streak} 🔥
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Action Button */}
                            <div className="w-full mt-8">
                                {loading ? (
                                    <div className="h-12 flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                                    </div>
                                ) : !isConnected ? (
                                    <button
                                        onClick={connect}
                                        disabled={isConnecting}
                                        className="w-full max-w-[200px] mx-auto py-3.5 rounded-xl font-semibold block transition-opacity hover:opacity-90 cursor-pointer"
                                        style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                                    >
                                        {isConnecting ? "Connecting..." : "Connect Wallet"}
                                    </button>
                                ) : !isOnBase ? (
                                    <button
                                        onClick={switchToBase}
                                        className="w-full max-w-[200px] mx-auto py-3.5 rounded-xl font-semibold text-white block transition-opacity hover:opacity-90 bg-red-500 cursor-pointer"
                                    >
                                        Switch to Base
                                    </button>
                                ) : claimState?.isPaused ? (
                                    <button disabled className="w-full max-w-[200px] mx-auto py-3.5 rounded-xl font-semibold text-white block bg-gray-400 opacity-50 cursor-not-allowed">
                                        Paused
                                    </button>
                                ) : claimState?.canClaim ? (
                                    <div className="flex flex-col items-center">
                                        {txError && (
                                            <p className="text-red-500 text-xs mb-3">{txError}</p>
                                        )}
                                        <button
                                            onClick={handleClaim}
                                            disabled={txStatus === "pending" || txStatus === "confirming"}
                                            className="w-full max-w-[200px] mx-auto py-3.5 rounded-xl font-semibold block transition-opacity hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                                            style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                                        >
                                            {txStatus === "pending" ? "Confirm in wallet" : txStatus === "confirming" ? "Confirming..." : "Claim"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Available in</p>
                                        <button disabled className="w-full max-w-[200px] mx-auto py-3.5 rounded-xl font-semibold font-mono block opacity-80 cursor-not-allowed" style={{ background: "var(--bg-skeleton)", color: "var(--text-primary)" }}>
                                            {formatCountdown(claimState?.timeLeft || 0)}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div >
        </AnimatePresence >,
        document.body
    );
}
