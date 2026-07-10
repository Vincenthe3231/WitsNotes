import { apiClient } from "./client";
import { Board, BoardSchema, Card, CardSchema, Template, TemplateSchema } from "./schemas";
import { z } from "zod";

export async function getTemplates(): Promise<Template[]> {
  const res = await apiClient.get("/templates");
  return z.array(TemplateSchema).parse(res.data);
}

export async function applyTemplate(
  templateId: string,
  title?: string
): Promise<Board & { cards: Card[] }> {
  const res = await apiClient.post(`/templates/${templateId}/use`, title ? { title } : {});
  return BoardSchema.extend({ cards: z.array(CardSchema) }).parse(res.data);
}
