import type { JobOffer } from "../types/job-offer.ts"

/** Drop offers whose title contains any forbidden string (case-insensitive substring). */
export function applyForbiddenFilter(
  offers: JobOffer[],
  forbiddenStrings: string[],
): JobOffer[] {
  const needles = forbiddenStrings
    .map((value) => value.toLowerCase())
    .filter((value) => value.length > 0)

  if (needles.length === 0) {
    return offers
  }

  return offers.filter((offer) => {
    const title = offer.title.toLowerCase()
    return !needles.some((needle) => title.includes(needle))
  })
}
