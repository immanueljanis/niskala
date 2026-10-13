"use client";

import { useEffect, useRef } from "react";

/**
 * Hero scene (three.js, GPU line terrain).
 * Fifty-six thin lines run across a field and swell with slow simplex noise: open, sealed quotes.
 * Every ~11 s a pine front sweeps left to right, lifting a soft ridge and leaving a faint pine trail
 * that fades: the proof passing over the set. All displacement is in the vertex shader, so the CPU
 * only updates a few uniforms. Camera eases toward the pointer.
 * Reduced motion renders one static frame. Rendering pauses while the hero is off screen.
 */

const VERT = /* glsl */ `
uniform float uTime;
uniform float uFront;
uniform float uCalm;
varying float vAlpha;
varying vec3 vColor;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec3 p = position;
  float t = uTime;

  float n1 = snoise(vec2(p.x * 0.11 + t * 0.05, p.z * 0.17 - t * 0.04));
  float n2 = snoise(vec2(p.x * 0.31 - t * 0.08, p.z * 0.42 + t * 0.06));
  float wave = n1 * 0.95 + n2 * 0.26;

  float trail = uCalm * smoothstep(uFront + 1.5, uFront - 1.5, p.x);
  float glow = uCalm * exp(-pow((p.x - uFront) / 2.4, 2.0));
  p.y = wave + glow * 0.55;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;
  gl_Position = clip;

  vec3 field = vec3(0.47, 0.55, 0.52);
  vec3 pine = vec3(0.086, 0.247, 0.184);
  vColor = mix(field, pine, min(1.0, glow * 0.9 + trail * 0.3));

  float ndcY = clip.y / clip.w;
  float vertical = smoothstep(0.62, -0.35, ndcY);
  float edge = smoothstep(26.0, 15.0, abs(position.x));
  float depth = smoothstep(36.0, 12.0, -mv.z);
  vAlpha = (0.3 + glow * 0.5) * vertical * edge * depth;
}
`;

const FRAG = /* glsl */ `
precision mediump float;
varying float vAlpha;
varying vec3 vColor;
void main() {
  if (vAlpha < 0.01) discard;
  gl_FragColor = vec4(vColor, vAlpha);
}
`;

const CYCLE = 11.0;
const LINES = 56;
const SEGMENTS = 220;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function HeroScene({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.display = "block";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      const camBase = new THREE.Vector3(0, 5.2, 15);
      camera.position.copy(camBase);

      const verts = LINES * (SEGMENTS + 1);
      const positions = new Float32Array(verts * 3);
      const index = new Uint32Array(LINES * SEGMENTS * 2);
      let v = 0;
      let i = 0;
      for (let l = 0; l < LINES; l++) {
        const z = -16 + (l / (LINES - 1)) * 24;
        for (let s = 0; s <= SEGMENTS; s++) {
          positions[v * 3] = -26 + (s / SEGMENTS) * 52;
          positions[v * 3 + 1] = 0;
          positions[v * 3 + 2] = z;
          if (s < SEGMENTS) {
            index[i++] = v;
            index[i++] = v + 1;
          }
          v++;
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(index, 1));

      const uniforms = { uTime: { value: 0 }, uFront: { value: -40 }, uCalm: { value: 1 } };
      const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false });
      scene.add(new THREE.LineSegments(geometry, material));

      const target = new THREE.Vector2(0, 0);
      const pointer = new THREE.Vector2(0, 0);
      const onMove = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        pointer.set(((e.clientX - rect.left) / rect.width - 0.5) * 2, ((e.clientY - rect.top) / rect.height - 0.5) * 2);
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const start = performance.now();
      let raf = 0;
      let visible = true;

      const frame = (now: number) => {
        raf = 0;
        const t = (now - start) / 1000;
        const ct = (t % CYCLE) / CYCLE;
        uniforms.uTime.value = t;
        if (ct < 0.5) {
          uniforms.uFront.value = -32 + easeInOut(ct / 0.5) * 72;
          uniforms.uCalm.value = 1;
        } else if (ct < 0.72) {
          uniforms.uFront.value = 40;
          uniforms.uCalm.value = 1;
        } else if (ct < 0.9) {
          uniforms.uFront.value = 40;
          uniforms.uCalm.value = 1 - easeInOut((ct - 0.72) / 0.18);
        } else {
          uniforms.uFront.value = -40;
          uniforms.uCalm.value = 1;
        }

        target.lerp(pointer, 0.035);
        camera.position.x = camBase.x + target.x * 1.3;
        camera.position.y = camBase.y - target.y * 0.5;
        camera.lookAt(target.x * 0.5, 0.3, -1);

        renderer.render(scene, camera);
        if (!reduced && visible) raf = requestAnimationFrame(frame);
      };

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf && !reduced) raf = requestAnimationFrame(frame);
      });
      io.observe(host);

      if (reduced) {
        uniforms.uTime.value = 2;
        uniforms.uFront.value = 4;
        uniforms.uCalm.value = 1;
        camera.lookAt(0, 0.3, -1);
        renderer.render(scene, camera);
      } else {
        raf = requestAnimationFrame(frame);
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={ref} aria-hidden className={`h-full w-full ${className}`} />;
}
