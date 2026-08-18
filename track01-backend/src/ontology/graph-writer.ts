import { HydraClient } from "../core/hydra-client";
import type { CanonicalEntity } from "./types";

function hydraNodeId(id: string): string {
  return `hydra:${id}`;
}

export class OntologyGraphWriter {
  upsertEntity(entity: { id: string; type: "person"; name: string; aliases: string[]; sourceIds: { source: string; id: string; }[]; attributes: {}; }) {
      throw new Error("Method not implemented.");
  }
  constructor(
    private client: HydraClient,
  ) {}

  async createEntity(
    entity: CanonicalEntity,
  ): Promise<void> {
    const nodeId = hydraNodeId(entity.id);

    await this.client.run(
      `
      CREATE (e:Entity {
        id: $id,
        entityId: $entityId,
        type: $type,
        name: $name
      })
      `,
      {
        id: nodeId,
        entityId: entity.id,
        type: entity.type,
        name: entity.name,
      },
    );
  }
}