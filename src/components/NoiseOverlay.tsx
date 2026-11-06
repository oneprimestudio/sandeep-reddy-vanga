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

export default function NoiseOverlay({
  intensity = 0.04,
  grain = 1,
  fps = 24,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef({ intensity, grain, fps });

  useEffect(() => {
    settingsRef.current = { intensity, grain, fps };
  }, [intensity, grain, fps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let disposed = false;
    let animId = 0;
    let lastTime = 0;

    // Generate a set of pre-baked noise tiles for zero-cost 60fps/24fps playback
    const TILE_SIZE = 128;
    const NUM_TILES = 8;
    const tiles: HTMLCanvasElement[] = [];

    for (let t = 0; t < NUM_TILES; t++) {
      const tile = document.createElement("canvas");
      tile.width = TILE_SIZE;
      tile.height = TILE_SIZE;
      const tCtx = tile.getContext("2d");
      if (tCtx) {
        const imgData = tCtx.createImageData(TILE_SIZE, TILE_SIZE);
        const buf = new Uint32Array(imgData.data.buffer);
        const len = buf.length;
        for (let i = 0; i < len; i++) {
          // Subtle monochromatic grain
          const val = (Math.random() * 255) | 0;
          const alpha = (Math.random() * 255) | 0;
          // ABGR order for Little-Endian Uint32
          buf[i] = (alpha << 24) | (val << 16) | (val << 8) | val;
        }
        tCtx.putImageData(imgData, 0, 0);
      }
      tiles.push(tile);
    }

    let width = 0;
    let height = 0;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    let currentTile = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = (time: number) => {
      if (disposed) return;
      animId = requestAnimationFrame(render);

      const targetFps = Math.max(1, Math.min(30, settingsRef.current.fps));
      const interval = 1000 / targetFps;

      if (time - lastTime < interval) return;
      lastTime = time;

      if (!reducedMotion) {
        currentTile = (currentTile + 1) % NUM_TILES;
      }

      ctx.clearRect(0, 0, width, height);

      const tile = tiles[currentTile];
      if (!tile) return;

      ctx.save();
      ctx.globalAlpha = settingsRef.current.intensity;
      ctx.globalCompositeOperation = "source-over";

      const pattern = ctx.createPattern(tile, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    };

    animId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
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
