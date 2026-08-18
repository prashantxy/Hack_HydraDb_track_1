import { HydraClient } from "../src/core/hydra-client";

const client = new HydraClient();

try {
  console.log("Checking HydraDB...");

  await client.verify();

  console.log("✓ Bolt connectivity");

  await client.run(
    `
    CREATE (a:Package {
      id: $sourceId,
      name: $sourceName
    })-[:DEPENDS_ON]->(b:Package {
      id: $targetId,
      name: $targetName
    })
    `,
    {
      sourceId: 999999,
      sourceName: "backend-smoke-test-a",
      targetId: 999998,
      targetName: "backend-smoke-test-b",
    },
  );

  console.log("✓ CREATE edge + vertices");

  const records = await client.run(
    `
    MATCH (a:Package)-[:DEPENDS_ON]->(b:Package)
    WHERE a.id = $sourceId
    RETURN
      a.id AS sourceId,
      a.name AS sourceName,
      b.id AS targetId,
      b.name AS targetName
    `,
    {
      sourceId: 999999,
    },
  );

  for (const record of records) {
    console.log({
      sourceId: record.get("sourceId"),
      sourceName: record.get("sourceName"),
      targetId: record.get("targetId"),
      targetName: record.get("targetName"),
    });
  }

  console.log("✓ MATCH");
  console.log("HydraDB backend connection is working.");
} catch (error) {
  console.error("HydraDB smoke test failed:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.close();
}