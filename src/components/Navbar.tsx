"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import HoverLink from "./HoverLink";
import Link from "./Link";
import AboutDrawer from "./AboutDrawer";

const LEAVE_AFTER = 48;

export default function Navbar() {
  const [away, setAway] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setAboutOpen(true);
    window.addEventListener("open-about-drawer", handleOpen);
    return () => window.removeEventListener("open-about-drawer", handleOpen);
  }, []);

  useEffect(() => {
    let prevY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;

      // Follow oneprime technique: when scrolled past threshold and scrolling down, leave upward
      if (currentY > LEAVE_AFTER && currentY > prevY) {
        setAway(true);
      } else if (currentY < prevY || currentY <= LEAVE_AFTER) {
        // Scrolling up or at top -> return smoothly
        setAway(false);
      }
      prevY = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 px-4 md:px-8 py-3.5 md:py-5 transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.87,0,0.13,1)] ${away
          ? "-translate-y-[120%] opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100 pointer-events-auto"
          }`}
      >
        <div className="mx-auto max-w-[1720px]  pb-3 md:pb-4">
          {/* Desktop Navbar: exactly matching Figma grid layout */}
          {/* Desktop Navbar: same 12-col grid + gutter as the hero */}
          <div className="hidden md:grid grid-cols-12 items-start gap-x-3  md:text-[14px] font-medium text-ink leading-[1.2]">
            <div className="col-span-4">
              <a href="/" className="hover:opacity-70 transition-opacity tracking-tight">
                Film Maker Archives©
              </a>
            </div>

            <div className="col-start-5 col-span-3 text-center">
              <a href="/" className="text-[#d92626] font-medium tracking-tight hover:opacity-85 transition-opacity">
                Sandeep Reddy Vanga
              </a>
            </div>

            <nav className="col-start-10 col-span-1 flex flex-col md:text-[12px] leading-tight  whitespace-nowrap">
              <Link
                href="/#about"
                onClick={(e) => {
                  e.preventDefault();
                  setAboutOpen(true);
                }}
                className="self-start cursor-pointer"
              >
                About
              </Link>
              <Link href="/films" className="self-start">Films</Link>
              <Link href="/#upcoming" className="self-start">Upcoming</Link>
            </nav>

            <div className="col-start-11 col-span-2 md:text-[12px] text-center">
              <span className="text-ink-muted">Warangal</span>
            </div>
          </div>

          {/* Mobile Navbar: clean and refined */}
          {/* Mobile Navbar: name stacked left, links stacked right */}
          <div className="flex md:hidden items-start justify-between">
            <a
              href="/"
              className="text-ink font-medium text-[12px] leading-[1.05] tracking-tight"
            >
              <span className="block">Sandeep</span>
              <span className="block">Reddy</span>
              <span className="block">Vanga</span>
            </a>

            <nav className="flex flex-col items-end text-[13px] leading-[1.15] tracking-tight text-ink">
              <a
                href="/#about"
                onClick={(e) => {
                  e.preventDefault();
                  setAboutOpen(true);
                }}
                className="cursor-pointer"
              >
                About
              </a>
              <a href="/films">Films</a>
              <a href="/#upcoming">Upcoming</a>
            </nav>
          </div>
        </div>
      </header>

      {/* ABOUT DRAWER: identical system, shaders, and animations as FilmDrawer */}
      <AboutDrawer open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
