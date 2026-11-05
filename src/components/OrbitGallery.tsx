"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Mesh, ShaderMaterial } from "three";
import { gsap, MASK_EASE } from "@/lib/gsap";

export type OrbitState = {
  hover: number; // 1 while the pointer is over the front poster
  armed: boolean; // set true by the parent when the section enters
  dragging: boolean; // written here: pointer is down on the section
  moved: boolean; // written here: the pointer travelled (blocks the click)
  locked?: boolean; // locks interaction while the drawer is open
  pinned?: boolean; // true while the section is pinned
  autoSpin?: boolean; // toggle auto-spin (default: true)
  autoSpeed?: number; // auto-spin speed multiplier (default: 1.0)
  rotateSpeed?: number; // rotation speed multiplier for scroll & drag (default: 1.0)
  momentum?: number; // inertia / momentum multiplier (default: 1.0)
  direction?: 1 | -1; // 1 = forward, -1 = reverse (default: 1)
};

type Props = {
  srcs: string[];
  state: OrbitState;
  /** called with the film index (0..srcs.length-1) nearest to the front */
  onIndex?: (film: number) => void;
};

/* INSIDE VIEW, with the camera pulled back so the lens is natural (~44deg) */
const R = 3.4; // ring radius, in poster widths
const CAM_BACK = 4.0; // camera distance behind the ring center. 0 = old wide-angle look
const STEP = 0.46; // angle between neighbours (rad)
const SAG = 0.14; // side lift. 0 = flat path
const ROLL = 0.06; // tilt along the path
const SIDE_SHRINK = 0.14; // side posters get smaller. 0 = same size
const SPEED = 0.26; // auto spin, cards per second
const SCROLL_K = 0.0025; // extra spin per scrolled pixel
const DIR = 1; // 1 = right to left, -1 = reverse
const SIDE_GRAY = 0; // 0 = full color everywhere
const ASPECT = 5 / 7;

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

