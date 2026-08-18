export type SourceType =
  | "slack"
  | "gmail"
  | "linear"
  | "google_drive"
  | "hubspot"
  | "fireflies"
  | "github"
  | "jira"
  | "confluence";

export interface Document {
  id: string;
  source: SourceType;
  title: string | null;
  text: string;
  timestamp: string | null;
  url: string | null;
  metadata: Record<string, unknown>;
}