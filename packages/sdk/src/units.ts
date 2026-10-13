/** "1.5" with 18 decimals → "1500000000000000000". Throws on malformed input. */
export function parseUnits(amount: string, decimals: number): string {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!m) throw new Error(`invalid amount "${amount}"`);
  const frac = (m[2] ?? "").slice(0, decimals).padEnd(decimals, "0");
  return (BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt(frac || "0")).toString();
}

/** "1500000000000000000" with 18 decimals → "1.5" (trailing zeros trimmed). */
export function formatUnits(amount: string | bigint, decimals: number): string {
  const v = BigInt(amount);
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** USDC per base unit with 6 decimals → decimal string ("2528000796" → "2528.000796"). */
export function formatPriceE6(priceE6: string | bigint): string {
  return formatUnits(priceE6, 6);
}

/** "2528.00" → "2528000000". */
export function parsePriceE6(price: string): string {
  return parseUnits(price, 6);
}
