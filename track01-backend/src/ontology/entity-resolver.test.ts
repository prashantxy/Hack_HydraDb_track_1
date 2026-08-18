import {
  resolveEntity,
} from "./entity-resolver";

const entities = [
  {
    id: "person:123",
    type: "person" as const,
    name: "Soham Ratnaparkhi",
    aliases: ["Sam", "@soham"],
    sourceIds: [],
    attributes: {},
  },
];

const result = resolveEntity(
  {
    type: "person",
    name: "S. Ratnaparkhi",
    source: "slack",
    documentId: "doc-1",
    attributes: {},
  },
  entities,
);

console.dir(result, {
  depth: null,
});