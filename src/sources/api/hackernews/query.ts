import type { FetchParams } from "../../../types/fetch.ts"
import {
  hackernewsQuerySchema,
  type HackernewsQuery,
} from "./schema.ts"

export const HN_ALGOLIA_SEARCH_BY_DATE_URL =
  "https://hn.algolia.com/api/v1/search_by_date"

export function buildQuery(query: HackernewsQuery): FetchParams {
  hackernewsQuerySchema.parse(query)

  return {
    url: HN_ALGOLIA_SEARCH_BY_DATE_URL,
    headers: {
      Accept: "application/json",
    },
  }
}
