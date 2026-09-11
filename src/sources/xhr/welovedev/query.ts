import type { FetchParams } from "../../../types/fetch.ts"
import { welovedevQuerySchema, type WelovedevQuery } from "./schema.ts"

export const WELOVEDEV_SEARCH_BASE = "https://search.welovedevs.com"
export const WELOVEDEV_SEARCH_PATH = "poc"
export const WELOVEDEV_INDEX = "public_jobs"
export const WELOVEDEV_ORIGIN = "https://welovedevs.com"
export const WELOVEDEV_DEFAULT_HITS_PER_PAGE = 20

export function searchTextFromQuery(query: WelovedevQuery): string {
  const parsed = welovedevQuerySchema.parse(query)
  return parsed.query?.trim() ?? ""
}

export function buildFilters(query: WelovedevQuery): string | undefined {
  const parsed = welovedevQuerySchema.parse(query)
  const filters: string[] = []

  if (parsed.remote !== undefined) {
    filters.push(`details.remotePolicy.frequency:${parsed.remote}`)
  }
  if (parsed.exclude_remote !== undefined) {
    filters.push(`NOT details.remotePolicy.frequency:${parsed.exclude_remote}`)
  }

  return filters.length > 0 ? filters.join(" AND ") : undefined
}

export function buildSearchParams(query: WelovedevQuery): string {
  const parsed = welovedevQuerySchema.parse(query)
  const params = new URLSearchParams()

  params.set(
    "hitsPerPage",
    String(parsed.hits_per_page ?? WELOVEDEV_DEFAULT_HITS_PER_PAGE),
  )
  params.set("page", "0")
  params.set("aroundPrecision", "20000")

  if (parsed.around_lat !== undefined && parsed.around_lng !== undefined) {
    params.set("aroundLatLng", `${parsed.around_lat},${parsed.around_lng}`)
    params.set(
      "aroundRadius",
      String(parsed.around_radius ?? 100_000),
    )
  }

  const filters = buildFilters(parsed)
  if (filters !== undefined) {
    params.set("filters", filters)
  }

  return params.toString()
}

export function buildSearchBody(query: WelovedevQuery): string {
  const parsed = welovedevQuerySchema.parse(query)

  return JSON.stringify([
    {
      indexName: WELOVEDEV_INDEX,
      query: searchTextFromQuery(parsed),
      params: buildSearchParams(parsed),
    },
  ])
}

export function buildQuery(query: WelovedevQuery): FetchParams {
  welovedevQuerySchema.parse(query)

  return {
    url: `${WELOVEDEV_SEARCH_BASE}/${WELOVEDEV_SEARCH_PATH}`,
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      Origin: WELOVEDEV_ORIGIN,
      Referer: `${WELOVEDEV_ORIGIN}/app/jobs`,
    },
    body: buildSearchBody(query),
  }
}