const VERT = /* glsl */ `
  uniform float uR;
  uniform float uVel;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // bend the plane onto the ring: edges curl toward the ring center
    float a = position.x / uR;
    vec3 p = vec3(uR * sin(a), position.y, uR * (1.0 - cos(a)));
    // velocity skew
    p.x += position.y * uVel * 0.10;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float uGray;
  uniform float uHas;
  uniform float uMask;
  uniform float uZoom;
  uniform float uVel;
  uniform float uTime;
  uniform float uFocus;
  uniform vec2 uRepeat;
  varying vec2 vUv;
  void main() {
    // object-fit: cover + zoom, around the center
    vec2 uv = (vUv - 0.5) * uRepeat / uZoom + 0.5;
    float s = uVel * 0.02; // RGB split while moving
    vec3 col = vec3(0.88);
    if (uHas > 0.5) {
      col = vec3(
        texture2D(map, uv + vec2(s, 0.0)).r,
        texture2D(map, uv).g,
        texture2D(map, uv - vec2(s, 0.0)).b
      );
    }
    float g = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(g), uGray);

    // Restrained film treatment: soft vignette, fine grain and a subtle focus lift.
    vec2 centered = vUv - 0.5;
    float vignette = 1.0 - smoothstep(0.18, 0.92, length(centered * vec2(0.82, 0.68)));
    float grain = fract(sin(dot(vUv * (uTime * 0.035 + 1.0), vec2(127.1, 311.7))) * 43758.5453);
    col *= 0.94 + vignette * 0.06;
    col += (grain - 0.5) * 0.018;
    col *= 1.0 + uFocus * 0.035;
    col = clamp(col, 0.0, 1.0);

    vec2 q = (vUv - 0.5) * vec2(1.0, 1.4);                  // card units (5:7 => width 1, height 1.4)
    vec2 b = vec2(0.5, 0.7) * (1.0 - 0.6 * (1.0 - uMask));  // 30% inset on every side at uMask = 0
    float r = 0.16 * (1.0 - uMask);                         // ~24px corner radius, relative to card width
    vec2 dd = abs(q) - b + r;
    float sd = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - r;
    if (sd > 0.0) discard;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function OrbitGallery({ srcs, state, onIndex }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onIndex);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    cbRef.current = onIndex;
  });

  useEffect(() => {
    let disposed = false;
    let cleanup = () => { };

    (async () => {
      const THREE = await import("three");
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      const measure = measureRef.current;
      if (disposed || !wrap || !canvas || !measure) return;
      const root = wrap.parentElement as HTMLElement; // the section: drag area

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setClearColor(0x000000, 0);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(44, 1, 0.05, 80);
      camera.position.set(0, 0, CAM_BACK);

      /* POSTERS: full ring, films repeat to fill the slots */
      const n = srcs.length;
      if (!n) {
        setFailed(true);
        return;
      }
      const M = n * Math.ceil(12 / n);
      const wrapD = (d: number) => ((((d + M / 2) % M) + M) % M) - M / 2;

      const geo = new THREE.PlaneGeometry(1, 1 / ASPECT, 28, 1);
      const loader = new THREE.TextureLoader();
      const textures: InstanceType<typeof THREE.Texture>[] = [];
      const mats: ShaderMaterial[] = [];
      const planes: Mesh[] = [];

      for (let i = 0; i < M; i++) {
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: null },
            uGray: { value: 0 },
            uHas: { value: 0 },
            uMask: { value: reduced ? 1 : 0 },
            uZoom: { value: 1 },
            uVel: { value: 0 },
            uTime: { value: 0 },
            uFocus: { value: 0 },
            uR: { value: R },
            uRepeat: { value: new THREE.Vector2(1, 1) },
          },
          vertexShader: VERT,
          fragmentShader: FRAG,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { intro: reduced ? 1 : 1.15, hz: 1 };
        scene.add(mesh);
        mats.push(mat);
        planes.push(mesh);
      }

      srcs.forEach((src, k) => {
        loader.load(src, (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          const img = tex.image as { width: number; height: number };
          const ia = img.width / img.height;
          for (let i = k; i < M; i += n) {
            const u = mats[i].uniforms;
            u.uRepeat.value.set(
              ia > ASPECT ? ASPECT / ia : 1,
              ia > ASPECT ? 1 : ia / ASPECT
            );
            u.map.value = tex;
            u.uHas.value = 1;
          }
          textures.push(tex);
        });
      });

      /* SIZE: the front poster is exactly as wide as the DOM var --pw */
      let pxPerCard = 240; // screen px between two neighbours (used by drag)
      const resize = () => {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        if (!w || !h) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h, false);
        const pw = measure.offsetWidth || 150;
        const D = R + CAM_BACK; // distance camera -> front poster
        camera.aspect = w / h;
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / (2 * D * pw)));
        camera.updateProjectionMatrix();
        pxPerCard =
          ((R * Math.sin(STEP)) / (CAM_BACK + R * Math.cos(STEP))) * D * pw;
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      let visible = true;
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      io.observe(wrap);

      /* look-around (desktop, motion allowed) */
      const canLook = window.matchMedia("(pointer: fine)").matches && !reduced;
      const pointer = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      if (canLook) window.addEventListener("pointermove", onMove, { passive: true });

      /* ENTRANCE: posters wipe up + settle, center first */
      let started = reduced;
      const startReveal = () => {
        started = true;
        planes.forEach((m, i) => {
          const delay = 0.15 + Math.min(Math.abs(wrapD(i)), 3) * 0.12;
          gsap.to(mats[i].uniforms.uMask, { value: 1, duration: 1.4, ease: MASK_EASE, delay });
          gsap.to(m.userData, { intro: 1, duration: 1.6, ease: "expo.out", delay });
        });
      };

      /* RING STATE */
      let s = 0; // spin position, in cards (unbounded)
      let sp = 1; // auto-spin factor (0 while dragging/hovering, eases back)
      let iv = 0; // inertia after a flick, cards/sec
      let dragV = 0; // live drag velocity, cards/sec
      let vel = 0; // smoothed total velocity (drives skew + RGB split)
      let prevS = 0;
      let zoom = 1;
      let lastIdx = -1;
      let lastSy = window.scrollY;
      let px = 0;
      let py = 0;

      /* GRAB: drag with the mouse or a finger, inertia on release */
      let startX = 0;
      let lastX = 0;
      let lastT = 0;
      const onDown = (e: PointerEvent) => {
        if (state.locked) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        state.dragging = true;
        state.moved = false;
        startX = lastX = e.clientX;
        lastT = performance.now();
        dragV = 0;
        iv = 0;
      };
      const onDrag = (e: PointerEvent) => {
        if (!state.dragging) return;
        const now = performance.now();
        const dx = e.clientX - lastX;
        const dtm = Math.max(1, now - lastT) / 1000;
        lastX = e.clientX;
        lastT = now;
        if (Math.abs(e.clientX - startX) > 6) state.moved = true;
        const rotMult = Math.max(0.1, state.rotateSpeed ?? 1.0);
        const dS = (-dx / pxPerCard) * rotMult; // drag left = cards move left
        s += dS;
        dragV += (dS / dtm - dragV) * 0.35;
      };
      const onUp = () => {
        if (!state.dragging) return;
        state.dragging = false;
        const momMult = Math.max(0.1, state.momentum ?? 1.0);
        iv = reduced ? 0 : clamp(dragV * momMult, -14 * momMult, 14 * momMult);
        sp = 0; // auto spin comes back slowly
        if (state.moved) setTimeout(() => (state.moved = false), 60);
      };
      // trackpad horizontal swipe
      const onWheel = (e: WheelEvent) => {
        if (state.locked || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        const rotMult = Math.max(0.1, state.rotateSpeed ?? 1.0);
        s += ((e.deltaX / pxPerCard) * 0.8) * rotMult;
        sp = 0;
      };
      root.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onDrag, { passive: true });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      root.addEventListener("wheel", onWheel, { passive: false });

      /* LOOP */
      const render = (_t: number, delta: number) => {
        const dt = clamp(delta / 1000, 0.001, 0.05);
        const sy = window.scrollY;
        const dy = sy - lastSy;
        lastSy = sy;
        if (!visible) return;
        if (!started && state.armed) startReveal();

        const dragging = state.dragging;
        const hovering = state.hover > 0 && !dragging;
        const settle = hovering || (reduced && !dragging);
        const live = started && !reduced;
        const isScrolling = !dragging && Math.abs(dy) > 0.05;

        const dir = (state.direction ?? 1) as 1 | -1;
        const autoSpin = state.autoSpin !== false;
        const autoSpeed = Math.max(0, state.autoSpeed ?? 1.0);
        const rotSpeed = Math.max(0.1, state.rotateSpeed ?? 1.0);
        const momentum = Math.max(0.1, state.momentum ?? 1.0);

        const friction = 3.2 / momentum;
        const maxIv = 16 * momentum;

        // auto spin fades out on grab/hover, fades back in after
        sp +=
          ((hovering || dragging ? 0 : 1) - sp) *
          Math.min(1, dt * (hovering || dragging ? 6 : 1.2));

        if (dragging) {
          dragV *= Math.exp(-dt * 10); // stale velocity dies if you hold still
          iv = 0;
        } else {
          iv *= Math.exp(-dt * friction); // inertia friction scaled by momentum setting
          if (Math.abs(iv) < 0.003) iv = 0;
        }

        const autoStep = autoSpin && live ? dir * (SPEED * autoSpeed) * dt * sp : 0;

        if (state.pinned) {
          if (isScrolling) {
            // High velocity scroll: feels speedy and responsive like dragging
            const scrollStep = dy * 0.009 * rotSpeed * dir;
            s += scrollStep;
            const instantV = clamp(scrollStep / dt, -maxIv, maxIv);
            iv = clamp(iv * 0.35 + instantV * 0.65, -maxIv, maxIv);
            sp = 0;
          } else {
            // Ambient auto-spin + momentum coasting
            s += autoStep + (dragging ? 0 : iv * dt);

            // If auto-spin is paused and inertia has stopped, smoothly settle on nearest film
            if (!autoSpin && Math.abs(iv) < 0.02 && !dragging && !hovering) {
              s += (Math.round(s) - s) * Math.min(1, dt * 4.5);
            }
          }
          if (settle) s += (Math.round(s) - s) * Math.min(1, dt * 5);
        } else {
          const boost = live ? dy * SCROLL_K * rotSpeed * dir : 0;
          s += autoStep + boost + (dragging ? 0 : iv * dt);
          if (settle) s += (Math.round(s) - s) * Math.min(1, dt * 5);
        }

        // total velocity -> skew + RGB split (auto, scroll and drag all count)
        vel += ((s - prevS) / dt - vel) * Math.min(1, dt * 8);
        prevS = s;
        const v = clamp(vel * 0.18, -1, 1);

        // grab or high-speed scroll = camera dollies back slightly (tactile momentum feel)
        const isFastSpin = Math.abs(iv) > 1.2 || isScrolling;
        const targetZoom = dragging || (state.pinned && isFastSpin) ? 0.95 : 1;
        zoom += (targetZoom - zoom) * Math.min(1, dt * 6);
        if (Math.abs(camera.zoom - zoom) > 1e-4) {
          camera.zoom = zoom;
          camera.updateProjectionMatrix();
        }

        const pointerEase = 1 - Math.exp(-dt * 5.5);
        px += (pointer.x - px) * pointerEase;
        py += (pointer.y - py) * pointerEase;
        camera.rotation.y = -px * 0.016;
        camera.rotation.x = -py * 0.008;

        planes.forEach((m, i) => {
          const d = wrapD(i - s); // distance from the front, in cards
          const th = d * STEP;
          const ad = Math.abs(d);

          // inner wall of the ring, barely rising toward the sides
          m.position.set(
            R * Math.sin(th),
            SAG * (1 - Math.cos(th)),
            -R * Math.cos(th)
          );
          m.rotation.set(0, -th, th * ROLL);
          m.scale.setScalar(1 - SIDE_SHRINK * Math.min(ad, 3));

          const u = mats[i].uniforms;
          const ud = m.userData as { intro: number; hz: number };
          // The front card carries a little more visual weight without changing the orbit.
          const focus = Math.exp(-ad * ad * 1.8);
          const target = (hovering && ad < 0.5 ? 1.045 : 1) + focus * 0.012;
          ud.hz += (target - ud.hz) * (1 - Math.exp(-dt * 7));

          // Tiny depth breathing makes the ring feel dimensional, not mechanically flat.
          m.position.y += Math.sin(_t * 0.00055 + i * 0.7) * 0.008 * focus;
          m.position.z += focus * 0.018;
          u.uZoom.value = ud.intro * ud.hz;
          u.uGray.value = SIDE_GRAY * Math.min(ad, 1);
          u.uVel.value = v;
          u.uTime.value = _t * 0.001;
          u.uFocus.value = focus;
          m.visible = Math.abs(th) < 1.9;
        });

        const film = (((Math.round(s) % M) + M) % M) % n;
        if (film !== lastIdx) {
          lastIdx = film;
          cbRef.current?.(film);
        }

        renderer.render(scene, camera);
      };
      gsap.ticker.add(render);

      cleanup = () => {
        gsap.ticker.remove(render);
        planes.forEach((m, i) => {
          gsap.killTweensOf(m.userData);
          gsap.killTweensOf(mats[i].uniforms.uMask);
          mats[i].dispose();
        });
        root.removeEventListener("pointerdown", onDown);
        root.removeEventListener("wheel", onWheel);
        window.removeEventListener("pointermove", onDrag);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("pointermove", onMove);
        state.dragging = false;
        state.moved = false;
        io.disconnect();
        ro.disconnect();
        geo.dispose();
        textures.forEach((t) => t.dispose());
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // srcs / state are stable refs from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} aria-hidden className="h-full w-full" />
      {/* invisible ruler: the real pixel width of --pw */}
      <div
        ref={measureRef}
        aria-hidden
        className="invisible absolute left-0 top-0 w-[var(--pw)]"
      />
      {/* no WebGL: static poster fallback */}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-[4/5] w-[var(--pw)]">
            <Image
              src={srcs[0]}
              alt=""
              fill
              sizes="(min-width: 768px) 16vw, 40vw"
              className="object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}