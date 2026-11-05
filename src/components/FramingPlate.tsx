"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { gsap } from "@/lib/gsap";
import { CHAPTERS, GLASS_W as GW, GLASS_H as GH, type Guide } from "../../data/framing";

export type PlateState = { p: number }; // scroll progress 0..1 (written by the section)

const N = CHAPTERS.length;
const BZ = 0.09; // bezel width
const D = 0.1; // bezel depth
const GZ = D / 2 - 0.012; // glass plane z
const LZ = GZ + 0.003; // frame lines z
const PHI = 1.6180339887;
const SPIRAL_B = Math.log(PHI) / (Math.PI / 2);
const RED = "#d92626";
const DIM = 0.3; // how dark the matte outside the frame lines is

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

/* the selection rectangle of every chapter, in glass-local units */
const RECTS = CHAPTERS.map((c) => {
  const w = c.fit * GW;
  const h = w / c.ratio;
  return {
    w,
    h,
    x: clamp((c.cx - 0.5) * GW, -GW / 2 + w / 2, GW / 2 - w / 2),
    y: clamp((c.cy - 0.5) * GH, -GH / 2 + h / 2, GH / 2 - h / 2),
  };
});

/* golden spiral: landscape golden rectangle (square on the left), eye of the spiral at (EX, EY) */
const EX = 1.1708;
const EY = 0.7236;
const SP_R0 = Math.hypot(EX, 1 - EY);
const SP_TH0 = Math.atan2(1 - EY, -EX);
const SP_TURN = 2.25 * Math.PI * 2;
const SP_STEPS = 280;
const GOLD_DIV = [
  [1, 0, 1, 1],
  [1, 0.618, PHI, 0.618],
  [1.236, 0.618, 1.236, 1],
  [1, 0.764, 1.236, 0.764],
];

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLASS_FRAG = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uMix;
  uniform float uHasA;
  uniform float uHasB;
  uniform vec4 uRepA;
  uniform vec4 uRepB;
  uniform vec4 uRect;
  uniform float uDim;
  uniform vec2 uTilt;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec3 a = vec3(0.88);
    vec3 b = vec3(0.88);
    if (uHasA > 0.5) a = texture2D(uA, vUv * uRepA.xy + uRepA.zw).rgb;
    if (uHasB > 0.5) b = texture2D(uB, vUv * uRepB.xy + uRepB.zw).rgb;
    vec3 col = mix(a, b, uMix);

    // outside the frame lines: matte
    float e = min(min(vUv.x - uRect.x, uRect.z - vUv.x), min(vUv.y - uRect.y, uRect.w - vUv.y));
    col *= mix(uDim, 1.0, smoothstep(-0.0012, 0.0012, e));

    // ground glass: grain, inner edge shadow, sheen
    col += (hash(gl_FragCoord.xy) - 0.5) * 0.03;
    float ed = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    col *= mix(0.8, 1.0, smoothstep(0.0, 0.04, ed));
    float s = 1.0 - smoothstep(0.0, 0.2, abs(vUv.x * 0.7 + vUv.y * 0.5 - (0.55 + uTilt.x * 0.6)));
    col += s * 0.04;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

type LineD = { obj: THREE.Line; attr: THREE.BufferAttribute; mat: THREE.LineBasicMaterial };
type Wr = { v: (x: number, y: number) => void; end: () => void };

const writer = (d: LineD): Wr => {
  let i = 0;
  return {
    v: (x, y) => {
      d.attr.setXYZ(i++, x, y, LZ);
    },
    end: () => {
      d.obj.geometry.setDrawRange(0, i);
      d.attr.needsUpdate = true;
    },
  };
};

