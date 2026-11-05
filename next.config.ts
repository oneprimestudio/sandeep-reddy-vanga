import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/webp"],
    qualities: [75, 90, 100],
  },
};

export default nextConfig;
