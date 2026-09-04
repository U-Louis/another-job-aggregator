import type { FetchParams } from "../../../types/fetch.ts"
import { adzunaQuerySchema, type AdzunaQuery } from "./schema.ts"

export const ADZUNA_RESULTS_PER_PAGE = 50
export const ADZUNA_DEFAULT_MAX_PAGES = 3

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}

export function buildSearchUrl(query: AdzunaQuery, page: number): string {
  const parsed = adzunaQuerySchema.parse(query)
  const appId = requireEnv("ADZUNA_APP_ID")
  const appKey = requireEnv("ADZUNA_APP_KEY")

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(ADZUNA_RESULTS_PER_PAGE),
  })

  params.set("what", parsed.what)
  if (parsed.what_or !== undefined) {
    params.set("what_or", parsed.what_or)
  }
  if (parsed.where !== undefined) {
    params.set("where", parsed.where)
  }
  if (parsed.what_exclude !== undefined) {
    params.set("what_exclude", parsed.what_exclude)
  }

  return `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(parsed.country)}/search/${page}?${params}`
}

export function buildQuery(query: AdzunaQuery): FetchParams {
  return { url: buildSearchUrl(query, 1) }
}
