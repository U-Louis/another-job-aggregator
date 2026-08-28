import type { FetchParams } from "../../types/fetch.ts"

export async function fetchRss(
  _params: FetchParams,
  _fetchImpl?: typeof fetch,
): Promise<unknown> {
  throw new Error("RSS fetch is not implemented")
}
