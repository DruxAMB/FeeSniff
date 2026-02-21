import { ethers } from "ethers";
import type {
  ChainConfig,
  TokenInfo,
  TaxRates,
  FeeWallet,
  FeeIncome,
  FeeTransaction,
  AnalysisResult,
} from "./types";
import { getChain, ETHERSCAN_V2_API } from "./chains";

// ─── Common fee-related getter names ────────────────────────
// These are tried in order against the contract ABI to detect fee wallets & tax rates.

const FEE_WALLET_GETTERS = [
  "marketingWallet",
  "_taxWallet",
  "taxWallet",
  "feeReceiver",
  "feeRecipient",
  "devWallet",
  "taxAddress",
  "_feeAddress",
  "feeAddress",
  "treasuryWallet",
  "treasury",
  "_marketingWallet",
  "_devWallet",
  "operationsWallet",
  "teamWallet",
  "revenueWallet",
  "_treasuryWallet",
  "walletMarketing",
  "walletDev",
  "walletTax",
  "developmentWallet",
  "charityWallet",
  "buybackWallet",
  "admin",
  "originalAdmin",
];

// Functions to skip when scanning ABI for address-returning functions
const SKIP_ADDRESS_FUNCTIONS = new Set([
  "owner",
  "name",
  "symbol",
  "totalSupply",
  "decimals",
  "balanceOf",
  "allowance",
  "getApproved",
  "isApprovedForAll",
  "supportsInterface",
  "delegates",
  "nonces",
  "DOMAIN_SEPARATOR",
  "CLOCK_MODE",
  "eip712Domain",
  "context",
]);

const BUY_TAX_GETTERS = [
  "buyTax",
  "_buyTax",
  "buyFee",
  "_buyFee",
  "buyTotalFees",
  "_totalBuyFee",
  "totalBuyFee",
  "totalBuyFees",
  "_taxBuy",
  "taxBuy",
  "buyMarketingFee",
  "_buyMarketingFee",
  "BuyFee",
  "buyfee",
  "_buyTotalFees",
];

const SELL_TAX_GETTERS = [
  "sellTax",
  "_sellTax",
  "sellFee",
  "_sellFee",
  "sellTotalFees",
  "_totalSellFee",
  "totalSellFee",
  "totalSellFees",
  "_taxSell",
  "taxSell",
  "sellMarketingFee",
  "_sellMarketingFee",
  "SellFee",
  "sellfee",
  "_sellTotalFees",
];

// Etherscan V2: single API key for all chains
const ETHERSCAN_API_KEY = (process.env.ETHERSCAN_API_KEY || "").replace(/"/g, "");

// Bankr Platform Constants
const BANKR_DEPLOYER = "0x2112b8456AC07c15fA31ddf3Bf713E77716fF3F9";
const DOPPLER_DEPLOYER_OLD = "0xA36715dA46Ddf4A769f3290f49AF58bF8132ED8E";
const DOPPLER_DEPLOYER_NEW = "0xD59cE43E53D69F190E15d9822Fb4540dCcc91178";
const BANKR_FEE_WALLET = "0xF60633D02690e2A15A54AB919925F3d038Df163e";

const BANKR_DEPLOYERS = [
  BANKR_DEPLOYER.toLowerCase(),
  DOPPLER_DEPLOYER_OLD.toLowerCase(),
  DOPPLER_DEPLOYER_NEW.toLowerCase()
];

const V4_MANAGER = "0x498581fF718922c3f8e6A244956af099B2652b2b";

async function explorerFetch(
  chain: ChainConfig,
  params: Record<string, string>
): Promise<unknown> {
  // Use Blockscout V1 API if available (Etherscan compatible)
  const blockscoutV1 = chain.blockscoutApi?.replace("/v2", "");
  const query = new URLSearchParams(params).toString();
  
  if (blockscoutV1) {
    const url = `${blockscoutV1}?${query}`;
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch {}
  }

  // Fallback to Etherscan
  const url = `${ETHERSCAN_V2_API}?chainid=${chain.chainId}&${query}&apikey=${ETHERSCAN_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Explorer API returned ${res.status}`);
  return res.json();
}

// ─── Contract source / ABI ──────────────────────────────────

type ContractSourceResult = {
  abi: ethers.InterfaceAbi;
  sourceName: string;
  verified: boolean;
};

