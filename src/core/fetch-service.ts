import type { SourceEntry } from "../types/config.ts"
import type { JobOffer } from "../types/job-offer.ts"
import { fetchByType } from "../sources/fetch-by-type.ts"
import { buildFetchPlans, type FetchPlan } from "./query-builder.ts"

export type SourceFetchResult =
  | { sourceId: string; ok: true; offers: JobOffer[] }
  | { sourceId: string; ok: false; error: string }

async function fetchOnePlan(
  plan: FetchPlan,
  fetchImpl?: typeof fetch,
): Promise<SourceFetchResult> {
  try {
    const rawPayload = await fetchByType(plan.type, plan.params, fetchImpl)
    const offers = plan.adapter.adapt(rawPayload, plan.sourceId)
    return { sourceId: plan.sourceId, ok: true, offers }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { sourceId: plan.sourceId, ok: false, error }
  }
}

export async function fetchAllSources(
  sources: SourceEntry[],
  fetchImpl?: typeof fetch,
): Promise<SourceFetchResult[]> {
  const plans = buildFetchPlans(sources)
  const settled = await Promise.allSettled(
    plans.map((plan) => fetchOnePlan(plan, fetchImpl)),
  )

  return settled.map((result, index) => {
    const sourceId = plans[index]?.sourceId ?? sources[index]?.id ?? "unknown"
    if (result.status === "fulfilled") {
      return result.value
    }
    const error =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason)
    return { sourceId, ok: false, error }
  })
}
