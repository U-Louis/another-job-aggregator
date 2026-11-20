import type { FetchParams } from "../../../types/fetch.ts"
import { larajobsQuerySchema, type LarajobsQuery } from "./schema.ts"

const LARAJOBS_API_URL = "https://larajobs.com/api/jobs"

export function buildQuery(query: LarajobsQuery): FetchParams {
  larajobsQuerySchema.parse(query)

  return {
    url: LARAJOBS_API_URL,
    headers: {
      Accept: "application/json",
    },
  }
}
