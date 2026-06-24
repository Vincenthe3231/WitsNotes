import { z } from "zod";

// Auth
export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  created_at: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = LoginSchema.extend({
  name: z.string().min(1),
  password_confirmation: z.string(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

// Board
export const BoardSchema = z.object({
  id: z.string().uuid(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  is_vault: z.boolean(),
  style: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Board = z.infer<typeof BoardSchema>;

export const CreateBoardSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  is_vault: z.boolean().optional(),
});
export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;

// Card
export const CardTypeSchema = z.enum([
  "note", "notebook", "todo", "task", "bookmark", "image", "file",
  "audio", "gif", "sketch", "mindmap_node", "table",
  "column", "comment_anchor", "link_list",
]);
export type CardType = z.infer<typeof CardTypeSchema>;

// A notebook "page" — recursive: pages nest into a wiki-style tree.
// Backward compatible with the legacy flat shape (no `children`).
export type NotebookTab = {
  id: string;
  title: string;
  blocks: unknown[];
  children?: NotebookTab[];
};
export const NotebookTabSchema: z.ZodType<NotebookTab> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    blocks: z.array(z.unknown()),
    children: z.array(NotebookTabSchema).optional(),
  })
);

export const CardSchema = z.object({
  id: z.string().uuid(),
  board_id: z.string().uuid(),
  created_by: z.number(),
  type: CardTypeSchema,
  title: z.string().nullable().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  z: z.number(),
  rotation: z.number(),
  style: z.record(z.string(), z.unknown()).nullish().transform(v => v ?? null),
  content: z.record(z.string(), z.unknown()).nullish().transform(v => v ?? null),
  content_text: z.string().nullish().transform(v => v ?? null),
  due_at: z.string().nullish().transform(v => v ?? null),
  remind_at: z.string().nullish().transform(v => v ?? null),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Card = z.infer<typeof CardSchema>;

export const CreateCardSchema = z.object({
  type: CardTypeSchema,
  title: z.string().optional(),
  x: z.number().default(100),
  y: z.number().default(100),
  w: z.number().default(320),
  h: z.number().default(200),
  z: z.number().default(10),
  rotation: z.number().default(0),
  style: z.record(z.string(), z.unknown()).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  content_text: z.string().optional(),
  due_at: z.string().optional(),
  remind_at: z.string().optional(),
});
export type CreateCardInput = z.infer<typeof CreateCardSchema>;

export const UpdateCardSchema = CreateCardSchema.partial().omit({ type: true });
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;

// API Error
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullish().transform((v) => v ?? null),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
