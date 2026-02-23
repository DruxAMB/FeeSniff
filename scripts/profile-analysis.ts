/**
 * Profile script — times each step of analyzeToken for a given address.
 * Usage: npx tsx scripts/profile-analysis.ts <token_address>
 */
import { ethers } from "ethers";
import { getChain, CHAINS } from "../lib/chains";

const TOKEN = process.argv[2] || "0xC1299846f3523fB6c9C3f3fd6122a602855f3b07";
const CHAIN_ID = "base";

// ── Minimal reimports from analyzer to profile each step ──

const chain = getChain(CHAIN_ID)!;
const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
const V4_MANAGER = "0x498581ff718922c3f8e6a244956af099b2652b2b";

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`  ✓ ${label}: ${elapsed}s`);
    return result;
  } catch (err: any) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`  ✗ ${label}: ${elapsed}s (ERROR: ${err.message?.slice(0, 60)})`);
    throw err;
  }
}

async function explorerFetch(params: Record<string, string>) {
  const blockscoutV1 = chain.blockscoutApi.replace("/v2", "");
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${blockscoutV1}?${query}`);
  return res.json();
}

async function main() {
  console.log(`\n🔍 Profiling analysis for: ${TOKEN}`);
  console.log(`Chain: ${chain.name}\n`);
  const totalStart = Date.now();

  // ── Step 1: Contract Source ──
  console.log("Step 1: Contract Source");
  const source = await time("getContractSource (Etherscan)", async () => {
    const query = new URLSearchParams({
      module: "contract",
      action: "getsourcecode",
      address: TOKEN,
    }).toString();
    const res = await fetch(`https://api.etherscan.io/v2/api?chainid=8453&${query}`);
    return res.json();
  });
  const verified = source?.result?.[0]?.ABI && source.result[0].ABI !== "Contract source code not verified";
  console.log(`    Verified: ${verified}\n`);

  // ── Step 2: Token Info + Deployer ──
  console.log("Step 2: Token Info + Deployer (parallel)");
  const [tokenInfo, deployer] = await Promise.all([
    time("getTokenInfo (RPC)", async () => {
      const contract = new ethers.Contract(TOKEN, [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function decimals() view returns (uint8)",
      ], provider);
      const [name, symbol] = await Promise.all([contract.name(), contract.symbol()]);
      return { name, symbol };
    }),
    time("getDeployer (Etherscan)", async () => {
      const data = await explorerFetch({
        module: "contract",
        action: "getcontractcreation",
        contractaddresses: TOKEN,
      });
      return data?.result?.[0]?.contractCreator || null;
    }),
  ]);
  console.log(`    Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
  console.log(`    Deployer: ${deployer}\n`);

  // ── Step 3: Tax Rates + Fee Wallets ──
  console.log("Step 3: Tax Rates + Fee Wallets (parallel)");
  let abi: any[] = [];
  if (verified && source.result[0].ABI) {
    try { abi = JSON.parse(source.result[0].ABI); } catch {}
  }
  const feeWalletCount = await time("detectFeeWallets", async () => {
    if (!abi.length) return 0;
    const iface = new ethers.Interface(abi);
    const knownGetters = [
      "marketingWallet", "_taxWallet", "taxWallet", "feeReceiver", "feeRecipient",
      "devWallet", "taxAddress",
    ];
    const existing = knownGetters.filter(name => {
      try { iface.getFunction(name); return true; } catch { return false; }
    });
    const contract = new ethers.Contract(TOKEN, abi, provider);
    const results = await Promise.allSettled(existing.map(n => contract[n]()));
    return results.filter(r => r.status === "fulfilled").length;
  });
  console.log(`    Fee wallets found: ${feeWalletCount}\n`);

  // ── Step 4: Find LP Pool ──
  console.log("Step 4: Find LP Pool (all in parallel)");
  const poolAddress = await time("findLPPool", async () => {
    // Check allData first (Clanker)
    if (abi.some((f: any) => f.name === "allData")) {
      try {
        const contract = new ethers.Contract(TOKEN, ["function allData() view returns (tuple(address,address,uint256,uint256,uint256,uint256))"], provider);
        const data = await contract.allData();
        if (data?.[0] && data[0] !== ethers.ZeroAddress) return data[0];
      } catch {}
    }

    // Parallel V3 + Aerodrome + V4
    const UNI_V3_FEES = [10000, 3000, 500, 100];
    const AERO_TICKS = [200, 100, 50, 10, 1];
    const v3Factory = new ethers.Contract(chain.uniV3Factory, ["function getPool(address,address,uint24) view returns (address)"], provider);
    const aeroFactory = new ethers.Contract("0x5e7913A4DA51ad571d76c625Bc283b0B20a84493", ["function getPool(address,address,int24) view returns (address)"], provider);

    const promises = [
      ...UNI_V3_FEES.map(f => v3Factory.getPool(TOKEN, chain.wethAddress, f).catch(() => ethers.ZeroAddress)),
      ...AERO_TICKS.map(t => aeroFactory.getPool(TOKEN, chain.wethAddress, t).catch(() => ethers.ZeroAddress)),
      explorerFetch({
        module: "account", action: "tokentx",
        address: V4_MANAGER, contractaddress: TOKEN,
        page: "1", offset: "1", sort: "desc",
      }).then((d: any) => d.status === "1" && d.result?.length > 0 ? V4_MANAGER : ethers.ZeroAddress).catch(() => ethers.ZeroAddress),
    ];

    const results = await Promise.allSettled(promises);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value && r.value !== ethers.ZeroAddress) {
        return r.value;
      }
    }
    return null;
  });
  const isV4 = poolAddress?.toLowerCase() === V4_MANAGER.toLowerCase();
  console.log(`    Pool: ${poolAddress || "none"} ${isV4 ? "(V4)" : ""}\n`);

  // ── Step 5: The Big Parallel Batch ──
  console.log("Step 5: Revenue + Trades + Volume (parallel)");
  
  // 5a: Token Trades
  const tradeCount = await time("fetchTokenTrades (500 latest)", async () => {
    const data = await explorerFetch({
      module: "account", action: "tokentx", contractaddress: TOKEN,
      startblock: "0", endblock: "99999999", page: "1", offset: "500", sort: "desc",
    });
    return data?.result?.length || 0;
  });
  console.log(`    Trades returned: ${tradeCount}`);

  // 5b: Revenue (includes getFeeWalletIncome which calls Blockscout)
  if (isV4) {
    // Per-token via ClaimedRewards
    await time("fetchClaimedRewardsForToken (chunked RPC)", async () => {
      const blockscoutV1 = chain.blockscoutApi.replace("/v2", "");
      const tokTxRes = await fetch(`${blockscoutV1}?module=account&action=tokentx&contractaddress=${TOKEN}&page=1&offset=1&sort=asc`);
      const tokTxData = await tokTxRes.json();
      const creationBlock = tokTxData?.result?.[0]?.blockNumber ? parseInt(tokTxData.result[0].blockNumber) : 0;
      if (!creationBlock) return { events: 0, chunks: 0 };
      
      const currentBlock = await provider.getBlockNumber();
      const CHUNK = 49999;
      const lockers = [chain.clankerLockerFeeConversion, chain.clankerLpLocker].filter(Boolean) as string[];
      const topic0 = "0x21d15f71483b597e8f0009e83b90b2117f6f98c185d7173857dddcae5eb8546a";
      const topic1 = ethers.zeroPadValue(TOKEN.toLowerCase(), 32);
      
      let events = 0;
      let chunks = 0;
      for (const addr of lockers) {
        let from = creationBlock;
        while (from <= currentBlock) {
          const to = Math.min(from + CHUNK, currentBlock);
          try {
            const logs = await provider.getLogs({ address: addr, topics: [topic0, topic1], fromBlock: from, toBlock: to });
            events += logs.length;
          } catch {}
          chunks++;
          from = to + 1;
        }
      }
      return { events, chunks };
    });

    // Global via Blockscout
    await time("getFeeWalletIncome (Blockscout global)", async () => {
      // Simulate: fetch WETH transfers to deployer
      if (!deployer) return 0;
      const data = await explorerFetch({
        module: "account", action: "tokentx",
        address: deployer,
        contractaddress: chain.wethAddress,
        page: "1", offset: "100", sort: "desc",
      });
      return data?.result?.length || 0;
    });
  } else {
    await time("getFeeWalletIncome (Blockscout transfers)", async () => {
      if (!deployer) return 0;
      const url = `${chain.blockscoutApi}/addresses/${deployer}/token-transfers?type=ERC-20&filter=to&token=${chain.wethAddress}`;
      const res = await fetch(url);
      const data = await res.json();
      return data?.items?.length || 0;
    });
  }

  // 5c: Volume
  if (isV4) {
    const volResult = await time("fetchTotalVolume (V4 — tokentx pagination + per-tx WETH lookup)", async () => {
      let allResults: any[] = [];
      let page = 1;
      const MAX_PAGES = 50;
      const blockscoutV1 = chain.blockscoutApi.replace("/v2", "");
      
      while (page <= MAX_PAGES) {
        const pageStart = Date.now();
        const url = `${blockscoutV1}?module=account&action=tokentx&address=${V4_MANAGER}&contractaddress=${TOKEN}&page=${page}&offset=100&sort=asc`;
        const res = await fetch(url);
        const data = await res.json();
        const pageTime = ((Date.now() - pageStart) / 1000).toFixed(2);
        
        if (data.status !== "1" || !data.result?.length) {
          console.log(`      Page ${page}: 0 results (${pageTime}s) — DONE`);
          break;
        }
        console.log(`      Page ${page}: ${data.result.length} results (${pageTime}s)`);
        allResults.push(...data.result);
        if (data.result.length < 100) break;
        page++;
      }
      
      const txHashes = [...new Set(allResults.map((r: any) => r.hash))];
      console.log(`      Unique tx hashes: ${txHashes.length}`);
      
      // Time the WETH lookups
      const lookupStart = Date.now();
      let looked = 0;
      const BATCH = 5;
      for (let i = 0; i < txHashes.length; i += BATCH) {
        const batch = txHashes.slice(i, i + BATCH);
        await Promise.all(batch.map(async (hash: string) => {
          try {
            const res = await fetch(`${chain.blockscoutApi}/transactions/${hash}/token-transfers`);
            await res.json();
            looked++;
          } catch {}
        }));
      }
      const lookupTime = ((Date.now() - lookupStart) / 1000).toFixed(2);
      console.log(`      WETH lookups: ${looked} txs in ${lookupTime}s`);
      
      return { pages: page, uniqueTxs: txHashes.length };
    });
  } else if (poolAddress) {
    await time("fetchPoolVolume (Blockscout)", async () => {
      const baseUrl = `${chain.blockscoutApi}/addresses/${poolAddress}/token-transfers`;
      let totalPages = 0;
      for (const filter of ["to", "from"]) {
        let url: string | null = `${baseUrl}?type=ERC-20&filter=${filter}&token=${chain.wethAddress}`;
        let pages = 0;
        while (url && pages < 3) {
          const fetchRes: Response = await fetch(url);
          const fetchData: any = await fetchRes.json();
          totalPages++;
          pages++;
          url = fetchData.next_page_params ? `${baseUrl}?type=ERC-20&filter=${filter}&token=${chain.wethAddress}&block_number=${fetchData.next_page_params.block_number}&index=${fetchData.next_page_params.index}&items_count=${fetchData.next_page_params.items_count}` : null;
        }
      }
      return totalPages;
    });
  }

  const totalTime = ((Date.now() - totalStart) / 1000).toFixed(2);
  console.log(`\n⏱️  TOTAL: ${totalTime}s\n`);
}

main().catch(console.error);
