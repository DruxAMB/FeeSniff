"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_HEX = "0x2105";

type WalletState = {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  isOnBase: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
};

const initialState: WalletState = {
  address: null,
  isConnected: false,
  chainId: null,
  isOnBase: false,
  provider: null,
  signer: null,
};

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(initialState);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEthereum = typeof window !== "undefined" && !!window.ethereum;

  const updateWalletState = useCallback(async () => {
    if (!hasEthereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (accounts.length === 0) {
        setWallet(initialState);
        return;
      }

      const signer = accounts[0];
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setWallet({
        address: signer.address,
        isConnected: true,
        chainId,
        isOnBase: chainId === BASE_CHAIN_ID,
        provider,
        signer,
      });
    } catch {
      setWallet(initialState);
    }
  }, [hasEthereum]);

  // Auto-reconnect on mount
  useEffect(() => {
    updateWalletState();
  }, [updateWalletState]);

  // Listen for account/chain changes
  useEffect(() => {
    if (!hasEthereum) return;

    const handleAccountsChanged = () => {
      updateWalletState();
    };

    const handleChainChanged = () => {
      updateWalletState();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [hasEthereum, updateWalletState]);

  const connect = useCallback(async () => {
    if (!hasEthereum) {
      setError("No wallet detected. Please install MetaMask or Coinbase Wallet.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await updateWalletState();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      if (message.includes("rejected")) {
        setError("Connection rejected by user");
      } else {
        setError(message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [hasEthereum, updateWalletState]);

  const disconnect = useCallback(() => {
    setWallet(initialState);
    setError(null);
  }, []);

  const switchToBase = useCallback(async () => {
    if (!hasEthereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_HEX }],
      });
    } catch (err: unknown) {
      // Chain not added — try adding it
      const switchErr = err as { code?: number };
      if (switchErr.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BASE_CHAIN_HEX,
                chainName: "Base",
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://mainnet.base.org"],
                blockExplorerUrls: ["https://basescan.org"],
              },
            ],
          });
        } catch (addErr) {
          console.error("Failed to add Base network:", addErr);
          setError("Failed to add Base network. Please add it manually.");
        }
      } else {
        console.error("Failed to switch network:", err);
        setError("Failed to switch network in your wallet.");
      }
    }
  }, [hasEthereum]);

  return {
    ...wallet,
    isConnecting,
    error,
    hasEthereum,
    connect,
    disconnect,
    switchToBase,
    clearError: () => setError(null),
  };
}
