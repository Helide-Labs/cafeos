import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/data/repo";
import type { Campaign } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listCampaigns());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list campaigns" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const audience = String(body.audience ?? "").trim();
    const offer = String(body.offer ?? "").trim();

    if (!title || !audience || !offer) {
      return NextResponse.json({ error: "title, audience and offer are required" }, { status: 400 });
    }

    const campaign = await createCampaign({
      title,
      audience,
      offer,
      status: body.status as Campaign["status"] | undefined,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 500 },
    );
  }
}
