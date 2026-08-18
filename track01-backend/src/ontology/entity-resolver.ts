import type {
  CanonicalEntity,
  EntityCandidate,
  EntityResolution,
  ExtractedEntity,
} from "./types";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^@/, "")
    .replace(/\s+/g, " ");
}

function nameParts(value: string): string[] {
  return normalize(value)
    .replace(/[._-]/g, " ")
    .split(" ")
    .filter(Boolean);
}

function surname(value: string): string | null {
  const parts = nameParts(value);
  return parts.length >= 2
    ? (parts[parts.length - 1] ?? null)
    : null;
}

function matchesInitialAndSurname(
  extracted: string,
  canonical: string,
): boolean {
  const extractedParts = nameParts(extracted);
  const canonicalParts = nameParts(canonical);

  if (
    extractedParts.length < 2 ||
    canonicalParts.length < 2
  ) {
    return false;
  }

  const extractedSurname =
    extractedParts[extractedParts.length - 1] ?? null;

  const canonicalSurname =
    canonicalParts[canonicalParts.length - 1] ?? null;

  if (
    extractedSurname === null ||
    canonicalSurname === null ||
    extractedSurname !== canonicalSurname
  ) {
    return false;
  }

  const extractedFirst = extractedParts[0] ?? null;
  const canonicalFirst = canonicalParts[0] ?? null;

  // "S." → "Soham"
  return (
    extractedFirst !== null &&
    canonicalFirst !== null &&
    extractedFirst.length === 1 &&
    canonicalFirst.startsWith(extractedFirst)
  );
}

function jaccardSimilarity(
  a: string,
  b: string,
): number {
  const aTokens = new Set(nameParts(a));
  const bTokens = new Set(nameParts(b));

  if (!aTokens.size || !bTokens.size) {
    return 0;
  }

  let intersection = 0;

  for (const token of aTokens) {
    if (bTokens.has(token)) {
      intersection++;
    }
  }

  const union =
    aTokens.size +
    bTokens.size -
    intersection;

  return union === 0
    ? 0
    : intersection / union;
}

function scoreCandidate(
  extracted: ExtractedEntity,
  candidate: CanonicalEntity,
): EntityCandidate {
  if (extracted.type !== candidate.type) {
    return {
      entity: candidate,
      score: 0,
      signals: ["type-mismatch"],
    };
  }

  let score = 0;
  const signals: string[] = [];

  // Exact name
  if (
    normalize(extracted.name) ===
    normalize(candidate.name)
  ) {
    score = 1;
    signals.push("exact-name");
  }

  // Alias match
  for (const alias of candidate.aliases) {
    if (
      normalize(extracted.name) ===
      normalize(alias)
    ) {
      score = Math.max(score, 0.95);
      signals.push("alias-match");
    }
  }

  // Source ID match
  if (extracted.sourceId) {
    const match = candidate.sourceIds.some(
      (item) =>
        item.source === extracted.source &&
        item.id === extracted.sourceId,
    );

    if (match) {
      score = Math.max(score, 1);
      signals.push("source-id-match");
    }
  }

  // Initial + surname:
  // "S. Ratnaparkhi" → "Soham Ratnaparkhi"
  if (
    matchesInitialAndSurname(
      extracted.name,
      candidate.name,
    )
  ) {
    score = Math.max(score, 0.9);
    signals.push("initial-surname-match");
  }

  // General name similarity
  const similarity = jaccardSimilarity(
    extracted.name,
    candidate.name,
  );

  if (similarity >= 0.8) {
    score = Math.max(score, 0.85);
    signals.push("strong-name-similarity");
  } else if (similarity >= 0.5) {
    score = Math.max(score, 0.65);
    signals.push("name-similarity");
  }

  return {
    entity: candidate,
    score,
    signals,
  };
}

export function findCandidates(
  extracted: ExtractedEntity,
  entities: CanonicalEntity[],
): EntityCandidate[] {
  return entities
    .map((entity) =>
      scoreCandidate(extracted, entity),
    )
    .filter(
      (candidate) => candidate.score > 0,
    )
    .sort(
      (a, b) => b.score - a.score,
    );
}

export function resolveEntity(
  extracted: ExtractedEntity,
  entities: CanonicalEntity[],
): EntityResolution {
  const candidates = findCandidates(
    extracted,
    entities,
  );

  const best = candidates[0];

  if (best && best.score >= 0.85) {
    return {
      extracted,
      canonical: best.entity,
      score: best.score,
      signals: best.signals,
      createNew: false,
    };
  }

  if (best && best.score >= 0.65) {
    return {
      extracted,
      canonical: null,
      score: best.score,
      signals: [
        ...best.signals,
        "ambiguous-match",
      ],
      createNew: false,
    };
  }

  return {
    extracted,
    canonical: null,
    score: 0,
    signals: ["no-match"],
    createNew: true,
  };
}