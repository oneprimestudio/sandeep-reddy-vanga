"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Three shader looks:
 * - water: original reactive water ripple / refraction.
 * - liquid-glass: layered organic flow, caustics and glass highlights.
 * - prism: spectral edge separation and iridescent light ribbons.
 * - noise-displacement: organic multi-octave noise warping with a tactile, cinematic surface.
 */
type Props = {
  src: string;
  className?: string;
  strength?: number; // refraction inside the image
  edge?: number;     // how much the borders wobble (0 - 2)
  variant?: "water" | "liquid-glass" | "prism" | "noise-displacement";
};

const PAD_PCT = 8; // canvas extends 8% past the image on every side
const PAD = PAD_PCT / 100 / (1 + (2 * PAD_PCT) / 100); // same padding in canvas uv

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* water height field: r = height, g = velocity */
const SIM_FRAG = /* glsl */ `
  uniform sampler2D uPrev;
  uniform vec2 uTexel;
  uniform vec2 uMouse;
  uniform float uForce;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 s = texture2D(uPrev, vUv).xy;
    float l = texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).x;
    float d = texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).x;
    float u = texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).x;

    float h = s.x;
    float v = s.y;
    v += ((l + r + d + u) * 0.25 - h) * 1.9;
    v *= 0.985;
    h += v;
    h *= 0.9985;

    // mouse impulse (aspect corrected so ripples are round)
    vec2 q = (vUv - uMouse) * vec2(uAspect, 1.0);
    h += uForce * exp(-dot(q, q) * 900.0);

    gl_FragColor = vec4(h, v, 0.0, 1.0);
  }
`;

const PREMIUM_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uSim;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform float uTime;
  uniform float uStrength;
  uniform float uEdge;
  uniform float uHover;
  uniform float uPad;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    vec2 ratio = vec2(
      min((uRes.x / uRes.y) / (uImg.x / uImg.y), 1.0),
      min((uRes.y / uRes.x) / (uImg.y / uImg.x), 1.0)
    );
    return uv * ratio + (1.0 - ratio) * 0.5;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

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

  void main() {
    vec2 p = (vUv - uPad) / (1.0 - 2.0 * uPad);
    float t = uTime * 0.001;

    // Simulated water surface: mouse-generated ripples.
    float h = texture2D(uSim, vUv).x;
    float gx = texture2D(uSim, vUv + vec2(1.0 / 256.0, 0.0)).x
             - texture2D(uSim, vUv - vec2(1.0 / 256.0, 0.0)).x;
    float gy = texture2D(uSim, vUv + vec2(0.0, 1.0 / 256.0)).x
             - texture2D(uSim, vUv - vec2(0.0, 1.0 / 256.0)).x;

    // Layered, slow-moving organic waves keep the image alive even at rest.
    vec2 drift = p * vec2(3.4, 2.8);
    float n1 = noise(drift + vec2(t * 0.16, -t * 0.11));
    float n2 = noise(drift * 2.1 + vec2(-t * 0.12, t * 0.18));
    float waveA = sin(p.x * 7.0 + sin(p.y * 4.0 + t * 0.65) + t * 0.42);
    float waveB = cos(p.y * 8.0 - sin(p.x * 3.0 - t * 0.48) + t * 0.36);
    vec2 organic = vec2(
      waveA + (n1 - 0.5) * 1.5,
      waveB + (n2 - 0.5) * 1.5
    );

    float energy = 0.32 + uHover * 0.9;
    vec2 ambient = organic * 0.0018 * energy;
    vec2 ripple = vec2(gx, gy) * uStrength;
    vec2 disp = ripple + ambient;

    // A subtle breathing distortion and stronger liquid movement on hover.
    float breathe = sin(t * 0.8 + p.y * 5.0) * 0.0012;
    disp += vec2(breathe, -breathe) * (0.4 + uHover);

    vec2 q = p + disp;

    // Soft, irregular liquid silhouette.
    float edgeDist = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float wobble =
      sin(p.x * 19.0 + t * 1.1) +
      sin(p.y * 16.0 - t * 0.9) +
      sin((p.x + p.y) * 12.0 + t * 0.72) +
      sin((p.x - p.y) * 9.0 - t * 0.55);
    edgeDist += wobble * 0.0024 * uEdge * (0.45 + uHover);
    edgeDist += h * 0.2 * uEdge;
    float alpha = smoothstep(0.0, 0.009, edgeDist);

    vec2 uv = coverUv(clamp(q, 0.0, 1.0));

    // Chromatic refraction: restrained at rest, more expressive on hover.
    float chroma = 0.55 + uHover * 0.9;
    vec2 split = disp * chroma * 1.8;
    float r = texture2D(uMap, clamp(uv + split, 0.001, 0.999)).r;
    float g = texture2D(uMap, clamp(uv + disp * 0.35, 0.001, 0.999)).g;
    float b = texture2D(uMap, clamp(uv - split * 0.65, 0.001, 0.999)).b;
    vec3 col = vec3(r, g, b);

    // Moving light caustics and a glass-like specular highlight.
    vec2 lightUv = p * vec2(2.8, 3.6);
    float caustic = noise(lightUv + vec2(t * 0.24, -t * 0.18));
    caustic *= noise(lightUv * 1.7 + vec2(-t * 0.16, t * 0.22));
    vec3 normal = normalize(vec3(-gx * 12.0 - organic.x * 0.12,
                                 -gy * 12.0 - organic.y * 0.12, 1.0));
    vec3 lightDir = normalize(vec3(-0.45, 0.55, 0.72));
    float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
    spec *= 0.25 + min(length(vec2(gx, gy)) * 34.0, 1.0);
    col += vec3(0.78, 0.9, 1.0) * spec * (0.22 + uHover * 0.25);
    col += vec3(0.16, 0.28, 0.36) * caustic * 0.035 * (0.35 + uHover);

    // A faint moving rim catches the light along the liquid boundary.
    float rim = 1.0 - smoothstep(0.0, 0.035, edgeDist);
    float rimLight = 0.5 + 0.5 * sin(t * 1.4 + p.x * 8.0 + p.y * 5.0);
    col += vec3(0.55, 0.72, 0.82) * rim * rimLight * 0.045 * uEdge;

    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * alpha, alpha);
  }
