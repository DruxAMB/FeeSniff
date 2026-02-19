"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import ResultsView from "@/components/ResultsView";
import SkeletonLoader from "@/components/SkeletonLoader";
import SupportedPlatforms from "@/components/SupportedPlatforms";
import type { AnalysisResult, AnalysisError } from "@/lib/types";
import Image from "next/image";

// Example token on Base — a known taxed token for demo
const EXAMPLE_ADDRESS = "0xF35452565ABe5c1A81C8faA35169a754732b5B07";

type AppState = "search" | "loading" | "results" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("search");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (address: string, chain: string) => {
    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data as AnalysisError;
        setError(err.error || "Something went wrong");
        setState("error");
        return;
      }

      setResult(data as AnalysisResult);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to the server");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("search");
    setResult(null);
    setError("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* ── Persistent Hero & Search ─────────────────── */}
      <motion.div
        layout
        initial={false}
        className="text-center w-full max-w-2xl mb-8"
      >
        {state !== "results" && (
          <div className="mb-40">
            <SupportedPlatforms />
          </div>
        )}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image src="/logo.gif" height={100} width={100} alt="" className="rounded-xl" unoptimized />
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold mb-3 gradient-text">
          FeeSniff
        </h1>
        <p
          className="text-lg max-w-md mx-auto mb-10"
          style={{ color: "var(--text-secondary)" }}
        >
          See how much token creators earn in fees.
          <br />
          Paste a contract address to start sniffing.
        </p>

        <SearchBar onSubmit={handleSearch} isLoading={state === "loading"} />

        {state === "search" && (
          <button
            onClick={() => handleSearch(EXAMPLE_ADDRESS, "base")}
            className="mt-6 text-sm transition-colors cursor-pointer opacity-40 hover:opacity-100"
            style={{ color: "var(--text-muted)" }}
          >
            Try with an example token →
          </button>
        )}
      </motion.div>

      {/* ── Dropdown Result Area ──────────────────────── */}
      <div className="w-full max-w-3xl">
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <div className="pt-8 pb-12 flex flex-col items-center">
                <p className="text-sm font-medium mb-6 animate-pulse" style={{ color: "var(--text-muted)" }}>
                  🐕 Sniffing fees...
                </p>
                <SkeletonLoader />
              </div>
            </motion.div>
          )}

          {state === "results" && result && (
            <motion.div
              key="results"
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 pb-12">
                <ResultsView result={result} onBack={handleReset} />
              </div>
            </motion.div>
          )}

          {state === "error" && error && (
            <motion.div
              key="error"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6"
            >
              <div
                className="px-5 py-3 rounded-xl text-sm text-center border border-(--border-subtle)"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--status-red)",
                }}
              >
                {error}
              </div>
            </motion.div>
          )}

          {state === "search" && (
            <motion.div
              key="features"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full"
            >
              {[
                {
                  title: "Track Withdrawals",
                  desc: "See all fee withdrawals and transfers",
                },
                {
                  title: "Find Fee Wallets",
                  desc: "Identify where the creator's fees are being sent",
                },
                {
                  title: "Track Earnings",
                  desc: "See total ETH earned and recent fee transactions",
                },
              ].map((f, i) => (
                <div key={i} className="glass-card p-5 text-center">
                  <h3
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
