import { COORDINATOR_URL } from "./chain/network";
import type { ChainRfq } from "./chain/contracts";
import type { PoolWithStats, TokenInfo } from "./pools";

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${COORDINATOR_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => get<Health>("/api/health"),
  makers: () => get<MakerPublic[]>("/api/makers"),
  pools: () => get<PoolsResponse>("/api/pools"),
  round: (pool: string, rfqId: string) => get<RoundView>(`/api/pools/${pool}/rfq/${rfqId}`),
  proof: (pool: string, rfqId: string) => get<{ rfqId: string; proof: ({ proof: string } & ProofSummary) | null }>(`/api/pools/${pool}/rfq/${rfqId}/proof`),
};
