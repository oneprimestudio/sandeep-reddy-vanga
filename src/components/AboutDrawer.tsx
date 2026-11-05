"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, MASK_EASE } from "@/lib/gsap";
import { HoverLine } from "./HoverLink";
import { Timecode } from "./HeroMicro";

type Props = {
  open: boolean;
  onClose: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

/* ---------- page scroll lock ---------- */
type LenisLike = { stop: () => void; start: () => void };

const isLenis = (x: unknown): x is LenisLike =>
  !!x &&
  typeof (x as LenisLike).stop === "function" &&
  typeof (x as LenisLike).start === "function";

const globalLenis = (): LenisLike | undefined => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { lenis?: unknown };
  const c = w.lenis as { current?: unknown; lenis?: unknown } | undefined;
  if (isLenis(c)) return c;
  if (isLenis(c?.current)) return c.current;
  if (isLenis(c?.lenis)) return c.lenis;
  return undefined;
};

let pageLocked = false;
function lockPage() {
  if (pageLocked) return;
  pageLocked = true;
  const html = document.documentElement;
  const body = document.body;
  const sbw = window.innerWidth - html.clientWidth; // avoid layout shift
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  if (sbw > 0) body.style.paddingRight = `${sbw}px`;
  try {
    globalLenis()?.stop();
  } catch {}
}
function unlockPage() {
  if (!pageLocked) return;
  pageLocked = false;
  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = "";
  body.style.overflow = "";
  body.style.paddingRight = "";
  try {
    globalLenis()?.start();
  } catch {}
}

