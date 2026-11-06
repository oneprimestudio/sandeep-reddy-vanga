"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import Text from "./Text";
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

/* developer credit (micro, bottom right) */
const DEV_NAME = "Nagaruthwik";
const DEV_IG = "https://www.instagram.com/m.n.ruthwik/";
const DEV_IMG = "/images/nagaruthwik.png"; // put the file in /public/images/

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

/* ---------- SHADER: burning paper reveals the developer portrait ---------- */
const BURN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BURN_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform vec2  uRes;
  uniform float uTime;
  uniform float uBurn;       // 0..1  white paper burns away, bottom -> top
  uniform float uImgAspect;  // image w / h

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

  // premultiplied: alive paper -> char -> hot rim, hole side -> ember halo
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
    vec2 p = (vUv - 0.5) * vec2(asp, 1.0);

    // image: cover-fit + slow settle (starts slightly zoomed in)
    float s = mix(0.88, 1.0, smoothstep(0.0, 1.0, uBurn));
    vec2 uv = (vUv - 0.5) * s;
    if (asp > uImgAspect) uv.y *= uImgAspect / asp;
    else uv.x *= asp / uImgAspect;
    uv += 0.5;

    vec3 img = texture2D(uTex, uv).rgb;
    float gr = hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
    img += gr * 0.045;

    // white paper over the image, burning bottom -> top
    float n = fbm(p * 3.0 + 5.0) + (vUv.y - 0.5) * 0.6;
    float t = mix(-0.5, 1.6, uBurn);
    float g;
    vec3 paper = vec3(1.0) + gr * 0.03;
    vec4 P = burnLayer(clamp(paper, 0.0, 1.0), n, t, 0.1, g);

    vec3 col = P.rgb + img * (1.0 - P.a);

    // sparks drifting up off the burn front
    float gs = g * step(0.001, uBurn) * step(uBurn, 0.999);
    float cells = clamp(uRes.y / 4.0, 14.0, 110.0);
    vec2 sc = floor((p + vec2(0.0, -uTime * 0.09)) * cells);
    float sh = hash(sc + floor(uTime * 9.0));
    float spk = step(0.985, sh) * smoothstep(0.5, 1.0, gs);
    col += mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.85, 0.5), hash(sc)) * spk;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

function BurnPortrait({
  src,
  alt,
  burn,
}: {
  src: string;
  alt: string;
  burn: MutableRefObject<{ v: number }>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

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
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setClearColor(0xffffff, 1);

      const uniforms = {
        uTex: { value: null as unknown },
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uBurn: { value: 0 },
        uImgAspect: { value: 0.75 },
      };
      const mat = new THREE.ShaderMaterial({
        vertexShader: BURN_VERT,
        fragmentShader: BURN_FRAG,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });
      const geo = new THREE.PlaneGeometry(2, 2);
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geo, mat));
      const cam = new THREE.Camera();

      let ready = false;
      let dirty = true;
      let visible = true;
      let lastB = -1;

      const size = () => {
        const w = Math.max(1, wrap.clientWidth);
        const h = Math.max(1, wrap.clientHeight);
        const pr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(pr);
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w * pr, h * pr);
        dirty = true;
      };
      size();
      const ro = new ResizeObserver(size);
      ro.observe(wrap);

      // raw sRGB in, raw sRGB out (no colour-space conversion in this shader)
      const tex = new THREE.TextureLoader().load(
        src,
        (t) => {
          if (disposed) return;
          t.minFilter = THREE.LinearFilter;
          t.generateMipmaps = false;
          const im = t.image as HTMLImageElement;
          uniforms.uImgAspect.value = (im.naturalWidth || im.width) / (im.naturalHeight || im.height);
          uniforms.uTex.value = t;
          ready = true;
          dirty = true;
        },
        undefined,
        () => {
          if (!disposed) setFailed(true);
        }
      );

      const io = new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        if (visible) dirty = true;
      });
      io.observe(wrap);

      const loop = (time: number) => {
        if (!ready || !visible) return;
        const b = burn.current.v;
        const burning = b > 0.001 && b < 0.999;
        if (!burning && !dirty && b === lastB) return; // fully paper / fully revealed: no redraw
        lastB = b;
        dirty = false;
        uniforms.uTime.value = time;
        uniforms.uBurn.value = b;
        renderer.render(scene, cam);
      };
      gsap.ticker.add(loop);

      cleanup = () => {
        gsap.ticker.remove(loop);
        io.disconnect();
        ro.disconnect();
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
  }, [src, burn]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden border border-black/10 bg-white">
      {/* plain image only shows if WebGL / the texture fails */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-cover ${failed ? "" : "opacity-0"}`}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={`absolute inset-0 h-full w-full ${failed ? "hidden" : ""}`}
      />
    </div>
  );
}

/* ---------- MICRO DEVELOPER CREDIT (bottom right): small portrait, burns in once ---------- */
function MicroDev() {
  const ref = useRef<HTMLSpanElement>(null);
  const burn = useRef({ v: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      burn.current.v = 1;
      return;
    }
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 98%",
      once: true,
      onEnter: () => {
        gsap.to(burn.current, { v: 1, duration: 2.2, ease: "power1.inOut", delay: 0.2 });
      },
    });
    return () => st.kill();
  }, []);

  return (
    <a
      href={DEV_IG}
      target="_blank"
      rel="noopener noreferrer"
      className="group/a flex items-end gap-3 text-gray-500 transition-colors duration-500 hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#d92626]"
    >
      <span className="t-micro text-right leading-[1.35]">
        <span className="block">Developed by</span>
        <span className="inline-flex items-center gap-[6px] text-ink">
          <HoverLine mode="draw">{DEV_NAME}</HoverLine>
          <ArrowSwap size={0.9} />
        </span>
      </span>
      <span ref={ref} className="block h-[64px] w-[48px] shrink-0 md:h-[76px] md:w-[57px]">
        <BurnPortrait src={DEV_IMG} alt={`${DEV_NAME}, web developer`} burn={burn} />
      </span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
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
        {/* MAIN ROW: contact · index · time */}
        <div className={`${ROW} gap-y-10`}>
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
          <nav aria-label="Footer index" className="col-span-2 md:col-span-3 md:col-start-7">
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

          {/* LOCAL TIME + BACK TO TOP */}
          <div className="col-span-2 md:col-span-2 md:col-start-11">
            <Text variant="slideUp" delay={0.12}>
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

        {/* BOTTOM STRIP: copyright left, developer credit (small portrait) bottom right */}
        <div className="mt-3 flex items-end justify-between gap-4 border-t border-black/15 pt-[10px]">
          <span className="t-micro text-gray-500">Film Maker Archives © {new Date().getFullYear()}</span>
          <MicroDev />
        </div>
      </div>
    </footer>
  );
}