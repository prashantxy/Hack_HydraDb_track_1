export function documentId(uuid: string) {
  return `document:${uuid}`;
}

export function personId(name: string) {
  return `person:${normalize(name)}`;
}

export function projectId(name: string) {
  return `project:${normalize(name)}`;
}

export function issueId(source: string, key: string) {
  return `issue:${source}:${key}`;
}

export function teamId(source: string, name: string) {
  return `team:${source}:${normalize(name)}`;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}