`;


const ORIGINAL_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uSim;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform float uTime;
  uniform float uStrength;
  uniform float uEdge;
  uniform float uHover;
  uniform float uPad;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    vec2 ratio = vec2(
      min((uRes.x / uRes.y) / (uImg.x / uImg.y), 1.0),
      min((uRes.y / uRes.x) / (uImg.y / uImg.x), 1.0)
    );
    return uv * ratio + (1.0 - ratio) * 0.5;
  }

  void main() {
    // canvas uv -> image uv (0..1 = the visible image rect)
    vec2 p = (vUv - uPad) / (1.0 - 2.0 * uPad);

    float e = 1.0 / 256.0;
    float h  = texture2D(uSim, vUv).x;
    float gx = texture2D(uSim, vUv + vec2(e, 0.0)).x - texture2D(uSim, vUv - vec2(e, 0.0)).x;
    float gy = texture2D(uSim, vUv + vec2(0.0, e)).x - texture2D(uSim, vUv - vec2(0.0, e)).x;

    // refraction from the water surface
    vec2 disp = vec2(gx, gy) * uStrength;

    // slow idle liquid flow, stronger while hovered
    vec2 flow = vec2(
      sin(p.y * 6.0 + uTime * 0.8 + sin(p.x * 4.0 + uTime * 0.6)),
      cos(p.x * 6.0 + uTime * 0.7 + sin(p.y * 5.0 + uTime * 0.5))
    ) * 0.006 * (0.35 + uHover);

    vec2 q = p + disp + flow;

    // LIQUID EDGE: distance to the border, bent by waves + ripple height
    float edgeDist = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float wob =
      sin(p.x * 18.0 + uTime * 1.3) + sin(p.y * 15.0 - uTime * 1.1) +
      sin((p.x + p.y) * 11.0 + uTime * 0.9);
    edgeDist += wob * 0.0035 * uEdge * (0.5 + uHover);
    edgeDist += h * 0.22 * uEdge;
    float alpha = smoothstep(0.0, 0.008, edgeDist);

    vec2 uv = coverUv(clamp(q, 0.0, 1.0));

    // RGB split along the refraction
    float r = texture2D(uMap, uv + disp * 1.4).r;
    float g = texture2D(uMap, uv + disp).g;
    float b = texture2D(uMap, uv + disp * 0.6).b;
    vec3 col = vec3(r, g, b);

    // soft specular glint on the ripple crests
    vec3 n = normalize(vec3(-gx * 9.0, -gy * 9.0, 1.0));
    float spec = pow(max(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0), 40.0);
    spec *= min(length(vec2(gx, gy)) * 28.0, 1.0);
    col += spec * 0.35;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * alpha, alpha);
  }
`;

