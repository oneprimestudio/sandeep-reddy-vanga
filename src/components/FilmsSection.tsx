"use client";

import { useRef } from "react";
import { useGSAP, gsap, MASK_EASE, CARD_EASE, ONCE } from "@/lib/gsap";
import Text from "./Text";

const MASK_FROM = "inset(32% 32% 32% 32% round 24px)";
const MASK_TO = "inset(0% 0% 0% 0% round 0px)";

interface Film {
  title: string;
  year: string;
  role: string;
  actor: string;
  status: string;
  accent: string;
  synopsis: string;
  bgGradient: string;
}

const FILMS: Film[] = [
  {
    title: "ARJUN REDDY",
    year: "2017",
    role: "Director · Screenplay · Editor",
    actor: "Vijay Deverakonda, Shalini Pandey",
    status: "Cult Classic / Debut",
    accent: "#c92a2a",
    synopsis:
      "A fiercely unconventional romance exploring the raw, unfiltered descent and redemption of a gifted surgeon.",
    bgGradient: "linear-gradient(135deg, #1f1212 0%, #3d1414 50%, #0d0a0a 100%)",
  },
  {
    title: "KABIR SINGH",
    year: "2019",
    role: "Director · Screenplay",
    actor: "Shahid Kapoor, Kiara Advani",
    status: "All-Time Blockbuster",
    accent: "#d9480f",
    synopsis:
      "An unapologetic explosion of grief, anger, and obsessive passion that shattered box-office records across India.",
    bgGradient: "linear-gradient(135deg, #24140c 0%, #442010 50%, #0f0a07 100%)",
  },
  {
    title: "ANIMAL",
    year: "2023",
    role: "Director · Screenplay · Editor",
    actor: "Ranbir Kapoor, Rashmika Mandanna, Bobby Deol",
    status: "Global Phenomenon (₹915+ Cr)",
    accent: "#b02a37",
    synopsis:
      "A visceral, generational psychological crime epic exploring the savage lengths of an obsessive father-son relationship.",
    bgGradient: "linear-gradient(135deg, #190909 0%, #300e0e 50%, #0a0505 100%)",
  },
  {
    title: "SPIRIT",
    year: "Upcoming",
    role: "Director · Screenplay · Editor",
    actor: "Rebel Star Prabhas",
    status: "In Pre-Production",
    accent: "#364fc7",
    synopsis:
      "A raw, relentless cop thriller exploring the unyielding moral and psychological limits of institutional justice.",
    bgGradient: "linear-gradient(135deg, #0c1429 0%, #172554 50%, #060913 100%)",
  },
];

export default function FilmsSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el) return;

      const cards = el.querySelectorAll<HTMLElement>("[data-film-card]");
      cards.forEach((card) => {
        const mask = card.querySelector<HTMLElement>("[data-mask]");
        const settle = card.querySelector<HTMLElement>("[data-settle]");
        const drift = card.querySelector<HTMLElement>("[data-drift]");

        if (mask && settle) {
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
              { clipPath: MASK_TO, duration: 1.25, ease: MASK_EASE },
              0
            )
            .from(
              settle,
              { scale: 1.12, duration: 1.4, ease: "expo.out" },
              0
            );
        }

        if (drift) {
          gsap.fromTo(
            drift,
            { yPercent: -7 },
            {
              yPercent: 7,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );
        }
      });
    },
    { scope: rootRef }
  );

  return (
    <section
      id="films"
      ref={rootRef}
      className="relative py-16 md:py-28 px-4 md:px-8 border-b border-black/10"
    >
      <div className="mx-auto max-w-[1720px]">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14 md:mb-20 pb-4 border-b border-black/10">
          <div>
            <span className="vanga-label font-normal text-ink-muted">
              [002] — Selected Filmography
            </span>
            <Text variant="slideUp" scrollStart="top 90%">
              <h2 className="vanga-h1 text-ink mt-2">
                Cinematic Body of Work
              </h2>
            </Text>
          </div>
          <p className="vanga-label text-ink-muted">
            Direction · Screenplay · Film Editing
          </p>
        </div>

        {/* Film Cards Grid adhering to oneprime hung wall technique */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
          {FILMS.map((film, i) => (
            <div
              key={film.title}
              data-film-card
              className="group flex flex-col justify-between"
            >
              {/* Masked Card Frame */}
              <div
                data-mask
                className="relative aspect-[3/4] overflow-hidden rounded-sm shadow-xl"
                style={{ background: film.bgGradient }}
              >
                {/* Drift layer for parallax */}
                <div
                  data-drift
                  className="absolute inset-x-0 -top-[10%] w-full h-[120%] will-change-transform flex items-center justify-center p-6 text-white"
                >
                  <div
                    data-settle
                    className="relative w-full h-full flex flex-col justify-between"
                  >
                    {/* Card Top Details */}
                    <div className="flex items-center justify-between text-xs tracking-widest uppercase opacity-75">
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <span>{film.year}</span>
                    </div>

                    {/* Card Center Title with cinematic branding */}
                    <div className="my-auto py-8">
                      <h3
                        className="vanga-h2 tracking-tight uppercase text-white font-medium"
                        style={{ color: film.year === "Upcoming" ? "#93c5fd" : "#fff" }}
                      >
                        {film.title}
                      </h3>
                      <p className="mt-2 text-[11px] md:text-[13px] text-white/70 tracking-wide font-light">
                        {film.actor}
                      </p>
                    </div>

                    {/* Card Bottom status tag */}
                    <div className="border-t border-white/15 pt-3">
                      <span className="text-[10px] md:text-[11px] tracking-wider uppercase text-white/80 font-mono">
                        {film.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information below frame */}
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <h4 className="vanga-label font-medium text-ink">
                    {film.title}
                  </h4>
                  <span className="vanga-label text-ink-muted">
                    {film.year}
                  </span>
                </div>
                <p className="vanga-label text-ink-muted text-[11px] md:text-[13px]">
                  {film.role}
                </p>
                <p className="mt-2 vanga-label text-ink/80 text-[13px] md:text-[14px] leading-relaxed line-clamp-3">
                  {film.synopsis}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
