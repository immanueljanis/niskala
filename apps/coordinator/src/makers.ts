import { randomBytes } from "node:crypto";
import { quoteCommitment, toHex32 } from "@niskala/zk";
import { addWallet, sendTx, web3 } from "./chain.ts";
import { config } from "./config.ts";
import { registry, type Pool } from "./pools.ts";

/** Fixed gas limit for commit(): measured ≈ 130–170k; Monad charges on the limit, so keep it tight. */
const COMMIT_GAS = 220_000n;

/** Private pricing configuration. Never exposed by the API or UI. */
interface Strategy {
  baseSpreadBps: number;
  inventorySkewBps: number;
  jitterSecret: string;
}

export interface MakerPublic {
  id: string;
  address: string;
  displayName: string;
  tier: string;
}

/**
 * A simulated market maker with its own wallet and its own hidden strategy.
 * It computes a private price, seals it into a Poseidon2 commitment, sends the commit
 * transaction from its own key, and hands the opening only to the local prover.
 */
export class MarketMaker {
  readonly address: string;

  constructor(
    readonly id: string,
    readonly displayName: string,
    readonly tier: string,
    privateKey: string,
    private readonly strategy: Strategy,
  ) {
    this.address = addWallet(privateKey).address;
  }

  public(): MakerPublic {
    return { id: this.id, address: this.address, displayName: this.displayName, tier: this.tier };
  }

  /** Deterministic per-round inventory jitter in [-4, +4] bps, seeded by a private secret and the pool. */
  priceFor(poolSlug: string, rfqId: bigint, midE6: bigint): bigint {
    const seed = BigInt(web3.utils.keccak256(`${poolSlug}:${rfqId}:${this.strategy.jitterSecret}`));
    const jitter = Number(seed % 9n) - 4;
    const bps = Math.max(1, this.strategy.baseSpreadBps + this.strategy.inventorySkewBps + jitter);
    return (midE6 * BigInt(10_000 + bps)) / 10_000n;
  }

  async sealAndCommit(pool: Pool, rfqId: bigint, priceE6: bigint) {
    const salt = BigInt(`0x${randomBytes(31).toString("hex")}`);
    const commitment = await quoteCommitment({ domain: pool.domain, rfqId, maker: this.address, priceE6, salt });
    const tx = await sendTx(pool.market.methods.commit(rfqId, toHex32(commitment)), this.address, { gas: COMMIT_GAS });
    return { commitment, salt, ...tx };
  }
}

const PROFILES: Array<[string, string, string, Strategy]> = [
  ["mm-01", "Niskala MM-01", "Institutional LP", { baseSpreadBps: 8, inventorySkewBps: 3, jitterSecret: "mm01-inventory" }],
  ["mm-02", "Niskala MM-02", "Proprietary desk", { baseSpreadBps: 5, inventorySkewBps: 1, jitterSecret: "mm02-inventory" }],
  ["mm-03", "Niskala MM-03", "OTC liquidity", { baseSpreadBps: 6, inventorySkewBps: -1, jitterSecret: "mm03-inventory" }],
  ["mm-04", "Niskala MM-04", "Quant market maker", { baseSpreadBps: 7, inventorySkewBps: 0, jitterSecret: "mm04-inventory" }],
  ["mm-05", "Niskala MM-05", "Treasury desk", { baseSpreadBps: 9, inventorySkewBps: -2, jitterSecret: "mm05-inventory" }],
];

const roster = new Set((registry?.makers ?? []).map((a) => a.toLowerCase()));

/** One maker per configured key that is registered in this chain's roster; can be fewer than MAX_SLOTS. */
export const makers: MarketMaker[] = config.makerKeys
  .map((key, i) => new MarketMaker(PROFILES[i][0], PROFILES[i][1], PROFILES[i][2], key, PROFILES[i][3]))
  .filter((m) => roster.size === 0 || roster.has(m.address.toLowerCase()));

export function makerByAddress(address: string): MarketMaker | undefined {
  return makers.find((m) => m.address.toLowerCase() === address.toLowerCase());
}
