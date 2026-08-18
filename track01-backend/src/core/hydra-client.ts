import neo4j, {
  type Driver,
} from "neo4j-driver";

function normalizeValue(
  value: unknown,
): any {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value === "number" &&
    Number.isInteger(value)
  ) {
    return neo4j.int(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === "object") {
    if (neo4j.isInt(value)) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(
        value as Record<string, unknown>,
      ).map(([k, v]) => [
        k,
        normalizeValue(v),
      ]),
    );
  }

  return value;
}

function normalizeParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  return normalizeValue(params);
}

export class HydraClient {
  private driver: Driver;

  constructor(
    uri = "bolt://127.0.0.1:7687",
    token =
      "local-development-token-32-bytes",
  ) {
    this.driver = neo4j.driver(
      uri,
      neo4j.auth.bearer(token),
      {
        encrypted: false,
      },
    );
  }

  async verify() {
    await this.driver.verifyConnectivity();
  }

  async run(
    cypher: string,
    params: Record<string, unknown> = {},
  ) {
    const session =
      this.driver.session();

    try {
      const result =
        await session.run(
          cypher,
          normalizeParams(params),
        );

      return result.records;
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}