
"use client";

import NextLink from "next/link";
import {
    useRef,
    type ComponentProps,
    type ReactNode,
    type CSSProperties,
} from "react";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// ---------------------------------------------
// TYPES
// ---------------------------------------------

type LinkProps = Omit<
    ComponentProps<typeof NextLink>,
    "children"
> & {
    children: ReactNode;
    icon?: ReactNode;
    lineClassName?: string;
};

// ---------------------------------------------
// LINK LINE
// ---------------------------------------------

function LinkLine({
    children,
    lineRef,
    className = "",
}: {
    children: ReactNode;
    lineRef: React.RefObject<HTMLSpanElement | null>;
    className?: string;
}) {
    return (
        <span
            className={`
                relative inline-block
                pb-[var(--line-gap,3px)]
                leading-[1.2]
                ${className}
            `}
        >
            {children}

            <span
                ref={lineRef}
                aria-hidden="true"
                className="
                    absolute inset-x-0 bottom-0
                    h-[var(--line-h,1px)]
                    bg-current
                    scale-x-0
                    origin-right
                "
            />
        </span>
    );
}

// ---------------------------------------------
// LINK COMPONENT
// ---------------------------------------------

export default function Link({
    children,
    icon,
    className = "",
    lineClassName = "",
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
}: LinkProps) {

    const linkRef = useRef<HTMLAnchorElement>(null);
    const lineRef = useRef<HTMLSpanElement>(null);
    const iconRef = useRef<HTMLSpanElement>(null);

    const { contextSafe } = useGSAP(
        () => {
            gsap.set(lineRef.current, {
                scaleX: 0,
                transformOrigin: "right center",
            });

            if (iconRef.current) {
                gsap.set(iconRef.current, { x: 0 });
            }
        },
        { scope: linkRef }
    );

    // -----------------------------------------
    // HOVER IN
    // -----------------------------------------

    const animateIn = contextSafe(() => {
        const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        gsap.killTweensOf([
            lineRef.current,
            iconRef.current,
        ].filter(Boolean));

        gsap.to(lineRef.current, {
            scaleX: 1,
            transformOrigin: "left center",
            duration: reduced ? 0 : 0.75,
            ease: "power4.out",
        });

        if (iconRef.current) {
            gsap.to(iconRef.current, {
                x: reduced ? 0 : 5,
                duration: reduced ? 0 : 0.65,
                ease: "power3.out",
            });
        }
    });

    // -----------------------------------------
    // HOVER OUT
    // -----------------------------------------

    const animateOut = contextSafe(() => {
        const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        gsap.killTweensOf([
            lineRef.current,
            iconRef.current,
        ].filter(Boolean));

        gsap.to(lineRef.current, {
            scaleX: 0,
            transformOrigin: "right center",
            duration: reduced ? 0 : 0.65,
            ease: "power3.inOut",
        });

        if (iconRef.current) {
            gsap.to(iconRef.current, {
                x: 0,
                duration: reduced ? 0 : 0.55,
                ease: "power3.out",
            });
        }
    });

    // -----------------------------------------
    // RENDER
    // -----------------------------------------

    return (
        <NextLink
            {...props}
            ref={linkRef}
            onPointerEnter={(event) => {
                onPointerEnter?.(event);
                animateIn();
            }}
            onPointerLeave={(event) => {
                onPointerLeave?.(event);
                animateOut();
            }}
            onFocus={(event) => {
                onFocus?.(event);
                animateIn();
            }}
            onBlur={(event) => {
                onBlur?.(event);
                animateOut();
            }}
            className={`
                group inline-flex items-center gap-2
                transition-colors duration-500
                ease-[cubic-bezier(0.16,1,0.3,1)]
                hover:text-[color:var(--link-hover,#d92626)]
                focus-visible:text-[color:var(--link-hover,#d92626)]
                focus-visible:outline-none
                ${className}
            `}
        >
            <LinkLine
                lineRef={lineRef}
                className={lineClassName}
            >
                {children}
            </LinkLine>

            {icon && (
                <span
                    ref={iconRef}
                    aria-hidden="true"
                    className="inline-flex will-change-transform"
                >
                    {icon}
                </span>
            )}
        </NextLink>
    );
}
