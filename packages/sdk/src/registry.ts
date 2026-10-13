import { registry as bundled } from "./generated/registry.ts";
import type { ChainRegistry, PoolSpec, RegistryFile } from "./types.ts";

/** Maker slots per round: a round closes at MAX_SLOTS commitments or at the deadline with at least MIN_SLOTS. */
export const MAX_SLOTS = 5;
export const MIN_SLOTS = 3;

export const MONAD_TESTNET = {
  chainId: 10143,
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadvision.com",
  faucetUrl: "https://faucet.monad.xyz",
} as const;

/** Deployed addresses for every chain this SDK build knows about (from packages/pools/pools.json). */
export const DEFAULT_REGISTRY: RegistryFile = bundled as unknown as RegistryFile;

/** Picks one chain's registry, keeping only pools with a deployed market and base token. */
export function loadRegistry(chainId: number, file: RegistryFile = DEFAULT_REGISTRY): ChainRegistry {
  const chain = file[String(chainId)];
  if (!chain) throw new Error(`no Niskala deployment registered for chain ${chainId}`);
  return { ...chain, pools: chain.pools.filter((p) => p.market && p.base.address) };
}

/** (chainId << 160) | marketAddress; must equal RfqMarket.DOMAIN and the circuit's `domain` input. */
export function domainSeparator(chainId: bigint | number, market: string): bigint {
  return (BigInt(chainId) << 160n) | BigInt(market);
}

export function findPool(pools: PoolSpec[], slugOrMarket: string): PoolSpec | undefined {
  const key = slugOrMarket.toLowerCase();
  return pools.find((p) => p.slug === key || p.market.toLowerCase() === key);
}
