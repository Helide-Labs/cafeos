import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-http";

export async function GET(request: Request) {
  try {
    const user = await currentAccount(request);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the session" },
      { status: 500 },
    );
  }
}
