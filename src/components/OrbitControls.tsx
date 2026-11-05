"use client";

import { useState } from "react";

export type OrbitSettings = {
  autoSpin: boolean;
  autoSpeed: number; // 0.2x to 3.0x
  rotateSpeed: number; // 0.5x to 3.0x
  momentum: number; // 0.5x to 3.0x
  direction: 1 | -1; // 1 = forward, -1 = reverse
};

export const DEFAULT_ORBIT_SETTINGS: OrbitSettings = {
  autoSpin: true,
  autoSpeed: 1.0,
  rotateSpeed: 1.0,
  momentum: 1.0,
  direction: 1,
};

type Props = {
  settings: OrbitSettings;
  onChange: (settings: OrbitSettings) => void;
};

export default function OrbitControls({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const update = <K extends keyof OrbitSettings>(key: K, val: OrbitSettings[K]) => {
    onChange({
      ...settings,
      [key]: val,
    });
  };

  const reset = () => {
    onChange({ ...DEFAULT_ORBIT_SETTINGS });
  };

  const isCustom =
    settings.autoSpin !== DEFAULT_ORBIT_SETTINGS.autoSpin ||
    settings.autoSpeed !== DEFAULT_ORBIT_SETTINGS.autoSpeed ||
    settings.rotateSpeed !== DEFAULT_ORBIT_SETTINGS.rotateSpeed ||
    settings.momentum !== DEFAULT_ORBIT_SETTINGS.momentum ||
    settings.direction !== DEFAULT_ORBIT_SETTINGS.direction;

  return (
    <div
      data-lenis-prevent
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed top-[84px] right-4 md:right-8 z-40 select-none text-left"
    >
      {/* TRIGGER PILL */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Orbit 3D Gallery Controls"
          className="group flex items-center gap-2.5 rounded-full border border-black/15 bg-white/90 px-3.5 py-1.5 shadow-sm backdrop-blur-md transition-all hover:border-black/40 hover:bg-white active:scale-95"
        >
          <span
            className={`inline-block size-2 rounded-full transition-colors ${
              settings.autoSpin ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          <span className="t-micro uppercase tracking-wider font-medium text-ink">
            Orbit Settings
          </span>
          {isCustom && (
            <span className="size-1.5 rounded-full bg-[#d92626]" title="Custom settings active" />
          )}
          <svg
            className={`size-3 text-gray-500 transition-transform duration-300 ${
              open ? "rotate-180 text-ink" : "group-hover:text-ink"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* EXPANDED SETTINGS DRAWER / CARD */}
      {open && (
        <div className="mt-2 w-[310px] md:w-[340px] rounded-2xl border border-black/15 bg-white/95 p-5 shadow-2xl backdrop-blur-xl transition-all">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <div>
              <p className="t-micro uppercase tracking-widest font-semibold text-ink">
                Orbit Engine
              </p>
              <p className="text-[10px] uppercase text-gray-400 tracking-wider">
                Three.js Physics & Spin
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isCustom && (
                <button
                  type="button"
                  onClick={reset}
                  className="t-micro text-[10px] uppercase tracking-wider text-gray-500 hover:text-[#d92626] transition-colors underline cursor-pointer"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-6 place-items-center rounded-full text-gray-400 hover:bg-black/5 hover:text-ink transition-colors"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {/* 1. AUTO SPIN TOGGLE & SPEED */}
            <div className="flex flex-col gap-2 rounded-lg border border-black/5 bg-black/[0.02] p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="t-micro font-medium text-ink block">Auto Spin</span>
                  <span className="text-[10px] text-gray-500">Continuous ambient rotation</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.autoSpin}
                  onClick={() => update("autoSpin", !settings.autoSpin)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.autoSpin ? "bg-[#d92626]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.autoSpin ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {settings.autoSpin && (
                <div className="mt-1 pt-2 border-t border-black/5">
                  <div className="flex items-center justify-between text-ink t-micro">
                    <span className="text-gray-500 text-[11px]">Spin Speed</span>
                    <span className="font-mono tabular-nums text-[11px] font-semibold">
                      {settings.autoSpeed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={settings.autoSpeed}
                    onChange={(e) => update("autoSpeed", parseFloat(e.target.value))}
                    className="mt-1.5 w-full accent-[#d92626] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                    <span>0.2x (Slow)</span>
                    <span>1.0x (Normal)</span>
                    <span>3.0x (Fast)</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. DIRECTION (FORWARD / REVERSE) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="t-micro font-medium text-ink">Direction</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {settings.direction === 1 ? "Forward (↻)" : "Reverse (↺)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update("direction", 1)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 t-micro transition-all cursor-pointer ${
                    settings.direction === 1
                      ? "border-[#d92626] bg-[#d92626]/10 text-[#d92626] font-medium shadow-xs"
                      : "border-black/10 text-gray-600 hover:border-black/25 hover:text-ink"
                  }`}
                >
                  <span>Forward</span>
                  <span>➔</span>
                </button>
                <button
                  type="button"
                  onClick={() => update("direction", -1)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 t-micro transition-all cursor-pointer ${
                    settings.direction === -1
                      ? "border-[#d92626] bg-[#d92626]/10 text-[#d92626] font-medium shadow-xs"
                      : "border-black/10 text-gray-600 hover:border-black/25 hover:text-ink"
                  }`}
                >
                  <span>⬅</span>
                  <span>Reverse</span>
                </button>
              </div>
            </div>

            {/* 3. ROTATE SPEED (SCROLL & DRAG SENSITIVITY) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="t-micro font-medium text-ink block">Rotate Speed</span>
                  <span className="text-[10px] text-gray-500">Scroll & drag spin velocity</span>
                </div>
                <span className="font-mono tabular-nums text-xs font-semibold text-ink">
                  {settings.rotateSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={settings.rotateSpeed}
                onChange={(e) => update("rotateSpeed", parseFloat(e.target.value))}
                className="mt-1 w-full accent-[#d92626] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-gray-400">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
                <span>3.0x</span>
              </div>
            </div>

            {/* 4. THREE.JS MOMENTUM / MOMENT */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="t-micro font-medium text-ink block">Three.js Momentum</span>
                  <span className="text-[10px] text-gray-500">Inertia flick coasting distance</span>
                </div>
                <span className="font-mono tabular-nums text-xs font-semibold text-ink">
                  {settings.momentum.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={settings.momentum}
                onChange={(e) => update("momentum", parseFloat(e.target.value))}
                className="mt-1 w-full accent-[#d92626] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-gray-400">
                <span>0.5x (Crisp)</span>
                <span>1.0x (Balanced)</span>
                <span>3.0x (Long Coast)</span>
              </div>
            </div>
          </div>

          {/* FOOTER TIP */}
          <div className="mt-4 border-t border-black/10 pt-2.5 text-center">
            <p className="text-[10px] text-gray-400">
              Scroll or drag the gallery to feel live physics changes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
