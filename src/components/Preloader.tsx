"use client";

/**
 * Preloader: "Gate → Portrait"  (white paper, WebGL + one GSAP master timeline)
 *
 *  1. Intro    a hairline of ink draws up on white paper, opens into a 5:7 film frame
 *              (sprocket holes scroll past the frame as the film "runs")
 *  2. Load     red emulsion rises inside the frame as REAL assets load (000 → 100)
 *  3. Gate     timeline pauses until loading is finished, then holds a beat on 100
 *  4. Land     text rolls out, the frame travels + resizes onto the hero portrait
 *              ([data-hero-portrait], re-measured every frame while travelling),
 *              the red BURNS away (char → ember rim → glow → sparks) to reveal the real portrait
 *  5. Handoff  "preloader:land" fires → hero intro starts → the white paper burns away too
 *
 * Hero protocol (matches HeroSection):
 *   #preloader                        root element
 *   html[data-preload]                "loading" → "landed" → "done"
 *   window "preloader:land"           frame is on the portrait, hero can start
 *   window "preloader:done"           everything finished
 *   html[data-preloaded="1"]          legacy flag, set at the end
 */

import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useGSAP, gsap, ScrollTrigger } from "@/lib/gsap";

const INK = "#111116";
const RED = "#d92626";
const SESSION_KEY = "fma-preloader-seen";

const LINES = ["Rolling camera", "Setting the light", "Opening the archive", "Action"];
const pad = (n: number, l = 2) => String(n).padStart(l, "0");

/** raw sRGB vec3 (NOT THREE.Color, which converts to linear and darkens the red vs CSS) */
const rgb = (hex: string) =>
  new THREE.Vector3(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  );

/** run a callback once the preloader has fully finished (or immediately if it already has) */
export function whenPreloaded(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  if ((window as any).__preloaded) {
    cb();
    return () => {};
  }
  const h = () => cb();
  window.addEventListener("preloader:done", h, { once: true });
  return () => window.removeEventListener("preloader:done", h);
}

