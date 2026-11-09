import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function secret() {
  return process.env.AUTH_SECRET || "caflix-local-session";
}

export function usingDefaultAuthSecret() {
  return !process.env.AUTH_SECRET;
}

export function signSession(accountId: string, ttlMs = SESSION_TTL_MS) {
  const expiresAt = String(Date.now() + ttlMs);
  const payload = `${accountId}.${expiresAt}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function accountIdFromSession(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [accountId, expiresAt, sig] = parts;
  if (!accountId || !expiresAt || !sig) return null;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return null;
  const payload = `${accountId}.${expiresAt}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return accountId;
}

export function sessionToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
