import type { Metadata } from "next";
import { Deck } from "@/components/pitch/Deck";

export const metadata: Metadata = {
  title: "Pitch — Niskala",
  description: "Private quotes. Provably best execution. The Niskala pitch, Monad Metropolis 2026.",
};

export default function PitchPage() {
  return <Deck />;
}
