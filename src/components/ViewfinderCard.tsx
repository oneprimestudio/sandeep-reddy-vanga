"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { useGSAP, gsap, MASK_EASE } from "@/lib/gsap";
import { Timecode } from "./HeroMicro";

const MASK_FROM = "inset(30% 30% 30% 30% round 12px)";
const MASK_TO = "inset(0% 0% 0% 0% round 0px)";
const CARD = 4 / 5;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

type Focus = { x: number; y: number };

/**
 * Put the point (focus.x %, focus.y %) of the image exactly on the centre of the 4:5 frame.
 * The image is sized from its own aspect, and zoomed just enough that no edge shows.
 */
function place(nat: [number, number], f: Focus, zoom: number) {
    const ia = nat[0] / nat[1];
    const baseW = (ia > CARD ? ia / CARD : 1) * 100; // image width at "cover" scale, % of the card
    const baseH = (ia > CARD ? 1 : CARD / ia) * 100; // image height at "cover" scale, % of the card
    const fx = clamp(f.x, 1, 99) / 100;
    const fy = clamp(f.y, 1, 99) / 100;
    const zx = 50 / Math.min(fx, 1 - fx) / baseW;
    const zy = 50 / Math.min(fy, 1 - fy) / baseH;
    const z = Math.max(1, zx, zy, zoom);
    const W = baseW * z;
    const H = baseH * z;
    return { width: `${W}%`, height: `${H}%`, left: `${50 - fx * W}%`, top: `${50 - fy * H}%` };
}

export default function ViewfinderCard({
    src,
    fallback,
    alt,
    focus = { x: 50, y: 38 },
    zoom = 1,
    af = 26,
    calibrate = process.env.NODE_ENV === "development",
    className = "",
}: {
    src: string;
    fallback?: string; // used if `src` doesn't exist yet
    alt: string;
    focus?: Focus; // face centre, % of the image from its top-left
    zoom?: number; // extra push-in (1 = only what's needed)
    af?: number; // size of the focus box, in frame units (frame is 100 x 125)
    calibrate?: boolean; // dev tool: click the face to centre it
    className?: string;
}) {
    const rootRef = useRef<HTMLElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [url, setUrl] = useState(src);
    const [failed, setFailed] = useState(false);
    const [nat, setNat] = useState<[number, number] | null>(null);
    const [f, setF] = useState<Focus>(focus);
    const [copied, setCopied] = useState("");

    useEffect(() => setF(focus), [focus.x, focus.y]); // eslint-disable-line react-hooks/exhaustive-deps

    const onPick = (e: MouseEvent<HTMLDivElement>) => {
        if (!calibrate) return;
        const img = imgRef.current;
        if (!img) return;
        const r = img.getBoundingClientRect();
        const next = {
            x: Math.round(clamp(((e.clientX - r.left) / r.width) * 100, 1, 99) * 10) / 10,
            y: Math.round(clamp(((e.clientY - r.top) / r.height) * 100, 1, 99) * 10) / 10,
        };
        setF(next);
        const text = `focus={{ x: ${next.x}, y: ${next.y} }}`;
        navigator.clipboard?.writeText(text).catch(() => { });
        setCopied(text);
    };

    /* entrance: the card opens like the hero portrait, the grid fades in, the focus box locks on */
    useGSAP(
        () => {
            const root = rootRef.current;
            if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            gsap
                .timeline({ scrollTrigger: { trigger: root, start: "top 88%", once: true } })
                .fromTo("[data-vf-card]", { clipPath: MASK_FROM }, { clipPath: MASK_TO, duration: 1.4, ease: MASK_EASE }, 0)
                // the settle scales around the card centre, which is the face: it never drifts
                .from("[data-vf-settle]", { scale: 1.15, duration: 1.6, ease: "expo.out" }, 0)
                .from("[data-vf-line]", { opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.07 }, 0.6)
                .from(
                    "[data-vf-af]",
                    { scale: 1.7, opacity: 0, svgOrigin: "50 62.5", duration: 0.9, ease: "expo.out" },
                    1.0
                );
        },
        { scope: rootRef }
    );

    const box = nat ? place(nat, f, zoom) : {};
    const h = af / 2;
    const L = af * 0.23;
    const afPath =
        `M${50 - h} ${62.5 - h + L}V${62.5 - h}H${50 - h + L}` +
        `M${50 + h - L} ${62.5 - h}H${50 + h}V${62.5 - h + L}` +
        `M${50 - h} ${62.5 + h - L}V${62.5 + h}H${50 - h + L}` +
        `M${50 + h - L} ${62.5 + h}H${50 + h}V${62.5 + h - L}`;

    return (
        <figure ref={rootRef} className={className}>
            <div data-vf-settle className="absolute inset-0 will-change-transform">
                <div
                    className="absolute"
                    style={{
                        ...box,
                        opacity: nat ? 1 : 0,
                        transition: "opacity 500ms ease",
                    }}
                >
                    <Image
                        ref={imgRef}
                        src={url}
                        alt={alt}
                        fill
                        sizes="(min-width: 768px) 30vw, 60vw"
                        draggable={false}
                        onLoad={(e) => {
                            const i = e.currentTarget;
                            if (i.naturalWidth) {
                                setNat([i.naturalWidth, i.naturalHeight]);
                            }
                        }}
                        onError={() => {
                            if (fallback && url !== fallback) {
                                setNat(null);
                                setUrl(fallback);
                            } else {
                                setFailed(true);
                            }
                        }}
                        className="object-fill"
                    />
                </div>
            </div>

            <figcaption className="t-micro mt-3">
                <span className="block text-ink">On set</span>
                <span className="block text-gray-400">Production still</span>
                {calibrate && (
                    <span className="mt-2 block text-gray-400">
                        (Click the face to centre it)
                        {copied && <span className="mt-1 block break-all text-[#d92626]">{copied}</span>}
                    </span>
                )}
            </figcaption>
        </figure>
    );
}