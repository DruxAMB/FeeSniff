"use client";

import { useState, useEffect, useRef } from "react";
import ClaimModal from "./DailyClaim";
import { useWallet } from "@/lib/useWallet";
import { getClaimContractReadOnly } from "@/lib/claim";
import { GiftIcon } from "lucide-react";

export default function ClaimWrapper() {
    const [isOpen, setIsOpen] = useState(false);
    const { address, isConnected, isOnBase } = useWallet();
    const hasAutoOpened = useRef(false);

    // ─── Auto-open Logic ────────────────────────────────────
    useEffect(() => {
        let isMounted = true;

        const checkClaimStatus = async () => {
            // Only check if they are fully connected and we haven't popped it yet
            if (!isConnected || !isOnBase || !address || hasAutoOpened.current) return;

            try {
                const contract = getClaimContractReadOnly();
                const isPaused = await contract.paused();
                if (isPaused) return;

                const canClaim = await contract.canClaim(address);

                // If they have a claim ready, pop it open!
                if (isMounted && canClaim) {
                    setIsOpen(true);
                    hasAutoOpened.current = true;
                }
            } catch (err) {
                console.error("Failed to check auto-claim status:", err);
            }
        };

        // Add a small delay so it doesn't jarringly pop up the millisecond the page loads
        const timer = setTimeout(() => {
            checkClaimStatus();
        }, 1500);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [address, isConnected, isOnBase]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1 text-xs font-medium transition-colors opacity-60 hover:opacity-100 cursor-pointer"
                style={{ color: "var(--text-primary)" }}
            >
                <GiftIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Claim</span>
            </button>

            <ClaimModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
