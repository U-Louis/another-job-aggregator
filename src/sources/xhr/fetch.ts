import type { FetchParams } from "../../types/fetch.ts"

export async function fetchXhr(
  _params: FetchParams,
  _fetchImpl?: typeof fetch,
): Promise<unknown> {
  throw new Error("XHR fetch is not implemented")
}
