import { HydraClient } from "../src/core/hydra-client";

const client = new HydraClient();

try {
  await client.verify();

  console.log("✓ HydraDB connectivity");

  console.log("Creating document + source...");

  await client.run(
    `
    CREATE (d:Document {
      id: $documentId,
      datasetDocUuid: $datasetDocUuid,
      source: $source,
      sourceId: $sourceId,
      title: $title,
      content: $content
    })-[:FROM_SOURCE]->(s:Source {
      id: $sourceIdNumber,
      name: $source
    })
    `,
    {
      documentId: 300001,
      datasetDocUuid: "dsid_test_document_001",
      source: "fireflies",
      sourceId: "ff-test-001",
      title: "Hydra document test",
      content: "This is a HydraDB document ingestion test.",
      sourceIdNumber: 300002,
    },
  );

  console.log("✓ CREATE succeeded");

  const rows = await client.run(
    `
    MATCH (d:Document)-[:FROM_SOURCE]->(s:Source)
    RETURN
      d.id AS documentId,
      d.datasetDocUuid AS datasetDocUuid,
      d.title AS title,
      d.source AS source,
      s.id AS sourceId,
      s.name AS sourceName
    `,
  );

  console.log("✓ MATCH succeeded");

  for (const row of rows) {
    const documentId = row.get("documentId");
    const sourceId = row.get("sourceId");

    console.log({
      documentId: documentId?.toNumber?.() ?? documentId,
      datasetDocUuid: row.get("datasetDocUuid"),
      title: row.get("title"),
      source: row.get("source"),
      sourceId: sourceId?.toNumber?.() ?? sourceId,
      sourceName: row.get("sourceName"),
    });
  }
} catch (error) {
  console.error("FAILED:");

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