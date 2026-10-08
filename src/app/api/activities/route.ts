import { NextResponse } from "next/server";
import { addActivity, listActivities } from "@/lib/data/repo";
import type { Activity } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listActivities());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list activities" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const detail = String(body.detail ?? "").trim();
    const tone = (body.tone ?? "green") as Activity["tone"];

    if (!title || !detail) {
      return NextResponse.json({ error: "title and detail are required" }, { status: 400 });
    }

    const activity = await addActivity({ title, detail, tone });
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create activity" },
      { status: 500 },
    );
  }
}
