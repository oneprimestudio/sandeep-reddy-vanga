"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useGSAP, gsap, ScrollTrigger, MASK_EASE } from "@/lib/gsap";
import Text from "./Text";
import LiquidImage from "./LiquidImage";

const MASK_FROM = "inset(30% 30% 30% 30% round 12px)";
const MASK_TO = "inset(0% 0% 0% 0% round 0px)";
const IRIS_FROM = "circle(0% at 50% 55%)"; // silent-film iris: each cut opens from a point
const IRIS_TO = "circle(85% at 50% 55%)";
const DIM = 0.28; // opacity of chapters that are not the current one
const pad = (n: number) => String(n).padStart(2, "0");

/* One chapter = one cut of the portrait + one huge word that rolls in the stage.
   `scale` / `origin` = how far the camera pushes in, and where (x% y%).
   Pass real stills via the `images` prop and each cut becomes a real cut. */
const STORY = [
  {
    tag: "(The wall)",
    mark: "No.",
    title: "Nobody would fund it",
    text: "He started writing Arjun Reddy in 2013 and spent about two years on the script. Then came four to five years of approaching producers, none of whom would finance it.",
    scale: 1,
    origin: "50% 50%",
  },
  {
    tag: "(The family)",
    mark: "Yes.",
    title: "A family banner",
    text: "His brother, Pranay Reddy Vanga, agreed to back it. Pranay and their father put in equal money, and the film was made under a new banner, Bhadrakali Pictures. The name comes from the goddess Bhadrakali; Vijay Deverakonda has pointed out that Vanga named his production house after her.",
    scale: 1.06,
    origin: "30% 35%",
  },
  {
    tag: "(Arjun Reddy)",
    mark: "2017",
    title: "The first film",
    text: "Arjun Reddy, written and directed by Sandeep and produced by Pranay, released on 25 August 2017. Its reported budget was about ₹4 to 5 crore.",
    scale: 1.035,
    origin: "70% 60%",
  },
  {
    tag: "(Animal)",
    mark: "×5",
    title: "Five languages, one release",
    text: "Animal, produced by Pranay Reddy Vanga's Bhadrakali Pictures, released on 1 December 2023 in Hindi, Telugu, Tamil, Kannada and Malayalam. It went on to become the highest-grossing A-rated Indian film.",
    scale: 1.07,
    origin: "55% 28%",
  },
  {
    tag: "(What's next)",
    mark: "Next.",
    title: "Backing new voices",
    text: "The banner now backs others too. Variety India reported three low-budget films with newcomers under Bhadrakali Pictures, and Sandeep presents Romanchakam, produced by Pranay. Pranay says the approach stays careful planning and tight spending, and that Sandeep writes slowly, so nothing is rushed.",
    scale: 1.045,
    origin: "40% 75%",
  },
];

/** (09.x) "On the Record" + the slate row that follows it */
export const STORY_STEPS = STORY.length + 1;

const FACTS = [
  { k: "Banner", v: "Bhadrakali Pictures" },
  { k: "Producer", v: "Pranay Reddy Vanga" },
  { k: "With", v: "Prabhakar Reddy Vanga (father)" },
  { k: "First film", v: "Arjun Reddy, 25 Aug 2017" },
  { k: "Animal", v: "1 Dec 2023, in five languages" },
  { k: "Next", v: "Spirit, with Prabhas" },
];

/** Base image plus a WebGL displacement overlay; the base remains visible if WebGL is unavailable. */
function Still({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
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
        className="z-0 object-cover object-center"
      />
      <LiquidImage
        src={src}
        variant="noise-displacement"
        strength={0.045}
        edge={0.65}
        className="absolute inset-0 z-[1] h-full w-full"
      />
    </div>
  );
}

