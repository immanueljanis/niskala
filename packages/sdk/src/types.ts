export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  logo: string;
}

export interface PoolSpec {
  slug: string;
  base: TokenInfo;
  /** RfqMarket contract address for this pair. */
  market: string;
  coingeckoId: string;
  /** Reference mid price, USDC per base unit with 6 decimals. */
  referencePriceE6: string;
  defaultSize: string;
  maxSize: string;
  makerDeposit: string;
  commitWindowSec: number;
  settleWindowSec: number;
  tier: string;
  description: string;
}

export interface PoolStats {
  rounds: number;
  settled: number;
  volumeUsdc: string;
  lastPriceE6: string | null;
  liquidityBase: string;
  updatedAt: number;
}

export type PoolWithStats = PoolSpec & { stats?: PoolStats };

export interface ChainRegistry {
  verifier: string;
  makers: string[];
  quote: TokenInfo;
  pools: PoolSpec[];
  legacy?: { note?: string; verifier?: string; markets?: Record<string, string> };
}

export type RegistryFile = Record<string, ChainRegistry>;

export const STATUS_NAMES = ["NONE", "OPEN", "COMMIT_CLOSED", "PROVEN", "SETTLED", "CANCELLED"] as const;
export type StatusName = (typeof STATUS_NAMES)[number];
export const Status = { NONE: 0, OPEN: 1, COMMIT_CLOSED: 2, PROVEN: 3, SETTLED: 4, CANCELLED: 5 } as const;

/** Onchain round state as returned by RfqMarket.getRfq, normalised to strings and numbers. */
export interface ChainRfq {
  rfqId: string;
  trader: string;
  amountOut: string;
  commitDeadline: number;
  settleDeadline: number;
  status: number;
  statusName: StatusName;
  commitmentCount: number;
  winnerIndex: number;
  winningPriceE6: string;
  makers: string[];
  commitments: string[];
  proofHash: string;
  usdcPaid: string;
}

export interface Balances {
  mon: string;
  usdc: string;
}

export interface TxResult {
  txHash: string;
  blockNumber: number;
  gasUsed?: number;
}

/* ------------------------------ coordinator API ------------------------------ */

export interface MakerPublic {
  id: string;
  address: string;
  displayName: string;
  tier: string;
}

export interface CommitRecord {
  maker: string;
  makerId: string;
  displayName: string;
  txHash: string;
  blockNumber: number;
  committedAt: number;
}

export interface ProofSummary {
  publicInputs: string[];
  proofHash: string;
  winnerIndex: number;
  winningPriceE6: string;
  generatedAt: number;
  proveMs: number;
  proofBytes: number;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  submittedAt?: number;
}

export type Phase = "open" | "committing" | "closed" | "proving" | "submitting" | "proven" | "settled" | "cancelled" | "error";

export interface RoundView {
  pool: PoolWithStats;
  chain: ChainRfq;
  offchain: {
    pool?: string;
    rfqId: string;
    phase: Phase;
    commits: CommitRecord[];
    referencePriceE6?: string;
    proof?: ProofSummary;
    createTxHash?: string;
    settleTxHash?: string;
    error?: string;
    /** Neutral status line, for example while the prover waits for an external maker's opening. */
    note?: string;
    updatedAt: number;
  };
  makers: MakerPublic[];
  explorerTxBase: string;
}

export interface PoolsResponse {
  quote: TokenInfo;
  makers: MakerPublic[];
  pools: PoolWithStats[];
}

export interface Health {
  ok: boolean;
  chainId: string;
  block: number;
  quote: TokenInfo;
  pools: Array<{ slug: string; market: string }>;
  makers: MakerPublic[];
}

/** A maker's private quote opening for one round. Only ever sent to the prover, never to the chain. */
export interface OpeningClaim {
  chainId: number;
  market: string;
  rfqId: string;
  maker: string;
  priceE6: string;
  salt: string;
}

export interface SignedOpening extends OpeningClaim {
  /** EIP-191 signature by `maker` over `openingMessage(claim)`. */
  signature: string;
}