export async function getContractSource(
  address: string,
  chain: ChainConfig
): Promise<ContractSourceResult> {
  const url = `${chain.blockscoutApi}/smart-contracts/${address}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Fallback to Etherscan if Blockscout fails
      return getContractSourceEtherscan(address, chain);
    }
    const data = await res.json();
    return {
      abi: data.abi ? JSON.parse(data.abi) : [],
      sourceName: data.name || "",
      verified: !!data.is_verified,
    };
  } catch (err) {
    return getContractSourceEtherscan(address, chain);
  }
}

async function getContractSourceEtherscan(
  address: string,
  chain: ChainConfig
): Promise<ContractSourceResult> {
  try {
    const data = (await explorerFetch(chain, {
      module: "contract",
      action: "getsourcecode",
      address,
    })) as { status: string; message: string; result: Array<{ ABI: string; ContractName: string }> };

    if (data.status !== "1" || !data.result?.[0]) {
      return { abi: [], sourceName: "", verified: false };
    }

    const entry = data.result[0];
    if (entry.ABI === "Contract source code not verified") {
      return { abi: [], sourceName: entry.ContractName || "", verified: false };
    }

    const abi = JSON.parse(entry.ABI);
    return { abi, sourceName: entry.ContractName || "", verified: true };
  } catch {
    return { abi: [], sourceName: "", verified: false };
  }
}

// ─── Token info ─────────────────────────────────────────────

export async function getTokenInfo(
  address: string,
  chain: ChainConfig
): Promise<TokenInfo> {
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const minAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function owner() view returns (address)",
  ];
  const contract = new ethers.Contract(address, minAbi, provider);

  const results = await Promise.allSettled([
    contract.name(),
    contract.symbol(),
    contract.totalSupply(),
    contract.decimals(),
    contract.owner(),
  ]);

  const labels = ["name", "symbol", "totalSupply", "decimals", "owner"];

  const val = (i: number): string => {
    const r = results[i];
    return r.status === "fulfilled" ? String(r.value) : "";
  };

  const decimals = results[3].status === "fulfilled" ? Number(results[3].value) : 18;
  const rawSupply = results[2].status === "fulfilled" ? results[2].value as bigint : 0n;

  return {
    name: val(0) || "Unknown",
    symbol: val(1) || "???",
    totalSupply: rawSupply ? ethers.formatUnits(rawSupply, decimals) : "0",
    owner: val(4) || ethers.ZeroAddress,
  };
}

// ─── Deployer detection ─────────────────────────────────────

export async function getDeployer(
  address: string,
  chain: ChainConfig
): Promise<{ deployer: string; deployedAt: string } | null> {
  const url = `${chain.blockscoutApi}/addresses/${address}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
        const data = await res.json();
        if (data.creator_address_hash) {
            let deployedAt = "";
            if (data.creation_tx_hash) {
                try {
                    const txUrl = `${chain.blockscoutApi}/transactions/${data.creation_tx_hash}`;
                    const txRes = await fetch(txUrl);
                    const txData = await txRes.json();
                    if (txData.timestamp) {
                        deployedAt = new Date(txData.timestamp).toISOString();
                    }
                } catch {}
            }
            return {
                deployer: ethers.getAddress(data.creator_address_hash),
                deployedAt
            };
        }
    }
  } catch {}

  // Try Blockscout V1 getcontractcreation
  try {
    const data = (await explorerFetch(chain, {
      module: "contract",
      action: "getcontractcreation",
      contractaddresses: address,
    })) as { status: string; result: Array<{ contractCreator: string; txHash: string; timeStamp?: string }> };

    if (data.status === "1" && data.result?.[0]) {
      const creator = data.result[0].contractCreator;
      let deployedAt = "";
      if (data.result[0].timeStamp) {
          deployedAt = new Date(parseInt(data.result[0].timeStamp) * 1000).toISOString();
      }
      return { deployer: creator, deployedAt };
    }
  } catch {}
  
  return null;
}

// ─── Tax rate detection ─────────────────────────────────────

export async function detectTaxRates(
  abi: ethers.InterfaceAbi,
  address: string,
  chain: ChainConfig
): Promise<TaxRates | null> {
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

  // Build an interface from the ABI to check what functions exist
  let iface: ethers.Interface;
  try {
    iface = new ethers.Interface(abi as ethers.InterfaceAbi);
  } catch {
    return null;
  }

  const contract = new ethers.Contract(address, abi, provider);

  async function tryGetters(names: string[]): Promise<number | null> {
    for (const name of names) {
      try {
        // Check if function exists in ABI
        iface.getFunction(name);
        const val = await contract[name]();
        const num = Number(val);
        if (!isNaN(num) && num >= 0 && num <= 100) {
          return num;
        }
      } catch {
        // Getter doesn't exist or failed — try next
      }
    }
    return null;
  }

  const [buyTax, sellTax] = await Promise.all([
    tryGetters(BUY_TAX_GETTERS),
    tryGetters(SELL_TAX_GETTERS),
  ]);

  if (buyTax === null && sellTax === null) return null;

  return {
    buyTax: buyTax ?? 0,
    sellTax: sellTax ?? 0,
  };
}

// ─── Fee wallet detection ───────────────────────────────────

