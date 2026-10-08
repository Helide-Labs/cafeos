# CaféOS

Multi-tenant café operating system. Phase 1 focuses on the connected sale → recipe → stock → profit chain.

## Stack

- Next.js App Router + TypeScript
- Firestore-shaped data layer via Firebase Admin (cloud or emulator)
- Local file-backed store for zero-setup development
- Modular monolith API via Route Handlers

## Quick start (no Docker, no Firebase project)

```bash
npm install
cp .env.example .env
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default `DATA_BACKEND=memory` stores data in `.data/cafeos-memory.json`. No demo products/orders are seeded.

## Firestore emulator (optional local Firebase)

```bash
npm run db:up
```

Then set in `.env`:

```env
DATA_BACKEND="firestore"
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_PROJECT_ID="demo-cafeos"
```

```bash
npm run db:seed
npm run dev
```

Emulator UI: [http://127.0.0.1:4000](http://127.0.0.1:4000)

## Connect a real Firebase project

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore**.
3. Project settings → Service accounts → Generate new private key.
4. Update `.env`:

```env
DATA_BACKEND="firestore"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DEFAULT_TENANT_ID="tenant_default"
DEFAULT_BRANCH_ID="branch_default"
```

Leave `FIRESTORE_EMULATOR_HOST` unset for cloud.

```bash
npm run db:seed
npm run dev
```

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run db:seed` | Upsert default tenant + branch only |
| `npm run db:up` | Start Firestore emulator |
| `npm run dev` | Next.js development server |

## Data model

Collections under `tenants/{tenantId}/branches/{branchId}/`:

- `products`, `orders`, `stock`, `customers`, `employees`, `activities`
- `meta/counters` for order numbers

## Notes

- Auth/RBAC is not enabled yet. APIs use `DEFAULT_TENANT_ID` / `DEFAULT_BRANCH_ID`.
- Create products in **Menu & recipes**, then sell from **Point of sale**.
