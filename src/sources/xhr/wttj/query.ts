import type { FetchParams } from "../../../types/fetch.ts"
import { wttjQuerySchema, type WttjQuery } from "./schema.ts"

export const WTTJ_ALGOLIA_APP_ID = "CSEKHVMS53"
export const WTTJ_ALGOLIA_API_KEY = "4bd8f6215d0cc52b26430765769e65a0"
export const WTTJ_DEFAULT_HITS_PER_PAGE = 30
export const WTTJ_DEFAULT_MAX_PAGES = 3

const WTTJ_ORIGIN = "https://www.welcometothejungle.com"

export function indexNameForLocale(locale: WttjQuery["locale"]): string {
  return `wttj_jobs_production_${locale}`
}

export function buildAlgoliaUrl(locale: WttjQuery["locale"]): string {
  return `https://${WTTJ_ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${indexNameForLocale(locale)}/query`
}

/** First token of a free-text location, title-cased for Algolia city facets. */
export function cityFromWhere(where: string): string {
  const first = where.trim().split(/\s+/)[0] ?? ""
  if (first.length === 0) {
    return ""
  }
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export function buildFilters(query: WttjQuery): string | undefined {
  const filters: string[] = []

  if (query.remote !== undefined) {
    filters.push(`remote:${query.remote}`)
  }
  if (query.exclude_remote !== undefined) {
    filters.push(`NOT remote:${query.exclude_remote}`)
  }

  return filters.length > 0 ? filters.join(" AND ") : undefined
}

export function buildFacetFilters(query: WttjQuery): string[][] | undefined {
  const groups: string[][] = []

  if (query.country_code !== undefined) {
    groups.push([`offices.country_code:${query.country_code}`])
  }
  if (query.where !== undefined && query.where.trim().length > 0) {
    groups.push([`offices.city:${cityFromWhere(query.where)}`])
  }

  return groups.length > 0 ? groups : undefined
}

export function buildSearchBody(query: WttjQuery, page: number): string {
  const parsed = wttjQuerySchema.parse(query)
  const body: Record<string, unknown> = {
    query: parsed.query ?? "",
    hitsPerPage: parsed.hits_per_page ?? WTTJ_DEFAULT_HITS_PER_PAGE,
    page,
  }

  const filters = buildFilters(parsed)
  if (filters !== undefined) {
    body.filters = filters
  }

  const facetFilters = buildFacetFilters(parsed)
  if (facetFilters !== undefined) {
    body.facetFilters = facetFilters
  }

  return JSON.stringify(body)
}

export function buildQuery(query: WttjQuery): FetchParams {
  const parsed = wttjQuerySchema.parse(query)

  return {
    url: buildAlgoliaUrl(parsed.locale),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-algolia-application-id": WTTJ_ALGOLIA_APP_ID,
      "x-algolia-api-key": WTTJ_ALGOLIA_API_KEY,
      Origin: WTTJ_ORIGIN,
      Referer: `${WTTJ_ORIGIN}/`,
    },
    body: buildSearchBody(parsed, 0),
  }
}
