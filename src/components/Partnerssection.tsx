"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useGSAP, gsap, ScrollTrigger, MASK_EASE } from "@/lib/gsap";
import { PARTNERS, BANNER, TIMELINE } from "../../data/Partners";
import Text from "./Text";
import { Timecode } from "./HeroMicro";
import PartnersLogo, { type LogoState, type LogoItem } from "./Partnerslogo";
import BhadrakaliStory, { STORY_STEPS } from "./BhadrakaliStory";
import ViewfinderCard from "./ViewfinderCard";
import LiquidImage from "./LiquidImage";

const MASK_FROM = "inset(30% 30% 30% 30% round 12px)";
const MASK_TO = "inset(0% 0% 0% 0% round 0px)";
const HERO_IMAGE = "/images/production/production-hero.jpg";

const ROW = "grid grid-cols-4 md:grid-cols-12 gap-x-3";
const pad = (n: number) => String(n).padStart(2, "0");

const ITEMS: LogoItem[] = PARTNERS.map((p) => ({
  src: p.logo,
  name: p.name,
  dark: !!p.dark,
}));

const STATS = [
  { to: 2, label: "Films released", sub: "Arjun Reddy, Animal" },
  { to: 5, label: "Languages", sub: "Animal, in one release" },
  { to: 1, label: "Next film", sub: "Spirit, with Prabhas" },
];

/* ink -> white, gray -> soft white, on the black hover */
const H = "md:group-hover:text-white md:group-focus-visible:text-white";
const H_SOFT = "md:group-hover:text-white/55 md:group-focus-visible:text-white/55";
const BLACK =
  "absolute inset-0 origin-bottom scale-y-0 bg-black transition-transform duration-[650ms] ease-[cubic-bezier(.16,1,.3,1)] md:group-hover:scale-y-100 md:group-focus-visible:scale-y-100";

/* ---------- smooth scroll to the story (Lenis if present) ---------- */
type Scroller = {
  scrollTo: (t: HTMLElement, o?: { offset?: number; duration?: number }) => void;
};
const isScroller = (x: unknown): x is Scroller =>
  !!x && typeof (x as Scroller).scrollTo === "function";
