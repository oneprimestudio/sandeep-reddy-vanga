"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";

export type RememberState = {
    p: number; // scroll progress 0..1 (written by the section)
    enter: number; // 0..1: the window opens (entrance)
    flash: number; // 0..1: camera flash
    shake: number; // 0..1: camera shake
    push: number; // 0..1: slow push-in after the slam
    still: boolean; // reduced motion: sharp portrait, stays in its slot
    slot: HTMLElement | null; // the inline placeholder inside the headline
};

type Props = {
    src: string;
    state: RememberState;
    /** face centre, % of the image from its top-left */
    focus?: { x: number; y: number };
    onFail?: () => void;
};

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHas;
  uniform vec4 uCrop;   // xy = visible span, zw = centre (image uv)
  uniform float uQ;     // developed: 0 = memory, 1 = sharp
  uniform float uEnter;
  uniform float uFlash;
  uniform float uSplit;
  uniform float uPush;
  uniform vec2 uSize;   // plane size in px
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    // entrance: a window opens from the centre
    vec2 a = abs(vUv - 0.5) * 2.0;
    if (max(a.x, a.y) > 1.0 - (1.0 - uEnter) * 0.96) discard;

    float settle = (1.0 + 0.28 * (1.0 - uEnter)) * (1.0 + 0.06 * uPush);

    // developing: pixelated below the scan line, sharp above it
    float line = 1.0 - uQ;
    float cells = mix(10.0, 520.0, uQ * uQ);
    vec2 g = vec2(cells, cells * uSize.y / uSize.x); // square blocks on screen
    vec2 m = (floor(vUv * g) + 0.5) / g;
    float sharp = smoothstep(line - 0.002, line + 0.002, vUv.y);
    vec2 uvs = mix(m, vUv, sharp);

    vec2 uv = (uvs - 0.5) * uCrop.xy / settle + uCrop.zw;
    float s = uSplit * 0.012; // RGB split while scrolling
    vec3 col = vec3(0.88);
    if (uHas > 0.5) {
      col = vec3(
        texture2D(uTex, uv + vec2(s, 0.0)).r,
        texture2D(uTex, uv).g,
        texture2D(uTex, uv - vec2(s, 0.0)).b
      );
    }

    // memory: grey until it is developed
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(l), col, mix(0.15, 1.0, smoothstep(0.0, 0.9, uQ)));

    // the red scan line
    float t = 1.5 / uSize.y;
    float scan = (1.0 - smoothstep(0.0, t, abs(vUv.y - line)))
      * (1.0 - smoothstep(0.9, 1.0, uQ)) * step(0.001, uQ);
    col = mix(col, vec3(0.85, 0.15, 0.15), scan);

    // film grain, then the flash
    col += (hash(gl_FragCoord.xy) - 0.5) * 0.04 * (1.0 - uQ * 0.5);
    col = mix(col, vec3(1.0), uFlash);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function RememberImage({ src, state, focus = { x: 50, y: 36 }, onFail }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const failRef = useRef(onFail);
    const focusRef = useRef(focus);

    useEffect(() => {
        failRef.current = onFail;
        focusRef.current = focus;
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const host = canvas.parentElement as HTMLElement; // the stage

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
                powerPreference: "high-performance",
            });
        } catch {
            failRef.current?.();
            return;
        }
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10); // 1 unit = 1 CSS px
        camera.position.z = 5;

        const geo = new THREE.PlaneGeometry(1, 1);
        const u = {
            uTex: { value: null as THREE.Texture | null },
            uHas: { value: 0 },
            uCrop: { value: new THREE.Vector4(1, 1, 0.5, 0.5) },
            uQ: { value: 0 },
            uEnter: { value: 0 },
            uFlash: { value: 0 },
            uSplit: { value: 0 },
            uPush: { value: 0 },
            uSize: { value: new THREE.Vector2(100, 125) },
        };
        const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        scene.add(mesh);

        let aspect = 0.75;
        let tex: THREE.Texture | null = null;
        let disposed = false;
        new THREE.TextureLoader().load(src, (t) => {
            if (disposed) {
                t.dispose();
                return;
            }
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
            const img = t.image as { width: number; height: number };
            aspect = img.width / img.height;
            tex = t;
            u.uTex.value = t;
            u.uHas.value = 1;
        });

        const resize = () => {
            const w = host.clientWidth;
            const h = host.clientHeight;
            if (!w || !h) return;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(w, h, false);
            camera.left = -w / 2;
            camera.right = w / 2;
            camera.top = h / 2;
            camera.bottom = -h / 2;
            camera.updateProjectionMatrix();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(host);

        let visible = true;
        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
        });
        io.observe(host);

        let lastP = state.p;
        let split = 0;

        const tick = (_t: number, delta: number) => {
            if (!visible) return;
            const dt = clamp(delta / 1000, 0.001, 0.05);

            const cr = canvas.getBoundingClientRect();
            const slot = state.slot;
            const sr = slot ? slot.getBoundingClientRect() : null;

            const p = state.still ? 0 : state.p;
            const e = smooth(clamp(p / 0.5, 0, 1)); // slot -> full frame
            const q = state.still ? 1 : clamp(p / 0.55, 0, 1); // memory -> developed

            // the plane glides from the slot rect to the whole stage
            const sw = sr ? sr.width : cr.width * 0.15;
            const sh = sr ? sr.height : sw * 1.25;
            const sx = sr ? sr.left + sr.width / 2 - (cr.left + cr.width / 2) : 0;
            const sy = sr
                ? sr.top + sr.height / 2 - (cr.top + cr.height / 2)
                : 0;
            const k = 1 + state.shake * 0.03; // overscale while shaking, so no edge shows
            const w = lerp(sw, cr.width, e) * k;
            const h = lerp(sh, cr.height, e) * k;
            const x = lerp(sx, 0, e) + (Math.random() - 0.5) * 2 * state.shake * 14;
            const y = lerp(sy, 0, e) + (Math.random() - 0.5) * 2 * state.shake * 14;

            // "cover" crop, centred on the face
            const pa = w / h;
            const rx = aspect > pa ? pa / aspect : 1;
            const ry = aspect > pa ? 1 : aspect / pa;
            const f = focusRef.current;
            u.uCrop.value.set(
                rx,
                ry,
                clamp(f.x / 100, rx / 2, 1 - rx / 2),
                clamp(1 - f.y / 100, ry / 2, 1 - ry / 2)
            );

            // RGB split follows the scroll speed
            const dp = (p - lastP) / dt;
            lastP = p;
            split += (clamp(Math.abs(dp) * 0.5, 0, 1.4) - split) * (1 - Math.exp(-dt * 10));

            u.uQ.value = q;
            u.uEnter.value = state.still ? 1 : state.enter;
            u.uFlash.value = state.flash;
            u.uSplit.value = split;
            u.uPush.value = state.push;
            u.uSize.value.set(w, h);

            mesh.visible = !!sr || e > 0;
            mesh.scale.set(w, h, 1);
            mesh.position.set(x, y, 0);

            renderer.render(scene, camera);
        };
        gsap.ticker.add(tick);

        return () => {
            disposed = true;
            gsap.ticker.remove(tick);
            ro.disconnect();
            io.disconnect();
            geo.dispose();
            mat.dispose();
            tex?.dispose();
            renderer.dispose(); // no forceContextLoss: React StrictMode re-runs this effect on the same canvas
        };
        // state is a stable object owned by the parent
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 z-0 h-full w-full" />;
}