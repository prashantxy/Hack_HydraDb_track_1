import { HydraClient } from "../src/core/hydra-client";

const client = new HydraClient();

async function main() {
  try {
    await client.verify();
    console.log("✓ connectivity");

    console.log("1. bare vertex");

    await client.run(`
      CREATE (n)
    `);

    console.log("✓ bare vertex");

    console.log("2. labeled vertex");

    await client.run(`
      CREATE (n:Test)
    `);

    console.log("✓ labeled vertex");

    console.log("3. labeled vertex with id");

    await client.run(
      `
      CREATE (n:Test {id: $id})
      `,
      {
        id: 100001,
      },
    );

    console.log("✓ vertex with id");

  } catch (error) {
    console.error("FAILED:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();