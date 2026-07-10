import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Captures a DOM element (the canvas viewport) as a PNG and triggers a download. */
export async function exportElementAsPng(el: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(el, { pixelRatio: 2 });
  download(dataUrl, filename);
}

/** Captures a DOM element as a PNG, then embeds it in a single-page PDF sized to match. */
export async function exportElementAsPdf(el: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(el, { pixelRatio: 2 });
  const { width, height } = el.getBoundingClientRect();

  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
  pdf.save(filename);
}

export function downloadTextFile(content: string, filename: string, mime = "text/markdown"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  download(url, filename);
  URL.revokeObjectURL(url);
}
