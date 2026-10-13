"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getBalances, type Balances } from "./chain/contracts";
import { CHAIN_ID } from "./chain/network";
import { currentChainId, ensureNetwork, getInjectedProvider, requestAccounts, subscribeWallet } from "./chain/web3";

interface WalletState {
  address: string | null;
  chainId: number;
  hasWallet: boolean;
  wrongNetwork: boolean;
  balances: Balances | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState(0);
  const [hasWallet, setHasWallet] = useState(false);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return setBalances(null);
    try {
      setBalances(await getBalances(address));
    } catch {
      setBalances(null);
    }
  }, [address]);

  useEffect(() => {
    const provider = getInjectedProvider();
    setHasWallet(!!provider);
    if (!provider) return;
    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => setAddress(((accounts as string[])[0] ?? null)?.toLowerCase() ?? null))
      .catch(() => {});
    currentChainId().then(setChainId).catch(() => {});
    return subscribeWallet(
      (accounts) => setAddress(accounts[0]?.toLowerCase() ?? null),
      (id) => setChainId(id),
    );
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const accounts = await requestAccounts();
      setAddress(accounts[0]?.toLowerCase() ?? null);
      await ensureNetwork();
      setChainId(await currentChainId());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      await ensureNetwork();
      setChainId(await currentChainId());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const value = useMemo<WalletState>(
    () => ({ address, chainId, hasWallet, wrongNetwork: !!address && chainId !== 0 && chainId !== CHAIN_ID, balances, connecting, error, connect, switchNetwork, refresh }),
    [address, chainId, hasWallet, balances, connecting, error, connect, switchNetwork, refresh],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet outside WalletProvider");
  return ctx;
}
