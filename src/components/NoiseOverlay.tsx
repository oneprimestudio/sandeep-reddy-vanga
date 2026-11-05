"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Grain opacity. Keep subtle for a clean, premium image. */
  intensity?: number;
  /** CSS-pixel grain cell size. Smaller = finer grain. */
  grain?: number;
  /** Animation rate. 24 = film cadence, 12 = subtle, 0 = static. */
  fps?: number;
  className?: string;
};

const VERT = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float uFrame;
  uniform float uIntensity;

  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 pixel = floor(gl_FragCoord.xy);
    float frame = mod(uFrame, 997.0);

    float a = hash13(vec3(pixel, frame));
    float b = hash13(vec3(pixel + 17.17, frame + 31.7));
    float c = hash13(vec3(pixel.yx + 53.9, frame + 71.3));
    float noise = (a + b + c - 1.5) * 0.6666667;

    float alpha = abs(noise) * uIntensity;
    vec3 grainColor = noise >= 0.0 ? vec3(1.0) : vec3(0.0);
    gl_FragColor = vec4(grainColor, alpha);
    #include <colorspace_fragment>
  }
`;

export default function NoiseOverlay({
  intensity = 0.035,
  grain = 0.8,
  fps = 18,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef({ intensity, grain, fps });

  useEffect(() => {
    settingsRef.current = { intensity, grain, fps };
  }, [intensity, grain, fps]);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let resizeObserver: ResizeObserver | null = null;
    let renderer: import("three").WebGLRenderer | null = null;
    let geometry: import("three").PlaneGeometry | null = null;
    let material: import("three").ShaderMaterial | null = null;
    let resizeHandler = () => {};

    (async () => {
      const THREE = await import("three");
      const canvas = canvasRef.current;
      if (disposed || !canvas) return;

      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
          powerPreference: "low-power",
          premultipliedAlpha: true,
          preserveDrawingBuffer: false,
        });
      } catch {
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        uniforms: {
          uFrame: { value: 0 },
          uIntensity: { value: settingsRef.current.intensity },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        blending: THREE.NormalBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(1);

      let frame = 0;
      let last = 0;
      let lastWidth = 0;
      let lastHeight = 0;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const draw = () => {
        if (!renderer || !material) return;
        material.uniforms.uFrame.value = frame;
        material.uniforms.uIntensity.value = settingsRef.current.intensity;
        renderer.render(scene, camera);
      };

      const resize = () => {
        if (!renderer) return;
        const { grain: cell } = settingsRef.current;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.ceil(window.innerWidth * dpr / Math.max(0.5, cell)));
        const height = Math.max(1, Math.ceil(window.innerHeight * dpr / Math.max(0.5, cell)));

        if (width === lastWidth && height === lastHeight) return;
        lastWidth = width;
        lastHeight = height;
        renderer.setSize(width, height, false);
        draw();
      };

      resizeHandler = resize;
      window.addEventListener("resize", resize, { passive: true });
      resize();

      if ("ResizeObserver" in window && canvas.parentElement) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas.parentElement);
      }

      const loop = (time: number) => {
        raf = requestAnimationFrame(loop);
        const currentFps = settingsRef.current.fps;
        if (reducedMotion || currentFps <= 0) return;

        const interval = 1000 / Math.min(30, Math.max(1, currentFps));
        if (time - last < interval) return;
        last = time - ((time - last) % interval);
        frame += 1;
        draw();
      };

      if (!reducedMotion && settingsRef.current.fps > 0) {
        raf = requestAnimationFrame(loop);
      } else {
        draw();
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeHandler);
      resizeObserver?.disconnect();
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[9999] h-full w-full select-none ${className}`}
    />
  );
}
