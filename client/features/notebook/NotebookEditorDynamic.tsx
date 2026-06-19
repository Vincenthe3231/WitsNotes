import dynamic from "next/dynamic";

export const NotebookEditor = dynamic(
  () => import("./NotebookEditor").then((m) => ({ default: m.NotebookEditor })),
  { ssr: false }
);
