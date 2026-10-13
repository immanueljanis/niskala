"use client";

import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const FALLBACK_MS = 2500;

export const rise: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(3px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};

export const stagger = (gap = 0.08): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: 0.05 } },
});

/** True once the element is in view, or after a short fallback so content never stays hidden. */
function useShown(ref: React.RefObject<HTMLElement | null>) {
  const inView = useInView(ref, { once: true, amount: 0.15, margin: "0px 0px -8% 0px" });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);
  return inView || timedOut;
}

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const shown = useShown(ref);
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div ref={ref} className={className} initial="hidden" animate={shown ? "show" : "hidden"} variants={rise} transition={{ delay }}>
      {children}
    </motion.div>
  );
}

export function RevealGroup({ children, className = "", gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const shown = useShown(ref);
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div ref={ref} className={className} initial="hidden" animate={shown ? "show" : "hidden"} variants={stagger(gap)}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={rise}>
      {children}
    </motion.div>
  );
}
