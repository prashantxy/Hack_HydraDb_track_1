import { HydraClient } from "../src/core/hydra-client";
import {
  hydraNodeId,
  hydraSourceNodeId,
} from "../src/core/hydra-ids";
import { loadDocuments } from "../src/ingestion/document-loader";
import type { SourceType } from "../src/ingestion/types";

const client = new HydraClient();

const LIMIT = 100;
const BATCH_SIZE = 50;

interface DocumentRow {
  vertex: number;
  datasetDocUuid: string;
  source: string;
  sourceId: string;
  title: string;
  content: string;
}

interface SourceRow {
  vertex: number;
  source_id: string;
  active: boolean;
}

interface EdgeRow {
  relationship_vertex: number;
  source_vertex: number;
  destination_vertex: number;
  source_id: string;
}

interface IngestionStats {
  loaded: number;

  documentsInserted: number;
  documentsUpdated: number;
  documentsFailed: number;

  sourcesCreated: number;
  sourcesExisting: number;
  sourceFailures: number;

  edgesCreated: number;
  edgesExisting: number;
  edgeFailures: number;
}

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

function toNumber(value: any): number {
  return value?.toNumber?.() ?? Number(value);
}

function printError(prefix: string, error: unknown) {
  console.error(prefix);

  if (error instanceof Error) {
    console.error(`  Error: ${error.message}`);

    if (error.stack) {
      console.error(`  Stack: ${error.stack}`);
    }
  } else {
    console.error("  Error:", error);
  }
}

function chunk<T>(rows: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < rows.length; i += size) {
    result.push(rows.slice(i, i + size));
  }

  return result;
}

// ----------------------------------------------------
// ENSURE SOURCE VERTICES
// ----------------------------------------------------

async function ensureSources(
  sources: string[],
  stats: IngestionStats,
) {
  console.log("");
  console.log("------------------------");
  console.log("ENSURING SOURCES");
  console.log("------------------------");

  const rows: SourceRow[] = sources.map((source) => ({
    vertex: hydraSourceNodeId(source),
    source_id: source,
    active: true,
  }));

  console.log(`Sources: ${rows.length}`);

  // --------------------------------------------------
  // Check existing sources first
  // --------------------------------------------------

  const existingSourceIds = new Set<number>();

  for (const batch of chunk(rows, BATCH_SIZE)) {
    try {
      const result = await client.run(
        `
        UNWIND $rows AS row

        MATCH (n:Source {
          id: row.vertex
        })

        RETURN
          n.id AS id
        `,
        {
          rows: batch,
        },
      );

      for (const record of result) {
        const id = record.get("id");

        if (id !== undefined && id !== null) {
          existingSourceIds.add(toNumber(id));
        }
      }
    } catch (error) {
      printError(
        "✗ Failed checking existing sources",
        error,
      );

      stats.sourceFailures += batch.length;
    }
  }

  // --------------------------------------------------
  // Upsert sources
  // --------------------------------------------------

  for (const batch of chunk(rows, BATCH_SIZE)) {
    try {
      await client.run(
        `
        UNWIND $rows AS row

        MERGE (n {
          id: row.vertex
        })

        SET
          n:Source,
          n.source_id = row.source_id,
          n.active = row.active
        `,
        {
          rows: batch,
        },
      );

      for (const row of batch) {
        if (existingSourceIds.has(row.vertex)) {
          stats.sourcesExisting++;
        } else {
          stats.sourcesCreated++;
        }

        console.log(
          `  ✓ Source ready: ${row.source_id} → ${row.vertex}`,
        );
      }
    } catch (error) {
      printError(
        `✗ Source batch failed (${batch.length} rows)`,
        error,
      );

      stats.sourceFailures += batch.length;
    }
  }
}

// ----------------------------------------------------
// UPSERT DOCUMENT VERTICES
// ----------------------------------------------------