const PRISM_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uSim;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform float uTime;
  uniform float uStrength;
  uniform float uEdge;
  uniform float uHover;
  uniform float uPad;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    vec2 ratio = vec2(
      min((uRes.x / uRes.y) / (uImg.x / uImg.y), 1.0),
      min((uRes.y / uRes.x) / (uImg.y / uImg.x), 1.0)
    );
    return uv * ratio + (1.0 - ratio) * 0.5;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

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

  void main() {
    vec2 p = (vUv - uPad) / (1.0 - 2.0 * uPad);
    float t = uTime * 0.001;

    float h = texture2D(uSim, vUv).x;
    float gx = texture2D(uSim, vUv + vec2(1.0 / 256.0, 0.0)).x
             - texture2D(uSim, vUv - vec2(1.0 / 256.0, 0.0)).x;
    float gy = texture2D(uSim, vUv + vec2(0.0, 1.0 / 256.0)).x
             - texture2D(uSim, vUv - vec2(0.0, 1.0 / 256.0)).x;

    // Long, flowing bands create a faceted prism-like distortion.
    float bandA = sin(p.x * 8.0 + sin(p.y * 5.0 - t * 0.7) + t * 0.42);
    float bandB = cos(p.y * 10.0 - sin(p.x * 4.0 + t * 0.55) - t * 0.3);
    float grain = noise(p * 5.0 + vec2(t * 0.12, -t * 0.1)) - 0.5;

    vec2 spectralFlow = vec2(
      bandA + grain * 1.2,
      bandB - grain * 1.2
    ) * (0.0015 + uHover * 0.0025);

    vec2 ripple = vec2(gx, gy) * uStrength * 1.15;
    vec2 disp = ripple + spectralFlow;
    vec2 q = p + disp;

    float edgeDist = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float edgeWave = sin(p.x * 17.0 + t) + cos(p.y * 14.0 - t * 0.8);
    edgeDist += edgeWave * 0.0025 * uEdge * (0.4 + uHover);
    edgeDist += h * 0.18 * uEdge;
    float alpha = smoothstep(0.0, 0.009, edgeDist);

    vec2 uv = coverUv(clamp(q, 0.0, 1.0));

    // Spectral separation is strongest at the edges of the refraction.
    float spectral = (0.0015 + length(disp) * 2.2) * (0.55 + uHover);
    vec2 axis = normalize(disp + vec2(0.0001, 0.0001));
    float r = texture2D(uMap, clamp(uv + axis * spectral * 1.5, 0.001, 0.999)).r;
    float g = texture2D(uMap, clamp(uv, 0.001, 0.999)).g;
    float b = texture2D(uMap, clamp(uv - axis * spectral * 1.3, 0.001, 0.999)).b;
    vec3 col = vec3(r, g, b);

    // Fine iridescent ribbons, kept subtle to protect portrait detail.
    float ribbon = sin((p.x + p.y) * 22.0 + t * 1.25 + bandA * 1.5);
    ribbon = pow(max(ribbon, 0.0), 12.0);
    float sheen = noise(p * 3.0 + vec2(-t * 0.18, t * 0.14));
    col += vec3(0.36, 0.52, 0.72) * ribbon * 0.09 * (0.25 + uHover);
    col += vec3(0.72, 0.82, 1.0) * sheen * 0.025 * (0.3 + uHover);

    vec3 normal = normalize(vec3(-gx * 11.0 - bandA * 0.1,
                                 -gy * 11.0 - bandB * 0.1, 1.0));
    vec3 lightDir = normalize(vec3(-0.5, 0.45, 0.75));
    float spec = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
    spec *= 0.2 + min(length(vec2(gx, gy)) * 30.0, 1.0);
    col += vec3(0.75, 0.88, 1.0) * spec * 0.3;

    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * alpha, alpha);
  }
