import type { FetchParams } from "../../../types/fetch.ts"
import { remotiveQuerySchema, type RemotiveQuery } from "./schema.ts"

const REMOTIVE_API_BASE = "https://remotive.com/api/remote-jobs"

export function buildQuery(query: RemotiveQuery): FetchParams {
  const parsed = remotiveQuerySchema.parse(query)
  const params = new URLSearchParams()

  if (parsed.search !== undefined) {
    params.set("search", parsed.search)
  }
  if (parsed.category !== undefined) {
    params.set("category", parsed.category)
  }
  if (parsed.company_name !== undefined) {
    params.set("company_name", parsed.company_name)
  }
  if (parsed.limit !== undefined) {
    params.set("limit", String(parsed.limit))
  }

  const queryString = params.toString()
  const url = queryString
    ? `${REMOTIVE_API_BASE}?${queryString}`
    : REMOTIVE_API_BASE

  return { url }
}
