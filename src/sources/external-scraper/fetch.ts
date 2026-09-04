import type { FetchParams } from "../../types/fetch.ts"
import { fetchApi } from "../api/fetch.ts"

export async function fetchExternalScraper(
  params: FetchParams,
  fetchImpl?: typeof fetch,
): Promise<unknown> {
  return fetchApi(params, fetchImpl)
}