`;


const NOISE_DISPLACEMENT_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uSim;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform float uTime;
  uniform float uStrength;
  uniform float uEdge;
  uniform float uHover;
  uniform float uPad;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    vec2 ratio = vec2(
      min((uRes.x / uRes.y) / (uImg.x / uImg.y), 1.0),
      min((uRes.y / uRes.x) / (uImg.y / uImg.x), 1.0)
    );
    return uv * ratio + (1.0 - ratio) * 0.5;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

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
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
    for (int i = 0; i < 4; i++) {
      value += noise(p) * amplitude;
      p = rot * p * 2.02 + 17.13;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 p = (vUv - uPad) / (1.0 - 2.0 * uPad);
    float t = uTime * 0.001;

    // Two differently-scaled noise fields create broad, non-repeating organic motion.
    vec2 flowA = p * vec2(3.2, 4.1) + vec2(t * 0.13, -t * 0.10);
    vec2 flowB = p * vec2(7.4, 6.2) + vec2(-t * 0.08, t * 0.11);
    float n1 = fbm(flowA);
    float n2 = fbm(flowB + n1 * 1.7);
    float n3 = fbm(p * 12.0 + vec2(t * 0.04, -t * 0.06));

    vec2 noiseVector = vec2(
      fbm(flowA + vec2(5.2, 1.7)) - 0.5,
      fbm(flowA + vec2(2.4, 8.3)) - 0.5
    );
    noiseVector += vec2(n2 - 0.5, n1 - 0.5) * 0.55;

    // Retain pointer-driven ripples, but let the noise field lead the motion.
    float h = texture2D(uSim, vUv).x;
    float e = 1.0 / 256.0;
    float gx = texture2D(uSim, vUv + vec2(e, 0.0)).x
             - texture2D(uSim, vUv - vec2(e, 0.0)).x;
    float gy = texture2D(uSim, vUv + vec2(0.0, e)).x
             - texture2D(uSim, vUv - vec2(0.0, e)).x;

    float energy = 0.45 + uHover * 0.95;
    vec2 noiseDisp = noiseVector * (0.0065 + uHover * 0.0065) * energy;
    vec2 rippleDisp = vec2(gx, gy) * uStrength * 0.85;
    vec2 disp = noiseDisp + rippleDisp;
    vec2 q = p + disp;

    // The edge follows the same noise field, producing an organic liquid silhouette.
    float edgeDist = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float edgeNoise = (n2 - 0.5) * 0.018 + (n3 - 0.5) * 0.006;
    edgeDist += edgeNoise * uEdge * (0.35 + uHover);
    edgeDist += h * 0.16 * uEdge;
    float alpha = smoothstep(0.0, 0.009, edgeDist);

    vec2 uv = coverUv(clamp(q, 0.0, 1.0));

    // Fine RGB displacement gives the noise field a subtle optical-lens quality.
    float chroma = (0.0008 + length(disp) * 0.75) * (0.55 + uHover * 0.8);
    vec2 chromaAxis = normalize(noiseVector + vec2(0.0001));
    float r = texture2D(uMap, clamp(uv + disp + chromaAxis * chroma, 0.001, 0.999)).r;
    float g = texture2D(uMap, clamp(uv + disp * 0.72, 0.001, 0.999)).g;
    float b = texture2D(uMap, clamp(uv + disp - chromaAxis * chroma, 0.001, 0.999)).b;
    vec3 col = vec3(r, g, b);

    // A restrained moving highlight reveals the displacement without washing out portraits.
    float ridge = smoothstep(0.48, 0.72, n2) * (1.0 - smoothstep(0.72, 0.90, n2));
    float shimmer = 0.5 + 0.5 * sin(t * 1.25 + p.x * 5.0 - p.y * 4.0);
    col += vec3(0.52, 0.66, 0.78) * ridge * shimmer * 0.075 * (0.25 + uHover);

    float rim = 1.0 - smoothstep(0.0, 0.032, edgeDist);
    col += vec3(0.55, 0.68, 0.78) * rim * 0.035 * uEdge;

    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * alpha, alpha);
  }
`;

