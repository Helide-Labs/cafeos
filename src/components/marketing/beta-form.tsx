"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function BetaForm() {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/beta-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), cafeName: data.get("cafeName"), consent: data.get("consent") === "on", website: data.get("website") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn’t save your signup. Please try again.");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="m-beta-form" aria-live="polite">
    {success ? <div className="m-beta-success" role="status"><CheckCircle2 size={36} /><h2>You’re on the list.</h2><p>Thanks for your interest in Caflix. We’ll use your email to contact you about beta access. Joining the list doesn’t create a workspace or guarantee an invitation.</p></div> :
      <form onSubmit={submit}>
        <h2>Join the beta list</h2>
        <p>Tell us a little about you and your café.</p>
        <fieldset disabled={busy}>
          <label htmlFor="beta-name">Your name</label><input id="beta-name" name="name" autoComplete="name" maxLength={100} required />
          <label htmlFor="beta-email">Email address</label><input id="beta-email" name="email" type="email" autoComplete="email" maxLength={254} required />
          <label htmlFor="beta-cafe">Café or business name</label><input id="beta-cafe" name="cafeName" autoComplete="organization" maxLength={150} required />
          <div className="m-beta-trap" aria-hidden="true"><label htmlFor="beta-website">Leave this empty</label><input id="beta-website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <label className="m-beta-consent"><input type="checkbox" name="consent" required /><span>I agree that Caflix can store these details and email me about beta access and onboarding.</span></label>
          {error && <p className="m-beta-error" role="alert">{error}</p>}
          <button type="submit" className="m-button">{busy ? "Joining…" : "Join the beta list"}<ArrowRight size={17} /></button>
        </fieldset>
        <p className="m-beta-note">No payment details needed. You can ask to leave the list by replying to a beta invitation.</p>
      </form>}
  </div>;
}
