
"use client";

import { useRef, type ReactNode } from "react";
import Image from "next/image";
import { useGSAP, gsap, MASK_EASE } from "@/lib/gsap";
import Text from "./Text";
import { Timecode } from "./HeroMicro";
import { HoverLine } from "./HoverLink";
import LiquidImage from "./LiquidImage";

const MASK_FROM = "inset(30% 30% 30% 30% round 12px)";
const MASK_TO = "inset(0% 0% 0% 0% round 0px)";

const ROW = "grid grid-cols-4 md:grid-cols-12 gap-x-3";

const FACTS = [
  { k: "Featured actor", v: "Konidela Chiranjeevi" },
  { k: "Film", v: "Aaradhana (1987)" },
  { k: "Character", v: "Puli Raju" },
  { k: "Section focus", v: "A frame that left an impression" },
] as const;


function Chapter({
  index,
  title,
  delay = 0,
  children,
}: {
  index: string;
  title: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-black/15 pt-3">
      <Text variant="slideUp" delay={delay}>
        <div className="t-label flex items-baseline gap-3">
          <span className="tabular-nums text-gray-400">({index})</span>
          <span className="text-ink">{title}</span>
        </div>
      </Text>

      <div className="mt-5">
        <Text variant="slideUp" delay={delay + 0.1}>
          <p className="t-body leading-relaxed text-gray-600 text-pretty">
            {children}
          </p>
        </Text>
      </div>
    </div>
  );
}

