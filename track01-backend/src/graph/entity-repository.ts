import { HydraClient } from "../core/hydra-client";
import type { Entity } from "../types/entity";

export class EntityRepository {
  constructor(private db: HydraClient) {}

  async create(entity: Entity) {
    await this.db.run(
      `
      CREATE (e:Entity {
        id: $id,
        type: $type,
        canonicalName: $canonicalName
      })
      `,
      {
        id: entity.id,
        type: entity.type,
        canonicalName: entity.canonicalName,
      },
    );
  }

  async findById(id: number) {
    return this.db.run(
      `
      MATCH (e:Entity {id: $id})
      RETURN e
      `,
      { id },
    );
  }
}