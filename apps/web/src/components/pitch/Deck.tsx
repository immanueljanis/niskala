"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Clock, Eye, EyeOff, Lock, ShieldCheck, Users, X, Zap } from "lucide-react";
import { txUrl } from "@/lib/chain/network";

const EASE = [0.16, 1, 0.3, 1] as const;

function Mark({ size = 96 }: { size?: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[22%] bg-brand shadow-[0_1px_2px_rgba(15,22,19,0.08),0_16px_40px_-18px_rgba(22,63,47,0.6)]" style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} aria-hidden>
        <path d="M9 23V9l14 14V9" fill="none" stroke="#F5F7F6" strokeWidth="2.2" strokeLinecap="square" />
      </svg>
    </span>
  );
}

function Headline({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`display text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] text-text ${className}`}>{children}</h2>;
}

function Card({ icon: Icon, title, body, tone = "neutral" }: { icon: typeof Lock; title: string; body: string; tone?: "neutral" | "good" | "bad" }) {
  const iconTone = tone === "good" ? "text-verified" : tone === "bad" ? "text-error" : "text-accent";
  return (
    <div className="card p-6 text-left">
      <Icon className={`h-5 w-5 ${iconTone}`} strokeWidth={1.6} />
      <div className="mt-4 text-lg text-text">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Node({ label, sub, strong = false }: { label: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl px-5 py-4 text-center ${strong ? "bg-brand text-white" : "card"}`}>
      <div className={`text-base ${strong ? "text-white" : "text-text"}`}>{label}</div>
      {sub && <div className={`mt-1 text-xs ${strong ? "text-white/70" : "text-dim"}`}>{sub}</div>}
    </div>
  );
}

const Arrow = () => <ArrowRight className="h-5 w-5 shrink-0 text-dim" strokeWidth={1.6} aria-hidden />;

const ROUND_TXS = [
  { label: "RFQ opened, buy 10 WETH", tx: "0x443e541c09da34a71c1c828a83b9b8e3649e53c3032dac79921bafa7c677e042" },
  { label: "5 sealed quotes", tx: "0x5b6216bcc7980cbd3d8499137f8b761b32de876fa1d1152629847f5a6daba04c" },
  { label: "Proof verified by the contract", tx: "0x80d1f0d473fa286aa956dae2eba8c83f5e8fe60a09f8a539bdbd36754dcce9d0" },
  { label: "Settled at 2,528.00 USDC", tx: "0x419784383ed2c25ff844d67e45274416c8f892b8745dbb4315b0886c31b9a764" },
];

interface Slide {
  kicker: string;
  body: ReactNode;
}

const SLIDES: Slide[] = [
  {
    kicker: "Monad Metropolis 2026 · Onchain Finance & Trading",
    body: (
      <div className="flex flex-col items-center text-center">
        <Mark size={104} />
        <h1 className="display mt-8 text-[clamp(3.5rem,9vw,7rem)] leading-none text-text">Niskala</h1>
        <p className="mt-6 text-[clamp(1.1rem,2vw,1.5rem)] text-muted">
          Private quotes. <span className="text-text">Provably best execution.</span>
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#e3efe8] px-4 py-1.5 text-sm text-verified">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.6} /> A sealed RFQ market on Monad
        </span>
      </div>
    ),
  },
  {
    kicker: "The setup",
    body: (
      <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1fr_1fr]">
        <div>
          <Headline>Big trades happen in private.</Headline>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">You ask a few trading firms for a price and take the cheapest. You never see the others.</p>
        </div>
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] border-b border-hairline px-5 py-3 text-sm text-text">
            <span>What the trader can check</span>
            <span>Status</span>
          </div>
          {[
            ["The price they got", true],
            ["That the trade settled", true],
            ["The other quotes", false],
            ["That the best quote won", false],
            ["That no maker was favoured", false],
          ].map(([label, ok]) => (
            <div key={String(label)} className="grid grid-cols-[1fr_auto] items-center border-b border-hairline px-5 py-3 text-sm text-muted last:border-0">
              <span>{label}</span>
              {ok ? <Check className="h-5 w-5 justify-self-center rounded-full bg-verified p-0.5 text-white" strokeWidth={2.4} /> : <X className="h-5 w-5 justify-self-center text-error" strokeWidth={2} />}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    kicker: "The problem",
    body: (
      <div className="flex flex-col items-center text-center">
        <Headline>Every private trade ends with four words.</Headline>
        <div className="display mt-10 text-[clamp(3rem,8vw,6.5rem)] leading-none text-brand">&ldquo;Trust me. Best price.&rdquo;</div>
        <p className="mt-8 max-w-xl text-lg text-muted">Someone picked the winner. You cannot check it.</p>
      </div>
    ),
  },
  {
    kicker: "The trap",
    body: (
      <div className="w-full max-w-5xl text-center">
        <Headline>Privacy, or proof. Pick one.</Headline>
        <div className="mt-10 grid gap-4 text-left md:grid-cols-2">
          <Card icon={Eye} tone="bad" title="Prices on the blockchain" body="Everyone sees every price, so the firms stop giving their best one." />
          <Card icon={EyeOff} tone="bad" title="Prices hidden" body="Someone in the middle picks the winner. You just have to believe them." />
        </div>
      </div>
    ),
  },
  {
    kicker: "Meet Niskala",
    body: (
      <div className="flex w-full max-w-5xl flex-col items-center text-center">
        <Headline>Both.</Headline>
        <p className="mt-5 max-w-2xl text-lg text-muted">The best price from every maker, and a proof that it really was the best. Losing prices stay secret.</p>
        <div className="mt-12 flex w-full flex-col items-stretch gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <Node label="5 market makers" sub="sealed quotes, full size locked" />
          </div>
          <Arrow />
          <div className="flex-1">
            <Node label="Niskala" sub="zero-knowledge proof, checked by the contract" strong />
          </div>
          <Arrow />
          <div className="flex-1">
            <Node label="Trader" sub="best price + proof, one-transaction settle" />
          </div>
        </div>
      </div>
    ),
  },
  {
    kicker: "How it works",
    body: (
      <div className="w-full max-w-5xl text-center">
        <Headline>Four steps. One proof.</Headline>
        <div className="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={Users} title="1 · Request" body="The trader asks for a fixed size, onchain. One click." />
          <Card icon={Lock} title="2 · Seal" body="Up to five makers commit a hidden price and lock the full size." />
          <Card icon={ShieldCheck} title="3 · Prove" body="A proof shows the winner is the best quote in the set. The contract verifies it." />
          <Card icon={Zap} title="4 · Settle" body="One transaction pays the winner and delivers the asset." />
        </div>
      </div>
    ),
  },
  {
    kicker: "Proof it works",
    body: (
      <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1fr_1.1fr]">
        <div>
          <Headline>Live on Monad today.</Headline>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6">
            {[
              ["8", "markets"],
              ["5", "makers per round"],
              ["27", "verified contracts"],
              ["~7 s", "per round, end to end"],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="display text-4xl text-text">{v}</div>
                <div className="mt-1 text-sm text-muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-2">
          <div className="px-4 pb-2 pt-3 text-sm text-text">WETH / USDC round #2, every step a transaction</div>
          {ROUND_TXS.map((r) => (
            <a key={r.tx} href={txUrl(r.tx)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-bg">
              <span className="text-muted">{r.label}</span>
              <span className="mono inline-flex items-center gap-1 text-xs text-accent">
                {r.tx.slice(0, 10)}… <ArrowUpRight className="h-3 w-3" strokeWidth={1.6} />
              </span>
            </a>
          ))}
        </div>
      </div>
    ),
  },
  {
    kicker: "Why Monad",
    body: (
      <div className="w-full max-w-5xl text-center">
        <Headline>The proof lives inside the trade.</Headline>
        <p className="mt-4 text-lg text-muted">Verifying a proof costs about six million gas. On Monad that fits inside a trading workflow.</p>
        <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
          <Card icon={Zap} tone="good" title="Fast blocks" body="Five sealed quotes land in about two seconds." />
          <Card icon={ShieldCheck} tone="good" title="Cheap verification" body="The contract checks a 7 KB proof as an ordinary call, every round." />
          <Card icon={Clock} tone="good" title="Seconds, not minutes" body="Request, quotes, proof and settlement finish in about seven seconds." />
        </div>
      </div>
    ),
  },
  {
    kicker: "The future",
    body: (
      <div className="w-full max-w-4xl text-center">
        <Headline>Every price with a secret behind it deserves a proof.</Headline>
        <div className="mt-12 grid gap-6 text-left md:grid-cols-2">
          <div>
            <div className="text-sm text-dim">Today</div>
            <div className="mt-3 flex items-center gap-3">
              <Node label="Makers" />
              <Arrow />
              <Node label="Router" sub="trust me" />
              <Arrow />
              <Node label="Trader" />
            </div>
          </div>
          <div>
            <div className="text-sm text-dim">With Niskala</div>
            <div className="mt-3 flex items-center gap-3">
              <Node label="Makers" />
              <Arrow />
              <Node label="Proof" sub="checked onchain" strong />
              <Arrow />
              <Node label="Trader" />
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link href="/trade" className="btn btn-primary">
            Open the terminal <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Link>
          <Link href="/rfq/weth-usdc/2" className="btn btn-secondary">
            See a proven round
          </Link>
          <a href="https://github.com/immanueljanis/niskala/tree/main/packages/sdk" target="_blank" rel="noreferrer" className="btn btn-secondary">
            SDK
          </a>
        </div>
      </div>
    ),
  },
];

export function Deck() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const reduced = useReducedMotion();
  const touchX = useRef<number | null>(null);
  const n = SLIDES.length;

  const go = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(n - 1, next));
      setI((cur) => {
        setDir(target >= cur ? 1 : -1);
        return target;
      });
    },
    [n],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(i + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, n, go]);

  const slide = SLIDES[i];
  const offset = reduced ? 0 : 40;

  return (
    <section
      className="fixed inset-x-0 bottom-0 top-16 z-10 flex flex-col overflow-hidden bg-bg"
      aria-roledescription="carousel"
      aria-label="Niskala pitch"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-6 pt-6 text-[11px] uppercase tracking-[0.22em] text-muted">
        <span>{slide.kicker}</span>
        <span className="mono tracking-normal">
          {i + 1} / {n}
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={i}
            custom={dir}
            initial={{ opacity: 0, x: dir * offset, filter: reduced ? "none" : "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -dir * offset, filter: reduced ? "none" : "blur(4px)" }}
            transition={{ duration: reduced ? 0.15 : 0.5, ease: EASE }}
            className="m-auto flex w-full justify-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${n}`}
          >
            {slide.body}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-5 pb-8">
        <button onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous slide" className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-tile disabled:opacity-30">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <button key={idx} onClick={() => go(idx)} aria-label={`Go to slide ${idx + 1}`} aria-current={idx === i ? "step" : undefined} className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? "w-6 bg-text" : "w-1.5 bg-dim/40 hover:bg-dim"}`} />
          ))}
        </div>
        <button onClick={() => go(i + 1)} disabled={i === n - 1} aria-label="Next slide" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text shadow-[0_1px_2px_rgba(15,22,19,0.06)] transition-colors hover:bg-tile disabled:opacity-30">
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>
    </section>
  );
}