function humanizeGetterName(name: string): string {
  return name
    .replace(/^_/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export async function detectFeeWallets(
  abi: ethers.InterfaceAbi,
  address: string,
  chain: ChainConfig
): Promise<FeeWallet[]> {
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const contract = new ethers.Contract(address, abi, provider);

  let iface: ethers.Interface;
  try {
    iface = new ethers.Interface(abi as ethers.InterfaceAbi);
  } catch {
    return [];
  }

  // Log all available functions for debugging
  const allFunctions = iface.fragments
    .filter((f): f is ethers.FunctionFragment => f.type === "function")
    .map((f) => f.name);

  const wallets: FeeWallet[] = [];
  const seen = new Set<string>();

  const addWallet = (addr: string, label: string) => {
    const lower = addr.toLowerCase();
    if (
      ethers.isAddress(lower) &&
      lower !== ethers.ZeroAddress.toLowerCase() &&
      lower !== address.toLowerCase() && // Skip the token contract itself
      !seen.has(lower)
    ) {
      seen.add(lower);
      wallets.push({ address: ethers.getAddress(lower), label });
    }
  };

  // Pass 1: Try known fee wallet getter names
  for (const getterName of FEE_WALLET_GETTERS) {
    try {
      iface.getFunction(getterName);
      const result = await contract[getterName]();
      addWallet(String(result), humanizeGetterName(getterName));
    } catch (err) {
      const msg = err instanceof Error ? err.message.substring(0, 80) : String(err);
      // Only log if the function exists in ABI (getFunction didn't throw)
      if (iface.hasFunction(getterName)) {
      }
    }
  }

  // Pass 2: If no known getters matched, scan ALL zero-arg functions that return an address
  if (wallets.length === 0) {
    for (const fragment of iface.fragments) {
      if (fragment.type !== "function") continue;
      const fn = fragment as ethers.FunctionFragment;
      // Accept view OR pure, and also try nonpayable (some admin getters aren't marked view)
      if (
        fn.inputs.length === 0 &&
        fn.outputs?.length === 1 &&
        fn.outputs[0].type === "address" &&
        !SKIP_ADDRESS_FUNCTIONS.has(fn.name)
      ) {
        try {
          const result = await contract[fn.name]();
          addWallet(String(result), humanizeGetterName(fn.name));
        } catch (err) {
        }
      }
    }
  }

  // Pass 3: Try reading proxy storage slots (EIP-1967) and allData()
  if (wallets.length === 0) {
    const ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
    try {
      const slotData = await provider.getStorage(address, ADMIN_SLOT);
      if (slotData && slotData !== ethers.ZeroHash) {
        const adminAddr = "0x" + slotData.slice(26); // Extract address from 32-byte slot
        addWallet(adminAddr, "Proxy Admin");
      }
    } catch {}

    // Try allData() — Clanker tokens often have this returning a tuple with creator info
    try {
      if (iface.hasFunction("allData")) {
        const allDataFn = iface.getFunction("allData");
        if (allDataFn && allDataFn.inputs.length === 0) {
          const result = await contract.allData();
          // Parse result: could be a tuple/array — scan for any address-like values
          const resultArray = Array.isArray(result) ? result : [result];
          for (const val of resultArray) {
            const strVal = String(val);
            if (ethers.isAddress(strVal)) {
              addWallet(strVal, "Creator (from allData)");
            }
          }
        }
      }
    } catch {}
  }

  return wallets;
}

// ─── DEX Pool Discovery ──────────────────────────────────────

const UNI_V3_FEE_TIERS = [100, 500, 3000, 10000];
const AERO_SLIPSTREAM_TICKS = [100, 200, 400, 500, 2000];

export async function findLPPool(
  tokenAddress: string,
  chain: ChainConfig
): Promise<string | null> {
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const token = tokenAddress.toLowerCase();
  const weth = chain.wethAddress.toLowerCase();

  // 1. Try Uniswap V3
  if (chain.uniV3Factory) {
    const factory = new ethers.Contract(chain.uniV3Factory, ["function getPool(address,address,uint24) view returns (address)"], provider);
    for (const fee of UNI_V3_FEE_TIERS) {
      try {
        const pool = await factory.getPool(token, weth, fee);
        if (pool && pool !== ethers.ZeroAddress) {
          return pool;
        }
      } catch {}
    }
  }

  // 2. Try Aerodrome Slipstream (Base specific)
  if (chain.id === "base") {
    const AERO_FACTORY = "0x5e7913A4DA51ad571d76c625Bc283b0B20a84493";
    const factory = new ethers.Contract(AERO_FACTORY, ["function getPool(address,address,int24) view returns (address)"], provider);
    for (const tick of AERO_SLIPSTREAM_TICKS) {
      try {
        const pool = await factory.getPool(token, weth, tick);
        if (pool && pool !== ethers.ZeroAddress) {
          return pool;
        }
      } catch {}
    }
  }

  // 3. Try Uniswap v4 detection (Look for interaction with PoolManager)
  // If we find transfers to the PoolManager, we treat the Manager as the "pool" for volume tracking
  try {
    const v4Data = (await explorerFetch(chain, {
      module: "account",
      action: "tokentx",
      address: V4_MANAGER,
      contractaddress: tokenAddress,
      page: "1",
      offset: "1",
      sort: "desc"
    })) as { status: string; result: any[] };

    if (v4Data.status === "1" && v4Data.result.length > 0) {
      return V4_MANAGER;
    }
  } catch {}

  return null;
}

// ─── Blockscout API helper ──────────────────────────────────

type BlockscoutTx = {
  hash: string;
  value: string;
  timestamp: string;
  status: string;
  from: { hash: string };
  to: { hash: string };
};

type BlockscoutResponse = {
  items: BlockscoutTx[];
  next_page_params: Record<string, string> | null;
};

async function fetchBlockscoutIncomingTxs(
  walletAddress: string,
  chain: ChainConfig
): Promise<{ txs: FeeTransaction[]; totalWei: bigint } | null> {
  const baseUrl = `${chain.blockscoutApi}/addresses/${walletAddress}/transactions`;
  let totalWei = 0n;
  const txs: FeeTransaction[] = [];
  const seenHashes = new Set<string>();
  const normalAddr = walletAddress.toLowerCase();

  let url: string | null = `${baseUrl}?filter=to`;
  let pages = 0;
  const MAX_PAGES = 5;

  try {
    while (url && pages < MAX_PAGES) {
      const res = await fetch(url);
      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as BlockscoutResponse;

      for (const tx of data.items) {
        if (
          tx.status === "ok" &&
          tx.to?.hash?.toLowerCase() === normalAddr &&
          tx.value &&
          BigInt(tx.value) > 0n
        ) {
          totalWei += BigInt(tx.value);
          if (!seenHashes.has(tx.hash)) {
            seenHashes.add(tx.hash);
            txs.push({
              hash: tx.hash,
              value: ethers.formatEther(tx.value),
              timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
              from: tx.from.hash,
            });
          }
        }
      }

      // Follow pagination
      if (data.next_page_params) {
        const params = new URLSearchParams();
        params.set("filter", "to");
        for (const [k, v] of Object.entries(data.next_page_params)) {
          params.set(k, String(v));
        }
        url = `${baseUrl}?${params.toString()}`;
      } else {
        url = null;
      }
      pages++;
    }

    return { txs, totalWei };
  } catch (err) {
    return null;
  }
}

// ─── Blockscout WETH token transfer tracking ────────────────

type BlockscoutTokenTransfer = {
  transaction_hash: string;
  timestamp: string;
  from: { hash: string };
  to: { hash: string };
  total: { value: string; decimals: string };
  token: { symbol: string; address_hash: string; decimals: string };
};

type BlockscoutTokenTransferResponse = {
  items: BlockscoutTokenTransfer[];
  next_page_params: Record<string, string> | null;
};

async function fetchBlockscoutWethTransfers(
  walletAddress: string,
  chain: ChainConfig,
  poolAddress?: string | null,
  tokenAddress?: string | null
): Promise<{ txs: FeeTransaction[]; totalWei: bigint } | null> {
  if (!chain.wethAddress) return null;

  const normalAddr = walletAddress.toLowerCase();
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const baseUrl = `${chain.blockscoutApi}/addresses/${walletAddress}/token-transfers`;
  let totalWei = 0n;
  const txs: FeeTransaction[] = [];
  const seenHashes = new Set<string>();

  let url: string | null = `${baseUrl}?type=ERC-20&filter=to&token=${chain.wethAddress}`;
  let pages = 0;
  const MAX_PAGES = 5;

  try {
    while (url && pages < MAX_PAGES) {
      const res = await fetch(url);
      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as BlockscoutTokenTransferResponse;

      for (const tx of data.items) {
        // If from Locker, we MUST check the transaction input to see if it targets THIS token
        // This is required to separate "Token Specific" claims from "All Wallet" claims.
        const isFromLocker = chain.clankerLocker && tx.from?.hash?.toLowerCase() === chain.clankerLocker.toLowerCase();
        
        // If we have a tokenAddress, it means we are in "Token Specific" mode.
        // We MUST filter Locker payouts by token if possible.
        if (tokenAddress && isFromLocker) {
          try {
            const txData = await provider.getTransaction(tx.transaction_hash);
            const input = txData?.data?.toLowerCase();
            
            if (input) {
              const tokenMatch = input.includes(tokenAddress.toLowerCase().substring(2));
              if (!tokenMatch) {
                // This was a claim for a DIFFERENT token
                continue;
              }
            }
          } catch (e) {
            // Error fetching tx data, fallback to keeping the transfer
          }
        }

        // If we have a poolAddress, we must also ensure non-locker transfers come from the pool
        if (poolAddress && !isFromLocker) {
          const isFromPool = tx.from?.hash?.toLowerCase() === poolAddress.toLowerCase();
          if (!isFromPool) continue;
        }

        if (
          tx.to?.hash?.toLowerCase() === normalAddr &&
          tx.total?.value &&
          BigInt(tx.total.value) > 0n
        ) {
          totalWei += BigInt(tx.total.value);
          if (!seenHashes.has(tx.transaction_hash)) {
            seenHashes.add(tx.transaction_hash);
            txs.push({
              hash: tx.transaction_hash,
              value: ethers.formatEther(tx.total.value),
              timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
              from: tx.from.hash,
            });
          }
        }
      }

      // Follow pagination
      if (data.next_page_params) {
        const params = new URLSearchParams();
        params.set("type", "ERC-20");
        params.set("filter", "to");
        params.set("token", chain.wethAddress);
        for (const [k, v] of Object.entries(data.next_page_params)) {
          params.set(k, String(v));
        }
        url = `${baseUrl}?${params.toString()}`;
      } else {
        url = null;
      }
      pages++;
    }

    return { txs, totalWei };
  } catch (err) {
    return null;
  }
}

// ─── Token Trade History (All Trades) ──────────────────────

export async function fetchTokenTrades(
  tokenAddress: string,
  chain: ChainConfig
): Promise<FeeTransaction[]> {
  try {
    const data = (await explorerFetch(chain, {
      module: "account",
      action: "tokentx",
      contractaddress: tokenAddress,
      startblock: "0",
      endblock: "99999999",
      page: "1",
      offset: "500",
      sort: "desc",
    })) as { status: string; result: any[] };

    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        value: ethers.formatUnits(tx.value, Number(tx.tokenDecimal || 18)),
        timestamp: Number(tx.timeStamp),
      }));
    }
  } catch (err) {
    console.error(`[Analyzer] Error fetching trades for ${tokenAddress}:`, err);
  }
  return [];
}