export default function StorySection() {
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const head = headRef.current;
      const card = cardRef.current;
      const mask = maskRef.current;
      const drift = driftRef.current;
      const settle = settleRef.current;

      if (!head || !card || !mask || !drift || !settle) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Editorial heading reveal
        gsap.from("[data-line]", {
          yPercent: 110,
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: head,
            start: "top 88%",
            once: true,
          },
        });

        // Small archival story image
        gsap.fromTo(
          "[data-story-image]",
          {
            clipPath: "inset(15% 15% 15% 15%)",
            scale: 1.08,
          },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            scale: 1,
            duration: 1.2,
            ease: MASK_EASE,
            scrollTrigger: {
              trigger: "[data-story-image]",
              start: "top 88%",
              once: true,
            },
          }
        );

        // Main influence image reveal
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
          .from(
            settle,
            { scale: 1.15, duration: 1.6, ease: "expo.out" },
            0
          );

        // Main image parallax
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
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <section
      id="about"
      ref={rootRef}
      className="relative bg-white px-4 md:px-8 pt-24 md:pt-[60px] pb-20 md:pb-[120px]"
    >
      <div className="mx-auto max-w-[1720px]">

        {/* EDITORIAL MICRO HEADER */}
        <div className="t-micro hidden md:grid grid-cols-12 gap-x-3 items-start text-gray-400">
          <div className="col-span-4">
            <Text variant="slideUp">
              <span>From Medicine to Motion Pictures</span>
            </Text>
          </div>

          <div className="col-start-5 col-span-6 grid grid-cols-3">
            <Text variant="slideUp" delay={0.06}>
              <span>Chapter 01</span>
            </Text>

            <Text variant="slideUp" delay={0.12}>
              <span className="text-center block">
                <Timecode />
              </span>
            </Text>

            <Text variant="slideUp" delay={0.18}>
              <span className="text-right block">Biography</span>
            </Text>
          </div>

          <div className="col-start-10 col-span-3 text-right">
            <Text variant="slideUp" delay={0.24}>
              <span>(02) Origin</span>
            </Text>
          </div>
        </div>

        {/* BEGINNING */}
        <div className={`${ROW} gap-y-6 md:mt-[100px]`}>
          <div className="col-span-4 md:col-span-2 md:col-start-3">
            <Text variant="slideUp">
              <div className="t-label flex items-baseline gap-3">
                <span className="text-gray-400">(01)</span>
                <span className="text-ink">The Beginning</span>
              </div>
            </Text>
          </div>

          <div className="col-span-4 md:col-span-6 md:col-start-5">
            <div className="flex flex-col sm:flex-row gap-5 md:gap-7 items-start">

              {/* SMALL VANGA PORTRAIT */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-about-drawer"))}
                data-story-image
                className="group relative shrink-0 w-[100px] sm:w-[112px] aspect-[3/4] overflow-hidden bg-[#efefef] cursor-pointer text-left"
                aria-label="Open Sandeep Reddy Vanga profile drawer"
              >
                <Image
                  src="/images/sandeep-reddy-vanga.jpg"
                  alt="Sandeep Reddy Vanga"
                  fill
                  sizes="(max-width: 640px) 100px, 112px"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              </button>

              {/* STORY */}
              <div className="flex-1">
                <Text variant="slideUp" delay={0.1}>
                  <p className="font-regular text-[16px] md:text-[22px] leading-[1.12] tracking-[-0.035em] text-ink text-pretty">
                    Every filmmaker has a beginning. His story began in{" "}
                    <span className="text-[#d92626]">
                      Warangal, Telangana
                    </span>
                    , where a young boy grew up surrounded by stories, cinema
                    and an imagination that would eventually find its own
                    language.
                  </p>
                </Text>

                <div className="mt-5 flex items-center gap-3">
                  <span className="t-micro text-gray-400 uppercase tracking-wider">
                    The early years
                  </span>
                  <span className="text-gray-300">·</span>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-about-drawer"))}
                    className="t-micro text-ink hover:text-[#d92626] transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <HoverLine mode="draw">View full dossier</HoverLine> →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LIFE CHAPTERS */}
        <div className={`${ROW} gap-y-10 mt-5 md:mt-[80px]`}>
          <div className="col-span-2 md:col-span-2 md:col-start-6">
            <Chapter index="02" title="A Different Destination">
              Like many Indian families, his first expected destination was
              medicine. He didn&apos;t secure the marks for MBBS, so he chose
              physiotherapy. But life had a different direction waiting for him.
            </Chapter>
          </div>

          <div className="col-span-2 md:col-span-2 md:col-start-9">
            <Chapter index="03" title="The Leap of Faith" delay={0.08}>
              He left the familiar path behind and travelled to Sydney to study
              filmmaking. A new environment, different cultures and countless
              films opened his eyes to the possibilities of cinema.
            </Chapter>
          </div>
        </div>

        {/* INFLUENCE HEADING */}
        <div className={`${ROW} gap-y-4 mt-24 md:mt-[160px]`}>
          <div className="col-span-4 md:col-span-2 md:col-start-3 md:pt-2">
            <Text variant="slideUp">
              <div className="t-micro md:t-label flex items-baseline gap-3">
                <span className="text-gray-400">(04)</span>
                <span className="text-ink ">The Influence</span>
              </div>
            </Text>
          </div>

          <h2
            ref={headRef}
            className="col-span-3 col-start-2 md:col-span-6 md:col-start-5 border-y-2 border-black/30 py-1 text-ink"
          >
            <span
              data-line
              className="block uppercase font-normal tracking-[-0.045em] leading-[0.95] text-[12px] md:text-[clamp(12px,18px,16px)] text-justify [text-align-last:justify] will-change-transform"
            >
              The Influence Behind the Frame
            </span>
          </h2>
        </div>

        {/* CHIRANJEEVI IMAGE */}
        <div className={`${ROW} mt-1`}>
          <div className="hidden md:flex md:col-start-4 items-end justify-end pr-1">
            <span
              aria-hidden
              className="t-micro text-gray-400 [writing-mode:vertical-rl] rotate-180"
            >
              Actor
            </span>
          </div>

          <div
            ref={cardRef}
            className="col-span-3 col-start-2 md:col-span-6 md:col-start-5"
          >
            <div
              ref={maskRef}
              className="relative w-full aspect-[4/5] overflow-hidden"
            >
              <div
                ref={driftRef}
                className="absolute inset-x-0 -top-[7.5%] h-[115%] w-full will-change-transform"
              >
                <div ref={settleRef} className="relative h-full w-full">
                  <LiquidImage
                    src="/images/chiranjeevi.png"
                    className="aspect-[4/5] w-full"
                    strength={0.055}
                    variant="water"
                    edge={0.22}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* IMAGE CAPTIONS */}
        <div className={`${ROW} mt-3 t-micro`}>
          <div className="col-span-2 md:col-span-3 md:col-start-5">
            <Text variant="slideUp">
              <div>
                <span className="block text-ink">Mega Star</span>
                <span className="block text-gray-400">
                  Konidela Chiranjeevi Garu
                </span>
              </div>
            </Text>
          </div>

          <div className="col-span-2 md:col-span-3 md:col-start-8 text-right">
            <Text variant="slideUp" delay={0.06}>
              <div>
                <span className="block text-ink">Puli Raju</span>
                <span className="block text-gray-400">
                  Aaradhana (1987)
                </span>
              </div>
            </Text>
          </div>
        </div>

        {/* WHY CHIRANJEEVI + THE FRAME */}
        <div className={`${ROW} gap-y-8 mt-10 md:mt-[48px]`}>
          <div className="col-span-2 md:col-span-3 md:col-start-5">
            <Chapter index="05" title="The Reason">
              For Sandeep Reddy Vanga, Chiranjeevi's influence goes beyond stardom. It is an admiration rooted in childhood in the performances, the energy and the expressions that made an impact long before he became a filmmaker.
            </Chapter>
          </div>

          <div className="col-span-2  md:col-span-3 md:col-start-8">
            <Chapter index="06" title="The Frame" delay={0.08}>
              The frame he chose captures Puli Raju from Aaradhana (1987). A fleeting moment, an intense expression, and a character that leaves an impression. For Sandeep, this is more than a photograph on an office wall. It is a reminder of a performance he considers unforgettable.
            </Chapter>
          </div>
        </div>

        {/* ON THE RECORD */}
        <div className={`${ROW} mt-16 md:mt-[88px]`}>
          <div className="col-span-4 md:col-span-6 md:col-start-5">
            <Text variant="slideUp">
              <div className="t-label mb-3 flex items-baseline gap-3">
                <span className="tabular-nums text-gray-400">(07)</span>
                <span className="text-ink">On the Record</span>
              </div>
            </Text>

            <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
              {FACTS.map((fact) => (
                <div
                  key={fact.k}
                  className="t-micro grid grid-cols-3 gap-x-3 border-t border-black/15 py-[9px]"
                >
                  <span className="text-gray-500">{fact.k}</span>
                  <span className="col-span-2 font-medium text-ink">{fact.v}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-black/15" />
            <p className="t-micro mt-3 text-gray-400">
              (Sources) Wikipedia (Aaradhana), Variety India, The Hollywood Reporter India,
              Deccan Chronicle
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
