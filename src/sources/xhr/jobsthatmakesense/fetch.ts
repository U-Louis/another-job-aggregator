import { fetchXhr } from "../fetch.ts"
import {
  buildQuery,
  buildSearchBody,
  JTMS_DEFAULT_HITS_PER_PAGE,
  JTMS_DEFAULT_MAX_PAGES,
} from "./query.ts"
import {
  jtmsQuerySchema,
  jtmsResponseSchema,
  type JtmsQuery,
} from "./schema.ts"

export async function fetchPayload(
  query: JtmsQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const parsed = jtmsQuerySchema.parse(query)
  const maxPages = parsed.max_pages ?? JTMS_DEFAULT_MAX_PAGES
  const hitsPerPage = parsed.hits_per_page ?? JTMS_DEFAULT_HITS_PER_PAGE
  const hits = []

  for (let page = 0; page < maxPages; page++) {
    const params = {
      ...buildQuery(parsed),
      body: buildSearchBody(parsed, page),
    }
    const rawPayload = await fetchXhr(params, fetchImpl)
    const response = jtmsResponseSchema.parse(rawPayload)
    hits.push(...response.hits)

    if (response.hits.length < hitsPerPage) {
      break
    }
  }

  return { hits }
}
