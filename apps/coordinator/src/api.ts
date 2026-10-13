import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readRfq, web3 } from "./chain.ts";
import { config } from "./config.ts";
import { makers } from "./makers.ts";
import { poolBySlug, pools, registry, type Pool } from "./pools.ts";
import { getRound, publicView } from "./rounds.ts";

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

async function roundView(res: ServerResponse, pool: Pool, rfqId: bigint, proofOnly: boolean) {
  const chain = await readRfq(pool.market, rfqId);
  if (chain.status === 0) return json(res, 404, { error: "unknown rfq" });
  const round = getRound(pool.slug, chain.rfqId);
  const offchain = round ? publicView(round) : { pool: pool.slug, rfqId: chain.rfqId, phase: "open", commits: [], updatedAt: 0 };
  if (proofOnly) return json(res, 200, { pool: pool.slug, rfqId: chain.rfqId, proof: round?.proof ?? null, publicInputs: round?.proof?.publicInputs ?? null });
  const { proof, ...rest } = offchain as typeof offchain & { proof?: { proof: string } & Record<string, unknown> };
  const proofSummary = proof ? { ...proof, proof: undefined, proofBytes: (proof.proof.length - 2) / 2 } : undefined;
  return json(res, 200, { pool: pool.public(), chain, offchain: { ...rest, proof: proofSummary }, makers: makers.map((x) => x.public()), explorerTxBase: config.explorerTxBase });
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "GET") return json(res, 405, { error: "GET only" });

  if (url.pathname === "/api/health") {
    const block = Number(await web3.eth.getBlockNumber());
    return json(res, 200, { ok: true, chainId: config.chainId, block, quote: registry!.quote, pools: pools.map((p) => ({ slug: p.slug, market: p.spec.market })), makers: makers.map((m) => m.public()) });
  }
  if (url.pathname === "/api/makers") return json(res, 200, makers.map((m) => m.public()));
  if (url.pathname === "/api/pools") return json(res, 200, { quote: registry!.quote, makers: makers.map((m) => m.public()), pools: pools.map((p) => p.public()) });

  const byPool = url.pathname.match(/^\/api\/pools\/([a-z0-9-]+)\/rfq\/(\d+)(\/proof)?$/);
  if (byPool) {
    const pool = poolBySlug(byPool[1]);
    if (!pool) return json(res, 404, { error: "unknown pool" });
    return roundView(res, pool, BigInt(byPool[2]), !!byPool[3]);
  }
  const legacy = url.pathname.match(/^\/api\/rfq\/(\d+)(\/proof)?$/);
  if (legacy) return roundView(res, pools[0], BigInt(legacy[1]), !!legacy[2]);
  return json(res, 404, { error: "not found" });
}

export function startApi() {
  const server = createServer((req, res) => {
    handle(req, res).catch((err) => json(res, 500, { error: (err as Error).message }));
  });
  server.listen(config.port, () => console.log(`api: http://localhost:${config.port}/api/pools`));
  return server;
}
