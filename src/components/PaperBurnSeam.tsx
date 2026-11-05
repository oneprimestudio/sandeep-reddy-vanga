"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/*
 * PaperBurnSeam: "Celluloid / Paper Burn Transition"
 * A dedicated transition seam between PartnersSection and RememberSection.
 * Renders an organic ragged paper burn with charred scorched ash edges,
 * incandescent molten ember rims, and drifting glowing sparks.
 * Built with 2D Canvas for 60fps performance and zero WebGL context limits.
 */

// Simple pseudo-random hash & smooth noise for the organic tearing edge
function hash(x: number, y: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash(i, j);
  const n10 = hash(i + 1, j);
  const n01 = hash(i, j + 1);
  const n11 = hash(i + 1, j + 1);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

function fbm(x: number, y: number) {
  let v = 0;
  let a = 0.5;
  let cx = x;
  let cy = y;
  for (let i = 0; i < 4; i++) {
    v += a * smoothNoise(cx, cy);
    cx *= 2.05;
    cy *= 2.05;
    a *= 0.5;
  }
  return v / 0.9375;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export default function PaperBurnSeam() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = prefersReducedMotion();

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.round(w * dpr);
      height = Math.round(h * dpr);
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    let isVisible = true;
    const io = new IntersectionObserver(([entry]) => {
      if (entry) isVisible = entry.isIntersecting;
    });
    io.observe(root);

    // Scroll progress drives the burn wave
    let targetProgress = 0;
    let currentProgress = 0;

    const st = ScrollTrigger.create({
      trigger: root,
      start: "top 90%",
      end: "bottom 10%",
      scrub: reduced ? false : 0.4,
      onUpdate: (self) => {
        targetProgress = self.progress;
      },
    });

    // Sparks simulation
    const sparks: Spark[] = [];
    const SPARK_COLORS = ["#ffffff", "#ffe082", "#ffb300", "#ff5722", "#d32f2f"];

    const spawnSpark = (bx: number, by: number) => {
      if (sparks.length > 50) return;
      sparks.push({
        x: bx + (Math.random() - 0.5) * 40 * dpr,
        y: by + (Math.random() - 0.5) * 15 * dpr,
        vx: (Math.random() - 0.5) * 1.5 * dpr,
        vy: -(Math.random() * 2.2 + 0.8) * dpr,
        size: (Math.random() * 2.2 + 1.0) * dpr,
        life: 0,
        maxLife: Math.random() * 40 + 20,
        color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      });
    };

    let animId = 0;
    let time = 0;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      if (!isVisible || width === 0 || height === 0) return;

      time += 0.016;
      // Smooth interpolation towards target scroll progress
      currentProgress += (targetProgress - currentProgress) * 0.12;

      // Base burn level travels from top (-0.15) to bottom (1.15)
      const burnBase = -0.15 + currentProgress * 1.3;

      // 1. Draw base unburnt paper (white)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Subtle fine paper fiber grain at high performance
      ctx.fillStyle = "rgba(0,0,0,0.015)";
      ctx.fillRect(0, 0, width, height);

      // 2. Compute the organic torn burn line across canvas width
      const sampleCount = Math.max(30, Math.min(160, Math.floor(width / (10 * dpr))));
      const step = width / sampleCount;

      const burnPoints: { x: number; y: number }[] = [];

      for (let i = 0; i <= sampleCount; i++) {
        const x = i * step;
        const normX = x / width;

        // Multi-frequency noise for celluloid tear
        const n1 = fbm(normX * 3.5, time * 0.15);
        const n2 = fbm(normX * 8.0 - time * 0.3, 2.0);
        const noise = (n1 * 0.7 + n2 * 0.3 - 0.5) * 0.38;

        const burnY = (burnBase + noise) * height;
        burnPoints.push({ x, y: burnY });

        // Periodically spawn sparks along the active burn front
        if (Math.random() < 0.06 && burnY > 0 && burnY < height) {
          spawnSpark(x, burnY);
        }
      }

      // 3. Render the burnt void layer (Dark ink celluloid black + red glow)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, burnPoints[burnPoints.length - 1].y);

      for (let i = burnPoints.length - 1; i >= 0; i--) {
        ctx.lineTo(burnPoints[i].x, burnPoints[i].y);
      }
      ctx.closePath();

      // Cinematic black gradient with deep red atmospheric heat
      const voidGrad = ctx.createLinearGradient(0, 0, 0, height);
      voidGrad.addColorStop(0, "#ffffff");
      voidGrad.addColorStop(0.12, "#18181c");
      voidGrad.addColorStop(0.5, "#0d0d10");
      voidGrad.addColorStop(0.85, "#150d0e");
      voidGrad.addColorStop(1, "#ffffff");
      ctx.fillStyle = voidGrad;
      ctx.fill();
      ctx.restore();

      // 4. Scorched Charred Ash Border (Dark burnt carbon)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(burnPoints[0].x, burnPoints[0].y);
      for (let i = 1; i < burnPoints.length; i++) {
        ctx.lineTo(burnPoints[i].x, burnPoints[i].y);
      }
      ctx.lineWidth = 14 * dpr;
      ctx.strokeStyle = "rgba(22, 12, 10, 0.75)";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Inner tighter scorched edge
      ctx.lineWidth = 7 * dpr;
      ctx.strokeStyle = "rgba(40, 15, 8, 0.9)";
      ctx.stroke();
      ctx.restore();

      // 5. Glowing Molten Fiery Rim (Amber to incandescent gold)
      ctx.save();
      const flicker = 0.85 + 0.15 * Math.sin(time * 30.0);

      ctx.beginPath();
      ctx.moveTo(burnPoints[0].x, burnPoints[0].y);
      for (let i = 1; i < burnPoints.length; i++) {
        ctx.lineTo(burnPoints[i].x, burnPoints[i].y);
      }

      // Intense outer ember halo
      ctx.lineWidth = 5 * dpr;
      ctx.strokeStyle = `rgba(255, 75, 10, ${0.85 * flicker})`;
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 16 * dpr;
      ctx.stroke();

      // Hot core filament
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = `rgba(255, 235, 130, ${0.95 * flicker})`;
      ctx.shadowColor = "#ffc107";
      ctx.shadowBlur = 8 * dpr;
      ctx.stroke();
      ctx.restore();

      // 6. Floating Sparks & Embers
      ctx.save();
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx + (Math.random() - 0.5) * 0.8 * dpr;
        s.y += s.vy;
        s.life++;

        const progress = s.life / s.maxLife;
        const alpha = (1 - progress) * (0.8 + 0.2 * Math.random());

        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1 - progress * 0.4), 0, Math.PI * 2);
        ctx.fill();

        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
        }
      }
      ctx.restore();

      // 7. Soft top and bottom seamless feathering into surrounding white
      ctx.save();
      const featherH = Math.min(height * 0.1, 70 * dpr);

      // Top edge feather into pure white
      const topGrad = ctx.createLinearGradient(0, 0, 0, featherH);
      topGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
      topGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, featherH);

      // Bottom edge feather into pure white
      const botGrad = ctx.createLinearGradient(0, height - featherH, 0, height);
      botGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      botGrad.addColorStop(1, "rgba(255, 255, 255, 1)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, height - featherH, width, featherH);
      ctx.restore();
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      st.kill();
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="relative z-10 -my-px h-[55svh] min-h-[340px] md:h-[70svh] w-full overflow-hidden bg-white select-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* Cinematic micro label matching the Vanga editorial aesthetic */}
      <div className="pointer-events-none absolute inset-x-4 top-8 md:inset-x-8 z-20">
        <div className="mx-auto max-w-[1720px] flex justify-between t-micro text-neutral-400">
          <span>(Interlude)</span>
          <span className="text-right">Celluloid Burn Transition</span>
        </div>
      </div>
    </div>
  );
}
