import { RoundClient } from "@/components/round/RoundClient";

export default async function RoundPage({ params }: { params: Promise<{ pool: string; id: string }> }) {
  const { pool, id } = await params;
  return <RoundClient poolSlug={pool} rfqId={id} />;
}
