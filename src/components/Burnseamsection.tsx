"use client";

/**
 * BurnSeamSection: a red section whose top and bottom edges are burning paper.
 * Same burn language as the preloader (black char → ember rim → red/amber glow → sparks),
 * drawn in a transparent three.js canvas on top of the section's red background.
 *
 *   top seam     paper of the section ABOVE (topColor) burns away upward as you scroll in
 *   bottom seam  paper of the section BELOW (bottomColor, white for RememberSection) licks up
 *
 * Usage (place it directly above RememberSection):
 *   <HeroSection />
 *   <BurnSeamSection topColor="#111116" bottomColor="#ffffff" />
 *   <RememberSection />
 *
 * Set topColor to the exact background colour of the section above it.
 */

import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useGSAP, gsap, ScrollTrigger } from "@/lib/gsap";

const RED = "#d92626";

/** raw sRGB vec3 so the shader red matches the CSS red exactly */
const rgb = (hex: string) =>
  new THREE.Vector3(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  );

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

uniform vec2  uSize;      // canvas size in CSS px
uniform float uTime;
uniform float uTopDepth;  // px the top paper reaches into the section
uniform float uBotDepth;  // px the bottom paper reaches into the section
uniform float uAmp;       // seam raggedness (smaller on phones)
uniform vec3  uTopCol;
uniform vec3  uBotCol;

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

/** e = signed px distance INTO the paper (>0 paper, <0 burnt hole showing the red section) */
vec4 seam(float e, vec2 px, vec3 paperCol, out float glow) {
  vec3 base = paperCol * (0.96 + 0.04 * noise(px / 70.0));
  base += (hash(px + fract(uTime) * 53.0) - 0.5) * 0.035;

  float alive = smoothstep(-0.8, 0.8, e);

  float charB = 1.0 - smoothstep(0.0, 16.0, e);
  float rim   = 1.0 - smoothstep(0.0, 3.4, e);
  vec3 c = mix(base, vec3(0.06, 0.015, 0.01), charB * 0.92);
  c = mix(c, vec3(1.0, 0.5, 0.14), rim);
  c = mix(c, vec3(1.0, 0.88, 0.55), rim * rim * 0.7);

  // ember halo bleeding onto the red (amber core so it reads on red)
  float halo = exp(min(e, 0.0) / 15.0);
  vec3 hc = mix(vec3(1.0, 0.32, 0.08), vec3(1.0, 0.82, 0.42), halo * halo * halo);
  float ha = halo * 0.9 * (1.0 - alive);

  glow = exp(-abs(e) / 24.0);
  return vec4(c * alive + hc * ha, alive + ha);
}

