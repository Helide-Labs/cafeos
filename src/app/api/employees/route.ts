import { NextResponse } from "next/server";
import { createEmployee, listEmployees } from "@/lib/data/repo";
import type { Employee } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listEmployees());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list employees" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const role = String(body.role ?? "").trim();

    if (!name || !role) {
      return NextResponse.json({ error: "name and role are required" }, { status: 400 });
    }

    const employee = await createEmployee({
      name,
      role,
      shift: typeof body.shift === "string" ? body.shift : undefined,
      status: body.status as Employee["status"] | undefined,
      hours: typeof body.hours === "number" ? body.hours : undefined,
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create employee" },
      { status: 500 },
    );
  }
}