/* ---------- shaders (exact match with FilmDrawer) ---------- */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* Panel: rises from the bottom, dome-shaped top edge that flattens at the top */
const PANEL_FRAG = /* glsl */ `
  uniform float uP;
  uniform float uExit;
  uniform vec2 uSize;
  uniform float uBend;
  varying vec2 vUv;
  void main() {
    float x = vUv.x * uSize.x;
    float y = vUv.y * uSize.y;

    // OPEN: rises from the bottom with a dome edge
    float edge = uP * uSize.y + uBend * sin(3.14159265 * uP) * sin(3.14159265 * vUv.x);
    float d = y - edge;
    if (d > 0.0) discard;

    // CLOSE: left edge sweeps to the right (middle lags behind = dome)
    float exitEdge = uExit * uSize.x - uBend * sin(3.14159265 * uExit) * sin(3.14159265 * vUv.y);
    float dx = x - exitEdge;
    if (uExit > 0.0 && dx < 0.0) discard;

    vec3 ink = vec3(0.04);
    vec3 col = vec3(1.0);

    // ink line riding the rising edge
    float line = (1.0 - smoothstep(0.0, 1.5, -d)) * (1.0 - smoothstep(0.985, 1.0, uP));
    col = mix(col, ink, line);

    // ink line riding the exit edge
    float exitLine = 0.0;
    if (uExit > 0.0) {
      exitLine = (1.0 - smoothstep(0.0, 1.5, dx)) * (1.0 - smoothstep(0.985, 1.0, uExit));
    }
    col = mix(col, ink, exitLine);

    // hairline on the left edge of the drawer
    float lx = 1.0 - smoothstep(0.0, 1.5, uExit > 0.0 ? dx : x);
    col = mix(col, ink, lx * 0.18);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* Poster: wipes up from the bottom, zoom settles to 1 */
const POSTER_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float uHas;
  uniform float uReveal;
  uniform float uZoom;
  uniform vec2 uRepeat;
  varying vec2 vUv;
  void main() {
    if (vUv.y > uReveal) discard;
    vec2 uv = (vUv - 0.5) * uRepeat / uZoom + 0.5;
    vec3 col = vec3(0.88);
    if (uHas > 0.5) col = texture2D(map, uv).rgb;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** masked block: slides up in and exits to the right */
function M({ children, as = "div" }: { children: ReactNode; as?: "div" | "span" }) {
  const Tag = as;
  return (
    <Tag className="block overflow-hidden py-[0.08em] -my-[0.08em]">
      <Tag data-d className="block will-change-transform">
        {children}
      </Tag>
    </Tag>
  );
}

/** L4 label under a hairline: "(02) Title" — same as FilmDrawer chapters */
function ChapterLabel({ index, title }: { index: string; title: string }) {
  return (
    <M>
      <div className="t-label flex items-baseline gap-[10px] border-t border-black/15 pt-[10px]">
        <span className="tabular-nums text-gray-500">({index})</span>
        <span className="text-ink">{title}</span>
      </div>
    </M>
  );
}

const DOSSIER_FACTS = [
  { k: "Full Name", v: "Sandeep Reddy Vanga" },
  { k: "Born", v: "25 December 1981 (Warangal, Telangana)" },
  { k: "Education", v: "International Film School Sydney (IFSS)" },
  { k: "Occupations", v: "Director · Screenwriter · Film Editor" },
  { k: "Production Banner", v: "Bhadrakali Pictures" },
  { k: "Directorial Debut", v: "Arjun Reddy (2017)" },
  { k: "Landmark Works", v: "Kabir Singh (2019), Animal (2023)" },
  { k: "Next Project", v: "Spirit (with Prabhas)" },
  { k: "Editing Style", v: "Hands-on auteur cut, emotional rhythm" },
];

const FILMOGRAPHY = [
  { year: "2017", title: "Arjun Reddy", role: "Writer · Director · Editor", note: "Telugu · Debut / Cult Classic" },
  { year: "2019", title: "Kabir Singh", role: "Writer · Director", note: "Hindi · ₹379+ Cr Box Office" },
  { year: "2023", title: "Animal", role: "Writer · Director · Editor", note: "Hindi / Multi · ₹917+ Cr All-Time Blockbuster" },
  { year: "Upcoming", title: "Spirit", role: "Writer · Director", note: "Multi-lingual · Pre-production" },
  { year: "Announced", title: "Animal Park", role: "Writer · Director · Editor", note: "Multi-lingual · In Development" },
];

const CRAFT_ASPECTS = [
  { role: "Screenplay", desc: "Writes without emotional filters or conventional sanitization; centers deeply flawed, volatile humans driven by conviction." },
  { role: "Film Editing", desc: "Personally edits his films. Believes pacing is an authorial decision that defines the breathing rhythm of every dramatic confrontation." },
  { role: "Sonic Design", desc: "Contrasts hyper-energetic, visceral action with orchestral strings, retro soul guitars, and profound atmospheric silence." },
  { role: "Visual Staging", desc: "Prioritizes long uninterrupted takes and intimate camera proximity, allowing actors to sustain natural intensity without coverage cuts." },
];

const BEHIND_THE_MIND = [
  "Spends up to two full years refining a screenplay from first beat to final shooting draft before approaching any actor or financier.",
  "Founded Bhadrakali Pictures alongside brother Pranay and father Prabhakar to protect artistic control after years of industry rejections.",
  "Named Bhadrakali Pictures after the revered Bhadrakali Temple in his hometown of Warangal, rooted in family heritage.",
  "Considers editing the second phase of screenwriting; cuts scenes based on visceral heartbeat rather than standard continuity rules.",
];

export default function AboutDrawer({ open, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const titleId = useId();

  const portraitSrc = "/images/sandeep-reddy-vanga.jpg";

  // shared with the three.js loop
  const pv = useRef({ p: 0, exit: 0, reveal: 0, zoom: 1.25, active: false });
  const apiRef = useRef<{ setSrc: (s: string) => void; draw: () => void } | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const onCloseRef = useRef(onClose);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (open) {
      setHasOpened(true);
    }
  }, [open]);

  /* ---------- THREE.JS: panel + portrait (only mounts when opened) ---------- */
  useEffect(() => {
    if (!hasOpened) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const panelEl = panelRef.current;
      const canvas = canvasRef.current;
      if (disposed || !panelEl || !canvas) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
      } catch {
        return;
      }
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 5;

      const unit = new THREE.PlaneGeometry(1, 1);

      // Panel surface
      const panelMat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: PANEL_FRAG,
        uniforms: {
          uP: { value: 0 },
          uExit: { value: 0 },
          uSize: { value: new THREE.Vector2(1, 1) },
          uBend: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      });
      const panel = new THREE.Mesh(unit, panelMat);
      panel.position.set(0, 0, 0);
      scene.add(panel);

      // Portrait inside the drawer
      const posterMat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: POSTER_FRAG,
        uniforms: {
          map: { value: null },
          uHas: { value: 0 },
          uReveal: { value: 0 },
          uZoom: { value: 1.25 },
          uRepeat: { value: new THREE.Vector2(1, 1) },
        },
        transparent: true,
        depthWrite: false,
      });
      const poster = new THREE.Mesh(unit, posterMat);
      poster.position.set(0, 0, 1);
      poster.visible = false;
      scene.add(poster);

      const loader = new THREE.TextureLoader();
      let cachedTex: InstanceType<typeof THREE.Texture> | null = null;
      let texAspect = 3 / 4;

      const readAspect = (tex: InstanceType<typeof THREE.Texture>) => {
        const img = tex.image as
          | { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
          | undefined;
        const nw = img?.naturalWidth || img?.width || 0;
        const nh = img?.naturalHeight || img?.height || 0;
        texAspect = nw && nh ? nw / nh : 3 / 4;
      };

      const setSrc = (src: string) => {
        if (!src) return;
        if (cachedTex) {
          readAspect(cachedTex);
          posterMat.uniforms.map.value = cachedTex;
          posterMat.uniforms.uHas.value = 1;
          posterMat.needsUpdate = true;
          return;
        }
        loader.load(src, (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          cachedTex = tex;
          readAspect(tex);
          posterMat.uniforms.map.value = tex;
          posterMat.uniforms.uHas.value = 1;
          posterMat.needsUpdate = true;
        });
      };

      const resize = () => {
        const w = panelEl.clientWidth;
        const h = panelEl.clientHeight;
        if (!w || !h) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        camera.left = -w / 2;
        camera.right = w / 2;
        camera.top = h / 2;
        camera.bottom = -h / 2;
        camera.updateProjectionMatrix();
        panel.scale.set(w, h, 1);
        panelMat.uniforms.uSize.value.set(w, h);
        panelMat.uniforms.uBend.value = Math.min(h * 0.14, 160);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(panelEl);

      const frame = () => {
        const s = pv.current;
        panel.visible = s.p > 0.001;
        panelMat.uniforms.uP.value = s.p;
        panelMat.uniforms.uExit.value = s.exit;

        // Portrait follows its DOM slot
        const slot = slotRef.current;
        if (slot) {
          const r = slot.getBoundingClientRect();
          const cr = canvas.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            const ra = r.width / r.height;
            posterMat.uniforms.uRepeat.value.set(
              texAspect > ra ? ra / texAspect : 1,
              texAspect > ra ? 1 : texAspect / ra
            );
            posterMat.uniforms.uReveal.value = s.reveal;
            posterMat.uniforms.uZoom.value = s.zoom;
            const rise = (1 - Math.min(s.reveal, 1)) * 28;
            poster.position.set(
              r.left + r.width / 2 - (cr.left + cr.width / 2),
              cr.top + cr.height / 2 - (r.top + r.height / 2) - rise,
              1
            );
            poster.scale.set(r.width, r.height, 1);
            poster.visible = s.reveal > 0.001 && s.p > 0.55;
          }
        }
        renderer.render(scene, camera);
      };

      const loop = () => {
        if (pv.current.active) frame();
      };
      gsap.ticker.add(loop);

      apiRef.current = { setSrc, draw: frame };
      setSrc(portraitSrc);

      cleanup = () => {
        gsap.ticker.remove(loop);
        apiRef.current = null;
        ro.disconnect();
        unit.dispose();
        panelMat.dispose();
        posterMat.dispose();
        cachedTex?.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [hasOpened, portraitSrc]);

  /* ---------- OPEN: dome rises · CLOSE: slides out to the RIGHT ---------- */
  useEffect(() => {
    const root = rootRef.current;
    const backdrop = backdropRef.current;
    const panelEl = panelRef.current;
    const scroller = scrollRef.current;
    const closeBtn = closeRef.current;
    if (!root || !backdrop || !panelEl || !scroller || !closeBtn) return;

    const s = pv.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const T = (d: number) => (reduced ? 0.001 : d);
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-d]"));

    if (open) {
      wasOpen.current = true;
      lastFocus.current = document.activeElement as HTMLElement | null;
      tlRef.current?.kill();

      s.active = true;
      gsap.set(root, { visibility: "visible" });
      gsap.set(panelEl, { clearProps: "transform" });
      gsap.set(backdrop, { opacity: 0 });
      gsap.set(items, { yPercent: 110, xPercent: 0 });
      gsap.set(closeBtn, { opacity: 0 });
      scroller.scrollTop = 0;
      s.exit = 0;
      gsap.set(scroller, { x: 0 });
      lockPage();
      closeBtn.focus({ preventScroll: true });

      const at = (t: number) => (reduced ? 0 : t);
      tlRef.current = gsap
        .timeline()
        .to(backdrop, { opacity: 1, duration: T(0.8), ease: "power2.out" }, 0)
        .to(s, { p: 1, duration: T(1.2), ease: "expo.inOut" }, 0)
        .to(
          items,
          { yPercent: 0, duration: T(1.1), ease: "expo.out", stagger: reduced ? 0 : { amount: 0.7 } },
          at(0.62)
        )
        .to(s, { reveal: 1.001, duration: T(1.3), ease: MASK_EASE }, at(0.7))
        .to(s, { zoom: 1, duration: T(1.7), ease: "expo.out" }, at(0.7))
        .to(closeBtn, { opacity: 1, duration: T(0.5), ease: "power2.out" }, at(0.9));
    } else if (wasOpen.current) {
      wasOpen.current = false;
      tlRef.current?.kill();

      const dist = panelEl.offsetWidth;

      tlRef.current = gsap
        .timeline({
          onComplete: () => {
            gsap.set(root, { visibility: "hidden" });
            gsap.set(scroller, { clearProps: "transform" });
            gsap.set(items, { clearProps: "transform" });
            s.p = 0;
            s.exit = 0;
            s.reveal = 0;
            s.zoom = 1.25;
            apiRef.current?.draw();
            s.active = false;
            unlockPage();
            scroller.scrollTop = 0;
            lastFocus.current?.focus?.({ preventScroll: true });
          },
        })
        .to(s, { exit: 1, duration: T(1.0), ease: "expo.inOut" }, 0)
        .to(scroller, { x: dist, duration: T(1.0), ease: "expo.inOut", force3D: true }, 0)
        .to(closeBtn, { opacity: 0, duration: T(0.3), ease: "power2.in" }, 0)
        .to(backdrop, { opacity: 0, duration: T(0.9), ease: "power2.inOut" }, 0);
    }
  }, [open]);

  /* ---------- background scroll lock ---------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const block = (e: Event) => {
      const sc = scrollRef.current;
      if (sc && e.target instanceof Node && sc.contains(e.target)) return;
      e.preventDefault();
    };
    root.addEventListener("wheel", block, { passive: false });
    root.addEventListener("touchmove", block, { passive: false });
    return () => {
      root.removeEventListener("wheel", block);
      root.removeEventListener("touchmove", block);
    };
  }, []);

  /* Esc + focus trap while open */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const root = rootRef.current;
      if (!root) return;
      const f = Array.from(
        root.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (!root.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* unmount safety */
  useEffect(() => {
    return () => {
      tlRef.current?.kill();
      lenisRef.current?.destroy();
      lenisRef.current = null;
      unlockPage();
    };
  }, []);

  /* Lenis smooth scroll for drawer content */
  useEffect(() => {
    if (!open) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      return;
    }

    const wrapper = scrollRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    wrapper.scrollTop = 0;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      prevent: () => false,
    });
    lenisRef.current = lenis;

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [open]);

  let n = 1;
  const next = () => pad(++n);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-hidden={!open}
      data-lenis-prevent
      style={{ visibility: "hidden" }}
      className="fixed inset-0 z-[200] overscroll-none"
    >
      {/* Dim backdrop: click to close */}
      <div
        ref={backdropRef}
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur opacity-0 cursor-pointer"
      />

      {/* DRAWER: matching FilmDrawer width and positioning */}
      <div
        ref={panelRef}
        className="absolute bottom-0 left-2 right-2 top-2 overflow-hidden lg:left-auto lg:w-[58vw]"
      >
        {/* Three.js canvas for panel dome surface and portrait */}
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="t-micro absolute right-[20px] top-[20px] z-20 bg-white py-[2px] pl-[10px] text-ink cursor-pointer"
        >
          <HoverLine mode="draw">Close</HoverLine> <span className="text-gray-500">(Esc)</span>
        </button>

        <div
          ref={scrollRef}
          tabIndex={0}
          data-lenis-prevent
          className="relative z-10 h-full overflow-y-auto overflow-x-hidden overscroll-contain px-[20px] pb-[40px] pt-[20px] focus:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div ref={contentRef} className="flex flex-col gap-[20px]">
            {/* L5 MICRO STRIP */}
            <M>
              <div className="t-micro grid grid-cols-3 items-start pr-[88px] text-gray-500">
                <span className="text-left">(Biography · Profile)</span>
                <span className="text-center">
                  <Timecode />
                </span>
                <span className="text-right">Director Archives</span>
              </div>
            </M>

            {/* L4 label + L1 DISPLAY */}
            <div className="flex flex-col gap-[16px]">
              <M>
                <div className="t-label flex items-baseline gap-[10px]">
                  <span className="tabular-nums text-gray-500">(01)</span>
                  <span className="text-ink">The Filmmaker</span>
                </div>
              </M>
              <h2 id={titleId} className="t-display text-ink uppercase">
                <M as="span">
                  <span className="block text-left">Sandeep Reddy Vanga</span>
                </M>
                <M as="span">
                  <span className="block text-right">(Warangal, 1981)</span>
                </M>
              </h2>
            </div>

            {/* PORTRAIT: rotated label + slot (Three.js draws into it) */}
            <div className="grid grid-cols-6 gap-x-[10px]">
              <div className="col-span-1 hidden items-end justify-end pr-[2px] lg:flex">
                <M>
                  <span
                    aria-hidden
                    className="t-micro text-gray-500 [writing-mode:vertical-rl] rotate-180"
                  >
                    Director
                  </span>
                </M>
              </div>
              <div className="col-span-6 lg:col-span-5">
                <div ref={slotRef} className="aspect-[5/7] w-full" />
              </div>
            </div>

            {/* L5 CAPTIONS under the portrait edges */}
            <div className="t-micro -mt-[10px] grid grid-cols-6 gap-x-[10px]">
              <div className="col-span-3 text-left lg:col-start-2">
                <M>
                  <div>
                    <span className="block text-ink">Sandeep Reddy Vanga</span>
                    <span className="block text-gray-500">Director · Screenplay · Editor</span>
                  </div>
                </M>
              </div>
              <div className="col-span-3 text-right lg:col-span-2">
                <M>
                  <div>
                    <span className="block text-ink">Bhadrakali Pictures</span>
                    <span className="block text-gray-500">Warangal · Hyderabad</span>
                  </div>
                </M>
              </div>
            </div>

            {/* L4 label + L2 LEAD: the philosophy */}
            <div className="mt-[20px] grid grid-cols-6 gap-x-[10px] gap-y-[16px]">
              <div className="col-span-6 lg:col-span-2">
                <M>
                  <div className="t-label flex items-baseline gap-[10px] text-left">
                    <span className="tabular-nums text-gray-500">({next()})</span>
                    <span className="text-ink">The Creed</span>
                  </div>
                </M>
              </div>
              <div className="col-span-6 lg:col-span-4">
                <M>
                  <p className="font-regular text-balance text-center text-[22px] leading-[1.05] text-ink">
                    &ldquo;Cinema is not made to please everyone. It is made to make you feel something you cannot ignore.&rdquo;
                  </p>
                </M>
              </div>
            </div>

            {/* CHAPTER: the story */}
            <div className="mt-[20px] flex flex-col gap-[20px]">
              <ChapterLabel index={next()} title="The Journey" />
              <div className="flex max-w-[92%] flex-col gap-3">
                <M>
                  <p className="t-body text-left text-pretty text-gray-700">
                    Born in Warangal, Telangana, Sandeep Reddy Vanga grew up far from the established dynasties of Indian cinema. His youth was marked by an obsessive love for motion pictures—spending hours inside single-screen cinemas, studying the emotional impact of dramatic pacing and framing.
                  </p>
                </M>
                <M>
                  <p className="t-body text-left text-pretty text-gray-700">
                    Expected to follow a conventional profession, he initially enrolled in physiotherapy in Belagavi. But the urge to tell stories was undeniable. He abandoned the medical track and took a monumental leap of faith, flying to Sydney to study filmmaking at the International Film School Sydney (IFSS).
                  </p>
                </M>
                <M>
                  <p className="t-body text-left text-pretty text-gray-700">
                    Equipped with a sharp technical discipline and an uncompromising narrative voice, he returned to India and spent nearly five years pitching his debut script, <span className="font-medium text-ink">Arjun Reddy</span>. Conventional producers demanded formulaic songs, trimmed runtimes, and sanitized protagonists. He refused every compromise.
                  </p>
                </M>
                <M>
                  <p className="t-body text-left text-pretty text-gray-700">
                    Refusing to water down his vision, his brother Pranay Reddy Vanga and father pooled family funds to launch <span className="font-medium text-ink">Bhadrakali Pictures</span>. Produced independently, Arjun Reddy redefined modern Telugu cinema. With its Hindi reimagining <span className="font-medium text-ink">Kabir Singh</span> and the global phenomenon <span className="font-medium text-ink">Animal</span>, Vanga cemented his position as one of India&apos;s most audacious auteur filmmakers.
                  </p>
                </M>
              </div>
            </div>

            {/* CHAPTER: dossier / facts */}
            <div className="mt-[20px] flex flex-col gap-[10px]">
              <ChapterLabel index={next()} title="Profile & Dossier" />
              <div>
                {DOSSIER_FACTS.map((f) => (
                  <M key={f.k}>
                    <div className="t-micro grid grid-cols-3 gap-x-[10px] border-t border-black/15 py-[6px]">
                      <span className="text-gray-500">{f.k}</span>
                      <span className="col-span-2 font-medium text-ink">{f.v}</span>
                    </div>
                  </M>
                ))}
              </div>
            </div>

            {/* CHAPTER: filmography */}
            <div className="mt-[20px] flex flex-col gap-[10px]">
              <ChapterLabel index={next()} title="Filmography & Catalog" />
              <div>
                {FILMOGRAPHY.map((item) => (
                  <M key={item.title}>
                    <div className="t-micro grid grid-cols-6 gap-x-[10px] border-t border-black/15 py-[8px]">
                      <span className="col-span-1 text-gray-500">{item.year}</span>
                      <span className="col-span-2 font-medium text-ink">{item.title}</span>
                      <span className="col-span-1 text-gray-500 hidden sm:block">{item.role}</span>
                      <span className="col-span-3 sm:col-span-2 text-right font-mono text-[10px] uppercase text-[#d92626]">
                        {item.note}
                      </span>
                    </div>
                  </M>
                ))}
              </div>
            </div>

            {/* CHAPTER: direction & craft */}
            <div className="mt-[20px] flex flex-col gap-[10px]">
              <ChapterLabel index={next()} title="Directorial Discipline" />
              <div>
                {CRAFT_ASPECTS.map((c) => (
                  <M key={c.role}>
                    <div className="t-micro grid grid-cols-6 gap-x-[10px] border-t border-black/15 py-[8px]">
                      <span className="col-span-2 font-medium text-ink">{c.role}</span>
                      <span className="col-span-4 leading-relaxed text-gray-700">{c.desc}</span>
                    </div>
                  </M>
                ))}
              </div>
            </div>

            {/* CHAPTER: behind the mind / trivia */}
            <div className="mt-[20px] flex flex-col gap-[10px]">
              <ChapterLabel index={next()} title="Behind the Mind" />
              <div>
                {BEHIND_THE_MIND.map((trivia, i) => (
                  <M key={i}>
                    <div className="t-micro grid grid-cols-6 gap-x-[10px] border-t border-black/15 py-[8px] leading-relaxed text-gray-700">
                      <span className="tabular-nums text-gray-500">({pad(i + 1)})</span>
                      <span className="col-span-5">{trivia}</span>
                    </div>
                  </M>
                ))}
              </div>
            </div>

            {/* L5 footer strip */}
            <M>
              <div className="t-micro mt-[20px] grid grid-cols-3 border-t border-black/15 pt-[10px] text-gray-500">
                <span className="text-left">Sandeep Reddy Vanga (Warangal)</span>
                <span className="text-center">Director Profile</span>
                <span className="text-right">Film Maker Archives ©</span>
              </div>
            </M>
          </div>
        </div>
      </div>
    </div>
  );
}
