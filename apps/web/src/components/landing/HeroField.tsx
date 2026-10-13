"use client";

import { useEffect, useRef } from "react";

/**
 * Generative hero for a light page: a quiet field of grey-green points with three denser
 * "sealed" lanes drifting upward. Every seven seconds a proof line sweeps across and one
 * lane resolves into a single deep-green node while the other two fade to amber.
 * Pure canvas. Reduced motion renders one static frame.
 */
export function HeroField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let mouseX = 0.5;
    let mouseY = 0.5;
    const start = performance.now();

    interface P {
      x: number;
      y: number;
      lane: number;
      speed: number;
      size: number;
      phase: number;
    }
    let points: P[] = [];
    const LANES = [0.26, 0.5, 0.74];
    const CYCLE = 7000;
    const LINE_Y = 0.15;
    const INK = "22, 63, 47";
    const GREY = "90, 103, 98";
    const AMBER = "183, 121, 31";

    function seed() {
      const n = Math.round((w * h) / 1700);
      points = [];
      for (let i = 0; i < n; i++) {
        const inLane = Math.random() < 0.6;
        const lane = inLane ? Math.floor(Math.random() * 3) : -1;
        const x = inLane ? LANES[lane] + (Math.random() - 0.5) * 0.08 : Math.random();
        points.push({ x, y: Math.random(), lane, speed: 0.01 + Math.random() * 0.025, size: inLane ? 1.2 + Math.random() * 1.2 : 0.6 + Math.random() * 0.8, phase: Math.random() * Math.PI * 2 });
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function frame(now: number) {
      const t = (now - start) / 1000;
      const cycleT = ((now - start) % CYCLE) / CYCLE;
      const sweepX = cycleT < 0.55 ? -0.1 + (cycleT / 0.55) * 1.2 : 2;
      const resolved = cycleT >= 0.55 && cycleT < 0.95;
      const resolveK = resolved ? Math.min(1, (cycleT - 0.55) / 0.12) : 0;
      const winner = 1;
      const px = (mouseX - 0.5) * 10;
      const py = (mouseY - 0.5) * 6;

      ctx!.clearRect(0, 0, w, h);

      for (const p of points) {
        if (!reduced) {
          p.y -= p.speed * 0.016;
          if (p.y < -0.02) p.y = 1.02;
        }
        let x = p.x * w + px * (p.lane >= 0 ? 1.6 : 0.6);
        let y = p.y * h + py * (p.lane >= 0 ? 1.6 : 0.6);
        const behindText = p.y > 0.28 && p.y < 0.8;
        let alpha = (p.lane >= 0 ? 0.34 : 0.14) * (behindText ? 0.45 : 1);
        let size = p.size;
        let color = GREY;

        if (p.lane >= 0) {
          const dist = Math.abs(p.x - sweepX);
          if (dist < 0.05) {
            alpha = 0.9;
            color = INK;
            size = p.size + 0.8;
          }
          if (resolved) {
            if (p.lane === winner) {
              const cx = LANES[winner] * w + px * 1.6;
              const cy = h * LINE_Y + py * 1.6;
              x = x + (cx - x) * resolveK * 0.92;
              y = y + (cy - y) * resolveK * 0.92;
              alpha = 0.3 + 0.6 * resolveK;
              color = INK;
            } else {
              alpha = 0.34 * (1 - 0.5 * resolveK);
              color = AMBER;
            }
          }
        }
        const twinkle = 0.85 + 0.15 * Math.sin(t * 1.3 + p.phase);
        ctx!.fillStyle = `rgba(${color}, ${alpha * twinkle})`;
        ctx!.beginPath();
        ctx!.arc(x, y, size, 0, Math.PI * 2);
        ctx!.fill();
      }

      if (sweepX > -0.1 && sweepX < 1.1) {
        const sx = sweepX * w;
        const grad = ctx!.createLinearGradient(sx - 160, 0, sx + 8, 0);
        grad.addColorStop(0, `rgba(${INK}, 0)`);
        grad.addColorStop(1, `rgba(${INK}, 0.8)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(sx - 160, h * LINE_Y - 1, 168, 2);
      }

      if (resolved) {
        const cx = LANES[winner] * w + px * 1.6;
        const cy = h * LINE_Y + py * 1.6;
        const r = 14 + 38 * resolveK;
        const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 4);
        glow.addColorStop(0, `rgba(${INK}, ${0.18 * resolveK})`);
        glow.addColorStop(1, `rgba(${INK}, 0)`);
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r * 4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = `rgba(${INK}, ${0.8 * resolveK})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.stroke();
      }

      if (!reduced) raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = (e.clientY - rect.top) / rect.height;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    if (reduced) frame(start + CYCLE * 0.7);
    else raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
