export type DataBackend = "firestore" | "memory";

export function getDataBackend(): DataBackend {
  const explicit = process.env.DATA_BACKEND?.toLowerCase();
  if (explicit === "memory" || explicit === "firestore") return explicit;

  // Prefer Firestore when emulator or cloud credentials are configured.
  if (process.env.FIRESTORE_EMULATOR_HOST) return "firestore";
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) return "firestore";

  return "memory";
}
