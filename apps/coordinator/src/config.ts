import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined || v === "") throw new Error(`missing env ${key}`);
  return v;
}

export const config = {
  rpcUrl: env("RPC_URL"),
  chainId: BigInt(env("CHAIN_ID")),
  makerKeys: ["MM_A_KEY", "MM_B_KEY", "MM_C_KEY", "MM_D_KEY", "MM_E_KEY"].map((k) => process.env[k] ?? "").filter((v) => v !== "").slice(0, 5),
  relayerKey: env("RELAYER_KEY"),
  priceFeedUrl: process.env.PRICE_FEED_URL ?? "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=",
  port: Number(env("PORT", "8787")),
  pollMs: Number(env("POLL_MS", "1500")),
  explorerTxBase: env("EXPLORER_TX_BASE", "https://testnet.monadvision.com/tx/"),
  dataFile: resolve(here, `../data/rounds-${env("CHAIN_ID")}.json`),
  abiDir: resolve(here, "../../../packages/abi"),
  poolsFile: resolve(here, "../../../packages/pools/pools.json"),
};
