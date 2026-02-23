"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";

export default function TermsOfService() {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-[10px] tracking-widest font-black transition-all hover:opacity-100 opacity-40 flex items-center justify-center gap-1 cursor-pointer group uppercase mx-auto"
                style={{ color: "var(--text-primary)" }}
            >
                Terms of Service
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col rounded-3xl border border-(--border-subtle) shadow-2xl relative"
                            style={{ background: "var(--bg-secondary)" }}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-(--border-subtle) flex items-center justify-between sticky top-0 z-10" style={{ background: "var(--bg-secondary)" }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-bold gradient-text">Terms of Service</h2>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                                >
                                    <X className="h-5 w-5 opacity-40" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <div className="space-y-6 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                    <section>
                                        <h3 className="text-white font-bold mb-2 uppercase tracking-tight text-xs opacity-80">1. Accuracy of Data</h3>
                                        <p>
                                            tokenSniff provides information based on publicly available onchain data. Identifying fee wallets, tax rates, and trading volume is a heuristic process and may not always be 100% accurate. Onchain data can be complex, and we do not guarantee the completeness or precision of any analysis.
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="text-white font-bold mb-2 uppercase tracking-tight text-xs opacity-80">2. No Financial Advice</h3>
                                        <p>
                                            The content and analysis provided by tokenSniff are for informational purposes only. Nothing on this platform constitutes financial, investment, or legal advice. Always do your own research (DYOR) before interacting with any smart contract or investing in any token.
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="text-white font-bold mb-2 uppercase tracking-tight text-xs opacity-80">3. Limitation of Liability</h3>
                                        <p>
                                            tokenSniff and its developers are not responsible for any financial losses, damages, or liabilities arising from the use of this tool. You use this platform and interact with cryptocurrency at your own risk.
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="text-white font-bold mb-2 uppercase tracking-tight text-xs opacity-80">4. User Responsibility</h3>
                                        <p>
                                            Users are solely responsible for verifying the code and legitimacy of any smart contract they choose to interact with. tokenSniff is a tool for exploration and analysis, not a safety guarantee.
                                        </p>
                                    </section>

                                    <div className="pt-4 opacity-30 text-[10px] font-bold uppercase tracking-widest text-center">
                                        Last Updated: February 2026
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
