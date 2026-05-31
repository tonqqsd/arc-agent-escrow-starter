import type { ApiStatus, IndexedJob } from "./types.js";

async function readApiError(response: Response) {
  const text = await response.text();
  if (!text) return `Request failed with status ${response.status}`;
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    return text;
  }
  return text;
}

export async function getStatus(): Promise<ApiStatus> {
  const response = await fetch("/api/status");
  if (!response.ok) throw new Error(await readApiError(response));
  return response.json();
}

export async function getJobs(address: string, fromBlock: string): Promise<{
  fromBlock: string;
  toBlock: string;
  clipped: boolean;
  jobs: IndexedJob[];
}> {
  const params = new URLSearchParams({ address, fromBlock });
  const response = await fetch(`/api/jobs?${params}`);
  if (!response.ok) throw new Error(await readApiError(response));
  return response.json();
}
