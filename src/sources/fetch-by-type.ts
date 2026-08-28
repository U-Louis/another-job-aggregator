import type { SourceType } from "../types/config.ts"
import type { FetchParams } from "../types/fetch.ts"
import { fetchApi } from "./api/fetch.ts"
import { fetchExternalScraper } from "./external-scraper/fetch.ts"
import { fetchRss } from "./rss/fetch.ts"
import { fetchXhr } from "./xhr/fetch.ts"

export async function fetchByType(
  type: SourceType,
  params: FetchParams,
  fetchImpl?: typeof fetch,
): Promise<unknown> {
  switch (type) {
    case "api":
      return fetchApi(params, fetchImpl)
    case "rss":
      return fetchRss(params)
    case "xhr":
      return fetchXhr(params)
    case "external-scraper":
      return fetchExternalScraper(params)
  }
}
