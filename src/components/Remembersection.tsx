"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP, gsap, MASK_EASE } from "@/lib/gsap";

/* Roman Telugu uses Latin glyphs, so it inherits the exact site/Obys font. */
const PORTRAIT = "/images/sandeep-reddy-vanga.jpg";
const RED = "#d92626";

const FULL = "Gurthupettuko Sandeep Reddy Vanga Po";
const LINE_1 = ["Gurthu", "pettuko"];
const LINE_2A = ["Sandeep", "Reddy"];
const LINE_2B = ["Vanga"];

function Word({ text }: { text: string }) {
  return (
    <span className="inline-block overflow-hidden whitespace-nowrap py-[0.1em] -my-[0.1em] align-middle">
      {[...text].map((ch, i) => (
        <span key={`${ch}-${i}`} data-c className="inline-block will-change-transform">
          {ch}
        </span>
      ))}
    </span>
  );
}

export default function RememberSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);
        const chars = q("[data-c]");
        const bangs = q("[data-bang]");
        const img = q("[data-img]");
        const imgIn = q("[data-img-in]");

        gsap
          .timeline({
            scrollTrigger: { trigger: root, start: "top 65%", once: true },
          })
          .fromTo(
            img,
            { clipPath: "inset(48% 48% 48% 48% round 8px)" },
            {
              clipPath: "inset(0% 0% 0% 0% round 0px)",
              duration: 1.35,
              ease: MASK_EASE,
            },
            0
          )
          .fromTo(imgIn, { scale: 1.28 }, { scale: 1, duration: 1.8, ease: "expo.out" }, 0)
          .fromTo(
            chars,
            { yPercent: 115 },
            { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.025 },
            0.22
          )
          .fromTo(
            bangs,
            { yPercent: 120, rotate: 8 },
            {
              yPercent: 0,
              rotate: 0,
              duration: 0.55,
              ease: "back.out(2.5)",
              stagger: 0.1,
            },
            1.45
          );

        const drift = (selector: string, from: string, to: string) =>
          gsap.fromTo(
            q(selector),
            { x: from },
            {
              x: to,
              ease: "none",
              scrollTrigger: {
                trigger: root,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );

        drift("[data-drift='a']", "-3vw", "3vw");
        drift("[data-drift='c']", "3vw", "-3vw");

        gsap.fromTo(
          q("[data-par]"),
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <section
      id="remember"
      ref={rootRef}
      className="relative flex min-h-[90svh] items-center justify-center overflow-x-clip bg-white px-4 py-24 md:min-h-screen md:px-8"
    >
      <div className="mx-auto w-full max-w-[1720px]">
        <div className="mb-8 flex items-center justify-between gap-4 t-micro text-gray-400 md:mb-12">
          <span>ARCHIVE / 004</span>
          <span className="text-right">A NAME THAT STAYS WITH YOU</span>
        </div>

        <div
          role="heading"
          aria-level={2}
          aria-label={FULL}
          lang="te-Latn"
          className="w-full text-center font-regular uppercase leading-[0.88] tracking-[-0.055em] text-ink text-[clamp(36px,7.1vw,132px)]"
        >
          <div
            data-drift="a"
            aria-hidden="true"
            className="flex flex-wrap justify-center gap-x-[0.24em]"
          >
            {LINE_1.map((word) => (
              <Word key={word} text={word} />
            ))}
          </div>

          <div
            aria-hidden="true"
            className="my-[0.08em] flex flex-wrap items-center justify-center gap-x-[0.22em] gap-y-2"
          >
            {LINE_2A.map((word) => (
              <Word key={word} text={word} />
            ))}

            <span
              data-img
              className="relative mx-[0.06em] inline-block aspect-[4/5] h-[clamp(108px,14.5vw,232px)] shrink-0 overflow-hidden bg-[#efefef]"
            >
              <span data-par className="absolute inset-x-0 -top-[6%] block h-[112%] w-full">
                <span data-img-in className="relative block h-full w-full">
                  <Image
                    src={PORTRAIT}
                    alt="Sandeep Reddy Vanga"
                    fill
                    sizes="(min-width: 768px) 16vw, 108px"
                    className="object-cover object-center"
                  />
                </span>
              </span>
            </span>

            {LINE_2B.map((word) => (
              <Word key={word} text={word} />
            ))}
          </div>

          <div
            data-drift="c"
            aria-hidden="true"
            className="flex justify-center overflow-hidden py-[0.1em] -my-[0.1em] text-[1.42em] leading-[0.88]"
            style={{ color: RED }}
          >
            <Word text="Po" />
            {[0, 1, 2].map((i) => (
              <span key={i} data-bang className="inline-block will-change-transform">
                !
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 t-micro text-gray-400 md:mt-12 md:flex-row">
          <span>AN INDEPENDENT FILMMAKER ARCHIVE</span>
          <span>NOT MADE TO FIT IN. MADE TO LEAVE A MARK.</span>
        </div>
      </div>
    </section>
  );
}
