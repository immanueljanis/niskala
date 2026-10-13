"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { NETWORK } from "@/lib/chain/network";
import { shortAddress } from "@/lib/format";

const links = [
  { href: "/#markets", label: "Markets" },
  { href: "/#flow", label: "How it works" },
  { href: "/#replay", label: "Live round" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/#sdk", label: "SDK" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav() {
  const pathname = usePathname();
  const { address, connect, connecting, hasWallet, wrongNetwork, switchNetwork } = useWallet();
  const onApp = pathname !== "/";

  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5">
        <Link href="/" className="flex items-baseline gap-2 justify-self-start">
          <span className="display text-[22px] leading-none">Niskala</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[13px] text-muted transition-colors hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 justify-self-end">
          {onApp ? (
            <>
              <span className="hidden items-center gap-2 text-xs text-dim sm:inline-flex">
                <span className={`h-1.5 w-1.5 rounded-full ${wrongNetwork ? "bg-pending" : "bg-verified"}`} />
                {NETWORK.name}
              </span>
              {wrongNetwork ? (
                <button className="btn btn-secondary h-9 text-xs" onClick={switchNetwork}>
                  Switch to {NETWORK.name}
                </button>
              ) : address ? (
                <span className="mono inline-flex h-9 items-center rounded-lg bg-tile px-3 text-xs">{shortAddress(address)}</span>
              ) : (
                <button className="btn btn-primary h-9 text-xs" onClick={connect} disabled={connecting}>
                  {connecting ? "Connecting…" : hasWallet ? "Connect wallet" : "Install wallet"}
                </button>
              )}
            </>
          ) : (
            <Link href="/trade" className="btn btn-primary h-9 text-xs">
              Open terminal
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
