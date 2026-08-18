import { loadDocuments } from "../src/ingestion/document-loader";

const documents = loadDocuments({
    limit: 1000,
    root: ""
});

const stats = new Map<string, {
  count: number;
  fields: Set<string>;
}>();

for await (const doc of documents) {
  if (!stats.has(doc.source)) {
    stats.set(doc.source, {
      count: 0,
      fields: new Set(),
    });
  }

  const stat = stats.get(doc.source)!;

  stat.count++;

  for (const key of Object.keys(doc.raw)) {
    stat.fields.add(key);
  }
}

console.log("\nSOURCE SCHEMA");
console.log("=============\n");

for (const [source, stat] of stats) {
  console.log(`${source}`);
  console.log(`  documents: ${stat.count}`);
  console.log(`  fields:`);

  for (const field of [...stat.fields].sort()) {
    console.log(`    - ${field}`);
  }

  console.log();
}