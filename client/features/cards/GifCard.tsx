"use client";

import { Card } from "@/lib/api/schemas";
import { ImageCard } from "./ImageCard";

interface Props {
  card: Card;
}

// GIF is a native-autoplay image — ImageCard handles the <img> rendering
export function GifCard({ card }: Props) {
  return <ImageCard card={card} />;
}
