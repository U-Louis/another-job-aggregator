import type { FetchParams } from "../../../types/fetch.ts"
import { himalayasQuerySchema, type HimalayasQuery } from "./schema.ts"

const HIMALAYAS_SEARCH_URL = "https://himalayas.app/jobs/api/search"

export function buildQuery(query: HimalayasQuery): FetchParams {
  const parsed = himalayasQuerySchema.parse(query)
  const params = new URLSearchParams()

  if (parsed.q !== undefined && parsed.q.trim().length > 0) {
    params.set("q", parsed.q.trim())
  }
  if (parsed.sort !== undefined && parsed.sort.trim().length > 0) {
    params.set("sort", parsed.sort.trim())
  }
  if (parsed.seniority !== undefined && parsed.seniority.trim().length > 0) {
    params.set("seniority", parsed.seniority.trim())
  }
  if (parsed.worldwide === true) {
    params.set("worldwide", "true")
  }

  const queryString = params.toString()
  const url = queryString
    ? `${HIMALAYAS_SEARCH_URL}?${queryString}`
    : HIMALAYAS_SEARCH_URL

  return {
    url,
    headers: {
      Accept: "application/json",
    },
  }
}
