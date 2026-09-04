import { fetchApi } from "../fetch.ts"
import {
  ADZUNA_DEFAULT_MAX_PAGES,
  ADZUNA_RESULTS_PER_PAGE,
  buildSearchUrl,
} from "./query.ts"
import { adzunaQuerySchema, adzunaResponseSchema, type AdzunaQuery } from "./schema.ts"

export async function fetchPayload(
  query: AdzunaQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const parsed = adzunaQuerySchema.parse(query)
  const maxPages = parsed.max_pages ?? ADZUNA_DEFAULT_MAX_PAGES
  const results = []

  for (let page = 1; page <= maxPages; page++) {
    const rawPayload = await fetchApi({ url: buildSearchUrl(parsed, page) }, fetchImpl)
    const response = adzunaResponseSchema.parse(rawPayload)
    results.push(...response.results)

    if (response.results.length < ADZUNA_RESULTS_PER_PAGE) {
      break
    }
  }

  return { results }
}
