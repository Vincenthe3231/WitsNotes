import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NEXT_PUBLIC_ENABLE_SW !== "true" && process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  serverExternalPackages: ["@all-wits/witslog", "koffi"],
};

export default withSerwist(nextConfig);
