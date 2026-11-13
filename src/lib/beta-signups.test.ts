import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parseBetaSignup } from "./beta-signups";
import { POST } from "../app/api/beta-signups/route";

test("beta signup validates, persists, and deduplicates without exposing emails", async () => {
  const cwd = process.cwd();
  const backend = process.env.DATA_BACKEND;
  const directory = await mkdtemp(join(tmpdir(), "caflix-beta-test-"));
  const details = { name: "Cafe Owner", email: " OWNER@example.com ", cafeName: "Test Cafe", consent: true };
  const send = (body: unknown, origin = "http://localhost") => POST(new Request("http://localhost/api/beta-signups", {
    method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body),
  }));
  try {
    process.chdir(directory);
    process.env.DATA_BACKEND = "memory";
    assert.equal(parseBetaSignup(details)?.email, "owner@example.com");
    for (const invalid of [null, {}, { ...details, email: "bad" }, { ...details, consent: false }, { ...details, name: " " }]) {
      assert.equal((await send(invalid)).status, 400);
    }
    assert.equal((await send(details, "https://elsewhere.example")).status, 403);
    assert.equal((await send({ ...details, name: "a".repeat(5000) })).status, 413);
    assert.equal((await send({ ...details, website: "spam" })).status, 200);
    await assert.rejects(readdir(join(directory, ".data", "beta-signups")));
    const results = await Promise.all([send(details), send({ ...details, email: "owner@example.com" })]);
    for (const response of results) {
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { success: true });
    }
    const records = join(directory, ".data", "beta-signups");
    const files = await readdir(records);
    assert.equal(files.length, 1);
    const saved = JSON.parse(await readFile(join(records, files[0]), "utf8"));
    assert.equal(saved.email, "owner@example.com");
    assert.equal(saved.consent, true);
    assert.ok(saved.createdAt);
  } finally {
    process.chdir(cwd);
    if (backend === undefined) delete process.env.DATA_BACKEND;
    else process.env.DATA_BACKEND = backend;
    await rm(directory, { recursive: true, force: true });
  }
});
