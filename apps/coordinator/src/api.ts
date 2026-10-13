import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { recoverOpeningSigner, type MakerPublic, type SignedOpening } from "@niskala/sdk";
import { quoteCommitment, toHex32 } from "@niskala/zk";
import { readRfq, Status, web3, type ChainRfq } from "./chain.ts";
import { config } from "./config.ts";
import { historyStatus } from "./history.ts";
import { makers } from "./makers.ts";
import { poolBySlug, pools, registry, type Pool } from "./pools.ts";
import { getRound, publicView, recordOpening, updateRound } from "./rounds.ts";

const MAX_BODY = 4096;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Demo makers plus any external maker that committed to this round through the SDK. */
function roster(chain: ChainRfq): MakerPublic[] {
  const list = makers.map((m) => m.public());
  for (const a of chain.makers.slice(0, chain.commitmentCount)) {
    if (list.some((m) => m.address.toLowerCase() === a.toLowerCase())) continue;
    list.push({ id: `ext-${a.slice(2, 8).toLowerCase()}`, address: a, displayName: `Maker ${a.slice(0, 6)}…${a.slice(-4)}`, tier: "External maker" });
  }
  return list;
}

async function roundView(res: ServerResponse, pool: Pool, rfqId: bigint, proofOnly: boolean) {
  const chain = await readRfq(pool.market, rfqId);
  if (chain.status === 0) return json(res, 404, { error: "unknown rfq" });
  let round = getRound(pool.slug, chain.rfqId);
  if (round?.proof && round.proof.publicInputs.length === 0 && chain.status >= Status.PROVEN && chain.status !== Status.CANCELLED) {
    const pi = (await pool.market.methods.publicInputs(rfqId, round.proof.winnerIndex, round.proof.winningPriceE6).call()) as string[];
    round = updateRound(pool.slug, chain.rfqId, { proof: { ...round.proof, publicInputs: pi.map(String) } });
  }
  const offchain = round ? publicView(round) : { pool: pool.slug, rfqId: chain.rfqId, phase: "open", commits: [], updatedAt: 0 };
  if (proofOnly) return json(res, 200, { pool: pool.slug, rfqId: chain.rfqId, proof: round?.proof ?? null, publicInputs: round?.proof?.publicInputs ?? null });
  const { proof, ...rest } = offchain as typeof offchain & { proof?: { proof: string } & Record<string, unknown> };
  const proofSummary = proof ? { ...proof, proof: undefined, proofBytes: (proof.proof.length - 2) / 2 } : undefined;
  return json(res, 200, { pool: pool.public(), chain, offchain: { ...rest, proof: proofSummary }, makers: roster(chain), explorerTxBase: config.explorerTxBase });
}

const isDigits = (v: unknown): v is string => typeof v === "string" && /^\d{1,40}$/.test(v);
const isAddress = (v: unknown): v is string => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);

/**
 * External makers hand their (price, salt) for a round to the prover here. The opening is accepted only
 * when it is signed by the maker, the maker has a commitment onchain in this round, and the recomputed
 * Poseidon2 commitment equals that onchain commitment. Openings are never served back out.
 */
async function acceptOpening(res: ServerResponse, pool: Pool, rfqId: string, raw: string) {
  let body: Partial<SignedOpening>;
  try {
    body = JSON.parse(raw) as Partial<SignedOpening>;
  } catch {
    return json(res, 400, { error: "invalid JSON" });
  }
  if (!isAddress(body.maker) || !isAddress(body.market) || !isDigits(body.priceE6) || !isDigits(body.salt) || !isDigits(body.rfqId) || typeof body.signature !== "string" || typeof body.chainId !== "number") {
    return json(res, 400, { error: "expected { chainId, market, rfqId, maker, priceE6, salt, signature }" });
  }
  const opening = body as SignedOpening;
  if (BigInt(opening.chainId) !== config.chainId) return json(res, 400, { error: `wrong chainId; this coordinator serves ${config.chainId}` });
  if (opening.market.toLowerCase() !== pool.spec.market.toLowerCase()) return json(res, 400, { error: `market does not match pool ${pool.slug}` });
  if (opening.rfqId !== rfqId) return json(res, 400, { error: "rfqId does not match the path" });
  if (BigInt(opening.priceE6) === 0n) return json(res, 400, { error: "priceE6 must be positive" });
  let signer: string;
  try {
    signer = recoverOpeningSigner(opening);
  } catch {
    return json(res, 400, { error: "malformed signature" });
  }
  if (signer !== opening.maker.toLowerCase()) return json(res, 401, { error: "signature does not match maker" });

  const chain = await readRfq(pool.market, BigInt(rfqId));
  if (chain.status === Status.NONE) return json(res, 404, { error: "unknown rfq" });
  if (chain.status !== Status.OPEN && chain.status !== Status.COMMIT_CLOSED) return json(res, 409, { error: `round is ${chain.statusName}; openings are no longer needed` });
  const slot = chain.makers.slice(0, chain.commitmentCount).findIndex((a) => a.toLowerCase() === signer);
  if (slot < 0) return json(res, 409, { error: "maker has no commitment onchain in this round yet; send the commit transaction first" });
  const expected = toHex32(await quoteCommitment({ domain: pool.domain, rfqId: BigInt(rfqId), maker: opening.maker, priceE6: BigInt(opening.priceE6), salt: BigInt(opening.salt) }));
  if (expected.toLowerCase() !== chain.commitments[slot].toLowerCase()) return json(res, 422, { error: "opening does not hash to the onchain commitment" });

  recordOpening(pool.slug, rfqId, opening.maker, { priceE6: opening.priceE6, salt: opening.salt });
  console.log(new Date().toISOString(), `${pool.slug} #${rfqId}: opening accepted from external maker ${opening.maker} (slot ${slot})`);
  return json(res, 200, { ok: true, slot });
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "OPTIONS") return json(res, 204, {});

  if (req.method === "POST") {
    const m = url.pathname.match(/^\/api\/pools\/([a-z0-9-]+)\/rfq\/(\d+)\/openings$/);
    if (!m) return json(res, 404, { error: "not found" });
    const pool = poolBySlug(m[1]);
    if (!pool) return json(res, 404, { error: "unknown pool" });
    let raw: string;
    try {
      raw = await readBody(req);
    } catch (err) {
      return json(res, 413, { error: (err as Error).message });
    }
    return acceptOpening(res, pool, m[2], raw);
  }
  if (req.method !== "GET") return json(res, 405, { error: "GET or POST only" });

  if (url.pathname === "/api/health") {
    const block = Number(await web3.eth.getBlockNumber());
    return json(res, 200, { ok: true, chainId: config.chainId, block, quote: registry!.quote, pools: pools.map((p) => ({ slug: p.slug, market: p.spec.market })), makers: makers.map((m) => m.public()), history: historyStatus });
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
