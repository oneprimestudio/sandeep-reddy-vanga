import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** The studio's signature curve — cubic-bezier(0.87, 0, 0.13, 1) — used for every layout move */
export const PRIME = typeof window !== "undefined" 
  ? CustomEase.create("prime", "0.87,0,0.13,1") 
  : "power3.out";

export const PRIME_DURATION = 0.6;

/** Menu curve */
export const MENU_EASE = typeof window !== "undefined"
  ? CustomEase.create("menu", "M0,0 C0.18,0 0.24,0.36 0.4,0.62 0.56,0.88 0.7,1 1,1")
  : "power3.out";

/** Card curve */
export const CARD_EASE = typeof window !== "undefined"
  ? CustomEase.create("card", "M0,0 C0.3,0 0.32,0.26 0.48,0.56 0.62,0.82 0.72,1 1,1")
  : "power2.out";

/** Mask curve for expanding card frames */
export const MASK_EASE = typeof window !== "undefined"
  ? CustomEase.create("mask", "0.33,0,0.1,1")
  : "power3.inOut";

export const ONCE = { toggleActions: "play none none none" } as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, useGSAP, ScrollTrigger, SplitText, CustomEase };
