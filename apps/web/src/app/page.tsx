import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Boundary } from "@/components/landing/Boundary";
import { Compare } from "@/components/landing/Compare";
import { ContractPill } from "@/components/landing/ContractPill";
import { Faq } from "@/components/landing/Faq";
import { FlowStepper } from "@/components/landing/FlowStepper";
import { HeroScene } from "@/components/landing/HeroScene";
import { Markets } from "@/components/landing/Markets";
import { Replay } from "@/components/landing/Replay";
import { Reveal } from "@/components/landing/Reveal";
import { StatsStrip } from "@/components/landing/StatsStrip";

const MOVES = [
  { n: "01", label: "Request", href: "#flow" },
  { n: "02", label: "Seal", href: "#flow" },
  { n: "03", label: "Prove and settle", href: "#flow" },
];

export default function Landing() {
  return (
    <div>
      <section className="relative">
        <div className="absolute inset-x-0 top-0 h-[78vh] min-h-[560px]">
          <HeroScene />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-bg to-transparent" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-5 pt-28 text-center md:pt-36">
          <Reveal>
            <h1 className="display max-w-4xl text-[clamp(2.75rem,7.2vw,5.75rem)]">
              Private quotes.
              <br />
              Provably best execution.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">Makers quote in secret. A proof verified on Monad shows the best quote won. Only that price is revealed.</p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/trade" className="btn btn-primary">
                Open the terminal <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Link>
              <a href="#replay" className="btn btn-secondary">
                See a live round
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="mt-6">
              <ContractPill />
            </div>
          </Reveal>
        </div>

        <div className="relative mx-auto mt-20 max-w-7xl px-5 md:mt-28">
          <Reveal>
            <div className="card grid gap-8 p-8 md:grid-cols-[1.1fr_1fr] md:gap-12 md:p-12">
              <div>
                <div className="label">What happens in a round</div>
                <h2 className="display mt-3 text-3xl md:text-[2.5rem]">Sealed competition, verified result.</h2>
              </div>
              <p className="self-end text-[15px] leading-relaxed text-muted">A trader opens an RFQ. Up to five makers commit hidden quotes. One proof picks the best, and the contract settles at that price.</p>
              <div className="grid gap-3 sm:grid-cols-3 md:col-span-2">
                {MOVES.map((m) => (
                  <a key={m.n} href={m.href} className="tile flex items-center justify-between px-5 py-4 text-sm transition-colors hover:bg-[#e2e8e5]">
                    <span>
                      <span className="mono mr-3 text-xs text-dim">{m.n}</span>
                      {m.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-dim" strokeWidth={1.6} />
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-16 md:pt-24">
        <Reveal>
          <StatsStrip />
        </Reveal>
      </section>

      <section id="markets" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-24 md:pt-32">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="display text-3xl md:text-[2.5rem]">Eight markets, one proof.</h2>

          </div>
        </Reveal>
        <div className="mt-8">
          <Reveal delay={0.1}>
            <Markets />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-24 md:pt-32">
        <Reveal>
          <h2 className="display max-w-2xl text-3xl md:text-[2.5rem]">Makers were always private. Routers were always trusted.</h2>
        </Reveal>
        <div className="mt-8">
          <Reveal delay={0.1}>
            <Compare />
          </Reveal>
        </div>
      </section>

      <section id="flow" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-24 md:pt-32">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="display text-3xl md:text-[2.5rem]">One round, five moves.</h2>

          </div>
        </Reveal>
        <div className="mt-8">
          <Reveal delay={0.1}>
            <FlowStepper />
          </Reveal>
        </div>
      </section>

      <section id="replay" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-24 md:pt-32">
        <Reveal>
          <h2 className="display max-w-2xl text-3xl md:text-[2.5rem]">Not a mock. This round ran on Monad.</h2>
        </Reveal>
        <div className="mt-8">
          <Reveal delay={0.1}>
            <Replay />
          </Reveal>
        </div>
      </section>

      <section id="privacy" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-24 md:pt-32">
        <Reveal>
          <h2 className="display max-w-2xl text-3xl md:text-[2.5rem]">The market sees the result, not the losing book.</h2>
        </Reveal>
        <div className="mt-8">
          <Reveal delay={0.1}>
            <Boundary />
          </Reveal>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-24 md:pt-32">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Reveal>
            <h2 className="display text-3xl md:text-[2.5rem]">Questions a judge asks first.</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Faq />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-24 md:pt-32">
        <Reveal>
          <div className="rounded-2xl bg-brand px-8 py-14 text-center text-white md:py-20">
            <h2 className="display mx-auto max-w-2xl text-3xl md:text-5xl">Sealed quotes. Proven price.</h2>
            <Link href="/trade" className="btn mt-8 bg-white text-text hover:bg-bg">
              Request private quotes <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
