import type { FetchParams } from "../../../types/fetch.ts"
import {
  weworkremotelyQuerySchema,
  type WeworkremotelyQuery,
} from "./schema.ts"

export function buildQuery(query: WeworkremotelyQuery): FetchParams {
  const parsed = weworkremotelyQuerySchema.parse(query)

  return {
    url: parsed.feed_url,
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, */*",
    },
  }
}
