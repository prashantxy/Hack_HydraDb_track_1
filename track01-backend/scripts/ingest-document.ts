import type { RawDocument } from "../src/ingestion/types";
import {
  documentId,
  personId,
  projectId,
  issueId,
  teamId,
} from "../src/graph/ids";
import type { HydraClient } from "../src/core/hydra-client";

export async function ingestLinearDocument(
  client: HydraClient,
  doc: RawDocument,
) {
  const data = doc.metadata as Record<string, any>;

  const docId = documentId(doc.datasetDocUuid);

  // Document
  await client.run(
    `
    CREATE (d:Document {
      id: $id,
      source: $source,
      sourceId: $sourceId,
      title: $title,
      content: $content
    })
    `,
    {
      id: docId,
      source: doc.source,
      sourceId: doc.sourceId,
      title: doc.title,
      content: doc.content,
    },
  );

  // Creator
  if (data.creator) {
    await createPerson(client, data.creator);

    await client.run(
      `
      MATCH (d:Document {id: $documentId})
      MATCH (p:Person {id: $personId})
      CREATE (p)-[:CREATED]->(d)
      `,
      {
        documentId: docId,
        personId: personId(data.creator),
      },
    );
  }

  // Assignee
  if (data.assignee) {
    await createPerson(client, data.assignee);

    await client.run(
      `
      MATCH (d:Document {id: $documentId})
      MATCH (p:Person {id: $personId})
      CREATE (p)-[:ASSIGNED_TO]->(d)
      `,
      {
        documentId: docId,
        personId: personId(data.assignee),
      },
    );
  }

  // Project
  if (data.project) {
    await createProject(client, data.project);

    await client.run(
      `
      MATCH (d:Document {id: $documentId})
      MATCH (p:Project {id: $projectId})
      CREATE (d)-[:ABOUT]->(p)
      `,
      {
        documentId: docId,
        projectId: projectId(data.project),
      },
    );
  }

  // Team
  if (data.team) {
    await createTeam(client, data.team);

    await client.run(
      `
      MATCH (d:Document {id: $documentId})
      MATCH (t:Team {id: $teamId})
      CREATE (d)-[:FROM_TEAM]->(t)
      `,
      {
        documentId: docId,
        teamId: teamId("linear", data.team),
      },
    );
  }

  // Issue
  if (data.key) {
    await createIssue(client, {
      source: "linear",
      key: data.key,
      title: data.title,
      status: data.status,
    });

    await client.run(
      `
      MATCH (d:Document {id: $documentId})
      MATCH (i:Issue {id: $issueId})
      CREATE (d)-[:REPRESENTS]->(i)
      `,
      {
        documentId: docId,
        issueId: issueId("linear", data.key),
      },
    );
  }
}

async function createPerson(
  client: HydraClient,
  name: string,
) {
  await client.run(
    `
    CREATE (p:Person {
      id: $id,
      name: $name
    })
    `,
    {
      id: personId(name),
      name,
    },
  );
}

async function createProject(
  client: HydraClient,
  name: string,
) {
  await client.run(
    `
    CREATE (p:Project {
      id: $id,
      name: $name
    })
    `,
    {
      id: projectId(name),
      name,
    },
  );
}

async function createTeam(
  client: HydraClient,
  name: string,
) {
  await client.run(
    `
    CREATE (t:Team {
      id: $id,
      name: $name
    })
    `,
    {
      id: teamId("linear", name),
      name,
    },
  );
}

async function createIssue(
  client: HydraClient,
  issue: {
    source: string;
    key: string;
    title: string;
    status?: string;
  },
) {
  await client.run(
    `
    CREATE (i:Issue {
      id: $id,
      source: $source,
      key: $key,
      title: $title,
      status: $status
    })
    `,
    {
      id: issueId(issue.source, issue.key),
      source: issue.source,
      key: issue.key,
      title: issue.title,
      status: issue.status ?? null,
    },
  );
}