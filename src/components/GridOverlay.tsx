"use client";

import { useEffect, useState } from "react";

export default function GridOverlay() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) setOn((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!on) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] px-4 md:px-8">
      <div className="mx-auto grid h-full max-w-[1720px] grid-cols-4 md:grid-cols-12 gap-x-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`bg-[#d92626]/10 ${i >= 4 ? "hidden md:block" : ""}`} />
        ))}
      </div>
    </div>
  );
}