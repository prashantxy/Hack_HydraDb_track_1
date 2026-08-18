import type {
  NormalizedDocument,
  SourceType,
} from "./types";

import { extractContent } from "./content";

function stringValue(
  value: unknown,
): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return undefined;
}

function firstString(
  data: Record<string, unknown>,
  fields: string[],
): string | undefined {
  for (const field of fields) {
    const value = stringValue(data[field]);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function detectSource(
  filePath: string,
): SourceType {
  const parts = filePath.split("/");

  const supportedSources: SourceType[] = [
    "slack",
    "gmail",
    "linear",
    "gdrive",
    "hubspot",
    "fireflies",
    "github",
    "jira",
    "confluence",
  ];

  for (const source of supportedSources) {
    if (parts.includes(source)) {
      return source;
    }
  }

  throw new Error(
    `Unable to detect source from path: ${filePath}`,
  );
}

function extractSourceId(
  data: Record<string, unknown>,
  filePath: string,
): string {
  const id = firstString(data, [
    "sourceId",
    "source_id",
    "id",
    "key",
    "meeting_id",
    "thread_id",
    "issue_key",
    "number",
  ]);

  if (id) {
    return id;
  }

  return filePath;
}

export function normalizeDocument(
  data: Record<string, unknown>,
  filePath: string,
): NormalizedDocument {
  const source = detectSource(filePath);

  const datasetDocUuid = firstString(data, [
    "dataset_doc_uuid",
    "datasetDocUuid",
  ]);

  if (!datasetDocUuid) {
    throw new Error(
      `Missing dataset_doc_uuid: ${filePath}`,
    );
  }

  const sourceId = extractSourceId(
    data,
    filePath,
  );

  const title =
    firstString(data, [
      "title",
      "name",
      "subject",
    ]) ?? sourceId;

  const content = extractContent(data);

  const metadata = {
    createdAt: firstString(data, [
      "created_at",
      "createdAt",
      "created",
      "recorded_at",
    ]),

    updatedAt: firstString(data, [
      "updated_at",
      "updatedAt",
      "modified_at",
    ]),

    author: firstString(data, [
      "author",
      "creator",
      "created_by",
      "owner",
      "redwood_owner",
    ]),

    url: firstString(data, [
      "url",
      "link",
      "web_url",
    ]),
  };

  return {
    id: datasetDocUuid,

    source,
    sourceId,

    title,

    content,

    metadata,

    raw: data,
  };
}