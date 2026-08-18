import fs from "node:fs/promises";
import path from "node:path";

import type { NormalizedDocument } from "../src/ingestion/types";
import { normalizeDocument } from "../src/ingestion/normalizer";

const ROOT = path.resolve(
  "data/EnterpriseRAG-Bench-main/generated_data/sources",
);

const LIMIT = 100;

async function getJsonFiles(
  directory: string,
): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

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
  console.log("EnterpriseRAG ingestion test");
  console.log("--------------------------------");
  console.log(`Root: ${ROOT}`);
  console.log(`Limit: ${LIMIT}`);
  console.log();

  const files = await getJsonFiles(ROOT);

  const documents: NormalizedDocument[] = [];

  for (
    const filePath of files.slice(0, LIMIT)
  ) {
    try {
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

      documents.push(document);

      console.log({
        id: document.id,
        source: document.source,
        sourceId: document.sourceId,
        title: document.title,
        contentLength:
          document.content.length,
        author: document.metadata.author,
      });
    } catch (error) {
      console.error(
        `Failed: ${filePath}`,
      );

      console.error(error);
    }
  }

  console.log();
  console.log("--------------------------------");
  console.log(
    `Loaded ${documents.length} documents`,
  );

  const sourceCounts =
    documents.reduce(
      (acc, doc) => {
        acc[doc.source] =
          (acc[doc.source] ?? 0) + 1;

        return acc;
      },
      {} as Record<string, number>,
    );

  console.log();
  console.log("Sources:");

  for (const [source, count] of Object.entries(
    sourceCounts,
  )) {
    console.log(`  ${source}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});