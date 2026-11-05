"use client";

import { useEffect, useRef } from "react";
import { gsap, MASK_EASE } from "@/lib/gsap";

export type LogoState = {
  x: number; // pointer x, local to the section
  y: number; // pointer y, local to the section
  active: boolean; // a row is hovered
  index: number; // which logo to show
};

export type LogoItem = { src: string; name: string; dark: boolean };

type Props = { items: LogoItem[]; state: LogoState };

const CARD = 1.35; // card aspect (w / h)
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

const VERT = /* glsl */ `
  uniform float uVel;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.x += p.y * uVel * 0.16;          // skew while the card travels
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float uHas;
  uniform float uMask;
  uniform float uLogo;
  uniform float uVel;
  uniform float uTime;
  uniform float uAspect;
  uniform float uCard;
  uniform float uDark;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  vec4 samp(vec2 u) {
    if (u.x < 0.0 || u.x > 1.0 || u.y < 0.0 || u.y > 1.0) return vec4(0.0);
    return texture2D(map, u);
  }

  void main() {
    vec3 bg = mix(vec3(0.965), vec3(0.055), uDark);

    // contain-fit the logo inside the card with padding
    vec2 size = vec2(0.74, 0.74 * uCard / uAspect);
    size *= min(1.0, 0.6 / size.y);
    vec2 luv = (vUv - 0.5) / size + 0.5;

    // liquid ripple that wakes up with pointer speed
    float w = sin(luv.y * 14.0 + uTime * 2.2) + sin(luv.x * 11.0 - uTime * 1.7);
    luv += vec2(w, w * 0.6) * 0.003 * (0.4 + abs(uVel) * 3.0);

    // noise dissolve: the logo materialises out of the card
    float n = noise(vUv * 7.0 + uTime * 0.15);
    float d = uLogo * 1.3 - 0.15;
    float show = smoothstep(n - 0.12, n + 0.02, d);

    // RGB split while moving
    float s = uVel * 0.04 + 0.0015;
    vec4 tr = samp(luv + vec2(s, 0.0));
    vec4 tg = samp(luv);
    vec4 tb = samp(luv - vec2(s, 0.0));

    vec3 col = bg;
    if (uHas > 0.5) {
      col = vec3(
        mix(bg.r, tr.r, tr.a * show),
        mix(bg.g, tg.g, tg.a * show),
        mix(bg.b, tb.b, tb.a * show)
      );
    }

    // brand-red scan line riding the dissolve
    float live = step(0.001, uLogo) * (1.0 - step(0.999, uLogo));
    float scan = (1.0 - smoothstep(0.0, 0.012, abs(vUv.y - uLogo))) * live;
    col = mix(col, vec3(0.851, 0.149, 0.149), scan);

    col += (hash(vUv * (uTime * 0.035 + 1.0) * 400.0) - 0.5) * 0.02; // grain

    // rounded-rect reveal: grows from the center, corners square up as it opens
    vec2 q = (vUv - 0.5) * vec2(uCard, 1.0);
    vec2 b = vec2(0.5 * uCard, 0.5) * uMask;
    float r = 0.1 * (1.0 - uMask);
    vec2 dd = abs(q) - b + r;
    float sd = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - r;
    if (sd > 0.0) discard;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    #include <colorspace_fragment>
  }
`;

/** Canvas fallback: a bold wordmark, used until the real logo file exists */
function wordmark(name: string, dark: boolean) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  if (g) {
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = dark ? "#f4f4f4" : "#0b0b0b";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const words = name.split(" ");
    const lines =
      words.length > 1 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : [name];
    const fs = lines.length > 1 ? 150 : 190;
    g.font = `700 ${fs}px "Helvetica Neue", Arial, sans-serif`;
    lines.forEach((l, i) =>
      g.fillText(l, 512, 256 + (i - (lines.length - 1) / 2) * fs * 1.05)
    );
  }
  return c;
}

