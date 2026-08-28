import { applyForbiddenFilter } from "./filter.ts"
import { dedup } from "./dedup.ts"
import { truncateDescription } from "./truncate.ts"
import type { JobOffer } from "../types/job-offer.ts"

/** Filter forbidden titles, collapse duplicates, truncate descriptions for Notion. */
export function processOffers(
  offers: JobOffer[],
  forbiddenStrings: string[],
): JobOffer[] {
  const filtered = applyForbiddenFilter(offers, forbiddenStrings)
  const unique = dedup(filtered)
  return unique.map((offer) => ({
    ...offer,
    description: truncateDescription(offer.description),
  }))
}
