import { NextResponse } from "next/server";
import { filterBootstrapForRole, requireAuth } from "@/lib/auth-http";
import { getBootstrap } from "@/lib/data/repo";

export async function GET(request: Request) {
  try {
    const { account, error } = await requireAuth(request);
    if (error) return error;
    const data = filterBootstrapForRole(await getBootstrap(), account.role);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load bootstrap data";
    const status = message.includes("not found") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
