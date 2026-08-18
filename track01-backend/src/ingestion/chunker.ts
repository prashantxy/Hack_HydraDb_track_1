import type { NormalizedDocument } from "./types";

export interface DocumentChunk {
  id: string;
  documentId: string;

  source: NormalizedDocument["source"];
  sourceId: string;

  title: string;
  content: string;

  chunkIndex: number;
  startOffset: number;
  endOffset: number;

  metadata: NormalizedDocument["metadata"];
}

interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

export function chunkDocument(
  document: NormalizedDocument,
  options: ChunkOptions = {},
): DocumentChunk[] {
  const maxChars = options.maxChars ?? 1800;
  const overlapChars = options.overlapChars ?? 250;

  const content = document.content.trim();

  if (!content) {
    return [];
  }

  if (content.length <= maxChars) {
    return [
      {
        id: `${document.id}:chunk:0`,
        documentId: document.id,

        source: document.source,
        sourceId: document.sourceId,

        title: document.title,
        content,

        chunkIndex: 0,
        startOffset: 0,
        endOffset: content.length,

        metadata: document.metadata,
      },
    ];
  }

  const chunks: DocumentChunk[] = [];

  let start = 0;
  let index = 0;

  while (start < content.length) {
    let end = Math.min(
      start + maxChars,
      content.length,
    );

    // Prefer breaking at a paragraph/newline.
    if (end < content.length) {
      const newline = content.lastIndexOf(
        "\n",
        end,
      );

      if (newline > start + maxChars * 0.5) {
        end = newline;
      }
    }

    const chunkText = content
      .slice(start, end)
      .trim();

    if (chunkText) {
      chunks.push({
        id: `${document.id}:chunk:${index}`,
        documentId: document.id,

        source: document.source,
        sourceId: document.sourceId,

        title: document.title,
        content: chunkText,

        chunkIndex: index,
        startOffset: start,
        endOffset: end,

        metadata: document.metadata,
      });

      index++;
    }

    if (end >= content.length) {
      break;
    }

    start = Math.max(
      end - overlapChars,
      start + 1,
    );
  }

  return chunks;
}