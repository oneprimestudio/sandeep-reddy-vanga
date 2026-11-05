"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { ONCE, PRIME } from "@/lib/gsap";
import React, { useRef } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  try {
    CustomEase.create("reveal.wipe", "M0,0 C0.4,0 0.2,1 1,1");
  } catch {
    // already registered
  }
}

type EaseType =
  | "reveal.wipe"
  | "power4.out"
  | "power3.out"
  | "power2.out"
  | "expo.out"
  | "elastic.out(1,0.5)"
  | "back.out(1.7)"
  | "circ.out";

type AnimationVariant =
  | "slideUp"
  | "slideDown"
  | "reveal"
  | "cascade"
  | "drift"
  | "spring"
  | "glide";

interface TextProps {
  children: React.ReactElement | React.ReactElement[];
  animateOnScroll?: boolean;
  delay?: number;
  variant?: AnimationVariant;
  stagger?: number;
  duration?: number;
  ease?: EaseType;
  scrollStart?: string;
  indentLines?: Record<number, string>;
  justify?: boolean;
}

interface AnimationConfig {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

const VARIANT_CONFIGS: Record<AnimationVariant, AnimationConfig> = {
  slideUp: {
    from: { y: "115%", opacity: 1 },
    to: { y: "0%", opacity: 1, ease: "reveal.wipe", duration: 1 },
  },
  slideDown: {
    from: { y: "-115%", opacity: 1 },
    to: { y: "0%", opacity: 1, ease: "power4.out", duration: 0.9 },
  },
  reveal: {
    from: { y: "105%", scaleY: 1.12, opacity: 0 },
    to: { y: "0%", scaleY: 1, opacity: 1, ease: "expo.out", duration: 0.85 },
  },
  cascade: {
    from: { y: "100%", filter: "blur(12px)", opacity: 0 },
    to: { y: "0%", filter: "blur(0px)", opacity: 1, ease: "power3.out", duration: 1.1 },
  },
  drift: {
    from: { y: "80%", x: "-6px", opacity: 0, rotation: 1.5 },
    to: { y: "0%", x: "0px", opacity: 1, rotation: 0, ease: "circ.out", duration: 1.4 },
  },
  spring: {
    from: { y: "100%", scaleX: 0.92, opacity: 0 },
    to: { y: "0%", scaleX: 1, opacity: 1, ease: "elastic.out(1,0.5)", duration: 1.3 },
  },
  glide: {
    from: { y: "100%", skewY: 3, opacity: 0 },
    to: { y: "0%", skewY: 0, opacity: 1, ease: "power4.out", duration: 1.05 },
  },
};

const Text: React.FC<TextProps> = ({
  children,
  animateOnScroll = true,
  delay = 0,
  variant = "slideUp",
  stagger,
  duration,
  ease,
  scrollStart = "top 85%",
  indentLines,
  justify = false,
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const elementRef = useRef<HTMLElement[]>([]);
  const splitRef = useRef<SplitText[]>([]);
  const lines = useRef<HTMLElement[]>([]);

  useGSAP(
    () => {
      let cancelled = false;

      document.fonts.ready.then(() => {
        if (cancelled || !containerRef.current) return;

        splitRef.current = [];
        elementRef.current = [];
        lines.current = [];

        const container = containerRef.current;
        const config = VARIANT_CONFIGS[variant];

        const toVars: gsap.TweenVars = {
          ...config.to,
          duration: duration ?? (config.to.duration as number),
          ease: ease ?? (config.to.ease as string),
          stagger: stagger ?? 0.08,
          delay,
        };

        const elements: HTMLElement[] = container.hasAttribute("data-copy-wrapper")
          ? (Array.from(container.children) as HTMLElement[])
          : [container];

        elements.forEach((element) => {
          elementRef.current.push(element);

          element.style.textIndent = "";
          const textIndent = window.getComputedStyle(element).textIndent;

          const split = SplitText.create(element, {
            type: "lines",
            mask: "lines",
            linesClass: "line++",
          });

          splitRef.current.push(split);

          if (textIndent && textIndent !== "0px") {
            if (split.lines.length > 0) {
              (split.lines[0] as HTMLElement).style.paddingLeft = textIndent;
            }
            element.style.textIndent = "0";
          }

          if (justify) {
            const own = split.lines as HTMLElement[];
            own.forEach((line, i) => {
              line.style.textAlign = "justify";
              if (i < own.length - 1) line.style.textAlignLast = "justify";
            });
          }

          lines.current.push(...(split.lines as HTMLElement[]));
        });

        if (indentLines) {
          lines.current.forEach((line, i) => {
            if (indentLines[i] !== undefined) line.style.paddingLeft = indentLines[i];
          });
        }

        if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
          gsap.set(lines.current, { ...config.to, duration: 0, delay: 0, stagger: 0 });
          return;
        }

        const promote = "filter" in config.from ? "transform, opacity, filter" : "transform, opacity";
        gsap.set(lines.current, { ...config.from, willChange: promote });
        toVars.onComplete = () => gsap.set(lines.current, { willChange: "auto" });

        if (animateOnScroll) {
          gsap.to(lines.current, {
            ...toVars,
            scrollTrigger: { trigger: container, start: scrollStart, ...ONCE },
          });
        } else {
          gsap.to(lines.current, toVars);
        }
      });

      return () => {
        cancelled = true;
        splitRef.current.forEach((split) => split?.revert());
        splitRef.current = [];
      };
    },
    {
      scope: containerRef as React.RefObject<HTMLElement>,
      dependencies: [
        animateOnScroll,
        delay,
        variant,
        stagger,
        duration,
        ease,
        scrollStart,
        indentLines,
        justify,
      ],
    }
  );

  if (React.Children.count(children) === 1) {
    const child = children as React.ReactElement;
    return React.cloneElement(child, { ref: containerRef } as any);
  }

  return null;
};

export default Text;
