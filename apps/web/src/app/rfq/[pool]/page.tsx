import { redirect } from "next/navigation";

/** Legacy `/rfq/<id>` links point at the first market; a bare pool slug opens the terminal on that market. */
export default async function LegacyRoundPage({ params }: { params: Promise<{ pool: string }> }) {
  const { pool } = await params;
  if (/^\d+$/.test(pool)) redirect(`/rfq/weth-usdc/${pool}`);
  redirect(`/trade?pool=${pool}`);
}
