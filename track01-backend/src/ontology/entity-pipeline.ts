import type { NormalizedDocument } from "../ingestion/types";
import { extractEntities } from "./entity-extractor";
import { resolveEntity } from "./entity-resolver";
import type { CanonicalEntity } from "./types";

export interface EntityPipelineResult {
  documentId: string;
  extracted: number;
  resolved: number;
  created: number;
  ambiguous: number;
  resolutions: ReturnType<typeof resolveEntity>[];
}

export function processDocumentEntities(
  document: NormalizedDocument,
  canonicalEntities: CanonicalEntity[],
): EntityPipelineResult {
  const extracted = extractEntities(document);

  const resolutions = extracted.map(
    (entity) =>
      resolveEntity(
        entity,
        canonicalEntities,
      ),
  );

  return {
    documentId: document.id,
    extracted: extracted.length,

    resolved: resolutions.filter(
      (r) =>
        r.canonical !== null &&
        !r.createNew,
    ).length,

    created: resolutions.filter(
      (r) => r.createNew,
    ).length,

    ambiguous: resolutions.filter(
      (r) =>
        !r.createNew &&
        r.canonical === null,
    ).length,

    resolutions,
  };
}