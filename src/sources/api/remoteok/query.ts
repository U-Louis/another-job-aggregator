import type { FetchParams } from "../../../types/fetch.ts"
import { remoteokQuerySchema, type RemoteOkQuery } from "./schema.ts"

const REMOTEOK_API_BASE = "https://remoteok.com/api"

export function buildQuery(query: RemoteOkQuery): FetchParams {
  const parsed = remoteokQuerySchema.parse(query)
  const params = new URLSearchParams()

  if (parsed.tags !== undefined && parsed.tags.trim().length > 0) {
    params.set("tags", parsed.tags.trim())
  }

  const queryString = params.toString()
  const url = queryString
    ? `${REMOTEOK_API_BASE}?${queryString}`
    : REMOTEOK_API_BASE

  return {
    url,
    headers: {
      "User-Agent": "another-job-aggregator/1.0 (https://github.com/)",
    },
  }
}
