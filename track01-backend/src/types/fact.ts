export interface Fact {
  id: number;

  subjectId: number;
  predicate: string;
  objectId?: number;

  value?: string | number | boolean;

  sourceDocumentId: string;

  extractedAt: string;

  confidence: number;
}