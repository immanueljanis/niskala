export function shortAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function shortHash(hash: string, chars = 6): string {
  if (!hash) return "";
  return `${hash.slice(0, 2 + chars)}…${hash.slice(-chars)}`;
}

/** USDC price with 6 decimals -> "3,504.20"; sub-dollar assets keep enough digits to be meaningful ("0.0249"). */
export function fmtPriceE6(priceE6: string | bigint): string {
  const n = Number(BigInt(priceE6)) / 1e6;
  const digits = n >= 1 ? 2 : n >= 0.01 ? 4 : 6;
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Token amount in base units -> decimal string with up to `dp` fraction digits. */
export function fmtUnits(amount: string | bigint, decimals: number, dp = 2): string {
  const v = BigInt(amount);
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = v % base;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, dp).replace(/0+$/, "");
  const wholeStr = whole.toLocaleString("en-US");
  return fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
}

export function toUnits(amount: string, decimals: number): string {
  const [whole = "0", frac = ""] = amount.trim().split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0")).toString();
}

export function fmtCountdown(deadlineSec: number, nowMs: number): string {
  const s = Math.max(0, deadlineSec - Math.floor(nowMs / 1000));
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour12: false });
}

/** "COMMIT_CLOSED" → "Commit closed" for status pills. */
export function statusLabel(name: string): string {
  const s = name.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
