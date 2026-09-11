import { fetchXhr } from "../fetch.ts"
import {
  buildQuery,
  buildSearchBody,
  WTTJ_DEFAULT_HITS_PER_PAGE,
  WTTJ_DEFAULT_MAX_PAGES,
} from "./query.ts"
import { wttjQuerySchema, wttjResponseSchema, type WttjQuery } from "./schema.ts"

export async function fetchPayload(
  query: WttjQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const parsed = wttjQuerySchema.parse(query)
  const maxPages = parsed.max_pages ?? WTTJ_DEFAULT_MAX_PAGES
  const hitsPerPage = parsed.hits_per_page ?? WTTJ_DEFAULT_HITS_PER_PAGE
  const hits = []

  for (let page = 0; page < maxPages; page++) {
    const params = {
      ...buildQuery(parsed),
      body: buildSearchBody(parsed, page),
    }
    const rawPayload = await fetchXhr(params, fetchImpl)
    const response = wttjResponseSchema.parse(rawPayload)
    hits.push(...response.hits)

    if (response.hits.length < hitsPerPage) {
      break
    }
  }

  return { hits }
}
