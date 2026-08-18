

import {
  readFile,
} from "node:fs/promises";

import path from "node:path";

import fg from "fast-glob";

import {
  normalizeDocument,
} from "./normalizer";

import type {
  NormalizedDocument,
} from "./types";

export interface LoaderOptions {
  root: string;

  limit?: number;
}

export async function* loadDocuments(
  options: LoaderOptions,
): AsyncGenerator<NormalizedDocument> {
  const files = await fg(
    "**/*.json",
    {
      cwd: options.root,
      absolute: true,
      onlyFiles: true,
    },
  );

  let count = 0;

  for (const filePath of files) {
    if (
      options.limit !== undefined &&
      count >= options.limit
    ) {
      break;
    }

    try {
      const raw = await readFile(
        filePath,
        "utf8",
      );

      const data = JSON.parse(raw);

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        console.warn(
          `Skipping invalid document: ${filePath}`,
        );

        continue;
      }

      const document =
        normalizeDocument(
          data as Record<string, unknown>,
          filePath,
        );

      count++;

      yield document;
    } catch (error) {
      console.warn(
        `Failed to load ${filePath}`,
      );

      console.warn(error);
    }
  }
}

export function getDefaultDataRoot(): string {
  return path.resolve(
    process.cwd(),
    "data/EnterpriseRAG-Bench-main/generated_data/sources",
  );
}