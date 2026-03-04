import { ethers } from "ethers";

// ─── Contract Address ───────────────────────────────────────
// Deployed UUPS Proxy Address
export const CLAIM_CONTRACT_ADDRESS = "0x219a8dDAf088a936eB580cc492ae755e433b3824";

// ─── $SNIFF Token ───────────────────────────────────────────
export const SNIFF_TOKEN_ADDRESS = "0x1e59A76e58E07e988d97aa7d89Eb15dc4BF18b07";
export const SNIFF_DECIMALS = 18;

// ─── Contract ABI (minimal — only functions used by frontend) ─
export const CLAIM_CONTRACT_ABI = [
  // Read functions
  "function canClaim(address user) view returns (bool)",
  "function timeUntilNextClaim(address user) view returns (uint256)",
  "function currentStreak(address user) view returns (uint256)",
  "function nextReward(address user) view returns (uint256)",
  "function streak(address user) view returns (uint256)",
  "function lastClaimed(address user) view returns (uint256)",
  "function totalClaimed(address user) view returns (uint256)",
  "function dailyReward() view returns (uint256)",
  "function contractBalance() view returns (uint256)",
  "function totalDistributed() view returns (uint256)",
  "function totalClaimers() view returns (uint256)",
  "function getMultiplier(uint256 currentStreak) pure returns (uint256)",
  "function getRewardForStreak(uint256 currentStreak) view returns (uint256)",
  "function paused() view returns (bool)",

  // Write functions
  "function claim() external",

  // Events
  "event Claimed(address indexed user, uint256 amount, uint256 streak, uint256 multiplier)",
];

// ─── Helpers ────────────────────────────────────────────────

const BASE_RPC = "https://base.publicnode.com";

/**
 * Get a read-only contract instance (for view calls without a connected wallet)
 */
export function getClaimContractReadOnly() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  return new ethers.Contract(CLAIM_CONTRACT_ADDRESS, CLAIM_CONTRACT_ABI, provider);
}

/**
 * Get a writable contract instance (requires a connected signer)
 */
export function getClaimContract(signer: ethers.JsonRpcSigner) {
  return new ethers.Contract(CLAIM_CONTRACT_ADDRESS, CLAIM_CONTRACT_ABI, signer);
}
