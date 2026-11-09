export const SESSION_KEY = "caflix-session";

export function authHeaders() {
  const token = typeof window === "undefined" ? "" : window.localStorage.getItem(SESSION_KEY) ?? "";
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}
