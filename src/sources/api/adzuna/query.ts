import type { FetchParams } from "../../../types/fetch.ts"
import { adzunaQuerySchema, type AdzunaQuery } from "./schema.ts"

const ADZUNA_RESULTS_PER_PAGE = 50

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}

export function buildQuery(query: AdzunaQuery): FetchParams {
  const parsed = adzunaQuerySchema.parse(query)
  const appId = requireEnv("ADZUNA_APP_ID")
  const appKey = requireEnv("ADZUNA_APP_KEY")

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(ADZUNA_RESULTS_PER_PAGE),
  })

  if (parsed.what !== undefined) {
    params.set("what", parsed.what)
  }
  if (parsed.where !== undefined) {
    params.set("where", parsed.where)
  }
  if (parsed.what_exclude !== undefined) {
    params.set("what_exclude", parsed.what_exclude)
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(parsed.country)}/search/1?${params}`

  return { url }
}
