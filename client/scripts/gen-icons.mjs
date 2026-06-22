import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, "../public/icons/icon.svg");
const svg = readFileSync(svgPath);

const sizes = [192, 512];
for (const size of sizes) {
  const padding = Math.round(size * 0.1);
  const inner = size - padding * 2;
  await sharp(svg)
    .resize(inner, inner)
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: "#0B1220" })
    .png()
    .toFile(resolve(__dirname, `../public/icons/icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);
}