export default function LiquidImage({
  src,
  className = "",
  strength = 0.55,
  edge = 1,
  variant = "liquid-glass",
}: Props) {
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
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
      } catch {
        return;
      }
      renderer.setClearColor(0x000000, 0);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const SIM = 256;

      /* ---- ping-pong height field ---- */
      const makeRT = () =>
        new THREE.WebGLRenderTarget(SIM, SIM, {
          type: THREE.HalfFloatType,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: false,
        });
      let rtA = makeRT();
      let rtB = makeRT();

      const cam = new THREE.Camera();
      const geo = new THREE.PlaneGeometry(2, 2);

      const simMat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: SIM_FRAG,
        uniforms: {
          uPrev: { value: rtA.texture },
          uTexel: { value: new THREE.Vector2(1 / SIM, 1 / SIM) },
          uMouse: { value: new THREE.Vector2(-1, -1) },
          uForce: { value: 0 },
          uAspect: { value: 1 },
        },
      });
      const simScene = new THREE.Scene();
      simScene.add(new THREE.Mesh(geo, simMat));

      /* ---- display ---- */
      const fragmentShader =
        variant === "water"
          ? ORIGINAL_FRAG
          : variant === "prism"
            ? PRISM_FRAG
            : variant === "noise-displacement"
              ? NOISE_DISPLACEMENT_FRAG
              : PREMIUM_FRAG;

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader,
        transparent: true,
        premultipliedAlpha: true,
        uniforms: {
          uMap: { value: null },
          uSim: { value: rtA.texture },
          uRes: { value: new THREE.Vector2(1, 1) },
          uImg: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uStrength: { value: strength },
          uEdge: { value: edge },
          uHover: { value: 0 },
          uPad: { value: PAD },
        },
      });
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geo, mat));

      new THREE.TextureLoader().load(src, (tex) => {
        if (disposed) return tex.dispose();
        tex.colorSpace = THREE.SRGBColorSpace;
        const img = tex.image as { width: number; height: number };
        mat.uniforms.uImg.value.set(img.width, img.height);
        mat.uniforms.uMap.value = tex;
      });

      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        mat.uniforms.uRes.value.set(wrap.clientWidth, wrap.clientHeight);
        simMat.uniforms.uAspect.value = w / h;
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      /* ---- pointer ---- */
      let inside = false;
      let force = 0;
      const mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5 };

      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) / r.width;
        mouse.y = 1 - (e.clientY - r.top) / r.height;
        if (!inside) {
          mouse.px = mouse.x;
          mouse.py = mouse.y;
          inside = true;
        }
      };
      const onLeave = () => (inside = false);
      wrap.addEventListener("pointermove", onMove, { passive: true });
      wrap.addEventListener("pointerleave", onLeave);

      let visible = true;
      const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
      io.observe(wrap);

      const step = (mx: number, my: number, f: number) => {
        simMat.uniforms.uPrev.value = rtA.texture;
        simMat.uniforms.uMouse.value.set(mx, my);
        simMat.uniforms.uForce.value = f;
        renderer.setRenderTarget(rtB);
        renderer.render(simScene, cam);
        const t = rtA;
        rtA = rtB;
        rtB = t;
      };

      const loop = (time: number) => {
        if (!visible) return;

        // A sharper, velocity-sensitive impulse gives the liquid a more tactile feel.
        let f = 0;
        if (inside && !reduced) {
          const speed = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py);
          f = Math.min(speed * 22, 1.15) + 0.012;
        }
        mouse.px += (mouse.x - mouse.px) * 0.35;
        mouse.py += (mouse.y - mouse.py) * 0.35;

        // Two simulation passes keep the surface stable while preserving the pointer impulse.
        if (!reduced) {
          step(mouse.px, mouse.py, f);
          step(mouse.px, mouse.py, 0);
        }
        renderer.setRenderTarget(null);

        const hv = mat.uniforms.uHover;
        hv.value += ((inside ? 1 : 0) - hv.value) * 0.06;

        mat.uniforms.uSim.value = rtA.texture;
        mat.uniforms.uTime.value = time;
        renderer.render(scene, cam);
      };
      gsap.ticker.add(loop);

      cleanup = () => {
        gsap.ticker.remove(loop);
        io.disconnect();
        ro.disconnect();
        wrap.removeEventListener("pointermove", onMove);
        wrap.removeEventListener("pointerleave", onLeave);
        (mat.uniforms.uMap.value as { dispose?: () => void } | null)?.dispose?.();
        rtA.dispose();
        rtB.dispose();
        geo.dispose();
        mat.dispose();
        simMat.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src, strength, edge, variant]);

  return (
    // NO overflow-hidden here: the canvas needs room to bulge past the image
    <div ref={wrapRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: `-${PAD_PCT}%`,
          width: `${100 + PAD_PCT * 2}%`,
          height: `${100 + PAD_PCT * 2}%`,
        }}
      />
    </div>
  );
}