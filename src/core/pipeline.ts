import {
  applyExcludedRemoteFilter,
  applyForbiddenFilter,
  applyRequiredAnyFilter,
  applyRequiredAnyRemoteFilter,
} from "./filter.ts"
import { dedup } from "./dedup.ts"
import { truncateDescription } from "./truncate.ts"
import type { JobOffer } from "../types/job-offer.ts"

/** Filter by required/forbidden terms, collapse duplicates, truncate for Notion. */
export function processOffers(
  offers: JobOffer[],
  forbiddenStrings: string[],
  requiredAnyOf: string[] = [],
  requiredAnyOfRemote: string[] = [],
  excludedRemote: string[] = [],
): JobOffer[] {
  const filtered = applyRequiredAnyRemoteFilter(
    applyRequiredAnyFilter(
      applyExcludedRemoteFilter(
        applyForbiddenFilter(offers, forbiddenStrings),
        excludedRemote,
      ),
      requiredAnyOf,
    ),
    requiredAnyOfRemote,
  )
  const unique = dedup(filtered)
  return unique.map((offer) => ({
    ...offer,
    description: truncateDescription(offer.description),
  }))
}
