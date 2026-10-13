export const BN254_FR = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Big-endian 32-byte encoding of a field element, as bb.js expects. */
export function toField(value: bigint | number | string): Uint8Array {
  let v = BigInt(value);
  if (v < 0n || v >= BN254_FR) throw new Error(`value out of BN254 field: ${v}`);
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

export function fromField(bytes: Uint8Array): bigint {
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  return v;
}

export function toHex32(value: bigint | number | string): `0x${string}` {
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
}

export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

export function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex.replace(/^0x/, ""), "hex"));
}

/** (chainId << 160) | marketAddress — must match RfqMarket.DOMAIN. */
export function domainSeparator(chainId: bigint | number, market: string): bigint {
  return (BigInt(chainId) << 160n) | BigInt(market);
}
