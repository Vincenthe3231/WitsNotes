"use client";
import dynamic from "next/dynamic";

export const NotionEditor = dynamic(
  () => import("./NotionEditor").then((m) => ({ default: m.NotionEditor })),
  { ssr: false }
);
