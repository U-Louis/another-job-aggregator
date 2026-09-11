import type { FetchParams } from "../../../types/fetch.ts"
import { jobspressoQuerySchema, type JobspressoQuery } from "./schema.ts"

export function buildQuery(query: JobspressoQuery): FetchParams {
  const parsed = jobspressoQuerySchema.parse(query)

  return {
    url: parsed.feed_url,
    headers: {
      Accept:
        "application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, */*",
    },
  }
}
