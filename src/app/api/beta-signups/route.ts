import { parseBetaSignup, saveBetaSignup } from "@/lib/beta-signups";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Please submit the form from this website." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Expected a JSON form submission." }, { status: 415 });
  }
  let body: unknown;
  try {
    // Bound streamed bodies too, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Empty body");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) {
        await reader.cancel();
        return Response.json({ error: "Form submission is too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return Response.json({ error: "Please check your form and try again." }, { status: 400 });
  }
  // A hidden field catches basic automated submissions without collecting them.
  if (body && typeof body === "object" && "website" in body && body.website) {
    return Response.json({ success: true });
  }
  const signup = parseBetaSignup(body);
  if (!signup) return Response.json({ error: "Enter your name, a valid email, café name, and agree to beta contact." }, { status: 400 });
  try {
    await saveBetaSignup(signup);
    // Do not expose whether this email already exists.
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "We couldn’t save your signup. Please try again shortly." }, { status: 503 });
  }
}
