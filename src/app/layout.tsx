import type { Metadata } from "next";
import localFont from "next/font/local";
import SmoothScroll from "@/components/SmoothScroll";
import NoiseOverlay from "@/components/NoiseOverlay";
import "./globals.css";
import Preloader from "@/components/Preloader";
import { FILMS } from "@/data/films";

const vangaFont = localFont({
  src: "../fonts/vanga.woff2",
  weight: "400",
  variable: "--font-vanga-local",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sandeep Reddy Vanga — Film Maker Archives",
  description:
    "Official portfolio and cinematic archives of Sandeep Reddy Vanga. Director, Screenplay, Editor behind Arjun Reddy, Kabir Singh, and Animal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={vangaFont.variable} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen antialiased bg-white text-[#111116] selection:bg-[#d92626] selection:text-white"
      >
        <SmoothScroll>
          <NoiseOverlay
            intensity={0.09}
            grain={0.8}
            fps={24}
          />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
