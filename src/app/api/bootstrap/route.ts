import { NextResponse } from "next/server";
import { getBootstrap } from "@/lib/data/repo";

export async function GET() {
  try {
    const data = await getBootstrap();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load bootstrap data";
    const status = message.includes("not found") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