const findLenis = (): Scroller | undefined => {
  if (typeof window === "undefined") return undefined;
  const c = (window as unknown as { lenis?: unknown }).lenis as
    | { current?: unknown; lenis?: unknown }
    | undefined;
  if (isScroller(c)) return c;
  if (isScroller(c?.current)) return c.current;
  if (isScroller(c?.lenis)) return c.lenis;
  return undefined;
};
const goTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const l = findLenis();
  if (l) l.scrollTo(el, { offset: -80, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
};

/** Image stays visible as a fallback; LiquidImage adds the WebGL displacement layer. */
function ProductionImage({
  src,
  alt,
  sizes,
  variant = "noise-displacement",
}: {
  src: string;
  alt: string;
  sizes: string;
  variant?: "water" | "liquid-glass" | "prism" | "noise-displacement";
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-[#efefef] p-3 text-center">
        <span className="t-micro text-gray-400">Add image: {src}</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        onError={() => setFailed(true)}
        priority={src === HERO_IMAGE}
        className="z-0 object-cover object-center"
      />
      <LiquidImage
        src={src}
        variant={variant}
        strength={0.035}
        edge={0.55}
        className="absolute inset-0 z-[1] h-full w-full"
      />
    </div>
  );
}

export default function PartnersSection() {
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const heroMaskRef = useRef<HTMLDivElement>(null);
  const heroDriftRef = useRef<HTMLDivElement>(null);
  const heroSettleRef = useRef<HTMLDivElement>(null);

  // shared with the three.js scene (read every frame)
  const logo = useRef<LogoState>({ x: 0, y: 0, active: false, index: 0 });

  const onMove = (e: React.PointerEvent) => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    logo.current.x = e.clientX - r.left;
    logo.current.y = e.clientY - r.top;
  };
  const onEnter = (i: number) => {
    logo.current.index = i;
    logo.current.active = true;
  };
  const onLeave = () => {
    logo.current.active = false;
  };

  useGSAP(
    () => {
      const root = rootRef.current;
      const head = headRef.current;
      const card = heroCardRef.current;
      const mask = heroMaskRef.current;
      const drift = heroDriftRef.current;
      const settle = heroSettleRef.current;
      if (!root || !head || !card || !mask || !drift || !settle) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // main heading: masked line roll
        gsap.from("[data-line]", {
          yPercent: 110,
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.12,
          scrollTrigger: { trigger: head, start: "top 88%", once: true },
        });

        // hero image: mask opens, settles, drifts
        gsap
          .timeline({
            scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" },
          })
          .fromTo(mask, { clipPath: MASK_FROM }, { clipPath: MASK_TO, duration: 1.4, ease: MASK_EASE }, 0)
          .from(settle, { scale: 1.15, duration: 1.6, ease: "expo.out" }, 0);

        gsap.fromTo(
          drift,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
          }
        );

        // hairlines draw in as rows enter
        gsap.set("[data-rule]", { scaleX: 0 });
        ScrollTrigger.batch("[data-rule]", {
          start: "top 92%",
          once: true,
          onEnter: (els) =>
            gsap.to(els, { scaleX: 1, duration: 1.2, ease: "expo.out", stagger: 0.07 }),
        });

        // stat numbers count up
        root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
          const to = Number(el.dataset.to ?? 0);
          const o = { v: 0 };
          el.textContent = pad(0);
          gsap.to(o, {
            v: to,
            duration: 1.6,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
            onUpdate: () => {
              el.textContent = pad(Math.round(o.v));
            },
          });
        });

        // timeline stills: each opens like a shutter, one after the other
        root.querySelectorAll<HTMLElement>("[data-tl-image]").forEach((el, i) => {
          gsap.fromTo(
            el,
            { clipPath: "inset(50% 50% 50% 50% round 8px)" },
            {
              clipPath: "inset(0% 0% 0% 0% round 0px)",
              duration: 1.2,
              ease: MASK_EASE,
              delay: i * 0.08,
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            }
          );
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <section
      id="partners"
      ref={rootRef}
      onPointerMove={onMove}
      className="relative overflow-clip bg-white px-4 md:px-8 pt-24 md:pt-[60px] pb-20 md:pb-[120px]"
    >
      {/* THREE.JS: the logo card follows the hovered banner row */}
      <PartnersLogo items={ITEMS} state={logo.current} />

      <div className="relative z-10 mx-auto max-w-[1720px]">
        {/* EDITORIAL MICRO HEADER */}
        <div className="t-micro hidden md:grid grid-cols-12 gap-x-3 items-start text-gray-400">
          <div className="col-span-4">
            <Text variant="slideUp">
              <span>The banner behind the films</span>
            </Text>
          </div>
          <div className="col-start-5 col-span-6 grid grid-cols-3">
            <Text variant="slideUp" delay={0.06}>
              <span>Chapter 05</span>
            </Text>
            <Text variant="slideUp" delay={0.12}>
              <span className="text-center block">
                <Timecode />
              </span>
            </Text>
            <Text variant="slideUp" delay={0.18}>
              <span className="text-right block">Production</span>
            </Text>
          </div>
          <div className="col-start-10 col-span-3 text-right">
            <Text variant="slideUp" delay={0.24}>
              <span>(08) The House</span>
            </Text>
          </div>
        </div>

        {/* MAIN HEADING */}
        <div className="mt-14 md:mt-[80px]">
          <Text variant="slideUp">
            <div className="t-label mb-4 flex items-baseline gap-3">
              <span className="text-gray-400">(08)</span>
              <span className="text-ink">The Production House</span>
            </div>
          </Text>

          <div className="grid grid-cols-1 gap-y-4 md:grid-cols-[1fr_minmax(0,340px)_1fr] md:items-end md:gap-x-6">
            {/* Production image + title */}
            <div className="flex min-w-0 items-end gap-3 md:gap-4">
              <div className="mb-[0.12em] w-[48px] shrink-0 overflow-hidden bg-[#efefef] md:w-[98px]">
                <LiquidImage
                  src="/images/production/bhadrakali.png"
                  className="block h-auto w-full object-cover"
                />
              </div>

              <h2 ref={headRef} className="t-display min-w-0 text-ink uppercase">
                <span className="block overflow-hidden py-[0.08em] -my-[0.08em]">
                  <span data-line className="block text-left will-change-transform">
                    Bhadrakali Pictures
                  </span>
                </span>
              </h2>
            </div>

            <div className="order-last md:order-none md:pb-[0.6em]">
              <Text variant="slideUp" delay={0.15}>
                <p className="t-micro mx-auto max-w-[340px] text-center capitalize tracking-normal text-gray-500 text-balance">
                  A family banner, from a debut nobody would fund to a
                  five-language release.
                </p>
              </Text>
            </div>

            <span className="t-display block overflow-hidden py-[0.08em] -my-[0.08em] text-ink uppercase">
              <span data-line className="block text-right will-change-transform">
                (Since 2017)
              </span>
            </span>
          </div>
        </div>

        {/* MAIN DESCRIPTION */}
        <div className={`${ROW} gap-y-4 mt-6 md:mt-[28px]`}>
          <div className="col-span-4 md:col-span-4 md:col-start-3">
            <Text variant="slideUp" delay={0.1}>
              <p className="t-body text-left text-gray-700 text-pretty">
                Bhadrakali Pictures is the Vanga family&apos;s production
                house. Pranay Reddy Vanga produces, Sandeep writes and
                directs, and together they made Arjun Reddy and Animal. Below,
                how it started, who runs it and what comes next.
              </p>
            </Text>
          </div>
          <div className="col-span-4 md:col-span-3 md:col-start-10 t-micro md:text-right text-gray-400">
            <Text variant="slideUp" delay={0.18}>
              <span>(Scroll for the full story)</span>
            </Text>
          </div>
        </div>

        {/* HERO PRODUCTION IMAGE */}
        <div className={`${ROW} mt-12 md:mt-[64px]`}>
          <div ref={heroCardRef} className="col-span-4 md:col-span-10 md:col-start-3">
            <div
              ref={heroMaskRef}
              className="relative w-full aspect-[4/3] md:aspect-[21/9] overflow-hidden bg-[#efefef]"
            >
              <div
                ref={heroDriftRef}
                className="absolute inset-x-0 -top-[7.5%] h-[115%] w-full will-change-transform"
              >
                <div ref={heroSettleRef} className="relative object-top h-full w-full">
                  <ProductionImage
                    src={HERO_IMAGE}
                    alt="On set during production"
                    sizes="(min-width: 768px) 80vw, 100vw"
                    variant="liquid-glass"
                  />
                </div>
              </div>
            </div>
            <div className="t-micro mt-3 flex justify-between">
              <Text variant="slideUp">
                <div>
                  <span className="block text-ink">On set</span>
                  <span className="block text-gray-400">Production still</span>
                </div>
              </Text>
              <Text variant="slideUp" delay={0.06}>
                <div className="text-right">
                  <span className="block text-ink">The banner</span>
                  <span className="block text-gray-400">2017 to today</span>
                </div>
              </Text>
            </div>
          </div>
        </div>


        {/* STATS */}
        <div className={`${ROW} mt-16 md:mt-[100px]`}>
          <div className="col-span-4 md:col-span-6 md:col-start-5 grid grid-cols-3 gap-x-3 gap-y-8 border-t border-black/15 pt-4">
            {STATS.map((s, i) => (
              <Text key={s.label} variant="slideUp" delay={i * 0.06}>
                <div>
                  <span
                    data-count
                    data-to={s.to}
                    className="block font-medium tabular-nums text-[clamp(44px,6vw,92px)] leading-[0.9] tracking-[-0.05em] text-ink"
                  >
                    {pad(s.to)}
                  </span>
                  <span className="t-label mt-3 block text-ink">{s.label}</span>
                  <span className="t-micro block text-gray-400">{s.sub}</span>
                </div>
              </Text>
            ))}
          </div>
        </div>

        {/* TIMELINE: a small 4:5 still for every step */}
        <div className={`${ROW} mt-12 md:mt-[72px]`}>
          <div className="col-span-4 md:col-span-2 md:col-start-3">
            <Text variant="slideUp">
              <div className="t-label flex items-baseline gap-3">
                <span className="text-gray-400">(08.2)</span>
                <span className="text-ink">The Timeline</span>
              </div>
            </Text>
          </div>

          <div className="col-span-4 mt-4 md:mt-0 md:col-span-7 md:col-start-5 grid grid-cols-4 gap-x-3 gap-y-8 border-t border-black/15 pt-3 md:grid-cols-6">
            {TIMELINE.map((t, i) => (
              <figure key={t.year} className="group">
                <div
                  data-tl-image
                  className="relative aspect-[4/5] w-full overflow-hidden bg-[#efefef]"
                >
                  <div className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] md:group-hover:scale-[1.06]">
                    <ProductionImage
                      src={t.image}
                      alt={`${t.year}: ${t.label}`}
                      sizes="(min-width: 768px) 12vw, 45vw"
                    />
                  </div>
                </div>
                <figcaption className="mt-3">
                  <Text variant="slideUp" delay={i * 0.05}>
                    <div className="t-micro">
                      <span className="block text-ink tabular-nums">{t.year}</span>
                      <span className="mt-1 block text-gray-500 text-pretty">{t.label}</span>
                    </div>
                  </Text>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* THE STORY + THE SLATE */}
        <article id={BANNER.id} className={`${ROW} gap-y-6 mt-24 md:mt-[140px] scroll-mt-24`}>
          <aside className="col-span-4 md:col-span-2 md:col-start-3">
            <div className="md:sticky md:top-[96px]">
              <Text variant="slideUp">
                <div className="t-label flex items-baseline gap-3">
                  <span className="text-gray-400">(09)</span>
                  <span className="text-ink">{BANNER.name}</span>
                </div>
              </Text>
              <div className="mt-4 hidden md:block">
                <Text variant="slideUp" delay={0.08}>
                  <div className="t-micro text-gray-400">
                    <span className="block text-ink">{BANNER.led}</span>
                    <span className="block">Since {BANNER.since}</span>
                    <span className="block tabular-nums">{pad(BANNER.films.length)} films</span>
                  </div>
                </Text>
              </div>

            </div>
          </aside>

          <div className="col-span-4 md:col-span-6 md:col-start-5 flex flex-col gap-10 md:gap-[72px]">

            {/* THE SLATE */}
            <div>
              <Text variant="slideUp">
                <div className="t-label mb-3 flex items-baseline gap-3">
                  <span className="text-gray-400">(09.{STORY_STEPS + 1})</span>
                  <span className="text-ink">The Slate</span>
                </div>
              </Text>
              {BANNER.films.map((f) => (
                <div key={f.title + f.year} className="group relative -mx-3 px-3 py-[10px]">
                  <span
                    data-rule
                    className="absolute inset-x-3 top-0 z-10 h-px origin-left bg-black/15"
                  />
                  <span aria-hidden className={BLACK} />
                  <div className="relative z-10 grid grid-cols-[72px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 md:grid-cols-[84px_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                    <span className={`t-label text-gray-400 transition-colors duration-500 ${H_SOFT}`}>
                      {f.year}
                    </span>
                    <h4 className={`font-medium tracking-[-0.04em] leading-[1] text-[clamp(17px,1.3vw,22px)] text-ink transition-colors duration-500 ${H}`}>
                      {f.title}
                    </h4>
                    <p className={`t-micro col-start-2 text-gray-500 transition-colors duration-500 md:col-start-auto ${H_SOFT}`}>
                      {f.lead}
                    </p>
                    <p className={`t-micro col-start-2 text-gray-400 transition-colors duration-500 md:col-start-auto md:text-right ${H_SOFT}`}>
                      {f.lang ?? "TBA"}
                    </p>
                  </div>
                </div>
              ))}
              <div className="relative h-px">
                <span data-rule className="absolute inset-0 origin-left bg-black/15" />
              </div>
            </div>
          </div>
        </article>

        {/* FOOTER STRIP */}
        <div className={`${ROW} mt-24 md:mt-[140px]`}>
          <div className="col-span-4 md:col-span-8 md:col-start-3 t-micro grid grid-cols-3 border-t border-black/15 pt-3 text-gray-500">
            <span className="text-left">Bhadrakali Pictures (2017 to today)</span>
            <span className="text-center">Scene 05</span>
            <span className="text-right">Film Maker Archives ©</span>
          </div>
        </div>
      </div>
    </section>
  );
}