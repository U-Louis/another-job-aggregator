import {
  FETCH_BACKOFF_BASE_MS,
  FETCH_MAX_RETRIES,
  FETCH_TIMEOUT_MS,
  type FetchParams,
} from "../../types/fetch.ts"
import { parseFeed } from "./parse-feed.ts"
import type { FeedPayload } from "./schema.ts"

class FetchHttpError extends Error {
  readonly status: number

  constructor(status: number, statusText: string) {
    super(`HTTP ${status} ${statusText}`)
    this.status = status
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

export async function fetchRss(
  params: FetchParams,
  fetchImpl: typeof fetch = fetch,
): Promise<FeedPayload> {
  const method = params.method ?? "GET"
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= FETCH_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(FETCH_BACKOFF_BASE_MS * 2 ** (attempt - 1))
    }

    try {
      const timeoutMs = params.timeoutMs ?? FETCH_TIMEOUT_MS
      const response = await fetchImpl(params.url, {
        method,
        headers: params.headers,
        body: params.body,
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        const error = new FetchHttpError(response.status, response.statusText)
        if (isRetryableStatus(response.status) && attempt < FETCH_MAX_RETRIES) {
          lastError = error
          continue
        }
        throw error
      }

      const text = await response.text()
      if (text.length === 0) {
        throw new Error("Feed response body is empty")
      }

      return parseFeed(text)
    } catch (err) {
      if (err instanceof FetchHttpError && !isRetryableStatus(err.status)) {
        throw err
      }
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < FETCH_MAX_RETRIES) {
        continue
      }
    }
  }

  throw lastError ?? new Error("Fetch failed")
}
