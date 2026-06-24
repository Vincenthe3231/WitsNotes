import { uploadAttachment } from "./boards";
import { Card } from "./schemas";

type UpdateCardFn = (vars: {
  boardId: string;
  id: string;
  input: Record<string, unknown>;
}) => void;

export interface UploadCardAttachmentOpts {
  boardId: string;
  card: Card;
  file: File;
  upsertLocalCard: (card: Card) => void;
  updateCard: UpdateCardFn;
  onProgress?: (pct: number) => void;
}

export async function uploadCardAttachment(opts: UploadCardAttachmentOpts): Promise<void> {
  const { boardId, card, file, upsertLocalCard, updateCard, onProgress } = opts;

  console.log("[upload] uploadCardAttachment start", { cardId: card.id, fileName: file?.name, fileSize: file?.size, fileType: file?.type });

  upsertLocalCard({ ...card, content: { ...(card.content as object | null), status: "uploading", progress: 0 } });

  console.log("[upload] calling uploadAttachment XHR");
  try {
    const att = await uploadAttachment(file, {
      cardId: card.id,
      onProgress: (pct) => {
        upsertLocalCard({ ...card, content: { ...(card.content as object | null), status: "uploading", progress: pct } });
        onProgress?.(pct);
      },
    });
    const readyContent = {
      attachment_id: att.id,
      url: att.url,
      mime: att.mime,
      size: att.size,
      original_name: att.original_name,
      status: "ready" as const,
    };
    upsertLocalCard({ ...card, content: readyContent });
    updateCard({ boardId, id: card.id, input: { content: readyContent, content_text: att.original_name } });
  } catch (err) {
    console.error("[upload] uploadAttachment failed", err);
    const errorContent = { ...(card.content as object | null), status: "error" as const };
    upsertLocalCard({ ...card, content: errorContent });
    updateCard({ boardId, id: card.id, input: { content: errorContent } });
  }
}
