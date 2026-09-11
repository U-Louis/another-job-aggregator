import type { FetchParams } from "../../types/fetch.ts"
import { fetchApi } from "../api/fetch.ts"

/** Browser-like defaults for hidden frontend APIs; provider headers override these. */
export const DEFAULT_XHR_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

export async function fetchXhr(
  params: FetchParams,
  fetchImpl?: typeof fetch,
): Promise<unknown> {
  return fetchApi(
    {
      ...params,
      headers: { ...DEFAULT_XHR_HEADERS, ...params.headers },
    },
    fetchImpl,
  )
}
