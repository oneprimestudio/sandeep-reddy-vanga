"use client";

import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { gsap } from "@/lib/gsap";
import { HoverLine } from "@/components/HoverLink";
import { type OrbitState } from "@/components/OrbitGallery";
import {
  DEFAULT_ORBIT_SETTINGS,
  type OrbitSettings,
} from "@/components/OrbitControls";

/* ───────────────────────── settings ───────────────────────── */

export type SpinStyle = "steady" | "breathe" | "surge" | "stutter" | "pendulum";

export type ProjectorSettings = OrbitSettings & {
  style: SpinStyle; // how the auto-spin speed behaves over time
  rhythm: number; // seconds per cycle of the spin style
  pauseOnHover: boolean; // stop auto-spin while the cursor is on the front poster
};

export const DEFAULT_PROJECTOR: ProjectorSettings = {
  ...DEFAULT_ORBIT_SETTINGS,
  style: "steady",
  rhythm: 8,
  pauseOnHover: false,
};

/* ⚠ Old OrbitControls lo unna min/max/step ki match cheyyi */
const RANGE = {
  autoSpeed: { min: 0.05, max: 1.5, step: 0.01 },
  rotateSpeed: { min: 0.2, max: 3, step: 0.05 },
  momentum: { min: 0, max: 0.98, step: 0.01 },
  rhythm: { min: 3, max: 20, step: 0.5 },
} as const;

const STYLES: { value: SpinStyle; label: string; hint: string }[] = [
  { value: "steady", label: "Steady", hint: "Constant speed, like a locked-off shot" },
  { value: "breathe", label: "Breathe", hint: "Slow in, slow out. A gentle swell" },
  { value: "surge", label: "Surge", hint: "Builds up, then eases off" },
  { value: "stutter", label: "Stutter", hint: "Stop-start, like a hand-cranked projector" },
  { value: "pendulum", label: "Pendulum", hint: "Swings forward, then back" },
];

const TAKES: {
  name: string;
  style: SpinStyle;
  a: number; // 0..1 across RANGE.autoSpeed
  r: number; // 0..1 across RANGE.rotateSpeed
  m: number; // 0..1 across RANGE.momentum
  rhythm: number;
}[] = [
  { name: "Calm", style: "breathe", a: 0.2, r: 0.4, m: 0.85, rhythm: 10 },
  { name: "Cinematic", style: "steady", a: 0.4, r: 0.5, m: 0.95, rhythm: 8 },
  { name: "Projector", style: "stutter", a: 0.5, r: 0.5, m: 0.5, rhythm: 6 },
  { name: "Frenzy", style: "surge", a: 0.9, r: 0.8, m: 0.3, rhythm: 4 },
];

const lerp = (r: { min: number; max: number }, t: number) =>
  r.min + (r.max - r.min) * t;
const rnd = (r: { min: number; max: number; step: number }) =>
  Math.round((r.min + Math.random() * (r.max - r.min)) / r.step) * r.step;
const pad = (n: number) => String(n).padStart(2, "0");

/* ───────────────────────── persistence ───────────────────────── */

const KEY = "orbit-projector-v1";

/** settings state that remembers itself (localStorage), SSR-safe */
export function useProjectorSettings() {
  const [s, setS] = useState<ProjectorSettings>(DEFAULT_PROJECTOR);
  const ready = useRef(false);

  // save (declared first so the initial mount never overwrites stored values)
  useEffect(() => {
    if (!ready.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s]);

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULT_PROJECTOR, ...JSON.parse(raw) });
    } catch {}
    ready.current = true;
  }, []);

  return [s, setS] as const;
}

/* ───────────────────────── driver ─────────────────────────
   Writes the settings into the three.js state EVERY FRAME, shaping the
   auto-spin speed/direction according to the chosen spin style.        */