async function upsertDocuments(
  rows: DocumentRow[],
  stats: IngestionStats,
) {
  console.log("");
  console.log("------------------------");
  console.log("UPSERTING DOCUMENTS");
  console.log("------------------------");

  console.log(`Documents: ${rows.length}`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  // --------------------------------------------------
  // Determine which documents already exist
  // --------------------------------------------------

  const existingDocumentIds = new Set<number>();

  for (const batch of chunk(rows, BATCH_SIZE)) {
    try {
      const result = await client.run(
        `
        UNWIND $rows AS row

        MATCH (n:Document {
          id: row.vertex
        })

        RETURN
          n.id AS id
        `,
        {
          rows: batch,
        },
      );

      for (const record of result) {
        const id = record.get("id");

        if (id !== undefined && id !== null) {
          existingDocumentIds.add(toNumber(id));
        }
      }
    } catch (error) {
      printError(
        "✗ Failed checking existing documents",
        error,
      );
    }
  }

  // --------------------------------------------------
  // Upsert documents
  // --------------------------------------------------

  let batchNumber = 0;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    batchNumber++;

    console.log(
      `  → Document batch ${batchNumber}/${Math.ceil(
        rows.length / BATCH_SIZE,
      )}`,
    );

    try {
      await client.run(
        `
        UNWIND $rows AS row

        MERGE (n {
          id: row.vertex
        })

        SET
          n:Document,
          n.datasetDocUuid = row.datasetDocUuid,
          n.source = row.source,
          n.sourceId = row.sourceId,
          n.title = row.title,
          n.content = row.content
        `,
        {
          rows: batch,
        },
      );

      for (const row of batch) {
        if (existingDocumentIds.has(row.vertex)) {
          stats.documentsUpdated++;
        } else {
          stats.documentsInserted++;
        }
      }

      console.log(
        `    ✓ ${batch.length} documents`,
      );
    } catch (error) {
      stats.documentsFailed += batch.length;

      printError(
        `    ✗ Document batch failed (${batch.length} rows)`,
        error,
      );

      // ------------------------------------------------
      // FALLBACK: isolate individual failures
      // ------------------------------------------------

      console.log(
        "    → Retrying failed batch individually...",
      );

      for (const row of batch) {
        try {
          await client.run(
            `
            UNWIND $rows AS row

            MERGE (n {
              id: row.vertex
            })

            SET
              n:Document,
              n.datasetDocUuid = row.datasetDocUuid,
              n.source = row.source,
              n.sourceId = row.sourceId,
              n.title = row.title,
              n.content = row.content
            `,
            {
              rows: [row],
            },
          );

          // Remove one failure because individual retry
          // succeeded.
          stats.documentsFailed--;

          if (existingDocumentIds.has(row.vertex)) {
            stats.documentsUpdated++;
          } else {
            stats.documentsInserted++;
          }

          console.log(
            `      ✓ ${row.source} :: ${row.datasetDocUuid}`,
          );
        } catch (individualError) {
          console.error(
            `      ✗ ${row.source} :: ${row.datasetDocUuid}`,
          );

          if (individualError instanceof Error) {
            console.error(
              `        ${individualError.message}`,
            );
          }
        }
      }
    }
  }
}

// ----------------------------------------------------
// CREATE / ENSURE FROM_SOURCE EDGES
// ----------------------------------------------------

async function ensureEdges(
  rows: EdgeRow[],
  stats: IngestionStats,
) {
  console.log("");
  console.log("------------------------");
  console.log("ENSURING FROM_SOURCE EDGES");
  console.log("------------------------");

  console.log(`Edges: ${rows.length}`);

  // --------------------------------------------------
  // Check existing edges
  // --------------------------------------------------

  const existingEdgeIds = new Set<number>();

  for (const batch of chunk(rows, BATCH_SIZE)) {
    try {
      const result = await client.run(
        `
        UNWIND $rows AS row

        MATCH
          (d:Document {
            id: row.destination_vertex
          })
          -[r:FROM_SOURCE {
            id: row.relationship_vertex
          }]->
          (s:Source {
            id: row.source_vertex
          })

        RETURN
          r.id AS id
        `,
        {
          rows: batch,
        },
      );

      for (const record of result) {
        const id = record.get("id");

        if (id !== undefined && id !== null) {
          existingEdgeIds.add(toNumber(id));
        }
      }
    } catch (error) {
      printError(
        "✗ Failed checking existing edges",
        error,
      );
    }
  }

  // --------------------------------------------------
  // Create missing edges
  // --------------------------------------------------

  for (const batch of chunk(rows, BATCH_SIZE)) {
    try {
      await client.run(
        `
        UNWIND $rows AS row

        MATCH
          (s:Source {
            id: row.source_vertex
          }),
          (d:Document {
            id: row.destination_vertex
          })

        MERGE
          (d)-[r:FROM_SOURCE {
            id: row.relationship_vertex
          }]->(s)

        SET
          r.source_id = row.source_id
        `,
        {
          rows: batch,
        },
      );

      for (const row of batch) {
        if (existingEdgeIds.has(row.relationship_vertex)) {
          stats.edgesExisting++;
        } else {
          stats.edgesCreated++;
        }
      }

      console.log(
        `  ✓ Edge batch: ${batch.length}`,
      );
    } catch (error) {
      stats.edgeFailures += batch.length;

      printError(
        `✗ Edge batch failed (${batch.length} rows)`,
        error,
      );

      // ------------------------------------------------
      // Retry individual edges
      // ------------------------------------------------

      console.log(
        "  → Retrying failed edges individually...",
      );

      for (const row of batch) {
        try {
          await client.run(
            `
            UNWIND $rows AS row

            MATCH
              (s:Source {
                id: row.source_vertex
              }),
              (d:Document {
                id: row.destination_vertex
              })

            MERGE
              (d)-[r:FROM_SOURCE {
                id: row.relationship_vertex
              }]->(s)

            SET
              r.source_id = row.source_id
            `,
            {
              rows: [row],
            },
          );

          stats.edgeFailures--;

          if (existingEdgeIds.has(row.relationship_vertex)) {
            stats.edgesExisting++;
          } else {
            stats.edgesCreated++;
          }

          console.log(
            `    ✓ Edge ${row.destination_vertex} → ${row.source_vertex}`,
          );
        } catch (individualError) {
          console.error(
            `    ✗ Edge failed: ${row.destination_vertex} → ${row.source_vertex}`,
          );

          if (individualError instanceof Error) {
            console.error(
              `      ${individualError.message}`,
            );
          }
        }
      }
    }
  }
}

