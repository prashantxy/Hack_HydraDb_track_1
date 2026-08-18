import { HydraClient } from "../src/core/hydra-client";

const client = new HydraClient();

async function main() {
  console.log("Checking HydraDB...");

  await client.verify();

  console.log("✓ Bolt connectivity");

  // --------------------------------------------------
  // CREATE
  // HydraDB supports this graph creation pattern.
  // --------------------------------------------------

  await client.run(
    `
    CREATE
      (a:Document {
        id: $documentId,
        name: $documentName
      }),
      (b:Person {
        id: $personId,
        name: $personName
      }),
      (a)-[:MENTIONS]->(b)
    `,
    {
      documentId: 100001,
      documentName: "test-document",

      personId: 100002,
      personName: "Sam",
    },
  );

  console.log("✓ CREATE edge + vertices");

  // --------------------------------------------------
  // MATCH
  // --------------------------------------------------

  const records = await client.run(
    `
    MATCH (a:Document {id: $documentId})
    MATCH (b:Person {id: $personId})
    RETURN
      a.id AS sourceId,
      a.name AS sourceName,
      b.id AS targetId,
      b.name AS targetName
    `,
    {
      documentId: 100001,
      personId: 100002,
    },
  );

  for (const record of records) {
    const sourceId = record.get("sourceId");
    const targetId = record.get("targetId");

    console.log({
      sourceId:
        typeof sourceId?.toNumber === "function"
          ? sourceId.toNumber()
          : sourceId,

      sourceName: record.get("sourceName"),

      targetId:
        typeof targetId?.toNumber === "function"
          ? targetId.toNumber()
          : targetId,

      targetName: record.get("targetName"),
    });
  }

  console.log("✓ MATCH");

  console.log("\nHydraDB graph write test passed.");
}

try {
  await main();
} catch (error) {
  console.error("HydraDB graph write test failed:");

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