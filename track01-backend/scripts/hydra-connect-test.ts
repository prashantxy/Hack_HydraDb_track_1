import { HydraClient } from "../src/core/hydra-client";

const client = new HydraClient();

try {
  console.log("Testing HydraDB...");

  await client.verify();

  console.log("✓ HydraDB connectivity");
} catch (error) {
  console.error("✗ HydraDB failed");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.close();
}
