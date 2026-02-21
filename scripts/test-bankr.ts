import { analyzeToken } from "@/lib/analyzer";
import { CHAINS } from "@/lib/chains";

async function test() {
  const tokenAddress = "0x23FDa67Ed8442C058766d24AC5228f03F079bBa3";
  const chainId = "base";

  console.log(`\n🔍 Testing Bankr analysis for: ${tokenAddress} on ${chainId}...`);

  try {
    const result = await analyzeToken(tokenAddress, chainId);

    console.log("\n✅ Analysis Complete!");
    console.log("------------------------------------------");
    console.log(`Token: ${result.token.name} (${result.token.symbol})`);
    console.log(`Platform: ${result.platform}`);
    console.log(`Sub-Platform: ${result.subPlatform}`);
    console.log(`Verified: ${result.contractVerified}`);
    
    console.log("\n💰 Fee Wallets detected:");
    result.feeWallets.forEach(w => {
        console.log(`- [${w.label}] ${w.address}`);
    });

    console.log("\n📈 Revenue Summary:");
    console.log(`Total ETH: ${result.feeIncome.totalEth}`);
    console.log(`Unclaimed ETH: ${result.feeIncome.unclaimedEth}`);
    console.log("------------------------------------------\n");

    if (result.platform === "bankr") {
        console.log("🎉 SUCCESS: Token correctly identified as Bankr platform.");
    } else {
        console.log("❌ FAILURE: Token NOT identified as Bankr platform.");
        process.exit(1);
    }

  } catch (error) {
    console.error("\n❌ Error during test:", error);
    process.exit(1);
  }
}

test();
