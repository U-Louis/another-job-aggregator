export const BRIGHTDATA_API_BASE = "https://api.brightdata.com/datasets/v3"
export const LINKEDIN_JOBS_DATASET_ID = "gd_lpfll7v5hcqtkxl6l"

export const BRIGHTDATA_POLL_INTERVAL_MS = 15_000
export const BRIGHTDATA_MAX_POLL_ATTEMPTS = 40

export function requireBrightDataKey(): string {
  const value = process.env.BRIGHT_DATA_KEY
  if (!value) {
    throw new Error("Missing environment variable BRIGHT_DATA_KEY")
  }
  return value
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireBrightDataKey()}`,
    "Content-Type": "application/json",
  }
}

export type BrightDataDiscoverInput = {
  keyword: string
  location?: string
  country?: string
  remote?: string
  time_range?: string
  job_type?: string
  experience_level?: string
  company?: string
  location_radius?: string
}

export async function triggerLinkedInDiscover(
  input: BrightDataDiscoverInput,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const url = new URL(`${BRIGHTDATA_API_BASE}/trigger`)
  url.searchParams.set("dataset_id", LINKEDIN_JOBS_DATASET_ID)
  url.searchParams.set("type", "discover_new")
  url.searchParams.set("discover_by", "keyword")
  url.searchParams.set("format", "json")

  const response = await fetchImpl(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ input: [input] }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    throw new Error(
      `Bright Data trigger failed: HTTP ${response.status} ${response.statusText}`,
    )
  }

  const body = (await response.json()) as { snapshot_id?: string }
  if (!body.snapshot_id) {
    throw new Error("Bright Data trigger response missing snapshot_id")
  }

  return body.snapshot_id
}

export async function pollBrightDataSnapshot(
  snapshotId: string,
  fetchImpl: typeof fetch = fetch,
  options?: { pollIntervalMs?: number; maxAttempts?: number },
): Promise<void> {
  const pollIntervalMs = options?.pollIntervalMs ?? BRIGHTDATA_POLL_INTERVAL_MS
  const maxAttempts = options?.maxAttempts ?? BRIGHTDATA_MAX_POLL_ATTEMPTS
  const progressUrl = `${BRIGHTDATA_API_BASE}/progress/${snapshotId}`

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchImpl(progressUrl, {
      headers: { Authorization: `Bearer ${requireBrightDataKey()}` },
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      throw new Error(
        `Bright Data progress failed: HTTP ${response.status} ${response.statusText}`,
      )
    }

    const body = (await response.json()) as { status?: string }
    const status = body.status

    if (status === "ready") {
      return
    }
    if (status === "failed" || status === "canceled") {
      throw new Error(`Bright Data snapshot ${snapshotId} ${status}`)
    }

    if (attempt < maxAttempts - 1) {
      await sleep(pollIntervalMs)
    }
  }

  throw new Error(
    `Bright Data snapshot ${snapshotId} timed out after ${maxAttempts} polls`,
  )
}

export async function downloadBrightDataSnapshot(
  snapshotId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const url = new URL(`${BRIGHTDATA_API_BASE}/snapshot/${snapshotId}`)
  url.searchParams.set("format", "json")

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${requireBrightDataKey()}` },
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) {
    throw new Error(
      `Bright Data snapshot download failed: HTTP ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

export async function fetchLinkedInDiscover(
  input: BrightDataDiscoverInput,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const snapshotId = await triggerLinkedInDiscover(input, fetchImpl)
  await pollBrightDataSnapshot(snapshotId, fetchImpl)
  return downloadBrightDataSnapshot(snapshotId, fetchImpl)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