// ─── Pool Volume Tracker (WETH Focus) ──────────────────────

export async function fetchPoolVolume(
  poolAddress: string,
  chain: ChainConfig,
  tokenAddress?: string
): Promise<string> {
  if (!chain.wethAddress) return "0";
  
  const baseUrl = `${chain.blockscoutApi}/addresses/${poolAddress}/token-transfers`;
  let totalWei = 0n;
  
  // Standard Pool (v3/v2/Aerodrome): We check both TO and FROM the pool for WETH
  const filters = ["to", "from"];
  
  try {
    for (const filter of filters) {
      let url: string | null = `${baseUrl}?type=ERC-20&filter=${filter}&token=${chain.wethAddress}`;
      let pages = 0;
      const MAX_PAGES = 3;

      while (url && pages < MAX_PAGES) {
        const res = await fetch(url);
        if (!res.ok) break;

        const data = (await res.json()) as BlockscoutTokenTransferResponse;
        if (!data.items) break;

        for (const item of data.items) {
          totalWei += BigInt(item.total?.value || "0");
        }

        url = data.next_page_params 
          ? `${baseUrl}?type=ERC-20&filter=${filter}&token=${chain.wethAddress}&block_number=${data.next_page_params.block_number}&index=${data.next_page_params.index}&items_count=${data.next_page_params.items_count}`
          : null;
        pages++;
      }
    }
    
    return ethers.formatEther(totalWei);
  } catch (err) {
    console.error(`[Analyzer] Error fetching pool volume for ${poolAddress}:`, err);
  }
  return "0";
}

