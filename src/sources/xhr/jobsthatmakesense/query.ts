import type { FetchParams } from "../../../types/fetch.ts"
import {
  jtmsQuerySchema,
  type JtmsQuery,
  type JtmsSortBy,
} from "./schema.ts"

export const JTMS_ALGOLIA_APP_ID = "3PWOXB8RR8"
export const JTMS_ALGOLIA_API_KEY = "9f6fbb0df5013236f8a29ed972622443"
export const JTMS_ORIGIN = "https://jobs.makesense.org"
export const JTMS_DEFAULT_HITS_PER_PAGE = 20
export const JTMS_DEFAULT_MAX_PAGES = 3
export const JTMS_DEFAULT_AROUND_RADIUS = 50_000

export function indexNameForSort(sortBy: JtmsSortBy | undefined): string {
  const sort = sortBy ?? "relevance"
  return `prod_JOBS_${sort}`
}

export function buildAlgoliaUrl(sortBy: JtmsQuery["sort_by"]): string {
  const appId = JTMS_ALGOLIA_APP_ID.toLowerCase()
  return `https://${appId}-dsn.algolia.net/1/indexes/${indexNameForSort(sortBy)}/query`
}

export function buildFilters(query: JtmsQuery): string | undefined {
  const parsed = jtmsQuerySchema.parse(query)
  const filters: string[] = [`region:${parsed.region}`]

  if (parsed.remote !== undefined) {
    filters.push(`remote:${parsed.remote}`)
  }
  if (parsed.exclude_remote !== undefined) {
    filters.push(`NOT remote:${parsed.exclude_remote}`)
  }

  return filters.join(" AND ")
}

export function buildSearchBody(query: JtmsQuery, page: number): string {
  const parsed = jtmsQuerySchema.parse(query)
  const body: Record<string, unknown> = {
    query: parsed.query ?? "",
    hitsPerPage: parsed.hits_per_page ?? JTMS_DEFAULT_HITS_PER_PAGE,
    page,
    attributesToRetrieve: "*",
  }

  const filters = buildFilters(parsed)
  if (filters !== undefined) {
    body.filters = filters
  }

  if (parsed.around_lat !== undefined && parsed.around_lng !== undefined) {
    body.aroundLatLng = `${parsed.around_lat},${parsed.around_lng}`
    body.aroundRadius = parsed.around_radius ?? JTMS_DEFAULT_AROUND_RADIUS
  }

  return JSON.stringify(body)
}

export function buildQuery(query: JtmsQuery): FetchParams {
  const parsed = jtmsQuerySchema.parse(query)

  return {
    url: buildAlgoliaUrl(parsed.sort_by),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-algolia-application-id": JTMS_ALGOLIA_APP_ID,
      "x-algolia-api-key": JTMS_ALGOLIA_API_KEY,
      Origin: JTMS_ORIGIN,
      Referer: `${JTMS_ORIGIN}/`,
    },
    body: buildSearchBody(parsed, 0),
  }
}