export function useOrbitDriver(
  state: MutableRefObject<OrbitState>,
  settings: ProjectorSettings
) {
  const sRef = useRef(settings);
  sRef.current = settings;

  useEffect(() => {
    let t = 0;
    let speed = sRef.current.autoSpeed;

    const tick = (_time: number, dtMs: number) => {
      const s = sRef.current;
      const st = state.current;
      const dt = Math.min(dtMs, 64) / 1000;
      t += dt;

      const P = Math.max(2, s.rhythm);
      const w = (Math.PI * 2 * t) / P;

      let k = 1; // speed multiplier
      let flip = 1; // direction multiplier

      switch (s.style) {
        case "breathe":
          k = 0.55 + 0.45 * Math.sin(w);
          break;
        case "surge": {
          const x = (Math.sin(w) + 1) / 2;
          k = 0.15 + 0.85 * x * x * (3 - 2 * x); // smoothstep
          break;
        }
        case "stutter":
          k = Math.floor(t / (P / 6)) % 2 === 0 ? 1 : 0.08;
          break;
        case "pendulum": {
          const sn = Math.sin(w);
          flip = sn >= 0 ? 1 : -1;
          k = Math.max(0.05, Math.pow(Math.abs(sn), 0.7));
          break;
        }
        default:
          k = 1;
      }

      // smooth toward the target so every style feels eased, never jerky
      speed += (s.autoSpeed * k - speed) * Math.min(1, dt * 8);

      const base = Number(s.direction) === -1 ? -1 : 1;
      st.direction = (base * flip) as OrbitState["direction"];
      st.autoSpeed = speed;
      st.autoSpin = s.autoSpin && !(s.pauseOnHover && st.hover === 1);
      st.rotateSpeed = s.rotateSpeed;
      st.momentum = s.momentum;
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [state]);
}

/* ───────────────────────── UI bits ───────────────────────── */

function Section({ children }: { children: ReactNode }) {
  return (
    <p data-row className="pb-[5px] pt-[12px] text-gray-500 first:pt-[8px]">
      {children}
    </p>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      data-row
      className="grid grid-cols-[72px_1fr] items-start gap-x-3 border-t border-black/15 py-[9px]"
    >
      <dt className="pt-px text-gray-500">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

/** timeline-ruler slider: ticks, red playhead, counter */
function Ruler({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-[20px] flex-1">
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
        />
        <span
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[7px] -translate-y-1/2"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, rgba(0,0,0,0.28) 0 1px, transparent 1px 10%)",
            backgroundSize: "calc(100% + 1px) 100%",
          }}
        />
        <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/15" />
        <span
          className="pointer-events-none absolute left-0 top-1/2 h-px bg-[#d92626]"
          style={{ width: `${p}%` }}
        />
        <span
          className="pointer-events-none absolute top-1/2 h-[18px] w-px -translate-x-1/2 -translate-y-1/2 bg-[#d92626]"
          style={{ left: `${p}%` }}
        >
          <i className="absolute -top-[3px] left-1/2 size-[7px] -translate-x-1/2 rounded-full bg-[#d92626] transition-transform duration-300 peer-hover:scale-150" />
        </span>
      </div>
      <span className="min-w-[3.5ch] text-right tabular-nums text-gray-500">
        {format ? format(value) : pad(Math.round(p))}
      </span>
    </div>
  );
}

/** inline "select": click to open the list, pick an option, it closes */
function Select<T extends string | number>({
  value, options, onChange,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  const [o, setO] = useState(false);
  const cur = options.find((x) => x.value === value) ?? options[0];
  return (
    <div>
      <button
        type="button"
        aria-expanded={o}
        onClick={() => setO((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between text-ink"
      >
        <HoverLine mode="draw">{cur.label}</HoverLine>
        <span
          className={`text-gray-500 transition-transform duration-300 ${o ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
          o ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <ul className="min-h-0 overflow-hidden">
          {options.map((x, i) => (
            <li key={String(x.value)}>
              <button
                type="button"
                onClick={() => {
                  onChange(x.value);
                  setO(false);
                }}
                className={`block w-full cursor-pointer py-[5px] text-left transition-colors ${
                  x.value === value ? "text-[#d92626]" : "text-gray-500 hover:text-ink"
                }`}
              >
                <span className="block">
                  ({pad(i + 1)}) {x.label}
                </span>
                {x.hint && (
                  <span className="block text-[0.92em] leading-[1.15] text-gray-500/80">
                    {x.hint}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Choice<T extends string | number | boolean>({
  options, value, onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-x-2">
      {options.map((o, i) => (
        <span key={o.label} className="flex gap-x-2">
          {i > 0 && <span className="text-gray-500">/</span>}
          <button
            type="button"
            onClick={() => onChange(o.value)}
            className={`cursor-pointer transition-colors ${
              o.value === value ? "font-medium text-[#d92626]" : "text-gray-500 hover:text-ink"
            }`}
          >
            <HoverLine mode="draw">{o.label}</HoverLine>
          </button>
        </span>
      ))}
    </div>
  );
}

function Reel() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="1.6" fill="#d92626" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle
          key={a}
          cx="12"
          cy="5.6"
          r="2.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          transform={`rotate(${a} 12 12)`}
        />
      ))}
    </svg>
  );
}

/* ───────────────────────── panel ───────────────────────── */

export default function OrbitPanel({
  settings,
  onChange,
  hidden = false,
}: {
  settings: ProjectorSettings;
  onChange: (s: ProjectorSettings) => void;
  hidden?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [take, setTake] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLSpanElement>(null);
  const spd = useRef(0);
  const rot = useRef(0);
  const first = useRef(true);

  const flip = Number(settings.direction) === -1;
  spd.current = settings.autoSpin
    ? (flip ? -1 : 1) * (40 + settings.autoSpeed * 420)
    : 0;

  const set = (patch: Partial<ProjectorSettings>) => {
    setTake(null);
    onChange({ ...settings, ...patch });
  };

  /* reel icon spins with the orbit */
  useEffect(() => {
    const tick = (_t: number, dt: number) => {
      const el = reelRef.current;
      if (!el) return;
      rot.current += (spd.current * dt) / 1000;
      el.style.transform = `rotate(${rot.current}deg)`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) setOpen(false);
  }, []);

  /* open / close */
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = el.querySelectorAll("[data-row]");
    gsap.killTweensOf([el, rows]);
    if (open) {
      const delay = first.current ? 0.9 : 0;
      first.current = false;
      gsap.set(el, { display: "block" });
      gsap.fromTo(
        el,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: reduced ? 0 : 0.8,
          ease: "expo.out",
          delay,
          onComplete: () => gsap.set(el, { clearProps: "clipPath" }),
        }
      );
      gsap.fromTo(
        rows,
        { y: reduced ? 0 : 14, opacity: reduced ? 1 : 0 },
        {
          y: 0,
          opacity: 1,
          duration: reduced ? 0 : 0.9,
          ease: "expo.out",
          stagger: reduced ? 0 : 0.04,
          delay: delay + 0.1,
        }
      );
    } else {
      first.current = false;
      gsap.to(el, {
        clipPath: "inset(0 0 100% 0)",
        duration: reduced ? 0 : 0.4,
        ease: "expo.in",
        onComplete: () => gsap.set(el, { display: "none" }),
      });
    }
  }, [open]);

  /* S = toggle, Esc = close */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      if (e.key.toLowerCase() === "s") setOpen((o) => !o);
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fps = Math.round(settings.autoSpeed * 60);
  const styleName = STYLES.find((x) => x.value === settings.style)?.label ?? "";

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={`t-micro fixed right-4 top-[clamp(80px,10.5vh,130px)] z-40 w-[288px] transition-opacity duration-500 md:right-8 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* trigger */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between text-ink"
      >
        <span className="flex items-center gap-2">
          <span ref={reelRef} className="inline-block will-change-transform">
            <Reel />
          </span>
          <HoverLine mode="draw">{open ? "(Close projector)" : "(Projector)"}</HoverLine>
        </span>
        <span className="tabular-nums text-gray-500">
          {settings.autoSpin ? `${styleName} · ${pad(fps)} fps` : "Hold"}
        </span>
      </button>

      {/* panel */}
      <div
        ref={panelRef}
        style={{ display: "none" }}
        className="mt-[10px] max-h-[calc(100vh-230px)] overflow-y-auto overscroll-contain border border-black/15 bg-white/90 px-3 pb-3 backdrop-blur-sm"
      >
        <dl>
          <Section>(A) Motion</Section>

          <Row label="Spin">
            <Choice
              value={settings.autoSpin}
              onChange={(v) => set({ autoSpin: v })}
              options={[
                { label: "Auto", value: true },
                { label: "Hold", value: false },
              ]}
            />
          </Row>

          <Row label="Style">
            <Select<SpinStyle>
              value={settings.style}
              options={STYLES}
              onChange={(v) => set({ style: v })}
            />
          </Row>

          <Row label="Direction">
            <Select<number>
              value={flip ? -1 : 1}
              options={[
                { value: 1, label: "Clockwise", hint: "Forward reel" },
                { value: -1, label: "Anticlockwise", hint: "Rewind" },
              ]}
              onChange={(v) =>
                set({ direction: v as unknown as OrbitSettings["direction"] })
              }
            />
          </Row>

          <Row label="Tempo">
            <Ruler label="Tempo" {...RANGE.autoSpeed} value={settings.autoSpeed}
              onChange={(v) => set({ autoSpeed: v })} />
          </Row>

          <Row label="Rhythm">
            <Ruler label="Rhythm" {...RANGE.rhythm} value={settings.rhythm}
              format={(v) => `${v}s`}
              onChange={(v) => set({ rhythm: v })} />
          </Row>

          <Section>(B) Touch</Section>

          <Row label="Drag">
            <Ruler label="Drag speed" {...RANGE.rotateSpeed} value={settings.rotateSpeed}
              onChange={(v) => set({ rotateSpeed: v })} />
          </Row>

          <Row label="Glide">
            <Ruler label="Glide" {...RANGE.momentum} value={settings.momentum}
              onChange={(v) => set({ momentum: v })} />
          </Row>

          <Section>(C) Behaviour</Section>

          <Row label="Hover">
            <Choice
              value={settings.pauseOnHover}
              onChange={(v) => set({ pauseOnHover: v })}
              options={[
                { label: "Keep spinning", value: false },
                { label: "Pause", value: true },
              ]}
            />
          </Row>

          <Row label="Takes">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {TAKES.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  className={`cursor-pointer transition-colors ${
                    take === i ? "font-medium text-[#d92626]" : "text-gray-500 hover:text-ink"
                  }`}
                  onClick={() => {
                    setTake(i);
                    onChange({
                      ...settings,
                      autoSpin: true,
                      style: t.style,
                      rhythm: t.rhythm,
                      autoSpeed: lerp(RANGE.autoSpeed, t.a),
                      rotateSpeed: lerp(RANGE.rotateSpeed, t.r),
                      momentum: lerp(RANGE.momentum, t.m),
                    });
                  }}
                >
                  <HoverLine mode="draw">({pad(i + 1)}) {t.name}</HoverLine>
                </button>
              ))}
              <button
                type="button"
                className={`cursor-pointer transition-colors ${
                  take === 99 ? "font-medium text-[#d92626]" : "text-gray-500 hover:text-ink"
                }`}
                onClick={() => {
                  setTake(99);
                  onChange({
                    ...settings,
                    autoSpin: true,
                    style: STYLES[Math.floor(Math.random() * STYLES.length)].value,
                    rhythm: rnd(RANGE.rhythm),
                    autoSpeed: rnd(RANGE.autoSpeed),
                    rotateSpeed: rnd(RANGE.rotateSpeed),
                    momentum: rnd(RANGE.momentum),
                    direction: (Math.random() < 0.5 ? -1 : 1) as unknown as OrbitSettings["direction"],
                  });
                }}
              >
                <HoverLine mode="draw">(05) Surprise me</HoverLine>
              </button>
            </div>
          </Row>
        </dl>

        <div
          data-row
          className="mt-1 flex justify-between border-t border-black/15 pt-[9px] text-gray-500"
        >
          <button
            type="button"
            className="cursor-pointer hover:text-ink"
            onClick={() => {
              setTake(null);
              onChange({ ...DEFAULT_PROJECTOR });
            }}
          >
            <HoverLine mode="draw">(Reset)</HoverLine>
          </button>
          <span>Press S · Saved</span>
        </div>
      </div>
    </div>
  );
}