import { createHash } from "node:crypto";

const MIN_ID = 100000;
const MAX_ID = 2147483647;

export function graphId(value: string): number {
  const hash = createHash("sha256")
    .update(value)
    .digest();

  const b0 = hash[0] ?? 0;
  const b1 = hash[1] ?? 0;
  const b2 = hash[2] ?? 0;
  const b3 = hash[3] ?? 0;

  const n =
    ((b0 << 24) |
      (b1 << 16) |
      (b2 << 8) |
      b3) >>>
    0;

  return MIN_ID + (n % (MAX_ID - MIN_ID));
}