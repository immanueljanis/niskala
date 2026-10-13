import type { ReactNode } from "react";
import { txUrl, addressUrl } from "@/lib/chain/network";
import { shortAddress, shortHash } from "@/lib/format";

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`label ${className}`}>{children}</div>;
}

export type Tone = "neutral" | "verified" | "pending" | "error" | "accent";

const toneClass: Record<Tone, string> = {
  neutral: "bg-tile text-muted",
  verified: "bg-[#e3efe8] text-verified",
  pending: "bg-[#f4ebdb] text-pending",
  error: "bg-[#f6e3e2] text-error",
  accent: "bg-[#e3efe8] text-accent",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-dim",
  verified: "bg-verified",
  pending: "bg-pending",
  error: "bg-error",
  accent: "bg-accent",
};

export function Pill({ tone = "neutral", children, pulse = false }: { tone?: Tone; children: ReactNode; pulse?: boolean }) {
  return (
    <span className={`inline-flex h-6 items-center gap-2 rounded-full px-2.5 text-[11px] font-medium tracking-[0.06em] uppercase ${toneClass[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass[tone]} ${pulse ? "animate-blink" : ""}`} />
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Field({ label, value, mono = false, className = "" }: { label: ReactNode; value: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="text-xs text-dim">{label}</div>
      <div className={`text-sm text-text ${mono ? "mono" : ""}`}>{value}</div>
    </div>
  );
}

export function TxLink({ hash, chars = 6 }: { hash: string; chars?: number }) {
  return (
    <a className="mono text-accent underline-offset-4 hover:underline" href={txUrl(hash)} target="_blank" rel="noreferrer">
      {shortHash(hash, chars)}
    </a>
  );
}

export function AddressLink({ address, chars = 4 }: { address: string; chars?: number }) {
  return (
    <a className="mono text-text underline-offset-4 hover:underline" href={addressUrl(address)} target="_blank" rel="noreferrer">
      {shortAddress(address, chars)}
    </a>
  );
}

export function Divider() {
  return <div className="h-px bg-hairline" />;
}

export function Notice({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-lg px-4 py-3 text-sm ${toneClass[tone]}`}>{children}</div>;
}
