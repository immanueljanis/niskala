import { Web3 } from "web3";
import type { Eip1193Provider } from "./client.ts";
import type { OpeningClaim, SignedOpening } from "./types.ts";

/**
 * The opening protocol: a maker hands (price, salt) for one round to the prover over HTTP, signed with
 * the same key that sent the commit transaction. The coordinator recovers the signer, checks it is a
 * committed maker of that round and that Poseidon2(domain, rfqId, maker, price, salt) equals the
 * commitment stored onchain. Only then does the opening enter the witness. Nothing here touches the chain.
 */
export function openingMessage(c: OpeningClaim): string {
  return ["Niskala quote opening", `chainId: ${c.chainId}`, `market: ${c.market.toLowerCase()}`, `rfqId: ${c.rfqId}`, `maker: ${c.maker.toLowerCase()}`, `priceE6: ${c.priceE6}`, `salt: ${c.salt}`].join("\n");
}

const utils = new Web3().eth.accounts;

/** EIP-191 `personal_sign` with a private key (Node) or an injected wallet (browser). */
export async function signOpening(claim: OpeningClaim, signer: { privateKey: string } | { provider: Eip1193Provider }): Promise<SignedOpening> {
  const message = openingMessage(claim);
  if ("privateKey" in signer) {
    const key = signer.privateKey.startsWith("0x") ? signer.privateKey : `0x${signer.privateKey}`;
    return { ...claim, signature: utils.sign(message, key).signature };
  }
  const hex = `0x${Buffer.from(message, "utf8").toString("hex")}`;
  const signature = (await signer.provider.request({ method: "personal_sign", params: [hex, claim.maker] })) as string;
  return { ...claim, signature };
}

/** Address that signed the opening, lower-cased. Throws on a malformed signature. */
export function recoverOpeningSigner(opening: SignedOpening): string {
  return utils.recover(openingMessage(opening), opening.signature).toLowerCase();
}

/** 31 random bytes as a field-safe bigint. */
export function randomSalt(): bigint {
  const bytes = new Uint8Array(31);
  globalThis.crypto.getRandomValues(bytes);
  return bytes.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
}
