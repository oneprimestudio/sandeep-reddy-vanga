"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uRes;
  varying vec2 vUv;

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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.08;
      a *= 0.5;
    }
    return v / 0.9375;
  }

  void main() {
    vec2 p = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 aspP = vec2(p.x * aspect, p.y);

    // Multi-octave organic noise for the ragged, tearing paper burn
    float n1 = fbm(aspP * 2.8 + vec2(0.0, uTime * 0.035));
    float n2 = fbm(aspP * 6.2 - vec2(uTime * 0.06, 0.0));
    float noiseVal = n1 * 0.72 + n2 * 0.28;

    // The burn wave travels across the band driven by scroll progress
    float burnCoord = p.y + (noiseVal - 0.5) * 0.38;
    float burnLevel = mix(-0.25, 1.25, uProgress);
    float diff = burnCoord - burnLevel;

    // 1. Unburnt Paper
    vec3 paper = vec3(1.0);
    paper -= (hash(gl_FragCoord.xy + fract(uTime) * 37.0) - 0.5) * 0.025; // fine paper grain

    // 2. Burnt Void (Cinematic deep ink black + atmospheric red warmth)
    vec3 voidCol = vec3(0.065, 0.065, 0.08);
    float smoke = fbm(aspP * 3.5 - vec2(0.0, uTime * 0.2));
    voidCol += vec3(0.85, 0.15, 0.15) * smoke * 0.26; // signature red ambient glow

    // Charred burnt paper border (dark scorched ash)
    float charWidth = 0.09;

    // Fiery glowing ember rim
    float emberWidth = 0.05;
    float emberFactor = 1.0 - smoothstep(0.0, emberWidth, abs(diff));
    float coreFactor = 1.0 - smoothstep(0.0, emberWidth * 0.38, abs(diff));

    vec3 emberCol = mix(vec3(1.0, 0.26, 0.06), vec3(1.0, 0.88, 0.4), coreFactor);
    // Flickering ember intensity
    emberCol *= (0.82 + 0.35 * hash(vec2(floor(uTime * 28.0), floor(p.x * 240.0))));

    // Combine paper, charred edge, embers and burnt void
    vec3 col;
    if (diff > 0.0) {
      // Paper side, turning charred near the burn line
      vec3 charCol = vec3(0.12, 0.05, 0.03);
      col = mix(charCol, paper, smoothstep(0.008, charWidth, diff));
      col = mix(col, emberCol, emberFactor * 0.95);
    } else {
      // Void side with floating ember sparks
      float spark = step(0.988, hash(aspP * 90.0 + vec2(0.0, uTime * 2.5))) * (1.0 - smoothstep(-0.35, 0.0, diff));
      col = voidCol + spark * vec3(1.0, 0.65, 0.25) * 0.9;
      col = mix(col, emberCol, emberFactor * 0.95);
    }

    // Seamless blending at extreme top and bottom into white
    float edgeTop = smoothstep(0.0, 0.06, p.y);
    float edgeBottom = smoothstep(1.0, 0.94, p.y);
    float seamMask = edgeTop * edgeBottom;

    col = mix(vec3(1.0), col, seamMask);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function PaperBurnSeam() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const root = rootRef.current;
      const canvas = canvasRef.current;
      if (disposed || !root || !canvas) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: false,
          antialias: false,
          powerPreference: "high-performance",
        });
      } catch {
        return;
      }
      renderer.setClearColor(0xffffff, 1);

      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
      });

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);

      const state = { progress: 0 };

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uRes: { value: new THREE.Vector2(1, 1) },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const resize = () => {
        const w = root.clientWidth;
        const h = root.clientHeight;
        if (!w || !h) return;
        const dpr = Math.min(window.devicePixelRatio, 1.5);
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        material.uniforms.uRes.value.set(w, h);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(root);

      let visible = true;
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
      });
      io.observe(root);

      // ScrollTrigger connects scroll progress to the paper burn wave
      const st = ScrollTrigger.create({
        trigger: root,
        start: "top 95%",
        end: "bottom 5%",
        scrub: reduced ? false : 0.6,
        onUpdate: (self) => {
          state.progress = self.progress;
        },
      });

      let lastTime = 0;
      const render = (time: number) => {
        if (!visible) return;
        const t = time * 0.001;
        material.uniforms.uTime.value = t;
        material.uniforms.uProgress.value = state.progress;

        try {
          renderer.render(scene, camera);
        } catch {
          // gracefully ignore if context is unavailable
        }
      };

      gsap.ticker.add(render);

      cleanup = () => {
        gsap.ticker.remove(render);
        st.kill();
        io.disconnect();
        ro.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="relative z-10 -my-px h-[60svh] min-h-[360px] md:h-[75svh] w-full overflow-hidden bg-white select-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* Subtle editorial micro label matching the site style */}
      <div className="pointer-events-none absolute inset-x-4 top-8 md:inset-x-8 z-20">
        <div className="mx-auto max-w-[1720px] flex justify-between t-micro text-gray-400">
          <span>(Interlude)</span>
          <span className="text-right">Celluloid Burn</span>
        </div>
      </div>
    </div>
  );
}
