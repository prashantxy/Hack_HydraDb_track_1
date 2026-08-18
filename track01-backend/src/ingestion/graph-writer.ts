import { HydraClient } from "../core/hydra-client";
import type { NormalizedDocument } from "./types";

export class GraphWriter {
  constructor(private client: HydraClient) {}

  async writeDocument(doc: NormalizedDocument) {
    // --------------------------------------------------
    // 1. Document vertex
    // --------------------------------------------------

    await this.client.run(
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
        id: doc.id,
        source: doc.source,
        sourceId: doc.sourceId,
        title: doc.title,
        content: doc.content,
      },
    );

    // --------------------------------------------------
    // 2. Source vertex + edge
    // --------------------------------------------------

    await this.client.run(
      `
      CREATE (s:Source {
        id: $sourceId,
        name: $source
      })

      CREATE (d:Document {
        id: $documentId
      })

      CREATE (d)-[:FROM_SOURCE]->(s)
      `,
      {
        documentId: doc.id,
        sourceId: doc.source,
        source: doc.source,
      },
    );
  }
}