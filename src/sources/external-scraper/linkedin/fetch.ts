import { fetchLinkedInDiscover } from "../brightdata.ts"
import { buildDiscoverInput } from "./query.ts"
import { linkedinQuerySchema, type LinkedInQuery } from "./schema.ts"

export async function fetchPayload(
  query: LinkedInQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const parsed = linkedinQuerySchema.parse(query)
  const results = await fetchLinkedInDiscover(
    buildDiscoverInput(parsed),
    fetchImpl,
  )

  if (!Array.isArray(results) || parsed.limit === undefined) {
    return results
  }

  return results.slice(0, parsed.limit)
}
