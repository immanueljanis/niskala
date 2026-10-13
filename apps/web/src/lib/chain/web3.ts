import { NETWORK } from "./network";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export function getInjectedProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

export async function requestAccounts(): Promise<string[]> {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  return (await provider.request({ method: "eth_requestAccounts" })) as string[];
}

export async function currentChainId(): Promise<number> {
  const provider = getInjectedProvider();
  if (!provider) return 0;
  return Number(await provider.request({ method: "eth_chainId" }));
}

/** Switches the wallet to the configured network, adding it when unknown. */
export async function ensureNetwork(): Promise<void> {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No injected wallet found.");
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: NETWORK.chainIdHex }] });
  } catch (err: any) {
    if (err?.code !== 4902 && !/unrecognized|not added|4902/i.test(String(err?.message))) throw err;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: NETWORK.chainIdHex,
          chainName: NETWORK.name,
          rpcUrls: NETWORK.rpcUrls,
          nativeCurrency: NETWORK.nativeCurrency,
          blockExplorerUrls: NETWORK.blockExplorerUrls,
        },
      ],
    });
  }
}

export function subscribeWallet(onAccounts: (accounts: string[]) => void, onChain: (chainId: number) => void): () => void {
  const provider = getInjectedProvider();
  if (!provider?.on) return () => {};
  const accountsHandler = (accounts: string[]) => onAccounts(accounts);
  const chainHandler = (chainId: string) => onChain(Number(chainId));
  provider.on("accountsChanged", accountsHandler);
  provider.on("chainChanged", chainHandler);
  return () => {
    provider.removeListener?.("accountsChanged", accountsHandler);
    provider.removeListener?.("chainChanged", chainHandler);
  };
}
