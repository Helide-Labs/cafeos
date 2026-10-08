import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const globalForFirebase = globalThis as unknown as {
  cafeosFirebaseApp?: App;
  cafeosFirestore?: Firestore;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createFirebaseApp(): App {
  if (globalForFirebase.cafeosFirebaseApp) return globalForFirebase.cafeosFirebaseApp;
  if (getApps().length) {
    globalForFirebase.cafeosFirebaseApp = getApps()[0]!;
    return globalForFirebase.cafeosFirebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "demo-cafeos";
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (usingEmulator) {
    globalForFirebase.cafeosFirebaseApp = initializeApp({ projectId });
    return globalForFirebase.cafeosFirebaseApp;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Firebase credentials missing. Set FIRESTORE_EMULATOR_HOST for local emulator, or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY for cloud Firestore.",
    );
  }

  globalForFirebase.cafeosFirebaseApp = initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail,
      privateKey,
    }),
    projectId: requireEnv("FIREBASE_PROJECT_ID"),
  });

  return globalForFirebase.cafeosFirebaseApp;
}

export function getDb(): Firestore {
  if (globalForFirebase.cafeosFirestore) return globalForFirebase.cafeosFirestore;

  createFirebaseApp();
  const db = getFirestore();

  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Firestore settings can only be applied once (Next.js HMR / warm instances).
  }

  globalForFirebase.cafeosFirestore = db;
  return db;
}
