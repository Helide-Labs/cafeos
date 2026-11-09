import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  return process.env.AUTH_SECRET || "caflix-local-session";
}

export function signSession(accountId: string) {
  const sig = createHmac("sha256", secret()).update(accountId).digest("base64url");
  return `${accountId}.${sig}`;
}

export function accountIdFromSession(token: string) {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const accountId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(accountId).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return accountId;
}

export function sessionToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
