"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import Text from "./Text";
import { Timecode } from "./HeroMicro";
import { HoverLine } from "./HoverLink";

const ROW = "grid grid-cols-4 md:grid-cols-12 gap-x-3";
const NAME = "SANDEEP REDDY VANGA";

/* ---------- CONTENT: edit here ---------- */
const EMAIL = "hello@example.com"; // TODO: real address

const NAV = [
  { label: "About", href: "#about" },
  { label: "Films", href: "#films" },
  { label: "Upcoming", href: "#upcoming" },
  { label: "Awards", href: "#awards" },
  { label: "Partners", href: "#partners" },
];

// TODO: real links. An empty href renders as "(Soon)" instead of a dead link.
const SOCIAL = [
  { label: "Instagram", href: "" },
  { label: "YouTube", href: "" },
  { label: "IMDb", href: "" },
];

/* ---------- smooth scroll helper (Lenis if present, GSAP otherwise) ---------- */
type LenisLike = {
  scrollTo: (
    target: number,
    opts?: { duration?: number; easing?: (t: number) => number }
  ) => void;
};
const expoInOut = (t: number) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;

function findLenis(): LenisLike | undefined {
  const c = (window as unknown as { lenis?: { current?: unknown } }).lenis;
  const ok = (x: unknown): x is LenisLike =>
    !!x && typeof (x as LenisLike).scrollTo === "function";
  if (ok(c)) return c;
  if (ok(c?.current)) return c.current;
  return undefined;
}

function goTo(target: number | string) {
  const y =
    typeof target === "number"
      ? target
      : (() => {
          const el = document.querySelector(target);
          return el ? el.getBoundingClientRect().top + window.scrollY : 0;
        })();
  const distance = Math.abs(window.scrollY - y);
  const duration = Math.min(2.4, 0.9 + (distance / window.innerHeight) * 0.22);

  const lenis = findLenis();
  if (lenis) {
    lenis.scrollTo(y, { duration, easing: expoInOut });
    return;
  }
  const p = { v: window.scrollY };
  gsap.to(p, {
    v: y,
    duration,
    ease: "expo.inOut",
    overwrite: true,
    onUpdate: () => window.scrollTo(0, p.v),
  });
}

/* ---------- ARROWS: one SVG, two copies. Needs a parent with `group/a` ---------- */
function ArrowSvg({ dir, className = "" }: { dir: "up" | "up-right"; className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      className={className}
    >
      {dir === "up" ? (
        <path d="M6 10.5V1.5M2.5 5L6 1.5L9.5 5" />
      ) : (
        <path d="M2.5 9.5L9.5 2.5M3.5 2.5H9.5V8.5" />
      )}
    </svg>
  );
}

/** On hover the arrow leaves one way while a new one arrives from the other side */
function ArrowSwap({ dir = "up-right", size = 0.85 }: { dir?: "up" | "up-right"; size?: number }) {
  const t =
    "transition-transform duration-[618ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";
  const out =
    dir === "up"
      ? "group-hover/a:-translate-y-full group-focus-visible/a:-translate-y-full"
      : "group-hover/a:translate-x-full group-hover/a:-translate-y-full group-focus-visible/a:translate-x-full group-focus-visible/a:-translate-y-full";
  const inStart = dir === "up" ? "translate-y-full" : "-translate-x-full translate-y-full";
  const inEnd =
    dir === "up"
      ? "group-hover/a:translate-y-0 group-focus-visible/a:translate-y-0"
      : "group-hover/a:translate-x-0 group-hover/a:translate-y-0 group-focus-visible/a:translate-x-0 group-focus-visible/a:translate-y-0";

  return (
    <span
      aria-hidden
      className="relative inline-block shrink-0 overflow-hidden"
      style={{ width: `${size}em`, height: `${size}em` }}
    >
      <ArrowSvg dir={dir} className={`absolute inset-0 size-full ${t} ${out}`} />
      <ArrowSvg dir={dir} className={`absolute inset-0 size-full ${t} ${inStart} ${inEnd}`} />
    </span>
  );
}

/* ---------- live IST clock ---------- */
function IstClock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const tick = () => setT(fmt.format(new Date()).toUpperCase());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{t}</span>;
}

