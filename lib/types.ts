export type ChainConfig = {
  id: string;
  name: string;
  chainId: number;
  explorerUrl: string;
  blockscoutApi: string;
  rpcUrl: string;
  wethAddress: string;
  uniV3Factory: string;
  clankerLocker?: string;
  clankerLockerFeeConversion?: string;
  clankerLpLocker?: string;
  nativeSymbol: string;
  icon: string;
  enabled: boolean;
};

export type TaxRates = {
  buyTax: number;
  sellTax: number;
};

export type FeeWallet = {
  address: string;
  label: string;
};

export type FeeTransaction = {
  hash: string;
  value: string;
  timestamp: number;
  from: string;
};

export type FeeIncome = {
  totalEth: string;
  totalUsd: string | null;
  unclaimedEth?: string;
  unclaimedUsd?: string | null;
  unclaimedTokenAmount?: string;
  tokenSymbol?: string;
  txCount: number;
  recentTxs: FeeTransaction[];
};

export type TokenInfo = {
  name: string;
  symbol: string;
  totalSupply: string;
  owner: string;
  deployedAt?: string;
  deployer?: string;
};

export type AnalysisResult = {
  token: TokenInfo;
  taxRates: TaxRates | null;
  feeWallets: FeeWallet[];
  feeIncome: FeeIncome; // Default (Token Specific)
  allWalletIncome?: FeeIncome;
  poolAddress: string | null;
  chain: string;
  contractVerified: boolean;
  contractAddress: string;
  tokenTrades: FeeTransaction[];
  volumeEth?: string;
  poolName?: string;
  platform?: "clanker" | "wow" | "bankr" | "generic";
  subPlatform?: string;
};

export type AnalysisError = {
  error: string;
  code: "INVALID_ADDRESS" | "NOT_VERIFIED" | "NOT_FOUND" | "API_ERROR" | "RATE_LIMITED";
};
