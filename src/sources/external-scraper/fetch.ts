import type { FetchParams } from "../../types/fetch.ts"

export async function fetchExternalScraper(
  _params: FetchParams,
): Promise<unknown> {
  throw new Error("External scraper fetch is not implemented")
}
