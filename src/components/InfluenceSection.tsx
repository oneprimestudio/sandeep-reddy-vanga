"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP, gsap, MASK_EASE } from "@/lib/gsap";
import Text from "./Text";

const MASK_FROM = "inset(28% 28% 28% 28% round 24px)";
const MASK_TO = "inset(0% 0% 0% 0% round 0px)";

export default function InfluenceSection() {
  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const card = cardRef.current;
      const mask = maskRef.current;
      const drift = driftRef.current;
      const settle = settleRef.current;
      if (!card || !mask || !drift || !settle) return;

      // Image masking entrance: card frame expands outward like in projects section
      gsap
        .timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 80%",
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
          { scale: 1.14, duration: 1.6, ease: "expo.out" },
          0
        );

      // Image parallax on scroll: image drifts through its crop
      gsap.fromTo(
        drift,
        { yPercent: -8 },
        {
          yPercent: 8,
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

  return (
    <section
      ref={rootRef}
      className="relative py-16 md:py-28 px-4 md:px-8 border-b border-black/10"
    >
      <div className="mx-auto max-w-[1720px]">
        {/* Section Heading: THE INFLUENCE BEHIND THE FRAME */}
        <div className="text-center mb-10 md:mb-16">
          <Text variant="slideUp" scrollStart="top 85%">
            <h2 className="vanga-h1 tracking-[0.08em] md:tracking-[0.14em] uppercase text-ink font-normal">
              THE INFLUENCE BEHIND THE FRAME
            </h2>
          </Text>
        </div>

        {/* Frame Container on 12-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-6 md:gap-x-6 items-end">
          
          {/* Vertical Actor Label on Left */}
          <div className="hidden md:flex md:col-span-1 md:col-start-3 items-end justify-end pb-4">
            <span className="vanga-label font-normal text-ink-muted -rotate-90 origin-bottom-right translate-x-2 select-none tracking-widest uppercase">
              Actor
            </span>
          </div>

          {/* Main Frame (Rudraveena Chiranjeevi) with Masking & Parallax */}
          <div
            ref={cardRef}
            className="col-span-1 md:col-span-6 flex flex-col items-center mx-auto w-full max-w-[580px]"
          >
            {/* The masked frame */}
            <div
              ref={maskRef}
              className="relative w-full aspect-[4/5] overflow-hidden rounded-sm shadow-2xl bg-[#1a1a1a]"
            >
              {/* Drift layer for parallax */}
              <div
                ref={driftRef}
                className="absolute inset-x-0 -top-[12%] w-full h-[124%] will-change-transform"
              >
                {/* Settle layer for scale zoom-out */}
                <div ref={settleRef} className="relative w-full h-full">
                  <Image
                    src="/images/chiranjeevi-rudraveena.png"
                    alt="Konidela Chiranjeevi Garu - Rudraveena (1987)"
                    fill
                    sizes="(min-width: 1024px) 50vw, 95vw"
                    className="object-cover object-top contrast-115 grayscale hover:grayscale-0 transition-all duration-700"
                  />
                  {/* Gentle gradient for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Labels under the frame exactly as in Figma design */}
            <div className="w-full mt-4 flex items-start justify-between vanga-label font-normal text-ink">
              {/* Bottom Left Corner: Mega Star Konidela Chiranjeevi Garu */}
              <div className="flex flex-col">
                <span className="text-ink">Mega Star</span>
                <span className="text-ink-muted">Konidela Chiranjeevi Garu</span>
              </div>

              {/* Bottom Right Corner: Puli Raju Rudraveena (1987) */}
              <div className="flex flex-col text-right">
                <span className="text-ink">Puli Raju</span>
                <span className="text-ink-muted">Rudraveena (1987)</span>
              </div>
            </div>
          </div>

          {/* Empty right spacer column */}
          <div className="hidden md:block md:col-span-2" />
        </div>
      </div>
    </section>
  );
}