/* ───────────────────────── shaders ───────────────────────── */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2  uRes;       // drawing buffer size (px)
uniform float uTime;
uniform float uIntro;     // 0..1  ink slit draws up
uniform float uWidth;     // 0..1  slit opens into the 5:7 frame
uniform float uProg;      // 0..1  loading progress (fills the frame)
uniform float uLand;      // 0..1  frame travels + resizes onto the portrait
uniform float uReveal;    // 0..1  frame contents burn away (shows the real portrait)
uniform float uClear;     // 0..1  white paper burns away
uniform vec2  uToCenter;  // portrait centre (screen-height units)
uniform vec2  uToHalf;    // portrait half-size (screen-height units)
uniform vec3  uInk;
uniform vec3  uRed;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}
float box(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

/**
 * Burning layer. n = noise field, t = burn threshold (alive where n > t), w = edge width.
 * Returns PREMULTIPLIED colour:
 *   alive side : base → black char → hot orange rim
 *   hole side  : a soft red→amber ember halo that fades into transparency
 * glow = proximity to the burn front (0..1), used for sparks.
 */
vec4 burnLayer(vec3 base, float n, float t, float w, out float glow) {
  float e = (n - t) / w;
  float alive = smoothstep(0.0, 0.05, e);

  float charB = 1.0 - smoothstep(0.1, 1.1, e);
  float rim   = 1.0 - smoothstep(0.0, 0.3, e);
  vec3 c = mix(base, vec3(0.06, 0.015, 0.01), charB * 0.92);
  c = mix(c, vec3(1.0, 0.5, 0.14), rim);
  c = mix(c, vec3(1.0, 0.88, 0.55), rim * rim * 0.7);

  float halo = exp(min(e, 0.0) * 1.8);
  vec3 hc = mix(vec3(0.85, 0.12, 0.06), vec3(1.0, 0.7, 0.3), halo * halo);
  float ha = halo * 0.8 * (1.0 - alive);

  glow = exp(-abs(e) * 1.8);
  return vec4(c * alive + hc * ha, alive + ha);
}

void main() {
  float asp = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(asp, 1.0);   // centred, screen height = 1, y up
  float aa = 1.5 / uRes.y;

  // projector gate weave (settles as the frame lands)
  float calm = 1.0 - uLand;
  p.y += sin(uTime * 41.0) * 0.0007 * calm;
  p.x += (hash(vec2(floor(uTime * 24.0), 3.0)) - 0.5) * 0.0012 * calm;

  // frame: 5:7 slit while loading → portrait rect when landed
  float hh0 = mix(0.15, 0.2, uProg) * uIntro;
  hh0 *= 1.0 + 0.006 * sin(uTime * 2.2) * uWidth * calm;   // the frame "breathes" at the gate
  hh0 = min(hh0, asp * 0.4);                                // never wider than the phone screen
  vec2 half0 = vec2(hh0 * (5.0 / 7.0) * mix(0.012, 1.0, uWidth), hh0);
  vec2 hs = mix(half0, uToHalf, uLand);
  vec2 c = mix(vec2(0.0), uToCenter, uLand);
  vec2 q = p - c;

  float d = box(q, hs);
  float m = 1.0 - smoothstep(-aa, aa, d);   // 1 inside the frame
  float outside = max(d, 0.0);

  /* ── white paper ── */
  vec3 paper = vec3(1.0);
  paper *= 1.0 - 0.10 * exp(-outside * 16.0) * uIntro * (1.0 - 0.5 * uLand);   // soft shadow off the frame
  paper *= mix(0.97, 1.0, smoothstep(1.2, 0.3, length(vUv - 0.5) * 1.4));       // faint vignette

  // sprocket holes run past the frame while it loads
  {
    float holeX = hs.x + 0.034;
    float cell = 0.036;
    float yy = q.y - uProg * 0.45 - uTime * 0.012;
    float fy = mod(yy, cell) - cell * 0.5;
    float hd = box(vec2(abs(q.x) - holeX, fy), vec2(0.0042, 0.0082)) - 0.002;
    float holes = (1.0 - smoothstep(-aa, aa, hd)) * uWidth * (1.0 - uLand) * (1.0 - smoothstep(hs.y - 0.01, hs.y + 0.03, abs(q.y)));
    paper = mix(paper, uInk * 1.1, holes * 0.85);
    // hairline rails
    float rail = 1.0 - smoothstep(0.0, aa * 1.2, abs(abs(q.x) - (hs.x + 0.014)));
    rail *= uWidth * (1.0 - uLand) * (1.0 - smoothstep(hs.y - 0.01, hs.y + 0.03, abs(q.y)));
    paper = mix(paper, uInk, rail * 0.18);
  }

  /* ── inside the frame: ink film + rising red emulsion ── */
  float hy = max(hs.y, 0.05);
  vec2 fp = q / hy;                                            // frame-local coords
  float y01 = clamp((q.y + hs.y) / max(2.0 * hs.y, 0.001), 0.0, 1.0);
  float topN = (fbm(vec2(fp.x * 6.0, uTime * 0.7)) - 0.5) * 0.05;
  float fillY = uProg * 1.04 + topN;
  float fill = 1.0 - smoothstep(fillY - 0.006, fillY + 0.006, y01);

  vec3 film = uInk * (0.9 + 0.2 * fbm(fp * 4.0 + uTime * 0.15));
  vec3 emulsion = uRed * (0.88 + 0.22 * fbm(fp * 3.0 + uTime * 0.1));
  film = mix(film, emulsion, fill);
  // meniscus glow at the red's surface
  film += vec3(0.9, 0.5, 0.4) * exp(-abs(y01 - fillY) * 70.0) * 0.25 * (1.0 - uReveal);

  film *= 1.0 - 0.22 * smoothstep(-0.05, 0.0, d);                                     // inner vignette
  film *= 0.965 + 0.035 * hash(vec2(floor(uTime * 24.0), 7.0));                        // projector flicker
  film += step(0.9975, hash(vec2(floor(q.x * 260.0), floor(uTime * 12.0)))) * 0.10;   // scratches
  film += smoothstep(0.995, 1.0, noise(fp * 60.0 + floor(uTime * 12.0) * 17.0)) * 0.25; // dust

  // grain before burning so the char keeps texture
  float gr = hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
  paper += gr * 0.04;
  film  += gr * 0.07;

  /* ── burns ── */
  float gF, gP;

  // frame contents burn away → real portrait underneath
  float n2 = fbm(fp * 2.5 + 7.0);
  float tF = mix(-0.14, 1.14, uReveal);
  vec4 F = burnLayer(clamp(film, 0.0, 1.0), n2, tF, 0.09, gF);

  // paper burns away → the page
  float n3 = fbm(p * 3.2 + 11.0);
  float tP = mix(-0.14, 1.14, uClear);
  vec4 P = burnLayer(clamp(paper, 0.0, 1.0), n3, tP, 0.1, gP);

  vec4 L = mix(P, F, m);

  /* ── sparks drifting up off the burn fronts ── */
  float gs = mix(gP * step(0.001, uClear) * step(uClear, 0.999),
                 gF * step(0.001, uReveal) * step(uReveal, 0.999), m);
  vec2 sc = floor((p + vec2(0.0, -uTime * 0.09)) * 150.0);
  float sh = hash(sc + floor(uTime * 9.0));
  float spk = step(0.985, sh) * smoothstep(0.5, 1.0, gs);
  vec3 sparkCol = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.85, 0.5), hash(sc));
  L.rgb += sparkCol * spk;
  L.a = clamp(L.a + spk, 0.0, 1.0);

  gl_FragColor = L;   // premultiplied
}
`;

/* ───────────────────────── component ───────────────────────── */

type Props = {
  /** image urls to really wait for (poster images, etc.). The hero portrait is awaited automatically */
  assets?: string[];
  /** minimum seconds the 0 → 100 takes, so the sequence never feels cut */
  minDuration?: number;
  /** only play once per browser session */
  oncePerSession?: boolean;
  onComplete?: () => void;
};

export default function Preloader({
  assets = [],
  minDuration = 1.6,
  oncePerSession = false,
  onComplete,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLSpanElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const canvas = canvasRef.current;
      const textLayer = textRef.current;
      if (!root || !canvas || !textLayer) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const html = document.documentElement;
      html.dataset.preload = "loading";

      /* ── hero name handoff: hidden until the hero's own entrance takes over,
            so the portrait never shows the names, then pops them out and in ── */
      const names = Array.from(document.querySelectorAll<HTMLElement>("[data-hero-name]"));
      names.forEach((n) => (n.style.visibility = "hidden"));
      let namesFree = false;
      let pollTries = 0;
      function poll() {
        const o = names[0] ? parseFloat(getComputedStyle(names[0]).opacity) : 0;
        if (o < 0.98 || ++pollTries > 120) freeNames();
      }
      function freeNames() {
        if (namesFree) return;
        namesFree = true;
        names.forEach((n) => (n.style.visibility = ""));
        gsap.ticker.remove(poll);
      }

      let landed = false;
      const announceLand = () => {
        if (landed) return;
        landed = true;
        html.dataset.preload = "landed";
        window.dispatchEvent(new Event("preloader:land"));
        gsap.ticker.add(poll); // free the names as soon as the hero starts animating them
      };

      let finished = false;
      let disposeGL = () => {};
      let tick: (t: number, dt: number) => void = () => {};

      const finish = () => {
        if (finished) return;
        finished = true;
        announceLand();
        gsap.ticker.remove(tick);
        disposeGL();
        root.style.display = "none";
        root.style.visibility = "hidden";
        root.style.pointerEvents = "none";
        html.style.overflow = "";
        html.dataset.preload = "done";
        html.dataset.preloaded = "1";
        (window as any).__preloaded = true;
        if (oncePerSession) {
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {}
        }
        window.dispatchEvent(new Event("preloader:done"));
        ScrollTrigger.refresh();
        onComplete?.();
      };

      const cleanupAll = () => {
        gsap.ticker.remove(poll);
        freeNames();
      };

      // already seen this session → skip straight to the hero
      if (oncePerSession) {
        try {
          if (sessionStorage.getItem(SESSION_KEY)) {
            finish();
            return cleanupAll;
          }
        } catch {}
      }

      // reduced motion → quiet fade, no WebGL
      if (reduced) {
        announceLand();
        gsap.to(root, { autoAlpha: 0, duration: 0.5, delay: 0.2, onComplete: finish });
        return () => {
          finish();
          cleanupAll();
        };
      }

      html.style.overflow = "hidden";
      window.scrollTo(0, 0);

      /* ── WebGL setup (falls back to a plain fade if unavailable) ── */
      let renderer: THREE.WebGLRenderer | null = null;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
        });
      } catch {
        renderer = null;
      }

      const uniforms = {
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uIntro: { value: 0 },
        uWidth: { value: 0 },
        uProg: { value: 0 },
        uLand: { value: 0 },
        uReveal: { value: 0 },
        uClear: { value: 0 },
        uToCenter: { value: new THREE.Vector2(0, 0) },
        uToHalf: { value: new THREE.Vector2(0.15, 0.2) },
        uInk: { value: rgb(INK) },
        uRed: { value: rgb(RED) },
      };

      const scene = new THREE.Scene();
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geo = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms,
        transparent: true,
        premultipliedAlpha: true,
        depthTest: false,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(geo, mat));

      const resize = () => {
        if (!renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const pr = Math.min(window.devicePixelRatio || 1, 1.5);
        renderer.setPixelRatio(pr);
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w * pr, h * pr);
      };

      if (renderer) {
        renderer.setClearColor(0x000000, 0);
        resize();
        window.addEventListener("resize", resize);

        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          finish();
        });
      }

      disposeGL = () => {
        window.removeEventListener("resize", resize);
        geo.dispose();
        mat.dispose();
        renderer?.dispose();
      };

      /** where the frame has to land: the hero portrait's exact rect */
      const measureTarget = () => {
        const el = document.querySelector<HTMLElement>("[data-hero-portrait]");
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (!el) {
          uniforms.uToCenter.value.set(0, 0);
          uniforms.uToHalf.value.set(0.2 * (5 / 7), 0.2);
          return;
        }
        const r = el.getBoundingClientRect();
        uniforms.uToCenter.value.set(
          ((r.left + r.width / 2) / vw - 0.5) * (vw / vh),
          0.5 - (r.top + r.height / 2) / vh
        );
        uniforms.uToHalf.value.set(r.width / 2 / vh, r.height / 2 / vh);
      };

      /* ── shared animation state (read by the render loop every frame) ── */
      const gl = { intro: 0, width: 0, land: 0, reveal: 0, clear: 0 };

      /* ── real loading progress ── */
      const heroImg = document.querySelector<HTMLImageElement>("[data-hero-portrait] img");
      const prog = { real: 0, disp: 0 };
      const total = assets.length + 2 + (heroImg ? 1 : 0); // assets + fonts + window load + hero portrait
      let loaded = 0;
      const bump = () => {
        loaded++;
        prog.real = Math.min(1, loaded / total);
      };
      assets.forEach((src) => {
        const img = new Image();
        img.onload = bump;
        img.onerror = bump;
        img.src = src;
      });
      if (heroImg) {
        if (heroImg.complete && heroImg.naturalWidth > 0) bump();
        else {
          heroImg.addEventListener("load", bump, { once: true });
          heroImg.addEventListener("error", bump, { once: true });
        }
      }
      if ((document as any).fonts?.ready) (document as any).fonts.ready.then(bump, bump);
      else bump();
      if (document.readyState === "complete") bump();
      else window.addEventListener("load", bump, { once: true });
      const safety = window.setTimeout(finish, 9000); // safety fallback ensures preloader never hangs if an asset is blocked

      /* ── caption roll (masked, same language as the rest of the site) ── */
      let lineIdx = 0;
      const narrate = (p: number) => {
        const idx = p >= 0.95 ? 3 : p >= 0.62 ? 2 : p >= 0.3 ? 1 : 0;
        if (idx === lineIdx) return;
        lineIdx = idx;
        const el = captionRef.current;
        if (!el) return;
        gsap.killTweensOf(el);
        gsap.to(el, {
          yPercent: -110,
          duration: 0.35,
          ease: "expo.in",
          onComplete: () => {
            el.textContent = `(${pad(idx + 1)}) ${LINES[idx]}`;
            gsap.fromTo(el, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "expo.out" });
          },
        });
      };

      /* ── master timeline ── */
      const items = root.querySelectorAll("[data-pl]");
      gsap.set(items, { yPercent: 110 });
      gsap.set(textLayer, { autoAlpha: 1 });

      const HOLD = 0.35; // beat held on 100 before the frame lands
      let ready = false;
      let atGate = false;
      let exiting = false;
      const go = () => {
        if (exiting) return;
        exiting = true;
        tl.play();
      };

      const tl = gsap.timeline({ paused: true, onComplete: finish });

      // 1) INTRO: ink line draws up, opens into the frame, text rolls in
      tl.to(gl, { intro: 1, duration: 1.1, ease: "expo.out" }, 0.15)
        .to(gl, { width: 1, duration: 1.2, ease: "expo.inOut" }, 0.7)
        .to(items, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.04 }, 0.9)
        // 2) GATE: hold until loading is complete
        .addPause(2.4, () => {
          atGate = true;
          if (ready) gsap.delayedCall(HOLD, go);
        })
        .addLabel("outro")
        // 3) text rolls out
        .to(
          items,
          { yPercent: -110, duration: 0.8, ease: "expo.in", stagger: 0.035 },
          "outro+=0.4"
        );

      if (renderer) {
        // 4) LAND: frame travels onto the hero portrait
        tl.call(measureTarget, [], "outro+=0.4")
          .to(gl, { land: 1, duration: 1.3, ease: "power3.inOut" }, "outro+=0.45")
          // REVEAL: red burns away → real portrait (slow, with ember glow)
          .to(gl, { reveal: 1, duration: 1.9, ease: "power1.inOut" }, "outro+=1.15")
          // 5) HANDOFF: hero starts once burn is underway, paper burns away
          .call(announceLand, [], "outro+=2.1")
          .to(gl, { clear: 1, duration: 1.5, ease: "power2.inOut" }, "outro+=2.2")
          .call(finish, [], "outro+=3.75");
      } else {
        tl.call(announceLand, [], "outro+=0.5")
          .to(root, { autoAlpha: 0, duration: 0.8, ease: "power2.inOut" }, "outro+=0.5")
          .call(finish, [], "outro+=1.35");
      }

      /* ── per-frame loop: progress, counter, timecode, shader ── */
      let elapsed = 0;
      let lastPct = -1;
      let painted = false;

      tick = (_t, dtMs) => {
        try {
          const dt = Math.min(dtMs, 64) / 1000;
          elapsed += dt;

          const target = Math.min(prog.real, elapsed / minDuration);
          prog.disp += (target - prog.disp) * Math.min(1, dt * 4.5);
          if (target >= 1 && prog.disp > 0.997) prog.disp = 1;

          const pct = Math.round(prog.disp * 100);
          if (pct !== lastPct) {
            lastPct = pct;
            if (countRef.current) countRef.current.textContent = pad(pct, 3);
            narrate(prog.disp);
          }

          if (tcRef.current) {
            const fr = Math.floor(elapsed * 24);
            tcRef.current.textContent = `00:${pad(Math.floor(elapsed / 60))}:${pad(
              Math.floor(elapsed) % 60
            )}:${pad(fr % 24)}`;
          }

          if (!ready && prog.disp >= 1) {
            ready = true;
            if (atGate) gsap.delayedCall(HOLD, go);
          }

          if (renderer) {
            // while travelling, keep tracking the portrait so it lands pixel-perfect
            if (gl.land > 0 && gl.land < 1) measureTarget();

            uniforms.uTime.value = elapsed;
            uniforms.uIntro.value = gl.intro;
            uniforms.uWidth.value = gl.width;
            uniforms.uProg.value = prog.disp;
            uniforms.uLand.value = gl.land;
            uniforms.uReveal.value = gl.reveal;
            uniforms.uClear.value = gl.clear;
            try {
              renderer.render(scene, cam);
            } catch {
              finish();
              return;
            }
            if (!painted) {
              painted = true;
              root.style.backgroundColor = "transparent";
            }
          }
        } catch {
          finish();
        }
      };

      gsap.ticker.add(tick);
      tl.play(0);

      return () => {
        window.clearTimeout(safety);
        window.removeEventListener("load", bump);
        heroImg?.removeEventListener("load", bump);
        heroImg?.removeEventListener("error", bump);
        tl.kill();
        if (!finished) {
          gsap.ticker.remove(tick);
          disposeGL();
          html.style.overflow = "";
        }
        cleanupAll();
      };
    },
    { scope: rootRef }
  );

  return (
    <div
      id="preloader"
      ref={rootRef}
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[100] overflow-hidden text-[#111116]"
      style={{ backgroundColor: "#ffffff" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* TEXT LAYER (hidden until GSAP has primed the masked lines) */}
      <div
        ref={textRef}
        style={{ visibility: "hidden" }}
        className="pointer-events-none absolute inset-0 flex flex-col justify-between px-[20px] py-[20px]"
      >
        {/* top strip */}
        <div className="t-micro grid grid-cols-4 gap-x-[10px] md:grid-cols-12">
          <div className="col-span-2 md:col-span-4">
            <Mask>Film Maker Archives©</Mask>
          </div>
          <div className="col-start-5 hidden md:col-span-4 md:block">
            <Mask className="text-black/50">Scene 00 · Opening</Mask>
          </div>
          <div className="col-span-2 text-right md:col-start-10 md:col-span-3">
            <Mask className="text-black/50">Warangal</Mask>
          </div>
        </div>

        {/* name under the frame (frame half-height ≈ 15–20vh) */}
        <div
          className="absolute left-0 right-0 flex flex-col items-center text-center"
          style={{ top: "calc(50% + 21vh + 14px)" }}
        >
          <Mask className="t-label">Sandeep Reddy Vanga</Mask>
          <Mask className="t-micro mt-[6px] text-black/50">Not every STORY seeks approval</Mask>
        </div>

        {/* bottom strip */}
        <div className="grid grid-cols-4 items-end gap-x-[10px] md:grid-cols-12">
          <div className="col-span-2 md:col-span-4">
            <Mask>
              <span
                ref={countRef}
                className="block font-medium leading-[0.8] tabular-nums"
                style={{ fontSize: "clamp(72px, 13vw, 220px)" }}
              >
                000
              </span>
            </Mask>
          </div>

          <div className="t-micro hidden pb-[4px] md:col-start-5 md:col-span-4 md:block">
            <Mask className="text-black/50">
              <span ref={captionRef} className="block">
                ({pad(1)}) {LINES[0]}
              </span>
            </Mask>
          </div>

          <div className="t-micro col-span-2 pb-[4px] text-right md:col-start-10 md:col-span-3">
            <Mask>
              <span ref={tcRef} className="tabular-nums">
                00:00:00:00
              </span>
            </Mask>
            <Mask className="text-black/50">Take 01</Mask>
          </div>
        </div>
      </div>
    </div>
  );
}

/** masked line: text rolls up from behind its own edge */
function Mask({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`block overflow-hidden py-[0.08em] -my-[0.08em] ${className}`}>
      <span data-pl className="block will-change-transform">
        {children}
      </span>
    </span>
  );
}