export default function PartnersLogo({ items, state }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (disposed || !wrap || !canvas || !items.length) return;

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

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
      let W = 1;
      let H = 1;

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: null },
          uHas: { value: 0 },
          uMask: { value: 0 },
          uLogo: { value: 0 },
          uVel: { value: 0 },
          uTime: { value: 0 },
          uAspect: { value: 2 },
          uCard: { value: CARD },
          uDark: { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      });
      const geo = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);

      /* TEXTURES: real logo first, canvas wordmark if the file is missing */
      const loader = new THREE.TextureLoader();
      const loaded: ({
        tex: InstanceType<typeof THREE.Texture>;
        aspect: number;
      } | null)[] = items.map(() => null);
      let shown = state.index;

      const apply = (i: number) => {
        const t = loaded[i];
        const u = mat.uniforms;
        u.uDark.value = items[i]?.dark ? 1 : 0;
        if (!t) {
          u.uHas.value = 0;
          return;
        }
        u.map.value = t.tex;
        u.uAspect.value = t.aspect;
        u.uHas.value = 1;
      };

      const store = (i: number, tex: InstanceType<typeof THREE.Texture>, aspect: number) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        loaded[i] = { tex, aspect };
        if (i === shown) apply(i);
      };

      items.forEach((it, i) => {
        loader.load(
          it.src,
          (tex) => {
            if (disposed) {
              tex.dispose();
              return;
            }
            const img = tex.image as { width: number; height: number };
            store(i, tex, img.width && img.height ? img.width / img.height : 2);
          },
          undefined,
          () => {
            if (disposed) return;
            const tex = new THREE.CanvasTexture(wordmark(it.name, it.dark));
            store(i, tex, 2);
          }
        );
      });

      /* SIZE */
      let cw = 220;
      const resize = () => {
        W = wrap.clientWidth;
        H = wrap.clientHeight;
        if (!W || !H) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H, false);
        camera.left = -W / 2;
        camera.right = W / 2;
        camera.top = H / 2;
        camera.bottom = -H / 2;
        camera.updateProjectionMatrix();
        cw = clamp(W * 0.15, 170, 250);
        mesh.scale.set(cw, cw / CARD, 1);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      let visible = true;
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      io.observe(wrap);

      /* LOOP */
      let wasActive = false;
      let px = 0;
      let py = 0;
      let vx = 0;
      let first = true;

      const dissolve = () => {
        const u = mat.uniforms;
        gsap.killTweensOf(u.uLogo);
        if (reduced) {
          u.uLogo.value = 1;
          return;
        }
        gsap.fromTo(
          u.uLogo,
          { value: 0 },
          { value: 1, duration: 1.1, ease: "power2.inOut", delay: 0.12 }
        );
      };

      const render = (t: number, delta: number) => {
        if (!visible) return;
        const dt = clamp(delta / 1000, 0.001, 0.05);
        const u = mat.uniforms;

        if (state.active !== wasActive) {
          wasActive = state.active;
          gsap.killTweensOf(u.uMask);
          gsap.to(u.uMask, {
            value: state.active ? 1 : 0,
            duration: reduced ? 0 : state.active ? 1.0 : 0.5,
            ease: state.active ? MASK_EASE : "expo.inOut",
          });
          if (state.active) dissolve();
        }

        if (state.index !== shown) {
          shown = state.index;
          apply(shown);
          if (state.active) dissolve();
        }

        const tx = W * 0.35 + (state.x - W / 2) * 0.06;
        const ty = H / 2 - state.y;
        if (first && state.active) {
          px = tx;
          py = ty;
          first = false;
        }
        const k = reduced ? 1 : 1 - Math.exp(-dt * 7);
        const nx = px + (tx - px) * k;
        const ny = py + (ty - py) * k;
        vx += (((nx - px) + (ny - py) * 0.4) / dt - vx) * Math.min(1, dt * 10);
        px = nx;
        py = ny;

        mesh.position.set(px, py, 0);
        mesh.rotation.z = reduced ? 0 : clamp(-vx * 0.00016, -0.1, 0.1);
        u.uVel.value = reduced ? 0 : clamp(vx * 0.0012, -1, 1);
        u.uTime.value = t * 0.001;
        mesh.visible = u.uMask.value > 0.003;

        renderer.render(scene, camera);
      };
      gsap.ticker.add(render);

      cleanup = () => {
        gsap.ticker.remove(render);
        gsap.killTweensOf(mat.uniforms.uMask);
        gsap.killTweensOf(mat.uniforms.uLogo);
        io.disconnect();
        ro.disconnect();
        geo.dispose();
        mat.dispose();
        loaded.forEach((l) => l?.tex.dispose());
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // items / state are stable refs from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 z-20">
      <canvas ref={canvasRef} aria-hidden className="h-full w-full" />
    </div>
  );
}