// ─── Total Lifetime Volume (Blockscout V1 + V2 Hybrid) ──────

export async function fetchTotalVolume(
  tokenAddress: string,
  chain: ChainConfig
): Promise<{ volumeEth: string; poolName: string }> {
  const weth = chain.wethAddress?.toLowerCase();
  if (!weth) return { volumeEth: "0", poolName: "" };

  const v1Url = chain.blockscoutApi?.replace("/v2", "") || "";
  const v2Url = chain.blockscoutApi;

  try {
    // Step 1: Use V1 API to get ALL token transfers involving V4_MANAGER
    // This captures every swap transaction for this token on Uniswap v4
    let allResults: Array<{ hash: string }> = [];
    let page = 1;
    const MAX_PAGES = 50;

    while (page <= MAX_PAGES) {
      const url = `${v1Url}?module=account&action=tokentx&address=${V4_MANAGER}&contractaddress=${tokenAddress}&page=${page}&offset=100&sort=asc`;
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json();
      if (data.status !== "1" || !data.result?.length) break;
      allResults.push(...data.result);
      if (data.result.length < 100) break; // last page
      page++;
    }

    // Get unique transaction hashes
    const txHashes = Array.from(new Set(allResults.map(r => r.hash)));
    if (txHashes.length === 0) return { volumeEth: "0", poolName: "" };

    // Step 2: For each unique tx, lookup WETH transfer amount via V2 API
    // Process in parallel batches of 5 for speed
    let totalWei = 0n;
    const BATCH_SIZE = 5;

    for (let i = 0; i < txHashes.length; i += BATCH_SIZE) {
      const batch = txHashes.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (hash) => {
          try {
            const res = await fetch(`${v2Url}/transactions/${hash}/token-transfers`);
            if (!res.ok) return 0n;
            const data = await res.json();
            let txWeth = 0n;
            for (const item of (data.items || [])) {
              if (item.token?.address_hash?.toLowerCase() === weth) {
                txWeth += BigInt(item.total?.value || "0");
              }
            }
            return txWeth;
          } catch {
            return 0n;
          }
        })
      );
      for (const w of results) totalWei += w;
    }

    return {
      volumeEth: ethers.formatEther(totalWei),
      poolName: "",
    };
  } catch (err) {
    console.error(`[Analyzer] Error fetching total volume:`, err);
    return { volumeEth: "0", poolName: "" };
  }
}

