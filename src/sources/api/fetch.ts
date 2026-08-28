import {
  FETCH_BACKOFF_BASE_MS,
  FETCH_MAX_RETRIES,
  FETCH_TIMEOUT_MS,
  type FetchParams,
} from "../../types/fetch.ts"

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

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.length === 0) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function fetchApi(
  params: FetchParams,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const method = params.method ?? "GET"
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= FETCH_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(FETCH_BACKOFF_BASE_MS * 2 ** (attempt - 1))
    }

    try {
      const response = await fetchImpl(params.url, {
        method,
        headers: params.headers,
        body: params.body,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })

      if (!response.ok) {
        const error = new FetchHttpError(response.status, response.statusText)
        if (isRetryableStatus(response.status) && attempt < FETCH_MAX_RETRIES) {
          lastError = error
          continue
        }
        throw error
      }

      return parseResponseBody(response)
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
