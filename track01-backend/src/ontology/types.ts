export type EntityType =
  | "person"
  | "organization"
  | "project"
  | "team"
  | "repository"
  | "channel"
  | "issue"
  | "document";

export interface ExtractedEntity {
  type: EntityType;

  /**
   * Name as it appeared in the source document.
   * Example:
   *   "Sam"
   *   "@soham"
   *   "S. Ratnaparkhi"
   */
  name: string;

  /**
   * Original source that produced this entity.
   */
  source: string;

  /**
   * Source-specific identifier when available.
   */
  sourceId?: string;

  /**
   * Additional attributes discovered during extraction.
   */
  attributes: Record<string, unknown>;

  /**
   * Document from which this entity was extracted.
   */
  documentId: string;
}

export interface CanonicalEntity {
  id: string;

  type: EntityType;

  /**
   * Canonical display name.
   */
  name: string;

  /**
   * Known aliases.
   */
  aliases: string[];

  /**
   * Source-specific IDs associated with this entity.
   */
  sourceIds: Array<{
    source: string;
    id: string;
  }>;

  /**
   * Additional canonical attributes.
   */
  attributes: Record<string, unknown>;
}

export interface EntityCandidate {
  entity: CanonicalEntity;

  /**
   * Resolution score between 0 and 1.
   */
  score: number;

  /**
   * Signals responsible for the score.
   */
  signals: string[];
}

export interface EntityResolution {
  extracted: ExtractedEntity;

  /**
   * Canonical entity selected by the resolver.
   * null means no sufficiently confident match.
   */
  canonical: CanonicalEntity | null;

  score: number;

  signals: string[];

  /**
   * Whether a new canonical entity should be created.
   */
  createNew: boolean;
}

export type RelationshipType =
  | "AUTHORED"
  | "MENTIONS"
  | "MEMBER_OF"
  | "WORKS_AT"
  | "WORKED_ON"
  | "ASSIGNED_TO"
  | "ABOUT"
  | "PARTICIPATED_IN"
  | "OWNS"
  | "CONTRIBUTES_TO";

export interface EntityRelationship {
  sourceEntityId: string;
  relationship: RelationshipType;
  targetEntityId: string;

  documentId: string;

  confidence: number;

  metadata?: Record<string, unknown>;
}