/* ---------- SHADER: liquid name ---------- */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uMouse;
  uniform float uAmp;
  uniform float uTime;
  uniform float uAspect;
  uniform float uReveal;
  varying vec2 vUv;

  void main() {
    // reveal: wipes up from the bottom edge
    if (vUv.y > uReveal) discard;

    // distance from the pointer, in "height" units so ripples are round
    vec2 d = (vUv - uMouse) * vec2(uAspect, 1.0);
    float dist = length(d);
    float fall = exp(-dist * dist * 7.0);
    vec2 dir = d / (dist + 1e-4);

    // travelling ripple, pushes letters away from the pointer
    float wave = sin(dist * 16.0 - uTime * 3.2);
    vec2 off = dir * vec2(1.0 / uAspect, 1.0) * fall * uAmp * (0.05 + 0.05 * wave);

    // idle: very slow liquid sway
    off += vec2(
      sin(vUv.y * 5.0 + uTime * 0.7) * 0.0012,
      sin(vUv.x * uAspect * 0.8 + uTime * 0.9) * 0.005
    ) * 0.6;

    vec2 uv = vUv + off;

    // RGB split along the displacement
    float r = texture2D(uTex, uv + off * 0.55).r;
    float g = texture2D(uTex, uv).g;
    float b = texture2D(uTex, uv - off * 0.55).b;
    vec3 mask = 1.0 - vec3(r, g, b);

    // ink goes from black to red where the water is disturbed
    float t = clamp(fall * uAmp * 1.5, 0.0, 1.0);
    vec3 ink = mix(vec3(0.003), vec3(0.7, 0.02, 0.02), t);

    vec3 col = vec3(1.0) - mask * (vec3(1.0) - ink);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function LiquidName({ text }: { text: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (disposed || !wrap || !canvas) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
      } catch {
        return;
      }
      renderer.setClearColor(0xffffff, 1);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const coarse = window.matchMedia("(pointer: coarse)").matches;

      /* text -> 2D canvas -> texture (uses the page's own font) */
      const textCanvas = document.createElement("canvas");
      const tctx = textCanvas.getContext("2d")!;
      const tex = new THREE.CanvasTexture(textCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTex: { value: tex },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uAmp: { value: 0 },
          uTime: { value: 0 },
          uAspect: { value: 8 },
          uReveal: { value: reduced ? 1.001 : 0 },
        },
      });
      const geo = new THREE.PlaneGeometry(2, 2);
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geo, mat));
      const cam = new THREE.Camera();

      let lastW = 0;
      const build = () => {
        const W = wrap.clientWidth;
        if (!W || W === lastW) return;
        lastW = W;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const family = getComputedStyle(document.body).fontFamily;
        const font = (px: number) => `500 ${px}px ${family}`;

        // wide: one line. narrow: one word per line, every line fitted to the width
        const lines = W < 640 ? text.split(" ") : [text];
        const gap = W < 640 ? Math.round(W * 0.03) : 0;
        const pad = 2;

        tctx.font = font(100);
        const metr = lines.map((l) => {
          const m = tctx.measureText(l);
          const size = (100 * W) / m.width;
          const k = size / 100;
          return {
            l,
            size,
            asc: m.actualBoundingBoxAscent * k,
            desc: Math.max(0, m.actualBoundingBoxDescent) * k,
          };
        });
        const H = Math.ceil(
          metr.reduce((a, m) => a + m.asc + m.desc, 0) + gap * (lines.length - 1) + pad * 2
        );
        wrap.style.height = `${H}px`;

        textCanvas.width = Math.round(W * dpr);
        textCanvas.height = Math.round(H * dpr);
        tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        tctx.fillStyle = "#fff";
        tctx.fillRect(0, 0, W, H);
        tctx.fillStyle = "#000";
        tctx.textBaseline = "alphabetic";
        let y = pad;
        metr.forEach((m) => {
          tctx.font = font(m.size);
          tctx.fillText(m.l, 0, y + m.asc);
          y += m.asc + m.desc + gap;
        });
        tex.needsUpdate = true;

        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H, false);
        mat.uniforms.uAspect.value = W / H;
      };
      const draw = async () => {
        try {
          await document.fonts.ready;
        } catch {}
        if (!disposed) {
          lastW = 0;
          build();
        }
      };
      draw();
      const ro = new ResizeObserver(build);
      ro.observe(wrap);

      /* pointer */
      let inside = false;
      const m = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };
      let amp = 0;
      const onMove = (e: PointerEvent) => {
        const r = wrap.getBoundingClientRect();
        m.x = (e.clientX - r.left) / r.width;
        m.y = 1 - (e.clientY - r.top) / r.height;
        if (!inside) {
          m.sx = m.x;
          m.sy = m.y;
          inside = true;
        }
      };
      const onLeave = () => {
        inside = false;
      };
      wrap.addEventListener("pointermove", onMove, { passive: true });
      wrap.addEventListener("pointerleave", onLeave);
      wrap.addEventListener("pointercancel", onLeave);

      /* reveal on scroll */
      const st = ScrollTrigger.create({
        trigger: wrap,
        start: "top 95%",
        once: true,
        onEnter: () => {
          if (reduced) return;
          gsap.to(mat.uniforms.uReveal, { value: 1.001, duration: 1.5, ease: "expo.out" });
        },
      });

      /* render only while visible; idle frames are throttled */
      let visible = true;
      const io = new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
      });
      io.observe(wrap);

      let frame = 0;
      const loop = (time: number) => {
        if (!visible) return;

        // touch screens have no hover: a slow ripple wanders across the name by itself
        if (coarse && !reduced && !inside) {
          m.x = 0.5 + 0.38 * Math.sin(time * 0.35);
          m.y = 0.5 + 0.18 * Math.sin(time * 0.5);
        }

        const wander = coarse && !reduced && !inside;
        const target = reduced
          ? 0
          : inside
            ? 0.45 + Math.min(Math.hypot(m.x - m.sx, m.y - m.sy) * 22, 0.9)
            : wander
              ? 0.28
              : 0;

        const active = inside || wander || amp > 0.01;
        if (!active && ++frame % 2) return; // idle sway at 30fps

        m.sx += (m.x - m.sx) * 0.12;
        m.sy += (m.y - m.sy) * 0.12;
        amp += (target - amp) * (target > amp ? 0.12 : 0.04); // quick in, slow melt out
        mat.uniforms.uMouse.value.set(m.sx, m.sy);
        mat.uniforms.uAmp.value = amp;
        mat.uniforms.uTime.value = time;
        renderer.render(scene, cam);
      };
      gsap.ticker.add(loop);

      cleanup = () => {
        gsap.ticker.remove(loop);
        st.kill();
        io.disconnect();
        ro.disconnect();
        wrap.removeEventListener("pointermove", onMove);
        wrap.removeEventListener("pointerleave", onLeave);
        wrap.removeEventListener("pointercancel", onLeave);
        tex.dispose();
        geo.dispose();
        mat.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [text]);

  return (
    <div
      ref={wrapRef}
      className="relative h-[clamp(60px,11vw,200px)] w-full select-none max-[639px]:h-[62vw]"
      style={{ touchAction: "pan-y" }}
    >
      <h2 className="sr-only">{text}</h2>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/* ---------- FOOTER ---------- */
export default function Footer() {
  return (
    <footer
      id="contact"
      className="relative bg-white px-4 pb-4 pt-12 text-ink md:px-8 md:pt-[56px]"
    >
      <div className="mx-auto max-w-[1720px]">
        {/* MICRO STRIP */}
        <div className="t-micro hidden grid-cols-12 items-start gap-x-3 text-gray-500 md:grid">
          <div className="col-span-4 text-left">
            <Text variant="slideUp" delay={0}>
              <span className="block">(10) Contact</span>
            </Text>
          </div>
          <div className="col-span-4 col-start-5 grid grid-cols-3">
            <Text variant="slideUp" delay={0.06}>
              <span className="block text-left">Scene 06</span>
            </Text>
            <Text variant="slideUp" delay={0.12}>
              <span className="block text-center">
                <Timecode />
              </span>
            </Text>
            <Text variant="slideUp" delay={0.18}>
              <span className="block text-right">Take 01</span>
            </Text>
          </div>
          <div className="col-span-3 col-start-10 text-right">
            <Text variant="slideUp" delay={0.24}>
              <span className="block">That&apos;s a wrap</span>
            </Text>
          </div>
        </div>

        {/* MAIN ROW: contact · index · follow · time */}
        <div className={`${ROW} mt-8 gap-y-10 md:mt-[40px]`}>
          {/* CONTACT */}
          <div className="col-span-4 md:col-span-5">
            <Text variant="slideUp" delay={0}>
              <div className="t-label border-t border-black/15 pt-[10px]">
                <span className="mr-[10px] tabular-nums text-gray-500">(01)</span>
                Let&apos;s talk
              </div>
            </Text>
            <a
              href={`mailto:${EMAIL}`}
              className="group/a mt-[14px] inline-flex items-center gap-[0.3em] text-[clamp(22px,2.6vw,42px)] font-medium leading-none tracking-[-0.045em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#d92626]"
            >
              <HoverLine mode="swap" className="[--line-gap:4px] [--line-h:2px]">
                {EMAIL}
              </HoverLine>
              <ArrowSwap size={0.55} />
            </a>
          </div>

          {/* INDEX */}
          <nav aria-label="Footer index" className="col-span-2 md:col-span-2 md:col-start-7">
            <Text variant="slideUp" delay={0.06}>
              <div className="t-label border-t border-black/15 pt-[10px] text-gray-500">Index</div>
            </Text>
            <ul className="t-body mt-[14px] flex flex-col gap-[6px]">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (n.href === "#about") {
                        window.dispatchEvent(new CustomEvent("open-about-drawer"));
                      } else {
                        goTo(n.href);
                      }
                    }}
                  >
                    <HoverLine mode="draw">{n.label}</HoverLine>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* FOLLOW */}
          <div className="col-span-2 md:col-span-2 md:col-start-9">
            <Text variant="slideUp" delay={0.12}>
              <div className="t-label border-t border-black/15 pt-[10px] text-gray-500">Follow</div>
            </Text>
            <ul className="t-body mt-[14px] flex flex-col gap-[6px]">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  {s.href ? (
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/a inline-flex items-center gap-[6px]"
                    >
                      <HoverLine mode="draw">{s.label}</HoverLine>
                      <ArrowSwap size={0.8} />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-baseline gap-[6px] text-gray-400">
                      {s.label}
                      <span className="t-micro">(Soon)</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* LOCAL TIME + BACK TO TOP */}
          <div className="col-span-4 md:col-span-2 md:col-start-11">
            <Text variant="slideUp" delay={0.18}>
              <div className="t-label border-t border-black/15 pt-[10px] text-gray-500">Local time</div>
            </Text>
            <div className="t-body mt-[14px] flex items-center justify-between gap-3">
              <IstClock />
              <button
                type="button"
                onClick={() => goTo(0)}
                aria-label="Back to top"
                className="group/a relative grid size-[44px] shrink-0 place-items-center overflow-hidden rounded-full border border-black/20 text-ink transition-colors duration-500 hover:text-white focus-visible:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#d92626]"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 origin-bottom scale-y-0 bg-black transition-transform duration-[650ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover/a:scale-y-100 group-focus-visible/a:scale-y-100"
                />
                <span className="relative z-10 text-[16px]">
                  <ArrowSwap dir="up" size={0.9} />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* SHADER NAME: liquid ripples on hover */}
        <div className="mt-8 md:mt-[40px]">
          <LiquidName text={NAME} />
        </div>

        {/* BOTTOM STRIP */}
        <div className="t-micro mt-3 grid grid-cols-1 gap-1 border-t border-black/15 pt-[10px] text-gray-500 md:grid-cols-3">
          <span className="text-left">Film Maker Archives © {new Date().getFullYear()}</span>
          <span className="md:text-center">Warangal · Hyderabad · Mumbai</span>
          <span className="md:text-right">17.9689° N, 79.5941° E</span>
        </div>
      </div>
    </footer>
  );
}