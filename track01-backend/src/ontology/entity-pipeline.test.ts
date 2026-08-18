import { processDocumentEntities } from "./entity-pipeline";

const canonicalEntities = [
  {
    id: "person:123",
    type: "person" as const,
    name: "Soham Ratnaparkhi",
    aliases: ["Sam", "@soham"],
    sourceIds: [
      {
        source: "slack",
        id: "U123",
      },
    ],
    attributes: {},
  },
];

const document = {
  id: "doc:001",
  source: "slack" as const,
  sourceId: "msg-001",

  title: "Engineering discussion",

  content:
    "Sam will handle the deployment.",

  metadata: {
    author: "S. Ratnaparkhi",
  },

  raw: {
    channel_name: "engineering",
  },
};

const result = processDocumentEntities(
  document,
  canonicalEntities,
);

console.dir(result, {
  depth: null,
});