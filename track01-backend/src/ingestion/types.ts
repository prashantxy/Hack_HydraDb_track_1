export type SourceType =
  | "slack"
  | "gmail"
  | "linear"
  | "gdrive"
  | "hubspot"
  | "fireflies"
  | "github"
  | "jira"
  | "confluence";

export interface RawDocument {
  datasetDocUuid: string;
  source: SourceType;
  sourceId: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface NormalizedDocument {
  id: string;
  source: SourceType;
  sourceId: string;
  title: string;
  content: string;
  metadata: {
    createdAt?: string;
    updatedAt?: string;
    author?: string;
    url?: string;
  };
  raw: Record<string, unknown>;
}