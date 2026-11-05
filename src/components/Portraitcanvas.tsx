"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export type PortraitState = { reveal: number }; // 0 = hidden, 1 = fully burned in

type Props = { src: string; state: PortraitState };

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

const VERT = /* glsl */ `
  uniform vec2 uMouse;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.xy += uMouse * 0.012;            // slow parallax with the pointer
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float uHas;
  uniform float uReveal;
  uniform float uVel;
  uniform float uTime;
  uniform vec2 uRepeat;
  uniform vec2 uMouse;
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
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v / 0.875;
  }

  void main() {
    // object-fit: cover, focused a little above center (the face), plus pointer drift
    vec2 focus = vec2(0.5, 0.46);
    vec2 uv = (vUv - focus) * uRepeat + focus;
    uv += uMouse * 0.012;

    float s = uVel * 0.02;                       // RGB split while the page moves
    vec3 col = vec3(0.1);
    if (uHas > 0.5) {
      col = vec3(
        texture2D(map, uv + vec2(s, 0.0)).r,
        texture2D(map, uv).g,
        texture2D(map, uv - vec2(s, 0.0)).b
      );
    }

    // near-monochrome and contrasty: the red does the talking
    float g = pow(dot(col, vec3(0.299, 0.587, 0.114)), 1.12) * 0.92;
    col = mix(col, vec3(g), 0.92);

    // burn-in: the portrait is revealed by a noisy front that climbs from the bottom
    float n = fbm(vUv * vec2(3.0, 4.0) + vec2(0.0, uTime * 0.02));
    float d = uReveal * 1.5 - 0.2 - n * 0.6 - vUv.y * 0.6;
    if (d < 0.0) discard;
    float burning = (1.0 - smoothstep(0.0, 0.09, d)) * step(0.001, uReveal) * (1.0 - step(0.999, uReveal));
    col = mix(col, vec3(1.0, 0.3, 0.15), burning);

    // feather the frame into the black page (strongest on the left, behind the text)
    float m = smoothstep(0.0, 0.42, vUv.x) * smoothstep(1.0, 0.82, vUv.x)
            * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
    col *= m;

    col += (hash(vUv * (uTime * 0.035 + 1.0) * 500.0) - 0.5) * 0.035;  // grain
    col *= 0.975 + 0.025 * sin(vUv.y * 900.0);                          // faint scanlines

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    #include <colorspace_fragment>
  }
`;

export default function PortraitCanvas({ src, state }: Props) {
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
      let texAspect = 0.75;

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: null },
          uHas: { value: 0 },
          uReveal: { value: 0 },
          uVel: { value: 0 },
          uTime: { value: 0 },
          uRepeat: { value: new THREE.Vector2(1, 1) },
          uMouse: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      });
      const geo = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);

      const fit = () => {
        const wa = W / H;
        mat.uniforms.uRepeat.value.set(
          texAspect > wa ? wa / texAspect : 1,
          texAspect > wa ? 1 : texAspect / wa
        );
      };

      const loader = new THREE.TextureLoader();
      let tex: InstanceType<typeof THREE.Texture> | null = null;
      loader.load(src, (t) => {
        if (disposed) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const img = t.image as { width: number; height: number };
        texAspect = img.width && img.height ? img.width / img.height : 0.75;
        tex = t;
        mat.uniforms.map.value = t;
        mat.uniforms.uHas.value = 1;
        fit();
      });

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
        mesh.scale.set(W, H, 1);
        fit();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      let visible = true;
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      io.observe(wrap);

      /* pointer drift (desktop, motion allowed) */
      const canLook = window.matchMedia("(pointer: fine)").matches && !reduced;
      const target = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        target.x = (e.clientX / window.innerWidth) * 2 - 1;
        target.y = -((e.clientY / window.innerHeight) * 2 - 1);
      };
      if (canLook) window.addEventListener("pointermove", onMove, { passive: true });

      let lastY = window.scrollY;
      let vel = 0;
      let mx = 0;
      let my = 0;

      const render = (t: number, delta: number) => {
        if (!visible) return;
        const dt = clamp(delta / 1000, 0.001, 0.05);
        const u = mat.uniforms;

        const sy = window.scrollY;
        vel += (((sy - lastY) / dt) - vel) * Math.min(1, dt * 8);
        lastY = sy;

        mx += (target.x - mx) * (1 - Math.exp(-dt * 4));
        my += (target.y - my) * (1 - Math.exp(-dt * 4));

        u.uReveal.value = state.reveal;
        u.uVel.value = reduced ? 0 : clamp(vel * 0.0006, -1, 1);
        u.uTime.value = t * 0.001;
        u.uMouse.value.set(mx, my);
        mesh.visible = state.reveal > 0.002;

        renderer.render(scene, camera);
      };
      gsap.ticker.add(render);

      cleanup = () => {
        gsap.ticker.remove(render);
        window.removeEventListener("pointermove", onMove);
        io.disconnect();
        ro.disconnect();
        geo.dispose();
        mat.dispose();
        tex?.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // src / state are stable refs from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} aria-hidden className="h-full w-full" />
    </div>
  );
}