// ----------------------------------------------------
// VERIFY GRAPH
// ----------------------------------------------------

async function verifyGraph() {
  console.log("");
  console.log("------------------------");
  console.log("VERIFYING GRAPH");
  console.log("------------------------");

  // --------------------------------------------------
  // Sample documents
  // --------------------------------------------------

  try {
    const result = await client.run(
      `
      MATCH
        (d:Document)
        -[:FROM_SOURCE]->
        (s:Source)

      RETURN
        d.id AS id,
        d.datasetDocUuid AS datasetDocUuid,
        d.source AS source,
        d.sourceId AS sourceId,
        d.title AS title,
        s.id AS sourceNodeId,
        s.source_id AS sourceName

      LIMIT 5
      `,
    );

    console.log("");
    console.log("Sample graph records:");

    for (const record of result) {
      const id = record.get("id");
      const sourceNodeId =
        record.get("sourceNodeId");

      console.log({
        documentId:
          id?.toNumber?.() ?? id,

        datasetDocUuid:
          record.get("datasetDocUuid"),

        source:
          record.get("source"),

        sourceId:
          record.get("sourceId"),

        title:
          record.get("title"),

        sourceNodeId:
          sourceNodeId?.toNumber?.() ??
          sourceNodeId,

        sourceName:
          record.get("sourceName"),
      });
    }
  } catch (error) {
    printError(
      "✗ Graph sample verification failed",
      error,
    );
  }

  // --------------------------------------------------
  // Verify GitHub specifically
  // --------------------------------------------------

  try {
    const result = await client.run(
      `
      MATCH
        (d:Document {
          source: "github"
        })
        -[:FROM_SOURCE]->
        (s:Source {
          source_id: "github"
        })

      RETURN
        d.id AS id,
        d.datasetDocUuid AS datasetDocUuid,
        d.title AS title

      LIMIT 5
      `,
    );

    console.log("");
    console.log("GitHub graph records:");

    for (const record of result) {
      const id = record.get("id");

      console.log({
        id:
          id?.toNumber?.() ?? id,

        datasetDocUuid:
          record.get("datasetDocUuid"),

        title:
          record.get("title"),
      });
    }
  } catch (error) {
    printError(
      "✗ GitHub verification failed",
      error,
    );
  }
}

// ----------------------------------------------------
// MAIN
// ----------------------------------------------------

