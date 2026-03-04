"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useConfig } from "wagmi";
import { useMemo, useCallback, useState, useEffect } from "react";
import { ethers } from "ethers";
import { base } from "wagmi/chains";
import { getConnectorClient } from "@wagmi/core";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { Account, Chain, Client, Transport } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const BASE_CHAIN_ID = 8453;

// ─── Ethers Helpers ──────────────────────────────────────────

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}

/** Hook to get an ethers Signer */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = { data: null } as any; // Placeholder for actual client fetching logic if needed
  // In wagmi v2, we usually get the client asynchronously
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client]);
}

// ─── Main Hook ───────────────────────────────────────────────

export function useWallet() {
  const { address, isConnected, status } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const config = useConfig();
  const { openConnectModal } = useConnectModal();

  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Sync isConnecting with wagmi status
  useEffect(() => {
    setIsConnecting(status === "connecting" || status === "reconnecting");
  }, [status]);

  // Async get ethers signer/provider
  useEffect(() => {
    const updateSigner = async () => {
      if (isConnected && address) {
        try {
          const client = await getConnectorClient(config);
          const ethersSigner = clientToSigner(client as any);
          setSigner(ethersSigner);
          setProvider(ethersSigner.provider as BrowserProvider);
        } catch (err) {
          console.error("Failed to get ethers signer:", err);
          setSigner(null);
          setProvider(null);
        }
      } else {
        setSigner(null);
        setProvider(null);
      }
    };
    updateSigner();
  }, [isConnected, address, chainId, config]);

  const connectWallet = useCallback(() => {
    if (openConnectModal) {
      openConnectModal();
    }
  }, [openConnectModal]);

  const switchToBase = useCallback(() => {
    if (switchChain) {
      switchChain({ chainId: base.id });
    }
  }, [switchChain]);

  return {
    address: address || null,
    isConnected,
    chainId,
    isOnBase: chainId === BASE_CHAIN_ID,
    provider,
    signer,
    isConnecting,
    hasEthereum: typeof window !== "undefined" && !!window.ethereum,
    connect: connectWallet,
    disconnect,
    switchToBase,
    error: null,
    clearError: () => {},
  };
}

