import type { Health, MakerPublic, PoolsResponse, ProofSummary, RoundView, SignedOpening } from "./types.ts";

export interface ProofResponse {
  pool: string;
  rfqId: string;
  proof: ({ proof: string } & ProofSummary) | null;
  publicInputs: string[] | null;
}

/**
 * Read client for the Niskala coordinator (the process that runs the demo makers and the prover).
 * Everything here is public data; the coordinator never serialises quote openings.
 */
export class CoordinatorClient {
  /** `fetchImpl` is called unbound, so browser `fetch` is wrapped (calling window.fetch as a method of another object throws). */
  constructor(
    readonly baseUrl = "http://localhost:8787",
    private readonly fetchImpl: typeof fetch = (input, init) => globalThis.fetch(input, init),
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { cache: "no-store", ...init });
    if (!res.ok) {
      let detail = "";
      try {
        detail = ((await res.json()) as { error?: string }).error ?? "";
      } catch {
        /* non-JSON error body */
      }
      throw new Error(`${path}: ${res.status}${detail ? ` ${detail}` : ""}`);
    }
    return (await res.json()) as T;
  }

  health = () => this.request<Health>("/api/health");
  makers = () => this.request<MakerPublic[]>("/api/makers");
  pools = () => this.request<PoolsResponse>("/api/pools");
  round = (pool: string, rfqId: string) => this.request<RoundView>(`/api/pools/${pool}/rfq/${rfqId}`);
  proof = (pool: string, rfqId: string) => this.request<ProofResponse>(`/api/pools/${pool}/rfq/${rfqId}/proof`);

  /** Hands a maker's signed opening to the prover (see `@niskala/sdk/maker`). */
  submitOpening = (pool: string, opening: SignedOpening) =>
    this.request<{ ok: true; slot: number }>(`/api/pools/${pool}/rfq/${opening.rfqId}/openings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opening),
    });
}
