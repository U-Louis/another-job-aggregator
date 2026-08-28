import type { SourceEntry } from "../types/config.ts"
import type { JobOffer } from "../types/job-offer.ts"
import { fetchByType } from "../sources/fetch-by-type.ts"
import { buildFetchPlans, type FetchPlan } from "./query-builder.ts"

export type SourceFetchResult =
  | { sourceId: string; ok: true; offers: JobOffer[] }
  | { sourceId: string; ok: false; error: string }

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function stampSource(offers: JobOffer[], sourceId: string): JobOffer[] {
  return offers.map((offer) => ({ ...offer, source: sourceId }))
}

async function fetchOnePlan(
  plan: FetchPlan,
  fetchImpl?: typeof fetch,
): Promise<SourceFetchResult> {
  try {
    const rawPayload = await fetchByType(plan.type, plan.params, fetchImpl)
    const offers = stampSource(plan.adapter.adapt(rawPayload), plan.sourceId)
    return { sourceId: plan.sourceId, ok: true, offers }
  } catch (err) {
    return { sourceId: plan.sourceId, ok: false, error: errorMessage(err) }
  }
}

export async function fetchAllSources(
  sources: SourceEntry[],
  fetchImpl?: typeof fetch,
): Promise<SourceFetchResult[]> {
  const plans = buildFetchPlans(sources)
  return Promise.all(plans.map((plan) => fetchOnePlan(plan, fetchImpl)))
}