export async function getEthPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { ethereum: { usd: number } };
    return data.ethereum?.usd || null;
  } catch {
    return null;
  }
}

// Helper to get transaction data for filtering
async function getTransactionData(hash: string, chain: ChainConfig): Promise<string | null> {
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    const tx = await provider.getTransaction(hash);
    return tx?.data || null;
  } catch {
    return null;
  }
}

export async function getUnclaimedFees(
  walletAddress: string,
  tokenAddress: string,
  chain: ChainConfig
): Promise<{ unclaimedEth: string; unclaimedTokenAmount?: string; tokenSymbol?: string }> {
  if (!chain.clankerLocker) return { unclaimedEth: "0" };
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const locker = new ethers.Contract(
    chain.clankerLocker,
    ["function availableFees(address,address) view returns (uint256)"],
    provider
  );
  
  try {
    const [wethWei, tokenWei] = await Promise.all([
      locker.availableFees(walletAddress, chain.wethAddress),
      locker.availableFees(walletAddress, tokenAddress)
    ]);
    
    let tokenSymbol = "TOKENS";
    try {
      const token = new ethers.Contract(tokenAddress, ["function symbol() view returns (string)"], provider);
      tokenSymbol = await token.symbol();
    } catch {}

    return { 
      unclaimedEth: ethers.formatEther(wethWei),
      unclaimedTokenAmount: ethers.formatUnits(tokenWei, 18), // Clanker tokens are 18 decimals
      tokenSymbol 
    };
  } catch (err) {
    return { unclaimedEth: "0" };
  }
}

// ─── Fee wallet income tracking ─────────────────────────────

