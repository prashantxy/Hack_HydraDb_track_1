import { HydraClient } from "./hydra-client";

const client = new HydraClient();

console.log("Testing exact ingestion query...");

await client.run(
  `
  CREATE (d:Document {
    id: $id,
    source: $source,
    sourceId: $sourceId,
    title: $title,
    content: $content
  })
  `,
  {
    id: "test-document-999",
    source: "slack",
    sourceId: "test-999",
    title: "Hydra test",
    content: "Hydra ontology test",
  },
);

console.log("✓ EXACT ingestion CREATE works");