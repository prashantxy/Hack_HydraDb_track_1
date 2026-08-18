import { HydraClient } from "../core/hydra-client";
import type { CanonicalEntity } from "./types";

export class OntologyGraphWriter {
  constructor(private client: HydraClient) {}

  async createEntity(entity: CanonicalEntity) {
    const result = await this.client.run(
      `
      CREATE (e:Entity {
        id: $id,
        name: $name
      })
      `,
      {
        id: entity.id,
        name: entity.name,
      },
    );

    return result;
  }
}