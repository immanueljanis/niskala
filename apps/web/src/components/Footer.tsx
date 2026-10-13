import Link from "next/link";
import { NETWORK, EXPLORER_URL } from "@/lib/chain/network";
import { POOLS, QUOTE, VERIFIER } from "@/lib/pools";
import { AddressLink } from "./ui";

export function Footer() {
  return (
    <footer className="mt-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 text-sm text-muted md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="display text-2xl text-text">Niskala</div>
          <div>Private quotes. Provably best execution.</div>
          <div className="text-xs text-dim">Monad Metropolis · Track 01</div>
          <div className="text-xs text-dim">Round history indexed with Envio HyperSync</div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:gap-14">
          <div className="space-y-1.5 text-xs">
            <div className="text-dim">Contracts · {NETWORK.name}</div>
            <div>
                  Markets <span className="text-text">{POOLS.length}</span> · see terminal
                </div>
                <div>
                  HonkVerifier <AddressLink address={VERIFIER} chars={6} />
                </div>
                <div>
                  Mock USDC <AddressLink address={QUOTE.address} chars={6} />
                </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="text-dim">Links</div>
            <div>
              <Link href="/trade" className="hover:text-text">
                RFQ terminal
              </Link>
            </div>
            <div>
              <Link href="/rfq/weth-usdc/2" className="hover:text-text">
                Round #2 receipt
              </Link>
            </div>
            <div>
              <Link href="/pitch" className="hover:text-text">
                Pitch
              </Link>
            </div>
            <div>
              <a href="https://github.com/immanueljanis/niskala/tree/main/packages/sdk" target="_blank" rel="noreferrer" className="hover:text-text">
                SDK guide
              </a>
            </div>
            <div>
              <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="hover:text-text">
                MonadVision explorer
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