void main() {
  vec2 px = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);   // px from top-left
  float x = px.x;

  // ragged, slowly crawling fronts
  float dispT = ((fbm(vec2(x / 340.0, 3.0 + uTime * 0.035)) - 0.5) * 240.0
               + (fbm(vec2(x / 70.0, 9.0 - uTime * 0.06)) - 0.5) * 38.0) * uAmp;
  float dispB = ((fbm(vec2(x / 380.0, 21.0 - uTime * 0.03)) - 0.5) * 200.0
               + (fbm(vec2(x / 64.0, 5.0 + uTime * 0.055)) - 0.5) * 34.0) * uAmp;

  float eT = (uTopDepth + dispT) - px.y;
  float eB = (uBotDepth + dispB) - (uSize.y - px.y);

  float gT, gB;
  vec4 T = seam(eT, px, uTopCol, gT);
  vec4 B = seam(eB, px, uBotCol, gB);

  vec4 L = T + B * (1.0 - T.a);   // premultiplied "over"

  // sparks rising off both fronts
  float g = max(gT, gB);
  vec2 sp = vec2(px.x, px.y + uTime * 46.0) / 7.0;
  vec2 sc = floor(sp);
  vec2 f = fract(sp) - 0.5;
  float sh = hash(sc);
  float dotm = 1.0 - smoothstep(0.1, 0.36, length(f));
  float twinkle = 0.6 + 0.4 * sin(uTime * 11.0 + sh * 40.0);
  float spk = step(0.992, sh) * dotm * twinkle * smoothstep(0.35, 1.0, g);
  L.rgb += mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.88, 0.55), hash(sc + 3.0)) * spk;
  L.a = clamp(L.a + spk, 0.0, 1.0);

  gl_FragColor = L;
}
`;

type Props = {
  /** background colour of the section ABOVE (its paper burns away at our top edge) */
  topColor?: string;
  /** background colour of the section BELOW (its paper licks up at our bottom edge) */
  bottomColor?: string;
  className?: string;
  children?: ReactNode;
};

export default function BurnSeamSection({
  topColor = "#111116",
  bottomColor = "#ffffff",
  className = "",
  children,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const canvas = canvasRef.current;
      if (!root || !canvas) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      const lines = q("[data-bs]");

      /* ── text: masked lines roll up when the section arrives ── */
      if (!reduced) {
        gsap.set(lines, { yPercent: 115 });
        ScrollTrigger.create({
          trigger: root,
          start: "top 45%",
          once: true,
          onEnter: () =>
            gsap.to(lines, { yPercent: 0, duration: 1.15, ease: "expo.out", stagger: 0.09 }),
        });
      }

      /* ── WebGL ── */
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
      if (!renderer) return; // plain red section if WebGL is unavailable

      const uniforms = {
        uSize: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uTopDepth: { value: 80 },
        uBotDepth: { value: 80 },
        uAmp: { value: 1 },
        uTopCol: { value: rgb(topColor) },
        uBotCol: { value: rgb(bottomColor) },
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
      renderer.setClearColor(0x000000, 0);

      // scroll-driven values (0..1)
      const st = { top: reduced ? 1 : 0, bot: 0 };
      let H = 1;
      let active = false;
      let elapsed = 0;

      const apply = () => {
        const topEase = st.top * st.top * (3 - 2 * st.top);
        // top paper starts deep in the section and burns back up to a thin charred strip
        uniforms.uTopDepth.value = THREE.MathUtils.lerp(H * 0.62, 70, topEase);
        // bottom paper creeps up a little as the section leaves
        uniforms.uBotDepth.value = 70 + 80 * st.bot;
      };

      const draw = () => {
        apply();
        uniforms.uTime.value = elapsed;
        renderer!.render(scene, cam);
      };

      const resize = () => {
        const w = root.clientWidth;
        H = root.clientHeight;
        const pr = Math.min(window.devicePixelRatio || 1, 1.5);
        renderer!.setPixelRatio(pr);
        renderer!.setSize(w, H, false);
        uniforms.uSize.value.set(w, H);
        uniforms.uAmp.value = THREE.MathUtils.clamp(w / 1200, 0.45, 1);
        draw();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(root);

      const triggers: ScrollTrigger[] = [];
      const tweens: gsap.core.Tween[] = [];

      if (!reduced) {
        tweens.push(
          gsap.to(st, {
            top: 1,
            ease: "none",
            scrollTrigger: { trigger: root, start: "top bottom", end: "top 12%", scrub: 0.6 },
          }),
          gsap.to(st, {
            bot: 1,
            ease: "none",
            scrollTrigger: { trigger: root, start: "bottom bottom", end: "bottom top", scrub: 0.6 },
          })
        );
      }

      // only render while the section is on screen
      const vis = ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (active = self.isActive),
      });
      active = vis.isActive;
      triggers.push(vis);

      const tick = (_t: number, dtMs: number) => {
        if (!active || reduced) return;
        elapsed += Math.min(dtMs, 64) / 1000;
        draw();
      };
      gsap.ticker.add(tick);

      const onLost = (e: Event) => e.preventDefault();
      canvas.addEventListener("webglcontextlost", onLost);

      return () => {
        gsap.ticker.remove(tick);
        ro.disconnect();
        canvas.removeEventListener("webglcontextlost", onLost);
        triggers.forEach((t) => t.kill());
        tweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        geo.dispose();
        mat.dispose();
        renderer?.dispose();
      };
    },
    { scope: rootRef, dependencies: [topColor, bottomColor] }
  );

  return (
    <section
      id="burn-seam"
      ref={rootRef}
      className={`relative isolate flex min-h-[120svh] items-center justify-center overflow-hidden px-4 py-[24vh] md:px-8 ${className}`}
      style={{ backgroundColor: RED }}
    >
      {/* burning paper edges (transparent canvas over the red) */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1720px] text-white">
        <div className="mb-8 flex items-center justify-between gap-4 t-micro text-white/70 md:mb-12">
          <Mask>ARCHIVE / 005</Mask>
          <Mask className="text-right">WHERE THE FILM BURNS</Mask>
        </div>

        {children ?? (
          <div
            role="heading"
            aria-level={2}
            aria-label="Not every story seeks approval"
            className="w-full text-center font-regular uppercase leading-[0.88] tracking-[-0.055em] text-[clamp(40px,8.4vw,156px)]"
          >
            <div aria-hidden="true">
              <Mask>Not every</Mask>
            </div>
            <div aria-hidden="true">
              <Mask>story seeks</Mask>
            </div>
            <div aria-hidden="true">
              <Mask>approval</Mask>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center justify-between gap-2 t-micro text-white/70 md:mt-12 md:flex-row">
          <Mask>SOME STORIES ARE MEANT TO BURN</Mask>
          <Mask>NOT MADE TO FIT IN. MADE TO LEAVE A MARK.</Mask>
        </div>
      </div>
    </section>
  );
}

/** masked line: text rolls up from behind its own edge */
function Mask({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`block overflow-hidden py-[0.1em] -my-[0.1em] ${className}`}>
      <span data-bs className="block will-change-transform">
        {children}
      </span>
    </span>
  );
}