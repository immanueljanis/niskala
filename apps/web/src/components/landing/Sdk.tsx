import { ArrowUpRight } from "lucide-react";

const SNIPPET = `import { Niskala } from "@niskala/sdk";

const niskala = new Niskala({ provider: window.ethereum });

const { rfqId } = await niskala.createRfq("weth-usdc", amount, { from });
const proven = await niskala.waitForProof("weth-usdc", rfqId);
await niskala.executeRfq("weth-usdc", rfqId, { from });`;

const SURFACES = [
  ["Trader", "open a round, wait for the proof, execute at the proven price"],
  ["Maker", "deposit, seal a Poseidon2 quote, hand the opening to the prover"],
  ["Reader", "pools, rounds, proofs and public inputs from the coordinator"],
  ["Prover", "build and verify the best-execution proof yourself"],
];

export function Sdk() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <p className="max-w-md text-[15px] leading-relaxed text-muted">One TypeScript package over Web3.js. Works in the browser with an injected wallet and in Node with a private key. The same client the terminal runs on.</p>
        <ul className="mt-6 space-y-3">
          {SURFACES.map(([name, what]) => (
            <li key={name} className="flex items-baseline gap-3 text-sm">
              <span className="w-14 shrink-0 text-text">{name}</span>
              <span className="text-muted">{what}</span>
            </li>
          ))}
        </ul>
        <a href="https://github.com/immanueljanis/niskala/tree/main/packages/sdk" target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-1.5 text-sm text-accent underline-offset-4 hover:underline">
          Read the SDK guide <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} />
        </a>
      </div>
      <div className="rounded-xl bg-brand p-6 text-white">
        <div className="mono text-xs text-white/50">pnpm add @niskala/sdk web3</div>
        <pre className="mono mt-4 overflow-x-auto text-[13px] leading-relaxed text-white/90">{SNIPPET}</pre>
      </div>
    </div>
  );
}
