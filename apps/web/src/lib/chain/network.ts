/**
 * Chain configuration. Defaults are the official Monad testnet values from
 * https://docs.monad.xyz/developer-essentials/testnets (verified 2026-10-13).
 * NEXT_PUBLIC_* overrides allow pointing at a local anvil. Accesses must stay literal
 * (`process.env.NEXT_PUBLIC_X`) so Next.js can inline them into the client bundle.
 * Contract addresses come from packages/pools/pools.json (see lib/pools.ts).
 */
const pick = (value: string | undefined, fallback: string) => (value && value !== "" ? value : fallback);

export const CHAIN_ID = Number(pick(process.env.NEXT_PUBLIC_CHAIN_ID, "10143"));
/** Browser reads default to the Ankr endpoint (300 req / 10 s) so they never compete with the coordinator for the official RPC's 15 rps. */
export const RPC_URL = pick(process.env.NEXT_PUBLIC_RPC_URL, "https://rpc.ankr.com/monad_testnet");
export const EXPLORER_URL = pick(process.env.NEXT_PUBLIC_EXPLORER_URL, "https://testnet.monadvision.com");
export const COORDINATOR_URL = pick(process.env.NEXT_PUBLIC_COORDINATOR_URL, "http://localhost:8787");

export const NETWORK = {
  chainId: CHAIN_ID,
  chainIdHex: `0x${CHAIN_ID.toString(16)}`,
  name: CHAIN_ID === 10143 ? "Monad Testnet" : CHAIN_ID === 143 ? "Monad" : CHAIN_ID === 31337 ? "Anvil (local)" : `Chain ${CHAIN_ID}`,
  rpcUrls: [CHAIN_ID === 10143 ? "https://testnet-rpc.monad.xyz" : RPC_URL],
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  blockExplorerUrls: [EXPLORER_URL],
};

export const txUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const addressUrl = (address: string) => `${EXPLORER_URL}/address/${address}`;
export const FAUCET_URL = "https://faucet.monad.xyz";
