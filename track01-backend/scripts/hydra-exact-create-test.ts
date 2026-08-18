
import { HydraClient } from "../src/core/hydra-client";

const client = new HydraClient();

async function main() {
  await client.verify();

  console.log("✓ HydraDB connectivity");
  console.log("Testing exact CREATE...");

  const params = {
    documentNodeId: 900001,
    sourceNodeId: 900002,

    datasetDocUuid: "dsid_test_900001",

    source: "github",

    documentSourceId: "github-test-001",

    title: "Hydra integer ID test",

    content: "Testing HydraDB integer node IDs.",
  };

  console.log("\nPARAMS:");
  console.dir(params, { depth: null });

  await client.run(
    `
    CREATE
      (d:Document {
        id: $documentNodeId,
        datasetDocUuid: $datasetDocUuid,
        source: $source,
        sourceId: $documentSourceId,
        title: $title,
        content: $content
      })
      -[:FROM_SOURCE]->
      (s:Source {
        id: $sourceNodeId,
        name: $source
      })
    `,
    params,
  );

  console.log("\n✓ CREATE succeeded");

  const result = await client.run(`
    MATCH (d:Document)-[:FROM_SOURCE]->(s:Source)
    RETURN
      d.id AS documentId,
      d.datasetDocUuid AS datasetDocUuid,
      d.source AS source,
      d.sourceId AS sourceId,
      d.title AS title,
      s.id AS sourceIdNode,
      s.name AS sourceName
  `);

  console.log("\nRESULT:");

  for (const record of result.slice(-3)) {
    console.dir(
      {
        documentId:
          record.get("documentId")?.toNumber?.() ??
          record.get("documentId"),

        datasetDocUuid:
          record.get("datasetDocUuid"),

        source:
          record.get("source"),

        sourceId:
          record.get("sourceId"),

        title:
          record.get("title"),

        sourceIdNode:
          record.get("sourceIdNode")?.toNumber?.() ??
          record.get("sourceIdNode"),

        sourceName:
          record.get("sourceName"),
      },
      { depth: null },
    );
  }
}

try {
  await main();
} catch (error) {
  console.error("\nFAILED:");

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