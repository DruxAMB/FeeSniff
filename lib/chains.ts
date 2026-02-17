import { ChainConfig } from "./types";

// Etherscan V2 API: single endpoint for all chains, differentiated by chainid
export const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";

export const CHAINS: ChainConfig[] = [
  {
    id: "base",
    name: "Base",
    chainId: 8453,
    explorerUrl: "https://basescan.org",
    blockscoutApi: "https://base.blockscout.com/api/v2",
    rpcUrl: "https://base.publicnode.com",
    wethAddress: "0x4200000000000000000000000000000000000006",
    uniV3Factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    clankerLocker: "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68",
    nativeSymbol: "ETH",
    icon: "🔵",
    enabled: true,
  },
  {
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    explorerUrl: "https://etherscan.io",
    blockscoutApi: "https://eth.blockscout.com/api/v2",
    rpcUrl: "https://eth.llamarpc.com",
    wethAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    uniV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    nativeSymbol: "ETH",
    icon: "⟠",
    enabled: false,
  },
  {
    id: "bsc",
    name: "BNB Chain",
    chainId: 56,
    explorerUrl: "https://bscscan.com",
    blockscoutApi: "https://bsc.blockscout.com/api/v2",
    rpcUrl: "https://bsc-dataseed.binance.org",
    wethAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    uniV3Factory: "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
    nativeSymbol: "BNB",
    icon: "🟡",
    enabled: false,
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    explorerUrl: "https://arbiscan.io",
    blockscoutApi: "https://arbitrum.blockscout.com/api/v2",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    wethAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    uniV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    nativeSymbol: "ETH",
    icon: "🔷",
    enabled: false,
  },
];

export const DEFAULT_CHAIN = CHAINS[0]; // Base

export function getChain(id: string): ChainConfig | undefined {
  return CHAINS.find((c) => c.id === id);
}
