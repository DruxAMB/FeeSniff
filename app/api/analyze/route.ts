import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { analyzeToken } from "@/lib/analyzer";
import { getChain } from "@/lib/chains";
import type { AnalysisError } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, chain: chainId } = body as {
      address?: string;
      chain?: string;
    };

    // Validate address
    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Contract address is required", code: "INVALID_ADDRESS" } satisfies AnalysisError,
        { status: 400 }
      );
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid contract address format", code: "INVALID_ADDRESS" } satisfies AnalysisError,
        { status: 400 }
      );
    }

    // Validate chain
    const resolvedChain = chainId || "base";
    const chainConfig = getChain(resolvedChain);
    if (!chainConfig) {
      return NextResponse.json(
        { error: `Unsupported chain: ${resolvedChain}`, code: "API_ERROR" } satisfies AnalysisError,
        { status: 400 }
      );
    }

    if (!chainConfig.enabled) {
      return NextResponse.json(
        { error: `${chainConfig.name} support is coming soon`, code: "API_ERROR" } satisfies AnalysisError,
        { status: 400 }
      );
    }

    // Run analysis
    const checksumAddress = ethers.getAddress(address);
    const result = await analyzeToken(checksumAddress, resolvedChain);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/analyze] Error:", err);

    const message = err instanceof Error ? err.message : "An unexpected error occurred";

    // Detect rate limiting
    if (message.includes("rate") || message.includes("limit")) {
      return NextResponse.json(
        { error: "API rate limited. Please try again in a moment.", code: "RATE_LIMITED" } satisfies AnalysisError,
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: message, code: "API_ERROR" } satisfies AnalysisError,
      { status: 500 }
    );
  }
}