export async function getFeeWalletIncome(
  walletAddress: string,
  chain: ChainConfig,
  tokenAddress?: string | null,
  poolAddress?: string | null
): Promise<FeeIncome> {
  const emptyResult: FeeIncome = {
    totalEth: "0",
    totalUsd: null,
    unclaimedEth: "0",
    unclaimedUsd: null,
    txCount: 0,
    recentTxs: [],
  };

  let totalWei = 0n;
  let allTxs: FeeTransaction[] = [];
  let dataFound = false;

  // Parallel fetch: Global Claimed (Blockscout) and Token-Specific Unclaimed (Locker)
  const [ethResult, wethResult, unclaimedResult] = await Promise.all([
    fetchBlockscoutIncomingTxs(walletAddress, chain),
    fetchBlockscoutWethTransfers(walletAddress, chain),
    tokenAddress 
      ? getUnclaimedFees(walletAddress, tokenAddress, chain) 
      : Promise.resolve({ unclaimedEth: "0", unclaimedTokenAmount: "0", tokenSymbol: "" }),
  ]);

  if (ethResult && ethResult.totalWei > 0n) {
    totalWei += ethResult.totalWei;
    allTxs.push(...ethResult.txs);
    dataFound = true;
  }
  if (wethResult && wethResult.totalWei > 0n) {
    totalWei += wethResult.totalWei;
    allTxs.push(...wethResult.txs);
    dataFound = true;
  }

  // Strategy 2: Etherscan fallback
  if (!dataFound) {
    try {
      const [normalData, internalData] = await Promise.all([
        explorerFetch(chain, {
          module: "account",
          action: "txlist",
          address: walletAddress,
          startblock: "0",
          endblock: "99999999",
          sort: "desc",
        }) as Promise<{ status: string; result: any }>,
        explorerFetch(chain, {
          module: "account",
          action: "txlistinternal",
          address: walletAddress,
          startblock: "0",
          endblock: "99999999",
          sort: "desc",
        }) as Promise<{ status: string; result: any }>,
      ]);

      if (normalData.status === "1" && Array.isArray(normalData.result)) {
        dataFound = true;
        for (const tx of normalData.result) {
          if (tx.to?.toLowerCase() === walletAddress.toLowerCase() && tx.isError !== "1" && BigInt(tx.value) > 0n) {
            totalWei += BigInt(tx.value);
            allTxs.push({ hash: tx.hash, value: ethers.formatEther(tx.value), timestamp: Number(tx.timeStamp), from: tx.from });
          }
        }
      }
      if (internalData.status === "1" && Array.isArray(internalData.result)) {
        dataFound = true;
        for (const tx of internalData.result) {
          if (tx.to?.toLowerCase() === walletAddress.toLowerCase() && tx.isError !== "1" && BigInt(tx.value) > 0n) {
            totalWei += BigInt(tx.value);
            allTxs.push({ hash: tx.hash, value: ethers.formatEther(tx.value), timestamp: Number(tx.timeStamp), from: tx.from });
          }
        }
      }
    } catch {}
  }

  allTxs.sort((a, b) => b.timestamp - a.timestamp);

  return {
    totalEth: ethers.formatEther(totalWei),
    totalUsd: null,
    unclaimedEth: unclaimedResult.unclaimedEth,
    unclaimedUsd: null,
    unclaimedTokenAmount: unclaimedResult.unclaimedTokenAmount,
    tokenSymbol: unclaimedResult.tokenSymbol,
    txCount: allTxs.length,
    recentTxs: allTxs.slice(0, 500),
  };
}

// ─── Income Aggregation Helper ──────────────────────────────

async function calculateCombinedIncome(
  feeWallets: FeeWallet[],
  chain: ChainConfig,
  tokenAddress?: string | null,
  poolAddress?: string | null,
  ethPrice?: number | null
): Promise<FeeIncome> {
  if (feeWallets.length === 0) {
    return { 
      totalEth: "0", totalUsd: null, 
      unclaimedEth: "0", unclaimedUsd: null,
      txCount: 0, recentTxs: [] 
    };
  }

  const incomes = await Promise.all(
    feeWallets.map((w) => getFeeWalletIncome(w.address, chain, tokenAddress, poolAddress))
  );

  let totalWei = 0n;
  let totalUnclaimedWei = 0n;
  let totalTxCount = 0;
  const allRecentTxs: FeeTransaction[] = [];

  for (const income of incomes) {
    totalWei += ethers.parseEther(income.totalEth);
    if (income.unclaimedEth) {
      totalUnclaimedWei += ethers.parseEther(income.unclaimedEth);
    }
    totalTxCount += income.txCount;
    allRecentTxs.push(...income.recentTxs);
  }

  allRecentTxs.sort((a, b) => b.timestamp - a.timestamp);

  const claimedEth = parseFloat(ethers.formatEther(totalWei));
  const unclaimedEthValue = parseFloat(ethers.formatEther(totalUnclaimedWei));

  return {
    totalEth: ethers.formatEther(totalWei),
    totalUsd: ethPrice ? (claimedEth * ethPrice).toFixed(2) : null,
    unclaimedEth: ethers.formatEther(totalUnclaimedWei),
    unclaimedUsd: ethPrice ? (unclaimedEthValue * ethPrice).toFixed(2) : null,
    unclaimedTokenAmount: incomes[0]?.unclaimedTokenAmount, // Use the first wallet's token rewards as primary
    tokenSymbol: incomes[0]?.tokenSymbol,
    txCount: totalTxCount,
    recentTxs: allRecentTxs.slice(0, 500),
  };
}

// ─── Main analysis orchestrator ─────────────────────────────

