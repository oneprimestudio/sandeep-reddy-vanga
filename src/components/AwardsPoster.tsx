"use client";

import { useEffect, useRef } from "react";
import { gsap, MASK_EASE } from "@/lib/gsap";

export type PosterState = {
  x: number; // pointer x, local to the section
  y: number; // pointer y, local to the section
  active: boolean; // a row is hovered
  index: number; // which src to show
};

type Props = { srcs: string[]; state: PosterState };

const ASPECT = 5 / 7;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

const VERT = /* glsl */ `
  uniform float uVel;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.x += p.y * uVel * 0.18;          // skew while the poster travels
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float uHas;
  uniform float uMask;
  uniform float uZoom;
  uniform float uVel;
  uniform float uTime;
  uniform vec2 uRepeat;
  varying vec2 vUv;
  void main() {
    vec2 uv = (vUv - 0.5) * uRepeat / uZoom + 0.5;   // object-fit: cover
    float s = uVel * 0.03;                            // RGB split while moving
    vec3 col = vec3(0.12);
    if (uHas > 0.5) {
      col = vec3(
        texture2D(map, uv + vec2(s, 0.0)).r,
        texture2D(map, uv).g,
        texture2D(map, uv - vec2(s, 0.0)).b
      );
    }
    // fine film grain + soft vignette, same language as the orbit
    float grain = fract(sin(dot(vUv * (uTime * 0.035 + 1.0), vec2(127.1, 311.7))) * 43758.5453);
    float vig = 1.0 - smoothstep(0.2, 0.95, length((vUv - 0.5) * vec2(0.82, 0.68)));
    col *= 0.93 + vig * 0.07;
    col += (grain - 0.5) * 0.02;

    // rounded-rect reveal: grows from the center, corners square up as it opens
    vec2 q = (vUv - 0.5) * vec2(1.0, 1.4);
    vec2 b = vec2(0.5, 0.7) * uMask;
    float r = 0.16 * (1.0 - uMask);
    vec2 dd = abs(q) - b + r;
    float sd = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - r;
    if (sd > 0.0) discard;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    #include <colorspace_fragment>
  }
`;

export default function AwardsPoster({ srcs, state }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // touch / coarse pointers have no hover: skip the whole scene
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (disposed || !wrap || !canvas || !srcs.length) return;

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

      // Orthographic camera in CSS pixels: 1 unit = 1px, origin at the center
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
      let W = 1;
      let H = 1;
      let pw = 200;

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: null },
          uHas: { value: 0 },
          uMask: { value: 0 },
          uZoom: { value: 1 },
          uVel: { value: 0 },
          uTime: { value: 0 },
          uRepeat: { value: new THREE.Vector2(1, 1) },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      });
      const geo = new THREE.PlaneGeometry(1, 1 / ASPECT, 1, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);

      /* TEXTURES */
      const loader = new THREE.TextureLoader();
      const loaded: ({
        tex: InstanceType<typeof THREE.Texture>;
        rep: [number, number];
      } | null)[] = srcs.map(() => null);

      const apply = (i: number) => {
        const t = loaded[i];
        const u = mat.uniforms;
        if (!t) {
          u.uHas.value = 0;
          return;
        }
        u.map.value = t.tex;
        u.uRepeat.value.set(t.rep[0], t.rep[1]);
        u.uHas.value = 1;
      };

      srcs.forEach((src, i) => {
        loader.load(src, (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          const img = tex.image as { width: number; height: number };
          const ia = img.width / img.height;
          loaded[i] = {
            tex,
            rep: [ia > ASPECT ? ASPECT / ia : 1, ia > ASPECT ? 1 : ia / ASPECT],
          };
          if (i === shownIdx) apply(i);
        });
      });

      /* SIZE */
      const resize = () => {
        W = wrap.clientWidth;
        H = wrap.clientHeight;
        if (!W || !H) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(W, H, false);
        camera.left = -W / 2;
        camera.right = W / 2;
        camera.top = H / 2;
        camera.bottom = -H / 2;
        camera.updateProjectionMatrix();
        pw = clamp(W * 0.15, 150, 250);
        mesh.scale.set(pw, pw, 1);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      let visible = true;
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      io.observe(wrap);

      /* STATE */
      let shownIdx = state.index;
      let wasActive = false;
      let px = 0;
      let py = 0;
      let vx = 0;
      let first = true;

      const render = (t: number, delta: number) => {
        if (!visible) return;
        const dt = clamp(delta / 1000, 0.001, 0.05);
        const u = mat.uniforms;

        // open / close the mask when a row is entered / left
        if (state.active !== wasActive) {
          wasActive = state.active;
          gsap.killTweensOf(u.uMask);
          gsap.to(u.uMask, {
            value: state.active ? 1 : 0,
            duration: reduced ? 0 : state.active ? 1.1 : 0.55,
            ease: state.active ? MASK_EASE : "expo.inOut",
          });
        }

        // If inactive and mask has faded out, skip expensive render pass completely during scroll
        if (!state.active && u.uMask.value <= 0.002) {
          if (mesh.visible) {
            mesh.visible = false;
            renderer.clear();
          }
          return;
        }

        // swap the poster when the hovered row changes
        if (state.index !== shownIdx) {
          shownIdx = state.index;
          apply(shownIdx);
          if (!reduced) {
            gsap.killTweensOf(u.uZoom);
            gsap.fromTo(u.uZoom, { value: 1.35 }, { value: 1, duration: 0.9, ease: "expo.out" });
          }
        }

        // Rests in the right-hand column, follows the row height, drifts a touch with x
        const tx = W * 0.34 + (state.x - W / 2) * 0.08;
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
        mesh.rotation.z = reduced ? 0 : clamp(-vx * 0.00018, -0.12, 0.12);
        u.uVel.value = reduced ? 0 : clamp(vx * 0.0012, -1, 1);
        u.uTime.value = t * 0.001;
        mesh.visible = u.uMask.value > 0.003;

        renderer.render(scene, camera);
      };
      gsap.ticker.add(render);

      cleanup = () => {
        gsap.ticker.remove(render);
        gsap.killTweensOf(mat.uniforms.uMask);
        gsap.killTweensOf(mat.uniforms.uZoom);
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
    // srcs / state are stable refs from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 z-20">
      <canvas ref={canvasRef} aria-hidden className="h-full w-full" />
    </div>
  );
}