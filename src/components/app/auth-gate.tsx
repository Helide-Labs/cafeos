"use client";

import { useState } from "react";
import Link from "next/link";
import { Coffee } from "lucide-react";
import type { StaffAccount } from "@/lib/types";

export function AuthGate({
  mode,
  onReady,
}: {
  mode: "loading" | "setup" | "login";
  onReady: (user: StaffAccount, token: string) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = mode === "setup";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(setup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setup ? { name, username, password } : { username, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not sign in");
      onReady(body.user as StaffAccount, String(body.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "loading") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Caflix</h1>
          <p>Checking your sign-in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={(event) => void submit(event)}>
        <div className="auth-brand"><Coffee size={18} /><strong>Caflix</strong></div>
        <h1>{setup ? "Create the main account" : "Sign in"}</h1>
        <p>{setup ? "This account is the only one that can create other logins. Everyone else sees only their own dashboard." : "You will open the dashboard for your account."}</p>
        {setup && (
          <label>Name
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          </label>
        )}
        <label>Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={setup ? "new-password" : "current-password"} required />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Please wait…" : setup ? "Create main account" : "Sign in"}</button>
        <p><Link href="/">← Back to Caflix</Link> · <Link href="/help">Need help?</Link></p>
      </form>
    </div>
  );
}
