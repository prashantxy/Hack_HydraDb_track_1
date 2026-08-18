import { HydraClient } from "../src/core/hydra-client";

const client = new HydraClient();

try {
  await client.verify();

  console.log("✓ connectivity");

  await client.run(`
    CREATE (n)
  `);

  console.log("✓ bare CREATE");
} catch (error) {
  console.error("CREATE failed:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.close();
}
