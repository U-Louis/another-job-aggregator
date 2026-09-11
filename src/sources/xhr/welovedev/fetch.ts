import { fetchXhr } from "../fetch.ts"
import { buildQuery } from "./query.ts"
import {
  welovedevQuerySchema,
  welovedevResponseSchema,
  type WelovedevQuery,
} from "./schema.ts"

export async function fetchPayload(
  query: WelovedevQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const parsed = welovedevQuerySchema.parse(query)
  const params = buildQuery(parsed)
  const rawPayload = await fetchXhr(params, fetchImpl)
  const response = welovedevResponseSchema.parse(rawPayload)
  const first = response.results[0]

  return {
    hits: first?.hits ?? [],
    nbHits: first?.nbHits,
  }
}
