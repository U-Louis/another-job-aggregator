import type { FetchParams } from "../../types/fetch.ts"

export async function fetchExternalScraper(
  _params: FetchParams,
  _fetchImpl?: typeof fetch,
): Promise<unknown> {
  throw new Error("External scraper fetch is not implemented")
}
