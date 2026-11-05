"use client";

import Link from "next/link";
import { useRef, type ComponentProps, type ReactNode } from "react";
import { useGSAP, gsap } from "@/lib/gsap";

/* Motion language: leave with inOut (accelerate away), arrive with out (long soft landing) */
const EASE_IN_OUT = "expo.inOut";
const EASE_OUT = "expo.out";
const T_EXIT = 0.6;
const T_ENTER = 1.0;
const OVERLAP = 0.14; // new line starts while the old one is still leaving

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = (d: number) => (reduced() ? 0 : d);

/** Mouse hover (hover-capable devices only) + keyboard focus-visible */
function bindHover(el: HTMLElement, enter: () => void, leave: () => void) {
  const canHover = window.matchMedia("(hover: hover)").matches;
  const onFocus = () => {
    if (el.matches(":focus-visible")) enter();
  };
  if (canHover) {
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
  }
  el.addEventListener("focusin", onFocus);
  el.addEventListener("focusout", leave);
  return () => {
    el.removeEventListener("mouseenter", enter);
    el.removeEventListener("mouseleave", leave);
    el.removeEventListener("focusin", onFocus);
    el.removeEventListener("focusout", leave);
  };
}

/**
 * Underline swipe. No `group` needed: it binds to the closest <a>/<button>
 * (or any ancestor marked data-hover-root).
 *
 * mode="swap": line at rest, exits RIGHT on hover, new line enters from LEFT
 * mode="draw": no line at rest, enters from LEFT on hover, exits RIGHT on leave
 */
export function HoverLine({
  children,
  className = "",
  mode = "swap",
}: {
  children: ReactNode;
  className?: string;
  mode?: "swap" | "draw";
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const restRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const rest = restRef.current;
      const live = liveRef.current;
      if (!root || !live) return;

      const trigger = (root.closest("[data-hover-root]") ??
        root.closest("a, button")) as HTMLElement | null;
      if (!trigger) return;

      gsap.set(live, { xPercent: -101, visibility: "visible" });
      if (rest) gsap.set(rest, { xPercent: 0 });

      const show = (el: HTMLElement, delay = 0) => {
        // if it already left to the right, restart from the left
        if ((gsap.getProperty(el, "xPercent") as number) > 50) {
          gsap.set(el, { xPercent: -101 });
        }
        gsap.to(el, {
          xPercent: 0,
          duration: dur(T_ENTER),
          ease: EASE_OUT,
          delay: reduced() ? 0 : delay,
          overwrite: true,
        });
      };
      const hide = (el: HTMLElement) =>
        gsap.to(el, {
          xPercent: 101,
          duration: dur(T_EXIT),
          ease: EASE_IN_OUT,
          overwrite: true,
        });

      const enter = () => {
        if (rest) {
          hide(rest);
          show(live, OVERLAP);
        } else {
          show(live);
        }
      };
      const leave = () => {
        if (rest) {
          hide(live);
          show(rest, OVERLAP);
        } else {
          hide(live);
        }
      };

      return bindHover(trigger, enter, leave);
    },
    { scope: rootRef }
  );

  return (
    <span
      ref={rootRef}
      className={`relative inline-block pb-[var(--line-gap,1px)] leading-[1.1] ${className}`}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[var(--line-h,1px)] overflow-hidden"
      >
        {mode === "swap" && (
          <span
            ref={restRef}
            className="block h-full w-full bg-current will-change-transform"
          />
        )}
        <span
          ref={liveRef}
          className="invisible absolute inset-0 bg-current will-change-transform"
        />
      </span>
    </span>
  );
}

type HoverLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode;
  /** Trailing icon (e.g. <Arrow />) that nudges on hover */
  icon?: ReactNode;
  mode?: "swap" | "draw";
};

export default function HoverLink({
  children,
  icon,
  mode = "swap",
  className = "",
  ...props
}: HoverLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = linkRef.current;
      const ic = iconRef.current;
      if (!el || !ic) return;
      // push fast, return slow: feels springy without a bounce
      const to = (x: number, d: number) =>
        gsap.to(ic, { x, duration: dur(d), ease: EASE_OUT, overwrite: true });
      return bindHover(el, () => to(6, 0.7), () => to(0, 1));
    },
    { scope: linkRef }
  );

  return (
    <Link
      {...props}
      ref={linkRef}
      className={`inline-flex items-center gap-1.5 transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[color:var(--link-hover,#d92626)] focus-visible:text-[color:var(--link-hover,#d92626)] focus-visible:outline-none ${className}`}
    >
      <HoverLine mode={mode}>{children}</HoverLine>
      {icon && (
        <span ref={iconRef} aria-hidden className="will-change-transform">
          {icon}
        </span>
      )}
    </Link>
  );
}