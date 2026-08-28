export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type FetchParams = {
  url: string
  method?: HttpMethod
  headers?: Record<string, string>
  body?: string
}

export const FETCH_MAX_RETRIES = 3
export const FETCH_TIMEOUT_MS = 30_000
export const FETCH_BACKOFF_BASE_MS = 1_000
