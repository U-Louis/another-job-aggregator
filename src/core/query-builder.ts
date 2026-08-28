import type { ProviderAdapter } from "../types/adapter.ts"
import type { SourceEntry, SourceType } from "../types/config.ts"
import type { FetchParams } from "../types/fetch.ts"
import { getAdapter } from "../sources/registry.ts"

export type FetchPlan = {
  sourceId: string
  type: SourceType
  provider: string
  params: FetchParams
  adapter: ProviderAdapter
}

export function buildFetchPlan(source: SourceEntry): FetchPlan {
  const adapter = getAdapter(source.type, source.provider)
  const query = adapter.querySchema.parse(source.query)
  const params = adapter.buildQuery(query)

  return {
    sourceId: source.id,
    type: source.type,
    provider: source.provider,
    params,
    adapter,
  }
}

export function buildFetchPlans(sources: SourceEntry[]): FetchPlan[] {
  return sources.filter((source) => source.enabled).map(buildFetchPlan)
}
