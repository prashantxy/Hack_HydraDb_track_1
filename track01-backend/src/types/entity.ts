export type EntityType =
  | "PERSON"
  | "COMPANY"
  | "TEAM"
  | "PROJECT"
  | "PRODUCT"
  | "CUSTOMER"
  | "DOCUMENT"
  | "TASK"
  | "ISSUE"
  | "MEETING";

export interface EntityMention {
  text: string;
  type: EntityType;
  documentId: string;
  context: string;
  metadata?: Record<string, unknown>;
}

export interface Entity {
  id: number;
  type: EntityType;
  canonicalName: string;

  aliases: string[];

  metadata: Record<string, unknown>;
}

