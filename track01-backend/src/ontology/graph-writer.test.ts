import {
  HydraClient,
} from "../core/hydra-client";

import {
  OntologyGraphWriter,
} from "./graph-writer";

const client = new HydraClient();

const writer =
  new OntologyGraphWriter(client);

const entity = {
  id: "person:test-001",

  type: "person" as const,

  name: "Soham Ratnaparkhi",

  aliases: [
    "Sam",
    "@soham",
  ],

  sourceIds: [
    {
      source: "slack",
      id: "U123",
    },
  ],

  attributes: {},
};

await writer.createEntity(entity);

console.log(
  "✓ Entity written to HydraDB",
);