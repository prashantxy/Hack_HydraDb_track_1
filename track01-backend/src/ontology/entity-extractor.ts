import type { NormalizedDocument } from "../ingestion/types";
import type {
  EntityType,
  ExtractedEntity,
} from "./types";

function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/^@/, "")
    .replace(/\s+/g, " ");
}

function addEntity(
  entities: ExtractedEntity[],
  document: NormalizedDocument,
  type: EntityType,
  name: string | undefined,
  sourceId?: string,
  attributes: Record<string, unknown> = {},
) {
  if (!name?.trim()) {
    return;
  }

  const normalized = normalizeName(name);

  if (!normalized) {
    return;
  }

  const exists = entities.some(
    (entity) =>
      entity.type === type &&
      entity.name.toLowerCase() === normalized.toLowerCase(),
  );

  if (exists) {
    return;
  }

  entities.push({
    type,
    name: normalized,
    source: document.source,
    sourceId,
    attributes,
    documentId: document.id,
  });
}

export function extractEntities(
  document: NormalizedDocument,
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  const metadata = document.metadata;

  // ---------------------------------------------
  // Author
  // ---------------------------------------------

  if (metadata.author) {
    addEntity(
      entities,
      document,
      "person",
      metadata.author,
    );
  }

  // ---------------------------------------------
  // Source-specific metadata
  // ---------------------------------------------

  const raw = document.raw;

  // Slack
  if (document.source === "slack") {
    const channel =
      typeof raw.channel_name === "string"
        ? raw.channel_name
        : typeof raw.channel === "string"
          ? raw.channel
          : undefined;

    addEntity(
      entities,
      document,
      "channel",
      channel,
    );
  }

  // GitHub
  if (document.source === "github") {
    const repository =
      typeof raw.repository === "string"
        ? raw.repository
        : typeof raw.repo === "string"
          ? raw.repo
          : undefined;

    addEntity(
      entities,
      document,
      "repository",
      repository,
    );

    const author =
      typeof raw.author === "string"
        ? raw.author
        : typeof raw.user === "string"
          ? raw.user
          : undefined;

    addEntity(
      entities,
      document,
      "person",
      author,
    );
  }

  // Jira
  if (document.source === "jira") {
    const project =
      typeof raw.project === "string"
        ? raw.project
        : typeof raw.projectKey === "string"
          ? raw.projectKey
          : undefined;

    addEntity(
      entities,
      document,
      "project",
      project,
    );

    const assignee =
      typeof raw.assignee === "string"
        ? raw.assignee
        : undefined;

    addEntity(
      entities,
      document,
      "person",
      assignee,
    );
  }

  // Linear
  if (document.source === "linear") {
    const project =
      typeof raw.project === "string"
        ? raw.project
        : undefined;

    addEntity(
      entities,
      document,
      "project",
      project,
    );

    const assignee =
      typeof raw.assignee === "string"
        ? raw.assignee
        : undefined;

    addEntity(
      entities,
      document,
      "person",
      assignee,
    );
  }

  return entities;
}