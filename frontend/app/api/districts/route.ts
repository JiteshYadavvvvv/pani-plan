import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/api/backend";

export async function GET() {
  try {
    const backendResponse = await forwardToBackend("/api/districts");
    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ detail: "Could not reach the PaaniPlan backend." }, { status: 502 });
  }
}
