import { useState, useEffect, useCallback } from "react";
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getNetwork,
} from "@stellar/freighter-api";
import { getBalance } from "../lib/stellar";

export interface WalletState {
  address: string | null;
  balance: string;
  isUnfunded: boolean;
  network: string | null;
  isTestnet: boolean;
  isConnecting: boolean;
  isFunding: boolean;
  isFreighterInstalled: boolean | null;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: "0",
    isUnfunded: false,
    network: null,
    isTestnet: false,
    isConnecting: false,
    isFunding: false,
    isFreighterInstalled: null,
    error: null,
  });

  // Check if Freighter is installed on mount
  useEffect(() => {
    async function checkFreighter() {
      try {
        const { isConnected } = await freighterIsConnected();
        setState((s) => ({ ...s, isFreighterInstalled: !!isConnected }));
      } catch (err) {
        console.error("Error checking Freighter presence:", err);
        setState((s) => ({ ...s, isFreighterInstalled: false }));
      }
    }
    checkFreighter();
  }, []);

  const refreshBalance = useCallback(async (publicKey: string) => {
    try {
      const { balance, isUnfunded } = await getBalance(publicKey);
      setState((s) => ({
        ...s,
        balance,
        isUnfunded,
        error: null,
      }));
    } catch (err: any) {
      console.error("Error fetching balance:", err);
      setState((s) => ({
        ...s,
        error: `Failed to fetch balance: ${err.message || err}`,
      }));
    }
  }, []);

  const checkNetwork = useCallback(async () => {
    try {
      const { network, networkPassphrase, error } = await getNetwork();
      if (error) {
        throw new Error(typeof error === "string" ? error : JSON.stringify(error));
      }
      
      const isTestnet = network === "TESTNET" || networkPassphrase === "Test SDN Network ; September 2015";
      
      setState((s) => ({
        ...s,
        network: network || null,
        isTestnet,
        error: isTestnet ? null : "Freighter is not set to Stellar Testnet. Please switch network in Freighter.",
      }));
      return isTestnet;
    } catch (err: any) {
      console.error("Error checking network:", err);
      setState((s) => ({
        ...s,
        error: `Failed to check network: ${err.message || err}`,
      }));
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const checkInstalled = await freighterIsConnected();
      if (!checkInstalled.isConnected) {
        setState((s) => ({
          ...s,
          isConnecting: false,
          isFreighterInstalled: false,
          error: "Freighter wallet is not installed. Please install the extension.",
        }));
        return;
      }

      const { address, error } = await requestAccess();
      if (error) {
        throw new Error(typeof error === "string" ? error : JSON.stringify(error));
      }

      if (!address) {
        throw new Error("No address returned from Freighter.");
      }

      // Check network first
      const isTestnet = await checkNetwork();

      // Fetch balance
      const { balance, isUnfunded } = await getBalance(address);

      setState((s) => ({
        ...s,
        address,
        balance,
        isUnfunded,
        isTestnet,
        isConnecting: false,
        error: isTestnet ? null : "Freighter is not set to Stellar Testnet. Please switch network in Freighter.",
      }));

    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err.message || "User rejected connection or connection failed.",
      }));
    }
  }, [checkNetwork]);

  const disconnect = useCallback(() => {
    setState((s) => ({
      ...s,
      address: null,
      balance: "0",
      isUnfunded: false,
      network: null,
      isTestnet: false,
      error: null,
    }));
  }, []);

  const fundWithFriendbot = useCallback(async () => {
    const { address } = state;
    if (!address) return;

    setState((s) => ({ ...s, isFunding: true, error: null }));
    try {
      const res = await fetch(`https://friendbot.stellar.org/?addr=${address}`);
      if (!res.ok) {
        throw new Error(`Friendbot error: ${res.statusText}`);
      }
      // Wait a moment for transaction indexing
      await new Promise((r) => setTimeout(r, 2000));
      
      // Refresh balance
      await refreshBalance(address);
      setState((s) => ({ ...s, isFunding: false }));
    } catch (err: any) {
      console.error("Friendbot funding failed:", err);
      setState((s) => ({
        ...s,
        isFunding: false,
        error: `Friendbot funding failed: ${err.message || err}. You can fund manually using the link.`,
      }));
    }
  }, [state.address, refreshBalance]);

  const manualRefreshBalance = useCallback(() => {
    if (state.address) {
      refreshBalance(state.address);
    }
  }, [state.address, refreshBalance]);

  return {
    ...state,
    connect,
    disconnect,
    checkNetwork,
    refreshBalance: manualRefreshBalance,
    fundWithFriendbot,
  };
}
