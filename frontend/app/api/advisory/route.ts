import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/api/backend";

export async function POST(request: Request) {
  const body = await request.text();
  try {
    const backendResponse = await forwardToBackend("/api/advisory", {
      method: "POST",
      body,
    });
    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ detail: "Could not reach the PaaniPlan backend." }, { status: 502 });
  }
}