async function main() {
  console.log("EnterpriseRAG → HydraDB");
  console.log("------------------------");

  // --------------------------------------------------
  // CONNECT
  // --------------------------------------------------

  await client.verify();

  console.log("✓ HydraDB connectivity");

  // --------------------------------------------------
  // LOAD DOCUMENTS
  // --------------------------------------------------

  const documents: Awaited<
    ReturnType<typeof loadDocuments>
  > extends AsyncGenerator<infer T, any, any>
    ? T[]
    : never = [];

  for await (const document of loadDocuments({
    limit: LIMIT,
    root: "",
  })) {
    documents.push(document);
  }

  console.log(
    `✓ Loaded ${documents.length} documents`,
  );

  // --------------------------------------------------
  // STATS
  // --------------------------------------------------

  const stats: IngestionStats = {
    loaded: documents.length,

    documentsInserted: 0,
    documentsUpdated: 0,
    documentsFailed: 0,

    sourcesCreated: 0,
    sourcesExisting: 0,
    sourceFailures: 0,

    edgesCreated: 0,
    edgesExisting: 0,
    edgeFailures: 0,
  };

  // --------------------------------------------------
  // PREPARE SOURCE ROWS
  // --------------------------------------------------

  const uniqueSources = [
    ...new Set(
      documents
        .map((document) => document.source)
        .filter(
          (source): source is SourceType =>
            typeof source === "string" &&
            source.trim().length > 0,
        ),
    ),
  ];

  const sourceRows: SourceRow[] =
    uniqueSources.map((source) => ({
      vertex: hydraSourceNodeId(source),
      source_id: source,
      active: true,
    }));

  // --------------------------------------------------
  // PREPARE DOCUMENT ROWS
  // --------------------------------------------------

  const documentRows: DocumentRow[] =
    documents
      .filter(
        (document) =>
          typeof document.source === "string" &&
          document.source.trim().length > 0,
      )
      .map((document) => ({
        vertex: hydraNodeId(document.id),

        datasetDocUuid: document.id,

        source: document.source,

        sourceId: document.sourceId,

        title: document.title,

        content: document.content,
      }));

  // --------------------------------------------------
  // PREPARE EDGE ROWS
  // --------------------------------------------------

  /*
   * Relationship IDs must be deterministic.
   *
   * This allows the ingestion script to be safely
   * rerun without creating another relationship.
   */

  const edgeRows: EdgeRow[] =
    documents
      .filter(
        (document) =>
          typeof document.source === "string" &&
          document.source.trim().length > 0,
      )
      .map((document) => {
        const documentNodeId =
          hydraNodeId(document.id);

        const sourceNodeId =
          hydraSourceNodeId(document.source);

        return {
          relationship_vertex:
            documentNodeId,

          source_vertex:
            sourceNodeId,

          destination_vertex:
            documentNodeId,

          source_id:
            document.source,
        };
      });

  // --------------------------------------------------
  // LOG PREPARATION
  // --------------------------------------------------

  console.log("");
  console.log("------------------------");
  console.log("PREPARED GRAPH DATA");
  console.log("------------------------");

  console.log(
    `Documents: ${documentRows.length}`,
  );

  console.log(
    `Sources:   ${sourceRows.length}`,
  );

  console.log(
    `Edges:     ${edgeRows.length}`,
  );

  // --------------------------------------------------
  // 1. SOURCES
  // --------------------------------------------------

  await ensureSources(
    uniqueSources,
    stats,
  );

  // --------------------------------------------------
  // 2. DOCUMENTS
  // --------------------------------------------------

  await upsertDocuments(
    documentRows,
    stats,
  );

  // --------------------------------------------------
  // 3. EDGES
  // --------------------------------------------------

  await ensureEdges(
    edgeRows,
    stats,
  );

  // --------------------------------------------------
  // 4. VERIFY
  // --------------------------------------------------

  await verifyGraph();

  // --------------------------------------------------
  // FINAL SUMMARY
  // --------------------------------------------------

  console.log("");
  console.log("------------------------");
  console.log("INGESTION COMPLETE");
  console.log("------------------------");

  console.log(
    `Loaded:            ${stats.loaded}`,
  );

  console.log("");

  console.log(
    `Documents inserted: ${stats.documentsInserted}`,
  );

  console.log(
    `Documents updated:  ${stats.documentsUpdated}`,
  );

  console.log(
    `Document failures:  ${stats.documentsFailed}`,
  );

  console.log("");

  console.log(
    `Sources created:    ${stats.sourcesCreated}`,
  );

  console.log(
    `Sources existing:   ${stats.sourcesExisting}`,
  );

  console.log(
    `Source failures:    ${stats.sourceFailures}`,
  );

  console.log("");

  console.log(
    `Edges created:      ${stats.edgesCreated}`,
  );

  console.log(
    `Edges existing:     ${stats.edgesExisting}`,
  );

  console.log(
    `Edge failures:      ${stats.edgeFailures}`,
  );

  console.log("------------------------");
}

// ----------------------------------------------------
// ENTRYPOINT
// ----------------------------------------------------

try {
  await main();
} catch (error) {
  console.error("");
  console.error("Fatal ingestion error:");

  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
} finally {
  await client.close();
}