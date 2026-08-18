/**
 * HydraDB currently requires the special `id` node property
 * to be an integer.
 *
 * Our application IDs are strings such as:
 *   dsid_d0955bcbce8c492684def9d6a453a664
 *
 * Convert them deterministically into a safe integer.
 */
export function hydraNodeId(value: string): number {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // Keep inside signed 32-bit positive range.
  return (hash >>> 0) % 2_000_000_000;
}

export function hydraSourceNodeId(source: string): number {
  return hydraNodeId(`source:${source}`);
}