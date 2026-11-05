"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useGSAP, gsap, ScrollTrigger } from "@/lib/gsap";
import Text from "./Text";
import type { PlateState } from "./FramingPlate";
import { CHAPTERS } from "../../data/framing";

/* three.js stays out of the main bundle and the server render */
const FramingPlate = dynamic(() => import("./FramingPlate"), { ssr: false });

const N = CHAPTERS.length;
const pad = (n: number) => String(n).padStart(2, "0");

/** masked line: rolls up in / out from behind its own edge */
function Mk({ children }: { children: ReactNode }) {
  return (
    <span className="block overflow-hidden py-[0.08em] -my-[0.08em]">
      <span data-ch className="block will-change-transform">
        {children}
      </span>
    </span>
  );
}

export default function CraftSection() {
  const rootRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const plate = useRef<PlateState>({ p: 0 }); // read by the three.js scene every frame
  const dirty = useRef(false);
  const swapped = useRef(false);

  const [active, setActive] = useState(0); // chapter nearest to the scroll position
  const [shown, setShown] = useState(0); // chapter whose text is on screen

  const stageRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);


  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = stageRef.current;

      if (!root || !stage) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const ctx = gsap.context(() => {
        const trigger = ScrollTrigger.create({
          trigger: root,
          pin: stage,
          pinSpacing: false,
          start: "top top",

          // Pin until the section's final viewport
          end: () => `+=${Math.max(
            1,
            root.offsetHeight - stage.offsetHeight
          )}`,

          anticipatePin: 1,
          invalidateOnRefresh: true,

          snap: reduced
            ? undefined
            : {
              snapTo: (value) =>
                Math.round(value * (N - 1)) / (N - 1),
              duration: { min: 0.35, max: 0.8 },
              delay: 0.08,
              ease: "power2.inOut",
            },

          onUpdate: (self) => {
            const next = Math.min(
              N - 1,
              Math.round(self.progress * (N - 1))
            );

            plate.current.p = self.progress;

            if (barRef.current) {
              barRef.current.style.transform =
                `scaleX(${self.progress})`;
            }

            // React updates only when the chapter changes
            if (activeRef.current !== next) {
              activeRef.current = next;
              setActive(next);
            }
          },
        });

        stRef.current = trigger;

        if (!reduced) {
          gsap.from("[data-ch]", {
            yPercent: 110,
            duration: 1,
            ease: "expo.out",
            stagger: 0.035,
            scrollTrigger: {
              trigger: root,
              start: "top 70%",
              once: true,
            },
          });

          gsap.from("[data-line]", {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 1.2,
            ease: "expo.inOut",
            stagger: 0.08,
            scrollTrigger: {
              trigger: root,
              start: "top 70%",
              once: true,
            },
          });
        }
      }, root);

      // Refresh after initial layout and font/image loading
      const refresh = () => ScrollTrigger.refresh();

      requestAnimationFrame(refresh);

      window.addEventListener("resize", refresh);

      return () => {
        window.removeEventListener("resize", refresh);
        stRef.current = null;
        ctx.revert();
      };
    },
    { scope: rootRef }
  );


  /* TEXT SWAP: old text rolls out (up), then the next chapter's text rolls in */
  useEffect(() => {
    const root = textRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = root.querySelectorAll("[data-ch]");

    if (active === shown) {
      if (dirty.current) {
        dirty.current = false;
        gsap.to(els, { yPercent: 0, duration: reduced ? 0 : 0.5, ease: "expo.out", overwrite: true });
      }
      return;
    }

    dirty.current = true;
    const tw = gsap.to(els, {
      yPercent: -110,
      duration: reduced ? 0 : 0.35,
      ease: "expo.in",
      stagger: reduced ? 0 : 0.02,
      overwrite: true,
      onComplete: () => {
        dirty.current = false;
        swapped.current = true;
        setShown(active);
      },
    });
    return () => {
      tw.kill();
    };
  }, [active, shown]);

  useEffect(() => {
    if (!swapped.current) return;
    const root = textRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.fromTo(
      root.querySelectorAll("[data-ch]"),
      { yPercent: reduced ? 0 : 110 },
      {
        yPercent: 0,
        duration: reduced ? 0 : 0.9,
        ease: "expo.out",
        stagger: reduced ? 0 : 0.04,
        overwrite: true,
      }
    );
  }, [shown]);

  const go = (i: number) => {
    const st = stRef.current;
    if (!st) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: st.start + (st.end - st.start) * (i / (N - 1)),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const c = CHAPTERS[shown];
  const live = CHAPTERS[active];

  return (
    <section
      id="upcoming"
      ref={rootRef}
      style={{ height: `${N * 100}vh` }}
      className="relative bg-white"
    >
      <div
        ref={stageRef}
        className="flex h-screen flex-col overflow-hidden
    px-4 pb-5 pt-[calc(var(--nav-h,100px)+20px)]
    md:px-8"
      >        <div className="mx-auto flex min-h-0 w-full max-w-[1720px] flex-1 flex-col">
          {/* MICRO STRIP (md+): live ratio + counter */}
          <div className="t-micro hidden grid-cols-12 gap-x-3 text-gray-500 md:grid">
            <div className="col-span-4 text-left">
              <Text variant="slideUp" delay={0}>
                <span className="block text-left">(04) Frame Studies</span>
              </Text>
            </div>
            <div className="col-span-4 col-start-5 text-center tabular-nums">
              Frame <span className="text-ink">{live.ratioLabel}</span>
            </div>
            <div className="col-span-3 col-start-10 text-right tabular-nums">
              {pad(active + 1)} / {pad(N)}
            </div>
          </div>

          {/* STAGE: chapters (left) / the object (centre) / this chapter (right) */}
          <div className="grid min-h-0 flex-1 grid-cols-4 items-center gap-x-3 gap-y-4 md:grid-cols-12 md:gap-y-0">
            {/* left: headline + chapter list */}
            <div className="hidden md:col-span-3 md:flex md:flex-col md:gap-[28px]">
              <div>
                <Text variant="slideUp" delay={0}>
                  <h2 className="t-title text-left text-ink">Every frame is a decision.</h2>
                </Text>
                <div className="mt-[10px] max-w-[92%]">
                  <Text variant="slideUp" delay={0.1}>
                    <p className="t-body text-left text-pretty text-gray-700">
                      Four ways to choose a frame. Scroll, and watch the lines move.
                    </p>
                  </Text>
                </div>
              </div>

              <ol>
                {CHAPTERS.map((ch, i) => (
                  <li key={ch.n}>
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-current={active === i}
                      className="group grid w-full grid-cols-[14px_1fr_auto] items-baseline gap-x-[8px] border-t border-black/15 py-[10px] text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#d92626]"
                    >
                      <span
                        aria-hidden
                        className={`size-[6px] rounded-full bg-[#d92626] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${active === i ? "scale-100" : "scale-0"
                          }`}
                      />
                      <span
                        className={`t-label transition-colors duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${active === i ? "text-ink" : "text-gray-400 group-hover:text-ink"
                          }`}
                      >
                        <span className="mr-[10px] tabular-nums">({ch.n})</span>
                        {ch.title}
                      </span>
                      <span className="t-micro text-gray-500">{ch.ratioLabel}</span>
                    </button>
                  </li>
                ))}
                <li aria-hidden className="h-px bg-black/15" />
              </ol>
            </div>

            {/* centre: the viewfinder */}
            <div className="col-span-4 h-[42vh] md:col-span-6 md:col-start-4 md:h-[min(76vh,calc(100vh-var(--nav-h,100px)-150px))]">
              <div
                role="img"
                aria-label="A camera viewfinder. Frame lines move across the glass to show four ways to compose a frame: thirds, dead centre, close-up and golden spiral."
                className="h-full w-full"
              >
                <FramingPlate state={plate.current} />
              </div>
            </div>

            {/* right: the chapter */}
            <div ref={textRef} aria-live="polite" className="col-span-4 md:col-span-3 md:col-start-10">
              <div className="flex flex-col gap-[16px] md:gap-[20px]">
                <div data-line className="h-px origin-left bg-black/15" />

                <div className="t-label">
                  <Mk>
                    <span className="mr-[10px] tabular-nums text-gray-500">({c.n})</span>
                    <span className="text-ink">{c.title}</span>
                  </Mk>
                </div>

                <p className="t-lead text-left text-balance text-ink">
                  <Mk>{c.line}</Mk>
                </p>

                <p className="t-body text-left text-pretty text-gray-700">
                  <Mk>{c.body}</Mk>
                </p>

                <dl className="t-micro hidden md:block">
                  {(
                    [
                      ["Frame", c.ratioLabel],
                      ["Guide", c.guideLabel],
                      ["Subject", c.subject],
                    ] as const
                  ).map(([k, v]) => (
                    <div
                      key={k}
                      className="grid grid-cols-3 gap-x-3 border-t border-black/15 py-[6px]"
                    >
                      <dt className="text-gray-500">
                        <Mk>{k}</Mk>
                      </dt>
                      <dd className="col-span-2 text-ink">
                        <Mk>{v}</Mk>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          {/* PROGRESS */}
          <div className="mt-[10px]">
            <div className="relative h-px bg-black/10">
              <div
                ref={barRef}
                className="absolute inset-0 origin-left bg-current"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <div className="t-micro mt-[8px] flex justify-between text-gray-500">
              <span>(Scroll to change the frame)</span>
              <span>
                Lit: <span className="text-[#d92626]">{live.guideLabel}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}