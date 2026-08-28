import type { JobOffer } from "../types/job-offer.ts"

/** Keep the first offer for each `dedupKey` (stable by input order). */
export function dedup(offers: JobOffer[]): JobOffer[] {
  const seen = new Set<string>()
  const result: JobOffer[] = []

  for (const offer of offers) {
    if (seen.has(offer.dedupKey)) {
      continue
    }
    seen.add(offer.dedupKey)
    result.push(offer)
  }

  return result
}
