"use client";

import { useRef, useState } from "react";
import { useGSAP, gsap, ScrollTrigger } from "@/lib/gsap";
import { FILMS } from "@/data/films";
import { AWARDS, WINS, NOMINATIONS, type Award } from "../../data/awards";
import Text from "./Text";
import { Timecode } from "./HeroMicro";
import AwardsPoster, { type PosterState } from "./AwardsPoster";
import AwardsDrawer from "./AwardsDrawer";

const ROW = "grid grid-cols-4 md:grid-cols-12 gap-x-3";
const pad = (n: number) => String(n).padStart(2, "0");

const SRCS = FILMS.map((f) => f.src);
const posterIndex = (film: string) => {
  const i = FILMS.findIndex((f) =>
    f.title.toLowerCase().includes(film.toLowerCase())
  );
  return i === -1 ? 0 : i;
};

const WON = AWARDS.filter((a) => a.result === "won");
const NOMS = AWARDS.filter((a) => a.result === "nominated");
const ALL = [...WON, ...NOMS]; // list order = drawer order

/* ink -> white, gray -> soft white, on the black hover */
const H = "md:group-hover:text-white md:group-focus-visible:text-white";
const H_SOFT = "md:group-hover:text-white/55 md:group-focus-visible:text-white/55";

/** One compact line: no description here, the drawer carries the story */
function AwardRow({
  item,
  onEnter,
  onOpen,
}: {
  item: Award;
  onEnter: (a: Award, e?: React.PointerEvent | React.FocusEvent) => void;
  onOpen: (a: Award) => void;
}) {
  const won = item.result === "won";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${item.award}, ${item.category}, ${item.film} (${item.year}): open details`}
      onPointerEnter={(e) => onEnter(item, e)}
      onFocus={(e) => onEnter(item, e)}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className="group relative -mx-3 cursor-pointer px-3 py-[10px] outline-none"
    >
      <span
        data-rule
        className="absolute inset-x-3 top-0 z-10 h-px origin-left bg-black/15 will-change-transform"
      />
      {/* THE BLACK: wipes up from the bottom edge */}
      <span
        aria-hidden
        className="absolute inset-0 origin-bottom scale-y-0 bg-black transition-transform duration-[650ms] ease-[cubic-bezier(.16,1,.3,1)] md:group-hover:scale-y-100 md:group-focus-visible:scale-y-100"
      />

      <div className="relative z-10 grid grid-cols-[64px_1fr] items-baseline gap-x-3 gap-y-1 md:grid-cols-[84px_1fr_auto]">
        <span
          className={`t-label tabular-nums text-gray-400 transition-colors duration-500 ${H_SOFT}`}
        >
          {item.year}
        </span>

        <div className="flex items-center justify-start gap-[0.5rem] md:gap-[4rem]">
          <h3
            className={`md:font-medium tracking-[-0.04em] leading-[1] text-[clamp(12px,1.02vw,26px)] text-ink transition-colors duration-500 ${H}`}
          >
            {item.award}
          </h3>
          <p
            className={`t-micro mt-[2px] text-gray-500 transition-colors duration-500 ${H_SOFT}`}
          >
            {item.category}
          </p>
        </div>

        <div className="col-start-2 flex items-baseline gap-3 t-micro md:col-start-auto md:flex-row md:items-end md:gap-[4rem]">
          <span
            className={`transition-colors duration-500 ${won ? "text-[#d92626]" : `text-gray-400 ${H_SOFT}`
              }`}
          >
            {won ? "Won" : "Nominated"}
          </span>
          <span className={`text-gray-500 transition-colors duration-500 ${H_SOFT}`}>
            {item.film}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AwardsSection() {
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const lockedRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [drawerIdx, setDrawerIdx] = useState(0);

  // shared with the three.js scene (read every frame)
  const poster = useRef<PosterState>({ x: 0, y: 0, active: false, index: 0 });

  const onMove = (e: React.PointerEvent) => {
    if (!poster.current.active) return;
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    poster.current.x = e.clientX - r.left;
    poster.current.y = e.clientY - r.top;
  };
  const onEnter = (a: Award, e?: React.PointerEvent | React.FocusEvent) => {
    if (lockedRef.current) return;
    poster.current.index = posterIndex(a.film);
    poster.current.active = true;
    if (e && "clientX" in e && rootRef.current) {
      const r = rootRef.current.getBoundingClientRect();
      poster.current.x = e.clientX - r.left;
      poster.current.y = e.clientY - r.top;
    }
  };
  const onLeave = () => {
    poster.current.active = false;
  };
  const openDrawer = (a: Award) => {
    lockedRef.current = true;
    poster.current.active = false;
    setDrawerIdx(Math.max(0, ALL.findIndex((x) => x.id === a.id)));
    setOpen(true);
  };
  const closeDrawer = () => {
    lockedRef.current = false;
    setOpen(false);
  };

  useGSAP(
    () => {
      const head = headRef.current;
      if (!head) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-line]", {
          yPercent: 110,
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.12,
          scrollTrigger: { trigger: head, start: "top 88%", once: true },
        });

        gsap.set("[data-rule]", { scaleX: 0 });
        ScrollTrigger.batch("[data-rule]", {
          start: "top 92%",
          once: true,
          onEnter: (els) =>
            gsap.to(els, {
              scaleX: 1,
              duration: 1.2,
              ease: "expo.out",
              stagger: 0.06,
            }),
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  const current = ALL[drawerIdx];

  return (
    <>
      <section
        id="awards"
        ref={rootRef}
        onPointerMove={onMove}
        className="relative overflow-hidden bg-white px-4 md:px-4 pt-24 md:pt-[60px] pb-20 md:pb-[100px]"
      >
        {/* THREE.JS: one poster that follows the hovered row */}
        <AwardsPoster srcs={SRCS} state={poster.current} />

        <div className="relative z-10 mx-auto max-w-[1720px]">
          {/* EDITORIAL MICRO HEADER */}
          <div className="t-micro hidden md:grid grid-cols-12 gap-x-3 items-start text-gray-400">
            <div className="col-span-4">
              <Text variant="slideUp">
                <span>Recognition, on the record</span>
              </Text>
            </div>
            <div className="col-start-5 col-span-6 grid grid-cols-3">
              <Text variant="slideUp" delay={0.06}>
                <span>Chapter 04</span>
              </Text>

              <Text variant="slideUp" delay={0.18}>
                <span className="text-right block">( Awards )</span>
              </Text>
            </div>
            <div className="col-start-10 col-span-3 text-right">
              <Text variant="slideUp" delay={0.24}>
                <span>(05) Honours</span>
              </Text>
            </div>
          </div>

          {/* MAIN HEADING */}
          <div className="mt-14 md:mt-[80px]">
            <Text variant="slideUp">
              <div className="t-label mb-4 flex items-baseline gap-3">
                <span className="text-gray-400">(05)</span>
                <span className="text-ink">The Awards</span>
              </div>
            </Text>

            <div className="grid grid-cols-1 gap-y-4 md:grid-cols-[1fr_minmax(0,340px)_1fr] md:items-end md:gap-x-6">
              {/* LEFT: title */}
              <h2 ref={headRef} className="t-display text-ink uppercase">
                <span className="block overflow-hidden py-[0.08em] -my-[0.08em]">
                  <span data-line className="block text-left will-change-transform">
                    Awards Earned
                  </span>
                </span>
              </h2>

              {/* CENTER: line, sits on the same baseline as the title */}
              <div className="order-last md:order-none md:pb-[0.6em]">
                <Text variant="slideUp" delay={0.15}>
                  <p className="t-micro mx-auto max-w-[380px] text-center capitalize tracking-normal text-gray-500 text-balance">
                    The win said he arrived. The nomination said he belonged in the main
                    race. They are not the same sentence, and he got both.
                  </p>
                </Text>
              </div>

              {/* RIGHT: years */}
              <span className="t-display block overflow-hidden py-[0.08em] -my-[0.08em] text-ink uppercase">
                <span data-line className="block text-right will-change-transform">
                  (2018&ndash;2024)
                </span>
              </span>
            </div>
          </div>

          {/* MAIN DESCRIPTION + TALLY */}
          <div className={`${ROW} gap-y-4 mt-6 md:mt-[28px] xl:mt-[48px] `}>
            <div className="col-span-4 md:col-span-4 md:col-start-5">
              <Text variant="slideUp" delay={0.1}>
                <p className="t-body text-left text-gray-700 text-pretty">
                  {pad(WINS)} wins and {pad(NOMINATIONS)} nominations across
                  SIIMA, Cinegoers, IIFA, Filmfare, Screen and the Dadasaheb
                  Phalke Awards, from the debut of Arjun Reddy to the edit of
                  Animal. Pick any line to open the full conversation.
                </p>
              </Text>
            </div>

            <div className="col-span-4 md:col-span-3 md:col-start-10 t-micro md:text-right">
              <Text variant="slideUp" delay={0.18}>
                <div>
                  <span className="block text-[#d92626] tabular-nums">
                    {pad(WINS)} Wins
                  </span>
                  <span className="block text-ink tabular-nums">
                    {pad(NOMINATIONS)} Nominations
                  </span>
                </div>
              </Text>
            </div>
          </div>

          {/* THE LIST: narrower, tighter */}
          <div className={`${ROW} mt-12 md:mt-[56px]`}>
            <div className="order-last md:order-none md:pb-[0.6em] xl:col-start-1 xl:col-span-2 ">
              <Text variant="slideUp" delay={0.15}>
                <p className="t-micro mx-auto max-w-[380px] text-center  tracking-normal text-gray-500 text-balance">
                  Three chairs at the table for one man. Direction, screenplay and edit all in the room at once. Being counted in every one of them says the whole film was seen, not just its noise.
                </p>
              </Text>
            </div>
            <div
              className="col-span-4 md:col-span-6 md:col-start-4 xl:col-start-5"
              onPointerLeave={onLeave}
            >
              <div className="t-micro pb-2 text-gray-400">Won</div>
              {WON.map((a) => (
                <AwardRow key={a.id} item={a} onEnter={onEnter} onOpen={openDrawer} />
              ))}

              <div className="t-micro pb-2 pt-10 text-gray-400">In the running</div>
              {NOMS.map((a) => (
                <AwardRow key={a.id} item={a} onEnter={onEnter} onOpen={openDrawer} />
              ))}

              <div className="relative h-px">
                <span data-rule className="absolute inset-0 origin-left bg-black/15" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DRAWER: outside the section so drag/hover handlers never see its events */}
      <AwardsDrawer
        award={current}
        film={FILMS[posterIndex(current.film)]}
        sameYear={AWARDS.filter((a) => a.year === current.year && a.id !== current.id)}
        index={drawerIdx}
        total={ALL.length}
        open={open}
        onClose={closeDrawer}
      />
    </>
  );
}