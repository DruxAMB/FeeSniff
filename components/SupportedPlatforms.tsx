"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ECOSYSTEMS = [
    "Clanker",
    "Wow (Zora)",
    "Bankr"
];

export default function SupportedPlatforms() {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative flex flex-col items-center mb-6" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-[10px] tracking-widest font-black transition-all hover:opacity-100 opacity-40 flex items-center gap-1 cursor-pointer group z-102"
                style={{ color: "var(--text-primary)" }}
            >
                <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    className="inline-block"
                >
                    +
                </motion.span>
                supported eco
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full mt-4 z-101 w-[280px] sm:w-[320px]"
                    >
                        <div
                            className="p-5 rounded-2xl border border-(--border-subtle) shadow-2xl"
                            style={{ background: "var(--bg-secondary)" }}
                        >
                            <div className="flex flex-wrap gap-1.5 mb-5">
                                {ECOSYSTEMS.map((eco) => (
                                    <span
                                        key={eco}
                                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-(--border-subtle)"
                                        style={{
                                            background: "var(--bg-primary)",
                                            color: "var(--text-secondary)"
                                        }}
                                    >
                                        {eco.toLowerCase()}
                                    </span>
                                ))}
                            </div>

                            <p
                                className="text-[9px] leading-relaxed font-bold opacity-30 tracking-tight"
                                style={{ color: "var(--text-primary)" }}
                            >
                                support for a service does not imply affiliation,
                                endorsement, or any form of support other than
                                technical compatibility.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
