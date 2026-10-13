import Image from "next/image";
import { QUOTE, type PoolSpec } from "@/lib/pools";

/** Base-over-quote token pair mark. */
export function PoolLogo({ pool, size = 36 }: { pool: PoolSpec; size?: number }) {
  const small = Math.round(size * 0.58);
  return (
    <span className="relative inline-block shrink-0" style={{ width: size + small * 0.45, height: size }} aria-hidden>
      <Image src={pool.base.logo} alt="" width={size} height={size} className="rounded-full bg-surface object-cover ring-2 ring-surface" />
      <Image src={QUOTE.logo} alt="" width={small} height={small} className="absolute bottom-0 right-0 rounded-full bg-surface object-cover ring-2 ring-surface" />
    </span>
  );
}

export function TokenLogo({ src, size = 20 }: { src: string; size?: number }) {
  return <Image src={src} alt="" width={size} height={size} className="inline-block rounded-full bg-surface object-cover" aria-hidden />;
}
