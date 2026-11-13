import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getDataBackend } from "./data/backend";
import { getDb } from "./firebase";

export type BetaSignup = { name: string; email: string; cafeName: string; consent: true };

export function parseBetaSignup(value: unknown): BetaSignup | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const cafeName = typeof body.cafeName === "string" ? body.cafeName.trim() : "";
  if (!name || name.length > 100 || !cafeName || cafeName.length > 150 ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true) return null;
  return { name, email, cafeName, consent: true };
}

export async function saveBetaSignup(signup: BetaSignup) {
  const id = createHash("sha256").update(signup.email).digest("hex");
  const record = { ...signup, createdAt: new Date().toISOString(), source: "public-beta-form", consentVersion: "beta-invitations-v1" };
  if (getDataBackend() === "firestore") {
    const ref = getDb().collection("betaSignups").doc(id);
    await getDb().runTransaction(async (transaction) => {
      if (!(await transaction.get(ref)).exists) transaction.create(ref, record);
    });
    return;
  }
  const directory = join(process.cwd(), ".data", "beta-signups");
  await mkdir(directory, { recursive: true });
  try {
    // Exclusive creation makes repeated and concurrent submissions idempotent.
    await writeFile(join(directory, `${id}.json`), JSON.stringify(record, null, 2), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}
