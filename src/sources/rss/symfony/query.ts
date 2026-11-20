import type { FetchParams } from "../../../types/fetch.ts"
import { symfonyQuerySchema, type SymfonyQuery } from "./schema.ts"

export function buildQuery(query: SymfonyQuery): FetchParams {
  const parsed = symfonyQuerySchema.parse(query)

  return {
    url: parsed.feed_url,
    headers: {
      Accept:
        "application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, */*",
    },
  }
}