export default function FramingPlate({ state }: { state: PlateState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T) => {
      disposables.push(o);
      return o;
    };
    let disposed = false;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = track(pmrem.fromScene(new RoomEnvironment(), 0.04));
    scene.environment = envRT.texture;

    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    const rig = new THREE.Group();
    scene.add(rig);

    const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      draw(c.getContext("2d")!);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return track(t);
    };

    /* ---------- THE OBJECT: bezel, screws, engraving, LED, dial ---------- */
    const bezelMat = track(new THREE.MeshStandardMaterial({ color: 0x161616, metalness: 0.7, roughness: 0.4 }));
    const bars: { s: [number, number, number]; p: [number, number, number] }[] = [
      { s: [GW + 2 * BZ, BZ, D], p: [0, GH / 2 + BZ / 2, 0] },
      { s: [GW + 2 * BZ, BZ, D], p: [0, -GH / 2 - BZ / 2, 0] },
      { s: [BZ, GH, D], p: [-GW / 2 - BZ / 2, 0, 0] },
      { s: [BZ, GH, D], p: [GW / 2 + BZ / 2, 0, 0] },
    ];
    bars.forEach(({ s, p }) => {
      const m = new THREE.Mesh(track(new THREE.BoxGeometry(s[0], s[1], s[2])), bezelMat);
      m.position.set(p[0], p[1], p[2]);
      rig.add(m);
    });

    const screwGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.014, 20));
    const metalMat = track(new THREE.MeshStandardMaterial({ color: 0x8c8c8c, metalness: 0.9, roughness: 0.3 }));
    [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ].forEach(([sx, sy]) => {
      const m = new THREE.Mesh(screwGeo, metalMat);
      m.rotation.x = Math.PI / 2;
      m.position.set(sx * (GW / 2 + BZ / 2), sy * (GH / 2 + BZ / 2), D / 2 + 0.004);
      rig.add(m);
    });

    // engraved ratio scale on the top bezel
    const TOP_L = GW + 2 * BZ - 0.16;
    const topTex = canvasTex(1600, 90, (g) => {
      g.fillStyle = "rgba(255,255,255,0.55)";
      const ticks = 64;
      for (let i = 0; i <= ticks; i++) {
        const x = 8 + (i * 1584) / ticks;
        g.fillRect(x - 1, 0, 2, i % 4 === 0 ? 26 : 14);
      }
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.font = "500 28px Helvetica, Arial, sans-serif";
      g.textAlign = "center";
      CHAPTERS.forEach((c, k) => g.fillText(c.ratioLabel, ((k + 0.5) / N) * 1600, 72));
    });
    const plateMat = (map: THREE.Texture) =>
      track(
        new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        })
      );
    const topPlate = new THREE.Mesh(track(new THREE.PlaneGeometry(TOP_L, (TOP_L * 90) / 1600)), plateMat(topTex));
    topPlate.position.set(0, GH / 2 + BZ / 2 - 0.004, D / 2 + 0.002);
    rig.add(topPlate);

    const BOT_L = 0.56;
    const botTex = canvasTex(900, 60, (g) => {
      g.fillStyle = "rgba(255,255,255,0.7)";
      g.font = "500 30px Helvetica, Arial, sans-serif";
      g.textBaseline = "middle";
      g.fillText("FRAME STUDY  ·  35 MM  ·  24 FPS", 6, 32);
    });
    const botPlate = new THREE.Mesh(track(new THREE.PlaneGeometry(BOT_L, (BOT_L * 60) / 900)), plateMat(botTex));
    botPlate.position.set(-GW / 2 + 0.04 + BOT_L / 2, -GH / 2 - BZ / 2, D / 2 + 0.002);
    rig.add(botPlate);

    // red pointer that slides along the scale
    const marker = new THREE.Mesh(
      track(new THREE.CircleGeometry(0.012, 3)),
      track(new THREE.MeshBasicMaterial({ color: RED }))
    );
    marker.rotation.z = -Math.PI / 2; // apex points down
    marker.position.set(0, GH / 2 + BZ - 0.014, D / 2 + 0.003);
    rig.add(marker);

    // REC LED
    const led = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.011, 16, 12)),
      track(new THREE.MeshBasicMaterial({ color: RED }))
    );
    led.position.set(GW / 2 + BZ / 2, GH / 2 - 0.1, D / 2 + 0.003);
    rig.add(led);

    // dial: the notch turns with the scroll
    const dialBase = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 0.024, 40)), metalMat);
    dialBase.rotation.x = Math.PI / 2;
    const notchG = new THREE.Group();
    const notch = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.004, 0.02, 0.003)),
      track(new THREE.MeshBasicMaterial({ color: 0xffffff }))
    );
    notch.position.set(0, 0.014, 0.0135);
    notchG.add(notch);
    const dial = new THREE.Group();
    dial.position.set(GW / 2 - 0.14, -GH / 2 - BZ / 2, D / 2 + 0.012);
    dial.add(dialBase, notchG);
    rig.add(dial);

    // soft shadow behind the object
    const shTex = canvasTex(256, 256, (g) => {
      const r = g.createRadialGradient(128, 128, 20, 128, 128, 128);
      r.addColorStop(0, "rgba(0,0,0,0.28)");
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 256, 256);
    });
    const shadow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(GW + 2 * BZ + 0.9, GH + 2 * BZ + 0.9)),
      track(new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }))
    );
    shadow.position.set(0.05, -0.1, -0.35);
    rig.add(shadow);

    /* ---------- THE GLASS: photo + matte outside the frame lines ---------- */
    const chapTex = CHAPTERS.map(() => ({
      tex: null as THREE.Texture | null,
      rep: new THREE.Vector4(1, 1, 0, 0),
    }));
    const gu = {
      uA: { value: null as THREE.Texture | null },
      uB: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uHasA: { value: 0 },
      uHasB: { value: 0 },
      uRepA: { value: new THREE.Vector4(1, 1, 0, 0) },
      uRepB: { value: new THREE.Vector4(1, 1, 0, 0) },
      uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
      uDim: { value: DIM },
      uTilt: { value: new THREE.Vector2() },
    };
    const glass = new THREE.Mesh(
      track(new THREE.PlaneGeometry(GW, GH)),
      track(new THREE.ShaderMaterial({ uniforms: gu, vertexShader: VERT, fragmentShader: GLASS_FRAG }))
    );
    glass.position.z = GZ;
    glass.renderOrder = 1;
    rig.add(glass);

    const loader = new THREE.TextureLoader();
    const bySrc = new Map<string, number[]>();
    CHAPTERS.forEach((c, i) => bySrc.set(c.src, [...(bySrc.get(c.src) ?? []), i]));
    bySrc.forEach((idxs, src) => {
      loader.load(src, (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        disposables.push(tex);
        const img = tex.image as { width: number; height: number };
        const ia = img.width / img.height;
        const ga = GW / GH;
        const rx = ia > ga ? ga / ia : 1;
        const ry = ia > ga ? 1 : ia / ga;
        idxs.forEach((i) => {
          chapTex[i].tex = tex;
          chapTex[i].rep.set(rx, ry, (1 - rx) / 2, (1 - ry) / 2);
        });
      });
    });

    /* ---------- THE FRAME LINES (dynamic geometry) ---------- */
    const mkLine = (kind: "segments" | "loop" | "line", max: number): LineD => {
      const geo = track(new THREE.BufferGeometry());
      const attr = new THREE.BufferAttribute(new Float32Array(max * 3), 3);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("position", attr);
      geo.setDrawRange(0, 0);
      // exclusion blend: the line is the inverse of whatever is under it, so it reads on white AND black
      const mat = track(
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.OneMinusDstColorFactor,
          blendDst: THREE.OneMinusSrcColorFactor,
          blendSrcAlpha: THREE.ZeroFactor, // keep the canvas alpha untouched
          blendDstAlpha: THREE.OneFactor,
        })
      );
      const obj =
        kind === "segments"
          ? new THREE.LineSegments(geo, mat)
          : kind === "loop"
            ? new THREE.LineLoop(geo, mat)
            : new THREE.Line(geo, mat);
      obj.frustumCulled = false;
      obj.renderOrder = 2;
      rig.add(obj);
      return { obj, attr, mat };
    };
    const G = {
      outline: mkLine("loop", 4),
      brackets: mkLine("segments", 16),
      thirds: mkLine("segments", 8),
      center: mkLine("segments", 8 + 2 * 128),
      close: mkLine("segments", 16),
      spiral: mkLine("line", SP_STEPS + 1),
      goldGrid: mkLine("segments", 8),
    };

    const dotGeo = track(new THREE.CircleGeometry(1, 24));
    const mkDots = (n: number) => {
      const mat = track(
        new THREE.MeshBasicMaterial({ color: RED, transparent: true, depthTest: false, depthWrite: false })
      );
      const meshes = Array.from({ length: n }, () => {
        const m = new THREE.Mesh(dotGeo, mat);
        m.renderOrder = 3;
        m.position.z = LZ + 0.002;
        m.scale.set(0.011, 0.011, 1);
        rig.add(m);
        return m;
      });
      return { mat, meshes };
    };
    const dots = { thirds: mkDots(4), center: mkDots(1), close: mkDots(1), golden: mkDots(1) };

    /* ---------- sizing, pointer, visibility ---------- */
    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const objW = GW + 2 * BZ + 0.5;
      const objH = GH + 2 * BZ + 0.35;
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.set(0, 0, Math.max(objH / (2 * t), objW / (2 * t * camera.aspect)));
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    const canMove = window.matchMedia("(pointer: fine)").matches && !reduced;
    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (canMove) window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(host);

    /* ---------- LOOP ---------- */
    let ps = state.p; // smoothed scroll progress
    let time = 0;
    const weights: Record<Guide, number> = { thirds: 0, center: 0, close: 0, golden: 0 };

    const tick = (_t: number, delta: number) => {
      if (!visible) return;
      const dt = clamp(delta / 1000, 0.001, 0.05);
      time += dt;
      ps += (state.p - ps) * (reduced ? 1 : 1 - Math.exp(-dt * 7));
      const f = clamp(ps, 0, 1) * (N - 1);
      const i0 = Math.min(N - 2, Math.floor(f));
      const t = smooth(f - i0);

      /* the frame lines glide from one selection to the next */
      const RA = RECTS[i0];
      const RB = RECTS[i0 + 1];
      const W = lerp(RA.w, RB.w, t);
      const H = lerp(RA.h, RB.h, t);
      const X = lerp(RA.x, RB.x, t);
      const Y = lerp(RA.y, RB.y, t);
      const put = (w: Wr, nx: number, ny: number) => w.v(X + (nx - 0.5) * W, Y + (ny - 0.5) * H);
      const dotAt = (m: THREE.Object3D, nx: number, ny: number) =>
        m.position.set(X + (nx - 0.5) * W, Y + (ny - 0.5) * H, LZ + 0.002);

      // glass: images crossfade, matte follows the selection
      const A = chapTex[i0];
      const Bt = chapTex[i0 + 1];
      gu.uA.value = A.tex;
      gu.uB.value = Bt.tex;
      gu.uHasA.value = A.tex ? 1 : 0;
      gu.uHasB.value = Bt.tex ? 1 : 0;
      gu.uRepA.value.copy(A.rep);
      gu.uRepB.value.copy(Bt.rep);
      gu.uMix.value = t;
      gu.uRect.value.set(
        X / GW + 0.5 - W / (2 * GW),
        Y / GH + 0.5 - H / (2 * GH),
        X / GW + 0.5 + W / (2 * GW),
        Y / GH + 0.5 + H / (2 * GH)
      );

      // which guide is lit
      CHAPTERS.forEach((c, k) => {
        weights[c.guide] = 1 - smooth(clamp((Math.abs(f - k) - 0.15) / 0.5, 0, 1));
      });
      const vis = (d: LineD, w: number, k = 0.92) => {
        d.obj.visible = w > 0.01;
        d.mat.color.setScalar(k * w);
      };
      const visDots = (d: { mat: THREE.MeshBasicMaterial; meshes: THREE.Mesh[] }, w: number) => {
        d.mat.opacity = w;
        d.meshes.forEach((m) => (m.visible = w > 0.01));
      };

      // outline + corner brackets (always on)
      {
        const w = writer(G.outline);
        put(w, 0, 0);
        put(w, 1, 0);
        put(w, 1, 1);
        put(w, 0, 1);
        w.end();
        vis(G.outline, 1, 0.5);

        const b = writer(G.brackets);
        const L = Math.min(W, H) * 0.1;
        for (const cx of [0, 1])
          for (const cy of [0, 1]) {
            const px = X + (cx - 0.5) * W;
            const py = Y + (cy - 0.5) * H;
            const dx = cx ? -L : L;
            const dy = cy ? -L : L;
            b.v(px, py);
            b.v(px + dx, py);
            b.v(px, py);
            b.v(px, py + dy);
          }
        b.end();
        vis(G.brackets, 1, 0.95);
      }

      // 01 thirds
      {
        const w = writer(G.thirds);
        for (const k of [1 / 3, 2 / 3]) {
          put(w, k, 0);
          put(w, k, 1);
          put(w, 0, k);
          put(w, 1, k);
        }
        w.end();
        vis(G.thirds, weights.thirds);
        dotAt(dots.thirds.meshes[0], 1 / 3, 1 / 3);
        dotAt(dots.thirds.meshes[1], 2 / 3, 1 / 3);
        dotAt(dots.thirds.meshes[2], 1 / 3, 2 / 3);
        dotAt(dots.thirds.meshes[3], 2 / 3, 2 / 3);
        visDots(dots.thirds, weights.thirds);
      }

      // 02 centre axis + rings
      {
        const w = writer(G.center);
        const gap = 0.05;
        put(w, 0, 0.5);
        put(w, 0.5 - gap, 0.5);
        put(w, 0.5 + gap, 0.5);
        put(w, 1, 0.5);
        put(w, 0.5, 0);
        put(w, 0.5, 0.5 - gap);
        put(w, 0.5, 0.5 + gap);
        put(w, 0.5, 1);
        const r1 = 0.34 * Math.min(W, H);
        for (const r of [r1, r1 * 0.5])
          for (let k = 0; k < 64; k++) {
            const a0 = (k / 64) * Math.PI * 2;
            const a1 = ((k + 1) / 64) * Math.PI * 2;
            w.v(X + r * Math.cos(a0), Y + r * Math.sin(a0));
            w.v(X + r * Math.cos(a1), Y + r * Math.sin(a1));
          }
        w.end();
        vis(G.center, weights.center);
        dotAt(dots.center.meshes[0], 0.5, 0.5);
        visDots(dots.center, weights.center);
      }

      // 03 close-up: safe area + eye line + ticks
      {
        const w = writer(G.close);
        const s = 0.08;
        put(w, s, s);
        put(w, 1 - s, s);
        put(w, 1 - s, s);
        put(w, 1 - s, 1 - s);
        put(w, 1 - s, 1 - s);
        put(w, s, 1 - s);
        put(w, s, 1 - s);
        put(w, s, s);
        put(w, 0, 0.5);
        put(w, 0.46, 0.5);
        put(w, 0.54, 0.5);
        put(w, 1, 0.5);
        for (const nx of [0.25, 0.75]) {
          put(w, nx, 0.44);
          put(w, nx, 0.56);
        }
        w.end();
        vis(G.close, weights.close);
        dotAt(dots.close.meshes[0], 0.5, 0.5);
        visDots(dots.close, weights.close);
      }

      // 04 golden spiral (+ golden rectangle dividers)
      {
        const w = writer(G.spiral);
        for (let k = 0; k <= SP_STEPS; k++) {
          const th = SP_TH0 + (k / SP_STEPS) * SP_TURN;
          const r = SP_R0 * Math.exp(-SPIRAL_B * (th - SP_TH0));
          const lx = EX + r * Math.cos(th);
          const ly = EY + r * Math.sin(th);
          put(w, ly, lx / PHI); // landscape -> portrait
        }
        w.end();
        vis(G.spiral, weights.golden);

        const g = writer(G.goldGrid);
        GOLD_DIV.forEach(([x0, y0, x1, y1]) => {
          put(g, y0, x0 / PHI);
          put(g, y1, x1 / PHI);
        });
        g.end();
        vis(G.goldGrid, weights.golden, 0.5);
        dotAt(dots.golden.meshes[0], 0.7236, 0.7236);
        visDots(dots.golden, weights.golden);
      }

      /* the object itself: tilt with the pointer, turn a little per chapter, float */
      const ty = pointer.x * 0.16 + (f - (N - 1) / 2) * 0.045;
      const tx = -pointer.y * 0.09;
      const k = Math.min(1, dt * 4);
      rig.rotation.y += (ty - rig.rotation.y) * k;
      rig.rotation.x += (tx - rig.rotation.x) * k;
      rig.position.y = reduced ? 0 : Math.sin(time * 0.8) * 0.012;
      gu.uTilt.value.set(rig.rotation.y, rig.rotation.x);

      marker.position.x = -TOP_L / 2 + ((f + 0.5) * TOP_L) / N;
      notchG.rotation.z = -f * (Math.PI / 2);
      led.visible = reduced || Math.floor(time * 1.4) % 2 === 0;

      renderer.render(scene, camera);
    };
    gsap.ticker.add(tick);

    return () => {
      disposed = true;
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      pmrem.dispose();
      renderer.dispose(); // no forceContextLoss: React StrictMode re-runs this effect on the same canvas
    };
    // state is a stable object owned by the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={hostRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CHAPTERS[0].src} alt="" className="aspect-[4/5] h-[70%] object-cover" />
        </div>
      )}
    </div>
  );
}