import type { JobOffer } from "../types/job-offer.ts"
import { dedup } from "./dedup.ts"
import { applyForbiddenFilter } from "./filter.ts"

/** In-memory stages after adapt: forbidden-title filter, then first-wins dedup. */
export function processOffers(
  offers: JobOffer[],
  forbiddenStrings: string[],
): JobOffer[] {
  return dedup(applyForbiddenFilter(offers, forbiddenStrings))
}