export async function analyzeToken(
  address: string,
  chainId: string
): Promise<AnalysisResult> {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  // Step 1: Get contract source & ABI
  const source = await getContractSource(address, chain);

  // Step 2: Get token info + deployer in parallel
  const [tokenInfo, deployerInfo] = await Promise.all([
    getTokenInfo(address, chain),
    getDeployer(address, chain),
  ]);

  if (deployerInfo) {
    tokenInfo.deployer = deployerInfo.deployer;
    tokenInfo.deployedAt = deployerInfo.deployedAt;
  }

  // Step 3: If verified, detect tax rates & fee wallets
  let taxRates: TaxRates | null = null;
  let feeWallets: FeeWallet[] = [];

  if (source.verified && source.abi) {
    [taxRates, feeWallets] = await Promise.all([
      detectTaxRates(source.abi, address, chain),
      detectFeeWallets(source.abi, address, chain),
    ]);
  }

  // Step 3b: If no fee wallets found, fallback to deployer as fee recipient
  if (feeWallets.length === 0 && deployerInfo?.deployer) {
    feeWallets.push({
      address: ethers.getAddress(deployerInfo.deployer),
      label: "Deployer",
    });
  }

  // Step 4: Find LP pool for fee filtering & Detect Platform
  let poolAddress: string | null = null;
  let platform: "clanker" | "wow" | "bankr" | "generic" = "generic";
  let subPlatform: string | undefined = undefined;

  const abiArray = Array.isArray(source.abi) ? source.abi : [];
  const abiString = JSON.stringify(source.abi);
  const deployer = deployerInfo?.deployer?.toLowerCase();

  // 1. Bankr / Doppler Detection (ABI Feature Based & Deployer Fallback)
  // Use string-based search for higher resilience against minor ABI structure variations
  // Doppler unique signatures: vestedTotalAmount, yearlyMintRate, computeAvailableVestedAmount
  const isDoppler = abiString.includes('"name":"vestedTotalAmount"') || 
                    abiString.includes('"name":"yearlyMintRate"') ||
                    abiString.includes('"name":"computeAvailableVestedAmount"');
  
  const isClankerV4 = abiString.includes('"name":"clanker"'); 
  
  if (isDoppler || (deployer && BANKR_DEPLOYERS.includes(deployer))) {
    platform = "bankr";
    subPlatform = isDoppler || deployer !== BANKR_DEPLOYER.toLowerCase() ? "doppler" : "clanker";
  } else if (isClankerV4) {
    platform = "bankr";
    subPlatform = "clanker";
  }

  // Ensure Bankr Fee Wallet is included for all Bankr tokens
  if (platform === "bankr") {
    if (!feeWallets.some(w => w.address.toLowerCase() === BANKR_FEE_WALLET.toLowerCase())) {
        feeWallets.push({
            address: ethers.getAddress(BANKR_FEE_WALLET),
            label: "Bankr Fee Wallet"
        });
    }
  }

  // 2. Clanker Detection (allData - V1-V3)
  if (platform === "generic" && source.verified && abiArray.some((f: any) => f.name === "allData")) {
    platform = "clanker";
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      const contract = new ethers.Contract(address, ["function allData() view returns (tuple(address,address,uint256,uint256,uint256,uint256))"], provider);
      const data = await contract.allData();
      if (data && data[0] && data[1]) {
        const lpPool = ethers.getAddress(data[0]);
        const clanker = ethers.getAddress(data[1]);
        
        if (lpPool !== clanker) {
          poolAddress = lpPool;
        }
      }
    } catch (err) {
      // Different Clanker version might have different allData tuple
    }
  } 
  // 3. Wow Detection (Zora)
  else if (platform === "generic" && source.verified && abiArray.some((f: any) => f.name === "wowData")) {
    platform = "wow";
    try {
        const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
        const contract = new ethers.Contract(address, ["function wowData() view returns (tuple(address,address,uint256,uint256,uint256,uint256,uint256))"], provider);
        const data = await contract.wowData();
        if (data && data[0]) {
            poolAddress = ethers.getAddress(data[0]);
        }
    } catch {}
  }

  // Fallback to factory discovery if platform-specific discovery failed
  if (!poolAddress) {
    poolAddress = await findLPPool(address, chain);
  }

  // Step 5: Calculate fee income for the creator's wallets (Global Claimed + Token-Specific Unclaimed)
  const ethPrice = await getEthPrice();
  
  // Check if this is a V4 token (poolAddress is the V4_MANAGER)
  const isV4 = poolAddress?.toLowerCase() === V4_MANAGER.toLowerCase();
  
  // Fetch global trades, revenue, and volume in parallel
  const [tokenTrades, revenue, volumeData] = await Promise.all([
    fetchTokenTrades(address, chain),
    calculateCombinedIncome(feeWallets, chain, address, poolAddress, ethPrice),
    isV4
      ? fetchTotalVolume(address, chain)
      : poolAddress
        ? fetchPoolVolume(poolAddress, chain, address).then(v => ({ volumeEth: v, poolName: "" }))
        : Promise.resolve({ volumeEth: "0", poolName: "" })
  ]);

  const volumeEth = volumeData.volumeEth;
  const poolName = volumeData.poolName || undefined;

  return {
    token: tokenInfo,
    taxRates,
    feeWallets,
    feeIncome: revenue, // Current specific token focus
    allWalletIncome: revenue, // Legacy global fallback
    tokenTrades: tokenTrades,
    volumeEth,
    poolName,
    poolAddress,
    platform,
    subPlatform,
    chain: chainId,
    contractVerified: source.verified,
    contractAddress: address,
  };
}
