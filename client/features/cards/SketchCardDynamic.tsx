import dynamic from "next/dynamic";

export const SketchCard = dynamic(
  () => import("./SketchCard").then((m) => ({ default: m.SketchCard })),
  { ssr: false }
);
