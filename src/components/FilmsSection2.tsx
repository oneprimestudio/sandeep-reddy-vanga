"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useGSAP, gsap, ScrollTrigger } from "@/lib/gsap";
import { FILMS } from "@/data/films";
import Text from "./Text";
import { Timecode } from "./HeroMicro";
import { HoverLine } from "./HoverLink";
import OrbitGallery, { type OrbitState } from "./OrbitGallery";
import FilmDrawer from "./FilmDrawer";

const SRCS = FILMS.map((f) => f.src);
const N = FILMS.length;
const pad = (n: number) => String(n).padStart(2, "0");

/** masked line for the film info block: rolls up/out from behind its own edge */
function Mk({ children }: { children: ReactNode }) {
  return (
    <span className="block overflow-hidden py-[0.08em] -my-[0.08em]">
      <span data-meta className="block will-change-transform">
        {children}
      </span>
    </span>
  );
}

export default function FilmsSection2() {
  const rootRef = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const yearRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const onIndexRef = useRef<(i: number) => void>(() => {});
  const dirty = useRef(false);
  const swapped = useRef(false);

  const [active, setActive] = useState(0); // film nearest to the front
  const [shown, setShown] = useState(0); // film whose info is on screen
  const [open, setOpen] = useState(false);
  const [drawerIdx, setDrawerIdx] = useState(0);

  // shared with the three.js scene (read every frame)
  const state = useRef<OrbitState>({
    hover: 0,
    armed: false,
    dragging: false,
    moved: false,
    locked: false,
  });

  const openDrawer = () => {
    setDrawerIdx(active);
    state.current.locked = true;
    setOpen(true);
  };
  const closeDrawer = () => {
    state.current.locked = false;
    setOpen(false);
  };

  useEffect(() => {
    const onOpenFilm = (e: any) => {
      const idx = e.detail?.index;
      if (typeof idx === "number" && idx >= 0 && idx < N) {
        setDrawerIdx(idx);
        state.current.locked = true;
        setOpen(true);
      }
    };
    window.addEventListener("open-film-drawer", onOpenFilm);
    return () => window.removeEventListener("open-film-drawer", onOpenFilm);
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Start the entrance when the section comes in (spin starts after it)
      ScrollTrigger.create({
        trigger: root,
        start: "top 70%",
        once: true,
        onEnter: () => {
          state.current.armed = true;
        },
      });

      // Film info (bottom-right): masked entrance
      if (!reduced) {
        gsap.from("[data-meta]", {
          yPercent: 110,
          duration: 1.2,
          ease: "expo.out",
          stagger: 0.03,
          scrollTrigger: { trigger: root, start: "top 60%", once: true },
        });
      }

      // Caption: masked roll (same language as the hero narration)
      const roll = (el: HTMLElement | null, text: string) => {
        if (!el) return;
        if (reduced) {
          el.textContent = text;
          return;
        }
        gsap.killTweensOf(el);
        gsap.to(el, {
          yPercent: -110,
          duration: 0.35,
          ease: "expo.in",
          onComplete: () => {
            el.textContent = text;
            gsap.fromTo(
              el,
              { yPercent: 110 },
              { yPercent: 0, duration: 0.8, ease: "expo.out" }
            );
          },
        });
      };

      let capShown = 0;
      onIndexRef.current = (i: number) => {
        if (i === capShown) return;
        capShown = i;
        const f = FILMS[i];
        if (counterRef.current)
          counterRef.current.textContent = `${pad(i + 1)} / ${pad(N)}`;
        roll(titleRef.current, f.title);
        roll(yearRef.current, f.year);
        btnRef.current?.setAttribute("aria-label", `${f.title} (${f.year}): open details`);
        setActive(i);
      };

      // CUSTOM CURSOR (fine pointers only): "Drag" / "View" / pressed
      let offCursor = () => {};
      if (window.matchMedia("(pointer: fine)").matches) {
        const cur = cursorRef.current;
        const bub = bubbleRef.current;
        const lab = labelRef.current;
        const btn = btnRef.current;
        if (cur && bub && lab && btn) {
          const ui = { inside: false, poster: false, down: false };
          gsap.set(bub, { scale: 0 });
          const qx = gsap.quickTo(cur, "x", { duration: 0.5, ease: "expo.out" });
          const qy = gsap.quickTo(cur, "y", { duration: 0.5, ease: "expo.out" });

          const paint = () => {
            const scale = !ui.inside ? 0 : ui.down ? 0.78 : ui.poster ? 1.25 : 1;
            const text = ui.down ? "" : ui.poster ? "View" : "Drag";
            if (lab.textContent !== text) lab.textContent = text;
            gsap.to(bub, { scale, duration: 0.6, ease: "expo.out", overwrite: true });
          };

          const onMove = (e: PointerEvent) => {
            qx(e.clientX);
            qy(e.clientY);
          };
          const onEnter = (e: PointerEvent) => {
            gsap.set(cur, { x: e.clientX, y: e.clientY }); // no fly-in from (0,0)
            ui.inside = true;
            paint();
          };
          const onLeave = () => {
            ui.inside = false;
            ui.down = false;
            paint();
          };
          const onDown = () => {
            ui.down = true;
            paint();
          };
          const onUp = () => {
            if (!ui.down) return;
            ui.down = false;
            paint();
          };
          const onPosterIn = () => {
            ui.poster = true;
            paint();
          };
          const onPosterOut = () => {
            ui.poster = false;
            paint();
          };

          root.addEventListener("pointerenter", onEnter);
          root.addEventListener("pointermove", onMove, { passive: true });
          root.addEventListener("pointerleave", onLeave);
          root.addEventListener("pointerdown", onDown);
          window.addEventListener("pointerup", onUp);
          btn.addEventListener("pointerenter", onPosterIn);
          btn.addEventListener("pointerleave", onPosterOut);

          offCursor = () => {
            root.removeEventListener("pointerenter", onEnter);
            root.removeEventListener("pointermove", onMove);
            root.removeEventListener("pointerleave", onLeave);
            root.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointerup", onUp);
            btn.removeEventListener("pointerenter", onPosterIn);
            btn.removeEventListener("pointerleave", onPosterOut);
          };
        }
      }

      return () => {
        offCursor();
        onIndexRef.current = () => {};
        state.current.armed = false;
      };
    },
    { scope: rootRef }
  );

  /* FILM INFO SWAP: old text rolls out (up), then the new film's text rolls in */
  useEffect(() => {
    const root = metaRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = root.querySelectorAll("[data-meta]");

    if (active === shown) {
      if (dirty.current) {
        // changed our mind mid-roll: put the current text back
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
    const root = metaRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.fromTo(
      root.querySelectorAll("[data-meta]"),
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

  const film = FILMS[shown];

  return (
    <>
      <section
        id="films"
        ref={rootRef}
        style={{ "--pw": "clamp(110px, 10.5vw, 180px)" } as CSSProperties}
        className="relative flex h-[720px] md:h-screen select-none touch-pan-y flex-col justify-between overflow-hidden bg-white px-4 md:px-8 pt-[clamp(88px,11.6vh,140px)] pb-[20px] [@media(pointer:fine)]:cursor-none"
      >
        {/* THREE.JS: auto-spinning, draggable posters on the ring (inside view) */}
        <OrbitGallery
          srcs={SRCS}
          state={state.current}
          onIndex={(i) => onIndexRef.current(i)}
        />

        {/* Caption under the front poster (poster half-height = pw * 0.7) */}
        <div
          className="t-label pointer-events-none absolute left-1/2 z-10 flex w-[var(--pw)] -translate-x-1/2 justify-between text-ink"
          style={{ top: "calc(50% + var(--pw) * 0.7 + 10px)" }}
        >
          <span className="block overflow-hidden py-[0.1em] -my-[0.1em]">
            <span ref={titleRef} className="block">
              {FILMS[0].title}
            </span>
          </span>
          <span className="block overflow-hidden py-[0.1em] -my-[0.1em]">
            <span ref={yearRef} className="block tabular-nums text-gray-500">
              {FILMS[0].year}
            </span>
          </span>
        </div>

        {/* Front poster: click opens the drawer. A drag never counts as a click. */}
        <button
          ref={btnRef}
          type="button"
          aria-label={`${FILMS[0].title} (${FILMS[0].year}): open details`}
          onClick={() => {
            if (state.current.moved) return;
            openDrawer();
          }}
          onPointerEnter={() => (state.current.hover = 1)}
          onPointerLeave={() => (state.current.hover = 0)}
          onFocus={() => (state.current.hover = 1)}
          onBlur={() => (state.current.hover = 0)}
          className="absolute left-1/2 top-1/2 z-20 aspect-[5/7] w-[var(--pw)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:cursor-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#d92626]"
        />

        <ul className="sr-only">
          {FILMS.map((f) => (
            <li key={f.title}>
              {f.title} ({f.year})
            </li>
          ))}
        </ul>

        {/* HEADER: cols 1-3 */}
        <div className="pointer-events-none relative z-10 grid grid-cols-4 md:grid-cols-12 gap-x-3">
          <div className="col-span-4 md:col-span-3">
            <Text variant="slideUp" delay={0}>
              <h2 className="t-title text-left font-medium text-ink">Cinema without compromise.</h2>
            </Text>
            <div className="mt-[10px] max-w-[92%]">
              <Text variant="slideUp" delay={0.1}>
                <p className="t-body text-left leading-[0.9] text-gray-700 text-pretty">
                  Love has no limits. Anger has no language. And obsession… has no
                  off switch.
                </p>
              </Text>
            </div>
          </div>
        </div>

        {/* BOTTOM GROUP: film info (right) + micro strip */}
        <div className="relative z-10 flex flex-col gap-[20px]">
          {/* FILM INFO: stars + crew micro rows, description, link (cols 10-12) */}
          <div ref={metaRef} className="hidden md:grid grid-cols-12 gap-x-3">
            <div className="col-start-10 col-span-3">
              <dl className="t-micro">
                {film.micro.map((r) => (
                  <div
                    key={r.role}
                    className="grid grid-cols-3 gap-x-3 border-t border-black/15 py-[6px]"
                  >
                    <dt className="text-gray-500">
                      <Mk>{r.role}</Mk>
                    </dt>
                    <dd className="col-span-2 text-ink">
                      <Mk>{r.names}</Mk>
                    </dd>
                  </div>
                ))}
              </dl>
              

              <div className="mt-[20px]">
                <Text
                  key={film.title}
                  variant="slideUp"
                  animateOnScroll={!swapped.current}
                  scrollStart="top 70%"
                  stagger={0.06}
                  duration={0.85}
                >
                  <p className="t-body text-pretty text-gray-700">
                    {film.short}
                  </p>
                </Text>
              </div>

              <button
                type="button"
                onClick={openDrawer}
                className="t-micro mt-[10px] text-ink"
              >
                <HoverLine mode="draw">(View details)</HoverLine>
              </button>
            </div>
          </div>

          <p className="t-micro text-center text-gray-500 md:hidden">
            (Tap the poster for details)
          </p>

          {/* MICRO STRIP: same edges as hero + story (md+) */}
          <div className="t-micro pointer-events-none hidden md:grid grid-cols-12 gap-x-3 items-end text-gray-500">
            <div className="col-span-4 text-left">
              <Text variant="slideUp" delay={0}>
                <span className="block text-left">(03) Filmography</span>
              </Text>
            </div>

            <div className="col-start-5 col-span-4 grid grid-cols-3">
              <div className="text-left">
                <Text variant="slideUp" delay={0.06}>
                  <span className="block text-left">Scene 03</span>
                </Text>
              </div>
              <div className="text-center">
                <Text variant="slideUp" delay={0.12}>
                  <span className="block text-center">
                    <Timecode />
                  </span>
                </Text>
              </div>
              <div className="text-right">
                <Text variant="slideUp" delay={0.18}>
                  <span className="block text-right">Take 01</span>
                </Text>
              </div>
            </div>

            <div className="col-start-10 col-span-3 text-right">
              <Text variant="slideUp" delay={0.24}>
                <span ref={counterRef} className="block text-right tabular-nums">
                  01 / {pad(N)}
                </span>
              </Text>
            </div>
          </div>
        </div>

        {/* CUSTOM CURSOR (mouse only). Position on the outer div, scale on the bubble */}
        <div
          ref={cursorRef}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[60] hidden [@media(pointer:fine)]:block"
        >
          <div
            ref={bubbleRef}
            className="t-micro -ml-[36px] -mt-[36px] grid size-[72px] place-items-center rounded-full bg-[#d92626] text-white"
          >
            <span ref={labelRef}>Drag</span>
          </div>
        </div>
      </section>

      {/* DRAWER: lives outside the section, so drag/cursor handlers never see its events */}
      <FilmDrawer
        film={FILMS[drawerIdx]}
        index={drawerIdx}
        total={N}
        open={open}
        onClose={closeDrawer}
      />
    </>
  );
}