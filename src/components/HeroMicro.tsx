"use client";

import { useEffect, useRef } from "react";
import { useGSAP, gsap } from "@/lib/gsap";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** ● REC indicator */
export function Rec() {
  const dot = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = dot.current;
      if (!el) return;

      if (prefersReducedMotion()) {
        gsap.set(el, { opacity: 1 });
        return;
      }

      const tween = gsap.to(el, {
        opacity: 0.18,
        duration: 0.55,
        repeat: -1,
        yoyo: true,
        repeatDelay: 0.45,
        ease: "sine.inOut",
      });

      return () => tween.kill();
    },
    { scope: dot }
  );

  return (
    <>
      <span
        ref={dot}
        aria-hidden="true"
        className="size-[6px] shrink-0 rounded-full bg-[#d92626]"
      />
      <span className="text-ink">Rec</span>
      <span className="text-gray-400">24 fps</span>
    </>
  );
}

/** Live 24fps timecode, written directly to the DOM. */
export function Timecode() {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const pad = (value: number) => String(value).padStart(2, "0");
      const format = (seconds: number) => {
        const frames = Math.floor(seconds * 24);
        const hours = Math.floor(frames / 86400);
        const minutes = Math.floor(frames / 1440) % 60;
        const secs = Math.floor(frames / 24) % 60;
        const frame = frames % 24;

        return `TC ${pad(hours)}:${pad(minutes)}:${pad(secs)}:${pad(frame)}`;
      };

      if (prefersReducedMotion()) {
        el.textContent = format(7.5);
        return;
      }

      const tick = () => {
        el.textContent = format(gsap.ticker.time + 7.5);
      };

      tick();
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: ref }
  );

  return (
    <span ref={ref} className="tabular-nums">
      TC 00:00:07:12
    </span>
  );
}

/** Warangal local time (IST). Updates once per minute; seconds are not displayed. */
export function LocalTime() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });

    const update = () => {
      if (ref.current) {
        ref.current.textContent = `${formatter.format(new Date())} IST`;
      }
    };

    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span ref={ref} suppressHydrationWarning className="tabular-nums">
      --:-- IST
    </span>
  );
}

/** Animated scroll cue. The line remains visible when reduced motion is enabled. */
export function ScrollCue() {
  const line = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = line.current;
      if (!el) return;

      // Start from a known state on every mount / remount.
      gsap.set(el, {
        scaleY: prefersReducedMotion() ? 1 : 0,
        transformOrigin: "top center",
        force3D: true,
      });

      if (prefersReducedMotion()) return;

      const timeline = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.35,
      });

      timeline
        .to(el, {
          scaleY: 1,
          duration: 0.9,
          ease: "power2.inOut",
        })
        .set(el, { transformOrigin: "bottom center" })
        .to(el, {
          scaleY: 0,
          duration: 0.9,
          ease: "power2.inOut",
        })
        .set(el, { transformOrigin: "top center" });

      return () => timeline.kill();
    },
    { scope: line }
  );

  return (
    <div
      className="inline-flex items-end gap-[10px]"
      aria-label="Scroll to explore"
    >
      <span
        aria-hidden="true"
        className="block h-[28px] w-px shrink-0 overflow-hidden bg-gray-300"
      >
        <span
          ref={line}
          className="block h-full w-full origin-top bg-current will-change-transform"
        />
      </span>

      <span className="flex flex-col">
        <span className="text-ink">(Scroll)</span>
        <span className="text-gray-400">03 Films — 02 Next</span>
      </span>
    </div>
  );
}

const LINES = [
  "He never asked for permission.",
  "He doesn't soften the truth.",
  "Love. Rage. Obsession. No filter.",
  "Some stories don't ask to be liked.",
  "Say what you want. He'll still shoot it.",
];

/** (V.O.) rotating narration. The intro is handled by <Text> in the parent. */
export function Narration() {
  const wrap = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = line.current;
      if (!el || prefersReducedMotion()) return;

      let index = 0;
      let alive = true;
      let timeline: ReturnType<typeof gsap.timeline> | undefined;

      const showNext = (delay: number) => {
        if (!alive) return;

        timeline = gsap.timeline({
          delay,
          onComplete: () => showNext(2.6),
        });

        timeline
          .to(el, {
            yPercent: -115,
            autoAlpha: 0,
            duration: 0.65,
            ease: "expo.in",
          })
          .add(() => {
            index = (index + 1) % LINES.length;
            el.textContent = LINES[index];
          })
          .fromTo(
            el,
            { yPercent: 115, autoAlpha: 0 },
            {
              yPercent: 0,
              autoAlpha: 1,
              duration: 0.9,
              ease: "expo.out",
              immediateRender: false,
            }
          );
      };

      gsap.set(el, { yPercent: 0, autoAlpha: 1 });
      showNext(4.5);

      return () => {
        alive = false;
        timeline?.kill();
      };
    },
    { scope: wrap }
  );

  return (
    <div ref={wrap} className="flex flex-col items-center gap-[4px]">
      <span className="text-[11px] uppercase leading-[1.1] text-gray-500">
        (V.O.)
      </span>
      <div className="overflow-hidden py-[0.14em] -my-[0.14em]">
        <span
          ref={line}
          className="block text-[16px] md:text-[clamp(16px,1.2vw,20px)] leading-[1.1] tracking-[-0.03em] text-ink"
        >
          {LINES[0]}
        </span>
      </div>
    </div>
  );
}
