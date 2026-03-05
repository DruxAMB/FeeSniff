"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Info, Shield } from "lucide-react";
import Image from "next/image";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use";

import { useWallet } from "@/lib/useWallet";
import { getClaimContract, getClaimContractReadOnly, getSniffTokenContract, SNIFF_DECIMALS } from "@/lib/claim";
import { ethers } from "ethers";

// ─── Types ──────────────────────────────────────────────────

type ClaimState = {
    canClaim: boolean;
    timeLeft: number;
    streak: number;
    nextReward: string;
    isPaused: boolean;
    shields: number;
    shieldPrice: string;
    isStreakExpired: boolean;
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
    const [isBuyingShield, setIsBuyingShield] = useState(false);

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
                    shields: 0,
                    shieldPrice: "400",
                    isStreakExpired: false,
                });
                setLoading(false);
                return;
            }

            let canClaim = false;
            let timeLeft = 0n;
            let streak = 0n;
            let nextReward = 0n;
            let shieldCount = 0n;
            let price = ethers.parseUnits("400", SNIFF_DECIMALS);
            let lastClaimedTime = 0n;
            let win = 172800n; // 2 days

            try {
                const results = await Promise.all([
                    contract.canClaim(address).catch(() => false),
                    contract.timeUntilNextClaim(address).catch(() => 0n),
                    contract.currentStreak(address).catch(() => 0n),
                    contract.nextReward(address).catch(() => 0n),
                    contract.shields(address).catch(() => 0n),
                    contract.shieldPrice().catch(() => ethers.parseUnits("400", SNIFF_DECIMALS)),
                    contract.lastClaimed(address).catch(() => 0n),
                    contract.streakWindow().catch(() => 172800n),
                ]);
                [canClaim, timeLeft, streak, nextReward, shieldCount, price, lastClaimedTime, win] = results;
            } catch (err) {
                console.error("Contract call failed:", err);
            }

            const now = Math.floor(Date.now() / 1000);
            const isExpired = lastClaimedTime > 0 && now > Number(lastClaimedTime) + Number(win);

            setClaimState({
                canClaim,
                timeLeft: Number(timeLeft),
                streak: Number(streak),
                nextReward: formatSniff(nextReward),
                isPaused,
                shields: Number(shieldCount),
                shieldPrice: formatSniff(price),
                isStreakExpired: isExpired,
            });
        } catch (err) {
            console.error("Failed to fetch claim data:", err);
            // Ensure we have a valid state instead of null if it crashes
            if (!claimState) {
                setClaimState({
                    canClaim: false,
                    timeLeft: 0,
                    streak: 0,
                    nextReward: "100",
                    isPaused: false,
                    shields: 0,
                    shieldPrice: "400",
                    isStreakExpired: false,
                });
            }
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

    // ─── Handlers ──────────────────────────────────────────

    const handleClaim = async () => {
        if (!signer || !address) return;

        try {
            setTxStatus("pending");
            setTxError(null);

            const contract = getClaimContract(signer);
            const tx = await contract.claim();
            setTxStatus("confirming");
            await tx.wait();
            setTxStatus("success");
            fetchClaimData();
        } catch (err: any) {
            console.error("Claim failed:", err);
            setTxStatus("error");
            setTxError(err.reason || err.message || "Transaction failed");
        }
    };

    const handleBuyShield = async () => {
        if (!signer || !address || !claimState) return;

        try {
            setIsBuyingShield(true);
            setTxError(null);

            const claimContract = getClaimContract(signer);
            const tokenContract = getSniffTokenContract(signer);

            const price = ethers.parseUnits("400", SNIFF_DECIMALS); // 400 $SNIFF

            // Check allowance
            setTxStatus("pending");
            const allowance = await tokenContract.allowance(address, await claimContract.getAddress());

            if (allowance < price) {
                const approveTx = await tokenContract.approve(await claimContract.getAddress(), ethers.MaxUint256);
                await approveTx.wait();
            }

            const tx = await claimContract.buyShield(1);
            setTxStatus("confirming");
            await tx.wait();

            setTxStatus("idle");
            fetchClaimData();
        } catch (err: any) {
            console.error("Buy shield failed:", err);
            setTxError(err.reason || err.message || "Purchase failed");
            setTxStatus("error");
        } finally {
            setIsBuyingShield(false);
            if (txStatus !== "success" && txStatus !== "error") setTxStatus("idle");
        }
    };

    const shareToX = () => {
        const text = encodeURIComponent(`I just claimed my free daily $SNIFF tokens!👃🏽\n\nSee how much token creators earn @tokensniff tokensniff.druxamb.dev`);
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
                    className="relative w-full max-w-sm overflow-hidden flex flex-col items-center justify-between p-8 border border-b-8"
                    style={{
                        background: "var(--bg-primary)",
                        borderRadius: "32px",
                        boxShadow: "0 24px 50px rgba(0,0,0,0.1)",
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
                            <h2 className="text-xl font-bold mb-4 mt-6" style={{ color: "var(--text-primary)" }}>
                                Streak Multipliers
                            </h2>

                            <div className="w-full text-left bg-black/5 dark:bg-white/5 p-4 rounded-2xl border mb-4 space-y-3" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
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

                            <div className="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-[var(--border-subtle)] mb-auto">
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield className="w-4 h-4" style={{ color: "var(--text-primary)" }} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Streak Shield</span>
                                </div>
                                <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                    Shield protects your streak for 1 missed day!
                                </p>
                            </div>

                            <button
                                onClick={() => setShowInfo(false)}
                                className="w-full max-w-[200px] mt-6 py-3.5 rounded-xl font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                                style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                            >
                                Got it
                            </button>
                        </div>
                    ) : txStatus === "success" ? (
                        /* ────── Success State ────── */
                        <div className="flex flex-col items-center w-full h-full justify-center mt-12 mb-4 animate-fade-in text-center flex-1">
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                                style={{ background: "#22c55e" }}
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
                                className="w-full max-w-[200px] mt-10 py-3.5 rounded-xl font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                                style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                            >
                                Share
                            </button>
                        </div>
                    ) : (
                        /* ────── Claim State ────── */
                        <div className="flex flex-col items-center w-full h-full mt-4 text-center flex-1">
                            {/* Token Logo Circle */}
                            <div
                                className="relative w-36 h-36 mb-6 rounded-full border border-dashed p-2 flex items-center justify-center"
                                style={{ borderColor: "var(--border-subtle)" }}
                            >
                                <div
                                    className="absolute inset-0 rounded-full border m-4"
                                    style={{ borderColor: "var(--border-strong)", opacity: 0.2 }}
                                ></div>
                                <Image
                                    src="/nosey.png"
                                    width={100}
                                    height={100}
                                    alt="Nosey Token"
                                    className="rounded-full relative z-10"
                                />

                                {/* Shield Badge */}
                                {isConnected && claimState && (
                                    <div
                                        className="absolute -top-1 -right-1 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg border-2"
                                        style={{ background: "var(--text-primary)", color: "var(--bg-primary)", borderColor: "var(--bg-primary)" }}
                                    >
                                        <Shield className="w-3.5 h-3.5 fill-current" />
                                        <span className="text-[10px] font-bold">{claimState.shields}</span>
                                    </div>
                                )}
                            </div>

                            <h2 className="text-2xl font-bold mb-4 flex gap-1 items-center justify-center" style={{ color: "var(--text-primary)" }}>
                                Claim {claimState?.nextReward || "..."} <span className="text-lg" style={{ color: "var(--text-muted)" }}>$SNIFF</span>
                            </h2>

                            <div className="mb-4">
                                <p className="text-xs px-4" style={{ color: "var(--text-muted)" }}>
                                    Build your daily streak to earn up to 3x rewards!
                                    {claimState && claimState.streak > 0 && (
                                        <span className="block mt-1">
                                            Current streak: {claimState.streak} 🔥
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Streak Shield Purchase Section - Only show if streak is at risk (expired window) */}
                            {isConnected && claimState && claimState.isStreakExpired && (
                                <div className="w-full mb-6 px-4">
                                    <button
                                        onClick={handleBuyShield}
                                        disabled={isBuyingShield || txStatus === "pending" || txStatus === "confirming"}
                                        className="w-full group relative items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-(--border-subtle) hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-lg bg-black/5 dark:bg-white/10" style={{ color: "var(--text-primary)" }}>
                                                <Shield className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Streak Shield</p>
                                                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Protect for 1 missed day</p>
                                            </div>
                                        </div>
                                        <div
                                            className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors"
                                            style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                                        >
                                            {isBuyingShield ? "BUYING..." : `${claimState.shieldPrice} $SNIFF`}
                                        </div>

                                        {/* Progress Bar for purchase */}
                                        {isBuyingShield && (
                                            <motion.div
                                                className="absolute bottom-0 left-0 h-0.5"
                                                style={{ background: "var(--text-primary)" }}
                                                initial={{ width: 0 }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 20 }}
                                            />
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Action Button */}
                            <div className="w-full mt-5">
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
                                            <p className="text-red-500 text-[10px] mb-3">{txError}</p>
                                        )}
                                        <button
                                            onClick={handleClaim}
                                            disabled={txStatus === "pending" || txStatus === "confirming" || isBuyingShield}
                                            className="w-full max-w-[200px] mx-auto py-3.5 rounded-xl font-semibold block transition-opacity hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                                            style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                                        >
                                            {txStatus === "pending" ? "Confirm in wallet" : txStatus === "confirming" ? "Confirming..." : "Claim"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        {txError && (
                                            <p className="text-red-500 text-[10px] mb-3">{txError}</p>
                                        )}
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
            </div>
        </AnimatePresence>,
        document.body
    );
}
