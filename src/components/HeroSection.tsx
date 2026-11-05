"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGSAP, gsap, MASK_EASE } from "@/lib/gsap";
import Text from "./Text";
import { HoverLine } from "./HoverLink";
import { Rec, Timecode, LocalTime, ScrollCue, Narration } from "./HeroMicro";

const MASK_FROM = "inset(30% 30% 30% 30% round 24px)";
const MASK_TO = "inset(0% 0% 0% 0% round 0px)";

export default function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef<HTMLDivElement>(null);

  const openSpirit = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-film-drawer", { detail: { index: 3 } })
      );
    }
  };

  const [go, setGo] = useState(() => {
    if (typeof document === "undefined") return false;
    const el = document.getElementById("preloader");
    if (!el) return true;
    const flag = document.documentElement.dataset.preload;
    return flag === "landed" || flag === "done";
  });
  useEffect(() => {
    const el = document.getElementById("preloader");
    if (!el) {
      setGo(true);
      return;
    }
    const flag = document.documentElement.dataset.preload;
    if (flag === "landed" || flag === "done") {
      setGo(true);
      return;
    }
    setGo(false);
    const on = () => setGo(true);
    window.addEventListener("preloader:land", on, { once: true });
    return () => window.removeEventListener("preloader:land", on);
  }, []);

  // PARALLAX: always on, so the portrait is already at its scroll-0 position when the
  // preloader measures it
  useGSAP(
    () => {
      const card = cardRef.current;
      const drift = driftRef.current;
      if (!card || !drift) return;

      gsap.fromTo(
        drift,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    },
    { scope: rootRef }
  );

  // INTRO: waits for the preloader. After a seamless landing the portrait is already in place.
  useGSAP(
    () => {
      if (!go) return;
      const card = cardRef.current;
      const mask = maskRef.current;
      const settle = settleRef.current;
      if (!card || !mask || !settle) return;

      const fromPreloader =
        document.documentElement.dataset.preload === "landed" ||
        document.documentElement.dataset.preload === "done" ||
        document.documentElement.dataset.preloaded === "1";

      if (fromPreloader) {
        gsap.set(mask, { clipPath: MASK_TO });
        gsap.set(settle, { scale: 1 });
        gsap.from("[data-hero-name]", {
          opacity: 0,
          y: 12,
          duration: 1.0,
          ease: "expo.out",
          delay: 0.1,
          stagger: 0.08,
        });
        return;
      }

      gsap
        .timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        })
        .fromTo(
          mask,
          { clipPath: MASK_FROM },
          { clipPath: MASK_TO, duration: 1.4, ease: MASK_EASE },
          0
        )
        .from(settle, { scale: 1.15, duration: 1.6, ease: "expo.out" }, 0);
    },
    { scope: rootRef, dependencies: [go] }
  );

  // the <Text> blocks re-mount at landing so their entrances play after the preloader
  // (the portrait is never re-mounted)
  const k = go ? "in" : "pre";

  return (
    <section
      id="top"
      ref={rootRef}
      className="relative flex flex-col md:grid md:grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)] min-h-[100svh] md:h-screen bg-white"
    >
      {/* Row 1: spacer (md+), keeps main content centered on the screen */}
      <div aria-hidden className="hidden md:block md:row-start-1" />

      {/* Row 2: MAIN */}
      <div className="px-4 md:px-8 pt-28 md:pt-0 md:row-start-2">
        <div className="mx-auto w-full max-w-[1720px]">
          {/*
            MOBILE  : symmetric 3 columns [credits 4rem | portrait (flex) | big-screen 4rem]
                      so the portrait is always dead-centre
            DESKTOP : the original 12-column Figma grid (unchanged)
          */}
          <div className="grid grid-cols-[4rem_minmax(0,1fr)_4rem] md:grid-cols-12 gap-x-2 md:gap-x-3 gap-y-6 md:gap-y-0 items-start">
            {/* MICRO STRIP (mobile): 2 clean rows, left / centre / right aligned to the portrait edges */}
            <div
              key={`mstrip-${k}`}
              className="md:hidden col-span-3 row-start-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-[7px] text-[clamp(8.5px,2.5vw,10px)] uppercase leading-[1.1] tracking-[0.01em] text-gray-600 whitespace-nowrap tabular-nums"
            >
              <div className="min-w-0">
                <Text variant="slideUp" delay={0.1}>
                  <div className="flex items-center gap-[6px]">
                    <Rec />
                  </div>
                </Text>
              </div>
              <div>
                <Text variant="slideUp" delay={0.14}>
                  <span className="block text-center">Scene 01</span>
                </Text>
              </div>
              <div className="min-w-0">
                <Text variant="slideUp" delay={0.18}>
                  <span className="block text-right">Take 01</span>
                </Text>
              </div>
              <div className="min-w-0">
                <Text variant="slideUp" delay={0.22}>
                  <span className="block">17.97° N 79.59° E</span>
                </Text>
              </div>
              <div>
                <Text variant="slideUp" delay={0.26}>
                  <span className="block text-center">
                    <Timecode />
                  </span>
                </Text>
              </div>
              <div className="min-w-0">
                <Text variant="slideUp" delay={0.3}>
                  <span className="block text-right">
                    <LocalTime />
                  </span>
                </Text>
              </div>
            </div>

            {/* MICRO STRIP (md+): above portrait, every cell uses <Text> */}
            <div
              key={`strip-${k}`}
              className="hidden md:grid md:col-span-12 md:row-start-1 mb-[5rem] grid-cols-12 gap-x-3 items-end text-[11px] uppercase leading-[1.1] text-gray-600"
            >
              <div className="col-span-2">
                <Text variant="slideUp" delay={0.1}>
                  <div className="flex items-center gap-[6px]">
                    <Rec />
                  </div>
                </Text>
              </div>

              {/* px-[5rem] = same inset as the portrait, so edges align */}
              <div className="col-start-5 col-span-4 px-[5rem] grid grid-cols-3">
                <div>
                  <Text variant="slideUp" delay={0.14}>
                    <span className="block">Scene 01</span>
                  </Text>
                </div>
                <div>
                  <Text variant="slideUp" delay={0.18}>
                    <span className="block text-center">
                      <Timecode />
                    </span>
                  </Text>
                </div>
                <div>
                  <Text variant="slideUp" delay={0.22}>
                    <span className="block text-right">Take 01</span>
                  </Text>
                </div>
              </div>

              <div className="col-start-10 col-span-3 flex justify-between">
                <Text variant="slideUp" delay={0.26}>
                  <span className="block">17.97° N 79.59° E</span>
                </Text>
                <Text variant="slideUp" delay={0.3}>
                  <span className="block">
                    <LocalTime />
                  </span>
                </Text>
              </div>
            </div>

            {/* Credits: top of "Director" sits on the portrait's center line (Figma) */}
            <div className="col-start-1 row-start-2 self-stretch flex items-center md:col-span-2 md:col-start-2 xl:col-start-3 md:row-start-2">
              <div className="w-full h-0">
                <div className="flex flex-col whitespace-nowrap text-[9px] md:text-[20px] xl:text-[12px] tracking-tight text-gray-700 uppercase leading-[1.3] md:leading-tight font-medium">
                  <span>Director</span>
                  <span>Screen Play</span>
                  <span>Editor</span>
                </div>
              </div>
            </div>

            {/* Portrait: mobile = middle column, desktop = cols 5-8 */}
            <div
              ref={cardRef}
              className="col-start-2 row-start-2 min-w-0 md:col-span-8 xl:col-span-4 md:col-start-3 xl:col-start-5 md:px-[5rem] md:row-start-2"
            >
              <div
                ref={maskRef}
                data-hero-portrait
                className="relative w-full aspect-[3/4] md:aspect-[3/5] xl:aspect-[3/4] max-h-[70vh] md:max-h-[calc(100vh-var(--nav-h,100px)*2-120px)] overflow-hidden"
              >
                {/* overscan so the parallax never exposes an edge */}
                <div
                  ref={driftRef}
                  data-hero-drift
                  className="absolute inset-x-0 -top-[7.5%] w-full h-[115%] md:h-[105%] xl:h-[115%] will-change-transform"
                >
                  <div ref={settleRef} className="relative w-full h-full">
                    <Image
                      src="/images/sandeep-reddy-vanga.jpg"
                      alt="Sandeep Reddy Vanga"
                      fill
                      priority
                      loading="eager"
                      sizes="(min-width: 768px) 33vw, 62vw"
                      className="object-cover object-center"
                    />
                  </div>
                </div>

                {/* name + tagline: same spot as desktop (center line, slightly low) */}
                <div className="absolute inset-x-0 top-[57%] mt-[5px] -translate-y-1/2 px-2 md:px-5 text-center text-white pointer-events-none z-10">
                  <h3
                    data-hero-name
                    className="text-[clamp(10px,3.1vw,14px)] md:text-[clamp(20px,1.4vw,30px)] uppercase leading-[1.1] md:leading-tight font-medium tracking-[-0.03em] text-balance"
                  >
                    Sandeep Reddy Vanga
                  </h3>
                  <p
                    data-hero-name
                    className="mt-1 md:mt-2 text-[9px] md:text-[clamp(11px,0.95vw,14px)] font-normal leading-[1.25] tracking-[-0.01em] text-white/90 text-balance"
                  >
                    Not every STORY seeks approval
                  </p>
                </div>
              </div>
            </div>

            {/* To The Big Screen: same center line as "Director" */}
            <div className="col-start-3 row-start-2 self-stretch flex items-center md:col-span-3 md:col-start-10 xl:col-start-8 md:row-start-2">
              <div className="w-full h-0">
                <span className="block text-right whitespace-nowrap md:whitespace-normal text-[9px] md:text-[20px] xl:text-[12px] uppercase font-medium leading-[1.3] md:leading-tight text-ink">
                  To The
                  <br className="md:hidden" /> Big Screen
                </span>
              </div>
            </div>

            {/* Bio */}
            <div
              key={`bio-${k}`}
              className="col-span-3 col-start-1 row-start-3 mt-1 md:col-span-6 md:col-start-4 md:mt-4 text-center"
            >
              <Text variant="slideUp" delay={0.2}>
                <p className="mx-auto max-w-[32ch] md:max-w-none font-normal text-ink text-balance text-[clamp(17px,5vw,21px)] md:text-[30px] xl:text-[clamp(16px,1.2vw,24px)] leading-[1.14] md:leading-[1.012] tracking-[-0.045em] md:tracking-[-0.05em]">
                  <span className="text-[#d92626] font-medium">Sandeep Reddy Vanga</span>{" "}
                  challenges conventions, breaks cinematic boundaries and
                  transforms raw human emotions into unapologetic expressions of
                  art.
                </p>
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: SCROLL / NARRATION / SPIRIT, in flow, pinned to the bottom */}
      <div className="px-4 md:px-8 mt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] md:mt-0 md:pb-8 md:row-start-3 md:self-end">
        <div className="mx-auto w-full max-w-[1720px]">
          <div className="grid grid-cols-12 gap-x-2 md:gap-x-3 gap-y-6 items-end">
            {/* Narration: mobile = full width on top, desktop = cols 4-9 (same span as the bio) */}
            <div
              key={`nar-${k}`}
              className="order-1 md:order-none relative z-10 col-span-12 md:col-span-6 md:col-start-4"
            >
              <Text variant="slideUp" delay={0.28}>
                <div>
                  <Narration />
                </div>
              </Text>
            </div>

            {/* Scroll cue: mobile = bottom-left, desktop = cols 1-3 */}
            <div
              key={`scroll-${k}`}
              className="order-2 md:order-none col-span-3 md:col-span-3 md:row-start-1 pb-1 md:pb-0 text-[10px] md:text-[11px] uppercase leading-[1.1] text-gray-600 whitespace-nowrap"
            >
              <Text variant="slideUp" delay={0.25}>
                <div>
                  <ScrollCue />
                </div>
              </Text>
            </div>

            {/* Spirit: mobile = compact row [label | poster | note] aligned to the bottom-right,
                desktop = cols 10-12 (nested 3-col grid) */}
            <div className="order-3 md:order-none col-span-9 md:col-span-3 md:col-start-10 md:row-start-1 flex md:grid md:grid-cols-3 justify-end items-end gap-x-3 md:gap-x-3">
              <button
                type="button"
                onClick={openSpirit}
                className="shrink-0 text-right text-[14px] md:text-[clamp(14px,1.4vw,20px)] font-normal leading-none text-ink pb-1 cursor-pointer transition-opacity hover:opacity-70"
              >
                Spirit
              </button>

              <div className="w-[3.5rem] shrink-0 md:w-auto">
                <button
                  type="button"
                  onClick={openSpirit}
                  className="group relative block w-full aspect-[7/10] overflow-hidden cursor-pointer text-left"
                  aria-label="View Spirit"
                >
                  <Image
                    src="/images/spirit poster.jpg"
                    alt="Spirit movie poster"
                    fill
                    sizes="(min-width: 768px) 8vw, 24vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </button>
                <button
                  type="button"
                  onClick={openSpirit}
                  className="mt-1 inline-block text-[10px] md:text-[12px] uppercase text-ink cursor-pointer"
                >
                  <HoverLine mode="draw">View</HoverLine>
                </button>
              </div>

              <p className="max-w-[6.5rem] md:max-w-none text-[9px] md:text-[11px] leading-[1.25] md:leading-[1.2] text-ink pb-5">
                Directed by Sandeep Reddy Vanga. An upcoming film.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}