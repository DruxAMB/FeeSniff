export {};
import { ethers } from "ethers";

const TOKENS = [
  "0x79130B0B9B429aC0838F15f484577f746aAa1b07",
  "0x7D8e785cd9E6732b852f915453822Ac6d74Fab07",
  "0xc87f8a3a33159AF49B4927D006cbf95eBBdcEB07",
  "0x62998b11B6ae6A8D285cf36e37Be236Ca96CEB07",
  "0xab0F8882bA71A4A7549FdF2FAE8C63Ed3F513b07",
  "0x64664D1490b354eD2cfa67Ab17FeBAc7fFD4FB07",
  "0xaD9ab528508C995f011445FC7C70f232d7d3bb07"
];

const BLOCKSCOUT_API = "https://base.blockscout.com/api";

async function fetchTokenTrades(tokenCA: string) {
  // To get all transfers for a token on Blockscout V1, we use contractaddress.
  // Note: Some explorers require 'address' as well, so we use a common filter or the token itself.
  const url = `${BLOCKSCOUT_API}?module=account&action=tokentx&contractaddress=${tokenCA}&startblock=0&endblock=99999999&page=1&offset=500&sort=desc`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result;
    }
    // Fallback attempt if contractaddress filter is strict
    const fallbackUrl = `${BLOCKSCOUT_API}?module=account&action=tokentx&address=${tokenCA}&startblock=0&endblock=99999999&page=1&offset=500&sort=desc`;
    const fallbackRes = await fetch(fallbackUrl);
    const fallbackData = await fallbackRes.json();
    if (fallbackData.status === "1" && Array.isArray(fallbackData.result)) {
        return fallbackData.result;
    }
    return [];
  } catch (err) {
    console.error(`Error fetching trades for ${tokenCA}:`, err);
    return [];
  }
}

async function sniff() {
  console.log(`\n🕵️  Sniffing trades for ${TOKENS.length} tokens...\n`);
  
  const walletAcrossTokens: Record<string, Set<string>> = {};

  for (const token of TOKENS) {
    console.log(`\n🔍 Checking Token: ${token}`);
    const trades = await fetchTokenTrades(token);
    
    // Capture both from and to to find all unique wallets involved
    const walletsFound = new Set<string>();
    trades.forEach((t: any) => {
        // Exclude the token contract itself and common null address
        const from = t.from.toLowerCase();
        const to = t.to.toLowerCase();
        const tokenLower = token.toLowerCase();
        
        if (from !== tokenLower && from !== "0x0000000000000000000000000000000000000000") walletsFound.add(from);
        if (to !== tokenLower && to !== "0x0000000000000000000000000000000000000000") walletsFound.add(to);
    });

    const uniqueWallets = Array.from(walletsFound);
    console.log(`📊 Found ${uniqueWallets.length} unique wallet addresses in recent trades.`);
    if (uniqueWallets.length > 0) {
        console.log(`📝 Sample addresses checked: ${uniqueWallets.slice(0, 3).join(', ')}...`);
    }
    
    uniqueWallets.forEach((wallet: string) => {
      if (!walletAcrossTokens[wallet]) {
        walletAcrossTokens[wallet] = new Set();
      }
      walletAcrossTokens[wallet].add(token.toLowerCase());
    });
    
    // Add a small delay for API safety
    await new Promise(r => setTimeout(r, 200));
  }

  const returningWallets = Object.entries(walletAcrossTokens)
    .filter(([_, tokens]) => tokens.size > 1)
    .sort((a, b) => b[1].size - a[1].size);

  console.log("\n📈 RESULTS: Returning Wallets Found");
  console.log("------------------------------------------");
  
  if (returningWallets.length === 0) {
    console.log("No wallets found across multiple tokens.");
  } else {
    returningWallets.forEach(([wallet, tokens]) => {
      console.log(`\nAddress: ${wallet}`);
      console.log(`Frequency: Seen in ${tokens.size} / ${TOKENS.length} tokens`);
      console.log(`Tokens: ${Array.from(tokens).join(', ')}`);
    });
  }
  
  console.log("------------------------------------------\n");
}

sniff();
