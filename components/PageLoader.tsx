"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function PageLoader() {
    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-bg-primary">
            <div className="relative flex flex-col items-center">
                {/* Animated Rings */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-[-40px] rounded-full border border-primary/30"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.05, 0.1, 0.05],
                    }}
                    transition={{
                        duration: 2,
                        delay: 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-[-80px] rounded-full border border-primary/20"
                />

                {/* Logo Container */}
                <motion.div
                    animate={{
                        y: [0, -10, 0],
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="relative z-10"
                >
                    <div className="p-4 rounded-3xl bg-secondary shadow-2xl border border-(--border-subtle)">
                        <Image
                            src="/nosey.png"
                            alt="Loading..."
                            width={80}
                            height={80}
                            className="rounded-2xl"
                            priority
                        />
                    </div>
                </motion.div>

                {/* Sniffing Text */}
                <motion.p
                    animate={{
                        opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="mt-12 text-xs font-black tracking-[0.2em] uppercase text-muted"
                >
                    Sniffing Data
                </motion.p>
            </div>
        </div>
    );
}
