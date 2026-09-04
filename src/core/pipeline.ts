import {
  applyForbiddenFilter,
  applyRequiredAnyFilter,
} from "./filter.ts"
import { dedup } from "./dedup.ts"
import { truncateDescription } from "./truncate.ts"
import type { JobOffer } from "../types/job-offer.ts"

/** Filter by required/forbidden terms, collapse duplicates, truncate for Notion. */
export function processOffers(
  offers: JobOffer[],
  forbiddenStrings: string[],
  requiredAnyOf: string[] = [],
): JobOffer[] {
  const filtered = applyRequiredAnyFilter(
    applyForbiddenFilter(offers, forbiddenStrings),
    requiredAnyOf,
  )
  const unique = dedup(filtered)
  return unique.map((offer) => ({
    ...offer,
    description: truncateDescription(offer.description),
  }))
}