export default function BhadrakaliStory({
  idx,
  image,
  images,
}: {
  idx: string; // "09": the dossier number
  image: string; // fallback still (the partner's own image)
  images?: string[]; // optional: one still per chapter
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const progRef = useRef<HTMLSpanElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const frame = frameRef.current;
      const list = listRef.current;
      const prog = progRef.current;
      if (!root || !frame || !list || !prog) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      const layers = q("[data-layer]") as HTMLElement[];
      const frames = q("[data-frame]") as HTMLElement[];
      const chaps = q("[data-chap]") as HTMLElement[];
      const marks = q("[data-mark]") as HTMLElement[];
      const tagEl = tagRef.current;
      const countEl = countRef.current;

      // Keep the complete left stage (chapter word + image + caption) pinned
      // until the LAST chapter's final line reaches the bottom of the viewport.
      // Using the final chapter as endTrigger avoids releasing at the list/container
      // boundary before the visible "What's next" copy has finished scrolling.
      const stage = root.querySelector<HTMLElement>("[data-story-stage]");
      const finalChapter = list.querySelector<HTMLElement>("[data-chap]:last-child");

      if (
        !reduced &&
        stage &&
        finalChapter &&
        window.matchMedia("(min-width: 768px)").matches
      ) {
        ScrollTrigger.create({
          trigger: stage,
          start: "top 112px",
          endTrigger: finalChapter,
          end: "bottom +=2%",
          pin: stage,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: 1,
        });
      }

      gsap.set(frames, {
        scale: (i: number) => STORY[i].scale,
        transformOrigin: (i: number) => STORY[i].origin,
      });
      gsap.set(marks, { yPercent: (i: number) => (i === 0 ? 0 : 110) });
      if (!reduced) gsap.set(chaps, { opacity: (i: number) => (i === 0 ? 1 : DIM) });

      // caption: masked roll
      const roll = (el: HTMLElement, text: string) => {
        if (reduced) {
          el.textContent = text;
          return;
        }
        gsap.killTweensOf(el);
        gsap.to(el, {
          yPercent: -110,
          duration: 0.3,
          ease: "expo.in",
          onComplete: () => {
            el.textContent = text;
            gsap.fromTo(el, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "expo.out" });
          },
        });
      };

      let cur = 0;
      const setActive = (i: number) => {
        if (i === cur) return;
        const prev = cur;
        cur = i;

        if (countEl) countEl.textContent = `${pad(i + 1)} / ${pad(STORY.length)}`;
        if (tagEl) roll(tagEl, STORY[i].tag);

        gsap.killTweensOf([...layers, ...frames, ...marks]);

        // THE PORTRAIT: the new cut irises open over the old one
        layers.forEach((l, k) => {
          if (k === i) gsap.set(l, { autoAlpha: 1, zIndex: 2 });
          else if (k === prev) gsap.set(l, { autoAlpha: 1, zIndex: 1, clipPath: IRIS_TO });
          else gsap.set(l, { autoAlpha: 0, zIndex: 0 });
        });

        // THE WORD: the old verdict rolls out, the new one rolls in
        marks.forEach((m, k) => {
          if (k !== i && k !== prev) gsap.set(m, { yPercent: 110 });
        });

        // THE FOCUS: only the current chapter is fully lit
        if (!reduced) {
          chaps.forEach((c, k) =>
            gsap.to(c, { opacity: k === i ? 1 : DIM, duration: 0.5, overwrite: true })
          );
        }

        if (reduced) {
          gsap.set(layers[i], { clipPath: IRIS_TO });
          gsap.set(layers[prev], { autoAlpha: 0 });
          gsap.set(frames[i], { scale: STORY[i].scale });
          gsap.set(marks[prev], { yPercent: -110 });
          gsap.set(marks[i], { yPercent: 0 });
          return;
        }

        gsap.to(marks[prev], { yPercent: -110, duration: 0.5, ease: "expo.in" });
        gsap.fromTo(
          marks[i],
          { yPercent: 110 },
          { yPercent: 0, duration: 0.9, ease: "expo.out", delay: 0.25 }
        );

        gsap.fromTo(
          layers[i],
          { clipPath: IRIS_FROM },
          {
            clipPath: IRIS_TO,
            duration: 1.3,
            ease: MASK_EASE,
            onComplete: () => {
              gsap.set(layers[prev], { autoAlpha: 0 });
            },
          }
        );
        gsap.fromTo(
          frames[i],
          { scale: STORY[i].scale * 1.14 },
          { scale: STORY[i].scale, duration: 1.5, ease: "expo.out" }
        );
      };

      chaps.forEach((el) => {
        const i = Number(el.dataset.chap);
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        });
      });

      // the red thread: fills as the story is read
      if (reduced) {
        gsap.set(prog, { scaleY: 1 });
      } else {
        gsap.fromTo(
          prog,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: list, start: "top 60%", end: "bottom 60%", scrub: true },
          }
        );

        // first appearance of the portrait
        gsap
          .timeline({ scrollTrigger: { trigger: frame, start: "top 85%", once: true } })
          .fromTo(frame, { clipPath: MASK_FROM }, { clipPath: MASK_TO, duration: 1.4, ease: MASK_EASE }, 0)
          .from(frames[0], { scale: STORY[0].scale * 1.15, duration: 1.6, ease: "expo.out" }, 0);
      }
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="flex flex-col gap-12 md:gap-[72px]">
      {/* PULL LINE: the story in two breaths */}
      <Text variant="slideUp">
        <p className="font-regular text-[clamp(24px,2.4vw,40px)] leading-[1.02] tracking-[-0.045em] text-pretty">
          <span className="block text-gray-400">A script nobody would fund.</span>
          <span className="block text-ink">
            A brother who said <span className="text-[#d92626]">yes.</span>
          </span>
        </p>
      </Text>

      <div className="grid grid-cols-6 items-start gap-x-3 gap-y-10">
        {/* STICKY STAGE: one huge word + the portrait + counter */}
        <div data-story-stage className="col-span-6 self-start md:col-span-3 md:self-start md:w-full">
          <div
            aria-hidden
            className="relative hidden h-[0.95em] overflow-hidden text-[clamp(52px,6vw,104px)] font-medium leading-[0.95] tracking-[-0.06em] text-ink md:block"
          >
            {STORY.map((s) => (
              <span
                key={s.mark}
                data-mark
                className="absolute inset-0 block whitespace-nowrap will-change-transform"
              >
                {s.mark}
              </span>
            ))}
          </div>

          <div
            ref={frameRef}
            className="relative mt-6 aspect-[4/5] w-full max-w-[min(100%,390px)] overflow-hidden bg-[#efefef]"
          >
            {STORY.map((s, i) => (
              <div
                key={s.title}
                data-layer
                className="absolute inset-0"
                style={i === 0 ? { zIndex: 2 } : { visibility: "hidden" }}
              >
                <div
                  data-frame
                  className="absolute inset-0 will-change-transform"
                  style={{ transform: `scale(${s.scale})`, transformOrigin: s.origin }}
                >
                  <Still
                    src={images?.[i] ?? image}
                    alt={i === 0 ? "Bhadrakali Pictures: production still" : ""}
                    sizes="(min-width: 768px) 16vw, 50vw"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="t-micro mt-[10px] flex w-full max-w-[min(100%,390px)] justify-between text-gray-500">
            <span className="block overflow-hidden">
              <span ref={tagRef} className="block">
                {STORY[0].tag}
              </span>
            </span>
            <span ref={countRef} className="tabular-nums">
              01 / {pad(STORY.length)}
            </span>
          </div>
        </div>

        {/* THE STORY: scrolls past the stage, one chapter lit at a time */}
        <div
          ref={listRef}
          className="relative col-span-6 flex flex-col gap-[22vh] md:col-span-3 md:gap-[30vh] md:pb-[12vh] md:pl-6"
        >
          <span aria-hidden className="absolute left-0 top-0 hidden h-full w-px bg-black/15 md:block" />
          <span
            ref={progRef}
            aria-hidden
            className="absolute left-0 top-0 hidden h-full w-px origin-top bg-[#d92626] md:block"
          />

          {STORY.map((s, i) => (
            <div key={s.title} data-chap={i} className="scroll-mt-24">
              <div data-rule className="h-px origin-left bg-black/15" />
              <div className="pt-3">
                {/* mobile has no sticky stage, so each chapter carries its own word */}
                <span
                  aria-hidden
                  className="mb-3 block text-[clamp(44px,12vw,64px)] font-medium leading-[0.95] tracking-[-0.06em] text-ink md:hidden"
                >
                  {s.mark}
                </span>
                <Text variant="slideUp">
                  <div className="t-label flex items-baseline gap-3">
                    <span className="tabular-nums text-gray-400">
                      ({idx}.{i + 1})
                    </span>
                    <span className="text-gray-400">{s.tag.replace(/[()]/g, "")}</span>
                  </div>
                </Text>
                <h3 className="mt-4 text-balance text-[clamp(22px,2vw,32px)] font-medium leading-[1] tracking-[-0.04em] text-ink">
                  {s.title}
                </h3>
                <div className="mt-4">
                  <Text variant="slideUp" delay={0.1}>
                    <p className="t-body leading-relaxed text-gray-600 text-pretty">{s.text}</p>
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ON THE RECORD */}
      <div>
        <Text variant="slideUp">
          <div className="t-label mb-3 flex items-baseline gap-3">
            <span className="text-gray-400">
              ({idx}.{STORY.length + 1})
            </span>
            <span className="text-ink">On the Record</span>
          </div>
        </Text>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          {FACTS.map((f) => (
            <div
              key={f.k}
              className="t-micro grid grid-cols-3 gap-x-3 border-t border-black/15 py-[6px]"
            >
              <span className="text-gray-500">{f.k}</span>
              <span className="col-span-2 font-medium text-ink">{f.v}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-black/15" />
        <p className="t-micro mt-3 text-gray-400">
          (Sources) Wikipedia (Arjun Reddy, Animal), Variety India, Hollywood Reporter India,
          Deccan Chronicle
        </p>
      </div>
    </div>
  );
}