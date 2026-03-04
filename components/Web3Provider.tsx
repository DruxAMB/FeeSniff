"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
    getDefaultConfig,
    RainbowKitProvider,
    darkTheme,
    lightTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const config = getDefaultConfig({
    appName: "TokenSniff",
    projectId: "f056c34f1ad5256b5fcea43799f39a46",
    chains: [base],
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={
                        mounted
                            ? resolvedTheme === "dark"
                                ? darkTheme({
                                    accentColor: "var(--accent-primary)",
                                    accentColorForeground: "white",
                                    borderRadius: "large",
                                })
                                : lightTheme({
                                    accentColor: "var(--accent-primary)",
                                    accentColorForeground: "white",
                                    borderRadius: "large",
                                })
                            : darkTheme()
                    }
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
