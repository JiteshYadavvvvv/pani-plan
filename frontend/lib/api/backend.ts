const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function forwardToBackend(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  return response;
}
