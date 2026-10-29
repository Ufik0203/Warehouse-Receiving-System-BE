import { hash, verify, argon2id } from 'argon2';
import { randomBytes } from 'node:crypto';

export function hashPassword(password: string) {
  return hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}
let dummyHash: Promise<string> | undefined;
export async function verifyPassword(stored: string | undefined, password: string): Promise<boolean> {
  // Unknown accounts still incur Argon2 verification. Never log hashes/input.
  dummyHash ??= hashPassword(randomBytes(32).toString('hex'));
  try { return await verify(stored ?? await dummyHash, password); } catch { return false; }
}
