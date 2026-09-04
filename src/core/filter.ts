import type { SourceEntry } from "../types/config.ts"
import type { JobOffer } from "../types/job-offer.ts"

function normalizeTerms(terms: string[]): string[] {
  return terms
    .map((value) => value.toLowerCase().trim())
    .filter((value) => value.length > 0)
}

/** Space-separated query terms from enabled sources' `query.what_or`. */
export function requiredAnyOfFromSources(sources: SourceEntry[]): string[] {
  const terms = new Set<string>()
  for (const source of sources) {
    if (!source.enabled) {
      continue
    }
    const whatOr = source.query.what_or
    if (typeof whatOr !== "string" || whatOr.trim().length === 0) {
      continue
    }
    for (const term of whatOr.split(/\s+/)) {
      if (term.length > 0) {
        terms.add(term)
      }
    }
  }
  return [...terms]
}

/** Keep offers where title or description contains at least one required term. */
export function applyRequiredAnyFilter(
  offers: JobOffer[],
  requiredAnyOf: string[],
): JobOffer[] {
  const needles = normalizeTerms(requiredAnyOf)
  if (needles.length === 0) {
    return offers
  }

  return offers.filter((offer) => {
    const haystack = `${offer.title}\n${offer.description}`.toLowerCase()
    return needles.some((needle) => haystack.includes(needle))
  })
}

/** Drop offers whose title contains any forbidden string (case-insensitive substring). */
export function applyForbiddenFilter(
  offers: JobOffer[],
  forbiddenStrings: string[],
): JobOffer[] {
  const needles = normalizeTerms(forbiddenStrings)

  if (needles.length === 0) {
    return offers
  }

  return offers.filter((offer) => {
    const title = offer.title.toLowerCase()
    return !needles.some((needle) => title.includes(needle))
  })
}
