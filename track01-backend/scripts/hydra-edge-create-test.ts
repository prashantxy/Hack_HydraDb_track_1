import { HydraClient } from "../src/core/hydra-client";

const client = new HydraClient();

const documentId = 200001;
const personId = 200002;

async function main() {
  try {
    await client.verify();

    console.log("✓ HydraDB connectivity");
    console.log("Creating edge + vertices...");

    await client.run(
      `
      CREATE
        (a:Document {id: $documentId, name: $documentName})
        -[:MENTIONS]->
        (b:Person {id: $personId, name: $personName})
      `,
      {
        documentId,
        documentName: "hydra-test-document",
        personId,
        personName: "Sam",
      },
    );

    console.log("✓ edge + vertices created");

    const records = await client.run(
      `
      MATCH (a:Document {id: $documentId})
            -[:MENTIONS]->
            (b:Person {id: $personId})
      RETURN
        a.id AS documentId,
        a.name AS documentName,
        b.id AS personId,
        b.name AS personName
      `,
      {
        documentId,
        personId,
      },
    );

    for (const record of records) {
      const documentIdValue = record.get("documentId");
      const personIdValue = record.get("personId");

      console.log({
        documentId:
          typeof documentIdValue?.toNumber === "function"
            ? documentIdValue.toNumber()
            : documentIdValue,

        documentName: record.get("documentName"),

        personId:
          typeof personIdValue?.toNumber === "function"
            ? personIdValue.toNumber()
            : personIdValue,

        personName: record.get("personName"),
      });
    }

    console.log("✓ MATCH");
    console.log("✓ HydraDB edge creation works");
  } catch (error) {
    console.error("HydraDB edge test failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();