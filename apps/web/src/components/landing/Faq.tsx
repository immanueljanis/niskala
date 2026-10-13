import { Plus } from "lucide-react";

const QA: Array<[string, string]> = [
  ["Aren't RFQ quotes already private?", "Yes, and that is not the claim. Niskala makes the selection verifiable: a proof over the complete set of committed quotes shows the winner was the best valid one, while the losing prices stay non-public."],
  ["Does the prover see the losing quotes?", "In this build, yes: the coordinator that runs the demo makers builds the witness. The trader, the frontend and the chain never see them. Privacy against the prover is the production roadmap."],
  ["Why a proof instead of revealing everything?", "A transparent auction leaks every price and turns a private venue into a public order book over time. A private router hides prices but asks for trust. The proof verifies the outcome without publishing the inputs."],
  ["Why Monad?", "One round is five state transitions with a 5.8 M gas proof verification in the middle. Fast finality keeps the loop inside a trading workflow, and the verifier is an ordinary contract call."],
  ["What is fixed in this version?", "Up to five maker slots per round (a round closes at five commitments or at the deadline with at least three), one quote asset, the buy side, full fills. The circuit takes all five slots plus the count as public inputs, so the proof is explicitly about the complete committed set."],
];

export function Faq() {
  return (
    <div className="divide-y divide-hairline">
      {QA.map(([q, a]) => (
        <details key={q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg text-text [&::-webkit-details-marker]:hidden">
            {q}
            <Plus className="h-4 w-4 shrink-0 text-dim transition-transform duration-300 group-open:rotate-45" strokeWidth={1.6} />
          </summary>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
