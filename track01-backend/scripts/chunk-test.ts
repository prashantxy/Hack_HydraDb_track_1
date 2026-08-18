import fs from "node:fs/promises";
import path from "node:path";

import {
  normalizeDocument,
} from "../src/ingestion/normalizer";

import {
  chunkDocument,
} from "../src/ingestion/chunker";

const ROOT = path.resolve(
  "data/EnterpriseRAG-Bench-main/generated_data/sources",
);

async function getJsonFiles(
  directory: string,
): Promise<string[]> {
  const entries = await fs.readdir(
    directory,
    { withFileTypes: true },
  );

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      files.push(
        ...(await getJsonFiles(fullPath)),
      );
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".json")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const files = await getJsonFiles(ROOT);

  for (const filePath of files.slice(0, 5)) {
    const raw = await fs.readFile(
      filePath,
      "utf8",
    );

    const data =
      JSON.parse(raw) as Record<
        string,
        unknown
      >;

    const document =
      normalizeDocument(
        data,
        filePath,
      );

    const chunks =
      chunkDocument(document);

    console.log("\n-----------------------");

    console.log({
      source: document.source,
      id: document.id,
      title: document.title,
      documentLength: document.content.length,
      chunks: chunks.length,
    });

    for (const chunk of chunks.slice(0, 2)) {
      console.log({
        id: chunk.id,
        index: chunk.chunkIndex,
        length: chunk.content.length,
        preview: chunk.content.slice(0, 150),
      });
    }
  }
}

main().catch(console.error);